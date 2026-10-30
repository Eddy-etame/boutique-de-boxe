# SEO implementation and release record — 24 October 2026

## Release status

Implementation was brought forward from the Monday plan at the owner's request. The tested source was rebuilt remotely, promoted to the public domain and verified live on **24 October 2026**. Required release gates are complete; Google outcomes and account-dependent diagnostics remain unmeasured. This is a release record, not a Google ranking report.

| Gate | Current state |
| --- | --- |
| Implementation and focused offline tests | PASS, details below |
| TypeScript, focused lint, existing `npm test` suite | PASS in the coordinating agent's local checks; full repository lint is not clean because of inherited errors in unchanged files |
| Local production-build desktop/mobile browser checks | PASS at 1440, 390 and 320 px; selected-size, no-JavaScript and no-exception checks included |
| Complete production build | **PASS — `npm run build`, exit 0; compiled in 13.6 s, TypeScript in 61 s, 260/260 generated pages in 52 s** |
| Production-mode priority HTTP/readiness audit | **PASS — 40 priority queries / 67 distinct destinations, 27 commercial briefs / 32 city/region answers; SSR, canonicals, JSON-LD and pagination** |
| Full 1,290-URL sitemap audit | **PASS — exit 0; 1,290 pages, 1,314 internal links, 1,290 unique titles and descriptions** |
| Remote deployment build and immutable smoke tests | **READY / PASS — existing production configuration rebuilt remotely; authenticated immutable checks passed** |
| Public domain promotion and post-promotion smoke tests | **PASS — promotion exited 0; public www inspection confirms the new READY production deployment; live HTTP/browser checks passed** |
| Google indexed status, query rankings and Merchant Center approval | Not measured by these implementation checks |

Working directory: `C:\Users\Mommy Jayce\Desktop\Boxing Center\Deployment\_boutique\integration`, branch `v9-integration-2026-10-22`. Starting revision: `a611a77` (23 October). Private deployment inspection subsequently confirmed that the previous public production deployment also carried GitHub metadata SHA `a611a77`. The older main checkout is not the release source.

Tested source is base revision `a611a77` **plus the uncommitted implementation patch**, not that commit alone. Current upload manifest: `outputs/source-manifest.json`, source hash `52a274ee3dda9f97d08bd3990ac2da6a130a78cc1a1db5a945d7ea43cdb5e718`.

