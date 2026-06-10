// Feature flags for gradual rollout of new features
// Set to true to enable the feature in the UI

export const ENABLE_VIDEO_CALL = true;

// Clinical reasoning AI agent (beta). Standby until manually enabled.
// VIP users always bypass this flag (see useClinicalAgentAccess hook).
export const ENABLE_CLINICAL_AGENT = false;
