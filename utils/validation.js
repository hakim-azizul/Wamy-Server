import { ObjectId } from "mongodb";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export function readString(body, field, errors, { required = true } = {}) {
  const value = body?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    if (required) errors.push(`${field} is required and must be a non-empty string.`);
    return undefined;
  }
  return value.trim();
}

export function readDate(body, field, errors) {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") {
    errors.push(`${field} is required.`);
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} must be a valid date.`);
    return undefined;
  }
  return date;
}

export function validateLogin(body) {
  const errors = [];
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!EMAIL_PATTERN.test(email)) errors.push("A valid email is required.");
  if (!password) errors.push("Password is required.");

  return { value: { email, password }, errors };
}

/** Manager -> supervisor. Only common user fields are accepted. */
export function validateSupervisor(body) {
  const errors = [];
  const name = readString(body, "name", errors);
  const email = normalizeEmail(body?.email);
  const password = readString(body, "password", errors);
  const phone = readString(body, "phone", errors, { required: false }) || null;

  if (!EMAIL_PATTERN.test(email)) errors.push("A valid email is required.");
  if (password && password.length < 8) errors.push("Password must be at least 8 characters.");

  return { value: { name, email, password, phone }, errors };
}

/** Supervisor -> student. Lightweight account only; the student fills in details later. */
export function validateStudent(body) {
  const errors = [];
  const name = readString(body, "name", errors);
  const email = normalizeEmail(body?.email);
  const password = readString(body, "password", errors);
  const phone = readString(body, "phone", errors, { required: false }) || null;

  if (!EMAIL_PATTERN.test(email)) errors.push("A valid email is required.");
  if (password && password.length < 8) errors.push("Password must be at least 8 characters.");

  return { value: { name, email, password, phone }, errors };
}

export function validateScore(body) {
  const errors = [];
  const score = body?.score;
  if (typeof score !== "number" || !Number.isFinite(score)) {
    errors.push("score must be a finite number.");
  }
  return { value: { score }, errors };
}

export function isValidObjectId(id) {
  return typeof id === "string" && ObjectId.isValid(id);
}
