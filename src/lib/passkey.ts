/**
 * Passkey "Quick Unlock" para Aliv.iA.
 *
 * Fluxo:
 *  1. Após login normal (email/senha ou Google), o usuário pode registrar
 *     um passkey ligado a este dispositivo/navegador.
 *  2. No registro, criamos uma credencial WebAuthn (resident key) com
 *     verificação biométrica + extensão PRF (quando suportada). A partir do
 *     PRF derivamos uma chave AES-GCM que criptografa a sessão Supabase
 *     (access_token + refresh_token). Tudo é salvo em IndexedDB local.
 *  3. No próximo acesso (mesmo dispositivo), `unlockWithPasskey()` pede
 *     uma assertion (digital/face), decripta a sessão e chama
 *     `supabase.auth.setSession()`.
 *
 * Importante: este recurso NÃO substitui o login inicial — ele só
 * desbloqueia rapidamente a sessão já estabelecida neste navegador.
 *
 * Quando PRF não está disponível (Safari antigo, alguns Android),
 * caímos num modo "assertion-gated": a sessão fica em IndexedDB sem
 * criptografia adicional, e exigimos uma assertion WebAuthn bem-sucedida
 * com `userVerification: 'required'` antes de devolvê-la. A segurança
 * passa a depender do isolamento de origem do IndexedDB.
 */

import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "alivia_passkey";
const STORE = "credentials";
const RECORD_KEY = "current";

type StoredRecord = {
  userId: string;
  email: string | null;
  credentialId: ArrayBuffer; // raw
  prfSalt: ArrayBuffer | null; // null -> modo fallback
  iv: ArrayBuffer | null;
  ciphertext: ArrayBuffer | null;
  plainSession: { access_token: string; refresh_token: string } | null;
  createdAt: number;
};

// ---------- IndexedDB helpers ----------
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(): Promise<StoredRecord | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onsuccess = () => resolve((req.result as StoredRecord) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function dbPut(record: StoredRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record, RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbClear(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* noop */
  }
}

// ---------- Utils ----------
function randomBytes(len: number): Uint8Array {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return b;
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function deriveAesKeyFromPrf(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", prfOutput);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptSession(
  key: CryptoKey,
  session: { access_token: string; refresh_token: string },
): Promise<{ iv: ArrayBuffer; ciphertext: ArrayBuffer }> {
  const iv = randomBytes(12);
  const data = new TextEncoder().encode(JSON.stringify(session));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv: iv.buffer, ciphertext: ct };
}

async function decryptSession(
  key: CryptoKey,
  iv: ArrayBuffer,
  ct: ArrayBuffer,
): Promise<{ access_token: string; refresh_token: string }> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

// ---------- Public API ----------
export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof navigator !== "undefined" &&
    !!navigator.credentials
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function hasEnrolledPasskey(): Promise<boolean> {
  const rec = await dbGet();
  return !!rec;
}

export async function getEnrolledEmail(): Promise<string | null> {
  const rec = await dbGet();
  return rec?.email ?? null;
}

export async function removeEnrolledPasskey(): Promise<void> {
  await dbClear();
}

const DISMISS_KEY = "alivia.passkey.enrollPromptDismissedAt";
const DISMISS_FOREVER_KEY = "alivia.passkey.enrollNeverAsk";

export function dismissEnrollPrompt(forever = false) {
  try {
    if (forever) {
      localStorage.setItem(DISMISS_FOREVER_KEY, "1");
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  } catch {
    /* noop */
  }
}

export function shouldShowEnrollPrompt(userId: string): boolean {
  try {
    if (localStorage.getItem(DISMISS_FOREVER_KEY) === "1") return false;
    const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
    // re-pergunta a cada 7 dias
    if (last && Date.now() - last < 7 * 24 * 60 * 60 * 1000) return false;
    if (localStorage.getItem(`alivia.passkey.enrolledFor:${userId}`) === "1")
      return false;
  } catch {
    /* noop */
  }
  return true;
}

function markEnrolledFor(userId: string) {
  try {
    localStorage.setItem(`alivia.passkey.enrolledFor:${userId}`, "1");
  } catch {
    /* noop */
  }
}

function clearEnrolledFor(userId: string) {
  try {
    localStorage.removeItem(`alivia.passkey.enrolledFor:${userId}`);
  } catch {
    /* noop */
  }
}

/**
 * Registra um passkey para o usuário atualmente logado.
 * Requer uma sessão Supabase válida em memória.
 */
export async function enrollPasskey(opts: {
  userId: string;
  email: string | null;
  displayName: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPasskeySupported())
    return { ok: false, error: "WebAuthn não suportado neste navegador." };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token || !session.refresh_token)
    return { ok: false, error: "Sessão atual não encontrada." };

  const rpId = window.location.hostname;
  const challenge = randomBytes(32);
  const userIdBytes = (() => {
    try {
      return uuidToBytes(opts.userId);
    } catch {
      return new TextEncoder().encode(opts.userId);
    }
  })();

  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { id: rpId, name: "Aliv.iA" },
        user: {
          id: userIdBytes,
          name: opts.email ?? opts.userId,
          displayName: opts.displayName ?? opts.email ?? "Usuário Aliv.iA",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "required",
        },
        timeout: 60_000,
        attestation: "none",
        extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential;
  } catch (e: any) {
    return { ok: false, error: e?.message || "Registro cancelado." };
  }

  if (!credential)
    return { ok: false, error: "Não foi possível criar a credencial." };

  const credentialId = credential.rawId;

  // Tenta usar PRF: faz um get() imediato para derivar o segredo PRF.
  const prfSalt = randomBytes(32);
  let prfOutput: ArrayBuffer | null = null;
  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId,
        timeout: 60_000,
        userVerification: "required",
        allowCredentials: [
          {
            id: credentialId,
            type: "public-key",
            transports: ["internal"],
          },
        ],
        extensions: {
          prf: { eval: { first: prfSalt } },
        } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;

    const ext = assertion?.getClientExtensionResults() as any;
    const first = ext?.prf?.results?.first as ArrayBuffer | undefined;
    if (first && first.byteLength >= 16) {
      prfOutput = first;
    }
  } catch {
    // PRF não disponível -> fallback
  }

  const record: StoredRecord = {
    userId: opts.userId,
    email: opts.email,
    credentialId,
    prfSalt: prfOutput ? prfSalt.buffer : null,
    iv: null,
    ciphertext: null,
    plainSession: null,
    createdAt: Date.now(),
  };

  if (prfOutput) {
    const key = await deriveAesKeyFromPrf(prfOutput);
    const { iv, ciphertext } = await encryptSession(key, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    record.iv = iv;
    record.ciphertext = ciphertext;
  } else {
    record.plainSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
  }

  await dbPut(record);
  markEnrolledFor(opts.userId);
  return { ok: true };
}

