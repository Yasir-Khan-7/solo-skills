#!/usr/bin/env node
// Build the artifact that forces somebody to LOOK.
//
//   node sheet.mjs --work work/            builds sheet.html
//   node sheet.mjs --work work/ --png      also renders sheet.png, so an agent can read it
//
// This exists because of one specific, embarrassing failure mode: an agent reads the
// METADATA of a search result and accepts it. The titles say "Bicky Burger", "hamburger",
// "sandwich" — and the pictures are a woman eating chips, a person in a pink jacket, and a
// restaurant flyer. Every one of those passed a title check. None of them survived being
// looked at for half a second.
//
// So the sheet puts the CLAIM next to the PIXELS. Not the query, not the title: the
// sentence saying what a correct result would be. The reviewer's only job is to answer
// one question per item, and that question is on the screen with the evidence.
//
// If a model is the reviewer, it reads sheet.png and answers the same question. Same
// artifact, same discipline. The point is that nothing gets accepted by a caption.

import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { argv } from 'node:process'
import { spawnSync } from 'node:child_process'

const args = {}
for (let i = 2; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const [k, v] = argv[i].includes('=') ? argv[i].slice(2).split('=') : [argv[i].slice(2), argv[i + 1]?.startsWith('--') === false ? argv[i + 1] : 'true']
    args[k] = v
}

const workDir = args.work ?? 'work'
const manifest = JSON.parse(await readFile(join(workDir, 'manifest.json'), 'utf8'))

const escape = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))

const rows = manifest.items.map((item) => {
    const verdict = item.verdict
        ? item.verdict.accepted
            ? `<span class="ok">accepted: ${escape(item.verdict.accepted)}</span>`
            : `<span class="no">rejected</span>`
        : `<span class="todo">unreviewed</span>`

    const cards = item.candidates.length
        ? item.candidates.map((c) => `
            <figure${item.verdict?.accepted === c.file ? ' class="chosen"' : ''}>
                <img src="candidates/${escape(c.file)}" loading="lazy">
                <figcaption>
                    <b>${escape(c.file)}</b><br>
                    <span class="meta">${escape((c.title || '(no title)').slice(0, 60))}</span><br>
                    <span class="meta">${escape(c.licence)} · ${escape(c.author)}</span>
                </figcaption>
            </figure>`).join('')
        : `<p class="none">Nothing came back. A visible gap beats an invisible wrong answer.</p>`

    return `
        <section>
            <h2>${escape(item.name)} <span class="verdict">${verdict}</span></h2>
            <p class="claim">Correct means: <b>${escape(item.claim)}</b></p>
            <p class="meta">query: <code>${escape(item.query)}</code></p>
            <div class="row">${cards}</div>
        </section>`
}).join('')

const unreviewed = manifest.items.filter((i) => !i.verdict).length

const html = `<!doctype html>
<meta charset="utf-8">
<title>Verify: ${escape(manifest.goal || manifest.plan)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #fff; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .lede { color: #666; font-size: 13px; margin: 0 0 16px; }
  section { border-top: 1px solid #eee; padding: 12px 0; }
  h2 { font-size: 15px; margin: 0 0 2px; display: flex; gap: 8px; align-items: center; }
  .claim { margin: 0 0 2px; font-size: 13px; }
  .meta { color: #888; font-size: 11px; }
  .row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  figure { margin: 0; width: 150px; }
  figure.chosen { outline: 3px solid #16a34a; border-radius: 10px; }
  img { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; display: block; background: #f3f3f3; }
  figcaption { font-size: 10px; line-height: 1.3; margin-top: 2px; }
  .verdict { font-size: 11px; font-weight: 600; }
  .todo { color: #b45309; } .ok { color: #16a34a; } .no { color: #dc2626; }
  .none { color: #dc2626; font-size: 13px; }
</style>
<h1>${escape(manifest.goal || manifest.plan)}</h1>
<p class="lede">
  ${manifest.items.length} items · <b>${unreviewed} unreviewed</b> · fetched ${escape(manifest.fetchedAt.slice(0, 16))} from ${escape(manifest.source)}.
  Judge each row against its CLAIM, not against its title. A title is what somebody typed; the image is what you get.
</p>
${rows}
`

await writeFile(join(workDir, 'sheet.html'), html)
console.log(`sheet.html written (${unreviewed} unreviewed of ${manifest.items.length})`)

if (args.png) {
    // Rendered so a model can read it as an image. Judging pixels from a filename is the
    // exact mistake this whole skill exists to prevent, and that includes the agent's.
    const chrome = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
    ].find((p) => spawnSync('test', ['-x', p]).status === 0)

    if (!chrome) {
        console.log('No Chrome found: open sheet.html and look at it yourself.')
    } else {
        const height = Math.min(16000, 260 + manifest.items.length * 230)
        spawnSync(chrome, [
            '--headless', '--disable-gpu', '--hide-scrollbars',
            `--window-size=1000,${height}`,
            `--screenshot=${resolve(workDir, 'sheet.png')}`,
            // resolve(), not join(cwd, ...): the work dir is often absolute, and gluing an
            // absolute path onto the cwd produces a path that exists nowhere.
            `file://${resolve(workDir, 'sheet.html')}`,
        ])
        console.log(`sheet.png written. Read it. Do not accept anything you have not looked at.`)
    }
}
