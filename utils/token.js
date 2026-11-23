import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sign(data) {
  return createHmac("sha256", config.authSecret).update(data).digest("hex");
}

/**
 * Issue a compact, self-contained bearer token.
 * Format: base64url(payload).hex(hmac). Payload: { sub, role, iat, exp }.
 * This is deliberately isolated here so it can be swapped for a real JWT
 * verifier later without touching any route or middleware.
 */
export function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(user._id),
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Returns the decoded payload, or null for any invalid/expired token. */
export function verifyToken(token) {
  if (typeof token !== "string") return null;

  const [data, signature, ...extra] = token.split(".");
  if (!data || !signature || extra.length > 0) return null;

  const expected = Buffer.from(sign(data), "hex");
  const actual = Buffer.from(signature, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (!payload.sub || typeof payload.exp !== "number") return null;
    if (payload.exp <= Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
