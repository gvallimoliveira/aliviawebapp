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
      d: "M72,71 L76,72 C62,70 40,85 40,104 L59,103 C60,80 69,77 76,70 L78,70 Z" },
    { id: "left_shoulder", label_pt: "Ombro Esquerdo", label_en: "Left Shoulder",
      d: "M135,80 L140,77 C140,66 150,76 158,105 L138,107 C140,80 131,78 126,66 L125,78 Z" },
    { id: "chest", label_pt: "Tórax / Peitoral", label_en: "Chest",
      d: "M88,60 L112,60 L126,66 L132,80 L132,108 L68,108 L68,80 L74,66Z" },
    { id: "right_arm", label_pt: "Braço Direito", label_en: "Right Arm",
      d: "M44,108 L58,105 L55,155 L41,150 Z" },
    { id: "left_arm", label_pt: "Braço Esquerdo", label_en: "Left Arm",
      d: "M137,114 L157,105 L161,150 L143,156 Z" },
    { id: "right_elbow", label_pt: "Cotovelo Direito", label_en: "Right Elbow",
      d: "M38,138 L52,142 L48,164 L34,160Z" },
    { id: "left_elbow", label_pt: "Cotovelo Esquerdo", label_en: "Left Elbow",
      d: "M148,142 L162,138 L166,160 L152,164Z" },
    { id: "right_forearm", label_pt: "Antebraço Direito", label_en: "Right Forearm",
      d: "M34,160 L48,164 L42,220 L28,216Z" },
    { id: "left_forearm", label_pt: "Antebraço Esquerdo", label_en: "Left Forearm",
      d: "M152,164 L166,160 L172,216 L158,220Z" },
    { id: "right_hand", label_pt: "Mão Direita", label_en: "Right Hand",
      d: "M21,210 L42,220 L38,250 C34,256 28,256 24,252 C8,241 4,221 17,214 Z" },
    { id: "left_hand", label_pt: "Mão Esquerda", label_en: "Left Hand",
      d: "M158,220 L182,208 L193,223 C196,247 178,252 174,256 C175,254 171,246 171,247 Z" },
    { id: "abdomen", label_pt: "Abdômen", label_en: "Abdomen",
      d: "M66,129 L129,130 L129,187 L69,187 Z" },
    { id: "right_hip", label_pt: "Quadril Direito", label_en: "Right Hip",
      d: "M70,170 L100,170 L98,200 L66,196Z" },
    { id: "left_hip", label_pt: "Quadril Esquerdo", label_en: "Left Hip",
      d: "M100,170 L130,170 L134,196 L102,200Z" },
    { id: "right_thigh_ant", label_pt: "Coxa Anterior Dir.", label_en: "Right Anterior Thigh",
      d: "M66,196 L98,200 L94,284 L64,278Z" },
    { id: "left_thigh_ant", label_pt: "Coxa Anterior Esq.", label_en: "Left Anterior Thigh",
      d: "M102,200 L134,196 L136,278 L106,284Z" },
    { id: "right_knee", label_pt: "Joelho Direito", label_en: "Right Knee",
      d: "M69,287 L94,284 L99,315 L72,311 Z" },
    { id: "left_knee", label_pt: "Joelho Esquerdo", label_en: "Left Knee",
      d: "M107,289 L133,291 L134,306 L108,310 Z" },
    { id: "right_shin", label_pt: "Canela Direita", label_en: "Right Shin",
      d: "M72,315 L92,310 L100,382 L86,378 Z" },
    { id: "left_shin", label_pt: "Canela Esquerda", label_en: "Left Shin",
      d: "M108,310 L134,306 L121,376 L104,385 Z" },
    { id: "right_ankle", label_pt: "Tornozelo Direito", label_en: "Right Ankle",
      d: "M85,380 L103,383 L99,399 L86,396 Z" },
    { id: "left_ankle", label_pt: "Tornozelo Esquerdo", label_en: "Left Ankle",
      d: "M103,379 L120,381 L122,393 L105,400 Z" },
    { id: "right_foot", label_pt: "Pé Direito", label_en: "Right Foot",
      d: "M84,393 L103,393 L98,417 C91,427 74,422 66,420 C77,414 58,408 78,401 Z" },
    { id: "left_foot", label_pt: "Pé Esquerdo", label_en: "Left Foot",
      d: "M114,399 L132,392 L138,398 C142,408 140,416 134,420 C126,422 116,429 108,416 Z" },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // BACK VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  back: [
    { id: "head_back", label_pt: "Cabeça (post.)", label_en: "Head (post.)",
      d: "M100,6 C86,6 78,14 78,22 C78,30 84,36 92,38 L108,38 C116,36 122,30 122,22 C122,14 114,6 100,6Z" },
    { id: "cervical", label_pt: "Cervical", label_en: "Cervical",
      d: "M81,22 L113,19 L112,55 L88,55 Z" },
    { id: "right_shoulder_back", label_pt: "Ombro Dir. (post.)", label_en: "R. Shoulder (post.)",
      d: "M55,87 L49,81 C60,66 41,91 41,108 L72,112 C60,80 66,94 65,82 L71,91 Z" },
    { id: "left_shoulder_back", label_pt: "Ombro Esq. (post.)", label_en: "L. Shoulder (post.)",
      d: "M112,55 L128,60 C140,66 150,76 156,88 L144,92 C140,80 134,72 126,66 L112,60Z" },
    { id: "thoracic", label_pt: "Torácica", label_en: "Thoracic",
      d: "M89,75 L106,79 L119,81 L132,80 L131,147 L69,143 L68,80 L75,84 Z" },
    { id: "lower_back", label_pt: "Lombar", label_en: "Lower Back",
      d: "M67,152 L129,152 L131,189 L69,187 Z" },
    { id: "right_arm_back", label_pt: "Braço Dir. (post.)", label_en: "R. Arm (post.)",
      d: "M38,117 L56,127 L53,167 L34,156 Z" },
    { id: "left_arm_back", label_pt: "Braço Esq. (post.)", label_en: "L. Arm (post.)",
      d: "M124,82 L156,88 L155,119 L132,119 Z" },
    { id: "right_elbow_back", label_pt: "Cotovelo Dir. (post.)", label_en: "R. Elbow (post.)",
      d: "M34,155 L55,167 L50,183 L29,176 Z" },
    { id: "left_elbow_back", label_pt: "Cotovelo Esq. (post.)", label_en: "L. Elbow (post.)",
      d: "M135,125 L162,138 L166,160 L145,173 Z" },
    { id: "right_forearm_back", label_pt: "Antebraço Dir. (post.)", label_en: "R. Forearm (post.)",
      d: "M34,160 L48,164 L42,220 L28,216Z" },
    { id: "left_forearm_back", label_pt: "Antebraço Esq. (post.)", label_en: "L. Forearm (post.)",
      d: "M152,164 L166,160 L172,216 L158,220Z" },
    { id: "right_hand_back", label_pt: "Mão Dir. (post.)", label_en: "R. Hand (post.)",
      d: "M28,216 L42,220 L38,250 C34,256 28,256 24,252 C18,246 20,236 26,222Z" },
    { id: "left_hand_back", label_pt: "Mão Esq. (post.)", label_en: "L. Hand (post.)",
      d: "M158,220 L172,216 L176,236 C180,246 178,252 174,256 C170,256 164,256 162,250Z" },
    { id: "right_gluteal", label_pt: "Glúteo Direito", label_en: "Right Gluteal",
      d: "M69,188 L97,190 L100,210 C96,218 83,250 70,234 C54,231 68,204 68,194 Z" },
    { id: "left_gluteal", label_pt: "Glúteo Esquerdo", label_en: "Left Gluteal",
      d: "M101,190 L125,186 L132,194 C132,204 134,230 125,236 C107,230 104,240 100,210 Z" },
    { id: "right_thigh_post", label_pt: "Coxa Posterior Dir.", label_en: "R. Posterior Thigh",
      d: "M59,237 C74,239 83,239 92,240 L97,242 L95,304 L67,301 Z" },
    { id: "left_thigh_post", label_pt: "Coxa Posterior Esq.", label_en: "L. Posterior Thigh",
      d: "M98,241 L106,239 C121,242 128,240 134,238 L127,301 L102,297 Z" },
    { id: "right_knee_back", label_pt: "Joelho Dir. (post.)", label_en: "R. Knee (post.)",
      d: "M64,278 L94,284 L92,310 L66,306Z" },
    { id: "left_knee_back", label_pt: "Joelho Esq. (post.)", label_en: "L. Knee (post.)",
      d: "M106,284 L136,278 L134,306 L108,310Z" },
    { id: "right_calf", label_pt: "Panturrilha Direita", label_en: "Right Calf",
      d: "M69,315 L92,310 L88,380 L84,379 Z" },
    { id: "left_calf", label_pt: "Panturrilha Esquerda", label_en: "Left Calf",
      d: "M103,319 L126,313 L114,377 L103,379 Z" },
    { id: "right_ankle_back", label_pt: "Tornozelo Dir. (post.)", label_en: "R. Ankle (post.)",
      d: "M70,376 L88,380 L86,396 L68,392Z" },
    { id: "left_ankle_back", label_pt: "Tornozelo Esq. (post.)", label_en: "L. Ankle (post.)",
      d: "M112,380 L130,376 L132,392 L114,396Z" },
    { id: "right_foot_back", label_pt: "Pé Dir. (post.)", label_en: "R. Foot (post.)",
      d: "M88,392 L93,389 L97,430 C80,420 74,422 82,420 C60,416 75,408 83,398 Z" },
    { id: "left_foot_back", label_pt: "Pé Esq. (post.)", label_en: "L. Foot (post.)",
      d: "M103,386 L108,397 L117,403 C142,408 110,420 134,420 C104,435 101,430 97,410 Z" },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // LEFT LATERAL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  left: [
    { id: "head_left", label_pt: "Cabeça (lat. esq.)", label_en: "Head (left)",
      d: "M100,5 C86,5 76,12 74,22 C72,32 76,38 82,42 L122,42 C128,38 132,30 130,22 C128,12 118,5 100,5Z" },

    { id: "cervical_left", label_pt: "Cervical (lat. esq.)", label_en: "Cervical (left)",
      d: "M82,42 L122,42 L124,55 L80,55Z" },

    { id: "shoulder_left", label_pt: "Ombro Esquerdo (lat.)", label_en: "Left Shoulder (lat.)",
      d: "M80,55 L124,55 L140,62 L146,78 L146,90 L54,90 L54,78 L60,62Z" },

    { id: "arm_left", label_pt: "Braço (lat. esq.)", label_en: "Arm (left lat.)",
      d: "M146,90 L164,90 L168,136 L150,140Z" },

    { id: "elbow_left", label_pt: "Cotovelo (lat. esq.)", label_en: "Elbow (left lat.)",
      d: "M150,140 L168,136 L172,160 L154,164Z" },

    { id: "forearm_left", label_pt: "Antebraço (lat. esq.)", label_en: "Forearm (left lat.)",
      d: "M154,164 L172,160 L178,214 L160,218Z" },

    { id: "hand_left", label_pt: "Mão (lat. esq.)", label_en: "Hand (left lat.)",
      d: "M160,218 L178,214 L182,234 C184,244 182,250 178,254 C174,254 168,254 164,248Z" },

    { id: "thoracic_left", label_pt: "Torácica (lat. esq.)", label_en: "Thoracic (left)",
      d: "M54,90 L146,90 L144,120 L56,120Z" },

    { id: "lumbar_left", label_pt: "Lombar (lat. esq.)", label_en: "Lumbar (left)",
      d: "M56,120 L144,120 L142,170 L58,170Z" },

    { id: "hip_left", label_pt: "Quadril (lat. esq.)", label_en: "Hip (left lat.)",
      d: "M58,170 L142,170 L140,208 L60,208Z" },

    { id: "thigh_left", label_pt: "Coxa (lat. esq.)", label_en: "Thigh (left lat.)",
      d: "M60,208 L140,208 L134,284 L66,284Z" },

    { id: "knee_left", label_pt: "Joelho (lat. esq.)", label_en: "Knee (left lat.)",
      d: "M66,284 L134,284 L130,310 L70,310Z" },

    { id: "shin_left", label_pt: "Perna (lat. esq.)", label_en: "Leg (left lat.)",
      d: "M70,310 L130,310 L124,380 L74,380Z" },

    { id: "ankle_left", label_pt: "Tornozelo (lat. esq.)", label_en: "Ankle (left lat.)",
      d: "M74,380 L124,380 L122,396 L76,396Z" },

    { id: "foot_left", label_pt: "Pé (lat. esq.)", label_en: "Foot (left lat.)",
      d: "M76,396 L122,396 L132,400 C138,406 140,414 134,420 C128,426 114,428 100,424 C86,420 76,412 74,404Z" },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RIGHT LATERAL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  right: [
    { id: "head_right", label_pt: "Cabeça (lat. dir.)", label_en: "Head (right)",
      d: "M105,5 C90,5 78,12 76,22 C74,32 78,38 84,42 L124,42 C130,38 134,30 132,22 C130,12 120,5 105,5Z" },

    { id: "cervical_right", label_pt: "Cervical (lat. dir.)", label_en: "Cervical (right)",
      d: "M84,42 L124,42 L126,55 L82,55Z" },

    { id: "shoulder_right", label_pt: "Ombro Direito (lat.)", label_en: "Right Shoulder (lat.)",
      d: "M82,55 L126,55 L142,62 L148,78 L148,90 L56,90 L56,78 L62,62Z" },

    { id: "arm_right", label_pt: "Braço (lat. dir.)", label_en: "Arm (right lat.)",
      d: "M38,90 L56,90 L52,140 L34,136Z" },

    { id: "elbow_right", label_pt: "Cotovelo (lat. dir.)", label_en: "Elbow (right lat.)",
      d: "M34,136 L52,140 L48,164 L30,160Z" },

    { id: "forearm_right", label_pt: "Antebraço (lat. dir.)", label_en: "Forearm (right lat.)",
      d: "M30,160 L48,164 L42,218 L26,214Z" },

    { id: "hand_right", label_pt: "Mão (lat. dir.)", label_en: "Hand (right lat.)",
      d: "M26,214 L42,218 L38,248 C34,254 28,254 22,250 C18,244 20,234 24,220Z" },

    { id: "thoracic_right", label_pt: "Torácica (lat. dir.)", label_en: "Thoracic (right)",
      d: "M62,90 L148,90 L146,120 L64,120Z" },

    { id: "lumbar_right", label_pt: "Lombar (lat. dir.)", label_en: "Lumbar (right)",
      d: "M64,120 L146,120 L144,170 L66,170Z" },

    { id: "hip_right", label_pt: "Quadril (lat. dir.)", label_en: "Hip (right lat.)",
      d: "M66,170 L144,170 L142,208 L64,208Z" },

    { id: "thigh_right", label_pt: "Coxa (lat. dir.)", label_en: "Thigh (right lat.)",
      d: "M64,208 L142,208 L134,284 L68,284Z" },

    { id: "knee_right", label_pt: "Joelho (lat. dir.)", label_en: "Knee (right lat.)",
      d: "M68,284 L134,284 L130,310 L72,310Z" },

    { id: "shin_right", label_pt: "Perna (lat. dir.)", label_en: "Leg (right lat.)",
      d: "M72,310 L130,310 L124,380 L76,380Z" },

    { id: "ankle_right", label_pt: "Tornozelo (lat. dir.)", label_en: "Ankle (right lat.)",
      d: "M76,380 L124,380 L122,396 L74,396Z" },

    { id: "foot_right", label_pt: "Pé (lat. dir.)", label_en: "Foot (right lat.)",
      d: "M74,396 L122,396 L128,406 C132,414 128,420 120,424 C108,428 90,426 78,420 C68,414 64,406 68,400Z" },
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