Uploaded release identity: base `a611a77` plus the patch captured by the source hash above; **no new commit or Git push was made**. Deployment `dpl_3zy7jMreKH9NSGvYNJao11auBQh9` is READY and promoted to [www.boutique-de-boxe.com](https://www.boutique-de-boxe.com). Immutable URL: [boutique-de-boxe-73ipimuap-eddy-etames-projects.vercel.app](https://boutique-de-boxe-73ipimuap-eddy-etames-projects.vercel.app). Public HTTP/browser verification completed at approximately **21:42 Africa/Douala**.

**Future deployment warning:** the immutable deployment and source manifest identify this release, not a new Git commit. A future Git/main redeploy must include this SEO patch; otherwise it can replace the live improvements with older source. Review and integrate the patch before any later Git-based release rather than assuming main already contains it.

## What changed

### Commercial keyword destinations

- Added compact, server-rendered purchasing answers covering **27 distinct commercial destinations** in the existing query registry. These provide equipment-specific decisions, catalogue-derived model counts/price ranges, existing dispatch/delivery facts and useful guide/category paths.
- Existing product grids and detailed buying guides remain. Page-one briefs are not repeated on pagination. Informational destinations such as `/sports-de-combat/` and `/les-arts-martiaux/` do not receive a commercial fallback.
- Neighboring links now reflect equipment/discipline overlap rather than repeating the same first ten query-registry links on every hub. Titles, canonical destinations and the existing footer discovery paths are preserved.

Main files: `lib/buying-brief.ts`, `components/buying-brief.tsx`, `components/buying-brief.css`, `components/keyword-hub.tsx`, `app/[...slug]/page.tsx` and the relevant query answers in `lib/seo-copy.ts`.

### Existing city and region destinations

- **32 city/region pages** now answer the equipment-purchasing task before the training directory, using the existing products, real sizes, published delivery conditions and dispatch information.
- The source-backed venues, disciplines, regional departments and local facts are retained below the purchasing/equipment sections. No fictional physical retail location or collection point was added.
- Existing page URLs and titles remain; descriptions/answers and purchasing order are aligned with the page's commercial purpose. Styles were adapted for narrow screens without removing the local information.

Main files: `components/ville-page.tsx`, `lib/villes.ts`, `app/villes.css` and `app/wayfinding.css`.

### Merchant feed and product variant landings

- Preserved **3,502 unique feed item IDs** and the existing grouping/order; **3,136 sized entries** now link to an exact `?taille=` landing state rather than the same bare product URL.
- Product selection reads only valid advertised sizes, supports location changes and rejects unknown/multiple size parameters without selecting an arbitrary variant. The base product remains the organic canonical. Client location handling avoids making every product route dynamic merely to read search parameters.
- Variant JSON-LD/Offer URLs align with selectable size URLs. Existing price, availability, shipping, Google category and heavy-item exclusion rules remain.
- Removed the blanket assertion that every product has no assigned identifier. Explicit, valid GTIN/EAN evidence and clearly labeled manufacturer MPN fields can be emitted. Unknown identifiers are left unresolved, not invented from retailer references or internal SKUs. Current catalogue fixtures contain no verified identifier fields, so this change does **not** claim the identifier-enrichment work is complete.

Main files: `lib/merchant-products.ts`, `app/flux-marchand.xml/route.ts`, `components/shop-interactions.tsx` and `lib/seo.ts`.

### Dates and build safeguards

- A dated purchasing-brief revision is applied to the changed category/subfamily page-one content and the existing city/region purchasing content. Exactly **83 sitemap dates changed: 32 local pages and 51 commercial pages**, with the 27 commercial query-registry destinations forming a verified subset of the latter. The sitemap retains the same 1,290 URLs and **no product dates changed**. The unchanged national directory keeps its own revision; dates were not uniformly refreshed on deployment.
- Build worker/concurrency settings are bounded to limit memory spikes. This is a build safeguard, **not** evidence of faster Google crawling or improved field Core Web Vitals.
- `.vercelignore` excludes Git/build/dependency state, `.env`/`.env.*`, outputs, docs, work/research and local database artifacts from source upload. The dry upload-file manifest contains **4,436 files / 173,840,620 bytes**. This checks the upload boundary; it is not a deployment result.

## Preserved business and technical behavior

No catalogue prices, verified stock decision, opening date, payment provider, dispatch promise, transport charges, heavy-equipment quote rule, account permissions or order records were changed for SEO. No test purchase, payment or customer message was sent.

The owner's recorded InStock decision remains. Shipping/dispatch facts continue to come from the existing commerce source. Local production-mode priority checks preserve canonicals, public indexing intent, product/category routes, pagination and private-route behavior; the full sitemap audit has also passed. Passing post-deployment verification is recorded separately below.

## Verification evidence and limits

| Check | Result and scope |
| --- | --- |
| `node --test scripts/test-hub-commerce.mjs` | **8/8 PASS**, offline. Covers the 27 query-owner briefs, valid destination links, equipment-specific advice, informational exclusions, shoe/insole price distinction, heavy delivery and closed-sale behavior. |
| `node --test scripts/test-city-commerce.mjs` | **5/5 PASS**, offline server rendering. Covers city/region purchasing order, retained local facts and departments, metadata/canonicals, closed-sale behavior, empty catalogue and scoped dates. |
| `node scripts/test-merchant-products.mjs` | **PASS**, offline catalogue/route fixtures: **1,042 products**, 3,502 stable unique feed IDs, 3,136 exact-size links, price/availability preservation, identifier validation and client/static-route contracts. This is not 1,042 real purchases or account approvals. |
| `npm test` | **PASS**, existing local unit/mock suite; simulated provider/order behavior is not production transaction proof. |
| TypeScript and focused lint | **PASS**, including final oxlint over changed TypeScript/MJS files (exit 0). Full `npm run lint` has inherited errors in unchanged files and is **not** reported clean; no unrelated lint cleanup was attempted. |
| `npm run build` | **PASS**, exit 0: compilation 13.6 s, TypeScript 61 s, 260/260 pages generated in 52 s. The local build used a deliberately unreachable localhost database endpoint and `COMMERCE_MODE=simulation`, avoiding the production database/payment path. It verifies source/build and fallback behavior, not live database connectivity or actual payments. |
| Vercel remote source rebuild | **READY**, Next.js 16.3.8, using the existing production configuration rather than local prebuilt artifacts: compilation 5 s, TypeScript 14.6 s, 260 generated pages in 12.6 s; total build about one minute. No environment configuration was replaced by the local verification settings. |
| `scripts/test-google-browser.mjs` | **PASS against the local production build**, isolated browser with outside requests blocked. Purchasing content visible at 1440/390/320 px; no horizontal overflow on sampled Toulouse/gloves pages; exact-size selection, invalid-size rejection, retained canonical and no browser exceptions. No-JavaScript Toulouse purchasing content/directory checked. The test now waits for the semantic selected-size state: visible server-rendered buttons alone are not proof hydration has completed. No product-selection application fix was needed. |
| `scripts/audit-google-readiness.mjs` | **PASS against `http://localhost:3106`**: 40 priority queries, 67 distinct destinations, 27 commercial briefs, 32 city/region purchasing answers; initial HTML, metadata/canonicals, parseable JSON-LD, page-two self-canonical/content and selected-size product canonical checked. This is not the separate full 1,290-URL audit or a live Google index check. |
| `QA_ORIGIN=http://localhost:3106 node scripts/audit-seo.mjs` | **PASS**, exit 0: **1,290 pages, 1,314 internal links, 1,290 unique titles and 1,290 unique descriptions**. This validates the local production-build HTTP/SEO contract, not Google indexing, rankings or a public production deployment. |
| `npm run test:shell` | **PASS**, including focused lint. An obsolete test assertion was repaired to match the actual existing head guard; four cookie states, host/canonical behavior and no-JavaScript behavior passed. This was a test correction, not a production consent-guard change. |
| Local feed versus existing live feed | **PASS, read-only comparison of all 3,502 items**: IDs, prices, availability, grouping and shipping match. The new exact-size links and honest identifier handling are intentional differences; no order or payment was made. |
| Public post-promotion HTTP/readiness audit | **PASS against `https://www.boutique-de-boxe.com`**: 40 priority queries / 67 destinations, 27 commercial briefs and 32 local purchasing answers; SSR, canonical, JSON-LD, pagination and sized-product contracts checked. This is a technical check, not a search-index/ranking measurement. |
| Public post-promotion browser checks | **PASS** at 1440/390/320 px: Toulouse/gloves purchasing content visible, no horizontal overflow, advertised 10 oz size selected with base canonical preserved, no-JavaScript directory retained, no page exceptions, **zero transactions**. |
| Public robots/sitemap/feed and Organization image | **PASS**: robots unchanged, same 1,290 sitemap URL set, feed matches the verified immutable deployment for all 3,502 items and 3,136 exact-size links. The public Organization image returns 200 with `image/png`. |

Browser artifact: `outputs/google-browser.json` (local/ignored), with desktop/mobile screenshots `outputs/seo-toulouse-{width}.png` and `outputs/seo-gloves-{width}.png`. The current production-build browser report includes all six Toulouse/gloves × 1440/390/320 combinations and records no-JavaScript and variant-selection passes.

Local production-mode priority audit artifact: `outputs/google-readiness-local.json`, origin `http://localhost:3106`. The local pagination loop was caused by Next's loopback-hostname normalization between `127.0.0.1` and `localhost`. Binding the local production server with `--hostname localhost` resolved the verification environment; no application proxy change was required. Subsequent public checks below verify the promoted release separately.

Full 1,290-URL sitemap audit artifact: `outputs/seo.json`, **PASS**. Scoped-date comparison: 83 changed dates, unchanged 1,290-URL set, no product-date changes.

Authenticated immutable-deployment artifact: `outputs/staged-smoke.json`, **PASS**, measured 24 October at 21:41:36 Africa/Douala (`2026-10-24T20:41:36.184Z`). Checks covered Toulouse and Île-de-France purchasing markers/canonicals, page-two canonical behavior, and all 3,502 feed items: IDs, prices, availability, grouping and shipping unchanged; 3,136 selected-size links present; no blanket `identifier_exists=no`. These checks preceded public promotion. No payment or customer action was performed.

Post-promotion public artifacts:

- `outputs/google-readiness.json`: **PASS**, public www origin, 40 queries / 67 destinations / 27 commercial briefs / 32 local answers, measured at 21:42:33 Africa/Douala (`2026-10-24T20:42:33.914Z`). Its status remains `technical-readiness-only`; Google index status and rankings are explicitly `not measured`.
- `outputs/google-browser-live.json`: **PASS**, measured at 21:42:48 Africa/Douala (`2026-10-24T20:42:48.907Z`), all six Toulouse/gloves × 1440/390/320 combinations, selected-size and no-JavaScript passes, no page exceptions and zero transactions.
- Live screenshots: `outputs/live-toulouse-{width}.png` and `outputs/live-gloves-{width}.png` for widths 1440, 390 and 320.

## Release and rollback runbook

1. Production compilation, priority HTTP/readiness, browser, shell and the full 1,290-URL audit have passed. Preserve the source manifest and verify any subsequent source change before release. Record failures explicitly; do not skip a failing gate to meet a ranking deadline.
2. Record the final tested Git revision and outgoing diff. Preserve unrelated work and the owner's attribution; no automatic assistant co-author trailer.
3. The tested integration **source** was deployed with `--prod --skip-domain`, rebuilt remotely with the existing production environment and reached READY. Authenticated immutable smoke tests passed. The local closed-database/simulation verification settings were not copied into production configuration. Promotion subsequently exited 0 after checking that the then-public deployment still matched the rollback target; public www inspection confirmed the new deployment ID and READY production target.
4. Post-promotion read-only public HTTP/browser smoke checks **passed**: the priority destinations, Toulouse/region content, gloves page one/page two, sized product landing, robots, sitemap, merchant feed and Organization image. Feed IDs/prices/availability/grouping/shipping match the verified immutable deployment. Keep the same read-only checks for future releases.
5. If a material commerce, routing, cache or rendering regression appears, restore the known previous deployment and record the reason before attempting another release.

Known previous production rollback target supplied by the coordinator:

- Deployment ID: `dpl_GWKcuUs9ijwDNb4jy498cJnGPa65`
- Immutable hostname: `boutique-de-boxe-gjij4ryuy-eddy-etames-projects.vercel.app`

Rollback eligibility and alias state must be checked at action time. Public promotion and post-promotion verification completed successfully; no rollback was needed or performed.

## Account-dependent follow-up

- **Search Console:** record current priority URL indexed status, last crawl and Google-selected canonical. Compare France query × landing page × device performance across complete periods. Request a crawl once when appropriate for important changed URLs; repeated submissions do not guarantee indexing or rank. Neither `site:` totals nor local technical eligibility establish Google results.
- **Merchant Center:** inspect actual account/feed diagnostics, variant landing behavior, shipping/returns and serving status after feed refresh. A valid XML response is not approval or guaranteed free-listing exposure.
- **Product identifiers:** collect manufacturer-supported GTIN/EAN/MPN evidence. Never fabricate a GTIN or relabel an internal or reseller code as a manufacturer identifier to clear a warning.
- **Outcomes:** track first-page coverage and movement toward first position per priority query/location/device separately from technical pass rates. No majority-first-page, first-position, traffic, indexing or Merchant Center outcome is promised by this release record.

## Final coordinator update

Production build: **PASS**, `npm run build`, exit 0, 260/260 pages; local closed-database/simulation verification. Remote source rebuild: **READY**, Next.js 16.3.8, existing production configuration, about one minute total build.

Production-mode priority HTTP/readiness audit: **PASS**, 40 queries / 67 destinations. Production-build browser and shell checks: **PASS**.

Full 1,290-URL sitemap audit: **PASS**, exit 0, 1,314 internal links, 1,290 unique titles/descriptions. Sitemap comparison: same 1,290 URLs; 83 scoped date changes (32 local + 51 commercial); no product-date changes.

Source deployment `dpl_3zy7jMreKH9NSGvYNJao11auBQh9` is READY after `--prod --skip-domain`; immutable smoke tests passed. Source hash remains `52a274ee3dda9f97d08bd3990ac2da6a130a78cc1a1db5a945d7ea43cdb5e718` for base `a611a77` plus the implementation patch.

Immutable URL: `https://boutique-de-boxe-73ipimuap-eddy-etames-projects.vercel.app`. Public www alias promotion: **PASS**, exit 0, READY production target confirmed by deployment inspection.

Post-promotion public verification: **PASS**, HTTP/readiness plus 1440/390/320 browser and no-JavaScript checks. Remaining work is account-dependent GSC/Merchant Center/identifier evidence and measurement over time, not an uncompleted release gate. No Google ranking, indexing or Merchant Center approval claim follows from deployment.

No new commit or Git push was made. Preserve and integrate the tested source patch before a future Git/main redeploy.
