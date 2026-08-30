import { motion } from "framer-motion";
import { BRAND_HANDLE, BRAND_LOGO, BRAND_NAME } from "../brand";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";

/**
 * "É SÓ DAR ZOOM" — MÃO SEGURANDO O TEXTO (referência do usuário)
 *
 * A arte é uma provocação de leitura: uma MÃO GRANDE em close (preto e branco,
 * fundo limpo) faz o gesto de pinça e "segura" uma frase curta escrita em
 * corpo MINÚSCULO no vão entre o indicador e o polegar. Embaixo, em letras
 * enormes, a chamada que instiga a aproximar a tela ("É só dar zoom") — é ela
 * que faz o público parar e ampliar a imagem para ler o que a mão segura.
 *
 * Elementos obrigatórios do modelo (não simplificar):
 * 1. mão em close, grande, ocupando o alto da arte, em escala de cinza;
 * 2. frase curta em fonte pequena exatamente no vão da pinça;
 * 3. chamada gigante embaixo convidando ao zoom;
 * 4. assinatura da marca (logo + @) centralizada no pé.
 *
 * Tratamentos: 0 fundo claro, 1 fundo escuro (mão clara), 2 chapa da cor
 * primária, 3 fundo claro com a mão espelhada (entrando pela direita).
 */

/** Chamadas que instigam o zoom — o corpo gigante da arte. */
const ZOOM_CALLS = [
  "É só dar zoom",
  "Dá um zoom",
  "Chega mais perto",
  "Aproxima a tela",
  "Zoom aqui",
];

/** Frase de impacto: corta na primeira pontuação e limita o comprimento. */
const punchOf = (raw: string): string | null => {
  const first = raw.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  const clean = first.replace(/[.]+$/, "").trim();
  if (!clean) return null;
  const words = clean.split(/\s+/);
  const short = words.length > 9 ? words.slice(0, 9).join(" ") : clean;
  if (short.length > 64 || short.length < 6) return null;
  return short;
};

/**
 * MÃO EM PINÇA (desenho vetorial, sem depender do acervo de fotos)
 *
 * Antebraço + palma entrando pela borda, indicador por cima e polegar por
 * baixo, deixando um VÃO à direita — é nesse vão que a frase é "segurada".
 * Textura de veias/vincos em traço fino dá o peso de foto em close.
 */
const PinchHand = ({ tone, edge }: { tone: string; edge: string }) => (
  <svg viewBox="0 0 100 74" className="h-full w-full" preserveAspectRatio="xMinYMid meet" aria-hidden>
    <defs>
      <linearGradient id="punchSkin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={tone} stopOpacity="0.95" />
        <stop offset="55%" stopColor={tone} stopOpacity="0.78" />
        <stop offset="100%" stopColor={tone} stopOpacity="0.92" />
      </linearGradient>
    </defs>

    {/* Antebraço + palma entrando pela borda esquerda */}
    <path
      d="M-6,74 C4,68 12,62 20,54 C28,46 38,40 48,39 C58,38 66,43 66,50 C66,58 58,63 48,64 C36,65 24,70 16,74 Z"
      fill="url(#punchSkin)"
    />
    {/* Dedos dobrados (nós da mão) — volume de close, como na referência */}
    <path d="M46,40 C52,35 60,36 62,42 C63,47 57,49 52,47 Z" fill="url(#punchSkin)" />
    <path d="M52,46 C58,44 64,46 65,51 C65,56 59,57 54,55 Z" fill="url(#punchSkin)" />
    {/* Indicador (por cima) — ponta apontando para o vão */}
    <path
      d="M42,40 C48,31 58,25 70,24 C78,23 80,28 74,31 C66,35 58,40 53,46 C49,50 43,47 42,40 Z"
      fill="url(#punchSkin)"
    />
    {/* Polegar (por baixo) — ponta apontando para o vão */}
    <path
      d="M50,55 C58,57 68,61 75,65 C80,68 77,72 71,71 C61,69 52,65 46,61 C43,59 46,54 50,55 Z"
      fill="url(#punchSkin)"
    />
    {/* Vincos e veias: traço fino, dá textura de close fotográfico */}
    <g stroke={edge} strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.5">
      <path d="M4,72 C14,66 22,60 30,52" />
      <path d="M10,74 C20,69 28,63 36,56" />
      <path d="M46,42 C52,36 60,30 68,27" />
      <path d="M52,58 C60,60 68,63 74,67" />
      <path d="M30,56 C36,53 42,51 48,50" />
      <path d="M47,41 C51,38 56,38 59,41" />
      <path d="M53,47 C57,45 61,46 63,49" />
    </g>
    {/* Pulseira fina no punho, como na referência */}
    <path d="M18,60 C21,65 22,70 21,74" stroke={edge} strokeWidth="1.1" fill="none" strokeLinecap="round" />
  </svg>
);

