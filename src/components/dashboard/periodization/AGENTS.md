# Periodization UI rules
- Daily sRPE × PSR chart and descriptive comparisons use `loadRecovery.ts`; raw PSR stays separate from composite readiness, missing data stay null, and risk math is unchanged.
- Periodization buttons use type="button"; they sit inside patient-record forms.
- Microcycle planned sessions from today or the previous 7 days open a pre-filled monitored-session dialog on click (MicroWeekGrid → saveProfessionalSession); a separate pencil edits planned dose on any date, preserving session ID/date/track and recorded load. Edit/trash actions stopPropagation.
- Cardio analysis mounts only inside `CardioAnalysisDialog`; keeps the record light.
- Cardio panel section and KPI order come from `profilePanelOrder` in `cardioAnalysis.ts` (same priority logic as the PDFs); reordering presentation must never change calculations.
- Every command inside PeriodizationSection anchors the touched element and stores a short-lived scroll mark restored after remounts; load-control actions must never move the page.
