import { Router } from "express";
import { verifyPassword } from "better-auth/crypto";
import { verifyUser } from "../middleware.js";
import { issueToken } from "../utils/token.js";
import { validateLogin } from "../utils/validation.js";
import {
  findCredentialByUserId,
  findUserByEmail,
  toSafeUser,
} from "../services/users.js";

const router = Router();

/**
 * Public login. Credentials are verified with Better Auth's own password
 * verifier against its `account` collection, so hashes created by Better Auth
 * (e.g. by the seed script) always match.
 */
router.post("/login", async (req, res) => {
  try {
    const { value, errors } = validateLogin(req.body);
    if (errors.length) {
      return res.status(400).json({ error: "ValidationError", message: errors.join(" ") });
    }

    const doc = await findUserByEmail(value.email);
    if (!doc) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid email or password." });
    }

    const credential = await findCredentialByUserId(doc._id);
    if (!credential?.password) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid email or password." });
    }

    const isValid = await verifyPassword({
      hash: credential.password,
      password: value.password,
    });
    if (!isValid) {
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
