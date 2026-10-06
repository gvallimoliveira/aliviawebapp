# Architecture decisions

- Cardiovascular views use `usePatientBirthDate` to refresh demographics after patient record edits and on refocus; age-dependent estimates must not remain stale or reset unsaved session inputs.

- Periodization link actions must explicitly use button type="button"; these controls can be embedded inside patient-record forms and must never submit them.

- Studio copy lists use the shared `listCoherence.ts` guard at final voice review and rendering; semantic deduplication keeps original complementary arguments without padding or modifying media metadata.
- Studio list editing targets the text leaf rather than the icon-bearing row and rejects positional snapshots with mismatched slot counts; this preserves icons and prevents stale edits shifting into labels after deduplication.

- Studio PNG exports must always use the shared static export surface in `exportImage.ts`; one pipeline prevents preview/download drift across individual, batch, carousel, thumbnail, and gallery flows.
- Aliv.iA solution ecosystems must reference the canonical differential IDs in `aliviaDifferentials.ts`; one source prevents feature copy and product promises from drifting.
- Aliv.iA landing-page messages must feed Studio through the canonical differential repertoire, never through new UI controls; this keeps audience promises synchronized without crowding creation settings.
- Official Aliv.iA Studio screenshots are synthetic library assets resolved by the shared `photoPolicy` from canonical differential mappings, never `studio_photos` rows; every format renders no official image without an exact declared match, preventing semantic fallback mismatches while preserving quota-free local framing.
- User-inserted Studio images are DOM layers on the shared art surface: background insertions stay behind text with reduced brightness, while composition insertions remain foreground, movable, resizable, and export through the same PNG pipeline.
- Studio cross-field copy coherence must be enforced by the shared final voice guard and shared block support picker; one global gate prevents brand- or layout-specific repetition and dangling titles.
- Studio acronym explanations and legacy loss-connector repairs must use shared contextual copy normalization after the final voice guard and in ecosystem construction; one idempotent rule keeps formats readable without altering media metadata.
- Patient record paired sections use the shared native horizontal row; this preserves form behavior and lets section shortcuts reveal horizontally hidden content.
- Patient regional pain charts and comparisons share one chronological data helper; explicit regional measurements must never be replaced by an invented regional score from a multi-region global average.- HEP load metrics (volume, intensity, weekly sets per region, planned dose) are computed only by the shared `hepLoad.ts` helper; one deterministic source keeps the HEP panel and the microcycle dose consistent.
- Professional session writes (plain sRPE or heart-rate monitor data) go only through `saveProfessionalSession` in `periodizationData.ts`, which merges with the patient check-in of the same date/track and links the planned session; one row per session keeps ACWR and dose free of double counting. TRIMP/sRPE math lives only in `cardioLoad.ts`.
- "Today" in load control is always the local/Brazil calendar date (`localISODate` client-side, America/Sao_Paulo in the check-in function), never `toISOString()`; UTC rolls to tomorrow after 21h in Brazil.
