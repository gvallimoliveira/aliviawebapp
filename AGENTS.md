# Architecture decisions
- Clinic checkout shares prices/validated metadata; refresh on return. Landing billing stays sticky within price cards; credit/refund details follow them.
- Annual refunds share copy keys; annualRefund.ts calculates, never pays.
- Trial renewal uses an owner/clinic-scoped RPC on access/expiry and trial_started_at, never created_at; no customer admin exception.
- Patient navigation shares patientNavigation/scoped care-provider and HEP RPCs; retain auth/persistence.
- Clinical AI shares `_shared/rlca-reference.ts`; separate claims/evidence, retain surgery context; no automated clearance/report replacement.
- Scope before querying/limiting: solo clinic_id IS NULL + ownership; clinic selected clinic_id. Reset screens on switches; validate agent thread/patient scope server-side.
- Microcycle dose edits reuse savePlannedDose with the existing session ID and preserved date, track and metadata; never write perceived load when changing a target.
- Check-in reopening locks existing patient/day readiness until explicit editing; the existing unique patient/date upsert keeps one daily response. Dose displays retain perceived load for zero-target sessions without inventing a target or adherence verdict.
- Record alerts retain dismissal audits; health caveats share healthHistory and latest-day/manual precedence, without new risk math/AI.
- Record-summary STEPS prioritizes fetched completed status before macro-cycle fallback; preserve history.
- Clinic demos: viewer-scoped fixtures, local math, no live writes/AI; match latest assessment/safety or stay empty.

- Cardio ceiling reminders use `usePatientCardioHealth` over assessments and ID/email-linked dated health; never auto-select profiles, infer condition control or invent age-based ceilings.

- Studio copy uses aliviaDifferentials.ts IDs; never imply duplicate entry.
- Manual assessment and record share diagnosis.clinicalImpression; sync saved updates and regenerate only on request to avoid duplicate credits.
- Record paired sections share a row; preserve forms/shortcuts.
- Language selection is explicit; LanguageContext follows i18next languageChanged after bundle loading for form/navigation parity.
- Pain charts/comparisons share chronological data; never invent regional scores from global averages.
- HEP metrics share hepLoad.ts across panel/microcycle.
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
- Read nested AGENTS.md before edits; Studio and patient-evolution rules live there.
- Patient links use ClinicBrandHeader/scoped clinicAssessmentTheme, including WelcomeStep. PDFs share section renderers, resolveAssessmentBranding and per-document applyPdfBranding; preserve warnings and clinic isolation.
- HEP programs persist clinic_id at creation; public branding resolves only through the valid program token, never by guessing a clinic from the professional.
- HEP writes use can_manage_hep for programs and items: solo requires the author's active PRO subscription; clinic requires active clinical actor/author membership in the stored clinic and an active/trial clinic, never a separate PRO subscription or another clinic's membership.
- Clinic-scoped clinical access (HEP, own appointments, session notes, photos/files edits, own notes) uses is_clinic_clinician/can_manage_hep: active clinical membership in an active/trial clinic replaces a personal PRO subscription; new pro-only policies must add this clinic path.

- Prevention is explicit via purpose helper: preserve symptoms, historical sites, null unmeasured pain and safety. Painless catalogs use manualQuestionnaireSelection, not blanket recommendations; altered instruments are not validated.
- Spine logic stays in `spineBiomechanics.ts`; `spinePresentation.ts` shares screen/PDF geometry and dated exams to preserve history.
- Imports use service-only write/undo journals to restore merges and reject later edits atomically. ZIP omits source IDs/privileges; local XML parsing rejects DTD/entities and bounds complexity, preserving fields for review.

- Combined imports use per-column deterministic planning, server revalidation, actor-scoped idempotent chunks for undo/recovery; source codes never confer authority.
- Agenda recurrence inserts rows via appointmentRecurrence.ts with series_id/recurrence_rule; preserve reports/occupancy and completed sessions.
- Insights tab renders only through the category registry in `InsightsTab.tsx` (one category + role visibility per entry); financial/quality metrics are pure functions in `managementMetrics.ts` over scoped rows, so new insights stay organized and testable without AI.
- Read `src/components/dashboard/insights/AGENTS.md` for RPC rules.
- Assessment-to-agenda conversion uses `get_assessment_agenda_conversion` in both care scopes, counting first completed assessments and treatment appointments within 7 days of the assessment by email or linked assessment, never names; `get_assessment_unscheduled_list` names those without a 7-day appointment. This prevents reassessment inflation and false conversions across profiles.
- Insight list dismissals (STEPS phase, reassessment due, conversion unscheduled) live in `public.insight_dismissals` keyed by user + insight_key + scope_key + patient_key via `useInsightDismissals`; owner/admin dismissals set scope_wide and hide for the whole clinic team, others hide for the viewer only, and restoreAll clears what the viewer may delete.
- Clinic management insights (revenue goal, team stats, concentration, benchmark, conversion funnel) render only for clinic owner/admin (`canManage` on InsightsTab); secretaries keep clinical cards plus occupancy and reactivation, and the PRO solo sees his own management cards.
- Financial insights resolve prices via `care_services` (clinic/solo catalog, per-session or monthly); monthly fees dilute across that patient's realized sessions of the service in the month (`buildPriceResolver`), default session price is the fallback, and booking picks the service (`professional_appointments.service_id`). `recordCompliance` treats past unclassified slots without a note as pendencies (never 'on time') and returns a null rate when nothing was evaluated.

