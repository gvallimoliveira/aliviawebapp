import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { pickPhotoForTopics } from "../photoMeaning";
import PhotoFrame from "./PhotoFrame";
import { BRAND_HANDLE } from "../brand";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";

/**
 * DADO PERCENTUAL (referência estilística: percentual gigantesco no topo, frase
 * curta explicando a quem aquilo dói, ilustração/foto ao centro, seta redonda
 * de "arrasta" e um selo de perfil ao pé)
 *
 * O número não está ali para exibir estatística: ele nomeia, em um segundo, um
 * problema que o público reconhece como o dele. Por isso o percentual sai do
 * acervo real da marca — nenhum dado é inventado pelo motor. Sem percentual
 * declarado no kit, a arte não é gerada (é o que impede número falso).
 *
 * Tratamentos: 0 papel claro, 1 fundo profundo, 2 chapa primária, 3 papel claro
 * com foto do acervo em cartão.
 */

/** Percentuais reais declarados no acervo da marca (stats e métricas). */
const percentsOf = (content: BlockProps["content"]) => {
  const out: { value: string; label: string; note?: string }[] = [];
  content.stats.forEach((set) =>
    set.items.forEach((item) => {
      if (/%/.test(item.value)) out.push({ value: item.value, label: item.label, note: item.note });
    }),
  );
  content.metrics.forEach((set) =>
    set.forEach((m) => {
      if (m.suffix?.includes("%")) out.push({ value: `${m.prefix ?? ""}${m.value}%`, label: m.label });
    }),
  );
  return out;
};

const PercentBlock = ({ content, rng, treatment, format, picker, photos }: BlockProps) => {
  const options = percentsOf(content);
  if (options.length === 0) return null;
  const data = rng.pick(options);

  const [feature] = picker.pick(content.features, 1, rng, (f) => [f.topic]);
  const photo = treatment === 3 ? pickPhotoForTopics(photos, rng.int(5), [feature.topic]) : undefined;

  const dark = treatment === 1;
  const primary = treatment === 2;
  const bg = dark ? "hsl(var(--foreground))" : primary ? "hsl(var(--primary))" : "hsl(var(--background))";
  const ink = dark || primary ? "hsl(var(--background))" : "hsl(var(--foreground))";
  const numberInk = dark || primary ? "hsl(var(--accent))" : "hsl(var(--primary))";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden`}
      style={{ backgroundColor: bg }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(70% 55% at 82% 14%, ${numberInk.replace(")", " / 0.08)")} 0%, transparent 72%)`,
        }}
      />

      <div className={`container relative flex h-full flex-col justify-center ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start"
          style={{ color: ink }}
        >
          <span
            className="block font-extrabold tracking-[-0.03em]"
            style={{ fontSize: "clamp(3.4rem, 20vw, 9rem)", lineHeight: 0.86, color: numberInk }}
          >
            {data.value}
          </span>

          <h2
            className="mt-4 max-w-[24ch] font-bold tracking-tight"
            style={{ fontSize: "clamp(1.1rem, 5.2vw, 2.3rem)", lineHeight: 1.14 }}
          >
            {data.label}
          </h2>

          {data.note && (
            <p className="mt-4 max-w-[38ch] text-xs leading-relaxed md:text-sm" style={{ opacity: 0.78 }}>
              {data.note}
            </p>
          )}

          {photo && (
            <div className="mt-7 w-full" data-studio-fit-visual="1">
              <PhotoFrame photo={photo} className="h-40 w-full rounded-2xl md:h-56" />
            </div>
          )}
        </motion.div>

        <div className="mt-8 flex items-center justify-between gap-4" style={{ color: ink }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ opacity: 0.78 }}>
            {BRAND_HANDLE}
          </p>
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full md:h-14 md:w-14"
            style={{ backgroundColor: numberInk }}
          >
            <ArrowRight
              className="h-5 w-5 md:h-6 md:w-6"
              style={{ color: dark || primary ? "hsl(var(--foreground))" : "hsl(var(--primary-foreground))" }}
            />
          </span>
        </div>
      </div>
    </section>
  );
};

export default PercentBlock;
