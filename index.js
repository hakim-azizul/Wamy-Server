import "dotenv/config";
import express from "express";
import cors from "cors";
import { config, isVercel, logConfigDiagnostics } from "./config.js";
import { connectToMongoDB, ensureIndexes } from "./db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import studentDetailsRoutes from "./routes/studentDetails.js";
import scoreRoutes from "./routes/scores.js";

const allowedOrigins = new Set(config.clientOrigins);

// Keep this export available from the entry point / Vercel serverless adapter.
export { connectToMongoDB } from "./db.js";

const app = express();

// CORS MUST run before express.json() and every route so OPTIONS preflights get
// a complete Access-Control-* response even for protected endpoints.
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) send no Origin header.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      console.warn(
        `[cors] blocked origin: ${origin}. Add it to CLIENT_ORIGIN on wamy-server (e.g. CLIENT_ORIGIN=${origin}) and redeploy.`,
      );
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Access-Token"],
    exposedHeaders: ["Content-Type"],
    credentials: true,
    optionsSuccessStatus: 204,
    preflightContinue: false,
    maxAge: 600,
  }),
);
// Chrome Private Network Access preflight (page on a non-local origin -> localhost API).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send({ message: "WamyDorm Server is live" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/student-details", studentDetailsRoutes);
app.use("/api/scores", scoreRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "NotFound", message: "Route not found." });
});

app.use((err, req, res, next) => {
  if (err?.message?.includes("not allowed by CORS")) {
    return res.status(403).json({ error: "Forbidden", message: err.message });
  }
  console.error("Unhandled server error:", err);
  return res.status(500).json({ error: "InternalServerError", message: "Something went wrong." });
});

logConfigDiagnostics();

await connectToMongoDB();
await ensureIndexes();

// Vercel serverless invokes the exported app; listening locally is unnecessary there.
if (!isVercel) {
  app.listen(config.port, () => {
    console.log(`Server is running on port: ${config.port}`);
  });
}

export default app;
