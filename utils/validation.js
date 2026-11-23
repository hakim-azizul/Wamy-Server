import { ObjectId } from "mongodb";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const normalizePassport = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

function readString(body, field, errors, { required = true } = {}) {
  const value = body?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    if (required) errors.push(`${field} is required and must be a non-empty string.`);
    return undefined;
  }
  return value.trim();
}

function readDate(body, field, errors) {
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

/** Supervisor -> student. Includes all 12 input profile fields (score is server-set). */
export function validateStudent(body) {
  const errors = [];
  const profile = body?.studentProfile ?? {};

  const name = readString(profile, "name", errors);
  const email = normalizeEmail(body?.email);
  const password = readString(body, "password", errors);
  const phone = readString(body, "phone", errors, { required: false }) || null;

  if (!EMAIL_PATTERN.test(email)) errors.push("A valid email is required.");
  if (password && password.length < 8) errors.push("Password must be at least 8 characters.");

  const studentProfile = {
    name,
    fathersName: readString(profile, "fathersName", errors),
    passportNumber: normalizePassport(profile.passportNumber),
    passportExpiryDate: readDate(profile, "passportExpiryDate", errors),
    residencePermitExpiryDate: readDate(profile, "residencePermitExpiryDate", errors),
    countryOrNationality: readString(profile, "countryOrNationality", errors),
    university: readString(profile, "university", errors),
    faculty: readString(profile, "faculty", errors),
    department: readString(profile, "department", errors),
    academicYear: readString(profile, "academicYear", errors),
    apartmentNumber: readString(profile, "apartmentNumber", errors),
    roomNumber: readString(profile, "roomNumber", errors),
  };

  if (!studentProfile.passportNumber) {
    errors.push("studentProfile.passportNumber is required.");
  }

  return { value: { name, email, password, phone, studentProfile }, errors };
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
