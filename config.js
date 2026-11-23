import "dotenv/config";

function numberFromEnv(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  dbUri: process.env.DB_URI,
  dbName: process.env.DB_NAME || undefined,
  port: numberFromEnv(process.env.PORT, 5000),
  // Starting review score for every newly created student (field #13).
  initialReviewScore: numberFromEnv(process.env.INITIAL_REVIEW_SCORE, 100),
  // Used to sign the lightweight bearer tokens issued at login.
  authSecret: process.env.AUTH_SECRET || "wamy-dev-secret-change-me",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
};
