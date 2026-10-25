# Architecture decisions
- Scope clinic and autonomous data before querying or limiting: solo requires clinic_id IS NULL plus professional ownership; clinic requires the selected clinic_id. Reset context-owned screens on switches, and validate agent thread/patient scope server-side independently of user ownership.
- Microcycle dose edits reuse savePlannedDose with the existing session ID and preserved date, track and metadata; never write perceived load when changing a target.
- Check-in reopening locks existing patient/day readiness until explicit editing; the existing unique patient/date upsert keeps one daily response. Dose displays retain perceived load for zero-target sessions without inventing a target or adherence verdict.
- Record-summary alerts preserve assessment-specific dismissal audits across history; health caveats reuse healthHistory formatting and Saúde geral recency (latest day, manual precedence) without new risk calculations or AI.
- Record-summary STEPS uses the fetched plan status: completed means discharge before any macro-cycle fallback, so insight and record discharge decisions remain consistent without rewriting history.
- Clinic demos use viewer-scoped fixtures and real local math, never live writes/AI; scenarios match the latest assessment and safety, otherwise stay empty.

- Cardiovascular ceiling reminders combine the record's assessments and ID/email-linked dated health records via `usePatientCardioHealth`; structured conditions never auto-select a clinician profile, infer control, or fabricate an age-based ceiling.

- Aliv.iA/Studio copy uses canonical `aliviaDifferentials.ts` IDs; handoff copy must not duplicate features or imply duplicate entry.
- Manual assessment and record share diagnosis.clinicalImpression; sync saved updates and regenerate only on request to avoid duplicate credits.
- Record paired sections share a horizontal row; preserve forms and shortcut reveals.
- Patient regional pain charts and comparisons share one chronological data helper; explicit regional measurements must never be replaced by an invented regional score from a multi-region global average.
- HEP metrics share `hepLoad.ts` across panel/microcycle.
- Professional sessions use only `saveProfessionalSession` in `periodizationData.ts`: merge same-date/track check-ins and link plans to avoid duplicate load. TRIMP/sRPE math stays in `cardioLoad.ts`.
- "Today" in load control is always the local/Brazil calendar date (`localISODate` client-side, America/Sao_Paulo in the check-in function), never `toISOString()`; UTC rolls to tomorrow after 21h in Brazil.
- Dose adherence (`adherenceByTrack`) counts only sessions up to local today with sRPE; unanswered/upcoming never count as underdose nor push alerts. Patient sRPE: today + 7 prior days, server-enforced.
- Weekly dose display derives full-week targets and recorded-to-date totals separately from answered-session adherence, with answered/scheduled counts per track; this preserves partial comparison and chart semantics without turning future or unanswered work into underdose.
- Load-control views use `loadWindows.ts` (3-day lists, 7-day charts, fallback to latest data); full history on demand in `LoadHistoryDialog`, never deleted; risk math ignores display windows.
- Cardiovascular metrics and both PDFs use pure `cardioAnalysis.ts` for consistency without AI.
- Athlete/active PDF priorities and descriptive summaries use `cardioReportSections` in `cardioAnalysis.ts`; WHO remains secondary and presentation changes never alter load or safety calculations.
- `cardioEducation.ts` shares dialog/PDF education; profile references differ from safety limits and unmeasured respiratory targets.
- Dashboard/clinic effects depend on `user?.id`, not `user`; token refresh must not reset open screens.
- Recovery decisions (load matrix, day adjustment, load card) use `recoverySignal` in `periodization.ts`: check-in readiness is the universal base and morning resting HR, when fresh with baseline, takes priority (most conservative wins); patients often skip morning HR.
- Load control has one session-entry path (monitored-session block + microcycle shortcut); the load card is read-only plus manual check-in, and cardio analysis appears only when HR data exists.
- Load-control "Conduta do dia" derives only from `dailyConduct.ts` (safety → recovery → yesterday/effort coherence → ACWR trend); one deterministic priority order keeps the top recommendation consistent and works with a single check-in.
- TSL 1-min, TC6M and TD6M use only pure `cardioFunctionalTests.ts`; keep record, sheet and reports consistent without AI.
- Read nested AGENTS.md before editing its directory.
- Patient links use ClinicBrandHeader/scoped clinicAssessmentTheme, including WelcomeStep. PDFs share section renderers, resolveAssessmentBranding and per-document applyPdfBranding; preserve warnings and clinic isolation.
- HEP programs persist clinic_id at creation; public branding resolves only through the valid program token, never by guessing a clinic from the professional.

