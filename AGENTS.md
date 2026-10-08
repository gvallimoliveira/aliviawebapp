# Architecture decisions

- Cardiovascular views use `usePatientBirthDate` to refresh demographics after patient record edits and on refocus; age-dependent estimates must not remain stale or reset unsaved session inputs.

- Periodization buttons use type="button"; they sit inside patient-record forms.


- Aliv.iA solution ecosystems must reference the canonical differential IDs in `aliviaDifferentials.ts`; one source prevents feature copy and product promises from drifting.
- Aliv.iA landing-page messages must feed Studio through the canonical differential repertoire, never through new UI controls; this keeps audience promises synchronized without crowding creation settings.
- Patient record paired sections use the shared native horizontal row; this preserves form behavior and lets section shortcuts reveal horizontally hidden content.
- Patient regional pain charts and comparisons share one chronological data helper; explicit regional measurements must never be replaced by an invented regional score from a multi-region global average.- HEP load metrics (volume, intensity, weekly sets per region, planned dose) are computed only by the shared `hepLoad.ts` helper; one deterministic source keeps the HEP panel and the microcycle dose consistent.
- Professional session writes (plain sRPE or heart-rate monitor data) go only through `saveProfessionalSession` in `periodizationData.ts`, which merges with the patient check-in of the same date/track and links the planned session; one row per session keeps ACWR and dose free of double counting. TRIMP/sRPE math lives only in `cardioLoad.ts`.
- "Today" in load control is always the local/Brazil calendar date (`localISODate` client-side, America/Sao_Paulo in the check-in function), never `toISOString()`; UTC rolls to tomorrow after 21h in Brazil.
- Planned-vs-perceived dose compares only sessions dated up to local today that have an sRPE (`adherenceByTrack`); unanswered past and upcoming sessions are listed separately and never count as underdose, and dose never triggers push alerts. Patient sRPE accepts today and the 7 previous days, enforced server-side.
- Weekly dose display derives full-week targets and recorded-to-date totals separately from answered-session adherence, with answered/scheduled counts per track; this preserves partial comparison and chart semantics without turning future or unanswered work into underdose.
- Microcycle planned sessions from today or the previous 7 days open a pre-filled monitored-session dialog on click (MicroWeekGrid → saveProfessionalSession); future sessions stay read-only and the trash action must stopPropagation.
- Load-control front views show text lists for the last 3 days (grouped by day) and charts for the last 7 rolling days via `loadWindows.ts`, falling back to the most recent days with data; full history is fetched on demand in `LoadHistoryDialog` and never deleted. Risk math (acute/chronic/ACWR, auto plan) ignores these display windows.
- Patient record content insets by the fixed `PatientSectionRail` width; avoids covered titles.
- Cardiovascular analysis (session metrics, weekly goals, intensity distribution, trends, readings) and both cardiovascular PDF reports derive only from the pure rule-based `cardioAnalysis.ts`; one deterministic source keeps panel, technical report and patient report consistent without AI credits.
- Cardio analysis mounts only inside `CardioAnalysisDialog`; keeps the record light.
- Dashboard/clinic data effects depend on `user?.id`, never the `user` object; token refresh on app return must not reset open screens.
- Recovery decisions (load matrix, day adjustment, load card) use `recoverySignal` in `periodization.ts`: check-in readiness is the universal base and morning resting HR, when fresh with baseline, takes priority (most conservative wins); patients often skip morning HR.
- Load control has one session-entry path (monitored-session block + microcycle shortcut); the load card is read-only plus manual check-in, and cardio analysis appears only when HR data exists.
- Load-control "Conduta do dia" derives only from `dailyConduct.ts` (safety → recovery → yesterday/effort coherence → ACWR trend); one deterministic priority order keeps the top recommendation consistent and works with a single check-in.
