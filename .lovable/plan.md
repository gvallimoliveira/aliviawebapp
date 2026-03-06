

## Plan: Clinical Detail Enhancements — Surgery History & Region-Specific Sub-questions

### Overview
Three interconnected changes: (1) add surgery history question to anamnesis, (2) add region-specific sub-questions after pain map when a single segment is selected, (3) feed all this data to the AI diagnosis engine for more precise reasoning.

---

### 1. Surgery History Step

**AnamnesisForm.tsx** — Add new fields to `AnamnesisData`:
- `hasPriorSurgery: string` ("yes" / "no")
- `surgeryDetails: string` (free text, appears conditionally)

Add a new step `"surgery"` in `buildStepSequence()` — insert after `"onset"` (before painmap). UI: two cards (Sim/Nao), with a `Textarea` appearing when "yes" is selected.

---

### 2. Region-Specific Sub-questions Step

**New step `"region_detail"` in AnamnesisForm** — inserted after `"painmap"`, shown only when the user selects exactly 1 relevant segment (knee, ankle, hip, shoulder, or cervical).

Add new fields to `AnamnesisData`:
- `painSubArea: string` (e.g., "front", "lateral", "medial", "posterior")
- `hadTwist: string` (knee-specific: torção → Ottawa rules)
- `hadSprain: string` (ankle-specific: entorse → Ottawa rules)  
- `hadDislocation: string` (shoulder-specific: luxação → SLAP/instability)
- `ottawaPositive: string` (result of Ottawa screening if applicable)

**Logic per region:**

| Region | Extra Question | Sub-areas |
|--------|---------------|-----------|
| Knee | "Houve torção?" → Se sim, Ottawa joelho | Frente (condropatia, hoffite, tend. patelar), Lateral (LCL, menisco lat., ITB), Medial (pata ganso, menisco med., LCM), Posterior (cisto Baker, lesão LCP) |
| Ankle | "Entorse recente?" → Se sim, Ottawa tornozelo | Lateral (talofibular ant.), Medial (lig. deltoide), Posterior (impacto talus, Haglund), Antero-lateral (sindesmose) |
| Hip | — | Lateral (bursite trocanterica, tendinopatia glutea), Anterior (FAI, tendinopatia RF) |
| Shoulder | "Histórico de luxação?" | Anterior (cabo longo bíceps), Lateral (bursite, tend. supraespinhal), Medial/Superior (conflito subacromial, SLAP) |
| Cervical | — | Posterior (artropatias, tensão miofascial), Antero-lateral (ECM) |

UI: region-specific cards for sub-area selection, plus conditional Yes/No trauma questions. All rendered dynamically based on which single region was selected.

---

### 3. AI Diagnosis Integration

**generate-diagnosis/index.ts** — Update:
- Include `surgeryDetails` in the user prompt
- Include `painSubArea`, trauma flags (`hadTwist`, `hadSprain`, `hadDislocation`) in the user prompt
- Add region-specific clinical reasoning blocks that use sub-area data to prioritize hypotheses (e.g., if knee + "front" → prioritize condromalacia patelar, hoffite, tendinopatia patelar)
- Add Ottawa rules reasoning block when twist/sprain is positive

---

### 4. Translations

**LanguageContext.tsx** — Add ~30 new translation keys for:
- Surgery question labels (PT/EN)
- Sub-area labels for each region (PT/EN)
- Trauma questions (torção, entorse, luxação) (PT/EN)
- Ottawa screening question (PT/EN)

---

### Files to modify
1. `src/components/assessment/AnamnesisForm.tsx` — New data fields, 2 new steps (`surgery`, `region_detail`)
2. `supabase/functions/generate-diagnosis/index.ts` — New prompt sections for surgery + sub-area reasoning
3. `src/contexts/LanguageContext.tsx` — New translation keys

