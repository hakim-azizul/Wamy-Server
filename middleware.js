import { findUserById, toSafeUser } from "./services/users.js";
import { verifyToken } from "./utils/token.js";

function getBearerToken(req) {
  const header = req.get("authorization");
  if (header) {
    const [scheme, token] = header.split(" ");
    if (/^Bearer$/i.test(scheme) && token) return token;
  }
  const fallback = req.get("x-access-token");
  return typeof fallback === "string" && fallback ? fallback : null;
}

/**
 * Authenticate the request. Token verification lives in utils/token.js so a
 * real JWT verifier can be plugged in here later without changing any route.
 * Sets req.userId and req.user (safe user, password removed).
 */
export async function verifyUser(req, res, next) {
  try {
    const token = getBearerToken(req);
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "A valid bearer token is required.",
      });
    }

    const doc = await findUserById(payload.sub);
    if (!doc) {
      return res.status(401).json({ error: "Unauthorized", message: "Account no longer exists." });
    }
    if (doc.status !== "active") {
      return res.status(403).json({ error: "Forbidden", message: "This account is not active." });
    }

    req.userId = String(doc._id);
    req.user = toSafeUser(doc);
    return next();
  } catch (err) {
    console.error("verifyUser failed:", err);
    return res.status(500).json({ error: "InternalServerError", message: "Authentication failed." });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Only '${role}' accounts may perform this action.`,
      });
    }
    return next();
  };
}

export const isManager = requireRole("manager");
export const isSupervisor = requireRole("supervisor");
export const isStudent = requireRole("student");
