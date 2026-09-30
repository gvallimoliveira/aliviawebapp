# Architecture decisions

- Studio PNG exports must always use the shared static export surface in `exportImage.ts`; one pipeline prevents preview/download drift across individual, batch, carousel, thumbnail, and gallery flows.
- Aliv.iA solution ecosystems must reference the canonical differential IDs in `aliviaDifferentials.ts`; one source prevents feature copy and product promises from drifting.
- Official Aliv.iA Studio screenshots are synthetic library assets, never `studio_photos` rows; this keeps them quota-free while preserving local per-account framing.