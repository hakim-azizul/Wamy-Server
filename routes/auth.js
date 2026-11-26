import { Router } from "express";
import { verifyUser } from "../middleware.js";

const router = Router();

/**
 * JWTs are issued exclusively by Better Auth on wamy-client (GET /api/auth/token)
 * and verified here via JWKS. There is no server-side login/token issuer on
 * wamy-server and no AUTH_SECRET involved.
 */
router.post("/login", (req, res) => {
  return res.status(410).json({
    error: "Gone",
    message: "Sign in through wamy-client (/api/auth/sign-in/email) and send its JWT as Authorization: Bearer <token>.",
  });
});

router.get("/me", verifyUser, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
