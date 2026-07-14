#!/usr/bin/env node
// Record what a human or a model actually decided, after looking.
//
//   node verdict.mjs --work work/ --item frikandel --accept frikandel-2.jpg --reason "deep-fried sausage, no bun"
//   node verdict.mjs --work work/ --item viandel   --reject --reason "an oven, not a snack"
//
// A verdict needs a REASON, and the script refuses without one. Not bureaucracy: the
// reason is the difference between "I looked" and "I clicked". Writing "a person eating
// chips, not a burger" takes two seconds and is impossible to write without having looked.
// "ok" is what you type when you have not.
//
// Rejection is a first-class outcome. The failure this skill was born from was not that
// bad images were fetched, it was that there was no way to say "this one is wrong" and
// have the pipeline respect it.

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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

const workDir = args.work ?? 'work'
const manifestPath = join(workDir, 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

if (!args.item) {
    // Without an item, report where the review stands. Useful mid-flight, and it is the
    // one command that never changes anything.
    for (const item of manifest.items) {
        const state = item.verdict
            ? item.verdict.accepted ? `accepted ${item.verdict.accepted}` : `rejected (${item.verdict.reason})`
            : 'UNREVIEWED'
        console.log(`${item.id.padEnd(28)} ${state}`)
    }
    const left = manifest.items.filter((i) => !i.verdict).length
    console.log(`\n${left} of ${manifest.items.length} still unreviewed.`)
    exit(0)
}

const item = manifest.items.find((i) => i.id === args.item)
if (!item) {
    console.error(`No item "${args.item}". Known: ${manifest.items.map((i) => i.id).join(', ')}`)
    exit(1)
}

if (!args.reason || args.reason === true) {
    console.error('A verdict needs --reason. Writing why is what proves you looked; "ok" is what you type when you did not.')
    exit(1)
}

if (args.accept) {
    const candidate = item.candidates.find((c) => c.file === args.accept)
    if (!candidate) {
        console.error(`"${args.accept}" is not a candidate for ${item.id}. Candidates: ${item.candidates.map((c) => c.file).join(', ') || '(none)'}`)
        exit(1)
    }

    item.verdict = { accepted: args.accept, reason: String(args.reason), at: new Date().toISOString() }
    console.log(`${item.id}: accepted ${args.accept} — ${args.reason}`)
} else {
    // No candidate was right. That is a real answer, and it is the answer a search engine
    // will never give you on its own.
    item.verdict = { accepted: null, reason: String(args.reason), at: new Date().toISOString() }
    console.log(`${item.id}: rejected — ${args.reason}`)
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