const PunchBlock = ({ content, rng, treatment, format }: BlockProps) => {
  /* Acervo de frases candidatas: headline, fala curta e fecho. */
  const candidates = [
    ...content.headlines.map((h) => `${h.strong} ${h.rest}`),
    ...(content.quotes ?? []).map((q) => q.text),
    ...content.closings.map((c) => c.title),
  ];
  const punches = candidates.map(punchOf).filter((t): t is string => Boolean(t));
  if (punches.length === 0) return null;
  const punch = rng.pick(punches);
  const call = rng.pick(ZOOM_CALLS);

  /* Linha de condição/CTA logo abaixo da frase segurada — também minúscula. */
  const note = rng.pick([
    ...(content.sales?.offers ?? []),
    ...content.closings.map((c) => c.cta),
  ]);

  const dark = treatment === 1;
  const primary = treatment === 2;
  const mirrored = treatment === 3;

  const ink = dark
    ? "hsl(var(--background))"
    : primary
      ? "hsl(var(--primary-foreground))"
      : "hsl(var(--foreground))";
  const soft = dark
    ? "hsl(var(--background) / 0.7)"
    : primary
      ? "hsl(var(--primary-foreground) / 0.75)"
      : "hsl(var(--foreground) / 0.62)";
  const stage = dark
    ? "hsl(var(--foreground))"
    : primary
      ? "hsl(var(--primary))"
      : "hsl(var(--background))";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center justify-center overflow-hidden`}
      style={{ backgroundColor: stage }}
    >
      <div className={`container relative flex h-full flex-col ${blockPadding(format)}`}>
        {/* ALTO: a mão grande em close segurando a frase pequena. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex-1"
        >
          <div className={`absolute inset-0 ${mirrored ? "scale-x-[-1]" : ""}`}>
            <PinchHand tone={ink} edge={stage} />
          </div>

          {/*
           * A FRASE SEGURADA: fica no vão da pinça (≈ 78% da largura, meio da
           * altura da mão). Fonte deliberadamente pequena — é o que faz o
           * público dar zoom. Alinhada ao lado oposto quando a mão é espelhada.
           */}
          <div
            className={`absolute top-[58%] w-[22%] -translate-y-1/2 ${
              mirrored ? "right-[78%] text-right" : "left-[78%] text-left"
            }`}
          >
            <p className="text-[8px] font-medium leading-tight md:text-[11px]" style={{ color: ink }}>
              {punch}
            </p>
            {note ? (
              <p className="mt-1 text-[7px] leading-tight md:text-[9px]" style={{ color: soft }}>
                {note}
              </p>
            ) : null}
          </div>
        </motion.div>

        {/* BAIXO: a chamada gigante que instiga o zoom. */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[4%] break-words text-center text-4xl font-black leading-[0.98] tracking-tight [overflow-wrap:anywhere] md:text-6xl"
          style={{ color: ink }}
        >
          {call}
        </motion.h2>

        {/* PÉ: assinatura discreta da marca. */}
        <div className="mt-[6%] flex flex-col items-center gap-1.5">
          {BRAND_LOGO ? (
            <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-8 w-8 object-contain md:h-10 md:w-10" />
          ) : null}
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.28em] md:text-[11px]"
            style={{ color: soft }}
          >
            {BRAND_HANDLE || BRAND_NAME}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PunchBlock;
