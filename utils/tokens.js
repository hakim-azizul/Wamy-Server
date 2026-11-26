import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";

/**
 * Better Auth (wamy-client) signs JWTs with its locally-managed JWKS keys and
 * exposes the public keys at GET /api/auth/jwks. The Express API only VERIFIES
 * tokens — it never signs them and holds no secret key of its own.
 */
const jwksUrl = (() => {
  if (!config.clientAuthUrl) return null;
  try {
    return new URL(`${config.clientAuthUrl.replace(/\/$/, "")}/api/auth/jwks`);
  } catch {
    return null;
  }
})();

const JWKS = jwksUrl ? createRemoteJWKSet(jwksUrl) : null;

if (!JWKS) {
  console.error(
    "[tokens] CLIENT_URL / BETTER_AUTH_URL is not set — cannot resolve the Better Auth JWKS endpoint. " +
      "Set it to the deployed wamy-client URL and redeploy.",
  );
}

/**
 * Verify a Better Auth JWT asynchronously via JWKS.
 * Returns normalized claims, or null for missing/invalid/expired tokens.
 * `iss`/`aud` must match the client's baseURL (Better Auth JWT plugin defaults).
 */
export async function verifyToken(token) {
  if (typeof token !== "string" || !token || !JWKS) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: config.jwtIssuer || undefined,
      audience: config.jwtAudience || undefined,
    });

    if (!payload.sub) return null;

    return {
      sub: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : null,
      role: typeof payload.role === "string" ? payload.role : null,
      claims: payload,
    };
  } catch (err) {
    console.warn(`[tokens] JWT verification failed: ${err?.code || err?.message || "unknown error"}`);
    return null;
  }
}
