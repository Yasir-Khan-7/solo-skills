#!/usr/bin/env node
// Pull candidates from the internet into QUARANTINE, never straight to their destination.
//
// The whole point of this file is the word "candidates". A search that returns 200 and a
// real image has not given you the right image: it has given you something. The gap
// between "something" and "the thing you asked for" is where every bad fetch lives, and
// nothing downstream can close it if the file has already been written where it will be
// used.
//
// So: everything lands in a workspace, with its provenance attached, marked unverified.
// Getting it out of there is somebody's deliberate act (see promote.mjs).
//
//   node fetch.mjs --plan plan.json --work work/
//
// The plan is the contract. Each item states, in words, WHAT WOULD MAKE A RESULT CORRECT
// ("a photo of a frikandel: a deep-fried Dutch/Belgian minced-meat sausage, no bun").
// That sentence is not decoration. It is what the reviewer checks against later, and
// writing it down before you search is what stops you accepting whatever came back.

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { argv } from 'node:process'

const args = Object.fromEntries(
    argv.slice(2).map((a) => {
        const [k, v = 'true'] = a.replace(/^--/, '').split('=')
        return [k, v]
    }),
)

// `--plan x --work y` (space-separated) as well as `--plan=x`.
for (let i = 2; i < argv.length - 1; i++) {
    if (argv[i].startsWith('--') && !argv[i].includes('=') && !argv[i + 1].startsWith('--')) {
        args[argv[i].replace(/^--/, '')] = argv[i + 1]
    }
}

const planPath = args.plan ?? 'plan.json'
const workDir = args.work ?? 'work'
const perItem = Number(args.candidates ?? 4)

const plan = JSON.parse(await readFile(planPath, 'utf8'))
await mkdir(join(workDir, 'candidates'), { recursive: true })

/**
 * Sources are pluggable, and each one owns its own lies.
 *
 * Openverse indexes Wikimedia and Flickr and will happily return a photo of a woman
 * eating chips for the query "Bicky Burger". It is not broken; it is a search engine,
 * and a search engine returns what matches words, not what matches meaning. The licence
 * filter is the only thing here that can be trusted mechanically, which is exactly why
 * it is the only thing this file asserts.
 */
const SOURCES = {
    async openverse(query, limit, { licences = 'cc0,pdm,by,by-sa' } = {}) {
        const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=${licences}&page_size=${limit}`
        const res = await fetch(url, { headers: { 'User-Agent': 'fetching-and-verifying/1.0' } })
        if (!res.ok) return []

        const json = await res.json()
        return (json.results ?? []).map((r) => ({
            url: r.url,
            title: r.title ?? '',
            author: r.creator ?? 'unknown',
            licence: `${r.license ?? '?'} ${r.license_version ?? ''}`.trim(),
            source: r.foreign_landing_url ?? r.url,
            width: r.width ?? null,
            height: r.height ?? null,
        }))
    },
}

const slug = (s) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const manifest = {
    plan: basename(planPath),
    goal: plan.goal ?? '',
    fetchedAt: new Date().toISOString(),
    source: plan.source ?? 'openverse',
    items: [],
}

const fetchFrom = SOURCES[manifest.source]
if (!fetchFrom) throw new Error(`Unknown source "${manifest.source}". Known: ${Object.keys(SOURCES).join(', ')}`)

for (const item of plan.items) {
    const id = item.id ?? slug(item.name)
    const query = item.query ?? item.name

    // The claim travels WITH the candidates, all the way to the review. A reviewer who
    // has to remember what they were looking for will accept whatever looks food-shaped.
    const record = {
        id,
        name: item.name,
        query,
        claim: item.claim ?? `A correct result for "${item.name}"`,
        candidates: [],
        verdict: null, // unverified until somebody says otherwise. This is the default on purpose.
    }

    let results = []
    try {
        results = await fetchFrom(query, perItem, plan.options ?? {})
    } catch (error) {
        record.error = String(error)
    }

    for (const [i, r] of results.entries()) {
        const file = `${id}-${i}.jpg`
        try {
            const img = await fetch(r.url, { headers: { 'User-Agent': 'fetching-and-verifying/1.0' } })
            if (!img.ok) continue

            await writeFile(join(workDir, 'candidates', file), Buffer.from(await img.arrayBuffer()))
            record.candidates.push({ file, ...r })
        } catch {
            // A candidate that will not download is simply not a candidate.
        }
    }

    manifest.items.push(record)
    const found = record.candidates.length
    console.log(`${id.padEnd(28)} ${found} candidate${found === 1 ? '' : 's'}${found ? '' : '   << NOTHING FOUND'}`)
}

await writeFile(join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

const empty = manifest.items.filter((i) => i.candidates.length === 0)
console.log(`\nQuarantined in ${workDir}/candidates. Nothing is accepted yet: that is the point.`)
if (empty.length) {
    console.log(`${empty.length} item(s) found nothing at all. A gap you can see beats a wrong file you cannot.`)
}
console.log(`\nNext: node sheet.mjs --work ${workDir}   (then LOOK at it)`)
