# Google first-page plan — Boutique de Boxe

**Status update — 24 October 2026:** implementation was brought forward at the owner's request and is now live after production-build, HTTP, feed and desktop/mobile browser verification. This document remains the original planning record, not the current execution status. See [the implementation and release record](<C:/Users/Mommy Jayce/Desktop/Boxing Center/Deployment/_boutique/integration/docs/SEO-RELEASE-2026-10-24.md>) for the deployed changes, evidence, rollback and remaining Google/account-dependent measurements. The original file in Downloads was not rewritten.

Prepared Saturday 24 October 2026. Execution window: Monday 26 to Friday 30 October. Scope: Google organic website results first, Google product/free-listing eligibility second. No live changes were made during this analysis.

## Decision in one minute

Use the supplied analysis as the starting evidence, not as an implementation order. Its strongest opportunity survives verification: our Toulouse opening primarily answers **where to train**, whereas the competing Toulouse pages answer **where to buy equipment**. Make the existing destination a better purchasing answer while preserving its useful local research, URL, working commerce and established identity.

Three prescriptions must change before Monday:

1. Do not declare Toulouse unindexed from an empty `site:` result. Establish its actual indexed status and Google-selected canonical in URL Inspection.
2. Do not add a second footer block as if the Toulouse link were missing. The live sample and shared source already contain that link.
3. Do not deploy from the older main checkout or lengthen all cache lifetimes without verifying the current release and catalogue invalidation.

Target: first position for explicitly named query × location × device combinations. First page is the intermediate outcome, not the definition of completion. Neither can be promised by Friday or obtained merely by submitting URLs.

## Inputs, access and preservation

Base document, read completely and left unchanged: [ANALYSE-MATERIEL-DE-BOXE-2026-10-24.md](<C:/Users/Mommy Jayce/Downloads/ANALYSE-MATERIEL-DE-BOXE-2026-10-24.md>).

Its reported fourth position for the competitor's `/villes-toulouse` is a **reported Toulouse observation**, not independently recaptured in a Google browser session during this pass. The referenced raw `google-2026-10-24.json` and `scratchpad/mdb/` evidence were not supplied beside the document. Exa semantic search order was not used as a Google ranking report.

Current source candidate: `C:\Users\Mommy Jayce\Desktop\Boxing Center\Deployment\_boutique\integration`, branch `v9-integration-2026-10-22`, HEAD `a611a77` dated 23 October. It matches current feed features and the owner-confirmed availability change recorded in that commit. This is not independent proof of the exact deployed SHA: verify deployment provenance before releasing.

The older checkout at `C:\Users\Mommy Jayce\Desktop\Boxing Center\Deployment\web\boutique-de-boxe\site` is still on main at `b56b8b4`, dated 13 October, and differs from live commerce/feed behavior. Do not deploy it over the newer integration work. Other worktrees were not edited. No credentials or environment values were read.

The Baffled Bar and SEO-audit methods influenced this plan through preservation, primary-source checks, explicit acceptance tests and adversarial review. The reference-fusion work is limited to SEO, purchasing hierarchy and performance; this is not a redesign or an artistic rating of either site.

## 1. Verified evidence that changes the base analysis

| Question | Current observation, 24 October | Consequence |
| --- | --- | --- |
| Is our shop still pre-commerce? | No. Public pages say sales opened 13 October; commerce and Product Offers are present. | Retire the earlier closed-until-20-October diagnosis. No payment transaction was executed in this audit. |
| Is Toulouse publicly crawlable? | 200, index/follow, self-canonical www URL, substantial SSR content, present in sitemap. | Technically eligible is not the same as Google-indexed. Inspect the indexed record. |
| Is Toulouse missing from the footer? | All five inspected pages contain a crawlable link; the shared shell emits it from QUERY_MAP in a native details directory. | Discoverability already exists. Consider clearer relevant context/prominence, not redundant keyword lists. |
| Does the bottle still have bandage care? | No. Current bottle instructions are object-specific. | Preserve the fix; retain it as a regression fixture. |
| Is our current sitemap invalid? | No: 1,290 URLs, 1,042 product URLs and 32 city/region paths. | No evidence for repeating the old sitemap repair or chasing every URL into the index. |
| Does the competitor have 5,923 URLs? | Yes; 89 product URLs, 17 guides, 10 brands and 5,766 paths matching `/boutique-boxe-*`. | URL quantity is not commercial quality. The city-pattern count also includes non-French destinations. |
| Are all its pages only 13–49 KB? | No. Its national city directory is 389,507 decoded HTML bytes. | Compare actual document types and the same transfer metric. |
| Did its robots checklist prove indexing requests? | No. Checklist text exists; execution and timing are unknown. | It is not a verified ranking trick. |
| Does feed availability reflect an owner decision? | Integration commit a611a77 records the owner's 23 October confirmation; live feed has 3,502 unique items marked in_stock. | Preserve that decision. Still test variant/landing/checkout consistency; do not arbitrarily revert stock status. |

