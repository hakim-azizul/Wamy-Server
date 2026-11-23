import { Router } from "express";
import { verifyUser } from "../middleware.js";
import { verifyPassword } from "../utils/password.js";
import { issueToken } from "../utils/token.js";
import { validateLogin } from "../utils/validation.js";
import { findUserByEmail, toSafeUser } from "../services/users.js";

const router = Router();

/** Public: email + password login. No public registration endpoint exists. */
router.post("/login", async (req, res) => {
  try {
    const { value, errors } = validateLogin(req.body);
    if (errors.length) {
      return res.status(400).json({ error: "ValidationError", message: errors.join(" ") });
    }

    const doc = await findUserByEmail(value.email);
    if (!doc || !verifyPassword(value.password, doc.password)) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid email or password." });
    }
    if (doc.status !== "active") {
      return res.status(403).json({ error: "Forbidden", message: "This account is not active." });
    }

    return res.json({ token: issueToken(doc), user: toSafeUser(doc) });
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({ error: "InternalServerError", message: "Login failed." });
  }
});

router.get("/me", verifyUser, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
