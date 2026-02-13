export interface FunctionalTest {
  id: string;
  category: "mobility" | "flexibility" | "strength" | "stability" | "neurodynamic" | "trigger_points";
  nameKey: string;
  instructionKey: string;
  videoUrl: string;
  regions: string[]; // matches painRegions from PainMap
}

// Maps category keys for i18n
export const testCategories = [
  "mobility",
  "flexibility",
  "strength",
  "stability",
  "neurodynamic",
  "trigger_points",
] as const;

export const functionalTests: FunctionalTest[] = [
  // ===== CERVICAL / NECK =====
  {
    id: "cervical_rotation",
    category: "mobility",
    nameKey: "ftest.cervical_rotation.name",
    instructionKey: "ftest.cervical_rotation.instruction",
    videoUrl: "https://www.youtube.com/watch?v=wQylqaCl8Zo",
    regions: ["cervical", "head"],
  },
  {
    id: "cervical_flexion",
    category: "mobility",
    nameKey: "ftest.cervical_flexion.name",
    instructionKey: "ftest.cervical_flexion.instruction",
    videoUrl: "https://www.youtube.com/watch?v=wQylqaCl8Zo",
    regions: ["cervical", "head"],
  },
  {
    id: "upper_trap_stretch",
    category: "flexibility",
    nameKey: "ftest.upper_trap_stretch.name",
    instructionKey: "ftest.upper_trap_stretch.instruction",
    videoUrl: "https://www.youtube.com/watch?v=8ZQGJ3sIWv0",
    regions: ["cervical", "shoulder_front", "shoulder_back"],
  },
  {
    id: "deep_neck_flexor",
    category: "strength",
    nameKey: "ftest.deep_neck_flexor.name",
    instructionKey: "ftest.deep_neck_flexor.instruction",
    videoUrl: "https://www.youtube.com/watch?v=2N5kkVbmaZM",
    regions: ["cervical", "head"],
  },
  {
    id: "cervical_trigger_points",
    category: "trigger_points",
    nameKey: "ftest.cervical_trigger_points.name",
    instructionKey: "ftest.cervical_trigger_points.instruction",
    videoUrl: "https://www.youtube.com/watch?v=wnGCBslPaRY",
    regions: ["cervical", "head"],
  },

  // ===== SHOULDER =====
  {
    id: "shoulder_flexion",
    category: "mobility",
    nameKey: "ftest.shoulder_flexion.name",
    instructionKey: "ftest.shoulder_flexion.instruction",
    videoUrl: "https://www.youtube.com/watch?v=wnGCBslPaRY",
    regions: ["shoulder_front", "shoulder_back", "shoulder_side"],
  },
  {
    id: "shoulder_rotation",
    category: "mobility",
    nameKey: "ftest.shoulder_rotation.name",
    instructionKey: "ftest.shoulder_rotation.instruction",
    videoUrl: "https://www.youtube.com/watch?v=wnGCBslPaRY",
    regions: ["shoulder_front", "shoulder_back", "shoulder_side"],
  },
  {
    id: "pec_stretch",
    category: "flexibility",
    nameKey: "ftest.pec_stretch.name",
    instructionKey: "ftest.pec_stretch.instruction",
    videoUrl: "https://www.youtube.com/watch?v=wnGCBslPaRY",
    regions: ["shoulder_front", "chest"],
  },
  {
    id: "shoulder_isometric",
    category: "strength",
    nameKey: "ftest.shoulder_isometric.name",
    instructionKey: "ftest.shoulder_isometric.instruction",
    videoUrl: "https://www.youtube.com/watch?v=wnGCBslPaRY",
    regions: ["shoulder_front", "shoulder_back", "shoulder_side"],
  },
  {
    id: "scapular_stability",
    category: "stability",
    nameKey: "ftest.scapular_stability.name",
    instructionKey: "ftest.scapular_stability.instruction",
    videoUrl: "https://www.youtube.com/watch?v=wnGCBslPaRY",
    regions: ["shoulder_back", "upper_back", "shoulder_side"],
  },

  // ===== THORACIC / UPPER BACK =====
  {
    id: "thoracic_rotation",
    category: "mobility",
    nameKey: "ftest.thoracic_rotation.name",
    instructionKey: "ftest.thoracic_rotation.instruction",
    videoUrl: "https://www.youtube.com/watch?v=SZcuAOyUKOU",
    regions: ["upper_back", "thoracic"],
  },
  {
    id: "thoracic_extension",
    category: "flexibility",
    nameKey: "ftest.thoracic_extension.name",
    instructionKey: "ftest.thoracic_extension.instruction",
    videoUrl: "https://www.youtube.com/watch?v=SZcuAOyUKOU",
    regions: ["upper_back", "thoracic"],
  },

  // ===== LUMBAR / LOWER BACK =====
  {
    id: "lumbar_flexion",
    category: "mobility",
    nameKey: "ftest.lumbar_flexion.name",
    instructionKey: "ftest.lumbar_flexion.instruction",
    videoUrl: "https://www.youtube.com/watch?v=XwQoK4v9mKk",
    regions: ["lumbar", "lower_back"],
  },
  {
    id: "lumbar_extension",
    category: "mobility",
    nameKey: "ftest.lumbar_extension.name",
    instructionKey: "ftest.lumbar_extension.instruction",
    videoUrl: "https://www.youtube.com/watch?v=XwQoK4v9mKk",
    regions: ["lumbar", "lower_back"],
  },
  {
    id: "hamstring_flexibility",
    category: "flexibility",
    nameKey: "ftest.hamstring_flexibility.name",
    instructionKey: "ftest.hamstring_flexibility.instruction",
    videoUrl: "https://www.youtube.com/watch?v=XwQoK4v9mKk",
    regions: ["lumbar", "lower_back", "hip", "thigh_back"],
  },
  {
    id: "core_endurance",
    category: "strength",
    nameKey: "ftest.core_endurance.name",
    instructionKey: "ftest.core_endurance.instruction",
    videoUrl: "https://www.youtube.com/watch?v=ASdvN_XEl_c",
    regions: ["lumbar", "lower_back", "abdomen"],
  },
  {
    id: "single_leg_balance",
    category: "stability",
    nameKey: "ftest.single_leg_balance.name",
    instructionKey: "ftest.single_leg_balance.instruction",
    videoUrl: "https://www.youtube.com/watch?v=ASdvN_XEl_c",
    regions: ["lumbar", "lower_back", "hip"],
  },
  {
    id: "slump_test",
    category: "neurodynamic",
    nameKey: "ftest.slump_test.name",
    instructionKey: "ftest.slump_test.instruction",
    videoUrl: "https://www.youtube.com/watch?v=r1MFHvr3GGc",
    regions: ["lumbar", "lower_back", "thigh_back", "leg_back"],
  },
  {
    id: "mckenzie_extension",
    category: "neurodynamic",
    nameKey: "ftest.mckenzie_extension.name",
    instructionKey: "ftest.mckenzie_extension.instruction",
    videoUrl: "https://www.youtube.com/watch?v=r1MFHvr3GGc",
    regions: ["lumbar", "lower_back"],
  },
  {
    id: "lumbar_trigger_points",
    category: "trigger_points",
    nameKey: "ftest.lumbar_trigger_points.name",
    instructionKey: "ftest.lumbar_trigger_points.instruction",
    videoUrl: "https://www.youtube.com/watch?v=r1MFHvr3GGc",
    regions: ["lumbar", "lower_back", "hip"],
  },

  // ===== HIP =====
  {
    id: "hip_flexion",
    category: "mobility",
    nameKey: "ftest.hip_flexion.name",
    instructionKey: "ftest.hip_flexion.instruction",
    videoUrl: "https://www.youtube.com/watch?v=Y8MUaYGSEls",
    regions: ["hip", "groin"],
  },
  {
    id: "hip_rotation",
    category: "mobility",
    nameKey: "ftest.hip_rotation.name",
    instructionKey: "ftest.hip_rotation.instruction",
    videoUrl: "https://www.youtube.com/watch?v=Y8MUaYGSEls",
    regions: ["hip", "groin"],
  },
  {
    id: "hip_flexor_stretch",
    category: "flexibility",
    nameKey: "ftest.hip_flexor_stretch.name",
    instructionKey: "ftest.hip_flexor_stretch.instruction",
    videoUrl: "https://www.youtube.com/watch?v=Y8MUaYGSEls",
    regions: ["hip", "thigh_front", "groin"],
  },
  {
    id: "glute_bridge",
    category: "strength",
    nameKey: "ftest.glute_bridge.name",
    instructionKey: "ftest.glute_bridge.instruction",
    videoUrl: "https://www.youtube.com/watch?v=Y8MUaYGSEls",
    regions: ["hip", "glutes", "lower_back"],
  },

  // ===== KNEE =====
  {
    id: "knee_flexion_extension",
    category: "mobility",
    nameKey: "ftest.knee_flexion_extension.name",
    instructionKey: "ftest.knee_flexion_extension.instruction",
    videoUrl: "https://www.youtube.com/watch?v=D7uroMkEv5g",
    regions: ["knee_front", "knee_back", "knee_side"],
  },
  {
    id: "quad_flexibility",
    category: "flexibility",
    nameKey: "ftest.quad_flexibility.name",
    instructionKey: "ftest.quad_flexibility.instruction",
    videoUrl: "https://www.youtube.com/watch?v=D7uroMkEv5g",
    regions: ["knee_front", "thigh_front"],
  },
  {
    id: "single_leg_squat",
    category: "strength",
    nameKey: "ftest.single_leg_squat.name",
    instructionKey: "ftest.single_leg_squat.instruction",
    videoUrl: "https://www.youtube.com/watch?v=D7uroMkEv5g",
    regions: ["knee_front", "knee_back", "knee_side"],
  },
  {
    id: "knee_stability",
    category: "stability",
    nameKey: "ftest.knee_stability.name",
    instructionKey: "ftest.knee_stability.instruction",
    videoUrl: "https://www.youtube.com/watch?v=D7uroMkEv5g",
    regions: ["knee_front", "knee_back", "knee_side"],
  },

  // ===== ANKLE / FOOT =====
  {
    id: "ankle_dorsiflexion",
    category: "mobility",
    nameKey: "ftest.ankle_dorsiflexion.name",
    instructionKey: "ftest.ankle_dorsiflexion.instruction",
    videoUrl: "https://www.youtube.com/watch?v=XISJxsccN28",
    regions: ["ankle", "foot"],
  },
  {
    id: "calf_flexibility",
    category: "flexibility",
    nameKey: "ftest.calf_flexibility.name",
    instructionKey: "ftest.calf_flexibility.instruction",
    videoUrl: "https://www.youtube.com/watch?v=XISJxsccN28",
    regions: ["ankle", "leg_back", "foot"],
  },
  {
    id: "heel_raise",
    category: "strength",
    nameKey: "ftest.heel_raise.name",
    instructionKey: "ftest.heel_raise.instruction",
    videoUrl: "https://www.youtube.com/watch?v=XISJxsccN28",
    regions: ["ankle", "foot", "leg_back"],
  },
  {
    id: "ankle_stability",
    category: "stability",
    nameKey: "ftest.ankle_stability.name",
    instructionKey: "ftest.ankle_stability.instruction",
    videoUrl: "https://www.youtube.com/watch?v=XISJxsccN28",
    regions: ["ankle", "foot"],
  },
  {
    id: "star_excursion_test",
    category: "stability",
    nameKey: "ftest.star_excursion_test.name",
    instructionKey: "ftest.star_excursion_test.instruction",
    videoUrl: "https://www.youtube.com/watch?v=4GMzE7NV3W0",
    regions: ["ankle", "foot", "knee_front", "knee_side", "hip"],
  },
  {
    id: "y_balance_test",
    category: "stability",
    nameKey: "ftest.y_balance_test.name",
    instructionKey: "ftest.y_balance_test.instruction",
    videoUrl: "https://www.youtube.com/watch?v=qFVuS-P2FrI",
    regions: ["ankle", "foot", "knee_front", "knee_side"],
  },
  {
    id: "single_leg_heel_rise",
    category: "strength",
    nameKey: "ftest.single_leg_heel_rise.name",
    instructionKey: "ftest.single_leg_heel_rise.instruction",
    videoUrl: "https://www.youtube.com/watch?v=XISJxsccN28",
    regions: ["ankle", "foot", "leg_back"],
  },
  {
    id: "weight_bearing_lunge_test",
    category: "mobility",
    nameKey: "ftest.weight_bearing_lunge_test.name",
    instructionKey: "ftest.weight_bearing_lunge_test.instruction",
    videoUrl: "https://www.youtube.com/watch?v=U7woPNLUT3Q",
    regions: ["ankle", "foot"],
  },

  // ===== ELBOW / WRIST =====
  {
    id: "wrist_flexion_extension",
    category: "mobility",
    nameKey: "ftest.wrist_flexion_extension.name",
    instructionKey: "ftest.wrist_flexion_extension.instruction",
    videoUrl: "https://www.youtube.com/watch?v=mPFxS_OP5qY",
    regions: ["wrist", "forearm", "elbow"],
  },
  {
    id: "grip_strength",
    category: "strength",
    nameKey: "ftest.grip_strength.name",
    instructionKey: "ftest.grip_strength.instruction",
    videoUrl: "https://www.youtube.com/watch?v=mPFxS_OP5qY",
    regions: ["wrist", "forearm", "elbow", "hand"],
  },
  {
    id: "neural_tension_upper",
    category: "neurodynamic",
    nameKey: "ftest.neural_tension_upper.name",
    instructionKey: "ftest.neural_tension_upper.instruction",
    videoUrl: "https://www.youtube.com/watch?v=mPFxS_OP5qY",
    regions: ["cervical", "shoulder_front", "elbow", "wrist", "hand"],
  },
];

