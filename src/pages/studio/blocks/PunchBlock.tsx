import { motion } from "framer-motion";
import punchHand from "@/assets/punch-hand.png";
import { BRAND_HANDLE, BRAND_LOGO, BRAND_NAME } from "../brand";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";
import { learnedSpot } from "../artMoveLearning";

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
  if (words.length > 9) return null;
  const short = clean;
  if (short.length > 64 || short.length < 6) return null;
  return short;
};

/**
 * MÃO EM PINÇA — foto original da referência (recorte com fundo transparente).
 *
 * Não é desenho: é a própria fotografia em close, em escala de cinza, entrando
 * pela borda esquerda com o vão da pinça à direita. Proporção original
 * 1055 × 783, usada para ancorar a frase minúscula exatamente no vão.
 */
const HAND_RATIO = 1055 / 783;

/** Centro do vão da pinça medido no alfa da foto (x 0,75–0,88 / y 0,21–0,31). */
const GAP_CENTER_X = 0.86;
const GAP_CENTER_Y = 0.26;

/**
 * Chave de aprendizado: quando o dono arrasta a frase e fixa a posição, o
 * Studio guarda o centro dela em fração da caixa da mão e passa a nascer ali.
 */
const LEARN_KEY = "punch.phrase";



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

  /*
   * Ponto de partida da frase segurada: o vão medido na foto OU, se o dono já
   * arrastou e fixou a posição alguma vez, o ponto aprendido dele.
   */
  const nudge = learnedSpot(LEARN_KEY) ?? { x: 0, y: 0 };
  const gap = {
    /* Espelhado, o vão fica do outro lado; a correção aprendida continua no
       mesmo sentido do arraste (direita é direita nas duas versões). */
    x: (mirrored ? 1 - GAP_CENTER_X : GAP_CENTER_X) + nudge.x,
    y: GAP_CENTER_Y + nudge.y,
  };

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
        {/* ALTO: a foto da mão em close segurando a frase pequena. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`relative flex flex-1 items-center ${mirrored ? "justify-end" : "justify-start"}`}
        >
          {/*
           * A mão ocupa 84% da largura: a faixa restante é o espaço de leitura
           * da frase minúscula, que sai do vão da pinça sem nunca ser cortada.
           */}
          <div
            data-studio-learn-frame={LEARN_KEY}
            className="relative w-[84%]"
            style={{ aspectRatio: HAND_RATIO }}
          >
            <img
              src={punchHand}
              alt="Mão em close fazendo o gesto de pinça, como se segurasse a frase"
              className={`absolute inset-0 h-full w-full object-contain ${
                mirrored ? "scale-x-[-1]" : ""
              }`}
              style={{
                filter: dark || primary ? "grayscale(1) invert(1)" : "grayscale(1)",
                opacity: primary ? 0.92 : 1,
              }}
            />

            {/*
             * A FRASE SEGURADA: posição OBRIGATÓRIA, medida no canal alfa da
             * própria foto. O vão da pinça vai de x 0,75–0,88 e y 0,21–0,31 da
             * imagem; o texto nasce na boca do vão (x 0,775) e fica centrado
             * na vertical do vão (y 0,26), espelhando quando a mão espelha.
             */}
            <div
              data-studio-learn-anchor="1"
              className="absolute w-[42%] text-left"
              style={{
                left: `${gap.x * 100}%`,
                top: `${gap.y * 100}%`,
                transform: "translate(-50%, -50%)",
                textAlign: mirrored ? "right" : "left",
              }}
            >
              <p
                data-studio-learn={LEARN_KEY}
                className="text-[8px] font-medium leading-tight md:text-[11px]"
                style={{ color: ink }}
              >
                {punch}
              </p>
              {note ? (
                <p className="mt-1 text-[7px] leading-tight md:text-[9px]" style={{ color: soft }}>
                  {note}
                </p>
              ) : null}
            </div>
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

        {/* PÉ: assinatura discreta da marca (o modelo já assina — ver flag). */}
        <div data-studio-own-lockup="1" className="mt-[6%] flex flex-col items-center gap-1.5">

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
