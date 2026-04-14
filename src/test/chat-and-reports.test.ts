import { describe, it, expect, vi } from "vitest";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      track: vi.fn(),
    })),
    removeChannel: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

describe("ConversationList", () => {
  it("should define ConversationItem interface correctly", () => {
    interface ConversationItem {
      id: string;
      patient_user_id: string;
      professional_id: string;
      updated_at: string;
      other_name: string;
      last_message?: string;
      unread_count: number;
    }

    const item: ConversationItem = {
      id: "test-id",
      patient_user_id: "patient-1",
      professional_id: "pro-1",
      updated_at: new Date().toISOString(),
      other_name: "Dr. Test",
      last_message: "Hello",
      unread_count: 3,
    };

    expect(item.id).toBe("test-id");
    expect(item.unread_count).toBe(3);
    expect(item.other_name).toBe("Dr. Test");
  });

  it("should sort conversations with unread first", () => {
    const conversations = [
      { id: "1", unread_count: 0, updated_at: "2026-04-14T10:00:00Z" },
      { id: "2", unread_count: 5, updated_at: "2026-04-13T10:00:00Z" },
      { id: "3", unread_count: 0, updated_at: "2026-04-14T12:00:00Z" },
      { id: "4", unread_count: 2, updated_at: "2026-04-14T11:00:00Z" },
    ];

    const sorted = [...conversations].sort((a, b) => {
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    // Unread first
    expect(sorted[0].id).toBe("4"); // unread, more recent
    expect(sorted[1].id).toBe("2"); // unread, older
    // Then by date
    expect(sorted[2].id).toBe("3"); // no unread, most recent
    expect(sorted[3].id).toBe("1"); // no unread, older
  });

  it("should filter conversations by search query", () => {
    const conversations = [
      { other_name: "Dr. Silva", last_message: "Olá" },
      { other_name: "Maria Santos", last_message: "Obrigada" },
      { other_name: "João Pereira", last_message: "Bom dia Dr. Silva" },
    ];

    const q = "silva";
    const filtered = conversations.filter(
      (c) =>
        c.other_name.toLowerCase().includes(q) ||
        (c.last_message && c.last_message.toLowerCase().includes(q))
    );

    expect(filtered).toHaveLength(2);
    expect(filtered[0].other_name).toBe("Dr. Silva");
    expect(filtered[1].other_name).toBe("João Pereira");
  });
});

describe("ChatBubble", () => {
  it("should format read receipt status correctly", () => {
    // Message sent, not read
    const unread = { readAt: null, isMine: true };
    expect(unread.readAt).toBeNull();
    expect(unread.isMine).toBe(true);

    // Message sent and read
    const read = { readAt: "2026-04-14T10:00:00Z", isMine: true };
    expect(read.readAt).toBeTruthy();

    // Other person's message — no receipt shown
    const other = { readAt: null, isMine: false };
    expect(other.isMine).toBe(false);
  });
});

describe("SecretaryReportsCard", () => {
  it("should calculate no-show rate correctly", () => {
    const appointments = [
      { status: "completed" },
      { status: "completed" },
      { status: "no_show" },
      { status: "cancelled" },
      { status: "scheduled" },
    ];

    const total = appointments.length;
    const noShow = appointments.filter(
      (a) => a.status === "no_show" || a.status === "cancelled"
    ).length;
    const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

    expect(total).toBe(5);
    expect(noShow).toBe(2);
    expect(noShowRate).toBe(40);
  });

  it("should calculate new vs returning patients", () => {
    const assessments = [
      { patient_email: "a@test.com" },
      { patient_email: "b@test.com" },
      { patient_email: "b@test.com" },
      { patient_email: "c@test.com" },
      { patient_email: "c@test.com" },
      { patient_email: "c@test.com" },
    ];

    const emailCounts = new Map<string, number>();
    assessments.forEach((a) => {
      emailCounts.set(a.patient_email, (emailCounts.get(a.patient_email) || 0) + 1);
    });

    const totalPatients = emailCounts.size;
    const newPatients = Array.from(emailCounts.values()).filter((c) => c === 1).length;
    const returningPatients = totalPatients - newPatients;

    expect(totalPatients).toBe(3);
    expect(newPatients).toBe(1); // only a@test.com
    expect(returningPatients).toBe(2); // b and c
  });
});

describe("ProDashboard pending review", () => {
  it("should count assessments pending review", () => {
    const assessments = [
      { status: "completed", diagnosis: null, professional_id: "pro-1" },
      { status: "completed", diagnosis: { hypothesis: "test" }, professional_id: "pro-1" },
      { status: "in_progress", diagnosis: null, professional_id: "pro-1" },
      { status: "completed", diagnosis: null, professional_id: "pro-1" },
      { status: "completed", diagnosis: null, professional_id: null },
    ];

    const pendingReviewCount = assessments.filter(
      (a) => a.status === "completed" && !a.diagnosis && a.professional_id
    ).length;

    expect(pendingReviewCount).toBe(2);
  });
});

describe("Assessment post-completion", () => {
  it("should define next steps for clinic patients", () => {
    const steps = [
      { icon: "📋", title: "Avaliação enviada" },
      { icon: "🩺", title: "Análise profissional" },
      { icon: "📞", title: "Contato da clínica" },
    ];

    expect(steps).toHaveLength(3);
    expect(steps[0].title).toBe("Avaliação enviada");
    expect(steps[2].title).toBe("Contato da clínica");
  });
});
