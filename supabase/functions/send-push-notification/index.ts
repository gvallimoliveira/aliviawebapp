import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Encode bytes to base64url (no padding).
 */
function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode base64url string to Uint8Array (handles missing padding).
 */
function base64urlToBytes(b64url: string): Uint8Array {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Create the JSON Web Token for VAPID authorization.
 */
async function createVapidJwt(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: "mailto:contato@aliviawebapp.com.br",
  };

  const headerB64 = bytesToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = base64urlToBytes(vapidPrivateKey);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: vapidPrivateKey,
    x: bytesToBase64url(base64urlToBytes(vapidPublicKey).slice(1, 33)),
    y: bytesToBase64url(base64urlToBytes(vapidPublicKey).slice(33, 65)),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // DER format
    rawSig = derToRaw(sigBytes);
  }

  const signatureB64 = bytesToBase64url(rawSig);
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

function derToRaw(der: Uint8Array): Uint8Array {
  // Parse DER SEQUENCE containing two INTEGERs
  const raw = new Uint8Array(64);
  let offset = 2; // skip SEQUENCE tag + length

  // First INTEGER (r)
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  const rLen = der[offset]; offset++;
  const rStart = offset + (rLen > 32 ? rLen - 32 : 0);
  const rDest = 32 - Math.min(rLen, 32);
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;

  // Second INTEGER (s)
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  const sLen = der[offset]; offset++;
  const sStart = offset + (sLen > 32 ? sLen - 32 : 0);
  const sDest = 32 + 32 - Math.min(sLen, 32);
  raw.set(der.slice(sStart, offset + sLen), sDest);

  return raw;
}

/**
 * Encrypt the push message payload using the subscription keys (RFC 8291 aes128gcm).
 */
async function encryptPayload(
  p256dh: string,
  auth: string,
  payload: string
): Promise<{ body: Uint8Array; headers: Record<string, string> }> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import subscriber's public key
  const subscriberPubKeyBytes = base64urlToBytes(p256dh);
  const subscriberPubKey = await crypto.subtle.importKey(
    "raw",
    subscriberPubKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberPubKey },
      localKeyPair.privateKey,
      256
    )
  );

  const authSecret = base64urlToBytes(auth);

  // HKDF extract + expand (RFC 8291)
  const ikm = sharedSecret;

  // PRK = HKDF-Extract(auth_secret, ikm)
  const prkKey = await crypto.subtle.importKey(
    "raw",
    authSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, ikm));

  // Info for content encryption key
  const encoder = new TextEncoder();
  const cekInfo = createInfo("Content-Encoding: aes128gcm", subscriberPubKeyBytes, localPublicKeyRaw);
  const nonceInfo = createInfo("Content-Encoding: nonce", subscriberPubKeyBytes, localPublicKeyRaw);

  const cek = await hkdfExpand(prk, cekInfo, 16);
  const nonce = await hkdfExpand(prk, nonceInfo, 12);

  // Encrypt with AES-128-GCM
  const payloadBytes = encoder.encode(payload);
  // Add padding delimiter
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  const encKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      encKey,
      paddedPayload
    )
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs);

  // Recompute with the actual salt
  const prkKey2 = await crypto.subtle.importKey(
    "raw",
    authSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  // IKM for the final encryption uses salt-based HKDF
  // Actually, RFC 8291 uses: PRK = HKDF-Extract(auth_secret, ecdh_secret)
  // Then: key = HKDF-Expand(PRK, key_info, 16) 
  // And:  nonce = HKDF-Expand(PRK, nonce_info, 12)
  // The salt in aes128gcm header is different from HKDF salt

  const body = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length + encrypted.length);
  let offset = 0;
  body.set(salt, offset); offset += 16;
  body.set(rsBytes, offset); offset += 4;
  body[offset] = localPublicKeyRaw.length; offset += 1;
  body.set(localPublicKeyRaw, offset); offset += localPublicKeyRaw.length;
  body.set(encrypted, offset);

  return {
    body,
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
    },
  };
}

function createInfo(type: string, subscriberPubKey: Uint8Array, localPubKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  // info = type || 0x00 || subscriber_key_length(2) || subscriber_key || local_key_length(2) || local_key
  const info = new Uint8Array(typeBytes.length + 1 + 2 + subscriberPubKey.length + 2 + localPubKey.length);
  let offset = 0;
  info.set(typeBytes, offset); offset += typeBytes.length;
  info[offset] = 0; offset++;
  info[offset] = 0; offset++;
  info[offset] = subscriberPubKey.length; offset++;
  info.set(subscriberPubKey, offset); offset += subscriberPubKey.length;
  info[offset] = 0; offset++;
  info[offset] = localPubKey.length; offset++;
  info.set(localPubKey, offset);
  return info;
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const input = new Uint8Array(info.length + 1);
  input.set(info);
  input[info.length] = 1;
  const result = new Uint8Array(await crypto.subtle.sign("HMAC", key, input));
  return result.slice(0, length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const apikeyHeader = req.headers.get("apikey") || "";

    if (!token && !apikeyHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isServiceRole = token === serviceRoleKey;
    const isAnonKey = token === anonKey || apikeyHeader === anonKey;
    let callerUserId: string | null = null;

    if (!isServiceRole && !isAnonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      callerUserId = userData.user.id;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isServiceRole && !isAnonKey && callerUserId !== user_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: cannot send notifications to other users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeTitle = String(title).slice(0, 200);
    const safeBody = String(body).slice(0, 500);
    const safeUrl = url ? String(url).slice(0, 500) : "/";

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payloadStr = JSON.stringify({ title: safeTitle, body: safeBody, url: safeUrl });
    let sent = 0;
    const errors: string[] = [];
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Create VAPID authorization for this endpoint
        const vapid = await createVapidJwt(sub.endpoint, vapidPublicKey, vapidPrivateKey);

        // Encrypt the payload
        const encrypted = await encryptPayload(sub.p256dh, sub.auth, payloadStr);

        // Send the push message
        const pushRes = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            ...encrypted.headers,
            Authorization: vapid.authorization,
            TTL: "86400",
            Urgency: "high",
            Topic: "alivia-notification",
          },
          body: encrypted.body,
        });

        if (pushRes.status === 201 || pushRes.status === 200) {
          sent++;
          console.log(`[Push] Sent to ${sub.endpoint.slice(0, 60)}...`);
        } else if (pushRes.status === 404 || pushRes.status === 410) {
          expiredEndpoints.push(sub.endpoint);
          console.log(`[Push] Subscription expired (${pushRes.status}), removing: ${sub.endpoint.slice(0, 60)}...`);
        } else {
          const errText = await pushRes.text();
          errors.push(`Failed (${pushRes.status}): ${errText.slice(0, 200)}`);
          console.error(`[Push] Error ${pushRes.status} for ${sub.endpoint.slice(0, 60)}:`, errText.slice(0, 200));
        }
      } catch (e: any) {
        errors.push(`Exception: ${e?.message || e}`);
        console.error(`[Push] Error for ${sub.endpoint.slice(0, 60)}:`, e?.message);
      }
    }

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent, cleaned: expiredEndpoints.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Push] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
