# Studio rules
- Studio copy lists use the shared `listCoherence.ts` guard at final voice review and rendering; semantic deduplication keeps original complementary arguments without padding or modifying media metadata.
- Studio list editing targets the text leaf rather than the icon-bearing row and rejects positional snapshots with mismatched slot counts; this preserves icons and prevents stale edits shifting into labels after deduplication.
- Studio PNG exports must always use the shared static export surface in `exportImage.ts`; one pipeline prevents preview/download drift across individual, batch, carousel, thumbnail, and gallery flows.
- Official Studio screenshots use `photoPolicy` and exact canonical differential mappings, never `studio_photos` or fallback matches; this preserves quota-free framing and semantic fit.
- User-inserted Studio images are DOM layers on the shared art surface: background insertions stay behind text with reduced brightness, while composition insertions remain foreground, movable, resizable, and export through the same PNG pipeline.
- Studio cross-field copy coherence must be enforced by the shared final voice guard and shared block support picker; one global gate prevents brand- or layout-specific repetition and dangling titles.
- Studio acronym explanations and legacy loss-connector repairs must use shared contextual copy normalization after the final voice guard and in ecosystem construction; one idempotent rule keeps formats readable without altering media metadata.
- Device mockups in Studio arts get their screen text from `mockScreens.ts` (headline keyword → topic theme for the owner brand; deduplicated feature labels, never audience names, for client brands) so the illustration always matches the art's promise.
