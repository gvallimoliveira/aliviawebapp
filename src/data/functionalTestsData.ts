export interface FunctionalTest {
  id: string;
  category: "mobility" | "flexibility" | "strength" | "stability" | "neurodynamic" | "trigger_points";
  nameKey: string;
  instructionKey: string;
  searchQuery: string;
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
    searchQuery: "cervical rotation mobility test physiotherapy",
    regions: ["cervical", "head"],
  },
  {
    id: "cervical_flexion",
    category: "mobility",
    nameKey: "ftest.cervical_flexion.name",
    instructionKey: "ftest.cervical_flexion.instruction",
    searchQuery: "cervical flexion mobility test physiotherapy",
    regions: ["cervical", "head"],
  },
  {
    id: "upper_trap_stretch",
    category: "flexibility",
    nameKey: "ftest.upper_trap_stretch.name",
    instructionKey: "ftest.upper_trap_stretch.instruction",
    searchQuery: "upper trapezius stretch test physiotherapy",
    regions: ["cervical", "shoulder_front", "shoulder_back"],
  },
  {
    id: "deep_neck_flexor",
    category: "strength",
    nameKey: "ftest.deep_neck_flexor.name",
    instructionKey: "ftest.deep_neck_flexor.instruction",
    searchQuery: "deep neck flexor endurance test physiotherapy",
    regions: ["cervical", "head"],
  },
  {
    id: "cervical_trigger_points",
    category: "trigger_points",
    nameKey: "ftest.cervical_trigger_points.name",
    instructionKey: "ftest.cervical_trigger_points.instruction",
    searchQuery: "cervical trigger points palpation assessment physiotherapy",
    regions: ["cervical", "head"],
  },

  // ===== SHOULDER =====
  {
    id: "shoulder_flexion",
    category: "mobility",
    nameKey: "ftest.shoulder_flexion.name",
    instructionKey: "ftest.shoulder_flexion.instruction",
    searchQuery: "shoulder flexion range of motion test physiotherapy",
    regions: ["shoulder_front", "shoulder_back", "shoulder_side"],
  },
  {
    id: "shoulder_rotation",
    category: "mobility",
    nameKey: "ftest.shoulder_rotation.name",
    instructionKey: "ftest.shoulder_rotation.instruction",
    searchQuery: "shoulder internal external rotation test physiotherapy",
    regions: ["shoulder_front", "shoulder_back", "shoulder_side"],
  },
  {
    id: "pec_stretch",
    category: "flexibility",
    nameKey: "ftest.pec_stretch.name",
    instructionKey: "ftest.pec_stretch.instruction",
    searchQuery: "pectoralis muscle flexibility test doorway stretch",
    regions: ["shoulder_front", "chest"],
  },
  {
    id: "shoulder_isometric",
    category: "strength",
    nameKey: "ftest.shoulder_isometric.name",
    instructionKey: "ftest.shoulder_isometric.instruction",
    searchQuery: "shoulder isometric strength test physiotherapy",
    regions: ["shoulder_front", "shoulder_back", "shoulder_side"],
  },
  {
    id: "scapular_stability",
    category: "stability",
    nameKey: "ftest.scapular_stability.name",
    instructionKey: "ftest.scapular_stability.instruction",
    searchQuery: "scapular stability wall push up test physiotherapy",
    regions: ["shoulder_back", "upper_back", "shoulder_side"],
  },

  // ===== THORACIC / UPPER BACK =====
  {
    id: "thoracic_rotation",
    category: "mobility",
    nameKey: "ftest.thoracic_rotation.name",
    instructionKey: "ftest.thoracic_rotation.instruction",
    searchQuery: "thoracic rotation mobility test seated physiotherapy",
    regions: ["upper_back", "thoracic"],
  },
  {
    id: "thoracic_extension",
    category: "flexibility",
    nameKey: "ftest.thoracic_extension.name",
    instructionKey: "ftest.thoracic_extension.instruction",
    searchQuery: "thoracic extension flexibility test foam roller physiotherapy",
    regions: ["upper_back", "thoracic"],
  },

  // ===== LUMBAR / LOWER BACK =====
  {
    id: "lumbar_flexion",
    category: "mobility",
    nameKey: "ftest.lumbar_flexion.name",
    instructionKey: "ftest.lumbar_flexion.instruction",
    searchQuery: "lumbar flexion standing toe touch test physiotherapy",
    regions: ["lumbar", "lower_back"],
  },
  {
    id: "lumbar_extension",
    category: "mobility",
    nameKey: "ftest.lumbar_extension.name",
    instructionKey: "ftest.lumbar_extension.instruction",
    searchQuery: "lumbar extension standing test physiotherapy",
    regions: ["lumbar", "lower_back"],
  },
  {
    id: "hamstring_flexibility",
    category: "flexibility",
    nameKey: "ftest.hamstring_flexibility.name",
    instructionKey: "ftest.hamstring_flexibility.instruction",
    searchQuery: "hamstring flexibility straight leg raise test",
    regions: ["lumbar", "lower_back", "hip", "thigh_back"],
  },
  {
    id: "core_endurance",
    category: "strength",
    nameKey: "ftest.core_endurance.name",
    instructionKey: "ftest.core_endurance.instruction",
    searchQuery: "core endurance plank test physiotherapy",
    regions: ["lumbar", "lower_back", "abdomen"],
  },
  {
    id: "single_leg_balance",
    category: "stability",
    nameKey: "ftest.single_leg_balance.name",
    instructionKey: "ftest.single_leg_balance.instruction",
    searchQuery: "single leg balance test 30 seconds physiotherapy",
    regions: ["lumbar", "lower_back", "hip"],
  },
  {
    id: "slump_test",
    category: "neurodynamic",
    nameKey: "ftest.slump_test.name",
    instructionKey: "ftest.slump_test.instruction",
    searchQuery: "slump test neurodynamic assessment physiotherapy",
    regions: ["lumbar", "lower_back", "thigh_back", "leg_back"],
  },
  {
    id: "mckenzie_extension",
    category: "neurodynamic",
    nameKey: "ftest.mckenzie_extension.name",
    instructionKey: "ftest.mckenzie_extension.instruction",
    searchQuery: "mckenzie repeated extension test lumbar physiotherapy",
    regions: ["lumbar", "lower_back"],
  },
  {
    id: "lumbar_trigger_points",
    category: "trigger_points",
    nameKey: "ftest.lumbar_trigger_points.name",
    instructionKey: "ftest.lumbar_trigger_points.instruction",
    searchQuery: "lumbar trigger points palpation quadratus lumborum",
    regions: ["lumbar", "lower_back", "hip"],
  },

  // ===== HIP =====
  {
    id: "hip_flexion",
    category: "mobility",
    nameKey: "ftest.hip_flexion.name",
    instructionKey: "ftest.hip_flexion.instruction",
    searchQuery: "hip flexion range of motion test supine physiotherapy",
    regions: ["hip", "groin"],
  },
  {
    id: "hip_rotation",
    category: "mobility",
    nameKey: "ftest.hip_rotation.name",
    instructionKey: "ftest.hip_rotation.instruction",
    searchQuery: "hip internal external rotation test seated physiotherapy",
    regions: ["hip", "groin"],
  },
  {
    id: "hip_flexor_stretch",
    category: "flexibility",
    nameKey: "ftest.hip_flexor_stretch.name",
    instructionKey: "ftest.hip_flexor_stretch.instruction",
    searchQuery: "Thomas test hip flexor tightness assessment physiotherapy",
    regions: ["hip", "thigh_front", "groin"],
  },
  {
    id: "glute_bridge",
    category: "strength",
    nameKey: "ftest.glute_bridge.name",
    instructionKey: "ftest.glute_bridge.instruction",
    searchQuery: "single leg glute bridge strength test physiotherapy",
    regions: ["hip", "glutes", "lower_back"],
  },

  // ===== KNEE =====
  {
    id: "knee_flexion_extension",
    category: "mobility",
    nameKey: "ftest.knee_flexion_extension.name",
    instructionKey: "ftest.knee_flexion_extension.instruction",
    searchQuery: "knee flexion extension range of motion test physiotherapy",
    regions: ["knee_front", "knee_back", "knee_side"],
  },
  {
    id: "quad_flexibility",
    category: "flexibility",
    nameKey: "ftest.quad_flexibility.name",
    instructionKey: "ftest.quad_flexibility.instruction",
    searchQuery: "quadriceps flexibility Ely test prone physiotherapy",
    regions: ["knee_front", "thigh_front"],
  },
  {
    id: "single_leg_squat",
    category: "strength",
    nameKey: "ftest.single_leg_squat.name",
    instructionKey: "ftest.single_leg_squat.instruction",
    searchQuery: "single leg squat test knee valgus assessment physiotherapy",
    regions: ["knee_front", "knee_back", "knee_side"],
  },
  {
    id: "knee_stability",
    category: "stability",
    nameKey: "ftest.knee_stability.name",
    instructionKey: "ftest.knee_stability.instruction",
    searchQuery: "knee stability single leg balance test physiotherapy",
    regions: ["knee_front", "knee_back", "knee_side"],
  },

  // ===== ANKLE / FOOT =====
  {
    id: "single_leg_balance_ankle",
    category: "stability",
    nameKey: "ftest.single_leg_balance_ankle.name",
    instructionKey: "ftest.single_leg_balance_ankle.instruction",
    searchQuery: "single leg balance test 30 seconds ankle stability physiotherapy",
    regions: ["ankle", "foot"],
  },
  {
    id: "weight_bearing_lunge_test",
    category: "mobility",
    nameKey: "ftest.weight_bearing_lunge_test.name",
    instructionKey: "ftest.weight_bearing_lunge_test.instruction",
    searchQuery: "weight bearing lunge test ankle dorsiflexion measurement physiotherapy",
    regions: ["ankle", "foot"],
  },
  {
    id: "heel_rise_test",
    category: "strength",
    nameKey: "ftest.heel_rise_test.name",
    instructionKey: "ftest.heel_rise_test.instruction",
    searchQuery: "single leg heel rise test calf strength endurance physiotherapy",
    regions: ["ankle", "foot", "leg_back"],
  },

  // ===== ELBOW / WRIST =====
  {
    id: "wrist_flexion_extension",
    category: "mobility",
    nameKey: "ftest.wrist_flexion_extension.name",
    instructionKey: "ftest.wrist_flexion_extension.instruction",
    searchQuery: "wrist flexion extension range of motion test physiotherapy",
    regions: ["wrist", "forearm", "elbow"],
  },
  {
    id: "grip_strength",
    category: "strength",
    nameKey: "ftest.grip_strength.name",
    instructionKey: "ftest.grip_strength.instruction",
    searchQuery: "grip strength test squeeze bottle hand physiotherapy",
    regions: ["wrist", "forearm", "elbow", "hand"],
  },
  {
    id: "neural_tension_upper",
    category: "neurodynamic",
    nameKey: "ftest.neural_tension_upper.name",
    instructionKey: "ftest.neural_tension_upper.instruction",
    searchQuery: "upper limb neural tension test ULNT median nerve physiotherapy",
    regions: ["cervical", "shoulder_front", "elbow", "wrist", "hand"],
  },
];

