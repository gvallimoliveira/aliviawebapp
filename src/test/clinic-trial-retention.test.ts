import { describe, expect, it } from "vitest";
import { trialRetentionStage, trialPurgeDate } from "../../supabase/functions/_shared/clinicTrialRetention";

const DAY = 86_400_000;
const start = Date.UTC(2026, 0, 1, 12);

describe("clinic trial retention", () => {
  it("reminds on the 14th trial day", () => expect(trialRetentionStage(start, start + 13 * DAY + 1000)).toBe("reminder_day14"));
  it("warns when the 15-day trial ends", () => expect(trialRetentionStage(start, start + 15 * DAY + 1000)).toBe("ended"));
  it("keeps data during the 7-day grace", () => expect(trialRetentionStage(start, start + 21 * DAY + 1000)).toBeNull());
  it("purges 7 days after the trial ends", () => expect(trialRetentionStage(start, start + 22 * DAY + 1000)).toBe("purge"));
  it("purge date is trial start + 22 days", () => expect(trialPurgeDate(start).getTime()).toBe(start + 22 * DAY));
});
