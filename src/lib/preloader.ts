// Pre-warms Level 2 modules during browser idle time so they are ready
// the moment the user navigates to them — without blocking initial paint.

type Importer = () => Promise<unknown>;

const idle = (cb: () => void, timeout = 2000) => {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(cb, { timeout });
  } else {
    setTimeout(cb, 300);
  }
};

const safeImport = (label: string, importer: Importer) => {
  try {
    importer().catch((err) => {
      // Silent — preloads are best-effort
      if (import.meta.env.DEV) console.debug(`[preloader] failed: ${label}`, err);
    });
  } catch {
    /* noop */
  }
};

let started = false;

export const startIdlePreloads = () => {
  if (started) return;
  started = true;

  // Marketing/landing routes must stay light: never compete with their
  // first paint by warming dashboard/assessment chunks in the background.
  const MARKETING_ROUTES = [
    "/para-pacientes",
    "/profissionais",
    "/academico",
    "/clinica",
    "/blog",
    "/landing-legacy",
  ];
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const isRoot = path === "/" || path === "";
    if (isRoot || MARKETING_ROUTES.some((r) => path.startsWith(r))) {
      started = false; // allow preloads to start after the user navigates away
      return;
    }
  }

  // Stagger preloads so we never compete with the user's first interactions.
  idle(() => {
    safeImport("Assessment", () => import("@/pages/Assessment"));
    safeImport("AssessmentView", () => import("@/pages/AssessmentView"));
  });


  idle(() => {
    safeImport("MessagesTab", () => import("@/components/dashboard/MessagesTab"));
    safeImport("PainDiary", () => import("@/components/dashboard/PainDiary"));
    safeImport("ExerciseChecklist", () => import("@/components/dashboard/ExerciseChecklist"));
    safeImport("EvolutionSummary", () => import("@/components/dashboard/EvolutionSummary"));
  }, 3000);

  idle(() => {
    safeImport("ProDashboard", () => import("@/components/dashboard/ProDashboard"));
    safeImport("AssessmentComparison", () => import("@/components/dashboard/AssessmentComparison"));
  }, 4000);
};
