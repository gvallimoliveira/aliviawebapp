import { useLayoutEffect, useRef } from "react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";

export function AgentMessageInput(props: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    const resize = () => {
      if (!mobile.matches) {
        field.style.removeProperty("height");
        field.style.removeProperty("max-height");
        field.style.removeProperty("overflow-y");
        return;
      }
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const limit = Math.max(88, Math.min(240, Math.floor(viewportHeight * 0.4)));
      field.style.maxHeight = `${limit}px`;
      field.style.height = "0px";
      const contentHeight = field.value.length ? Math.max(88, field.scrollHeight + 2) : 44;
      field.style.height = `${Math.min(limit, contentHeight)}px`;
      field.style.overflowY = contentHeight > limit ? "auto" : "hidden";
    };
    resize();
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth === width) return;
      width = field.clientWidth;
      resize();
    });
    observer.observe(field);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    mobile.addEventListener("change", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      mobile.removeEventListener("change", resize);
    };
  }, [props.value]);

  return <Textarea {...props} ref={ref} />;
}