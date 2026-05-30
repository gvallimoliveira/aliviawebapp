// Tiny pub/sub store for a global "navigation in progress" overlay.
// Lives outside React state so the indicator can be shown by a click handler
// and survive the source page's unmount during route transition.

export type NavOverlayState = {
  visible: boolean;
  label: string;
  startedAt: number;
};

type Listener = (state: NavOverlayState) => void;

let state: NavOverlayState = { visible: false, label: "", startedAt: 0 };
const listeners = new Set<Listener>();

const emit = () => {
  for (const l of listeners) l(state);
};

export const subscribeNavOverlay = (listener: Listener) => {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
};

export const getNavOverlayState = () => state;

export const showNavOverlay = (label = "Carregando…") => {
  state = { visible: true, label, startedAt: Date.now() };
  emit();
};

export const hideNavOverlay = () => {
  if (!state.visible) return;
  state = { visible: false, label: "", startedAt: 0 };
  emit();
};
