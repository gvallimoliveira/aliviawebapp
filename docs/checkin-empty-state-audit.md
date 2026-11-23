# Patient check-in empty-state sweep

## Rule
An authenticated account without a linked patient must remain usable. Optional patient features return an empty state, not `no_patient` as a runtime failure. A missing or revoked explicitly requested resource remains an error; authentication and access rules stay unchanged.

## Inventory and findings

| Place | Code read in this sweep | Finding | Verification |
|---|---|---|---|
| Personal dashboard, My Health and Today | `src/pages/Dashboard.tsx` (both check-in mounts and personal tabs); `src/components/dashboard/PatientCheckinCard.tsx`; `src/hooks/usePatientCare.ts`; `src/lib/patientNavigation.ts` | Follows rule after the deployed fix. Unlinked users stay in My Health; linked users use Today; absent token hides the optional check-in. | Affected signed-in account on desktop and 440×667 mobile; linked branch read and component tests, not a live linked account. |
| Check-in identity lookup | `supabase/functions/periodization-checkin/index.ts` authenticated `my_link`; `myLink.ts` | Previously returned 404 for an ordinary unlinked account. Now 200 `{ token: null }`, no writes; real lookup/creation failures remain 500. | Live 200/null, prior 401 check preserved; eight helper tests. |
| Exercises on personal dashboard | `src/components/dashboard/ExerciseChecklist.tsx` | Empty programs hide the checklist and avoid item/completion queries. | Dashboard and active-program RPC live; code read. |
| Appointments, request form and service selection | `src/components/dashboard/PatientAppointmentsTab.tsx` | Empty providers display the linking requirement and disable requests; service lookup runs only with a selected provider. | Live desktop/mobile empty state and six lookup calls. Creation not executed. |
| Messages, new-conversation contacts and clinic shortcut | `src/components/dashboard/MessagesTab.tsx`; `src/components/chat/ConversationList.tsx` (contacts, initial list, empty rendering) | Empty clinics/contacts/conversations remain normal empty lists; no attempt to create a conversation without a selected valid contact. | Messages tab live desktop/mobile; contact RPC live; new-conversation logic read. |
| Notices | `src/components/dashboard/PatientNoticesTab.tsx` | Empty notices display a normal message; no read receipts are written for an empty list. | Live desktop/mobile. |
| Care-team assessment shortcut | `src/components/dashboard/LinkedPatientAssessment.tsx` | No providers hides the official shortcut; independent assessment stays separate. | Code read. |
| PRO/clinic First Steps and patient picker | `src/components/onboarding/GettingStarted.tsx`; `src/lib/gettingStartedData.ts` | Zero counts remain valid; missing patients route to registration or display an empty picker. Query errors remain distinct. | Code read and existing milestone/data tests. No new PRO/clinic live session in this sweep. |
| PRO/clinic load control, history and refresh | `LoadMonitoringGate.tsx`, `PeriodizationSection.tsx`, `LoadHistoryDialog.tsx` in `src/components/dashboard/periodization`; `src/lib/loadMonitoringData.ts`; `src/lib/periodizationData.ts` plan/session/check-in/link readers | No optional record/plan produces disabled or empty state; missing explicitly identified record remains an error. Refresh/realtime skip unresolved patient IDs. | Code read and load-monitoring tests. No activation or clinical writes. |
| Public patient/coach check-in and submission | `src/pages/PeriodizationCheckin.tsx`; public token guard, load, check-in, sRPE, planning and batch planning branches of `supabase/functions/periodization-checkin/index.ts` | A valid token is required. Missing/deactivated links must not become successful empty submissions. Optional plans, targets and previous responses accept null/empty data. | Invalid link renders a readable error page live. Valid linked submission not executed. |
| Patient/coach print and workout import; professional monitor and functional-test print readers | `CardioPrintReader.tsx`, `ExternalWorkoutImport.tsx` in `src/components/periodization`; `ProfessionalCardioEntry.tsx`, `CardioFunctionalTestsCard.tsx` in `src/components/dashboard/periodization`; corresponding function branches | Require an existing token or selected patient; absent requested resources are genuine failures, not the optional dashboard lookup. | Code read only; no AI/image calls. |
| Public HEP | `src/pages/ExerciseProgram.tsx`; database function `get_exercise_program_by_token` | Invalid token returns null and renders Program not found; empty items are an array. | Invalid HEP link live. |
| Agent-generated HEP | `supabase/functions/agent-generate-hep/index.ts` patient/thread checks | Requires an explicitly selected existing patient/thread; `patient_not_found` is correctly not converted to success. | Code read only; no generation. |
| PhysioTech optional patient and check-in | `supabase/functions/physiotech-sso/index.ts` issue/check-in paths | No optional patient yields patient null; no readiness yields check-in null. An inaccessible explicitly selected patient remains forbidden. | Code read only; no external ticket or write. |
| Scheduled reminders and delivery | `supabase/functions/push-cron/index.ts`; `send-follow-up/index.ts`; `send-push-notification/index.ts`; `notify-user/index.ts`; `periodization-checkin/index.ts` `maybeAlert` | Empty work queues and missing optional clinic/recipient/device results are skipped or return zero/null. Alerts require existing patient context and skip absent recipients. None call `my_link`. | Code read only; jobs not run to avoid notifications or financial side effects. |

## Database functions read from the live database

- `get_my_care_providers`, `get_my_active_exercise_programs`, `get_my_announcements`, `get_my_assessments`, `get_patient_professionals`, `get_provider_services`: follow the rule through empty result sets; all six returned HTTP 200 and `[]` for the affected signed-in account.
- `get_exercise_program_by_token`: no matching program returns null, invalid public HEP page verified.
- `get_patient_assessment_link_context`: missing scoped token returns zero rows, not an exception; definition read.
- `create_appointment_request`, `create_appointment_request_v2`: require a linked provider and valid requested data. Their errors are correct for explicit writes and must remain enforced; definitions read, not invoked.

## Outcome

No additional violation of this specific rule found in the inspected related paths; no additional behavior, permissions, settings, settled records or example data changed. The original check-in correction is deployed.

61 existing regression tests passed. Affected account: health → appointments → messages → notices passed on desktop and mobile, with no unexpected failing requests or JavaScript errors. Screenshots inspected for empty appointments/notices and invalid public links. Remaining unverified: live linked-patient submission, notification jobs/delivery, external PhysioTech round trip, AI-based import/generation and physical-device checks. Code review is not claimed as live execution.