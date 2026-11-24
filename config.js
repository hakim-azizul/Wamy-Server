import "dotenv/config";

function numberFromEnv(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  dbUri: process.env.DB_URI,
  // Must match the database used by Better Auth in wamy-client/src/lib/auth.ts.
  dbName: process.env.DB_NAME || "WamyDorm",
  port: numberFromEnv(process.env.PORT, 5000),
  initialReviewScore: numberFromEnv(process.env.INITIAL_REVIEW_SCORE, 100),
  authSecret: process.env.AUTH_SECRET || "wamy-dev-secret-change-me",
  // Comma-separated list is supported, plus the two local loopback hosts by default.
  clientOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.CLIENT_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ],
  // Better Auth handler on the client (used for native sign-up of managed accounts).
  clientAuthUrl:
    process.env.CLIENT_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000",
};
