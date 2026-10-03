# Architecture decisions

- Studio PNG exports must always use the shared static export surface in `exportImage.ts`; one pipeline prevents preview/download drift across individual, batch, carousel, thumbnail, and gallery flows.
- Aliv.iA solution ecosystems must reference the canonical differential IDs in `aliviaDifferentials.ts`; one source prevents feature copy and product promises from drifting.
- Official Aliv.iA Studio screenshots are synthetic library assets mapped by canonical differential ID, never `studio_photos` rows; ecosystems use only these explicit mappings and render no image when a feature has no exact screenshot, preventing semantic fallback mismatches while preserving quota-free local framing.