// Maps PainMap region IDs to functional test region IDs
const regionNormalization: Record<string, string[]> = {
  // Front view
  head: ["head"],
  cervical_front: ["cervical"],
  right_shoulder: ["shoulder_front"],
  left_shoulder: ["shoulder_front"],
  chest: ["chest"],
  right_arm: ["elbow"],
  left_arm: ["elbow"],
  right_elbow: ["elbow"],
  left_elbow: ["elbow"],
  right_forearm: ["forearm", "wrist"],
  left_forearm: ["forearm", "wrist"],
  abdomen: ["abdomen"],
  right_hand: ["hand"],
  left_hand: ["hand"],
  right_hip: ["hip", "groin"],
  left_hip: ["hip", "groin"],
  right_thigh_ant: ["thigh_front"],
  left_thigh_ant: ["thigh_front"],
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
  right_shoulder_back: ["shoulder_back"],
  left_shoulder_back: ["shoulder_back"],
  thoracic: ["upper_back", "thoracic"],
  lower_back: ["lower_back", "lumbar"],
  right_arm_back: ["elbow"],
  left_arm_back: ["elbow"],
  right_elbow_back: ["elbow"],
  left_elbow_back: ["elbow"],
  right_forearm_back: ["forearm", "wrist"],
  left_forearm_back: ["forearm", "wrist"],
  right_hand_back: ["hand"],
  left_hand_back: ["hand"],
  right_sij: ["glutes", "hip", "lumbar"],
  left_sij: ["glutes", "hip", "lumbar"],
  sacrum: ["lumbar", "glutes"],
  right_gluteal: ["glutes", "hip"],
  left_gluteal: ["glutes", "hip"],
  right_thigh_post: ["thigh_back"],
  left_thigh_post: ["thigh_back"],
  right_knee_back: ["knee_back"],
  left_knee_back: ["knee_back"],
  right_calf: ["leg_back"],
  left_calf: ["leg_back"],
  right_ankle_back: ["ankle"],
  left_ankle_back: ["ankle"],
  right_foot_back: ["foot"],
  left_foot_back: ["foot"],
  // Left side view
  head_left: ["head"],
  cervical_left: ["cervical"],
  shoulder_left: ["shoulder_side", "shoulder_front", "shoulder_back"],
  arm_left: ["elbow"],
  elbow_left: ["elbow"],
  forearm_left: ["forearm", "wrist"],
  hand_left: ["hand"],
  thoracic_left: ["upper_back", "thoracic"],
  lumbar_left: ["lower_back", "lumbar"],
  hip_left: ["hip"],
  thigh_left: ["thigh_front", "thigh_back"],
  knee_left: ["knee_side", "knee_front", "knee_back"],
  shin_left: ["leg_back"],
  ankle_left: ["ankle"],
  foot_left: ["foot"],
  // Right side view
  head_right: ["head"],
  cervical_right: ["cervical"],
  shoulder_right: ["shoulder_side", "shoulder_front", "shoulder_back"],
  arm_right: ["elbow"],
  elbow_right: ["elbow"],
  forearm_right: ["forearm", "wrist"],
  hand_right: ["hand"],
  thoracic_right: ["upper_back", "thoracic"],
  lumbar_right: ["lower_back", "lumbar"],
  hip_right: ["hip"],
  thigh_right: ["thigh_front", "thigh_back"],
  knee_right: ["knee_side", "knee_front", "knee_back"],
  shin_right: ["leg_back"],
  ankle_right: ["ankle"],
  foot_right: ["foot"],
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
