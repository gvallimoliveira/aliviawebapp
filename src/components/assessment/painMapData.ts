export type View = "front" | "back" | "left" | "right";

export interface ClickableRegion {
  id: string;
  label_pt: string;
  label_en: string;
  /** Percentage-based coordinates [x%, y%, width%, height%] relative to each figure's bounding box */
  area: [number, number, number, number];
}

/**
 * Each view maps to a column in the 4-figure reference image.
 * The image is divided into 4 equal columns: front, back, left, right.
 * Column fractions: front=0-0.25, back=0.25-0.5, left=0.5-0.75, right=0.75-1.0
 */
export const viewColumns: Record<View, [number, number]> = {
  front: [0, 0.25],
  back: [0.25, 0.5],
  left: [0.5, 0.75],
  right: [0.75, 1.0],
};

// Clickable regions per view.
// area = [x%, y%, w%, h%] relative to the individual figure column.

export const regionsByView: Record<View, ClickableRegion[]> = {
  front: [
    { id: "head", label_pt: "Cabeça", label_en: "Head", area: [30, 0, 40, 8] },
    { id: "cervical_front", label_pt: "Cervical", label_en: "Cervical", area: [38, 8, 24, 4] },
    { id: "right_shoulder", label_pt: "Ombro Direito", label_en: "Right Shoulder", area: [8, 12, 24, 8] },
    { id: "left_shoulder", label_pt: "Ombro Esquerdo", label_en: "Left Shoulder", area: [68, 12, 24, 8] },
    { id: "right_arm", label_pt: "Braço Direito", label_en: "Right Arm", area: [4, 20, 18, 12] },
    { id: "left_arm", label_pt: "Braço Esquerdo", label_en: "Left Arm", area: [78, 20, 18, 12] },
    { id: "right_elbow", label_pt: "Cotovelo Direito", label_en: "Right Elbow", area: [2, 32, 18, 6] },
    { id: "left_elbow", label_pt: "Cotovelo Esquerdo", label_en: "Left Elbow", area: [80, 32, 18, 6] },
    { id: "right_forearm", label_pt: "Antebraço Direito", label_en: "Right Forearm", area: [0, 38, 18, 12] },
    { id: "left_forearm", label_pt: "Antebraço Esquerdo", label_en: "Left Forearm", area: [82, 38, 18, 12] },
    { id: "right_hand", label_pt: "Mão Direita", label_en: "Right Hand", area: [0, 50, 16, 8] },
    { id: "left_hand", label_pt: "Mão Esquerda", label_en: "Left Hand", area: [84, 50, 16, 8] },
    { id: "chest", label_pt: "Tórax / Peitoral", label_en: "Chest", area: [26, 14, 48, 12] },
    { id: "abdomen", label_pt: "Abdômen", label_en: "Abdomen", area: [28, 26, 44, 12] },
    { id: "right_hip", label_pt: "Quadril Direito", label_en: "Right Hip", area: [22, 38, 28, 8] },
    { id: "left_hip", label_pt: "Quadril Esquerdo", label_en: "Left Hip", area: [50, 38, 28, 8] },
    { id: "right_thigh_ant", label_pt: "Coxa Anterior Dir.", label_en: "Right Anterior Thigh", area: [20, 46, 28, 16] },
    { id: "left_thigh_ant", label_pt: "Coxa Anterior Esq.", label_en: "Left Anterior Thigh", area: [52, 46, 28, 16] },
    { id: "right_knee", label_pt: "Joelho Direito", label_en: "Right Knee", area: [22, 62, 24, 6] },
    { id: "left_knee", label_pt: "Joelho Esquerdo", label_en: "Left Knee", area: [54, 62, 24, 6] },
    { id: "right_shin", label_pt: "Canela Direita", label_en: "Right Shin", area: [22, 68, 22, 16] },
    { id: "left_shin", label_pt: "Canela Esquerda", label_en: "Left Shin", area: [56, 68, 22, 16] },
    { id: "right_ankle", label_pt: "Tornozelo Direito", label_en: "Right Ankle", area: [22, 84, 20, 5] },
    { id: "left_ankle", label_pt: "Tornozelo Esquerdo", label_en: "Left Ankle", area: [58, 84, 20, 5] },
    { id: "right_foot", label_pt: "Pé Direito", label_en: "Right Foot", area: [18, 89, 24, 8] },
    { id: "left_foot", label_pt: "Pé Esquerdo", label_en: "Left Foot", area: [56, 89, 24, 8] },
  ],
  back: [
    { id: "head_back", label_pt: "Cabeça (post.)", label_en: "Head (post.)", area: [30, 0, 40, 8] },
    { id: "cervical", label_pt: "Cervical", label_en: "Cervical", area: [38, 8, 24, 4] },
    { id: "right_shoulder_back", label_pt: "Ombro Dir. (post.)", label_en: "R. Shoulder (post.)", area: [8, 12, 24, 8] },
    { id: "left_shoulder_back", label_pt: "Ombro Esq. (post.)", label_en: "L. Shoulder (post.)", area: [68, 12, 24, 8] },
    { id: "thoracic", label_pt: "Torácica", label_en: "Thoracic", area: [26, 14, 48, 12] },
    { id: "lower_back", label_pt: "Lombar", label_en: "Lower Back", area: [28, 26, 44, 12] },
    { id: "right_arm_back", label_pt: "Braço Dir. (post.)", label_en: "R. Arm (post.)", area: [4, 20, 18, 12] },
    { id: "left_arm_back", label_pt: "Braço Esq. (post.)", label_en: "L. Arm (post.)", area: [78, 20, 18, 12] },
    { id: "right_elbow_back", label_pt: "Cotovelo Dir. (post.)", label_en: "R. Elbow (post.)", area: [2, 32, 18, 6] },
    { id: "left_elbow_back", label_pt: "Cotovelo Esq. (post.)", label_en: "L. Elbow (post.)", area: [80, 32, 18, 6] },
    { id: "right_forearm_back", label_pt: "Antebraço Dir. (post.)", label_en: "R. Forearm (post.)", area: [0, 38, 18, 12] },
    { id: "left_forearm_back", label_pt: "Antebraço Esq. (post.)", label_en: "L. Forearm (post.)", area: [82, 38, 18, 12] },
    { id: "right_hand_back", label_pt: "Mão Dir. (post.)", label_en: "R. Hand (post.)", area: [0, 50, 16, 8] },
    { id: "left_hand_back", label_pt: "Mão Esq. (post.)", label_en: "L. Hand (post.)", area: [84, 50, 16, 8] },
    { id: "right_gluteal", label_pt: "Glúteo Direito", label_en: "Right Gluteal", area: [22, 38, 28, 8] },
    { id: "left_gluteal", label_pt: "Glúteo Esquerdo", label_en: "Left Gluteal", area: [50, 38, 28, 8] },
    { id: "right_thigh_post", label_pt: "Coxa Posterior Dir.", label_en: "R. Posterior Thigh", area: [20, 46, 28, 16] },
    { id: "left_thigh_post", label_pt: "Coxa Posterior Esq.", label_en: "L. Posterior Thigh", area: [52, 46, 28, 16] },
    { id: "right_knee_back", label_pt: "Joelho Dir. (post.)", label_en: "R. Knee (post.)", area: [22, 62, 24, 6] },
    { id: "left_knee_back", label_pt: "Joelho Esq. (post.)", label_en: "L. Knee (post.)", area: [54, 62, 24, 6] },
    { id: "right_calf", label_pt: "Panturrilha Direita", label_en: "Right Calf", area: [22, 68, 22, 16] },
    { id: "left_calf", label_pt: "Panturrilha Esquerda", label_en: "Left Calf", area: [56, 68, 22, 16] },
    { id: "right_ankle_back", label_pt: "Tornozelo Dir. (post.)", label_en: "R. Ankle (post.)", area: [22, 84, 20, 5] },
    { id: "left_ankle_back", label_pt: "Tornozelo Esq. (post.)", label_en: "L. Ankle (post.)", area: [58, 84, 20, 5] },
    { id: "right_foot_back", label_pt: "Pé Dir. (post.)", label_en: "R. Foot (post.)", area: [20, 89, 24, 8] },
    { id: "left_foot_back", label_pt: "Pé Esq. (post.)", label_en: "L. Foot (post.)", area: [56, 89, 24, 8] },
  ],
  left: [
    { id: "head_left", label_pt: "Cabeça (lat. esq.)", label_en: "Head (left)", area: [20, 0, 60, 8] },
    { id: "cervical_left", label_pt: "Cervical (lat. esq.)", label_en: "Cervical (left)", area: [28, 8, 44, 4] },
    { id: "shoulder_left", label_pt: "Ombro Esquerdo (lat.)", label_en: "Left Shoulder (lat.)", area: [10, 12, 80, 6] },
    { id: "arm_left", label_pt: "Braço (lat. esq.)", label_en: "Arm (left lat.)", area: [0, 18, 30, 14] },
    { id: "elbow_left", label_pt: "Cotovelo (lat. esq.)", label_en: "Elbow (left lat.)", area: [0, 32, 28, 6] },
    { id: "forearm_left", label_pt: "Antebraço (lat. esq.)", label_en: "Forearm (left lat.)", area: [0, 38, 26, 12] },
    { id: "hand_left", label_pt: "Mão (lat. esq.)", label_en: "Hand (left lat.)", area: [0, 50, 24, 8] },
    { id: "thoracic_left", label_pt: "Torácica (lat. esq.)", label_en: "Thoracic (left)", area: [30, 14, 50, 12] },
    { id: "lumbar_left", label_pt: "Lombar (lat. esq.)", label_en: "Lumbar (left)", area: [30, 26, 50, 12] },
    { id: "hip_left", label_pt: "Quadril (lat. esq.)", label_en: "Hip (left lat.)", area: [20, 38, 60, 8] },
    { id: "thigh_left", label_pt: "Coxa (lat. esq.)", label_en: "Thigh (left lat.)", area: [18, 46, 62, 16] },
    { id: "knee_left", label_pt: "Joelho (lat. esq.)", label_en: "Knee (left lat.)", area: [18, 62, 60, 6] },
    { id: "shin_left", label_pt: "Perna (lat. esq.)", label_en: "Leg (left lat.)", area: [18, 68, 58, 16] },
    { id: "ankle_left", label_pt: "Tornozelo (lat. esq.)", label_en: "Ankle (left lat.)", area: [18, 84, 50, 5] },
    { id: "foot_left", label_pt: "Pé (lat. esq.)", label_en: "Foot (left lat.)", area: [10, 89, 60, 8] },
  ],
  right: [
    { id: "head_right", label_pt: "Cabeça (lat. dir.)", label_en: "Head (right)", area: [20, 0, 60, 8] },
    { id: "cervical_right", label_pt: "Cervical (lat. dir.)", label_en: "Cervical (right)", area: [28, 8, 44, 4] },
    { id: "shoulder_right", label_pt: "Ombro Direito (lat.)", label_en: "Right Shoulder (lat.)", area: [10, 12, 80, 6] },
    { id: "arm_right", label_pt: "Braço (lat. dir.)", label_en: "Arm (right lat.)", area: [60, 18, 30, 14] },
    { id: "elbow_right", label_pt: "Cotovelo (lat. dir.)", label_en: "Elbow (right lat.)", area: [62, 32, 28, 6] },
    { id: "forearm_right", label_pt: "Antebraço (lat. dir.)", label_en: "Forearm (right lat.)", area: [64, 38, 26, 12] },
    { id: "hand_right", label_pt: "Mão (lat. dir.)", label_en: "Hand (right lat.)", area: [66, 50, 24, 8] },
    { id: "thoracic_right", label_pt: "Torácica (lat. dir.)", label_en: "Thoracic (right)", area: [20, 14, 50, 12] },
    { id: "lumbar_right", label_pt: "Lombar (lat. dir.)", label_en: "Lumbar (right)", area: [20, 26, 50, 12] },
    { id: "hip_right", label_pt: "Quadril (lat. dir.)", label_en: "Hip (right lat.)", area: [20, 38, 60, 8] },
    { id: "thigh_right", label_pt: "Coxa (lat. dir.)", label_en: "Thigh (right lat.)", area: [18, 46, 62, 16] },
    { id: "knee_right", label_pt: "Joelho (lat. dir.)", label_en: "Knee (right lat.)", area: [18, 62, 60, 6] },
    { id: "shin_right", label_pt: "Perna (lat. dir.)", label_en: "Leg (right lat.)", area: [18, 68, 58, 16] },
    { id: "ankle_right", label_pt: "Tornozelo (lat. dir.)", label_en: "Ankle (right lat.)", area: [18, 84, 50, 5] },
    { id: "foot_right", label_pt: "Pé (lat. dir.)", label_en: "Foot (right lat.)", area: [10, 89, 60, 8] },
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
