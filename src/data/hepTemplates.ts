// Reusable HEP templates. Each template defines an ordered list of exercises
// from the exercise_library (by id) with default sets/reps/frequency/observations.
// Templates appear in the "Aplicar template" dropdown inside CreateExerciseProgramModal.

export interface HepTemplateItem {
  exerciseId: string;
  sets: string;
  reps: string;
  frequency: string;
  observations?: string;
  /** Optional progression stage label shown in observations prefix. */
  stage?: string;
}

export interface HepTemplate {
  id: string;
  bodyRegion: string;
  name_pt: string;
  name_en: string;
  description_pt: string;
  description_en: string;
  /** General notes appended to the program's "notes" field. */
  notes_pt: string;
  notes_en: string;
  items: HepTemplateItem[];
}

// Shoulder stabilization progression:
// Mobilidade → Isométricos (sleeper/full can) → Elástico (ER/IR) →
// CCF (push-up plus, scapular push-up, plank tap) → ABER (90/90) →
// Kettlebell bottom-up (hold → press → waiter walk).
export const HEP_TEMPLATES: HepTemplate[] = [
  {
    id: "shoulder-progression-v1",
    bodyRegion: "shoulder",
    name_pt: "Ombro — Progressão completa (mobilidade → KB bottom-up)",
    name_en: "Shoulder — Full progression (mobility → KB bottom-up)",
    description_pt:
      "Progressão de estabilização glenoumeral em 6 estágios: mobilidade → isométricos/ativação → elástico → cadeia cinética fechada → ABER → kettlebell bottom-up.",
    description_en:
      "Glenohumeral stabilization in 6 stages: mobility → isometrics/activation → bands → closed kinetic chain → ABER → kettlebell bottom-up.",
    notes_pt:
      "Progredir entre estágios apenas quando o anterior estiver indolor e com controle motor preservado. Reavaliar a cada 2-3 semanas.",
    notes_en:
      "Only progress between stages once the previous one is pain-free and motor control is preserved. Reassess every 2-3 weeks.",
    items: [
      // STAGE 1 — Mobility
      {
        exerciseId: "b62b72c3-e028-45c5-981b-0c9070df469c", // Sleeper Stretch
        sets: "2",
        reps: "30s",
        frequency: "Diário",
        stage: "1. Mobilidade",
        observations: "Alongamento cápsula posterior. Sem reproduzir dor aguda.",
      },
      {
        exerciseId: "09df177c-494e-41dd-82c2-7f6dd10391c7", // Pendular de Codman
        sets: "2",
        reps: "1min",
        frequency: "Diário",
        stage: "1. Mobilidade",
        observations: "Aquecimento articular, descompressão suave.",
      },
      // STAGE 2 — Isometrics / activation
      {
        exerciseId: "6cc01082-3524-4b55-bedc-0c12439f9abc", // Full Can
        sets: "3",
        reps: "12",
        frequency: "3x/semana",
        stage: "2. Isométricos/ativação",
        observations: "Carga leve (1-2kg). Foco em controle até 90°.",
      },
      {
        exerciseId: "7385e0b1-38dc-43fd-a87d-beeda0d9311f", // Serratus Punch
        sets: "3",
        reps: "12",
        frequency: "3x/semana",
        stage: "2. Isométricos/ativação",
        observations: "Ativação do serrátil anterior, protração completa.",
      },
      // STAGE 3 — Elastic band
      {
        exerciseId: "a1a40fbc-649a-404b-b5e4-ca567418f86f", // Rotação Externa com Faixa
        sets: "3",
        reps: "12",
        frequency: "3x/semana",
        stage: "3. Elástico",
        observations: "Cotovelo colado, controle excêntrico do retorno.",
      },
      {
        exerciseId: "cf7803d2-3da8-4f6e-824e-1a102134a6ce", // Rotação Interna com Elástico
        sets: "3",
        reps: "12",
        frequency: "3x/semana",
        stage: "3. Elástico",
        observations: "Mesma tensão do elástico da rotação externa.",
      },
      {
        exerciseId: "9fbaf631-8ad3-4e8f-a20f-8fb7ad820bab", // Wall Slides com Elástico
        sets: "3",
        reps: "10",
        frequency: "3x/semana",
        stage: "3. Elástico",
        observations: "Manter contato com a parede durante toda a ADM.",
      },
      // STAGE 4 — Closed kinetic chain
      {
        exerciseId: "3ac4f1e9-0a14-4642-8091-9e98978bad71", // Scapular Push-up
        sets: "3",
        reps: "12",
        frequency: "3x/semana",
        stage: "4. CCF",
        observations: "Sem flexionar cotovelos. Foco em retração/protração escapular.",
      },
      {
        exerciseId: "73c9477c-bd07-4bb0-8f04-83551066ec69", // Plank com Protração (Push-up Plus)
        sets: "3",
        reps: "10",
        frequency: "3x/semana",
        stage: "4. CCF",
      },
      {
        exerciseId: "21e30de4-27d2-487a-8d66-2f5b7031359e", // Plank Tap nos Ombros
        sets: "3",
        reps: "20 (alt.)",
        frequency: "3x/semana",
        stage: "4. CCF",
        observations: "Sem rotar o quadril.",
      },
      // STAGE 5 — ABER / control in elevated position
      {
        exerciseId: "5f2c1a70-922d-4ce7-b812-4acac2a16e53", // Rotação Externa 90/90 (ABER)
        sets: "3",
        reps: "10",
        frequency: "3x/semana",
        stage: "5. ABER",
        observations: "Ombro 90° abd, cotovelo 90°. Elástico de baixa tensão.",
      },
      {
        exerciseId: "939b9f68-41a8-4fe5-a95e-99678b65f552", // Prone Y-T-W
        sets: "2",
        reps: "10 cada",
        frequency: "3x/semana",
        stage: "5. ABER",
        observations: "Pesos leves (0.5-1kg). Controle escapular.",
      },
      // STAGE 6 — Kettlebell bottom-up
      {
        exerciseId: "76f30fd0-b2d4-4b7a-8c24-b5361e8981cb", // Bottom-up KB Hold
        sets: "3",
        reps: "20s",
        frequency: "2x/semana",
        stage: "6. KB bottom-up",
        observations: "Iniciar com 4-6kg. Cotovelo a 90°.",
      },
      {
        exerciseId: "b0467305-92ed-41df-b7f4-0a9922c08094", // Bottom-up KB Strict Press
        sets: "3",
        reps: "5",
        frequency: "2x/semana",
        stage: "6. KB bottom-up",
        observations: "Pressionar mantendo a alça para baixo. Reset a cada repetição.",
      },
      {
        exerciseId: "4d32cd4d-e29f-4bdd-bb7e-57d5ba91730a", // Bottom-up KB Waiter Walk
        sets: "3",
        reps: "10m",
        frequency: "2x/semana",
        stage: "6. KB bottom-up",
        observations: "Caminhar lento. Estabilidade > distância.",
      },
    ],
  },
];
