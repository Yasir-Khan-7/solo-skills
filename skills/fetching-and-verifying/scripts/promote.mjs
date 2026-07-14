#!/usr/bin/env node
// The gate. Nothing leaves quarantine that nobody looked at.
//
//   node promote.mjs --work work/ --dest ../assets/photos
//   node promote.mjs --work work/ --dest ../assets/photos --allow-gaps
//
// This is the file that would have saved the afternoon. Two rounds of food photos went
// straight from an API into a product repo, and the wrong ones were only caught because
// somebody happened to build a contact sheet afterwards. Had the copy step refused to run
// on unreviewed files, the bad ones could never have got in at all.
//
// So: an item with no verdict is a HARD STOP. An item that was rejected is skipped, loudly.
// Only files somebody accepted, by name, with a reason, are copied.
//
// It also writes CREDITS.md, because the provenance was carried the whole way and throwing
// it away at the last step is how a repo ends up with images nobody can licence.

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
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
const dest = args.dest
if (!dest) {
    console.error('--dest is required. This script exists to move things somewhere real.')
    exit(1)
}

const manifest = JSON.parse(await readFile(join(workDir, 'manifest.json'), 'utf8'))

const unreviewed = manifest.items.filter((i) => !i.verdict)
if (unreviewed.length > 0) {
    console.error(`REFUSING TO PROMOTE. ${unreviewed.length} item(s) were never reviewed:\n`)
    for (const item of unreviewed) console.error(`  ${item.id}`)
    console.error('\nA fetch that returned 200 is not a fact. Look at them (node sheet.mjs --work ' + workDir + ' --png),')
    console.error('then record what you decided (node verdict.mjs ...). Unreviewed is not the same as fine.')
    exit(1)
}

const accepted = manifest.items.filter((i) => i.verdict?.accepted)
const rejected = manifest.items.filter((i) => i.verdict && !i.verdict.accepted)

if (rejected.length > 0 && !args['allow-gaps']) {
    console.error(`REFUSING TO PROMOTE. ${rejected.length} item(s) were rejected and have no replacement:\n`)
    for (const item of rejected) console.error(`  ${item.id.padEnd(28)} ${item.verdict.reason}`)
    console.error('\nEither find a right one and re-review, or pass --allow-gaps to ship the hole deliberately.')
    console.error('A hole you chose beats a wrong answer you did not notice.')
    exit(1)
}

await mkdir(dest, { recursive: true })

for (const item of accepted) {
    await copyFile(join(workDir, 'candidates', item.verdict.accepted), join(dest, `${item.id}.jpg`))
}

// Provenance survives the last step, or it was never worth collecting.
const credits = [
    `# Credits`,
    '',
    `Fetched ${manifest.fetchedAt.slice(0, 10)} from ${manifest.source}. Every file below was looked at`,
    `and accepted against a written claim; the reason is recorded.`,
    '',
    '| File | Source | Licence | Author | Accepted because |',
    '| --- | --- | --- | --- | --- |',
    ...accepted.map((item) => {
        const c = item.candidates.find((x) => x.file === item.verdict.accepted)
        return `| ${item.id}.jpg | ${c.source} | ${c.licence} | ${String(c.author).replace(/\|/g, '')} | ${item.verdict.reason} |`
    }),
    '',
]

if (rejected.length) {
    credits.push('## Deliberate gaps', '')
    credits.push('Nothing correct was found for these, and a wrong file was not shipped in their place:', '')
    credits.push(...rejected.map((i) => `- **${i.id}** — ${i.verdict.reason}`))
    credits.push('')
}

await writeFile(join(dest, 'CREDITS.md'), credits.join('\n'))

console.log(`Promoted ${accepted.length} verified file(s) to ${dest}`)
if (rejected.length) console.log(`Left ${rejected.length} deliberate gap(s), recorded in CREDITS.md`)
