// Pure helpers to match names read from schedule screenshots to existing patients.

export const normalizeName = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NICKNAMES: Record<string, string[]> = {
  rafa: ["rafael", "rafaela"], gabi: ["gabriela", "gabriel"], gabe: ["gabriel"],
  bia: ["beatriz"], fe: ["fernanda", "felipe"], fer: ["fernanda", "fernando"],
  lu: ["luana", "luciana", "lucas", "luiza", "luisa"], dani: ["daniela", "daniel"],
  juju: ["juliana", "julia"], ju: ["juliana", "julia"], carol: ["carolina", "caroline"],
  manu: ["manuela", "emanuel", "emanuelle"], gui: ["guilherme"], leo: ["leonardo", "leandro"],
  edu: ["eduardo"], rodrigo: [], ze: ["jose"], chico: ["francisco"], kiko: ["francisco"],
  tati: ["tatiana"], paty: ["patricia"], pati: ["patricia"], nanda: ["fernanda"],
  duda: ["maria eduarda", "eduarda"], cris: ["cristina", "cristiane", "cristiano"],
  alê: ["alexandre", "alessandra"], ale: ["alexandre", "alessandra", "alexandra"],
  vini: ["vinicius"], thi: ["thiago"], ti: ["tiago", "thiago"], mari: ["mariana", "marina"],
  nati: ["natalia"], vivi: ["viviane"], rê: ["renata"], re: ["renata", "renato"],
};

const firstNameMatches = (a: string, b: string) => {
  if (a === b) return true;
  if (NICKNAMES[a]?.includes(b) || NICKNAMES[b]?.includes(a)) return true;
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.length >= 3 && l.startsWith(s);
};

/** Score 0..1 of similarity between a read name and a patient name. */
export const nameScore = (read: string, patient: string): number => {
  const a = normalizeName(read).split(" ").filter(Boolean);
  const b = normalizeName(patient).split(" ").filter(Boolean);
  if (!a.length || !b.length) return 0;
  if (a.join(" ") === b.join(" ")) return 1;
  const first = firstNameMatches(a[0], b[0]);
  if (!first) return 0;
  if (a.length === 1 || b.length === 1) return 0.5;
  const restB = b.slice(1);
  const surnameHit = a.slice(1).some((t) => t.length >= 2 && restB.some((r) => r === t || (t.length >= 4 && r.startsWith(t))));
  return surnameHit ? 0.9 : 0.2;
};

export interface MatchCandidate { id: string; full_name: string }

export const findBestPatient = <T extends MatchCandidate>(read: string, patients: T[]): T | null => {
  let best: T | null = null;
  let bestScore = 0;
  for (const p of patients) {
    const s = nameScore(read, p.full_name);
    if (s > bestScore) { best = p; bestScore = s; }
  }
  return bestScore >= 0.9 ? best : null;
};

const COMMITMENT_WORDS = [
  "reuniao", "almoco", "jantar", "bloqueio", "bloqueado", "curso", "aula", "pessoal",
  "compromisso", "intervalo", "pausa", "folga", "ferias", "feriado", "evento", "palestra",
  "congresso", "medico", "dentista", "academia", "treino meu", "particular", "lembrete",
  "equipe", "meeting", "lunch", "break", "livre", "indisponivel", "viagem", "banco",
];

export const looksLikeCommitment = (name: string): boolean => {
  const n = normalizeName(name);
  if (!n) return true;
  return COMMITMENT_WORDS.some((w) => n === w || n.startsWith(w + " ") || n.includes(" " + w + " ") || n.endsWith(" " + w));
};
