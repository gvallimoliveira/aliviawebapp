export type View = "front" | "back" | "left" | "right";

export interface ClickableRegion {
  id: string;
  label_pt: string;
  label_en: string;
  /** SVG path data – viewBox 0 0 200 440 */
  d: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// All coordinates are hand-measured against each image using a 20-unit grid
// overlay (viewBox 0 0 200 440). The image is stretched to fill the same
// container as the SVG so coordinates match pixel-perfectly.
// ─────────────────────────────────────────────────────────────────────────────

export const regionsByView: Record<View, ClickableRegion[]> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // FRONT VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  front: [
    { id: "head", label_pt: "Cabeça", label_en: "Head",
      d: "M100,6 C86,6 78,14 78,24 C78,32 84,38 92,40 L108,40 C116,38 122,32 122,24 C122,14 114,6 100,6Z" },

    { id: "cervical_front", label_pt: "Cervical", label_en: "Cervical",
      d: "M92,40 L108,40 L112,55 L88,55Z" },

    { id: "right_shoulder", label_pt: "Ombro Direito", label_en: "Right Shoulder",
      d: "M88,55 L72,60 C60,66 50,76 44,88 L56,92 C60,80 66,72 74,66 L88,60Z" },

    { id: "left_shoulder", label_pt: "Ombro Esquerdo", label_en: "Left Shoulder",
      d: "M112,55 L128,60 C140,66 150,76 156,88 L144,92 C140,80 134,72 126,66 L112,60Z" },

    { id: "chest", label_pt: "Tórax / Peitoral", label_en: "Chest",
      d: "M88,60 L112,60 L126,66 L132,80 L132,108 L68,108 L68,80 L74,66Z" },

    { id: "right_arm", label_pt: "Braço Direito", label_en: "Right Arm",
      d: "M44,88 L56,92 L52,142 L38,138Z" },

    { id: "left_arm", label_pt: "Braço Esquerdo", label_en: "Left Arm",
      d: "M144,92 L156,88 L162,138 L148,142Z" },

    { id: "right_elbow", label_pt: "Cotovelo Direito", label_en: "Right Elbow",
      d: "M38,138 L52,142 L48,164 L34,160Z" },

    { id: "left_elbow", label_pt: "Cotovelo Esquerdo", label_en: "Left Elbow",
      d: "M148,142 L162,138 L166,160 L152,164Z" },

    { id: "right_forearm", label_pt: "Antebraço Direito", label_en: "Right Forearm",
      d: "M34,160 L48,164 L42,220 L28,216Z" },

    { id: "left_forearm", label_pt: "Antebraço Esquerdo", label_en: "Left Forearm",
      d: "M152,164 L166,160 L172,216 L158,220Z" },

    { id: "right_hand", label_pt: "Mão Direita", label_en: "Right Hand",
      d: "M28,216 L42,220 L38,250 C34,256 28,256 24,252 C18,246 20,236 26,222Z" },

    { id: "left_hand", label_pt: "Mão Esquerda", label_en: "Left Hand",
      d: "M158,220 L172,216 L176,236 C180,246 178,252 174,256 C170,256 164,256 162,250Z" },

    { id: "abdomen", label_pt: "Abdômen", label_en: "Abdomen",
      d: "M68,108 L132,108 L130,170 L70,170Z" },

    { id: "right_hip", label_pt: "Quadril Direito", label_en: "Right Hip",
      d: "M70,170 L100,170 L98,200 L66,196Z" },

    { id: "left_hip", label_pt: "Quadril Esquerdo", label_en: "Left Hip",
      d: "M100,170 L130,170 L134,196 L102,200Z" },

    { id: "right_thigh_ant", label_pt: "Coxa Anterior Dir.", label_en: "Right Anterior Thigh",
      d: "M66,196 L98,200 L94,284 L64,278Z" },

    { id: "left_thigh_ant", label_pt: "Coxa Anterior Esq.", label_en: "Left Anterior Thigh",
      d: "M102,200 L134,196 L136,278 L106,284Z" },

    { id: "right_knee", label_pt: "Joelho Direito", label_en: "Right Knee",
      d: "M64,278 L94,284 L92,310 L66,306Z" },

    { id: "left_knee", label_pt: "Joelho Esquerdo", label_en: "Left Knee",
      d: "M106,284 L136,278 L134,306 L108,310Z" },