- Preventive assessments are explicit opt-in via the shared purpose helper; preserve symptomatic defaults, store historical sites separately and unmeasured pain as null, and keep safety and professional-selected questionnaires.
- Spine logic stays in `spineBiomechanics.ts`; `spinePresentation.ts` shares screen/PDF geometry and dated exams to preserve history.
- Imports use service-only write/undo journals to restore merges and reject later edits atomically. ZIP omits source IDs/privileges; local XML parsing rejects DTD/entities and bounds complexity, preserving fields for review.

- Combined imports use the isolated deterministic planner, explicit per-column disposition and server revalidation; bounded idempotent chunks are correlated by actor-scoped operation UUIDs for recovery and whole-set undo. Source codes are metadata, never authority; email-only evolution readers require genuine emails until an additive linkage migration is implemented.
- Agenda appointments repeat by inserting real rows sharing series_id (rule in recurrence_rule) via pure appointmentRecurrence.ts; reports/occupancy need no changes and completed sessions are never bulk-deleted.
- Insights tab renders only through the category registry in `InsightsTab.tsx` (one category + role visibility per entry); financial/quality metrics are pure functions in `managementMetrics.ts` over scoped rows, so new insights stay organized and testable without AI.
- Read `src/components/dashboard/insights/AGENTS.md` for RPC rules.
- Assessment-to-agenda conversion uses `get_assessment_agenda_conversion` in both care scopes, counting first completed assessments and treatment appointments within 7 days of the assessment by email or linked assessment, never names; `get_assessment_unscheduled_list` names those without a 7-day appointment. This prevents reassessment inflation and false conversions across profiles.
- Insight list dismissals (STEPS phase, reassessment due, conversion unscheduled) live in `public.insight_dismissals` keyed by user + insight_key + scope_key + patient_key via `useInsightDismissals`; owner/admin dismissals set scope_wide and hide for the whole clinic team, others hide for the viewer only, and restoreAll clears what the viewer may delete.
- Clinic management insights (revenue goal, team stats, concentration, benchmark, conversion funnel) render only for clinic owner/admin (`canManage` on InsightsTab); secretaries keep clinical cards plus occupancy and reactivation, and the PRO solo sees his own management cards.
- Operational growth insights (frequency gap, referral, leakage, late cancel, owner dependence, capacity bottleneck) are pure functions in `managementMetrics.ts` over the scoped `useManagementData` rows; `prescribed_weekly_frequency`/`referral_source`/`rooms_count` feed them. Late-cancel uses trigger `status_changed_at` (legacy/time-less slots stay "unknown"; window = cancellation date). Leakage names: latest session, else patient registry. Bottleneck: occupancy + saturation; solo shows occupancy only.
- Financial insights resolve prices via `care_services` (clinic/solo catalog, per-session or monthly); monthly fees dilute across that patient's realized sessions of the service in the month (`buildPriceResolver`), default session price is the fallback, and booking picks the service (`professional_appointments.service_id`). `recordCompliance` treats past unclassified slots without a note as pendencies (never 'on time') and returns a null rate when nothing was evaluated.

- Adherence links readiness by scoped patient ID (email-less identities use patient:<id>), normalizes only available channels, retains 60-day check-in participants and measures a 14-day window; all ranked patients remain searchable. Frequency uses elapsed month-to-date days from the later of registration/first session; financial drilldowns reuse the same scoped appointments and price resolver as totals.
- Appointment requests use scoped RPCs/push; approval creates the slot only in Agenda (solo PRO, clinic owner/admin/secretary). Resolve service names from the same scoped catalog, including inactive entries; show the requested service in the card/dialog and preselect its saved ID.
- Announcements use scoped server lists, can_handle_appointment_request and server-resolved push recipients.
- Agenda uses latestRequest to reject stale results. ClinicServicesCard lives only in the manager-visible `care-services` registry entry in Insights → Operação, not Patients/Team, to keep home uncluttered; explicit professional scope isolates solo services.
- Clinics use idempotent `_shared/clinicProvisioning.ts` for webhook/self-heal; `clinicAdminGroups` separates paid/free/trial, preserving status.

- AI quotas: server policy, atomic FIFO, service-only fulfillment, distinct quota/provider errors. Protected ai_credit_admin_roles controls rollout; empty tiers block nobody. Checkout/fulfillment verify paid items against the shared catalog.
- Academic revocation preserves absent CREFITO only on inactive, unapproved updates with access off; inserts/activation remain validated. Toggles keep list membership until explicit removal and reload saved state.
