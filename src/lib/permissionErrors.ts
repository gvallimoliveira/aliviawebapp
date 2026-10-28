import { toast } from "sonner";
import i18n from "@/i18n";

/**
 * Global permission-denied signalling. Watches backend responses (data API,
 * RPCs, storage, functions) and, when the server refuses an action because the
 * current profile lacks the authority for it, shows an explicit message instead
 * of leaving the user with only a generic "error saving" toast.
 * Auth endpoints are never inspected (auth stability rule).
 */

const MESSAGES: Record<string, { title: string; body: string }> = {
  pt: {
    title: "Seu perfil não tem permissão para esta ação",
    body: "Esta tarefa exige outra função (ex.: dono/admin da clínica, terapeuta ativo ou assinatura PRO). Peça ao responsável para executá-la ou ajustar seu acesso.",
  },
  en: {
    title: "Your profile isn't allowed to do this",
    body: "This task requires another role (e.g. clinic owner/admin, active therapist or PRO subscription). Ask the person in charge to do it or adjust your access.",
  },
  es: {
    title: "Tu perfil no tiene permiso para esta acción",
    body: "Esta tarea requiere otra función (ej.: dueño/admin de la clínica, terapeuta activo o suscripción PRO). Pide al responsable que la realice o ajuste tu acceso.",
  },
};

const PERMISSION_PATTERN =
  /row-level security|permission denied|insufficient_privilege|not allowed|not authorized|forbidden|sem permiss|não autorizado|nao autorizado|acesso negado|apenas (o )?(dono|admin|propriet)|somente (o )?(dono|admin)/i;

/** Pure classifier: does this backend response mean "this profile lacks authority"? */
export function isPermissionDenied(status: number, body: string): boolean {
  if (status !== 403 && status !== 401 && status !== 400) return false;
  if (/"code"\s*:\s*"42501"/.test(body)) return true;
  if (status === 401) return false; // missing/expired session, not a role problem
  if (status === 403) return true;
  return PERMISSION_PATTERN.test(body) && /42501|row-level security|permission denied/i.test(body);
}

function isWatchedUrl(url: string): boolean {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base || !url.startsWith(base)) return false;
  if (url.includes("/auth/v1/")) return false;
  return /\/(rest|storage|functions)\/v1\//.test(url);
}

let lastShown = 0;
function notify() {
  const now = Date.now();
  if (now - lastShown < 4000) return;
  lastShown = now;
  const lang = (i18n.language || "pt").slice(0, 2);
  const m = MESSAGES[lang] ?? MESSAGES.pt;
  toast.error(m.title, { description: m.body, id: "permission-denied" });
}

let installed = false;
export function installPermissionErrorWatcher() {
  if (installed || typeof window === "undefined" || !window.fetch) return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await original(input, init);
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if ((res.status === 403 || res.status === 401 || res.status === 400) && isWatchedUrl(url)) {
        res
          .clone()
          .text()
          .then((body) => {
            if (isPermissionDenied(res.status, body)) notify();
          })
          .catch(() => {});
      }
    } catch {
      /* never interfere with the request */
    }
    return res;
  };
}
