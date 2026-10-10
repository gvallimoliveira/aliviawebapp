import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMessageInput } from "@/components/agent/AgentMessageInput";

afterEach(() => vi.unstubAllGlobals());

function setup(mobile: boolean) {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
}

describe("Agent mobile composer", () => {
  it("expands drafts, keeps them expanded on blur and collapses when cleared", () => {
    setup(true);
    const { rerender } = render(<AgentMessageInput aria-label="Mensagem" value="" readOnly />);
    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(field.style.height).toBe("44px");
    Object.defineProperty(field, "scrollHeight", { configurable: true, value: 180 });
    rerender(<AgentMessageInput aria-label="Mensagem" value="Texto longo" readOnly />);
    expect(field.style.height).toBe("182px");
    fireEvent.blur(field);
    expect(field.style.height).toBe("182px");
    Object.defineProperty(field, "scrollHeight", { configurable: true, value: 800 });
    rerender(<AgentMessageInput aria-label="Mensagem" value="Texto muito longo" readOnly />);
    expect(field.style.height).toBe("240px");
    expect(field.style.overflowY).toBe("auto");
    rerender(<AgentMessageInput aria-label="Mensagem" value="" readOnly />);
    expect(field.style.height).toBe("44px");
  });

  it("leaves desktop sizing unchanged", () => {
    setup(false);
    render(<AgentMessageInput aria-label="Desktop" value="Texto" readOnly />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).style.height).toBe("");
  });
});