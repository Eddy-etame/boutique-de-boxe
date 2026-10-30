# Google evidence, without requiring Search Console access

Prepared 24 October 2026. This is a local measurement tool, not another website release. It makes no account, network, inventory or production changes. The owner does **not** need Search Console access to use the manual-observation path. Genuine Search Console exports are optional if supplied later by the person who holds the account.

## What exists now

`scripts/measure-google-progress.mjs` reads the maintained 40-query registry in `lib/seo-copy.ts`, without evaluating the application, and adds the owner's exact core query **boutique de boxe** for a transparent **41-query measurement watchlist**. The application registry does not currently contain that exact query and was not modified. Its owner remains **unverified**: the homepage and existing `/boutique-boxe/` page are candidates. Neither is declared the winner or a cannibalisation problem without evidence.

The tool can create an explicitly **unmeasured inventory**, ingest documented human Google observations, or analyse genuine GSC CSV exports. It never turns the technical audit, indexed-page totals, Exa result ordering or a CAPTCHA into ranking data.

Initialise new local evidence files:

```powershell
node scripts/measure-google-progress.mjs --init outputs/google-measurement-2026-10-24-watchlist41
```

This creates `priority-queries.csv`, two header-only observation templates, an optional GSC context template and `evidence-state.json`. There are **zero measured rows**. Existing files are never overwritten. Keep exports, screenshots and reports under ignored `work/` or `outputs/`; they are not storefront content.

The target set is explicitly **40 application-registry queries + 1 mandatory measurement-only core query**. A majority is **21/41**. This supersedes the initial 40-row unmeasured inventory; the scope change is recorded rather than silently redefining past results. The priority hash is included in reports, and incompatible registries are not compared. Changing the denominator to hide missing or weak results would invalidate the comparison. Several queries legitimately share one intended page. This set does not represent every possible keyword a boxing shop could rank for.

## 1. Human Google observations

Use the `manual-organic.template.csv` header. Add only a genuinely observed result. Record:

- The exact query and an ISO timestamp with timezone.
- Search country, displayed/verified search location, actual device and language. A city in the query, French language or a `gl=fr` parameter does not establish that the searcher was located in Toulouse.
- `found`, `not-found`, `blocked` or `unmeasured`.
- A counted **organic Web** position and the shop's actual landing URL when found; exclude ads, Maps, Shopping and other modules from this manual count.
- How many organic results were checked, and a screenshot or preserved log reference. The tool does not authenticate evidence references or independently verify physical location.

For `not-found`, inspect at least ten organic results and leave position/landing empty. This means absent from the checked results, not unindexed. For a CAPTCHA or other block, stop, use `blocked`, leave rank/landing empty and checked depth zero. No CAPTCHA bypass or automated Google scraper is implemented.

```powershell
node scripts/measure-google-progress.mjs --manual work/google-observations.csv --out outputs/organic-2026-10-24.json
```

Records are separated by UTC observation day, country, search location, device and language. Duplicate observations for the same query/context/day are refused, rather than selecting the better rank. Keep distinct full samples if repeating a measurement. Incomplete context stays unmeasured.

The report's `recordedOrganicTop10Queries` applies only to that declared sample. `recordedMajorityInThisSample` can become true at 21/41 documented top-10 observations. It does not establish an enduring, universal or future rank. A core-query site observation can be recorded while `intendedOwner` remains null. `confidenceScore` remains null. Observations outside the watchlist are retained separately and are not quietly added to the goal denominator.

## 2. Optional account-holder GSC exports

No sign-in, OAuth setup, password or Search Console access is requested by this tool. It can ingest a CSV already supplied by the account holder. English/French headers, UTF-8 BOM, comma/semicolon separation and quoted fields are supported.

Supported scopes:

| Input | What the report can establish |
| --- | --- |
| UI Queries CSV | Reported query-level averages under the declared filters. Intended landing-page ownership remains unverified. |
| Genuine joined query/page CSV, optionally daily and country/device segmented | Metrics for the exact intended query/page pair. Other observed shop landing URLs are listed separately. |
| Separate Pages, Countries or Devices CSVs | Refused as a query input. They are never joined to Queries.csv by row order or by guessing. |

