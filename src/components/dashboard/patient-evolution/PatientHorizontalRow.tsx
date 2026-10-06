import { Children, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

/** Native horizontal navigation keeps forms and clinical cards intact. */
export default function PatientHorizontalRow({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const items = Children.toArray(children).filter(Boolean);
  const move = (direction: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  if (!items.length) return null;
  return (
    <section aria-label={label} className="min-w-0">
      <div ref={ref} data-patient-horizontal-row className="flex items-start gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-2 [scrollbar-width:thin]">
        {items.map((item, index) => <div key={index} data-patient-horizontal-item className={items.length === 1 ? "min-w-0 w-full shrink-0" : "min-w-0 w-[90%] shrink-0 snap-start md:w-[calc(50%-0.5rem)]"}>{item}</div>)}
      </div>
      {items.length > 1 && <div className="flex justify-end gap-1 md:hidden">
        <Button variant="ghost" size="icon" className="h-7 w-7" title={language === "pt" ? "Anterior" : language === "es" ? "Anterior" : "Previous"} onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title={language === "pt" ? "Próximo" : language === "es" ? "Siguiente" : "Next"} onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>}
    </section>
  );
}