/**
 * Pede uma assertion biométrica; se bem-sucedida, restaura a sessão
 * Supabase no cliente.
 */
export async function unlockWithPasskey(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!isPasskeySupported())
    return { ok: false, error: "WebAuthn não suportado." };
  const rec = await dbGet();
  if (!rec) return { ok: false, error: "Nenhum passkey registrado." };

  const rpId = window.location.hostname;

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId,
        timeout: 60_000,
        userVerification: "required",
        allowCredentials: [
          {
            id: rec.credentialId,
            type: "public-key",
            transports: ["internal"],
          },
        ],
        extensions: rec.prfSalt
          ? ({
              prf: { eval: { first: new Uint8Array(rec.prfSalt) } },
            } as AuthenticationExtensionsClientInputs)
          : undefined,
      },
    })) as PublicKeyCredential | null;

    if (!assertion)
      return { ok: false, error: "Autenticação cancelada." };

    let access_token: string;
    let refresh_token: string;

    if (rec.prfSalt && rec.iv && rec.ciphertext) {
      const ext = assertion.getClientExtensionResults() as any;
      const first = ext?.prf?.results?.first as ArrayBuffer | undefined;
      if (!first)
        return {
          ok: false,
          error: "Biometria validada, mas chave PRF indisponível.",
        };
      const key = await deriveAesKeyFromPrf(first);
      const dec = await decryptSession(key, rec.iv, rec.ciphertext);
      access_token = dec.access_token;
      refresh_token = dec.refresh_token;
    } else if (rec.plainSession) {
      access_token = rec.plainSession.access_token;
      refresh_token = rec.plainSession.refresh_token;
    } else {
      return { ok: false, error: "Dados de sessão ausentes." };
    }

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error || !data.session) {
      // Sessão expirou — limpa o registro para forçar novo login.
      await dbClear();
      if (rec.userId) clearEnrolledFor(rec.userId);
      return {
        ok: false,
        error:
          "Sua sessão expirou. Faça login com email/senha e reative o passkey.",
      };
    }

    // Se a sessão foi atualizada (refresh), re-encripta para próxima vez.
    try {
      const newAccess = data.session.access_token;
      const newRefresh = data.session.refresh_token;
      if (
        newAccess &&
        newRefresh &&
        (newAccess !== access_token || newRefresh !== refresh_token)
      ) {
        if (rec.prfSalt && rec.iv && rec.ciphertext) {
          const ext = assertion.getClientExtensionResults() as any;
          const first = ext?.prf?.results?.first as ArrayBuffer | undefined;
          if (first) {
            const key = await deriveAesKeyFromPrf(first);
            const { iv, ciphertext } = await encryptSession(key, {
              access_token: newAccess,
              refresh_token: newRefresh,
            });
            await dbPut({ ...rec, iv, ciphertext });
          }
        } else {
          await dbPut({
            ...rec,
            plainSession: {
              access_token: newAccess,
              refresh_token: newRefresh,
            },
          });
        }
      }
    } catch {
      /* noop */
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Falha na autenticação." };
  }
}