For joined input, the normalised fields are `query,page,date,country,device,searchType,clicks,impressions,position,ctr`. Alternatively supply `start_date,end_date` for non-overlapping period totals. Clicks and impressions are non-negative integers; position is the exported average. CTR is optional, using a 0–1 ratio or a number ending in `%`; reported CTR is calculated from clicks/impressions. Do not mix daily rows and overlapping period totals.

Copy `gsc-context.template.json` to a private working file and fill only actual export metadata:

- `property`: the actual `sc-domain:boutique-de-boxe.com` or `https://www.boutique-de-boxe.com/` property.
- `startDate`/`endDate`: the exported period. GSC reporting dates use Pacific time; do not relabel them as Africa/Douala dates. A daily CSV may carry its own dates.
- `country`, `device`, `searchType`: actual filters when those dimensions are absent from CSV columns. Leave unknown filters null. Country/device segments must not be merged to imply a specific local result.
- `dataState`: `final`, `all` or `unknown`. Use `final` only when supported by the source; the local tool cannot authenticate that declaration.

```powershell
node scripts/measure-google-progress.mjs --input work/queries.csv --context work/export-context.json --out outputs/gsc-baseline.json
```

Positive-impression averages are weighted by impressions when non-overlapping daily rows are combined. Page-dimensional rows are kept per URL; a second landing page is not added into a fabricated property-level query rank or automatically labelled cannibalisation. For the core query, candidate-page metrics are listed separately and the owner status remains unverified; no combined owner-position metric is manufactured. Host, path and query-string differences are retained when checking the intended owner. Up to 50 out-of-watchlist source rows with the most impressions are retained as a separate discovery sample; the original export remains the complete evidence.

The default 20-impression threshold is an operational triage choice, not statistical significance or a Google rule. Adequately observed final Web country/device segments are classified as average position 1–10, 10–20, or beyond 20. Missing/low-sample/incomplete-context rows remain insufficient or unobserved. Query spelling is case/space normalised but accents are preserved; distinct exported queries are not silently combined.

`queriesAtAveragePosition1To10` is a **GSC average-position proxy**, not a count of verified organic first-page rankings. `verifiedOrganicTop10Queries` stays null and `firstPageGoalEstablished` stays false for GSC reports. Search Console omits some query rows, so an absent row does not establish zero impressions or an out-of-top-10 rank. [Google's metric definitions](https://support.google.com/webmasters/answer/7042828?hl=en), [performance report dimensions and contextual results](https://support.google.com/webmasters/answer/7576553?hl=en), [Search Analytics API grouping and row limits](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

## 3. Compare genuine complete periods

```powershell
node scripts/measure-google-progress.mjs --input work/later.csv --context work/later-context.json --baseline outputs/gsc-baseline.json --out outputs/gsc-comparison.json
```

Comparison requires the same property, priority registry, dimension scope, impression threshold, final Web country/device segments, and equal-length non-overlapping chronological periods. Insufficient samples remain non-comparable. Negative average-position change means improvement in the reported metric. The report does not attribute a change solely to our release; query mix, demand, competition and Google changes can contribute.

A measurement taken after the 24 October deployment is a **post-release observation**. It cannot reconstruct a pre-release baseline. Historical pre-release evidence requires a genuine historical export or an observation recorded at that time.

Snapshots around 31 October and 7 November can be compared under the same observation conditions. These are measurement dates, not ranking promises or scheduled jobs. A confidence rating can be reassessed from real evidence; this tool does not manufacture an 8–10/10 forecast from passing tests.

## Verification

```powershell
node --test scripts/test-google-measurement.mjs
npx oxlint scripts/lib/google-measurement.mjs scripts/measure-google-progress.mjs scripts/test-google-measurement.mjs
```

Tests use explicitly synthetic in-memory fixtures for CSV edge cases, overlapping periods, URL ownership, segmentation, incomplete evidence, comparisons, manual blocked results and safe output handling. Synthetic metrics are never written as the project's baseline. The CLI only writes new report/template files; it never overwrites original evidence, contacts Google or changes the deployed shop.
