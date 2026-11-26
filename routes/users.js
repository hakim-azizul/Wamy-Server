import { Router } from "express";
import { isManager, isSupervisor, verifyUser } from "../middleware.js";
import {
  createUser,
  findUserById,
  listUsers,
  updateStudentScore,
} from "../services/users.js";
import {
  isValidObjectId,
  validateScore,
  validateStudent,
  validateSupervisor,
} from "../utils/validation.js";

const router = Router();

function respondWithValidationErrors(res, errors) {
  return res.status(400).json({ error: "ValidationError", message: errors.join(" ") });
}

function handleServerError(res, context, err) {
  if (err?.code === 11000) {
    return res.status(409).json({
      error: "Conflict",
      message: "An account with this email already exists.",
    });
  }
  console.error(`${context} failed:`, err);
  return res.status(500).json({ error: "InternalServerError", message: `${context} failed.` });
}

/** Manager only: create a supervisor. Role is forced here, never read from the body. */
router.post("/supervisors", verifyUser, isManager, async (req, res) => {
  const { value, errors } = validateSupervisor(req.body);
  if (errors.length) return respondWithValidationErrors(res, errors);

  try {
    const user = await createUser({ ...value, role: "supervisor", createdBy: req.user.name });
    return res.status(201).json({ user });
  } catch (err) {
    return handleServerError(res, "Create supervisor", err);
  }
});

/** Supervisor only: create a lightweight student account (score is server-set). */
router.post("/students", verifyUser, isSupervisor, async (req, res) => {
  const { value, errors } = validateStudent(req.body);
  if (errors.length) return respondWithValidationErrors(res, errors);

  try {
    const user = await createUser({
      ...value,
      role: "student",
      createdBy: req.user.name,
    });
    return res.status(201).json({ user });
  } catch (err) {
    return handleServerError(res, "Create student", err);
  }
});

/** Role-scoped listing: manager -> all, supervisor -> students, student -> self. */
router.get("/", verifyUser, async (req, res) => {
  try {
    if (req.user.role === "student") {
      return res.json({ users: [req.user] });
    }

    const filter = req.user.role === "supervisor" ? { role: "student" } : {};
    return res.json({ users: await listUsers(filter) });
  } catch (err) {
    return handleServerError(res, "List users", err);
  }
});

router.get("/me", verifyUser, (req, res) => {
  return res.json({ user: req.user });
});

/** Manager only: authorized edit of the student's top-level review score. */
router.patch("/:id/score", verifyUser, isManager, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "ValidationError", message: "Invalid student id." });
  }

  const target = await findUserById(req.params.id);
  if (!target) {
    return res.status(404).json({ error: "NotFound", message: "User not found." });
  }
  if (target.role !== "student") {
    return res.status(400).json({
      error: "ValidationError",
      message: "Score applies only to student accounts.",
    });
  }

  const { value, errors } = validateScore(req.body);
  if (errors.length) return respondWithValidationErrors(res, errors);

  try {
    const user = await updateStudentScore(req.params.id, value.score);
    if (!user) {
      return res.status(404).json({ error: "NotFound", message: "Student not found." });
    }
    return res.json({ user });
  } catch (err) {
    return handleServerError(res, "Update score", err);
  }
});

export default router;
