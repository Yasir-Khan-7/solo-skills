---
name: verifying-sources
description: Verify that what a web search told you is actually true before you act on it. Use when a search, fetch, or research pass produced claims you are about to write into code, docs, specs, or advice; when a fact looks stale, too convenient, or unsourced; or when another skill needs to check its findings.
---

A search result is a **lead**, not a fact. The snippet you were shown was written by whoever wanted to rank, it may be years stale, it may be a retelling of a retelling, and the model that summarised it (you) is fluent enough to make a wrong version number sound settled. Verification is the work of turning a lead into a fact, and it has exactly one move: **trace the claim back to whoever owns it**.

Run this before search output becomes a decision, a line of code, a spec, or a number in a document.

## 1. Split the output into claims

A **claim** is one atomic, checkable statement. "Peppol is mandatory in Belgium from 2026" is a claim. "Peppol is the way forward" is not, so it cannot be verified and must not be presented as if it were.

Split what the search gave you into claims, then mark each one **load-bearing** or not. A claim is load-bearing when something changes if it is false: code gets written, a number lands in a doc, a decision turns on it, money or a legal deadline is involved. Verify every load-bearing claim. Drop the rest, or keep them clearly flagged as unverified colour.

Done when every load-bearing claim is written out as a single sentence you can be wrong about.

## 2. Trace each claim to its owner

Every fact has an **owner**: the party that would have to change reality for the fact to change.

| Claim is about | Owner |
| --- | --- |
| An API, SDK, or library | Its official docs, and its source or changelog for anything the docs are vague about |
| A version, release date, or breaking change | The release notes, tags, or registry entry (npm, Packagist, PyPI) |
| A law, tax rule, or deadline | The government or EU body that issued it, or the official journal text |
| A standard or protocol | The specification itself |
| A product's pricing, limits, or features | The vendor's own current page |
| A vulnerability | The CVE record and the maintainer's advisory |
| What a codebase does | The code in the repo, not any prose about it |

Fetch the owner's page. Read the part that carries the claim. A blog, a Stack Overflow answer, an AI summary, and a listicle are all **downstream**: useful for finding the owner fast, never a substitute for it.

Two hard rules, because they are the failures that actually happen:

- **Open the page.** A snippet, a title, or your own recollection of what a page says is not evidence. If you did not fetch it in this session, you have not checked it.
- **Quote the line.** For each verified claim, hold the exact sentence from the owner that supports it, plus the URL. If you cannot find a sentence to quote, the claim is not supported, however confident the search result sounded.

Done when every load-bearing claim has either a quoted line from its owner or an explicit failure to find one.

## 3. Check the three things that make a traced claim still wrong

- **Stale.** Find the page's date, its version, or its "last updated". Ask what the claim depends on, then ask whether that has shipped a new version, a new pricing page, or a new deadline since. Software and tax law both move; a 2023 page is a claim about 2023.
- **Circular.** Three sources agreeing is worth nothing if all three copy one blog post. Corroboration counts only when the sources are **independent**: different origin, not quoting each other, and ideally reaching the fact by different routes (docs plus the code, not two aggregators). Trace each corroborating source to where it got the fact. If they all land on the same upstream, you have one source.
- **Twisted.** Reread the quoted line against the claim as you wrote it. Search summaries reliably drop conditions: a rule that applies to companies over a size threshold becomes "applies to everyone", a beta feature becomes "available", a proposal becomes "law". The scope, the date, and the exceptions are the parts that get lost, so check those three specifically.

Done when each claim has survived all three, or has been rewritten to what the source actually supports.

## 4. Grade and report

Give every load-bearing claim a verdict, and carry the verdict with the claim wherever it goes:

- **Confirmed.** The owner's own page says it, current, quoted, URL held.
- **Supported.** Multiple genuinely independent downstream sources say it and nothing contradicts it, but the owner is silent or unreachable. Usable, and it must stay labelled.
- **Unverified.** You could not get to a source that carries it. Say so plainly. An unverified claim can still be reported, but never as a fact and never as the basis for code.
- **False.** The owner contradicts it. Say what the owner actually says.

Report the verdict, not just the answer. "Confirmed against the Peppol spec, section 4, updated March 2026" and "Unverified: every result traces back to one 2023 blog post" are both good outcomes. A confident wrong answer is the only bad one.

Contradiction between sources is a finding, not a problem to smooth over. Surface it, name which source is closer to the owner, and let the user see the split.

## What good looks like

Bad: "Searches confirm Symfony 8 requires PHP 8.4." (Three snippets, none opened, one of them was about Symfony 7.)

Good: "Confirmed: Symfony 8 requires PHP 8.4 or higher. The `composer.json` in the `8.0` tag pins `php: >=8.4`, and the release announcement of 2025-11-27 says the same. Two independent routes to the same fact, both first-party."