    { id: "right_shin", label_pt: "Canela Direita", label_en: "Right Shin",
      d: "M66,306 L92,310 L88,380 L70,376Z" },

    { id: "left_shin", label_pt: "Canela Esquerda", label_en: "Left Shin",
      d: "M108,310 L134,306 L130,376 L112,380Z" },

    { id: "right_ankle", label_pt: "Tornozelo Direito", label_en: "Right Ankle",
      d: "M70,376 L88,380 L86,396 L68,392Z" },

    { id: "left_ankle", label_pt: "Tornozelo Esquerdo", label_en: "Left Ankle",
      d: "M112,380 L130,376 L132,392 L114,396Z" },

    { id: "right_foot", label_pt: "Pé Direito", label_en: "Right Foot",
      d: "M68,392 L86,396 L84,414 C80,420 74,422 66,420 C60,416 58,408 62,398Z" },

    { id: "left_foot", label_pt: "Pé Esquerdo", label_en: "Left Foot",
      d: "M114,396 L132,392 L138,398 C142,408 140,416 134,420 C126,422 120,420 116,414Z" },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // BACK VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  back: [
    { id: "head_back", label_pt: "Cabeça (post.)", label_en: "Head (post.)",
      d: "M100,6 C86,6 78,14 78,22 C78,30 84,36 92,38 L108,38 C116,36 122,30 122,22 C122,14 114,6 100,6Z" },

    { id: "cervical", label_pt: "Cervical", label_en: "Cervical",
      d: "M92,38 L108,38 L112,55 L88,55Z" },

    { id: "right_shoulder_back", label_pt: "Ombro Dir. (post.)", label_en: "R. Shoulder (post.)",
      d: "M88,55 L72,60 C60,66 50,76 44,88 L56,92 C60,80 66,72 74,66 L88,60Z" },

    { id: "left_shoulder_back", label_pt: "Ombro Esq. (post.)", label_en: "L. Shoulder (post.)",
      d: "M112,55 L128,60 C140,66 150,76 156,88 L144,92 C140,80 134,72 126,66 L112,60Z" },

    { id: "thoracic", label_pt: "Torácica", label_en: "Thoracic",
      d: "M88,60 L112,60 L126,66 L132,80 L132,120 L68,120 L68,80 L74,66Z" },

    { id: "lower_back", label_pt: "Lombar", label_en: "Lower Back",
      d: "M68,120 L132,120 L130,170 L70,170Z" },

    { id: "right_arm_back", label_pt: "Braço Dir. (post.)", label_en: "R. Arm (post.)",
      d: "M44,88 L56,92 L52,142 L38,138Z" },

    { id: "left_arm_back", label_pt: "Braço Esq. (post.)", label_en: "L. Arm (post.)",
      d: "M144,92 L156,88 L162,138 L148,142Z" },

    { id: "right_elbow_back", label_pt: "Cotovelo Dir. (post.)", label_en: "R. Elbow (post.)",
      d: "M38,138 L52,142 L48,164 L34,160Z" },

    { id: "left_elbow_back", label_pt: "Cotovelo Esq. (post.)", label_en: "L. Elbow (post.)",
      d: "M148,142 L162,138 L166,160 L152,164Z" },

    { id: "right_forearm_back", label_pt: "Antebraço Dir. (post.)", label_en: "R. Forearm (post.)",
      d: "M34,160 L48,164 L42,220 L28,216Z" },

    { id: "left_forearm_back", label_pt: "Antebraço Esq. (post.)", label_en: "L. Forearm (post.)",
      d: "M152,164 L166,160 L172,216 L158,220Z" },

    { id: "right_hand_back", label_pt: "Mão Dir. (post.)", label_en: "R. Hand (post.)",
      d: "M28,216 L42,220 L38,250 C34,256 28,256 24,252 C18,246 20,236 26,222Z" },

    { id: "left_hand_back", label_pt: "Mão Esq. (post.)", label_en: "L. Hand (post.)",
      d: "M158,220 L172,216 L176,236 C180,246 178,252 174,256 C170,256 164,256 162,250Z" },

    { id: "right_gluteal", label_pt: "Glúteo Direito", label_en: "Right Gluteal",
      d: "M70,170 L100,170 L100,210 C96,218 86,220 78,216 C72,212 68,204 68,194Z" },

    { id: "left_gluteal", label_pt: "Glúteo Esquerdo", label_en: "Left Gluteal",
      d: "M100,170 L130,170 L132,194 C132,204 128,212 122,216 C114,220 104,218 100,210Z" },

