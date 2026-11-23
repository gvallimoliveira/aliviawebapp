// Feature flags for gradual rollout of new features
// Set to true to enable the feature in the UI

export const ENABLE_VIDEO_CALL = true;

// Retained for rollback; first steps replace the automatic guided tour.
export const ENABLE_GUIDED_TOUR = false;

// Clinical reasoning AI agent. Liberado para profissionais, estudantes e clínicas.
// VIP users always bypass this flag (see useClinicalAgentAccess hook).
export const ENABLE_CLINICAL_AGENT = true;

// Assinatura "Chat do Agente" (R$ 14,90/mês, 150 msgs).
// Mantido oculto enquanto não há bloqueio/limite real do chat em vigor —
// expor a venda antes disso gera dúvida ("estou pagando pelo quê?").
// Virar true no mesmo deploy em que o enforcement do chat for ligado.
export const ENABLE_CHAT_ADDON = false;

// Mecanismo de dor (nociceptivo / neuropático / nociplástico) — roteiro segmentado.
// Passos A1-A4 (fundação) e B1 (triagem no fluxo manual PRO) entregues.
// Ligada: a triagem aparece na etapa "Intensidade & Tipo" do fluxo manual.
export const ENABLE_PAIN_MECHANISM = true;

// Mapa corporal v2: lista de chips espelhando o SVG, contador e pain extent.
// Passos C1 (chips espelhados) e C2 (contador + extensão) entregues.
// Flag independente do mecanismo — permite reverter só o mapa.
export const ENABLE_PAINMAP_V2 = true;

// Periodização de carga + escalas subjetivas (sRPE, prontidão, ACWR).
// Fases 1-4 entregues; ligar após o double-check visual do prontuário.
export const ENABLE_PERIODIZATION = true;

// Compra de tratamento vitalício PRO.
// Desativado: o agente de raciocínio clínico passou a gerar planos de tratamento,
// e o modelo vitalício será substituído por cobrança separada do agente no futuro.
export const ENABLE_LIFETIME_TREATMENT_PURCHASE = false;


