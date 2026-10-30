# Product evidence correction — 24 October 2026

## Finding and scope

The live release contained unsupported practice-level and glove-use assertions. These are verified content defects, not a demonstrated Google penalty or an isolated explanation of current ranking positions.

The catalogue contains 1,042 records. None has a nonempty explicit `Niveau conseillé`, `Niveau de pratique` or `Niveau` specification. The former `practiceLevel()` nevertheless supplied a level for every record, inferring expertise from names, categories and ages. Thirty records matched its competition branch because their name or usage contained words such as Professional, Elite or compétition. That branch also matched a sentence expressly denying that the available characteristics establish competition homologation.

There are 178 adult boxing-glove records. The former ounce table emitted a fixed usage assignment on 170 of them; the remaining eight lacked one of its mapped weights. Offered ounces establish a selectable weight. They do not alone establish a model's approved competition use or the right sparring choice for every person.

## Public examples captured before the correction

The following URLs returned 200 and exposed these statements in visible HTML on 24 October:

| Product | Observed problem |
| --- | --- |
| [Blade Metal Boxe](https://www.boutique-de-boxe.com/produits/gants-boxe-blade-metal-boxe-noir-blanc/) | Assigns the three offered weights to bag, technique and partner work as a fixed correspondence. The existing authored usage instead directs the buyer to the session, club requirements and fit. |
| [Elion Professional gel under-gloves](https://www.boutique-de-boxe.com/produits/sous-gants-elion-double-gel-bandes-noir-or/) | Publishes a confirmed/competition level because Professional appears in the product name. |
| [Manto Miko kimono](https://www.boutique-de-boxe.com/produits/kimono-jjb-manto-miko-noir/) | Publishes a confirmed/competition level, while the authored use says the characteristics do not establish competition homologation. |
| [Elion Professional Air Punch pads](https://www.boutique-de-boxe.com/produits/pattes-dours-elion-professional-air-punch-mat-black/) | Publishes the same inferred confirmed/competition level for a training accessory. |

Manufacturer cross-checks support a model-specific approach. [Venum's Shield product guidance](https://eu.venum.com/collections/gants-de-boxe-pro/products/venum-shield-pro-boxing-gloves-with-laces-black-gold) makes size guidance conditional on intended activity, fit and model characteristics and directs doubtful buyers to a coach. Its choices cannot justify applying a universal weight-to-use rule to every brand in this shop. [Elion's own protection catalogue](https://elionparis.com/protections-diverses) also uses Professional within the under-glove product name; that name alone is insufficient evidence for a practice-level recommendation.

## Implemented candidate correction

`lib/describe.ts` now:

- Returns a practice level only from an explicit, nonempty specification, preserving that evidence when a future record supplies it.
- Removes the universal ounce-to-use table and its comparison paragraphs. The real weights remain in the selector, technical description and size FAQ; no repetitive replacement paragraph was added.
- Asks practice-only FAQ questions when level evidence is absent. A recorded child audience remains a child model, without treating every child as a beginner.
- Preserves factual price comparisons, other colour comparisons, authored use/care, material-aware PU care and bottle care.
- Exports `PRODUCT_EVIDENCE_REVISION = '2026-10-24'` for the coordinating release's date handling.

The product-template caller must conditionally omit the practice-level row when the helper returns null. The coordinating agent owns that small `app/[...slug]/page.tsx` integration, final TypeScript/build checks, dates and release. No product data, price, availability, canonical, payment, account or feed setting was changed in this subtask.

## Verification

`node --test scripts/test-product-evidence.mjs`: **5/5 passed**. The checks execute the actual local TypeScript modules with network access forbidden. They cover all 1,042 level/FAQ records, the thirty former competition matches, a negated homologation statement, explicit-level positive fixtures, all 178 adult gloves, actual Blade weights, all five authored care records, PU care and the bottle regression.

`npx oxlint lib/describe.ts scripts/test-product-evidence.mjs`: **passed**, exit 0. `git diff --check` for those files: **passed**.

This document records an implemented local candidate and pre-correction public observations. Production rendering, deployment, Google's recrawl and ranking effects require separate evidence from the coordinating release. No commit or deployment was performed by this subtask.
