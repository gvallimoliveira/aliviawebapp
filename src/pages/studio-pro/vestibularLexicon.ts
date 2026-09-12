/**
 * LÉXICO VESTIBULAR (tontura)
 *
 * Vocabulário pedido pelo dono do produto (set/2026) e a relação real entre os
 * termos, para as artes de tontura deixarem de repetir "tontura e vertigem":
 *
 *   labirintite → nome popular que virou guarda-chuva de qualquer tontura;
 *   VPPB → causa mais comum de vertigem de posição;
 *   cristais (otocônias) → partículas que saem do lugar e caem nos canais;
 *   canais semicirculares → onde os cristais passam a gerar o giro;
 *   avaliação de VPPB → testes de posição que dizem SE é e QUAL canal;
 *   manobras posicionais corretivas → reposicionam os cristais depois disso.
 *
 * Regras de escrita respeitadas aqui: nada de promessa de cura, nada de
 * autonomia da IA, nada de "protocolo", frases curtas (arte tem pouco espaço) e
 * escolha determinística — mesma marca/público, mesmo texto, zero crédito de IA.
 */
import { createRng } from "@/pages/studio/rng";

export const VESTIBULAR_MATCH = /vestibular|tontur|vertig|labirintit|otoc[oô]ni|vppb|cristais|canal\s+semicircular|canais\s+semicirculares|equil[ií]brio corporal/i;

export const matchesVestibular = (probe?: string) => Boolean(probe && VESTIBULAR_MATCH.test(probe));

/** Termo → explicação em linguagem de leigo (usada nas artes de informar). */
export const VESTIBULAR_TERMS: { term: string; plain: string }[] = [
  { term: "Labirintite", plain: "é o apelido popular: virou nome para toda tontura, e quase nunca é o que está acontecendo." },
  { term: "VPPB", plain: "é a causa mais comum da vertigem que aparece ao virar na cama ou olhar para cima." },
  { term: "Cristais (otocônias)", plain: "são partículas do ouvido interno que saem do lugar e passam a enviar sinal errado." },
  { term: "Canais semicirculares", plain: "são os corredores do equilíbrio: quando um cristal entra ali, o mundo parece girar." },
  { term: "Avaliação de VPPB", plain: "são testes de posição que mostram se é VPPB e qual canal está envolvido." },
  { term: "Manobras posicionais corretivas", plain: "são movimentos guiados que levam os cristais de volta ao lugar certo." },
];

const HEADLINES: { strong: string; rest: string }[] = [
  { strong: "Nem toda tontura é labirintite", rest: ". Boa parte é cristal fora de lugar." },
  { strong: "O giro ao virar na cama", rest: " tem nome: VPPB." },
  { strong: "Cristais do ouvido interno", rest: " no canal errado — e o mundo gira." },
  { strong: "Antes da manobra", rest: ", vem a avaliação de VPPB." },
  { strong: "Existe teste para isso", rest: ": a avaliação diz qual canal está envolvido." },
  { strong: "Tontura tem endereço", rest: ": canais semicirculares, cristais, posição." },
];

const SUBS: string[] = [
  "As otocônias saem do lugar e caem nos canais semicirculares: é isso que faz o giro aparecer ao mudar de posição.",
  "A avaliação de VPPB identifica o canal envolvido; só depois entram as manobras posicionais corretivas.",
  "Chamar tudo de labirintite atrasa o cuidado. Um sinal claro é a vertigem que começa ao virar na cama.",
  "As manobras posicionais corretivas não são exercício de força: são movimentos guiados para reposicionar os cristais.",
  "A investigação começa pela pergunta certa: o giro aparece na posição ou o desequilíbrio é constante?",
];

const QUOTES: string[] = [
  "“Nem toda tontura é labirintite: muitas vezes é um cristal no canal errado.”",
  "“A avaliação de VPPB vem antes da manobra — ela mostra qual canal responder.”",
];

const CTAS: string[] = [
  "Investigar a minha tontura",
  "Quero avaliar se é VPPB",
];

const pickMany = <T,>(pool: T[], seed: string, count: number) => {
  const rng = createRng(`vestibular:${seed}`);
  const rest = [...pool];
  const out: T[] = [];
  while (rest.length && out.length < count) out.push(...rest.splice(rng.int(rest.length), 1));
  return out;
};

/** Linhas prontas para o público de tontura, escolhidas pela semente do lote. */
export const vestibularLines = (seed: string) => ({
  headlines: pickMany(HEADLINES, `h:${seed}`, 3),
  subs: pickMany(SUBS, `s:${seed}`, 3),
  quotes: pickMany(QUOTES, `q:${seed}`, 2).map((text) => ({ text })),
  ctas: pickMany(CTAS, `c:${seed}`, 2),
  glossary: pickMany(VESTIBULAR_TERMS, `g:${seed}`, 3).map((row) => `${row.term}: ${row.plain}`),
});
