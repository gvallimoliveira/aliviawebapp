import type { FeedbackRow } from "./feedbackMetrics";
import { areaScores } from "./feedbackMetrics";

export const feedbackClinicianKey = (row: FeedbackRow): string =>
  row.clinician_member_id ? `member:${row.clinician_member_id}` : row.professional_id ? `legacy:${row.professional_id}` : "unassigned";

export const filterFeedbackClinician = (rows: FeedbackRow[], key: string): FeedbackRow[] =>
  key === "all" ? rows : rows.filter((row) => feedbackClinicianKey(row) === key);

export const feedbackLink = (origin: string, clinicId: string, service: string, memberId: string): string => {
  const params = new URLSearchParams();
  if (service !== "all") params.set("service", service);
  if (memberId !== "all") params.set("member_id", memberId);
  const query = params.toString();
  return `${origin}/feedback/clinic/${clinicId}${query ? `?${query}` : ""}`;
};

export const feedbackByClinician = (rows: FeedbackRow[]) => {
  const groups = new Map<string, FeedbackRow[]>();
  rows.forEach((row) => {
    const key = feedbackClinicianKey(row);
    if (key === "unassigned") return;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return [...groups.entries()].map(([key, list]) => ({
    key, responses: list.length,
    items: areaScores(list).find((area) => area.area === "professional")?.items ?? [],
  }));
};