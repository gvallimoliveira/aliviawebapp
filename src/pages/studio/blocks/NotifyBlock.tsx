import { motion } from "framer-motion";
import { sectionHeight, type BlockProps } from "./shared";
import { BRAND_NAME } from "../brand";

/**
 * PILHA DE NOTIFICAÇÕES (referência: cards de "New Client" flutuando sobre o
 * celular na mesa)
 *
 * Leitura da referência: a prova social não é dita, é MOSTRADA — o telefone
 * apitando é o resultado do trabalho. Aqui as notificações simulam o app da
 * marca: cada card é um evento do nicho (nova avaliação, nova mensagem, novo
 * paciente...), derivado do acervo editorial, nunca inventado fora da marca.
 *
 * Tratamentos: 0 mesa clara · 1 mesa noturna · 2 fundo da marca · 3 celular
 * em perspectiva com pilha mais alta.
 */
const SKINS = [
  { bg: "bg-muted", card: "bg-card", ink: "text-foreground", sub: "text-muted-foreground", desk: "bg-foreground/10" },
  { bg: "bg-foreground", card: "bg-card", ink: "text-foreground", sub: "text-muted-foreground", desk: "bg-background/10" },
  { bg: "bg-primary/10", card: "bg-card", ink: "text-foreground", sub: "text-muted-foreground", desk: "bg-primary/15" },
  { bg: "bg-accent/50", card: "bg-card", ink: "text-foreground", sub: "text-muted-foreground", desk: "bg-foreground/10" },
] as const;

/** Condensa a linha para caber no card sem reticências e sem perder o sentido. */
const short = (text: string, max = 58) => condensePhrase(text, max) || text;


const NotifyBlock = ({ content, rng, picker, treatment, format }: BlockProps) => {
  const skin = SKINS[treatment % SKINS.length];
  const tall = treatment % SKINS.length === 3;

  /**
   * Eventos do app: o "título" é o gatilho do nicho (tag da funcionalidade) e o
   * corpo é a linha curta que aquela funcionalidade entrega. Passa pelo picker
   * para respeitar a cobertura editorial.
   */
  const events = picker
    .pick(content.features, tall ? 5 : 4, rng, (f) => [f.topic])
    .map((f) => ({ title: f.tag, body: short(f.description || f.title) }));


  return (
    <section
      className={`relative flex ${sectionHeight(format)} flex-col items-center justify-end overflow-hidden px-6 pb-6 pt-14 ${skin.bg}`}
    >
      {/* Mesa: faixa de superfície na base, só ambiente. */}
      <div aria-hidden className={`absolute inset-x-0 bottom-0 h-1/3 ${skin.desk}`} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-md flex-1 flex-col justify-end pb-20"
      >
        <p
          className={`mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.3em] ${
            treatment % SKINS.length === 1 ? "text-background/80" : "text-foreground/70"
          }`}
        >
          {rng.pick(content.kickers)}
        </p>

        <div className="space-y-2.5">
          {events.map((event, i) => (
            <motion.div
              key={`${event.title}-${i}`}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] }}
              className={`flex items-start gap-3 rounded-[22px] px-4 py-3.5 shadow-[0_18px_38px_-24px_hsl(var(--foreground)/0.65)] ${skin.card}`}
              style={{ marginInline: `${Math.min(i, 3) * 3}% ${Math.min(i, 3) * 1}%` }}
            >
              {/* Ícone do app: quadrado arredondado com a inicial da marca. */}
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-primary text-sm font-black text-primary-foreground">
                {BRAND_NAME.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm font-bold ${skin.ink}`}>{event.title}</span>
                  <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-widest ${skin.sub}`}>
                    agora
                  </span>
                </span>
                <span className={`mt-0.5 block text-[13px] leading-snug ${skin.sub}`}>{event.body}</span>
              </span>
            </motion.div>
          ))}
        </div>

        {/* Celular deitado, em perspectiva discreta, ancorando a pilha. */}
        <div
          aria-hidden
          className="mx-auto mt-6 h-16 w-3/4 rounded-[22px] border border-foreground/15 bg-foreground/80 shadow-[0_24px_40px_-26px_hsl(var(--foreground)/0.8)]"
          style={{ transform: "perspective(700px) rotateX(62deg)" }}
        />
      </motion.div>
    </section>
  );
};

export default NotifyBlock;
