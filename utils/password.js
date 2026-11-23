import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/** Hash a plain-text password with scrypt + a random salt (no extra dependency). */
export function hashPassword(plain) {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new TypeError("A non-empty password is required");
  }
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Constant-time verification against a stored `scrypt$salt$hash` value. */
export function verifyPassword(plain, stored) {
  if (typeof plain !== "string" || typeof stored !== "string") return false;

  const [scheme, salt, hex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;

  try {
    const expected = Buffer.from(hex, "hex");
    if (expected.length === 0) return false;
    const actual = scryptSync(plain, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
