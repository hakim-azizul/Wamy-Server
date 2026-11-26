import { ObjectId } from "mongodb";
import { isValidObjectId } from "./validation.js";

export const VIOLATION_SEVERITIES = Object.freeze(["simple", "moderate", "severe"]);

const SEVERITY_LABELS = Object.freeze({
  simple: "بسيطة",
  moderate: "متوسطة",
  severe: "جسيمة",
});

export function severityLabel(value) {
  return SEVERITY_LABELS[value] ?? value ?? "";
}

/**
 * Validate a score adjustment request.
 * - delta must be a non-zero integer.
 * - reason must be a non-empty string.
 * - violationSeverity is REQUIRED only for decreases and must be one of three levels.
 * - for increases it is stripped (never stored) even if the client sends it.
 */
export function validateScoreChange(body) {
  const errors = [];
  const raw = body ?? {};

  if (!isValidObjectId(raw.studentUserId)) {
    errors.push("studentUserId must be a valid user id.");
  }

  const delta = raw.delta;
  if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
    errors.push("delta must be a non-zero integer.");
  }

  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!reason) errors.push("reason is required.");

  let violationSeverity = null;
  if (typeof delta === "number" && delta < 0) {
    if (!VIOLATION_SEVERITIES.includes(raw.violationSeverity)) {
      errors.push("violationSeverity is required for a decrease (simple|moderate|severe).");
    } else {
      violationSeverity = raw.violationSeverity;
    }
  }

  return {
    value: {
      studentUserId: raw.studentUserId,
      delta,
      reason,
      violationSeverity,
      severityLabel: violationSeverity ? severityLabel(violationSeverity) : null,
    },
    errors,
  };
}

/** Build a safe query for GET /api/scores from role + query string. */
export function buildTransactionFilter({ role, userId, query }) {
  if (role === "student") {
    return { studentUserId: new ObjectId(userId) };
  }

  const filter = {};
  if (query.studentUserId) {
    if (!isValidObjectId(query.studentUserId)) {
      return { error: "studentUserId must be a valid user id." };
    }
    filter.studentUserId = new ObjectId(query.studentUserId);
  }
  if (typeof query.studentEmail === "string" && query.studentEmail.trim()) {
    filter.studentEmail = query.studentEmail.trim().toLowerCase();
  }
  return { filter };
}

export { ObjectId };
