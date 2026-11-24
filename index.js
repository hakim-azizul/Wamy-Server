import "dotenv/config";
import express from "express";
import cors from "cors";

const allowedOrigins = new Set(config.clientOrigins);
import { config } from "./config.js";
import { connectToMongoDB, ensureIndexes } from "./db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import studentDetailsRoutes from "./routes/studentDetails.js";

// Keep this export available from the entry point for existing callers.
export { connectToMongoDB } from "./db.js";

const app = express();

// middleware
app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) send no Origin header.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
// Chrome Private Network Access preflight (page on a non-local origin -> localhost API).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  next();
});

app.get("/", (req, res) => {
  res.send({ message: "WamyDorm Server is live" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/student-details", studentDetailsRoutes);

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

await connectToMongoDB();
await ensureIndexes();

app.listen(config.port, () => {
  console.log(`Server is running on port: ${config.port}`);
});
