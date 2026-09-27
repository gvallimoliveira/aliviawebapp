/**
 * NÚCLEO CRIATIVO COMPARTILHADO DO STUDIO
 *
 * Superfície única de importação do motor de artes. Existem dois consumidores:
 *
 * 1. **Studio interno** (`src/pages/studio/StudioLanding.tsx`) — ferramenta
 *    pessoal do fundador, só preview + conta VIP, marca Aliv.iA fixa e os
 *    4 mundos clínicos. CONGELADO: nada de multimarca, cota ou billing entra lá.
 * 2. **Studio público** (`src/pages/studio-pro/*`) — o produto SaaS multimarca.
 *
 * Regra: todo aprendizado criativo (blocos, personas, texturas, composição,
 * legendas, exportação) vive aqui e serve os dois. O que muda entre eles é só o
 * TEMA (marca + acervo de conteúdo) e a camada de conta/cobrança.
 *
 * As implementações continuam fisicamente em `src/pages/studio/*` para não
 * quebrar o interno; este módulo é o contrato estável de importação.
 */

// Aleatoriedade determinística (mesma seed → mesma arte).
export { createRng, randomSeed, type Rng } from "@/pages/studio/rng";

// Composição da página e tipos de bloco.
export { composePage, type BlockKind, type ComposedBlock } from "@/pages/studio/composePage";

// Equipe criativa.
export { PERSONAS, personaForSeed, type StudioPersona } from "@/pages/studio/personas";

// Seleção de conteúdo com consciência de cobertura editorial.
export { createPicker, phraseSignature, type StudioPicker, type PhraseMemory } from "@/pages/studio/picker";

// Variedade linguística global: léxico por registro de voz + frames retóricos.
export { applyLexicon, voiceRegister, synonymsOf, VOICE_REGISTERS, type VoiceRegister } from "@/pages/studio/lexicon";
export { varyContent, type VaryOptions } from "@/pages/studio/vary";

// Biblioteca de ganchos: mecanismo (frames virais) + acervo curado por marca.
export { HOOK_FRAMES, composeHooks, type HookFrame, type HookIngredients, type StudioHook } from "@/pages/studio/hooks";
export { curatedHooksFor } from "@/pages/studio/hookLibrary";
export {
  composeHeadlines,
  composeSubs,
  composeTypos,
  composeKinetic,
  composeClosings,
  headlineFrameCount,
  type CopyIngredients,
} from "@/pages/studio/phrasing";

export {
  buildCoverage,
  readExposureLog,
  recordExposure,
  type ExposureLog,
} from "@/pages/studio/coverage";

// Legendas e arquivos de texto.
export { buildCaption } from "@/pages/studio/caption";
export { buildFavoritesCaptions, buildPageCaptions } from "@/pages/studio/captionFile";
export { exportTextFile } from "@/pages/studio/exportText";
export { buildSchedule, buildScheduleFile } from "@/pages/studio/schedule";

// Exportação de imagem.
export {
  exportNodeAsPng,
  exportNodesAsPng,
  renderNodeToBlob,
  renderNodeToPngBlob,
  publicationPixelRatio,
  PUBLICATION_WIDTH,
  freezeMotion,
  lockUniformHeight,
  deliver,
  deliverMany,
  type ExportResult,
} from "@/pages/studio/exportImage";

// Contrato de bloco e utilidades visuais.
export type { BlockProps, StudioFormat, Alignment } from "@/pages/studio/blocks/shared";
export {
  SURFACES,
  surfaceFor,
  personaSurface,
  alignClasses,
  pickHeadline,
  sectionHeight,
  MESH_STYLE,
  DOTS_STYLE,
} from "@/pages/studio/blocks/shared";
export { TextureLayer, GeoOrnament, renderAccent } from "@/pages/studio/blocks/Texture";
export { default as StudioMotion, MOTION_KINDS, type MotionKind } from "@/pages/studio/blocks/StudioMotion";
export { default as StudioSignature } from "@/pages/studio/blocks/StudioSignature";

// Tema de marca (no público, será substituído pelo brand kit do cliente).
export { BRAND_LOGO, BRAND_NAME, BRAND_SLOGAN, BRAND_HANDLE, BRAND_SITE } from "@/pages/studio/brand";

// Acervo privado de fotos da conta (usado pelos blocos fotográficos).
export {
  PHOTO_USAGES,
  listPhotos,
  uploadPhoto,
  updatePhoto,
  deletePhoto,
  pickPhoto,
  DEFAULT_FRAMING,
  type PhotoFraming,
  type PhotoPatch,
  type PhotoUsage,
  type SafeArea,
  type StudioPhoto,
} from "@/pages/studio/photos";
export { default as PhotoFrame } from "@/pages/studio/blocks/PhotoFrame";

// Registro de blocos, pronto para renderizar uma composição.
export { STUDIO_BLOCKS } from "./blocks";
