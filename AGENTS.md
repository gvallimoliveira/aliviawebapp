# Architecture decisions

- AgentMessageInput autosizes mobile drafts within the visible viewport; empty fields collapse to preserve chat space, without changing other textareas.

- Cardiovascular views use `usePatientBirthDate` to refresh demographics after patient record edits and on refocus; age-dependent estimates must not remain stale or reset unsaved session inputs.

- Aliv.iA/Studio copy uses canonical `aliviaDifferentials.ts` IDs; handoff copy must not duplicate features or imply duplicate entry.
- Manual assessment and record share diagnosis.clinicalImpression; sync saved updates and regenerate only on request to avoid duplicate credits.
- Patient record paired sections use the shared native horizontal row; this preserves form behavior and lets section shortcuts reveal horizontally hidden content.
- Patient regional pain charts and comparisons share one chronological data helper; explicit regional measurements must never be replaced by an invented regional score from a multi-region global average.
- HEP load metrics (volume, intensity, weekly sets per region, planned dose) are computed only by the shared `hepLoad.ts` helper; one deterministic source keeps the HEP panel and the microcycle dose consistent.
- Professional session writes (plain sRPE or heart-rate monitor data) go only through `saveProfessionalSession` in `periodizationData.ts`, which merges with the patient check-in of the same date/track and links the planned session; one row per session keeps ACWR and dose free of double counting. TRIMP/sRPE math lives only in `cardioLoad.ts`.
- "Today" in load control is always the local/Brazil calendar date (`localISODate` client-side, America/Sao_Paulo in the check-in function), never `toISOString()`; UTC rolls to tomorrow after 21h in Brazil.
- Planned-vs-perceived dose compares only sessions dated up to local today that have an sRPE (`adherenceByTrack`); unanswered past and upcoming sessions are listed separately and never count as underdose, and dose never triggers push alerts. Patient sRPE accepts today and the 7 previous days, enforced server-side.
- Weekly dose display derives full-week targets and recorded-to-date totals separately from answered-session adherence, with answered/scheduled counts per track; this preserves partial comparison and chart semantics without turning future or unanswered work into underdose.
- Load-control front views show text lists for the last 3 days (grouped by day) and charts for the last 7 rolling days via `loadWindows.ts`, falling back to the most recent days with data; full history is fetched on demand in `LoadHistoryDialog` and never deleted. Risk math (acute/chronic/ACWR, auto plan) ignores these display windows.
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
- Patient links use ClinicBrandHeader and scoped clinicAssessmentTheme; ClinicAssessment also passes branding to WelcomeStep. PDFs (including standalone measurements) share section renderers, resolveAssessmentBranding and per-document applyPdfBranding; preserve warning colors and clinic isolation.
- HEP programs persist clinic_id at creation; public branding resolves only through the valid program token, never by guessing a clinic from the professional.

- Preventive assessments are explicit opt-in via the shared purpose helper; preserve symptomatic defaults, store historical sites separately and unmeasured pain as null, and keep safety and professional-selected questionnaires.
- Spine biomechanics (Maigne star + Fryette 3-position palpation) is interpreted only by pure `spineBiomechanics.ts`; Fryette badges apply to thoracic/lumbar only and only when palpation and star agree, keeping record, AI and reports consistent.