    { id: "right_thigh_post", label_pt: "Coxa Posterior Dir.", label_en: "R. Posterior Thigh",
      d: "M68,210 C72,218 82,222 96,220 L98,222 L94,284 L64,278Z" },

    { id: "left_thigh_post", label_pt: "Coxa Posterior Esq.", label_en: "L. Posterior Thigh",
      d: "M104,220 L102,222 C118,222 128,218 132,210 L136,278 L106,284Z" },

    { id: "right_knee_back", label_pt: "Joelho Dir. (post.)", label_en: "R. Knee (post.)",
      d: "M64,278 L94,284 L92,310 L66,306Z" },

    { id: "left_knee_back", label_pt: "Joelho Esq. (post.)", label_en: "L. Knee (post.)",
      d: "M106,284 L136,278 L134,306 L108,310Z" },

    { id: "right_calf", label_pt: "Panturrilha Direita", label_en: "Right Calf",
      d: "M66,306 L92,310 L88,380 L70,376Z" },

    { id: "left_calf", label_pt: "Panturrilha Esquerda", label_en: "Left Calf",
      d: "M108,310 L134,306 L130,376 L112,380Z" },

    { id: "right_ankle_back", label_pt: "Tornozelo Dir. (post.)", label_en: "R. Ankle (post.)",
      d: "M70,376 L88,380 L86,396 L68,392Z" },

    { id: "left_ankle_back", label_pt: "Tornozelo Esq. (post.)", label_en: "L. Ankle (post.)",
      d: "M112,380 L130,376 L132,392 L114,396Z" },

    { id: "right_foot_back", label_pt: "Pé Dir. (post.)", label_en: "R. Foot (post.)",
      d: "M68,392 L86,396 L84,414 C80,420 74,422 66,420 C60,416 58,408 62,398Z" },

    { id: "left_foot_back", label_pt: "Pé Esq. (post.)", label_en: "L. Foot (post.)",
      d: "M114,396 L132,392 L138,398 C142,408 140,416 134,420 C126,422 120,420 116,414Z" },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // LEFT LATERAL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  left: [
    { id: "head_left", label_pt: "Cabeça (lat. esq.)", label_en: "Head (left)",
      d: "M105,5 C90,5 78,12 76,22 C74,32 78,38 84,42 L124,42 C130,38 134,30 132,22 C130,12 120,5 105,5Z" },

    { id: "cervical_left", label_pt: "Cervical (lat. esq.)", label_en: "Cervical (left)",
      d: "M84,42 L124,42 L126,55 L82,55Z" },

    { id: "shoulder_left", label_pt: "Ombro Esquerdo (lat.)", label_en: "Left Shoulder (lat.)",
      d: "M82,55 L126,55 L142,62 L148,78 L148,90 L56,90 L56,78 L62,62Z" },

    { id: "arm_left", label_pt: "Braço (lat. esq.)", label_en: "Arm (left lat.)",
      d: "M38,90 L56,90 L52,140 L34,136Z" },

    { id: "elbow_left", label_pt: "Cotovelo (lat. esq.)", label_en: "Elbow (left lat.)",
      d: "M34,136 L52,140 L48,164 L30,160Z" },

    { id: "forearm_left", label_pt: "Antebraço (lat. esq.)", label_en: "Forearm (left lat.)",
      d: "M30,160 L48,164 L42,218 L26,214Z" },

    { id: "hand_left", label_pt: "Mão (lat. esq.)", label_en: "Hand (left lat.)",
      d: "M26,214 L42,218 L38,248 C34,254 28,254 22,250 C18,244 20,234 24,220Z" },

    { id: "thoracic_left", label_pt: "Torácica (lat. esq.)", label_en: "Thoracic (left)",
      d: "M62,90 L148,90 L146,120 L64,120Z" },

    { id: "lumbar_left", label_pt: "Lombar (lat. esq.)", label_en: "Lumbar (left)",
      d: "M64,120 L146,120 L144,170 L66,170Z" },

    { id: "hip_left", label_pt: "Quadril (lat. esq.)", label_en: "Hip (left lat.)",
      d: "M66,170 L144,170 L142,208 L64,208Z" },

    { id: "thigh_left", label_pt: "Coxa (lat. esq.)", label_en: "Thigh (left lat.)",
      d: "M64,208 L142,208 L134,284 L68,284Z" },

