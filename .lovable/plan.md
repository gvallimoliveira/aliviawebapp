# Smart Insights — Refinements

Three improvements to the Insights tab (clinic + pro modes).

## 1. Collapsible cards

Wrap each insight card (Churn, Discharge, Adherence, Benchmark, Occupancy, Revenue) in a `Collapsible` with a chevron toggle in the header. Persist open/closed state per-card in `localStorage` (key `insights:collapsed:<cardId>`). Default: all expanded on first load.

## 2. Info popovers + per-metric customization

Add an `Info` (lowercase `i`) icon button to the top-right of each of these card headers:
- **ChurnRiskCard**
- **DischargePredictionCard**
- **PatientAdherenceCard**

Clicking opens a `Popover` (or `Dialog` on mobile) that contains:
- **How it's calculated** — plain-language explanation of the formula and weights.
- **Customize** — editable thresholds saved per-user in a new table `insight_preferences`.

Configurable parameters per card:

**Churn Risk**
- No-show count threshold (default 2)
- Days of silence threshold (default 14)
- Pain stagnation window in weeks (default 3)
- Minimum score to display (default 50)

**Discharge Prediction**
- Minimum sessions before predicting (default 3)
- Pain drop threshold per session (default 0.3)
- "Close to discharge" threshold (default ≤3 sessions)

**Patient Adherence**
- Weight sliders for exercises / diary / attendance / messages (must sum to 100; auto-rebalance)
- Lookback window (default 30 days)

Changes are applied client-side immediately by re-fetching the RPC with new params, OR (when the RPC doesn't accept them) by post-filtering/re-weighting results client-side. For weights on Adherence, we'll recompute the composite score in the component using returned sub-metrics — no DB change needed. For thresholds, we'll filter results client-side.

## 3. Benchmark by clinic size

`BenchmarkCard` already shows the user's current size bucket vs peers. Extend it to show **three side-by-side columns**:
- Small (1–3 therapists)
- Medium (4–10)
- Large (11+)

Highlight the column matching the logged-in clinic with a ring/border. For each metric, render the peer average per bucket so the user sees how each size class performs. The user's own value is rendered as a single row at top, with deltas vs each bucket.

Update the `get_clinic_benchmarks` RPC to also return peer averages for all three buckets (not just the user's bucket). If peer_count per bucket < 5, show "—" with a lock icon for that bucket only.

## Technical Summary

**Files to edit (frontend only for #1, #2):**
- `src/components/dashboard/insights/InsightsTab.tsx` — no change unless we lift collapse state.
- `src/components/dashboard/insights/ChurnRiskCard.tsx` — add Collapsible wrapper, Info popover, customize form, client-side filtering.
- `src/components/dashboard/insights/DischargePredictionCard.tsx` — same pattern.
- `src/components/dashboard/insights/PatientAdherenceCard.tsx` — same + recompute score with custom weights.
- `src/components/dashboard/insights/BenchmarkCard.tsx` — three-column layout with bucket highlight.
- `src/components/dashboard/insights/OccupancyVsNoShowCard.tsx` and `RevenueGoalCard.tsx` — Collapsible wrapper only.
- New shared helper `src/components/dashboard/insights/InsightInfoButton.tsx` for the (i) button + popover shell.
- New helper `src/components/dashboard/insights/useInsightPreferences.ts` — localStorage-backed hook for thresholds/weights.

**Migration (for #3):**
- Update `public.get_clinic_benchmarks(_clinic_id uuid)` to return per-metric peer averages for `small`, `medium`, `large` buckets.

Preferences stored in localStorage (per-user) for now — fast to ship and reversible. If you'd prefer them synced across devices, I can add an `insight_preferences` table later.

## Out of scope
- Server-side persistence of customization (using localStorage).
- Editing OccupancyVsNoShow / RevenueGoal logic — only adding collapse.
