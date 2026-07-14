#!/usr/bin/env node
// Prove that the sentence you are citing actually exists on the page you are citing.
//
//   node check-quotes.mjs --claims claims.json
//
// Where claims.json is:
//   [
//     { "claim": "Symfony 8 requires PHP 8.4",
//       "url": "https://symfony.com/releases/8.0",
//       "quote": "PHP 8.4 or higher" }
//   ]
//
// This is the mechanical half of "open the page, quote the line". A model asked to cite a
// source will produce a URL and a sentence with total fluency, and both can be inventions:
// the URL resolves, the page is real, and the sentence is not on it. That failure is
// invisible to every check except this one — fetch the page, strip it to text, and look
// for the words.
//
// It also catches CIRCULAR CORROBORATION, which is the other way research quietly goes
// wrong: three sources agreeing is worth nothing when all three are the same domain, or
// all three copy one upstream. Same-host claims are flagged as one source, not three.

import { readFile } from 'node:fs/promises'
import { argv, exit } from 'node:process'

const args = {}
for (let i = 2; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    if (key.includes('=')) {
        const [k, v] = key.split('=')
        args[k] = v
    } else {
        const next = argv[i + 1]
        args[key] = next && !next.startsWith('--') ? next : true
    }
}

const claims = JSON.parse(await readFile(args.claims ?? 'claims.json', 'utf8'))

// Whitespace and punctuation vary between what a page renders and what a human copies out
// of it. Normalising both sides means a real quote is not failed on a curly apostrophe,
// while an invented one still has nowhere to hide.
const normalise = (s) =>
    s.toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[ –—]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

const textOf = (html) =>
    html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

const results = []

for (const c of claims) {
    const row = { claim: c.claim, url: c.url, quote: c.quote, verdict: 'UNVERIFIED', note: '' }

    if (!c.url || !c.quote) {
        row.note = 'No url or no quote. A claim with neither is an opinion.'
        results.push(row)
        continue
    }

    try {
        const res = await fetch(c.url, { headers: { 'User-Agent': 'fetching-and-verifying/1.0' }, redirect: 'follow' })
        if (!res.ok) {
            row.verdict = 'UNREACHABLE'
            row.note = `HTTP ${res.status}. The page you cited did not load for us either.`
            results.push(row)
            continue
        }

        const body = normalise(textOf(await res.text()))
        row.verdict = body.includes(normalise(c.quote)) ? 'CONFIRMED' : 'NOT ON THE PAGE'
        row.note = row.verdict === 'CONFIRMED'
            ? 'The words are there.'
            : 'The page loaded and does NOT contain this sentence. The citation is wrong, whatever it sounded like.'
    } catch (error) {
        row.verdict = 'UNREACHABLE'
        row.note = String(error).slice(0, 80)
    }

    results.push(row)
}

// Corroboration only counts when the sources are independent.
const byHost = {}
for (const r of results) {
    try {
        const host = new URL(r.url).host.replace(/^www\./, '')
        ;(byHost[host] ??= []).push(r.claim)
    } catch {
        // Not a URL. Already failed above.
    }
}

console.log('')
for (const r of results) {
    const mark = { CONFIRMED: '  OK  ', 'NOT ON THE PAGE': ' FAIL ', UNREACHABLE: ' DEAD ', UNVERIFIED: ' ???? ' }[r.verdict]
    console.log(`[${mark}] ${r.claim}`)
    console.log(`         ${r.url}`)
    console.log(`         ${r.note}\n`)
}

const failed = results.filter((r) => r.verdict !== 'CONFIRMED')
const shared = Object.entries(byHost).filter(([, claims]) => claims.length > 1)

if (shared.length) {
    console.log('Same-host claims (these corroborate each other exactly as much as one source does):')
    for (const [host, list] of shared) console.log(`  ${host}: ${list.length} claims`)
    console.log('')
}

console.log(`${results.length - failed.length}/${results.length} claims confirmed against their own source.`)
if (failed.length) {
    console.log('A claim that is not on the page it cites is not a weak claim. It is an unsupported one.')
    exit(1)
}
