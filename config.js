import "dotenv/config";

function numberFromEnv(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Accept comma-separated browser origins and normalize trailing slashes. */
function parseOrigins(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export const isProduction = process.env.NODE_ENV === "production";
export const isVercel = Boolean(process.env.VERCEL);
export const isDevelopment = !isProduction;

const localOrigins = isDevelopment
  ? ["http://localhost:3000", "http://127.0.0.1:3000"]
  : [];

// These env vars all describe the CLIENT (wamy-client) origin on the server project.
const configuredOrigins = parseOrigins(
  [
    process.env.CLIENT_ORIGIN,
    process.env.CLIENT_URL,
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    process.env.BETTER_AUTH_URL,
  ].join(","),
);

// These describe where server-side Better Auth sign-up calls must go (the client app).
const configuredClientAuthUrl = [
  process.env.CLIENT_URL,
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  process.env.BETTER_AUTH_URL,
].find((value) => typeof value === "string" && value.trim() !== "")?.trim();

export const config = {
  dbUri: process.env.DB_URI,
  // Must match the database used by Better Auth in wamy-client/src/lib/auth.ts.
  dbName: process.env.DB_NAME || "WamyDorm",
  port: numberFromEnv(process.env.PORT, 5000),
  initialReviewScore: numberFromEnv(process.env.INITIAL_REVIEW_SCORE, 100),
  clientOrigins: [...new Set([...localOrigins, ...configuredOrigins])],
  clientAuthUrl:
    configuredClientAuthUrl?.replace(/\/$/, "") ||
    (isDevelopment ? "http://localhost:3000" : ""),
};

// Better Auth JWT plugin uses the client baseURL as the default iss/aud.
config.jwtIssuer = config.clientAuthUrl || null;
config.jwtAudience = config.clientAuthUrl || null;

/** Non-secret startup diagnostics — helps catch Vercel env mistakes quickly. */
export function logConfigDiagnostics() {
  console.info("[config] environment:", isProduction ? "production" : "development", isVercel ? "(Vercel)" : "");
  console.info("[config] database:", config.dbName, "DB_URI configured:", Boolean(config.dbUri));
  console.info("[config] allowed CORS origins:", config.clientOrigins.join(", ") || "(none)");
  console.info("[config] client auth URL (for sign-up):", config.clientAuthUrl || "(unset)");

  if (!config.dbUri) {
    console.error("[config] DB_URI is missing — add it to the wamy-server Vercel project.");
  }
  if (isProduction && config.clientOrigins.length === 0) {
    console.error("[config] No CORS origins configured — set CLIENT_ORIGIN to the deployed wamy-client URL.");
  }
  if (isProduction && (!config.clientAuthUrl || config.clientAuthUrl.includes("localhost"))) {
    console.error(
      "[config] CLIENT_URL / BETTER_AUTH_URL is not set to the deployed wamy-client URL — JWT verification and managed account creation will fail.",
    );
  }
  console.info("[config] JWT JWKS endpoint:", config.clientAuthUrl ? `${config.clientAuthUrl}/api/auth/jwks` : "(unset)");
  console.info("[config] AUTH_SECRET is not used on wamy-server (tokens are verified via JWKS).");
}
