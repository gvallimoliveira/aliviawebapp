- Mobile text shares call shareTextNowOrOpenWhatsApp with no await before it (prefetch short links); iOS drops the share sheet once the tap gesture expires.
- Foreground assessment notices require a proven status transition via assessmentCompletionNotification and a scoped baseline; arbitrary edits to completed assessments never count as new completions.
- Agenda crowded slots (3+ in one hour) and custom catalog services ("personalizado", filtered by service_id) use pure helpers in `appointmentTime.ts`; overlap lanes, drag targets and financial pricing stay unchanged.
- Agenda evolution is independent of attendance status; after saving a nonempty note for a scheduled slot, use the checked status callback to mark completed. Retain saved content on status failure to avoid duplicate notes; never count drafts as attendance.
- Appointment service selectors display scoped custom catalog names using service_id, while persisting the original service_type for filtering and pricing compatibility.

- Clinic trial entry uses clinicTrialEntry.ts for session-only noncredential drafts and shared CNPJ validation; authenticate before provisioning, resume through /clinica/ativar-teste and clear stale paid checkout intent to prevent accidental billing.
- Demo patient registrations share an in-memory user/practice-scoped external store; never invoke real writes/events or persist them across reloads, so demo shortcuts and records cannot contaminate live care.
- Last-assessment labels use patientAssessmentDates over real assessments only; registration dates stay available for existing sorting/filtering but never masquerade as assessments.
