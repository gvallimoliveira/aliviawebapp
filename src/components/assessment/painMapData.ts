export type View = "front" | "back" | "side";

interface RegionDef {
  d: string;
  label_pt: string;
  label_en: string;
}

export const regionPaths: Record<View, Record<string, RegionDef>> = {
  front: {
    head: {
      d: "M88,8 C80,8 74,14 72,22 C70,30 72,40 76,46 C80,52 86,56 92,58 L92,58 C86,56 80,52 76,46 M88,8 C96,8 102,14 104,22 C106,30 104,40 100,46 C96,52 92,56 92,58 M72,22 C72,12 80,4 92,4 C104,4 112,12 112,22 C112,36 108,48 100,54 C96,57 92,58 92,58 C92,58 88,57 84,54 C76,48 72,36 72,22Z",
      label_pt: "Cabeça", label_en: "Head",
    },
    neck_front: {
      d: "M84,54 C86,56 88,58 92,60 C96,58 98,56 100,54 L102,62 C100,66 96,68 92,70 C88,68 84,66 82,62Z",
      label_pt: "Cervical", label_en: "Neck",
    },
    right_shoulder: {
      d: "M82,62 C78,64 70,66 62,72 C56,78 54,84 54,90 L60,92 C60,86 62,80 66,76 C70,72 76,68 82,68Z",
      label_pt: "Ombro Direito", label_en: "Right Shoulder",
    },
    left_shoulder: {
      d: "M102,62 C106,64 114,66 122,72 C128,78 130,84 130,90 L124,92 C124,86 122,80 118,76 C114,72 108,68 102,68Z",
      label_pt: "Ombro Esquerdo", label_en: "Left Shoulder",
    },
    chest: {
      d: "M82,68 L102,68 L106,90 L110,120 L74,120 L78,90Z",
      label_pt: "Tórax / Peitoral", label_en: "Chest",
    },
    right_arm: {
      d: "M54,90 L60,92 L56,130 L48,128Z",
      label_pt: "Braço Direito", label_en: "Right Arm",
    },
    left_arm: {
      d: "M124,92 L130,90 L136,128 L128,130Z",
      label_pt: "Braço Esquerdo", label_en: "Left Arm",
    },
    right_elbow: {
      d: "M48,128 L56,130 L54,148 L46,146Z",
      label_pt: "Cotovelo Direito", label_en: "Right Elbow",
    },
    left_elbow: {
      d: "M128,130 L136,128 L138,146 L130,148Z",
      label_pt: "Cotovelo Esquerdo", label_en: "Left Elbow",
    },
    right_forearm: {
      d: "M46,146 L54,148 L52,186 L44,184Z",
      label_pt: "Antebraço Direito", label_en: "Right Forearm",
    },
    left_forearm: {
      d: "M130,148 L138,146 L140,184 L132,186Z",
      label_pt: "Antebraço Esquerdo", label_en: "Left Forearm",
    },
    right_wrist: {
      d: "M44,184 L52,186 L50,198 L42,196Z",
      label_pt: "Punho Direito", label_en: "Right Wrist",
    },
    left_wrist: {
      d: "M132,186 L140,184 L142,196 L134,198Z",
      label_pt: "Punho Esquerdo", label_en: "Left Wrist",
    },
    right_hand: {
      d: "M42,196 L50,198 L48,220 L36,218Z",
      label_pt: "Mão Direita", label_en: "Right Hand",
    },
    left_hand: {
      d: "M134,198 L142,196 L148,218 L136,220Z",
      label_pt: "Mão Esquerda", label_en: "Left Hand",
    },
    abdomen: {
      d: "M74,120 L110,120 L112,160 L72,160Z",
      label_pt: "Abdômen", label_en: "Abdomen",
    },
    right_hip: {
      d: "M72,160 L92,160 L88,190 L68,188Z",
      label_pt: "Quadril Direito", label_en: "Right Hip",
    },
    left_hip: {
      d: "M92,160 L112,160 L116,188 L96,190Z",
      label_pt: "Quadril Esquerdo", label_en: "Left Hip",
    },
    right_thigh: {
      d: "M68,188 L88,190 L86,260 L70,258Z",
      label_pt: "Coxa Direita", label_en: "Right Thigh",
    },
    left_thigh: {
      d: "M96,190 L116,188 L114,258 L98,260Z",
      label_pt: "Coxa Esquerda", label_en: "Left Thigh",
    },
    right_knee: {
      d: "M70,258 L86,260 C86,268 86,276 84,284 L68,282 C68,274 68,266 70,258Z",
      label_pt: "Joelho Direito", label_en: "Right Knee",
    },
    left_knee: {
      d: "M98,260 L114,258 C114,266 114,274 116,282 L100,284 C98,276 98,268 98,260Z",
      label_pt: "Joelho Esquerdo", label_en: "Left Knee",
    },
    right_shin: {
      d: "M68,282 L84,284 L82,350 L70,348Z",
      label_pt: "Canela Direita", label_en: "Right Shin",
    },
    left_shin: {
      d: "M100,284 L116,282 L114,348 L102,350Z",
      label_pt: "Canela Esquerda", label_en: "Left Shin",
    },
    right_ankle: {
      d: "M70,348 L82,350 L80,366 L68,364Z",
      label_pt: "Tornozelo Direito", label_en: "Right Ankle",
    },
    left_ankle: {
      d: "M102,350 L114,348 L116,364 L104,366Z",
      label_pt: "Tornozelo Esquerdo", label_en: "Left Ankle",
    },
    right_foot: {
      d: "M62,364 L80,366 L78,392 L58,388Z",
      label_pt: "Pé Direito", label_en: "Right Foot",
    },
    left_foot: {
      d: "M104,366 L122,364 L126,388 L106,392Z",
      label_pt: "Pé Esquerdo", label_en: "Left Foot",
    },
  },
  back: {
    head_back: {
      d: "M72,22 C72,12 80,4 92,4 C104,4 112,12 112,22 C112,36 108,48 100,54 C96,57 92,58 92,58 C92,58 88,57 84,54 C76,48 72,36 72,22Z",
      label_pt: "Cabeça (post.)", label_en: "Head (post.)",
    },
    cervical: {
      d: "M84,54 L100,54 L102,62 C100,66 96,68 92,70 C88,68 84,66 82,62Z",
      label_pt: "Cervical", label_en: "Cervical",
    },
    right_shoulder_back: {
      d: "M82,62 C78,64 70,66 62,72 C56,78 54,84 54,92 L60,94 C60,86 64,78 70,74 C74,70 78,68 82,68Z",
      label_pt: "Ombro Dir. (post.)", label_en: "R. Shoulder (post.)",
    },
    left_shoulder_back: {
      d: "M102,62 C106,64 114,66 122,72 C128,78 130,84 130,92 L124,94 C124,86 120,78 114,74 C110,70 106,68 102,68Z",
      label_pt: "Ombro Esq. (post.)", label_en: "L. Shoulder (post.)",
    },
    upper_back: {
      d: "M82,68 L102,68 L106,90 L108,120 L76,120 L78,90Z",
      label_pt: "Torácica", label_en: "Upper Back",
    },
    lower_back: {
      d: "M76,120 L108,120 L110,160 L74,160Z",
      label_pt: "Lombar", label_en: "Lower Back",
    },
    sacral: {
      d: "M80,160 L104,160 L100,180 L84,180Z",
      label_pt: "Sacral", label_en: "Sacral",
    },
    right_gluteal: {
      d: "M74,160 L92,160 L88,200 L68,198Z",
      label_pt: "Glúteo Direito", label_en: "Right Gluteal",
    },
    left_gluteal: {
      d: "M92,160 L110,160 L116,198 L96,200Z",
      label_pt: "Glúteo Esquerdo", label_en: "Left Gluteal",
    },
    right_hamstring: {
      d: "M68,198 L88,200 L86,260 L70,258Z",
      label_pt: "Post. Coxa Dir.", label_en: "R. Hamstring",
    },
    left_hamstring: {
      d: "M96,200 L116,198 L114,258 L98,260Z",
      label_pt: "Post. Coxa Esq.", label_en: "L. Hamstring",
    },
    right_knee_back: {
      d: "M70,258 L86,260 C86,268 86,276 84,284 L68,282 C68,274 68,266 70,258Z",
      label_pt: "Joelho Dir. (post.)", label_en: "R. Knee (post.)",
    },
    left_knee_back: {
      d: "M98,260 L114,258 C114,266 114,274 116,282 L100,284 C98,276 98,268 98,260Z",
      label_pt: "Joelho Esq. (post.)", label_en: "L. Knee (post.)",
    },
    right_calf: {
      d: "M68,282 L84,284 L82,350 L70,348Z",
      label_pt: "Panturrilha Dir.", label_en: "Right Calf",
    },
    left_calf: {
      d: "M100,284 L116,282 L114,348 L102,350Z",
      label_pt: "Panturrilha Esq.", label_en: "Left Calf",
    },
    right_achilles: {
      d: "M70,348 L82,350 L80,370 L68,368Z",
      label_pt: "Tendão Aquiles Dir.", label_en: "R. Achilles",
    },
    left_achilles: {
      d: "M102,350 L114,348 L116,368 L104,370Z",
      label_pt: "Tendão Aquiles Esq.", label_en: "L. Achilles",
    },
    right_heel: {
      d: "M64,368 L80,370 L78,392 L60,388Z",
      label_pt: "Calcanhar Dir.", label_en: "Right Heel",
    },
    left_heel: {
      d: "M104,370 L120,368 L124,388 L106,392Z",
      label_pt: "Calcanhar Esq.", label_en: "Left Heel",
    },
  },
  side: {
    head_side: {
      d: "M80,8 C72,10 68,18 68,28 C68,38 72,46 78,52 L90,52 C96,46 100,38 100,28 C100,18 96,10 88,8 C86,7 84,7 82,7 C80,7 80,8 80,8Z",
      label_pt: "Cabeça (lat.)", label_en: "Head (lat.)",
    },
    neck_side: {
      d: "M78,52 L90,52 L92,68 L76,68Z",
      label_pt: "Cervical (lat.)", label_en: "Neck (lat.)",
    },
    shoulder_side: {
      d: "M66,68 L96,68 L100,88 L62,88Z",
      label_pt: "Ombro (lat.)", label_en: "Shoulder (lat.)",
    },
    trunk_side: {
      d: "M68,88 L100,88 L104,160 L64,160Z",
      label_pt: "Tronco (lat.)", label_en: "Trunk (lat.)",
    },
    arm_side: {
      d: "M48,88 L66,88 L60,148 L42,146Z",
      label_pt: "Braço (lat.)", label_en: "Arm (lat.)",
    },
    forearm_side: {
      d: "M42,146 L60,148 L56,210 L38,208Z",
      label_pt: "Antebraço (lat.)", label_en: "Forearm (lat.)",
    },
    hip_side: {
      d: "M64,160 L104,160 L108,200 L60,200Z",
      label_pt: "Quadril (lat.)", label_en: "Hip (lat.)",
    },
    thigh_side: {
      d: "M66,200 L102,200 L98,274 L70,274Z",
      label_pt: "Coxa (lat.)", label_en: "Thigh (lat.)",
    },
    knee_side: {
      d: "M70,274 L98,274 C98,282 96,290 96,296 L72,296 C72,290 70,282 70,274Z",
      label_pt: "Joelho (lat.)", label_en: "Knee (lat.)",
    },
    leg_side: {
      d: "M72,296 L96,296 L94,368 L74,368Z",
      label_pt: "Perna (lat.)", label_en: "Leg (lat.)",
    },
    foot_side: {
      d: "M68,368 L94,368 L110,392 L64,392Z",
      label_pt: "Pé (lat.)", label_en: "Foot (lat.)",
    },
  },
};
