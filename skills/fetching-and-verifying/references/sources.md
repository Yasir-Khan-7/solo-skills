# Sources, and how each one lies

Notes from actually using these, not from their documentation. "Which API has the pictures" and "which API has the **right** pictures" are different questions, and only the second one matters.

## Openverse (`api.openverse.org`)

Indexes Wikimedia Commons and Flickr. No API key. This is the one implemented in `fetch.mjs`.

**What it is good at:** licence filtering, which is the only thing here you can trust mechanically. `license=cc0,pdm` gives you public-domain and CC0 work: no attribution required, commercial use fine. Add `by,by-sa` and you get far more coverage, at the price of an attribution obligation that has to travel with the files (which is why `promote.mjs` writes `CREDITS.md`).

**How it lies:** it is a *word* search, so it returns what matches words, not what matches meaning. Measured on a real run of 74 Belgian food items:

| Query | What came back |
| --- | --- |
| `Bicky Burger` | a woman eating chips |
| `hamburger` | a person in a pink jacket |
| `viandel snack` | an oven |
| `sandwich` | a restaurant flyer |
| `soft drink` | a night sky, and a botanical drawing |
| `croquette fried snack` | **nothing at all** |

Roughly **one in five** results was wrong in a way no metadata check could catch, and every one of them had a plausible title.

**Coverage collapses on regional specifics.** Generic food (croissant, bread, cake) is well covered. Niche Belgian and Dutch snacks — frikandel, bicky burger, kapsalon, berenklauw, bamischijf — are thin to nonexistent under CC0, and what exists is often somebody's holiday photo of a shopfront. If your subject is regional, expect gaps and plan to ship them as gaps.

## Wikimedia Commons API (`commons.wikimedia.org/w/api.php`)

Better *coverage* for regional food than Openverse's index of it, because you can search the category structure directly.

**Watch out:** in at least one sandboxed environment the API host was blocked by DNS while `upload.wikimedia.org` (the image host) was reachable — so a fetcher can appear broken when only the search half is. Licences are mostly CC BY-SA, which means attribution and share-alike, and that obligation has to be recorded.

## Unsplash / Pexels

Free API key, two minutes to create. Their licences permit commercial use **with no attribution required**, and the food photography is properly tagged and professionally shot — which is to say the metadata is much closer to the truth than an open-web index.

**If quality matters and the subject is ordinary, this is the honest recommendation.** The cost is a credential, not code. Not implemented in `fetch.mjs` for exactly that reason: a script that needs a secret to run at all is a script most people cannot run.

## The general rule

The more specific your subject, the worse a keyword search performs, and the more confidently it fails. A search for "bread" will find bread. A search for "berenklauw" will find something, and that something will be wrong, and it will be titled *berenklauw*.

Which is the entire reason this skill exists: **the failure is invisible at the fetch, and obvious at a glance.** So make the glance mandatory.