    { id: "knee_left", label_pt: "Joelho (lat. esq.)", label_en: "Knee (left lat.)",
      d: "M68,284 L134,284 L130,310 L72,310Z" },

    { id: "shin_left", label_pt: "Perna (lat. esq.)", label_en: "Leg (left lat.)",
      d: "M72,310 L130,310 L124,380 L76,380Z" },

    { id: "ankle_left", label_pt: "Tornozelo (lat. esq.)", label_en: "Ankle (left lat.)",
      d: "M76,380 L124,380 L122,396 L74,396Z" },

    { id: "foot_left", label_pt: "Pé (lat. esq.)", label_en: "Foot (left lat.)",
      d: "M74,396 L122,396 L128,406 C132,414 128,420 120,424 C108,428 90,426 78,420 C68,414 64,406 68,400Z" },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RIGHT LATERAL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  right: [
    { id: "head_right", label_pt: "Cabeça (lat. dir.)", label_en: "Head (right)",
      d: "M100,5 C86,5 76,12 74,22 C72,32 76,38 82,42 L122,42 C128,38 132,30 130,22 C128,12 118,5 100,5Z" },

    { id: "cervical_right", label_pt: "Cervical (lat. dir.)", label_en: "Cervical (right)",
      d: "M82,42 L122,42 L124,55 L80,55Z" },

    { id: "shoulder_right", label_pt: "Ombro Direito (lat.)", label_en: "Right Shoulder (lat.)",
      d: "M80,55 L124,55 L140,62 L146,78 L146,90 L54,90 L54,78 L60,62Z" },

    { id: "arm_right", label_pt: "Braço (lat. dir.)", label_en: "Arm (right lat.)",
      d: "M146,90 L164,90 L168,136 L150,140Z" },

    { id: "elbow_right", label_pt: "Cotovelo (lat. dir.)", label_en: "Elbow (right lat.)",
      d: "M150,140 L168,136 L172,160 L154,164Z" },

    { id: "forearm_right", label_pt: "Antebraço (lat. dir.)", label_en: "Forearm (right lat.)",
      d: "M154,164 L172,160 L178,214 L160,218Z" },

    { id: "hand_right", label_pt: "Mão (lat. dir.)", label_en: "Hand (right lat.)",
      d: "M160,218 L178,214 L182,234 C184,244 182,250 178,254 C174,254 168,254 164,248Z" },

    { id: "thoracic_right", label_pt: "Torácica (lat. dir.)", label_en: "Thoracic (right)",
      d: "M54,90 L146,90 L144,120 L56,120Z" },

    { id: "lumbar_right", label_pt: "Lombar (lat. dir.)", label_en: "Lumbar (right)",
      d: "M56,120 L144,120 L142,170 L58,170Z" },

    { id: "hip_right", label_pt: "Quadril (lat. dir.)", label_en: "Hip (right lat.)",
      d: "M58,170 L142,170 L140,208 L60,208Z" },

    { id: "thigh_right", label_pt: "Coxa (lat. dir.)", label_en: "Thigh (right lat.)",
      d: "M60,208 L140,208 L134,284 L66,284Z" },

    { id: "knee_right", label_pt: "Joelho (lat. dir.)", label_en: "Knee (right lat.)",
      d: "M66,284 L134,284 L130,310 L70,310Z" },

    { id: "shin_right", label_pt: "Perna (lat. dir.)", label_en: "Leg (right lat.)",
      d: "M70,310 L130,310 L124,380 L74,380Z" },

    { id: "ankle_right", label_pt: "Tornozelo (lat. dir.)", label_en: "Ankle (right lat.)",
      d: "M74,380 L124,380 L122,396 L76,396Z" },

    { id: "foot_right", label_pt: "Pé (lat. dir.)", label_en: "Foot (right lat.)",
      d: "M76,396 L122,396 L132,400 C138,406 140,414 134,420 C128,426 114,428 100,424 C86,420 76,412 74,404Z" },
  ],
};

/** Helper to get all regions across all views for chip display */
export function getAllRegions(): Record<string, { label_pt: string; label_en: string }> {
  const all: Record<string, { label_pt: string; label_en: string }> = {};
  for (const view of Object.values(regionsByView)) {
    for (const region of view) {
      all[region.id] = { label_pt: region.label_pt, label_en: region.label_en };
    }
  }
  return all;
}
