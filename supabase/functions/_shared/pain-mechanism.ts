// Passo D4 — leitura compartilhada do mecanismo de dor (Kosek 2021 / Finnerup 2016)
// pelo Agente de Raciocínio Clínico e pelo gerador de HEP.
// Só descreve o que a triagem produziu; nunca inventa mecanismo.

export type StoredMechanism = Record<string, any>;

const VALID = ["nociceptive", "neuropathic", "nociplastic", "mixed"];

/** Aceita o jsonb de `assessments.pain_mechanism` (ou equivalente) e devolve
 *  o objeto quando ele tem um mecanismo válido; caso contrário, null. */
export function resolveStoredMechanism(raw: unknown): StoredMechanism | null {
  if (!raw || typeof raw !== "object") return null;
  const m = String((raw as any).mechanism ?? "");
  if (!VALID.includes(m)) return null;
  return raw as StoredMechanism;
}

const MECH_PT: Record<string, string> = {
  nociceptive: "nociceptiva",
  neuropathic: "neuropática",
  nociplastic: "nociplástica",
  mixed: "mista",
};

/** Resumo compacto para injetar em contextos JSON (prompt do agente). */
export function mechanismSummary(raw: unknown, extent?: number | null) {
  const m = resolveStoredMechanism(raw);
  if (!m) return null;
  return {
    predominante: MECH_PT[String(m.mechanism)] || m.mechanism,
    secundario: m.secondary ? (MECH_PT[String(m.secondary)] || m.secondary) : null,
    subtipo: m.subtype || null,
    eixo: m.axis || null,
    sensibilizacao_central: !!m.central_sensitization_likely,
    confianca: m.confidence || null,
    csi: typeof m.csi_score === "number" ? m.csi_score : null,
    extensao_dor_pct: typeof extent === "number" ? extent : (typeof m.pain_extent === "number" ? m.pain_extent : null),
    fonte: m.source || null,
  };
}

/** Bloco de texto em pt-BR com o resultado da triagem, para prompts. */
export function mechanismContextBlock(raw: unknown, extent?: number | null): string {
  const s = mechanismSummary(raw, extent);
  if (!s) return "";
  return `MECANISMO DE DOR (triagem registrada na avaliação — Kosek 2021 / Finnerup 2016):
- Predominante: ${s.predominante}${s.secundario ? ` | Secundário: ${s.secundario}` : ""}
- Subtipo clínico: ${s.subtipo || "não especificado"} | Eixo: ${s.eixo || "indefinido"}
- Sensibilização central provável: ${s.sensibilizacao_central ? "SIM" : "não"}${s.csi !== null ? ` (CSI ${s.csi})` : ""}
- Confiança da triagem: ${s.confianca || "baixa"}${s.extensao_dor_pct !== null ? `\n- Extensão da dor: ~${s.extensao_dor_pct}% da superfície corporal` : ""}`;
}

/** Regras de dosagem/seleção de exercício por mecanismo, para o HEP. */
export function mechanismHepRules(raw: unknown, extent?: number | null): string {
  const m = resolveStoredMechanism(raw);
  if (!m) return "";
  const mech = String(m.mechanism);
  const central = !!m.central_sensitization_likely;

  const byMech: Record<string, string> = {
    nociceptive: `- Dor NOCICEPTIVA: carga progressiva é o motor do programa. Dose por repetições/carga, guardrail de dor ≤ 3/10 durante e sem piora além de 24h. Isometrias em amplitude indolor quando muito irritável; progrida para isotônico e depois para exercício mais exigente conforme tolerância.`,
    neuropathic: `- Dor NEUROPÁTICA: priorize exercícios de deslizamento neural (sliders) ANTES de tensores; nunca prescreva exercícios que reproduzam tensão neural sustentada ou parestesia crescente. Progressão mais lenta, amplitudes submáximas, e preferência por posições que centralizem/aliviem sintoma irradiado. Observação deve dizer explicitamente: parar se surgir formigamento/choque que aumente.`,
    nociplastic: `- Dor NOCIPLÁSTICA: dose por TEMPO e por consistência, NUNCA por dor. Exposição gradual com cargas baixas e volume previsível; evite testar limites e evite exercícios provocativos ou de alta demanda percebida no início. Inclua movimentos globais, aeróbio leve e respiração/relaxamento. Observações devem tranquilizar (dor durante não significa dano).`,
    mixed: `- Dor MISTA: o teto de intensidade é definido pelo componente MAIS IRRITÁVEL. Combine carga progressiva (componente nociceptivo) com dose por tempo e linguagem de segurança (componente nociplástico) e com cuidados neurodinâmicos se houver componente neuropático.`,
  };

  return `
PROTOCOLO POR MECANISMO DE DOR (obrigatório quando este bloco existe):
${byMech[mech] || ""}
${central ? "- Sensibilização central provável: reduza o número de exercícios (5-7), evite dor provocada acima de 3/10, priorize regularidade e sono/ritmo, e escreva observações educativas e acolhedoras." : ""}
${typeof extent === "number" && extent >= 15 ? "- Dor difusa/extensa: prefira exercícios globais e de baixa complexidade em vez de muitos exercícios locais." : ""}
- Nas observações de cada exercício, deixe claro o cuidado ligado ao mecanismo (guardrail de dor, sinal neural, dose por tempo).`.trim();
}
