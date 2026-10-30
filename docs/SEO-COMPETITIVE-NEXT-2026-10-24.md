# Remaining commercial evidence gaps — 24 October 2026

This review supports the next bounded improvement after the first SEO release. It is not a Google position report. Exa returns semantic matches, not a Google ranking baseline. Six targeted searches requested 30 results; the findings below rely on direct official retailer/manufacturer pages and current local source/catalogue inspection. No search volumes, authority scores, penalty claims or ranking uplift percentages are inferred.

The supplied `ANALYSE-MATERIEL-DE-BOXE-2026-10-24.md` remains background evidence. Its reported fourth place from Toulouse was not independently recaptured in a Google browser here. An empty `site:` result does not establish that our intended page is absent from Google's index. The first release already changed purchasing hierarchy, contextual links and variant landings; those are not proposed again.

## Three specific next improvements

| Observed gap | Verified evidence | Bounded action and acceptance |
| --- | --- | --- |
| The product sizing CTA reaches generic advice without the manufacturer's table or guide. | Every size selector links to `/guide-des-tailles/`. The current guide tells buyers to consult the brand but supplies no manufacturer links. [Decathlon's product page](https://www.decathlon.fr/p/gants-de-boxe-500/_/R-p-333027?mc=8651247) places sizing help beside the size selector. [Fairtex](https://www.fairtex.com/pages/fairtex-size-guide) publishes family and model guidance; [Metal Boxe](https://metal-boxe.com/pages/guides-des-tailles) publishes its own reference document. | Add relevant primary references to the existing guide and deep-link supported products to the relevant section. Show an exact-model table only when its applicability is verified. Unsupported brands/families retain general advice and the contact path. This work is prepared in the new manufacturer-sizing helper/component; caller integration and release are coordinated separately. |
| Known material evidence is lost during classification/serialization. | Three legacy glove records store `Matière extérieure: PU`: Blade, ERGO 90 and ONE. `materialOf()` currently reads only `Matières`, and `listItem()` retains only `Matières`/`Fermeture`. They can be omitted from a synthetic-material selection despite explicit source evidence. Of 183 static glove records, 168 have `Matières`; these three use the other key. | Normalize explicit supported material aliases consistently for server facets and client card data. Preserve the original evidence. Verify all three known models under the existing `Synthétique` filter, and verify that unknown material stays unknown. No material guessed from a brand or photograph. |
| Detailed guide text is more categorical than the cautious new buying brief. | `lib/guides-rayons.ts` contains fixed oz-by-exercise rules and a claim that training frequency determines when leather becomes the least expensive over its lifetime. Lacets/oz-only rules also classify some product recommendations. [Fairtex's own FAQ](https://www.fairtex.com/pages/faq) distinguishes model purposes and several sizing factors. [DragonSports' category](https://www.dragonsports.eu/fr/140150-gants-de-boxe) illustrates rich buying guidance but is not an independent safety standard. | Replace unsupported universal recommendations with source-bounded criteria, the actual model's declared purpose and the club/competition requirements. Do not imply that an oz number alone certifies sparring suitability, or that laces establish competition approval. A retailer's generic weight chart is not a rule to copy across brands. |

These are customer usefulness and factual consistency improvements. Their presence on other retail sites does not establish a causal Google ranking factor or guarantee a result within two weeks.

## Manufacturer sizing evidence and scope

| Manufacturer | Current catalogue scope | Primary evidence and implementation boundary |
| --- | --- | --- |
| Fairtex | 117 records, 67 with multiple offered sizes. The helper deliberately supports 60 relevant sized records. | [French manufacturer guide](https://fr.fairtex.com/pages/size-guide) and [Global guide](https://www.fairtex.com/pages/fairtex-size-guide), checked 24 October. They separate gloves, clothing and named shin-pad models. Only the four current SP5 colour records receive the SP5 table anchor. The HG10 headguard does not inherit the separate competition-headgear table. Bag gloves offered as M/L/XL and rashguards do not inherit an unrelated table. |
| Metal Boxe | 22 records, 10 with multiple offered sizes. The helper supports 13 relevant sized records, including single-size items. | [Manufacturer guide](https://metal-boxe.com/pages/guides-des-tailles), checked 24 October. Its current hosted image was fetched and visually inspected: it covers gloves, several protections, textile, boxing footwear and kimonos. Link to the source; do not reproduce its competition-weight grid as a current universal regulation. Mouthguards, bags, tools and striking equipment do not inherit a wearable sizing guide. |
| Elion | 384 records, 250 with multiple offered sizes. No sizing chart is supplied by this change. | [Official manufacturer site](https://elionparis.com/) and a [specific product page](https://elionparis.com/gants-de-boxe-dentrainement/lelegant-de-boxe-elion-paris-south-beach-velcro-turquoise) were found. The sampled homepage has no size-guide link, and the searches did not locate a primary measurement chart. This is an evidence gap, not proof that one does not exist. Do not borrow a reseller's generic chart and label it Elion's. |

The SP5 table is scoped to that model, with the manufacturer's approximate stature intervals and A/B dimensions. Boundary intervals overlap; the site must not turn them into an automatic guaranteed fit. Direct primary-page reads confirmed HTTP 200 for the French Fairtex and Metal Boxe guide URLs. These checks establish source availability at the review time, not permanent external uptime.

## Prepared files and verification

- `lib/manufacturer-sizing.ts`: exact manufacturer recognition, eligible product-family checks, stable source links, internal anchors and SP5-only data.
- `components/manufacturer-sizing.tsx` and `.css`: server-rendered references and scoped table using the existing visual identity. No remote image copy, tracking script or sizing calculator.
- `scripts/test-manufacturer-sizing.mjs`: five passing offline checks for unknown-brand exclusion, family exclusion, wrong-model isolation, actual catalogue coverage and rendered source/caveat content. Network access is forbidden in those fixtures.

Focused lint and whitespace checks passed. Root owns the guide route, product CTA integration, shared material normalization, browser/build verification and any production release. This document does not claim those later steps are already complete.

## Competitive boundaries retained

The [other team's shop](https://materiel-de-boxe.fr/) already emphasizes buying and delivery. The first release adapted that useful intent on our existing URLs. Its reported delivery terms, promotions, preorders and thousands of locality paths are not copied. Decathlon's displayed reviews, testing, returns and store collection describe its operation; they do not authorize invented reviews, testing credentials, service promises or a physical shop for Boutique de Boxe.

Higher ranking confidence now requires genuine query/page observations, Google crawl/canonical evidence and sustained performance measurement. More words, keyword repetitions or another set of synonym/city pages would not resolve those evidence gaps.
