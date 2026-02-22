export type View = "front" | "back" | "left" | "right";

export interface ClickableRegion {
  id: string;
  label_pt: string;
  label_en: string;
  /** SVG path data for precise anatomical contour */
  d: string;
}

// SVG viewBox: 0 0 200 440  (matching ~1:2.2 portrait aspect)
// All paths are drawn to match the anatomical drawings precisely.

export const regionsByView: Record<View, ClickableRegion[]> = {
  front: [
    // ── Head ──
    { id: "head", label_pt: "Cabeça", label_en: "Head",
      d: "M100,8 C88,8 80,14 78,24 C76,34 78,42 82,48 C86,54 92,58 100,60 C108,58 114,54 118,48 C122,42 124,34 122,24 C120,14 112,8 100,8Z" },

    // ── Cervical ──
    { id: "cervical_front", label_pt: "Cervical", label_en: "Cervical",
      d: "M90,58 C92,62 94,66 96,68 L104,68 C106,66 108,62 110,58 L114,72 L86,72Z" },

    // ── Right Shoulder ──
    { id: "right_shoulder", label_pt: "Ombro Direito", label_en: "Right Shoulder",
      d: "M86,72 C78,74 70,78 64,84 C58,90 54,98 52,106 L62,108 C64,100 68,92 74,86 C78,82 82,78 86,76Z" },

    // ── Left Shoulder ──
    { id: "left_shoulder", label_pt: "Ombro Esquerdo", label_en: "Left Shoulder",
      d: "M114,72 C122,74 130,78 136,84 C142,90 146,98 148,106 L138,108 C136,100 132,92 126,86 C122,82 118,78 114,76Z" },

    // ── Chest / Pectoral ──
    { id: "chest", label_pt: "Tórax / Peitoral", label_en: "Chest",
      d: "M86,76 L114,76 L118,100 L120,130 L80,130 L82,100Z" },

    // ── Right Arm (upper) ──
    { id: "right_arm", label_pt: "Braço Direito", label_en: "Right Arm",
      d: "M52,106 L62,108 L58,148 L48,146Z" },

    // ── Left Arm (upper) ──
    { id: "left_arm", label_pt: "Braço Esquerdo", label_en: "Left Arm",
      d: "M138,108 L148,106 L152,146 L142,148Z" },

    // ── Right Elbow ──
    { id: "right_elbow", label_pt: "Cotovelo Direito", label_en: "Right Elbow",
      d: "M48,146 L58,148 L56,166 L46,164Z" },

    // ── Left Elbow ──
    { id: "left_elbow", label_pt: "Cotovelo Esquerdo", label_en: "Left Elbow",
      d: "M142,148 L152,146 L154,164 L144,166Z" },

    // ── Right Forearm ──
    { id: "right_forearm", label_pt: "Antebraço Direito", label_en: "Right Forearm",
      d: "M46,164 L56,166 L52,214 L42,212Z" },

    // ── Left Forearm ──
    { id: "left_forearm", label_pt: "Antebraço Esquerdo", label_en: "Left Forearm",
      d: "M144,166 L154,164 L158,212 L148,214Z" },

    // ── Right Hand ──
    { id: "right_hand", label_pt: "Mão Direita", label_en: "Right Hand",
      d: "M42,212 L52,214 L48,244 C46,248 42,250 38,248 C34,244 34,240 36,236Z" },

    // ── Left Hand ──
    { id: "left_hand", label_pt: "Mão Esquerda", label_en: "Left Hand",
      d: "M148,214 L158,212 L164,236 C166,240 166,244 162,248 C158,250 154,248 152,244Z" },

    // ── Abdomen ──
    { id: "abdomen", label_pt: "Abdômen", label_en: "Abdomen",
      d: "M80,130 L120,130 L118,178 L82,178Z" },

    // ── Right Hip ──
    { id: "right_hip", label_pt: "Quadril Direito", label_en: "Right Hip",
      d: "M82,178 L100,178 L96,204 L78,200Z" },

    // ── Left Hip ──
    { id: "left_hip", label_pt: "Quadril Esquerdo", label_en: "Left Hip",
      d: "M100,178 L118,178 L122,200 L104,204Z" },

    // ── Right Anterior Thigh ──
    { id: "right_thigh_ant", label_pt: "Coxa Anterior Dir.", label_en: "Right Anterior Thigh",
      d: "M78,200 L96,204 L94,286 L72,282Z" },

    // ── Left Anterior Thigh ──
    { id: "left_thigh_ant", label_pt: "Coxa Anterior Esq.", label_en: "Left Anterior Thigh",
      d: "M104,204 L122,200 L128,282 L106,286Z" },

    // ── Right Knee ──
    { id: "right_knee", label_pt: "Joelho Direito", label_en: "Right Knee",
      d: "M72,282 L94,286 L92,310 L70,306Z" },

    // ── Left Knee ──
    { id: "left_knee", label_pt: "Joelho Esquerdo", label_en: "Left Knee",
      d: "M106,286 L128,282 L130,306 L108,310Z" },

    // ── Right Shin ──
    { id: "right_shin", label_pt: "Canela Direita", label_en: "Right Shin",
      d: "M70,306 L92,310 L88,382 L72,378Z" },

    // ── Left Shin ──
    { id: "left_shin", label_pt: "Canela Esquerda", label_en: "Left Shin",
      d: "M108,310 L130,306 L128,378 L112,382Z" },

    // ── Right Ankle ──
    { id: "right_ankle", label_pt: "Tornozelo Direito", label_en: "Right Ankle",
      d: "M72,378 L88,382 L86,398 L70,394Z" },

    // ── Left Ankle ──
    { id: "left_ankle", label_pt: "Tornozelo Esquerdo", label_en: "Left Ankle",
      d: "M112,382 L128,378 L130,394 L114,398Z" },

    // ── Right Foot ──
    { id: "right_foot", label_pt: "Pé Direito", label_en: "Right Foot",
      d: "M70,394 L86,398 L88,420 C86,426 80,430 74,430 C68,428 64,424 64,418 C64,412 66,404 70,394Z" },

    // ── Left Foot ──
    { id: "left_foot", label_pt: "Pé Esquerdo", label_en: "Left Foot",
      d: "M114,398 L130,394 L134,412 C136,418 136,424 132,428 C128,430 122,430 118,426 C114,422 112,416 114,398Z" },
  ],

  back: [
    { id: "head_back", label_pt: "Cabeça (post.)", label_en: "Head (post.)",
      d: "M100,8 C88,8 80,14 78,24 C76,34 78,42 82,48 C86,54 92,58 100,60 C108,58 114,54 118,48 C122,42 124,34 122,24 C120,14 112,8 100,8Z" },

    { id: "cervical", label_pt: "Cervical", label_en: "Cervical",
      d: "M90,58 L110,58 L114,72 L86,72Z" },

    { id: "right_shoulder_back", label_pt: "Ombro Dir. (post.)", label_en: "R. Shoulder (post.)",
      d: "M86,72 C78,74 70,78 64,84 C58,90 54,98 52,106 L62,108 C64,100 68,92 74,86 C78,82 82,78 86,76Z" },

    { id: "left_shoulder_back", label_pt: "Ombro Esq. (post.)", label_en: "L. Shoulder (post.)",
      d: "M114,72 C122,74 130,78 136,84 C142,90 146,98 148,106 L138,108 C136,100 132,92 126,86 C122,82 118,78 114,76Z" },

    { id: "thoracic", label_pt: "Torácica", label_en: "Thoracic",
      d: "M86,76 L114,76 L118,100 L120,130 L80,130 L82,100Z" },

    { id: "lower_back", label_pt: "Lombar", label_en: "Lower Back",
      d: "M80,130 L120,130 L118,178 L82,178Z" },

    { id: "right_arm_back", label_pt: "Braço Dir. (post.)", label_en: "R. Arm (post.)",
      d: "M52,106 L62,108 L58,148 L48,146Z" },

    { id: "left_arm_back", label_pt: "Braço Esq. (post.)", label_en: "L. Arm (post.)",
      d: "M138,108 L148,106 L152,146 L142,148Z" },

    { id: "right_elbow_back", label_pt: "Cotovelo Dir. (post.)", label_en: "R. Elbow (post.)",
      d: "M48,146 L58,148 L56,166 L46,164Z" },

    { id: "left_elbow_back", label_pt: "Cotovelo Esq. (post.)", label_en: "L. Elbow (post.)",
      d: "M142,148 L152,146 L154,164 L144,166Z" },

    { id: "right_forearm_back", label_pt: "Antebraço Dir. (post.)", label_en: "R. Forearm (post.)",
      d: "M46,164 L56,166 L52,214 L42,212Z" },

    { id: "left_forearm_back", label_pt: "Antebraço Esq. (post.)", label_en: "L. Forearm (post.)",
      d: "M144,166 L154,164 L158,212 L148,214Z" },

    { id: "right_hand_back", label_pt: "Mão Dir. (post.)", label_en: "R. Hand (post.)",
      d: "M42,212 L52,214 L48,244 C46,248 42,250 38,248 C34,244 34,240 36,236Z" },

    { id: "left_hand_back", label_pt: "Mão Esq. (post.)", label_en: "L. Hand (post.)",
      d: "M148,214 L158,212 L164,236 C166,240 166,244 162,248 C158,250 154,248 152,244Z" },

    { id: "right_gluteal", label_pt: "Glúteo Direito", label_en: "Right Gluteal",
      d: "M82,178 L100,178 L100,210 C96,216 90,218 84,214 C80,210 78,204 78,198Z" },

    { id: "left_gluteal", label_pt: "Glúteo Esquerdo", label_en: "Left Gluteal",
      d: "M100,178 L118,178 L122,198 C122,204 120,210 116,214 C110,218 104,216 100,210Z" },

    { id: "right_thigh_post", label_pt: "Coxa Posterior Dir.", label_en: "R. Posterior Thigh",
      d: "M78,210 C80,216 86,220 94,218 L96,220 L94,286 L72,282Z" },

    { id: "left_thigh_post", label_pt: "Coxa Posterior Esq.", label_en: "L. Posterior Thigh",
      d: "M106,218 L104,220 C112,220 118,216 122,210 L128,282 L106,286Z" },

    { id: "right_knee_back", label_pt: "Joelho Dir. (post.)", label_en: "R. Knee (post.)",
      d: "M72,282 L94,286 L92,310 L70,306Z" },

    { id: "left_knee_back", label_pt: "Joelho Esq. (post.)", label_en: "L. Knee (post.)",
      d: "M106,286 L128,282 L130,306 L108,310Z" },

    { id: "right_calf", label_pt: "Panturrilha Direita", label_en: "Right Calf",
      d: "M70,306 L92,310 L88,382 L72,378Z" },

    { id: "left_calf", label_pt: "Panturrilha Esquerda", label_en: "Left Calf",
      d: "M108,310 L130,306 L128,378 L112,382Z" },

    { id: "right_ankle_back", label_pt: "Tornozelo Dir. (post.)", label_en: "R. Ankle (post.)",
      d: "M72,378 L88,382 L86,398 L70,394Z" },

    { id: "left_ankle_back", label_pt: "Tornozelo Esq. (post.)", label_en: "L. Ankle (post.)",
      d: "M112,382 L128,378 L130,394 L114,398Z" },

    { id: "right_foot_back", label_pt: "Pé Dir. (post.)", label_en: "R. Foot (post.)",
      d: "M70,394 L86,398 L88,420 C86,426 80,430 74,430 C68,428 64,424 64,418Z" },

    { id: "left_foot_back", label_pt: "Pé Esq. (post.)", label_en: "L. Foot (post.)",
      d: "M114,398 L130,394 L134,418 C136,424 132,428 126,430 C120,430 114,426 112,420Z" },
  ],

  left: [
    { id: "head_left", label_pt: "Cabeça (lat. esq.)", label_en: "Head (left)",
      d: "M90,8 C80,10 74,18 72,28 C70,38 72,46 76,52 C78,54 82,56 86,58 L112,58 C116,54 120,46 122,36 C124,26 122,16 116,10 C112,8 104,6 96,6Z" },

    { id: "cervical_left", label_pt: "Cervical (lat. esq.)", label_en: "Cervical (left)",
      d: "M82,58 L116,58 L118,78 L80,78Z" },

    { id: "shoulder_left", label_pt: "Ombro Esquerdo (lat.)", label_en: "Left Shoulder (lat.)",
      d: "M60,78 C56,84 52,92 50,100 L62,104 C64,96 68,88 74,82 L126,82 C130,86 134,92 136,100 L146,96 C144,88 140,82 134,78Z" },

    { id: "arm_left", label_pt: "Braço (lat. esq.)", label_en: "Arm (left lat.)",
      d: "M50,100 L62,104 L58,148 L46,144Z" },

    { id: "elbow_left", label_pt: "Cotovelo (lat. esq.)", label_en: "Elbow (left lat.)",
      d: "M46,144 L58,148 L56,168 L44,164Z" },

    { id: "forearm_left", label_pt: "Antebraço (lat. esq.)", label_en: "Forearm (left lat.)",
      d: "M44,164 L56,168 L52,216 L40,212Z" },

    { id: "hand_left", label_pt: "Mão (lat. esq.)", label_en: "Hand (left lat.)",
      d: "M40,212 L52,216 L48,246 C44,250 38,248 36,242 C34,236 36,228 40,212Z" },

    { id: "thoracic_left", label_pt: "Torácica (lat. esq.)", label_en: "Thoracic (left)",
      d: "M74,82 L126,82 L130,130 L70,130Z" },

    { id: "lumbar_left", label_pt: "Lombar (lat. esq.)", label_en: "Lumbar (left)",
      d: "M70,130 L130,130 L128,178 L72,178Z" },

    { id: "hip_left", label_pt: "Quadril (lat. esq.)", label_en: "Hip (left lat.)",
      d: "M72,178 L128,178 C132,186 134,196 132,206 L68,206 C66,196 68,186 72,178Z" },

    { id: "thigh_left", label_pt: "Coxa (lat. esq.)", label_en: "Thigh (left lat.)",
      d: "M68,206 L132,206 L126,286 L74,286Z" },

    { id: "knee_left", label_pt: "Joelho (lat. esq.)", label_en: "Knee (left lat.)",
      d: "M74,286 L126,286 L124,312 L76,312Z" },

    { id: "shin_left", label_pt: "Perna (lat. esq.)", label_en: "Leg (left lat.)",
      d: "M76,312 L124,312 L120,386 L80,386Z" },

    { id: "ankle_left", label_pt: "Tornozelo (lat. esq.)", label_en: "Ankle (left lat.)",
      d: "M80,386 L120,386 L118,404 L78,404Z" },

    { id: "foot_left", label_pt: "Pé (lat. esq.)", label_en: "Foot (left lat.)",
      d: "M78,404 L118,404 L116,418 C114,424 108,430 100,432 C88,432 78,426 74,418 C72,412 74,406 78,404Z" },
  ],

  right: [
    { id: "head_right", label_pt: "Cabeça (lat. dir.)", label_en: "Head (right)",
      d: "M110,8 C120,10 126,18 128,28 C130,38 128,46 124,52 C122,54 118,56 114,58 L88,58 C84,54 80,46 78,36 C76,26 78,16 84,10 C88,8 96,6 104,6Z" },

    { id: "cervical_right", label_pt: "Cervical (lat. dir.)", label_en: "Cervical (right)",
      d: "M84,58 L118,58 L120,78 L82,78Z" },

    { id: "shoulder_right", label_pt: "Ombro Direito (lat.)", label_en: "Right Shoulder (lat.)",
      d: "M66,78 C70,82 74,88 76,96 L86,100 C88,92 92,84 98,80 L134,80 C138,84 142,92 146,100 L156,96 C152,88 148,82 142,78Z" },

    { id: "arm_right", label_pt: "Braço (lat. dir.)", label_en: "Arm (right lat.)",
      d: "M140,100 L152,96 L156,144 L144,148Z" },

    { id: "elbow_right", label_pt: "Cotovelo (lat. dir.)", label_en: "Elbow (right lat.)",
      d: "M144,148 L156,144 L158,168 L146,164Z" },

    { id: "forearm_right", label_pt: "Antebraço (lat. dir.)", label_en: "Forearm (right lat.)",
      d: "M146,164 L158,168 L154,216 L142,212Z" },

    { id: "hand_right", label_pt: "Mão (lat. dir.)", label_en: "Hand (right lat.)",
      d: "M142,212 L154,216 L158,236 C160,242 158,248 154,250 C150,248 146,244 148,236Z" },

    { id: "thoracic_right", label_pt: "Torácica (lat. dir.)", label_en: "Thoracic (right)",
      d: "M74,82 L126,82 L130,130 L70,130Z" },

    { id: "lumbar_right", label_pt: "Lombar (lat. dir.)", label_en: "Lumbar (right)",
      d: "M70,130 L130,130 L128,178 L72,178Z" },

    { id: "hip_right", label_pt: "Quadril (lat. dir.)", label_en: "Hip (right lat.)",
      d: "M72,178 L128,178 C132,186 134,196 132,206 L68,206 C66,196 68,186 72,178Z" },

    { id: "thigh_right", label_pt: "Coxa (lat. dir.)", label_en: "Thigh (right lat.)",
      d: "M68,206 L132,206 L126,286 L74,286Z" },

    { id: "knee_right", label_pt: "Joelho (lat. dir.)", label_en: "Knee (right lat.)",
      d: "M74,286 L126,286 L124,312 L76,312Z" },

    { id: "shin_right", label_pt: "Perna (lat. dir.)", label_en: "Leg (right lat.)",
      d: "M76,312 L124,312 L120,386 L80,386Z" },

    { id: "ankle_right", label_pt: "Tornozelo (lat. dir.)", label_en: "Ankle (right lat.)",
      d: "M80,386 L120,386 L118,404 L78,404Z" },

    { id: "foot_right", label_pt: "Pé (lat. dir.)", label_en: "Foot (right lat.)",
      d: "M78,404 L118,404 L122,412 C126,418 126,426 120,430 C114,432 104,432 96,428 C88,424 84,416 82,410Z" },
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
