export type View = "front" | "back" | "side";

interface RegionDef {
  d: string;
  label_pt: string;
  label_en: string;
}

// ── Realistic anatomical body outline paths (decorative, non-interactive) ──
// These draw the visible body contour like the reference image

export const bodyOutlinePaths: Record<View, string[]> = {
  front: [
    // Head outline with jaw and ears
    "M92,6 C82,6 75,12 73,20 C71,28 72,34 74,40 C70,38 68,34 67,30 C66,26 67,22 68,20 C69,16 72,12 76,9 C80,6 86,5 92,5 C98,5 104,6 108,9 C112,12 115,16 116,20 C117,22 118,26 117,30 C116,34 114,38 110,40 C112,34 113,28 111,20 C109,12 102,6 92,6Z",
    // Neck
    "M84,52 C86,56 89,58 92,59 C95,58 98,56 100,52 L102,60 L82,60Z",
    // Shoulders trapezius
    "M82,60 C76,62 68,66 62,72 C56,78 52,86 51,94 M102,60 C108,62 116,66 122,72 C128,78 132,86 133,94",
    // Chest / torso outline
    "M51,94 C50,100 50,108 52,116 C54,124 56,130 58,134 C60,140 62,148 64,156 C66,164 68,172 70,180 C72,186 74,190 76,192 L92,194 L108,192 C110,190 112,186 114,180 C116,172 118,164 120,156 C122,148 124,140 126,134 C128,130 130,124 132,116 C134,108 134,100 133,94",
    // Right arm outer
    "M51,94 C48,104 46,114 44,124 C42,134 40,142 39,148",
    // Right arm inner
    "M58,96 C56,106 54,116 52,126 C50,136 49,144 48,150",
    // Right forearm
    "M39,148 C38,158 36,168 35,178 C34,188 34,196 35,204 M48,150 C47,160 46,170 45,180 C44,190 44,196 44,204",
    // Right hand
    "M35,204 C34,210 32,216 30,222 C28,228 28,232 30,234 M44,204 C44,210 44,216 42,222 C40,226 38,230 36,232",
    // Left arm outer
    "M133,94 C136,104 138,114 140,124 C142,134 144,142 145,148",
    // Left arm inner
    "M126,96 C128,106 130,116 132,126 C134,136 135,144 136,150",
    // Left forearm
    "M145,148 C146,158 148,168 149,178 C150,188 150,196 149,204 M136,150 C137,160 138,170 139,180 C140,190 140,196 140,204",
    // Left hand
    "M149,204 C150,210 152,216 154,222 C156,228 156,232 154,234 M140,204 C140,210 140,216 142,222 C144,226 146,230 148,232",
    // Navel
    "M90,148 C90,150 92,152 94,150 C94,148 92,146 90,148Z",
    // Chest detail - pectorals
    "M72,74 C76,78 82,82 88,84 C90,84 92,84 92,84 M112,74 C108,78 102,82 96,84 C94,84 92,84 92,84",
    // Right leg outer
    "M70,180 C68,200 66,220 66,240 C66,260 68,278 68,290 C68,300 66,320 66,340 C66,356 66,370 66,378",
    // Right leg inner  
    "M88,194 C88,210 86,230 86,250 C86,268 84,282 84,290 C82,302 80,320 80,340 C78,356 78,370 78,378",
    // Right foot
    "M66,378 C62,382 58,388 56,394 C56,398 60,400 66,400 C72,400 78,400 82,398 C82,394 80,388 78,378",
    // Left leg outer
    "M114,180 C116,200 118,220 118,240 C118,260 116,278 116,290 C116,300 118,320 118,340 C118,356 118,370 118,378",
    // Left leg inner
    "M96,194 C96,210 98,230 98,250 C98,268 100,282 100,290 C102,302 104,320 104,340 C106,356 106,370 106,378",
    // Left foot
    "M118,378 C122,382 126,388 128,394 C128,398 124,400 118,400 C112,400 106,400 102,398 C102,394 104,388 106,378",
    // Kneecap lines
    "M70,280 C72,276 76,274 80,276 C82,278 82,284 80,286 C78,288 74,288 72,286 C70,284 70,282 70,280Z",
    "M114,280 C112,276 108,274 104,276 C102,278 102,284 104,286 C106,288 110,288 112,286 C114,284 114,282 114,280Z",
  ],
  back: [
    // Head
    "M92,6 C82,6 75,12 73,20 C71,28 72,34 74,40 C70,38 68,34 67,30 C66,26 67,22 68,20 C69,16 72,12 76,9 C80,6 86,5 92,5 C98,5 104,6 108,9 C112,12 115,16 116,20 C117,22 118,26 117,30 C116,34 114,38 110,40 C112,34 113,28 111,20 C109,12 102,6 92,6Z",
    // Neck
    "M84,52 L100,52 L102,60 L82,60Z",
    // Shoulders / traps
    "M82,60 C76,62 68,66 62,72 C56,78 52,86 51,94 M102,60 C108,62 116,66 122,72 C128,78 132,86 133,94",
    // Back torso
    "M51,94 C50,100 50,108 52,116 C54,124 56,130 58,134 C60,140 62,148 64,156 C66,164 68,172 70,180 C72,186 74,190 76,192 L92,194 L108,192 C110,190 112,186 114,180 C116,172 118,164 120,156 C122,148 124,140 126,134 C128,130 130,124 132,116 C134,108 134,100 133,94",
    // Spine line
    "M92,60 L92,180",
    // Scapula lines
    "M76,76 C80,80 84,84 86,90 C86,96 84,102 80,106 M108,76 C104,80 100,84 98,90 C98,96 100,102 104,106",
    // Gluteal fold
    "M76,184 C80,188 86,190 92,190 C98,190 104,188 108,184",
    // Right arm
    "M51,94 C48,104 46,114 44,124 C42,134 40,142 39,148 C38,158 36,168 35,178 C34,188 34,196 35,204 C34,210 32,216 30,222",
    "M58,96 C56,106 54,116 52,126 C50,136 49,144 48,150 C47,160 46,170 45,180 C44,190 44,196 44,204 C44,210 42,216 40,222",
    // Left arm
    "M133,94 C136,104 138,114 140,124 C142,134 144,142 145,148 C146,158 148,168 149,178 C150,188 150,196 149,204 C150,210 152,216 154,222",
    "M126,96 C128,106 130,116 132,126 C134,136 135,144 136,150 C137,160 138,170 139,180 C140,190 140,196 140,204 C140,210 142,216 144,222",
    // Right leg
    "M70,180 C68,200 66,220 66,240 C66,260 68,278 68,290 C68,300 66,320 66,340 C66,356 66,370 66,378 C62,382 58,388 56,394 C56,398 60,400 66,400 C72,400 78,400 82,398 C82,394 80,388 78,378",
    "M88,194 C88,210 86,230 86,250 C86,268 84,282 84,290 C82,302 80,320 80,340 C78,356 78,370 78,378",
    // Left leg
    "M114,180 C116,200 118,220 118,240 C118,260 116,278 116,290 C116,300 118,320 118,340 C118,356 118,370 118,378 C122,382 126,388 128,394 C128,398 124,400 118,400 C112,400 106,400 102,398 C102,394 104,388 106,378",
    "M96,194 C96,210 98,230 98,250 C98,268 100,282 100,290 C102,302 104,320 104,340 C106,356 106,370 106,378",
    // Posterior knee lines
    "M70,282 C74,286 78,288 82,286 M114,282 C110,286 106,288 102,286",
    // Achilles
    "M70,360 L74,378 M80,378 L76,360 M114,360 L110,378 M104,378 L108,360",
  ],
  side: [
    // Head side profile
    "M90,6 C82,6 76,10 73,16 C70,22 68,30 68,36 C68,42 70,46 72,48 C74,50 76,52 78,54 L78,52 C76,48 72,42 72,36 C72,28 74,20 78,14 C82,10 86,8 90,8 L92,6 M90,6 C96,6 100,10 102,16 C104,22 104,30 102,36 C100,42 98,46 96,48 L96,54",
    // Face profile detail
    "M68,36 C66,38 64,36 64,34 C64,32 66,30 68,32",
    // Jaw
    "M72,48 C74,52 78,56 82,58 C86,58 88,56 90,54 L96,54",
    // Neck
    "M78,54 C76,58 76,62 78,66 M96,54 C98,58 100,62 102,66",
    // Shoulder
    "M78,66 C72,68 66,72 62,78 C58,84 56,90 56,96 M102,66 C106,68 110,72 112,76 C114,80 114,86 114,90",
    // Torso front/back
    "M56,96 C54,106 54,118 56,130 C58,140 62,150 64,160 C66,168 68,174 70,180 C72,186 74,190 78,194 C82,196 86,198 88,198",
    "M114,90 C116,100 118,112 118,124 C118,136 116,148 114,158 C112,166 108,174 106,180 C104,186 102,190 100,194 C98,196 94,198 92,198",
    // Buttock curve
    "M106,180 C110,184 114,190 116,196 C118,202 116,208 112,212",
    // Belly curve
    "M70,180 C68,172 66,164 66,156 C66,152 68,150 70,150",
    // Arm
    "M56,96 C52,106 48,118 46,130 C44,142 42,154 42,164 C42,172 42,180 44,188 C44,192 46,198 48,204 C50,210 50,216 48,222",
    "M62,98 C60,108 58,118 56,130 C54,142 52,152 52,164 C52,172 52,180 52,188 C52,192 52,198 52,204 C52,210 50,216 50,220",
    // Right leg (visible leg)
    "M78,194 C76,208 74,224 74,240 C74,256 74,270 76,282 C76,292 74,308 74,324 C74,340 72,356 72,370 C70,376 68,384 66,390 C64,396 66,400 72,402 C78,402 84,402 88,398",
    // Left leg (behind)  
    "M100,194 C102,208 104,224 104,240 C104,256 104,270 102,282 C102,292 104,308 104,324 C104,340 106,356 106,370 C108,376 110,384 112,390 C114,396 112,400 106,402 C100,402 94,402 90,398",
    // Knee detail
    "M74,274 C76,272 80,272 82,274 C84,278 82,284 80,286 M104,274 C102,272 98,272 96,274 C94,278 96,284 98,286",
    // Foot
    "M66,390 C62,394 58,398 58,400 C58,404 62,406 70,406 C78,406 86,404 88,398",
    "M112,390 C116,394 118,398 118,400 C118,404 114,406 106,406 C100,406 94,404 90,398",
  ],
};

