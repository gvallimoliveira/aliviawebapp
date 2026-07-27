// Feature flags for gradual rollout of new features
// Set to true to enable the feature in the UI

export const ENABLE_VIDEO_CALL = true;

// Clinical reasoning AI agent. Liberado para profissionais, estudantes e clínicas.
// VIP users always bypass this flag (see useClinicalAgentAccess hook).
export const ENABLE_CLINICAL_AGENT = true;

// Assinatura "Chat do Agente" (R$ 14,90/mês, 150 msgs).
// Mantido oculto enquanto não há bloqueio/limite real do chat em vigor —
// expor a venda antes disso gera dúvida ("estou pagando pelo quê?").
// Virar true no mesmo deploy em que o enforcement do chat for ligado.
export const ENABLE_CHAT_ADDON = false;
