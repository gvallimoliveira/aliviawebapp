# Architecture decisions

- Studio PNG exports must always use the shared static export surface in `exportImage.ts`; one pipeline prevents preview/download drift across individual, batch, carousel, thumbnail, and gallery flows.