// ── Clickable region paths ──
// These define the invisible hit-areas for each body region

export const regionPaths: Record<View, Record<string, RegionDef>> = {
  front: {
    head: {
      d: "M92,5 C80,5 72,14 70,24 C68,34 72,46 78,52 L92,58 L106,52 C112,46 116,34 114,24 C112,14 104,5 92,5Z",
      label_pt: "Cabeça", label_en: "Head",
    },
    neck_front: {
      d: "M84,52 C86,56 89,58 92,60 C95,58 98,56 100,52 L102,62 L82,62Z",
      label_pt: "Cervical", label_en: "Neck",
    },
    right_shoulder: {
      d: "M82,62 C76,64 68,68 62,74 C56,80 52,88 51,96 L58,98 C58,90 62,82 68,76 C72,72 78,68 82,66Z",
      label_pt: "Ombro Direito", label_en: "Right Shoulder",
    },
    left_shoulder: {
      d: "M102,62 C108,64 116,68 122,74 C128,80 132,88 133,96 L126,98 C126,90 122,82 116,76 C112,72 106,68 102,66Z",
      label_pt: "Ombro Esquerdo", label_en: "Left Shoulder",
    },
    chest: {
      d: "M82,66 L102,66 L108,92 L112,120 L72,120 L76,92Z",
      label_pt: "Tórax / Peitoral", label_en: "Chest",
    },
    right_arm: {
      d: "M51,96 L58,98 L54,130 L46,128Z",
      label_pt: "Braço Direito", label_en: "Right Arm",
    },
    left_arm: {
      d: "M126,98 L133,96 L138,128 L130,130Z",
      label_pt: "Braço Esquerdo", label_en: "Left Arm",
    },
    right_elbow: {
      d: "M46,128 L54,130 L52,150 L44,148Z",
      label_pt: "Cotovelo Direito", label_en: "Right Elbow",
    },
    left_elbow: {
      d: "M130,130 L138,128 L140,148 L132,150Z",
      label_pt: "Cotovelo Esquerdo", label_en: "Left Elbow",
    },
    right_forearm: {
      d: "M44,148 L52,150 L48,192 L40,190Z",
      label_pt: "Antebraço Direito", label_en: "Right Forearm",
    },
    left_forearm: {
      d: "M132,150 L140,148 L144,190 L136,192Z",
      label_pt: "Antebraço Esquerdo", label_en: "Left Forearm",
    },
    right_wrist: {
      d: "M40,190 L48,192 L46,206 L38,204Z",
      label_pt: "Punho Direito", label_en: "Right Wrist",
    },
    left_wrist: {
      d: "M136,192 L144,190 L146,204 L138,206Z",
      label_pt: "Punho Esquerdo", label_en: "Left Wrist",
    },
    right_hand: {
      d: "M38,204 L46,206 L42,230 L30,226Z",
      label_pt: "Mão Direita", label_en: "Right Hand",
    },
    left_hand: {
      d: "M138,206 L146,204 L154,226 L142,230Z",
      label_pt: "Mão Esquerda", label_en: "Left Hand",
    },
    abdomen: {
      d: "M72,120 L112,120 L114,162 L70,162Z",
      label_pt: "Abdômen", label_en: "Abdomen",
    },
    right_hip: {
      d: "M70,162 L92,162 L88,194 L70,192Z",
      label_pt: "Quadril Direito", label_en: "Right Hip",
    },
    left_hip: {
      d: "M92,162 L114,162 L114,192 L96,194Z",
      label_pt: "Quadril Esquerdo", label_en: "Left Hip",
    },
    right_thigh: {
      d: "M70,192 L88,194 L86,268 L68,266Z",
      label_pt: "Coxa Direita", label_en: "Right Thigh",
    },
    left_thigh: {
      d: "M96,194 L114,192 L116,266 L98,268Z",
      label_pt: "Coxa Esquerda", label_en: "Left Thigh",
    },
    right_knee: {
      d: "M68,266 L86,268 C86,276 84,284 84,292 L68,290 C68,282 68,274 68,266Z",
      label_pt: "Joelho Direito", label_en: "Right Knee",
    },
    left_knee: {
      d: "M98,268 L116,266 C116,274 116,282 116,290 L100,292 C100,284 98,276 98,268Z",
      label_pt: "Joelho Esquerdo", label_en: "Left Knee",
    },
    right_shin: {
      d: "M68,290 L84,292 L80,358 L68,356Z",
      label_pt: "Canela Direita", label_en: "Right Shin",
    },
    left_shin: {
      d: "M100,292 L116,290 L116,356 L104,358Z",
      label_pt: "Canela Esquerda", label_en: "Left Shin",
    },
    right_ankle: {
      d: "M68,356 L80,358 L78,378 L66,376Z",
      label_pt: "Tornozelo Direito", label_en: "Right Ankle",
    },
    left_ankle: {
      d: "M104,358 L116,356 L118,376 L106,378Z",
      label_pt: "Tornozelo Esquerdo", label_en: "Left Ankle",
    },
    right_foot: {
      d: "M56,394 L82,398 L82,402 L66,402 C60,402 56,400 56,394Z",
      label_pt: "Pé Direito", label_en: "Right Foot",
    },
    left_foot: {
      d: "M102,398 L128,394 C128,400 124,402 118,402 L102,402Z",
      label_pt: "Pé Esquerdo", label_en: "Left Foot",
    },
  },
  back: {
    head_back: {
      d: "M92,5 C80,5 72,14 70,24 C68,34 72,46 78,52 L92,58 L106,52 C112,46 116,34 114,24 C112,14 104,5 92,5Z",
      label_pt: "Cabeça (post.)", label_en: "Head (post.)",
    },
    cervical: {
      d: "M84,52 L100,52 L102,62 L82,62Z",
      label_pt: "Cervical", label_en: "Cervical",
    },
    right_shoulder_back: {
      d: "M82,62 C76,64 68,68 62,74 C56,80 52,88 51,96 L58,98 C58,90 62,82 68,76 C72,72 78,68 82,66Z",
      label_pt: "Ombro Dir. (post.)", label_en: "R. Shoulder (post.)",
    },
    left_shoulder_back: {
      d: "M102,62 C108,64 116,68 122,74 C128,80 132,88 133,96 L126,98 C126,90 122,82 116,76 C112,72 106,68 102,66Z",
      label_pt: "Ombro Esq. (post.)", label_en: "L. Shoulder (post.)",
    },
    upper_back: {
      d: "M82,66 L102,66 L108,92 L110,120 L74,120 L76,92Z",
      label_pt: "Torácica", label_en: "Upper Back",
    },
    lower_back: {
      d: "M74,120 L110,120 L112,162 L72,162Z",
      label_pt: "Lombar", label_en: "Lower Back",
    },
    sacral: {
      d: "M80,162 L104,162 L100,182 L84,182Z",
      label_pt: "Sacral", label_en: "Sacral",
    },
    right_gluteal: {
      d: "M72,162 L92,162 L88,202 L70,200Z",
      label_pt: "Glúteo Direito", label_en: "Right Gluteal",
    },
    left_gluteal: {
      d: "M92,162 L112,162 L114,200 L96,202Z",
      label_pt: "Glúteo Esquerdo", label_en: "Left Gluteal",
    },
    right_hamstring: {
      d: "M70,200 L88,202 L86,268 L68,266Z",
      label_pt: "Post. Coxa Dir.", label_en: "R. Hamstring",
    },
    left_hamstring: {
      d: "M96,202 L114,200 L116,266 L98,268Z",
      label_pt: "Post. Coxa Esq.", label_en: "L. Hamstring",
    },
    right_knee_back: {
      d: "M68,266 L86,268 C86,276 84,284 84,292 L68,290 C68,282 68,274 68,266Z",
      label_pt: "Joelho Dir. (post.)", label_en: "R. Knee (post.)",
    },
    left_knee_back: {
      d: "M98,268 L116,266 C116,274 116,282 116,290 L100,292 C100,284 98,276 98,268Z",
      label_pt: "Joelho Esq. (post.)", label_en: "L. Knee (post.)",
    },
    right_calf: {
      d: "M68,290 L84,292 L80,358 L68,356Z",
      label_pt: "Panturrilha Dir.", label_en: "Right Calf",
    },
    left_calf: {
      d: "M100,292 L116,290 L116,356 L104,358Z",
      label_pt: "Panturrilha Esq.", label_en: "Left Calf",
    },
    right_achilles: {
      d: "M68,356 L80,358 L78,378 L66,376Z",
      label_pt: "Tendão Aquiles Dir.", label_en: "R. Achilles",
    },
    left_achilles: {
      d: "M104,358 L116,356 L118,376 L106,378Z",
      label_pt: "Tendão Aquiles Esq.", label_en: "L. Achilles",
    },
    right_heel: {
      d: "M56,394 L82,398 L82,402 L66,402 C60,402 56,400 56,394Z",
      label_pt: "Calcanhar Dir.", label_en: "Right Heel",
    },
    left_heel: {
      d: "M102,398 L128,394 C128,400 124,402 118,402 L102,402Z",
      label_pt: "Calcanhar Esq.", label_en: "Left Heel",
    },
  },
  side: {
    head_side: {
      d: "M90,5 C78,5 70,14 68,26 C66,36 68,46 74,52 L96,52 C102,46 106,36 104,26 C102,14 96,5 90,5Z",
      label_pt: "Cabeça (lat.)", label_en: "Head (lat.)",
    },
    neck_side: {
      d: "M78,52 L96,52 L102,68 L78,68Z",
      label_pt: "Cervical (lat.)", label_en: "Neck (lat.)",
    },
    shoulder_side: {
      d: "M56,96 C58,84 62,74 68,68 L112,68 C114,74 116,82 116,92 L56,96Z",
      label_pt: "Ombro (lat.)", label_en: "Shoulder (lat.)",
    },
    trunk_side: {
      d: "M56,96 L116,92 L118,130 C118,148 114,164 108,180 L70,180 C66,166 60,148 58,130Z",
      label_pt: "Tronco (lat.)", label_en: "Trunk (lat.)",
    },
    arm_side: {
      d: "M46,96 L56,96 L54,148 L42,146Z",
      label_pt: "Braço (lat.)", label_en: "Arm (lat.)",
    },
    forearm_side: {
      d: "M42,146 L54,148 L50,208 L38,206Z",
      label_pt: "Antebraço (lat.)", label_en: "Forearm (lat.)",
    },
    hip_side: {
      d: "M70,180 L108,180 C114,192 118,204 116,216 L66,216 C64,204 66,192 70,180Z",
      label_pt: "Quadril (lat.)", label_en: "Hip (lat.)",
    },
    thigh_side: {
      d: "M66,216 L116,216 L106,280 L74,280Z",
      label_pt: "Coxa (lat.)", label_en: "Thigh (lat.)",
    },
    knee_side: {
      d: "M74,280 L106,280 C104,290 102,298 102,304 L76,304 C76,298 76,290 74,280Z",
      label_pt: "Joelho (lat.)", label_en: "Knee (lat.)",
    },
    leg_side: {
      d: "M76,304 L102,304 L98,378 L74,378Z",
      label_pt: "Perna (lat.)", label_en: "Leg (lat.)",
    },
    foot_side: {
      d: "M60,392 L118,392 C120,400 116,406 106,406 L70,406 C62,406 58,400 60,392Z",
      label_pt: "Pé (lat.)", label_en: "Foot (lat.)",
    },
  },
};