// Maps PainMap region IDs to functional test region IDs
const regionNormalization: Record<string, string[]> = {
  // Front view
  head: ["head"],
  neck_front: ["cervical"],
  right_shoulder: ["shoulder_front"],
  left_shoulder: ["shoulder_front"],
  chest: ["chest"],
  right_elbow: ["elbow"],
  left_elbow: ["elbow"],
  abdomen: ["abdomen"],
  right_wrist: ["wrist"],
  left_wrist: ["wrist"],
  right_hand: ["hand"],
  left_hand: ["hand"],
  right_hip: ["hip", "groin"],
  left_hip: ["hip", "groin"],
  right_thigh: ["thigh_front"],
  left_thigh: ["thigh_front"],
  right_knee: ["knee_front", "knee_side"],
  left_knee: ["knee_front", "knee_side"],
  right_shin: ["leg_back"],
  left_shin: ["leg_back"],
  right_ankle: ["ankle"],
  left_ankle: ["ankle"],
  right_foot: ["foot"],
  left_foot: ["foot"],
  // Back view
  head_back: ["head"],
  cervical: ["cervical"],
  upper_back: ["upper_back", "thoracic"],
  lower_back: ["lower_back", "lumbar"],
  sacral: ["lower_back", "lumbar"],
  right_shoulder_back: ["shoulder_back"],
  left_shoulder_back: ["shoulder_back"],
  right_gluteal: ["glutes", "hip"],
  left_gluteal: ["glutes", "hip"],
  right_hamstring: ["thigh_back"],
  left_hamstring: ["thigh_back"],
  right_calf: ["leg_back"],
  left_calf: ["leg_back"],
  // Side view
  head_side: ["head"],
  neck_side: ["cervical"],
  shoulder_side: ["shoulder_side", "shoulder_front", "shoulder_back"],
  trunk_side: ["upper_back", "thoracic", "lower_back", "lumbar"],
  arm_side: ["elbow"],
  forearm_side: ["forearm", "wrist"],
  hip_side: ["hip"],
  thigh_side: ["thigh_front", "thigh_back"],
  knee_side: ["knee_side", "knee_front", "knee_back"],
  leg_side: ["leg_back"],
  foot_side: ["foot", "ankle"],
};

export function getTestsForRegions(selectedRegions: string[]): FunctionalTest[] {
  // Normalize PainMap region IDs to functional test region IDs
  const normalizedRegions = new Set<string>();
  selectedRegions.forEach((region) => {
    const mapped = regionNormalization[region];
    if (mapped) {
      mapped.forEach((r) => normalizedRegions.add(r));
    } else {
      normalizedRegions.add(region);
    }
  });

  return functionalTests.filter((test) =>
    test.regions.some((r) => normalizedRegions.has(r))
  );
}
