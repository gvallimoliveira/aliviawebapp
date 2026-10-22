# Architecture decisions
- Record-summary alerts preserve assessment-specific dismissal audits across history; health caveats reuse healthHistory formatting and Saúde geral recency (latest day, manual precedence) without new risk calculations or AI.
- Clinic demos scope fixtures by viewer; local load adapters reuse real math, never live writes/AI. Load scenarios bind to the displayed latest assessment, including safety; unmatched IDs stay empty.

- AgentMessageInput autosizes mobile drafts; empty fields collapse, other textareas stay unchanged.

- Cardiovascular views refresh demographics via `usePatientBirthDate` after edits/refocus; keep estimates fresh and unsaved inputs intact.
- Cardiovascular ceiling reminders combine the record's assessments and ID/email-linked dated health records via `usePatientCardioHealth`; structured conditions never auto-select a clinician profile, infer control, or fabricate an age-based ceiling.

- Aliv.iA/Studio copy uses canonical `aliviaDifferentials.ts` IDs; handoff copy must not duplicate features or imply duplicate entry.
- Manual assessment and record share diagnosis.clinicalImpression; sync saved updates and regenerate only on request to avoid duplicate credits.
- Patient record paired sections use the shared native horizontal row; this preserves form behavior and lets section shortcuts reveal horizontally hidden content.
- Patient regional pain charts and comparisons share one chronological data helper; explicit regional measurements must never be replaced by an invented regional score from a multi-region global average.
- HEP dose metrics use only `hepLoad.ts` to keep the panel and microcycle consistent.
- Professional sessions use only `saveProfessionalSession` in `periodizationData.ts`: merge same-date/track check-ins and link plans to avoid duplicate load. TRIMP/sRPE math stays in `cardioLoad.ts`.
- "Today" in load control is always the local/Brazil calendar date (`localISODate` client-side, America/Sao_Paulo in the check-in function), never `toISOString()`; UTC rolls to tomorrow after 21h in Brazil.
- Dose adherence (`adherenceByTrack`) counts only sessions up to local today with sRPE; unanswered/upcoming never count as underdose nor push alerts. Patient sRPE: today + 7 prior days, server-enforced.
- Weekly dose display derives full-week targets and recorded-to-date totals separately from answered-session adherence, with answered/scheduled counts per track; this preserves partial comparison and chart semantics without turning future or unanswered work into underdose.
- Load-control views use `loadWindows.ts` (3-day lists, 7-day charts, fallback to latest data); full history on demand in `LoadHistoryDialog`, never deleted; risk math ignores display windows.
- Patient record content insets by the fixed `PatientSectionRail` width; avoids covered titles.
- Cardiovascular metrics, goals, distributions, trends, readings and both PDFs derive only from pure `cardioAnalysis.ts`; keep panel and reports consistent without AI credits.
- Athlete/active PDF priorities and descriptive summaries use `cardioReportSections` in `cardioAnalysis.ts`; WHO remains secondary and presentation changes never alter load or safety calculations.
- Cardiovascular educational copy is shared through `cardioEducation.ts` by the information dialog and PDFs; profile references must remain distinct from universal safety limits and unmeasured respiratory targets.
- Dashboard/clinic data effects depend on `user?.id`, never the `user` object; token refresh on app return must not reset open screens.
- Recovery decisions (load matrix, day adjustment, load card) use `recoverySignal` in `periodization.ts`: check-in readiness is the universal base and morning resting HR, when fresh with baseline, takes priority (most conservative wins); patients often skip morning HR.
- Load control has one session-entry path (monitored-session block + microcycle shortcut); the load card is read-only plus manual check-in, and cardio analysis appears only when HR data exists.
- Load-control "Conduta do dia" derives only from `dailyConduct.ts` (safety → recovery → yesterday/effort coherence → ACWR trend); one deterministic priority order keeps the top recommendation consistent and works with a single check-in.
- Cardiorespiratory functional tests (TSL 1-min, TC6M, TD6M) are interpreted only by the pure `cardioFunctionalTests.ts`; deterministic rules keep the record, sheet and future reports consistent without AI credits.
- Subdirectories may have their own AGENTS.md; read it before changing files there.
- Patient links use ClinicBrandHeader/scoped clinicAssessmentTheme, including WelcomeStep. PDFs share section renderers, resolveAssessmentBranding and per-document applyPdfBranding; preserve warnings and clinic isolation.
- HEP programs persist clinic_id at creation; public branding resolves only through the valid program token, never by guessing a clinic from the professional.

- Preventive assessments are explicit opt-in via the shared purpose helper; preserve symptomatic defaults, store historical sites separately and unmeasured pain as null, and keep safety and professional-selected questionnaires.
- Spine logic stays in `spineBiomechanics.ts`; `spinePresentation.ts` shares screen/PDF geometry and dated exams to preserve history.
- Imports use service-only write/undo journals to restore merges and reject later edits atomically. ZIP omits source IDs/privileges; local XML parsing rejects DTD/entities and bounds complexity, preserving fields for review.

- Combined imports use the isolated deterministic planner, explicit per-column disposition and server revalidation; bounded idempotent chunks are correlated by actor-scoped operation UUIDs for recovery and whole-set undo. Source codes are metadata, never authority; email-only evolution readers require genuine emails until an additive linkage migration is implemented.
