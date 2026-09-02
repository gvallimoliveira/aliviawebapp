/**
 * Version checker — pure client-side polling, NO Service Worker, NO fetch
 * interception. Safe for the Supabase auth flow.
 *
 * See mem://constraints/auth-stability — this module must never:
 *  - register a Service Worker
 *  - intercept fetches
 *  - clear caches/localStorage automatically
 *
 * Behavior (meio-termo):
 *  - Reads /version.json and compares its hash to VITE_BUILD_HASH.
 *  - When a new hash is detected on a SAFE route, shows a minimalist toast
 *    ("Nova versão disponível" + botão "Atualizar agora"). NO release notes,
 *    NO "what changed" description — only the PWA reinstall note is kept
 *    short, because without it the home-screen icon stays broken.
 *  - AUTO-RELOAD: if the user leaves the tab and comes back (visibilitychange
 *    → visible) AND is on a SAFE route, we silently reload — no clicking
 *    needed. Sensitive flows (assessment, payment, auth, chat input, etc.)
 *    are never interrupted.
 */
import { toast } from "sonner";

const POLL_INTERVAL_MS = 15 * 60 * 1000;
const MIN_CHECK_GAP_MS = 30 * 1000;
const TOAST_ID = "alivia-update-available";

// Routes where we never reload nor nag — a flow in progress would be lost.
const UNSAFE_PATH_PREFIXES = [
  "/assessment",
  "/payment-success",
  "/auth",
  "/reset-password",
  "/aceitar-convite",
  "/complete-profile",
  "/upgrade-welcome",
  "/hep/",
  "/agente", // chat input em curso
  "/professional/register",
];

let started = false;
let currentHash: string | null = null;
let lastCheckAt = 0;
let pendingHash: string | null = null;
let pendingMeta: UpdateMeta | null = null;
let toastShownForHash: string | null = null;

interface UpdateMeta {
  requiresReinstall?: boolean;
  reinstallReason?: string;
}

function getLocalHash(): string {
  return (import.meta.env.VITE_BUILD_HASH as string | undefined) ?? "__dev__";
}

function isUnsafeRoute(): boolean {
  if (typeof window === "undefined") return true;
  // Um modal/diálogo aberto conta como fluxo em andamento: não interrompemos.
  try {
    if (document.querySelector("[role='dialog'],[role='alertdialog']")) return true;
  } catch {
    /* noop */
  }
  const path = window.location.pathname;
  return UNSAFE_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix || path.startsWith(prefix + "/"),
  );
}


function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error - non-standard
  if (window.navigator.standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
}

function hardReload(remoteHash: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("v", remoteHash);
    window.location.assign(url.toString());
  } catch {
    window.location.reload();
  }
}

function showMinimalToast(remoteHash: string, meta: UpdateMeta) {
  if (isUnsafeRoute()) {
    pendingHash = remoteHash;
    pendingMeta = meta;
    return;
  }
  pendingHash = null;
  pendingMeta = null;

  const standalone = isStandalonePWA();
  const needsReinstall = meta.requiresReinstall === true && standalone;

  toast("Nova versão disponível", {
    id: TOAST_ID,
    description: needsReinstall
      ? (meta.reinstallReason ??
          "Após atualizar, remova o atalho do Aliv.iA da tela inicial e adicione novamente.")
      : undefined,
    duration: Infinity,
    action: {
      label: "Atualizar agora",
      onClick: () => hardReload(remoteHash),
    },
  });
  toastShownForHash = remoteHash;
}

async function checkOnce(force = false) {
  if (typeof window === "undefined") return;
  const local = getLocalHash();
  if (local === "__dev__") return;

  const now = Date.now();
  if (!force && now - lastCheckAt < MIN_CHECK_GAP_MS) return;
  lastCheckAt = now;

  try {
    const res = await fetch(`/version.json?t=${now}`, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      hash?: string;
      requiresReinstall?: boolean;
      reinstallReason?: string;
    };
    const remote = data?.hash;
    if (!remote || typeof remote !== "string") return;

    currentHash = remote;
    if (remote !== local) {
      showMinimalToast(remote, {
        requiresReinstall: data.requiresReinstall,
        reinstallReason: data.reinstallReason,
      });
    }
  } catch {
    /* network hiccup */
  }
}

function maybeSurfaceOrAutoReload() {
  // Só revela o toast quando a rota fica segura. NUNCA recarrega sozinho:
  // auto-reload por foco/visibilidade fazia o app "voltar" de tela durante
  // navegação normal. A atualização é sempre decisão do usuário.
  if (pendingHash && !isUnsafeRoute()) {
    showMinimalToast(pendingHash, pendingMeta ?? {});
  }
}

export function startVersionChecker() {
  if (started) return;
  started = true;
  if (typeof window === "undefined") return;

  setTimeout(() => void checkOnce(true), 2000);

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkOnce();
      setTimeout(maybeSurfaceOrAutoReload, 600);
    }
  });

  setInterval(() => {
    if (document.visibilityState === "visible") void checkOnce();
  }, POLL_INTERVAL_MS);

  // SPA navigations — re-evaluate pending toast when leaving an unsafe route.
  window.addEventListener("popstate", maybeSurfaceOrAutoReload);
  window.addEventListener("alivia:navigation", maybeSurfaceOrAutoReload as EventListener);
}


export function _getCurrentRemoteHash() {
  return currentHash;
}
