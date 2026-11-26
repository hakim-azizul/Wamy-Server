import { Router } from "express";
import { SECTION_KEYS } from "../db.js";
import { isManagerOrSupervisor, isStudent, verifyUser } from "../middleware.js";
import {
  getStudentBundle,
  isStudentAccount,
  patchStudentSection,
  upsertStudentSection,
} from "../services/studentDetails.js";
import {
  validatePartialSection,
  validateSection,
} from "../utils/studentDetailsValidation.js";
import { isValidObjectId } from "../utils/validation.js";

const router = Router();

function validationError(res, errors) {
  return res.status(400).json({ error: "ValidationError", message: errors.join(" ") });
}

/** Student: own 5-section bundle with completion summary. */
router.get("/me", verifyUser, isStudent, async (req, res) => {
  try {
    return res.json(await getStudentBundle(req.userId));
  } catch (err) {
    console.error("Get own details failed:", err);
    return res.status(500).json({ error: "InternalServerError", message: "Could not load details." });
  }
});

/** Manager/supervisor: any student's bundle; a student may only request their own id. */
router.get("/:userId", verifyUser, async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) return validationError(res, ["Invalid student id."]);

  if (req.user.role === "student" && userId !== req.userId) {
    return res.status(403).json({ error: "Forbidden", message: "You may only view your own details." });
  }

  try {
    if (!(await isStudentAccount(userId))) {
      return res.status(404).json({ error: "NotFound", message: "Student account not found." });
    }
    return res.json(await getStudentBundle(userId));
  } catch (err) {
    console.error("Get student details failed:", err);
    return res.status(500).json({ error: "InternalServerError", message: "Could not load details." });
  }
});

/** Student: upsert one of the five sections; completion is set server-side. */
router.put("/:section", verifyUser, isStudent, async (req, res) => {
  const { section } = req.params;
  if (!SECTION_KEYS.includes(section)) {
    return validationError(res, [`Unknown section '${section}'.`]);
  }

  const { value, errors } = validateSection(section, req.body);
  if (errors.length) return validationError(res, errors);

  try {
    const saved = await upsertStudentSection(req.userId, section, value);
    const bundle = await getStudentBundle(req.userId);
    return res.json({ section: saved, completionSummary: bundle.completionSummary });
  } catch (err) {
    console.error("Save student section failed:", err);
    return res.status(500).json({ error: "InternalServerError", message: "Could not save section." });
  }
});

/**
 * Manager/supervisor: partial edit of one student's detail section.
 * Body: { section: 'personal'|..., fields: { onlyChangedKeys: ... } }.
 * Only supplied keys are written; `null` clears a value. Canonical user fields
 * (email/roomNumber/flatNumber/name) are rejected by validation.
 */
router.patch("/:userId/details", verifyUser, isManagerOrSupervisor, async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) return validationError(res, ["Invalid student id."]);

  if (!(await isStudentAccount(userId))) {
    return res.status(404).json({ error: "NotFound", message: "Student account not found." });
  }

  const { section, fields } = req.body ?? {};
  const { value, errors } = validatePartialSection(section, fields);
  if (errors.length) return validationError(res, errors);

  try {
    const { section: saved, bundle } = await patchStudentSection(userId, section, value);
    return res.json({ section: saved, ...bundle });
  } catch (err) {
    console.error("Patch student section failed:", err);
    return res.status(500).json({ error: "InternalServerError", message: "Could not update section." });
  }
});

export default router;
