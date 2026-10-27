# Periodization UI rules
- Daily sRPE × PSR chart and descriptive comparisons use `loadRecovery.ts`; raw PSR stays separate from composite readiness, missing data stay null, and risk math is unchanged.
- Periodization buttons use type="button"; they sit inside patient-record forms.
- Microcycle planned sessions from today or the previous 7 days open a pre-filled monitored-session dialog on click (MicroWeekGrid → saveProfessionalSession); a separate pencil edits planned dose on any date, preserving session ID/date/track and recorded load. Edit/trash actions stopPropagation.
- Cardio analysis mounts only inside `CardioAnalysisDialog`; keeps the record light.
- Cardio panel section and KPI order come from `profilePanelOrder` in `cardioAnalysis.ts` (same priority logic as the PDFs); reordering presentation must never change calculations.
- Every command inside PeriodizationSection anchors the touched element and stores a short-lived scroll mark restored after remounts; load-control actions must never move the page.
- STEPS inclui o passo terminal "Alta" (DISCHARGE_PHASE): selecionável no MacroTimeline e no insight de fases; `dischargePlan` encerra o plano (status 'completed') e desmarca a fase atual — nunca criar ciclo macro de alta nem apagar histórico.
- O insight "Fase do tratamento (STEPS)" abre PhaseQuickChangeDialog ao tocar no paciente: troca de fase/alta usam setCurrentMacroPhase/dischargePhase do prontuário, sem regra duplicada; a RPC get_steps_phase_overview retorna plan_id para isso.
- Check-in link: tapping a selected session deselects it; readiness submit only carries a session the patient touched; today’s own answers are editable same-day via the server upsert. Planned-dose dialogs offer CopyToDaysPicker (same week, new sessions only).