Public evidence: [our Toulouse page](https://www.boutique-de-boxe.com/boutique-de-boxe-toulouse/), [bottle](https://www.boutique-de-boxe.com/produits/bouteille-650ml-infinity-noir/), [sitemap](https://www.boutique-de-boxe.com/sitemap.xml), [merchant feed](https://www.boutique-de-boxe.com/flux-marchand.xml), [competitor sitemap](https://materiel-de-boxe.fr/sitemap.xml), [competitor directory](https://materiel-de-boxe.fr/villes).

Source anchors: [footer directory](<C:/Users/Mommy Jayce/Desktop/Boxing Center/Deployment/_boutique/integration/components/shop-shell.tsx:350>), [Toulouse query entry](<C:/Users/Mommy Jayce/Desktop/Boxing Center/Deployment/_boutique/integration/lib/seo-copy.ts:580>), [merchant item generation](<C:/Users/Mommy Jayce/Desktop/Boxing Center/Deployment/_boutique/integration/app/flux-marchand.xml/route.ts:40>).

## 2. What to learn from materiel-de-boxe.fr

The [Toulouse hub](https://materiel-de-boxe.fr/villes-toulouse) explicitly combines shop + boxing + Toulouse, links to 247 distinct commune destinations and eight product destinations in the sample. The [Toulouse buying page](https://materiel-de-boxe.fr/boutique-boxe-toulouse) is a separate self-canonical commercial destination. Sample footers contain 35 links, including both Toulouse pages. These are observable navigation and relevance mechanisms, not isolated explanations of Google's ranking.

Adapt: a buying answer early, useful equipment links, consistent hierarchy and predictable initial rendering. Do not assume another destination is needed: improve our existing Toulouse page rather than creating a duplicate competitor-style URL.

Do not copy: thousands of low-differentiation city pages, all-URLs-modified-today dates, unsupported preorder claims or keyword-only text. Similarity indicates a policy risk to assess; it does not establish a Google penalty. The competitor's Product Offer says PreOrder while the inspected visible flow emphasizes email alerts; schema presence alone does not prove purchasability. [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

Public identity also matters: both shops describe SAS BOXING CENTER as publisher. This establishes a shared public association, not legal ownership by inference. Keep storefronts distinct and do not redirect or alter the other team's site without separate authority. [Competitor about](https://materiel-de-boxe.fr/a-propos), [our about](https://www.boutique-de-boxe.com/a-propos/).

## 3. Correct the Google assumptions

| Base-analysis assumption | Working rule |
| --- | --- |
| No exact `site:` result means not indexed; result counts measure total coverage. | Neither conclusion is reliable. Use URL Inspection and the Page Indexing report. [Google site operator](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site). |
| Ten indexing requests/day will get the priority pages in. | Quotas exist, but Google does not promise ten/day, inclusion or timing. Inspect first; request once when appropriate, never daily repetition. [Recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl). |
| Crawled, not indexed means rejected specifically for quality. | The status alone does not isolate a cause. Compare canonicals, content, dates and affected page families; avoid bulk speculative rewrites. [Indexing report](https://support.google.com/webmasters/answer/7440203?hl=en). |
| More words means a richer page that deserves to rank higher. | Buyer usefulness and trustworthy differentiation matter; word count is not a quality multiplier. [Helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). |
| Thousands of repeated footer links are independent votes. | Links help discovery and context, but there is no magic link-count target or predictable rank increase. [Link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). |
| 1,290 URLs automatically mean crawl-budget failure. | Not established. Check Crawl Stats, availability and discovered-not-indexed coverage before naming that bottleneck. [Crawl-budget guidance](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget). |
| IndexNow is a Google deployment action. | Remove it from this Google-only plan. Use Google's documented discovery/recrawl methods; do not use the restricted Indexing API for shop pages. [Recrawl methods](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [Indexing API scope](https://developers.google.com/search/apis/indexing-api/v3/using-api). |
| FAQ markup will win this retailer FAQ rich results. | Helpful FAQs remain useful; Google's FAQ rich-result eligibility is restricted to qualifying government/health sites. [FAQ guidance](https://developers.google.com/search/docs/appearance/structured-data/faqpage). |
| A verified feed guarantees Shopping visibility and exclusivity. | Merchant Center approval, matching product facts and diagnostics are separate from generating XML; no display guarantee follows. [Product specification](https://support.google.com/merchants/answer/7052112?hl=en). |
| First place by Friday is an acceptance promise. | First place remains the ambition. Crawl/ranking changes have variable timing, so delivery acceptance and observed rank must be separate. [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide). |

No new city/department rollout until the existing intended destinations demonstrate customer usefulness and Google performance. Dataset rows do not automatically justify commercial landing pages.

## 4. Query ownership and the first experiment

These are initial candidate owners, not a claim they currently rank. Retain existing URL/title unless evidence identifies a specific defect. GSC may change the order of work.

| Intent | Candidate primary destination | Evidence needed |
| --- | --- | --- |
| boutique de boxe, national online shop | `/` or `/boutique-boxe/` | Query/page pairs determine which already earns the demand; avoid splitting equivalent intent blindly. |
| boutique de boxe Toulouse, matériel de boxe Toulouse | `/boutique-de-boxe-toulouse/` | Indexed status, selected canonical and local organic query/page observations. |
| matériel de boxe | `/materiel-boxe/` | Existing impressions, actual competing result format and equipment decision gaps. |
| vente matériel de boxe | `/vente-materiel-de-boxe/` | Whether a separate purchase journey genuinely differs from catalogue/navigation intent. |
| gants de boxe, gants MMA, matériel MMA | Existing respective category/hub | Products, sizes, price ranges and supported use-case guidance rather than new synonyms. |
| choisir ses gants de boxe | `/guides/choisir-gants-boxe/` | Informational intent, first-hand/proven facts and next-step equipment links. |

### Toulouse intervention to prepare Monday

Keep the same URL, identity, sourced venue data, responsive behavior and working product links. Change hierarchy first, not the whole page:

1. Immediately explain buying equipment online with delivery to Toulouse; do not imply a walk-in shop or collection point.
2. Bring a small, curated set of actual products or existing kit choices near the top, with real model differences and sizes. Reuse current selection logic; do not build another catalogue widget.
3. Show current delivered-cost rules and published dispatch information from the existing single source. Do not import the competitor's cheaper rates or faster promise. Distinguish dispatch from arrival.
4. Address the useful purchasing questions: choosing a size, what a beginner needs, returns, and contacting the shop. Avoid universal glove-weight or safety claims unsupported by the relevant club/manufacturer.
5. Preserve the clubs/census directory as supporting local evidence below the purchasing answer, with sensible anchors. Do not erase the differentiating research.
6. Add or improve contextual links from genuinely related commercial pages only where the sentence helps the customer. Existing footer links remain; avoid duplicating the exact phrase throughout the page.

Proposed +1 hypothesis: a compact **Toulouse buying brief** that connects the customer's discipline, an actual model/size choice and delivered-cost facts before the supporting local directory. It is a proposed improvement relative to the two inspected Toulouse openings, not a claim of global novelty or a new Google ranking factor. Check existing kits first and reuse them. Prototype the smallest useful version rather than adding an unrelated redesign.

Reference transformation: competitor's immediate commercial relevance + our sourced local information + Google's people-first/linking guidance. Operations: compress the buying answer; invert the directory-first hierarchy; combine verified product facts with local context; subtract bulk city-link clutter. No visual-bank/UI overhaul is in scope for this Google-only pass.

Acceptance: useful purchasing content remains in initial HTML, no invented locality/stock/shipping facts, same canonical URL, actual product links work, no duplicated catalogue controls, desktop/mobile and no-JS accessibility preserved. GSC changes are measured later; a passing build is not a rank result.

## 5. Performance: investigate, do not prescribe the cure in advance

Current single-location HTTP samples:

| Page | First TTFB / decoded HTML | Warm HIT TTFB / compressed HTML |
| --- | --- | --- |
| Our homepage | 0.990 s / 205,469 B | Not repeated |
| Our Toulouse | 0.430 s / 197,070 B | 0.203 s / 32,351 B |
| Our catalogue hub | 0.226 s / 276,827 B | 0.203 s / 42,614 B |
| Our gloves | 0.243 s / 291,918 B | 0.195 s / 43,702 B |
| Our bottle | 0.438 s / 99,665 B | Not repeated |
| Competitor Toulouse | 40,143 decoded B | 0.253 s / 8,891 compressed B, one sample |
| Competitor national city directory | 389,507 decoded B | 0.255 s TTFB / 66,816 compressed B, one sample |

Our first responses were STALE; the three repeats were HIT. The supplied slow outliers were not reproduced, not disproved. These are not equivalent cold-start populations, Googlebot-IP measurements, browser render measurements or field Core Web Vitals. A Googlebot user agent does not establish verified Google crawler traffic.

Monday: log URL, timestamp, network location, cache status, HTTP status, TTFB, total time and transferred/decoded sizes for a bounded set of priority pages. Include natural cache transitions; do not manufacture production load with cache-busting URLs. Separate HIT from MISS/STALE and repeated connections from fresh ones. Use Crawl Stats and deployment traces for actual crawler/availability issues when accessible.

Trace database/cache/upstream dependencies before changing `revalidate=60`. The integration source already caches the club price fetch for five minutes. Invalidation must work across the actual production instances; calling a local `bustCatalog()` alone does not prove every edge/server cache is fresh. If a longer TTL is justified, prove price, size, availability, feed and checkout consistency after an authorized staging edit before release. Never edit live inventory just to run a test.

Measure compressed HTML, client JS, render and interactions separately. Set budgets from the measured page type; do not mandate deleting half the content or cutting every page in half. Track slow outliers and p50/p95 with sample sizes; do not promise every future response below one second.

## 6. Google product eligibility: a concrete feed review

The live [merchant RSS](https://www.boutique-de-boxe.com/flux-marchand.xml) has 3,502 unique entries. The 1,042-product JSON catalogue is a different interface. Existing feed generation, grouping and Google category fields should be preserved.

Two specific review items exist in integration source:

- Line 57 emits `identifier_exists=no` for every item, even when a brand is supplied. Google requires this flag to reflect whether assigned identifiers actually exist. Audit manufacturer GTIN/MPN evidence per model; do not invent identifiers or substitute an internal SKU for a manufacturer MPN. Do not assume this has already caused a Merchant Center rejection. [Identifier rules](https://support.google.com/merchants/answer/6324478?hl=en).
- Line 48 sends every size of a model to the same bare product URL. Confirm that the advertised variant is clearly selected/matched on arrival; otherwise add supported variant preselection while preserving the product's organic canonical and stable feed IDs. Test price, size, image, availability and checkout continuity. [Variant grouping and landing rules](https://support.google.com/merchants/answer/6324507?hl=en).

The owner-confirmed InStock decision is not reversed here. Confirm operational facts and landing/feed consistency, especially unusual items. Read existing Merchant Center diagnostics and account status before submitting another source or changing settings. Do not promise 3,502 impressions, 1,042 approved products or superiority because the other site has fewer products. Paid Shopping is outside this plan.

## 7. Monday-to-Friday work order

| Day | Work | Acceptance and stop rule |
| --- | --- | --- |
| Mon 26 morning | Confirm deployed revision and integration branch; capture GSC query/page baseline, priority indexed records and existing Merchant Center diagnostics. Start bounded cache/latency observations. | No release from old main. No invented GSC states. If private data is unavailable, finish public tests but leave ranking/index decisions explicitly unverified. |
| Mon 26 afternoon | Small Toulouse purchasing-first patch and targeted contextual link improvements, only after checking actual indexed/canonical state. | Keep URL/title unless a specific defect warrants change. Regression checks before one controlled release; no unrelated visual or commerce changes. |
| Tue 27 | Feed identifier/variant-landing audit; validate justified fixes. Investigate reproduced latency causes. | Correct facts and variant continuity; no blanket stock changes, no new feed/account without review, no blind cache rewrite. |
| Wed 28 | Classify GSC query/page opportunities; select a few high-value near-page-one queries or commercial gaps. | Evaluate actual query/page pairs, not domain-average position. Preserve already successful pages. No mass city expansion. |
| Thu 29 | Improve evidence-backed category/guide gaps and relevant earned-link opportunities; optional sitemap family split only if useful for reporting. | Real expertise and facts only; no link purchases, fake reviews, fabricated storefronts or automatic outreach. |
| Fri 30 | Compare technical/commerce checks and record Google observations under the same query/location/device method. | Report completed controlled changes separately from observed ranking/crawl effects. Do not call a few days without uplift a failed or successful algorithmic test. |

Splitting the sitemap would improve reporting by page family, not rank directly. Keep its canonical URL set stable and dates truthful. Alert sign-ups for price/new-size notifications are a separate conversion project requiring the promised notification service and consent; they are not a prerequisite for Google ranking and should not displace the focused work above.

## 8. Search Console runbook and measurement contract

No access to current private query/page reports was available in this pass. Work remains executable without asking the owner to redesign the plan; these are the account-dependent reads needed at execution time.

### Priority inspection queue

All twelve URLs below were confirmed present in the live sitemap on 24 October. Presence is not an indexed-status verdict:

`/` · `/boutique-de-boxe-toulouse/` · `/boutique-boxe/` · `/materiel-boxe/` · `/vente-materiel-de-boxe/` · `/gants-de-boxe/` · `/gants-mma/` · `/materiel-mma/` · `/sacs-de-frappe/` · `/protections-boxe/` · `/guides/choisir-gants-boxe/` · `/produits/bouteille-650ml-infinity-noir/`.

For each: indexed report verdict, last crawl, Google-selected canonical, declared canonical and relevant exclusion reason. An eligible live test is not proof of current index membership. If indexed correctly, stop requesting indexing and diagnose relevance/competition. If a changed/new priority page warrants a request, request once within Google's available quota and log it separately from subsequent crawl/index results. Use the sitemap for broad discovery.

### Performance baseline

Use Web search, France, last 28 complete days versus preceding 28 complete days, desktop/mobile separately. Export Queries and Pages; join/filter actual query–landing-page combinations. Prioritize business-relevant demand near positions 8–20 when present, low CTR only against comparable position/device intent, and clear high-value missing destinations. These are prioritization heuristics, not Google rules or a substitute for data.

Watchlist: boutique de boxe; boutique de boxe Toulouse; matériel de boxe; matériel de boxe Toulouse; vente matériel de boxe; gants de boxe; gants MMA; matériel MMA; sac de frappe; choisir ses gants de boxe. Add the brief's remaining terms from the current query registry without inventing search volumes.

Record for every browser observation: exact query, date/time, displayed search location, device, language/country context, organic position and exact landing URL, plus ads/maps/Shopping separately. Compare Toulouse, Paris and Lyon as distinct location samples. `gl=fr`, language or adding a city to the query does not by itself prove the searcher is located in that city. Stop at a CAPTCHA or blocked session; do not solve or bypass it as part of monitoring.

Record row: `date | source | query | country/location | device | landing URL | impressions | clicks | CTR | average position or observed organic rank | indexed verdict | Google canonical | last crawl | deployed SHA | change | uncertainty`.

Website organic results, Maps and Shopping are separate tracks. An online shop must not invent a physical retail presence to enter Maps. Review actual Business Profile eligibility before any profile proposal. [Business representation rules](https://support.google.com/business/answer/3038177?hl=en).

## 9. Friday acceptance versus the ranking objective

Controlled completion criteria:

- Correct branch/release provenance recorded and rollback identified.
- Twelve intended priority destinations technically checked; GSC indexed/canonical evidence recorded where accessible, missing evidence named otherwise.
- Toulouse answers buying intent before the directory without losing facts, functionality or accessibility.
- Existing links are preserved and useful contextual paths verified; no redundant footer spam.
- Merchant feed review documents identifier and variant outcomes with actual account diagnostics where accessible.
- Any cache/performance fix is supported by comparable measurements and catalogue-consistency tests.
- Same-method Google baseline and change log exist; no invented traffic/ranking percentage.

Observed outcomes: first-page coverage and progress toward first position per priority query/location/device, impressions and qualified clicks; approved/serving product listings tracked separately. Review ranking effects after meaningful recrawl time and over subsequent complete periods, not just Friday. Do not optimize for an approximate `site:` total or force all 1,290 URLs into the index.

## 10. Adversarial review and handoff

- Search engineer: the base analysis overstated index certainty and ranking causality. Corrected above; current GSC detail remains unverified.
- Buyer: a training census is not the first answer to an equipment purchase. The proposed hierarchy addresses that gap without erasing local value.
- Commerce operator: feed generation is not proof of stock, selected variants or account approval. Preserve the documented owner decision and verify consistency.
- Release reviewer: main is behind the integration candidate. Deploying the wrong checkout is a preventable regression risk.
- Performance reviewer: warm cached response speed does not disprove slow outliers or establish field CWV. Comparable before/after evidence is required.
- Direct competitor: concise commercial relevance is worth learning; mass city generation and preorder markup without a demonstrated ordering flow are not a quality benchmark.

Research method: 30 Exa search results across the Google-policy and discovery searches, plus direct official-source reads, live HTTP/HTML/XML sampling and local read-only source checks. Three delegated audits covered Google rule verification, competitor structure and current-shop state; synthesis/source reconciliation was performed in the main workstream. Search results were filtered for primary evidence, and semantic ordering was never labeled Google rank.

This document is the only newly written project artifact. The supplied analysis is unchanged. No application implementation, production deployment, indexing submission, Merchant Center change, payment, outreach, recurring monitor or Monday automation was executed. Resume from this integration directory and the Monday provenance/data gates, not from the old October 5 diagnosis.
