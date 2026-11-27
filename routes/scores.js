import { Router } from "express";
import { isManagerOrSupervisor, verifyUser } from "../middleware.js";
import { findUserById } from "../services/users.js";
import {
  adjustStudentScore,
  listScoreTransactions,
} from "../services/scores.js";
import { buildTransactionFilter, validateScoreChange } from "../utils/scoreValidation.js";

const router = Router();

/** Manager / supervisor: adjust a student's score and log one transaction. */
router.post("/", verifyUser, isManagerOrSupervisor, async (req, res) => {
  const { value, errors } = validateScoreChange(req.body);
  if (errors.length) {
    return res.status(400).json({ error: "ValidationError", message: errors.join(" ") });
  }

  try {
    const target = await findUserById(value.studentUserId);
    if (!target || target.role !== "student") {
      return res.status(404).json({ error: "NotFound", message: "Student account not found." });
    }

    const result = await adjustStudentScore({
      ...value,
      actor: req.user,
      includeActor: req.user.role === "manager",
    });
    if (!result) {
      return res.status(404).json({ error: "NotFound", message: "Student account not found." });
    }
    return res.status(201).json(result);
  } catch (err) {
    console.error("Adjust score failed:", err);
    return res.status(500).json({ error: "InternalServerError", message: "Could not adjust score." });
  }
});

/**
 * Manager / supervisor: all transactions (filterable by student id/email).
 * Student: only their own transactions.
 * Always sorted newest-first.
 */
router.get("/", verifyUser, async (req, res) => {
  const built = buildTransactionFilter({
    role: req.user.role,
    userId: req.userId,
    query: req.query,
  });
  if (built.error) {
    return res.status(400).json({ error: "ValidationError", message: built.error });
  }

  try {
    const transactions = await listScoreTransactions(
      built.filter,
      200,
      req.user.role === "manager",
    );
    return res.json({ transactions, count: transactions.length });
  } catch (err) {
    console.error("List score transactions failed:", err);
    return res.status(500).json({ error: "InternalServerError", message: "Could not load score history." });
  }
});

export default router;
