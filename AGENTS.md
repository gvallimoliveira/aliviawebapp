# Architecture decisions

- Studio PNG exports must always use the shared static export surface in `exportImage.ts`; one pipeline prevents preview/download drift across individual, batch, carousel, thumbnail, and gallery flows.
- Aliv.iA solution ecosystems must reference the canonical differential IDs in `aliviaDifferentials.ts`; one source prevents feature copy and product promises from drifting.
- Aliv.iA landing-page messages must feed Studio through the canonical differential repertoire, never through new UI controls; this keeps audience promises synchronized without crowding creation settings.
- Official Aliv.iA Studio screenshots are synthetic library assets resolved by the shared `photoPolicy` from canonical differential mappings, never `studio_photos` rows; every format renders no official image without an exact declared match, preventing semantic fallback mismatches while preserving quota-free local framing.
- User-inserted Studio images are DOM layers on the shared art surface: background insertions stay behind text with reduced brightness, while composition insertions remain foreground, movable, resizable, and export through the same PNG pipeline.
- Studio cross-field copy coherence must be enforced by the shared final voice guard and shared block support picker; one global gate prevents brand- or layout-specific repetition and dangling titles.