import type { Bindings } from "../types";

export async function createSessionCookie(env: Bindings, login: string): Promise<string> {
  const payload = JSON.stringify({ login, exp: Date.now() + 7 * 24 * 3600_000 });
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const token = btoa(JSON.stringify({ p: payload, s: Array.from(new Uint8Array(sig)) }));
  const secure = env.DOMAIN.startsWith("localhost") ? "" : "; Secure";
  return `session=${token}; HttpOnly${secure}; SameSite=Lax; Path=/admin; Max-Age=604800`;
}

export async function verifySession(request: Request, env: Bindings): Promise<string | null> {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  try {
    const raw = JSON.parse(atob(match[1]));
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(env.SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const valid = await crypto.subtle.verify("HMAC", key, new Uint8Array(raw.s), enc.encode(raw.p));
    if (!valid) return null;
    const payload = JSON.parse(raw.p) as { login: string; exp: number };
    if (Date.now() > payload.exp) return null;
    return payload.login;
  } catch {
    return null;
  }
}

export async function verifyPassword(env: Bindings, email: string, password: string): Promise<boolean> {
  if (email !== env.ADMIN_EMAIL) return false;

  const stored = env.ADMIN_PASSWORD_HASH;

  if (stored.includes(":")) {
    const [saltHex, iterStr, hashHex] = stored.split(":");
    const iterations = parseInt(iterStr, 10) || 600_000;
    const salt = hexToBytes(saltHex);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256
    );
    const hex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
    return hex === hashHex;
  }

  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(password));
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === stored;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