- Adherence links readiness by scoped patient ID (patient:<id> without email) over a 14-day window; frequency uses elapsed month-to-date days; financial drilldowns reuse the totals' scoped appointments and price resolver.
- Appointment requests use scoped RPCs/push; approval creates the slot only in Agenda (solo PRO, clinic owner/admin/secretary). Resolve service names from the same scoped catalog, including inactive entries; show the requested service in the card/dialog and preselect its saved ID.
- AppointmentRequestsPanel shares the arrival-ordered queue across clinic and solo Agenda; measure the first visible rows for its internal scroll viewport so variable content does not expand the page or hide controls.
- Announcements use scoped server lists, can_handle_appointment_request and server-resolved push recipients.
- Agenda uses latestRequest to reject stale results. ClinicServicesCard lives only in the manager-visible `care-services` registry entry in Insights → Operação, not Patients/Team, to keep home uncluttered; explicit professional scope isolates solo services.
- Clinics use idempotent `_shared/clinicProvisioning.ts` for webhook/self-heal; `clinicAdminGroups` separates paid/free/trial, preserving status.

- AI: server/FIFO, fixed clinic pools, service-only fulfillment, distinct errors; ai_credit_admin_roles rollout, empty tiers block none. Store/checkout share catalog; webhook checks current/legacy price ID + amount. Admin: São Paulo today/24h; authorized assessment joins.
- Academic revocation preserves absent CREFITO only on inactive, unapproved updates with access off; inserts/activation remain validated. Toggles keep list membership until explicit removal and reload saved state.
- Edge functions verify callers via `_shared/caller-auth.ts`: requireUser/requireAdmin for dashboard AI, requireUserOrAssessment (recent anonymous assessment id) for patient links, isInternalCall (x-internal-secret) for cron jobs, safeOrigin for payment return URLs; never trust request-supplied recipients or text for notifications.
- Studio feed calendar: arts saved with the "Feed principal" preset are linked in `studio_feed_calendar`; dates/order come only from pure `placeFeed` in `feedPlan.ts` (pillar rotation, Mon/Wed/Fri, videos as extras), so the HD PNG stays the gallery original.
- Permission-denied feedback is global via `permissionErrors.ts` (fetch watcher on data/storage/functions, never auth): 403/42501 shows an explicit "profile lacks authority" toast so call sites need no per-screen handling.
- Clinic agenda: only owner/admin/secretary create, move or delete clinic slots (RLS + guard trigger); clinicians update only status/notes of their own slots, so the front desk keeps control of the grid.
- Never-paid clinic trials: daily job calls re-validating `purge_expired_clinic_trial` (stages in `_shared/clinicTrialRetention.ts`); delete SET NULL dependents explicitly to avoid solo-scope leaks.
- Guided cancellation serves PRO and clinics with one `_shared/cancellationPolicy.ts`.
- Clinic report identity: clinic_members + self/owner/admin RPCs; issuer uses their signature, no council or owner fallback, independent of subscription.
- Landings share CreditsSufficiency: practical examples, not quotas or unlimited claims.

- Basic quota: service-only ledger, email transaction lock, survives deletion; diagnosis needs reserved ID; anonymous read/write needs x-assessment-id within 48h.
- Photos: preparePhoto, record/Studio size, transparency/fallback; exclude signatures/PDFs/measurements. Vision: economical-vision zero-retention chat; clinical/measurement models unchanged.
- Blog: preserve bodies/URLs; BlogDashboardReturn sends signed-in users to /dashboard.
- PRO 7-day trial: professionals.pro_trial_ends_at (service-only, synced from Stripe trialing) makes get_user_credit_status cap included at 5 with no margin and always block, independent of the credit rollout flag; pro-end-trial ends the trial early with an immediate charge.
