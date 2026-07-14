---
name: fetching-and-verifying
description: Pull files or data from the internet without shipping the wrong thing. Use when fetching images, assets, datasets or documents from an API or the web; when a search returned results you are about to act on; or when you are about to cite a source. Enforces that nothing reaches its destination unlooked-at.
---

A search that returns HTTP 200 has not given you the right thing. It has given you *something*.

That gap is where every bad fetch lives, and it does not announce itself. The API is healthy, the file is a real JPEG, the page is a real page. Ask an image search for *"Bicky Burger"* and it will hand you a photo of a woman eating chips, with a title that says Bicky Burger. Ask it for *"viandel"* and you get an oven. Nothing errored. Nothing looked wrong in the logs. It was wrong in the only place that mattered, which is the pixels.

**The fix is structural, not a matter of being careful.** Being careful fails because the checking happens after the writing, and by then the wrong file is already where it will be used. So: fetched things land in **quarantine**, unverified is the **default state**, and getting out of quarantine is a **deliberate act with a reason attached**.

For the judgement rules that go with this (whose page counts as the owner, what makes corroboration circular, how to grade a claim), read [[verifying-sources]]. This skill is its executable half.

## The loop

Everything lands in a workspace. Nothing escapes it unlooked-at.

```bash
node scripts/fetch.mjs   --plan plan.json --work work/    # → quarantine, with provenance
node scripts/sheet.mjs   --work work/ --png               # → the artifact you must LOOK at
node scripts/verdict.mjs --work work/ --item X --accept X-2.jpg --reason "..."
node scripts/promote.mjs --work work/ --dest ./assets     # → refuses if anything is unreviewed
```

### 1. Write the claim before you search

The plan is the contract, and its `claim` field is the whole point:

```json
{
  "goal": "One photo per menu item",
  "source": "openverse",
  "options": { "licences": "cc0,pdm,by,by-sa" },
  "items": [
    { "name": "Frikandel", "query": "frikandel snack",
      "claim": "A deep-fried skinless minced-meat sausage. No bun, not a hot dog." },
    { "name": "Viandel", "query": "viandel snack",
      "claim": "A fried Belgian snack sausage. NOT an oven, a shop or a person." }
  ]
}
```

Write what a **correct** result would be, in words, *before* you look at what came back. Do it afterwards and you will find yourself describing whatever arrived. That sentence is what the review checks against, and it is the difference between judging a result and accepting one.

### 2. Look at the thing itself

`sheet.mjs` puts the claim next to the pixels. `--png` renders it so a model can read it as an image, because judging a photo from its filename is the exact mistake this skill exists to prevent — and an agent is at least as prone to it as a person.

**A title is what somebody typed. The image is what you get.** Every bad photo in the failure that produced this skill had a correct-sounding title.

### 3. Say what you decided, and why

```bash
node scripts/verdict.mjs --work work/ --item viandel --reject --reason "an oven, not a snack"
```

A verdict without `--reason` is refused. Writing *"a person eating chips, not a burger"* takes two seconds and is impossible to write without having looked. `ok` is what you type when you have not.

**Rejection is a real outcome.** "Nothing correct came back" is an answer a search engine will never volunteer, and it is frequently the true one.

### 4. The gate

`promote.mjs` **refuses to run** while any item is unreviewed, and refuses again if something was rejected without a replacement (pass `--allow-gaps` to ship the hole on purpose). Only files somebody accepted by name reach the destination, and `CREDITS.md` is written from the provenance carried the whole way — licence, author, source URL, and the reason it was accepted.

**A gap you chose beats a wrong answer you did not notice.**

## Citing text instead of fetching files

Same disease, different symptom: a model asked for a source produces a URL and a sentence with total fluency, and both can be inventions. The URL resolves, the page is real, and the sentence is not on it.

```bash
node scripts/check-quotes.mjs --claims claims.json
```

It fetches each page, strips it to text, and looks for the words you claim are there. `NOT ON THE PAGE` is not a weak citation; it is an unsupported claim, and the script exits non-zero so a pipeline notices.

It also flags **same-host claims**: three sources agreeing corroborate each other exactly as much as one source does when all three are the same domain.

## What this does not do

It does not tell you whether the picture is *good*. It makes sure somebody decided, on the record, that it is *right*. Taste is yours; the discipline is the script's.

## Adding a source

`SOURCES` in `fetch.mjs` is a map of `name → async (query, limit, options) => candidates`. Each source owns its own lies, and the notes on the ones already tried are in [`references/sources.md`](references/sources.md) — read it before picking one, because "which API has the pictures" is not the same question as "which API has the *right* pictures".
