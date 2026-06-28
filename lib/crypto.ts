// ============================================================
// Aegis Vault — zero-knowledge encryption
// Master password -> PBKDF2(SHA-256, 250k) -> AES-GCM 256 key
// Keys are encrypted at rest in localStorage; the derived key and
// plaintext secrets are never persisted and never leave the browser
// (except transiently, per-request, to /api/chat over HTTPS).
// ============================================================

const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const VERIFIER_CANARY = "aegis::vault::ok";

export interface Sealed {
  salt: string; // base64
  verifier: string; // base64 of iv+data
  blob: string; // base64 of iv+data
  iter: number;
  v: 1;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(str: string): Uint8Array {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptJSON(key: CryptoKey, data: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plain = enc.encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plain as BufferSource
  );
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return b64encode(combined);
}

async function decryptJSON<T = unknown>(key: CryptoKey, payload: string): Promise<T> {
  const combined = b64decode(payload);
  const iv = combined.slice(0, IV_BYTES);
  const cipher = combined.slice(IV_BYTES);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    cipher as BufferSource
  );
  return JSON.parse(dec.decode(plain)) as T;
}

/** Estimate PBKDF2 strength for display (crack-time hint). */
export function passwordStrength(pw: string): {
  score: number; // 0-4
  label: string;
  hint: string;
} {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  const entropy = pw.length * Math.log2(pool || 1);
  let score = 0;
  if (entropy >= 28) score = 1;
  if (entropy >= 45) score = 2;
  if (entropy >= 60) score = 3;
  if (entropy >= 80) score = 4;
  const labels = ["极弱", "较弱", "中等", "较强", "极强"];
  const hints = [
    "建议至少 10 位、混合大小写数字符号",
    "可被快速破解，请加长并混合字符",
    "尚可，建议更长更复杂",
    "强度良好",
    "强度极佳",
  ];
  return { score, label: labels[score], hint: hints[score] };
}

/** Create a brand-new vault sealed with the given master password. */
export async function sealVault<T>(
  password: string,
  data: T,
  existingSalt?: string
): Promise<Sealed> {
  const salt = existingSalt
    ? b64decode(existingSalt)
    : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveKey(password, salt);
  const verifier = await encryptJSON(key, { canary: VERIFIER_CANARY, ts: Date.now() });
  const blob = await encryptJSON(key, data);
  return { salt: b64encode(salt), verifier, blob, iter: PBKDF2_ITERATIONS, v: 1 };
}

/** Attempt to open the vault. Throws on wrong password. */
export async function openVault<T>(password: string, sealed: Sealed): Promise<T> {
  const salt = b64decode(sealed.salt);
  const key = await deriveKey(password, salt, sealed.iter || PBKDF2_ITERATIONS);
  try {
    const v = await decryptJSON<{ canary: string }>(key, sealed.verifier);
    if (v.canary !== VERIFIER_CANARY) throw new Error("bad canary");
  } catch {
    throw new Error("主密码错误，无法解锁保险库");
  }
  return decryptJSON<T>(key, sealed.blob);
}

/** Re-seal with a new password, preserving the same salt identity. */
export async function reseedVault<T>(
  oldPassword: string,
  newPassword: string,
  sealed: Sealed
): Promise<{ sealed: Sealed; data: T }> {
  const data = await openVault<T>(oldPassword, sealed);
  const resealed = await sealVault(newPassword, data, sealed.salt);
  return { sealed: resealed, data };
}

const VAULT_KEY = "aegis:vault";

export function loadSealedVault(): Sealed | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? (JSON.parse(raw) as Sealed) : null;
  } catch {
    return null;
  }
}

export function saveSealedVault(sealed: Sealed) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(sealed));
}

export function destroyVault() {
  localStorage.removeItem(VAULT_KEY);
}

/** Wipe in-memory secrets by best-effort (call on lock). */
export function secureWipe(obj: Record<string, unknown>) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === "string") obj[k] = "";
    else if (v && typeof v === "object") secureWipe(v as Record<string, unknown>);
  }
}
