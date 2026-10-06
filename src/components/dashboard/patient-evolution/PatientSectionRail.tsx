import { useCallback, useEffect, useRef, useState } from "react";
import { List, X } from "lucide-react";
import { PATIENT_SECTIONS } from "./patientSections";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Props {
  /** Nível de risco de saúde geral, para colorir o atalho correspondente. */
  riskLevel?: "none" | "managed" | "attention" | null;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Trilha lateral discreta de atalhos para as seções do prontuário.
 * Recolhida mostra apenas ícones; expande no hover (desktop) ou clique/tap.
 * Só lista seções que realmente existem no DOM para o paciente aberto.
 */
const PatientSectionRail = ({ riskLevel }: Props) => {
  const { language } = useLanguage();
  const lang = (["pt", "en", "es"].includes(language) ? language : "pt") as "pt" | "en" | "es";
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Descobre quais seções existem (o prontuário renderiza blocos condicionalmente).
  useEffect(() => {
    let raf = 0;
    const scan = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const ids = PATIENT_SECTIONS.filter((s) => {
          const el = document.getElementById(s.id);
          // Wrappers de seções condicionais existem mas ficam vazios (altura 0).
          if (!el || el.offsetHeight <= 8) return false;
          // Seções que existem mas ainda não têm dado clínico se marcam sozinhas.
          return el.dataset.railHide !== "true";
        }).map((s) => s.id);


        setPresentIds((prev) => (prev.length === ids.length && prev.every((v, i) => v === ids[i]) ? prev : ids));
      });
    };
    scan();
    const obs = new MutationObserver(scan);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Seção ativa conforme o scroll.
  useEffect(() => {
    if (presentIds.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    presentIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [presentIds]);

  // Fecha ao clicar fora / Escape.
  useEffect(() => {
    if (!expanded && !mobileOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, mobileOpen]);

  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start", inline: "nearest" });
    setActiveId(id);
    setMobileOpen(false);
    setExpanded(false);
    // Notas de sessão: além de rolar, abre o formulário de nova nota (mesmo
    // comportamento do botão "Registrar evolução" do cabeçalho do prontuário).
    if (id === "sec-notas-sessao") {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("alivia:open-session-note"));
      }, 400);
    }
  }, []);

  if (presentIds.length < 3) return null;

  const sections = PATIENT_SECTIONS.filter((s) => presentIds.includes(s.id));

  const riskClass = (id: string) => {
    if (id !== "saude-geral") return "";
    if (riskLevel === "attention") return "text-destructive";
    if (riskLevel === "managed") return "text-amber-600";
    return "";
  };

  const renderItem = (s: (typeof PATIENT_SECTIONS)[number], showLabel: boolean) => {
    const Icon = s.icon;
    const active = activeId === s.id;
    return (
      <li key={s.id}>
        <button
          type="button"
          onClick={() => goTo(s.id)}
          title={showLabel ? undefined : s.label[lang]}
          aria-current={active ? "true" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            riskClass(s.id),
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {showLabel && <span className="truncate text-xs font-medium">{s.label[lang]}</span>}
        </button>
      </li>
    );
  };

  return (
    <div ref={containerRef}>
      {/* Desktop: trilha fixa colapsável */}
      <nav
        aria-label={lang === "pt" ? "Atalhos do prontuário" : lang === "es" ? "Atajos del expediente" : "Record shortcuts"}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "fixed left-2 top-1/2 z-40 hidden -translate-y-1/2 rounded-2xl border border-border/60 bg-background/85 p-1.5 shadow-lg backdrop-blur transition-all duration-200 lg:block",
          expanded ? "w-56" : "w-[52px]",
        )}
      >
        <ul className="flex max-h-[76vh] flex-col gap-0.5 overflow-y-auto">
          {sections.map((s) => renderItem(s, expanded))}
        </ul>
      </nav>

      {/* Mobile: aba vertical estreita colada na margem */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={lang === "pt" ? "Atalhos do prontuário" : lang === "es" ? "Atajos del expediente" : "Record shortcuts"}
        className="fixed left-0 top-1/2 z-40 flex h-20 w-[18px] -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border/50 bg-primary/15 text-primary/80 shadow-sm backdrop-blur transition-colors hover:bg-primary/25 active:bg-primary/30 lg:hidden"
      >
        {mobileOpen ? <X className="h-3 w-3" /> : <List className="h-3 w-3" />}
      </button>

      {mobileOpen && (

        <nav
          aria-label={lang === "pt" ? "Atalhos do prontuário" : lang === "es" ? "Atajos del expediente" : "Record shortcuts"}
          className="fixed left-2 top-1/2 z-40 w-56 -translate-y-1/2 rounded-2xl border border-border/60 bg-background/95 p-1.5 shadow-xl backdrop-blur lg:hidden animate-scale-in"
        >
          <ul className="flex max-h-[70vh] flex-col gap-0.5 overflow-y-auto">
            {sections.map((s) => renderItem(s, true))}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default PatientSectionRail;
