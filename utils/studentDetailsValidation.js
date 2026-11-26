import { readDate, readString } from "./validation.js";

const ENUMS = {
  gender: ["male", "female"],
  religion: ["muslim", "christian", "other"],
  maritalStatus: ["single", "married", "divorced", "widowed"],
  currentLevel: ["level_1", "level_2", "level_3", "level_4", "level_5"],
  studyType: ["general", "private", "external"],
  enrollmentStatus: ["regular", "probation", "suspended", "graduated"],
  scholarshipStatus: ["none", "partial", "full"],
};

/** Passport numbers are normalized to lowercase (with surrounding whitespace removed). */
const normalizePassport = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

function readEnum(body, field, errors, { required = true, nullable = false } = {}) {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") {
    if (required) errors.push(`${field} is required.`);
    return null;
  }
  if (typeof value !== "string" || !ENUMS[field].includes(value)) {
    errors.push(`${field} has an invalid value.`);
    return null;
  }
  return value;
}

function readNullableEnum(body, field, errors) {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !ENUMS[field].includes(value)) {
    errors.push(`${field} has an invalid value.`);
    return null;
  }
  return value;
}

function readNullableText(body, field, errors) {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    errors.push(`${field} must be a string.`);
    return null;
  }
  return value.trim();
}

function readNumber(body, field, errors, { required = true } = {}) {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") {
    if (required) errors.push(`${field} is required.`);
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    errors.push(`${field} must be a finite number.`);
    return null;
  }
  return number;
}

function readNullableNumber(body, field, errors) {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    errors.push(`${field} must be a finite number.`);
    return null;
  }
  return number;
}

/** Required when `required`, otherwise null when empty. Always a string[] when present. */
function readStringArray(body, field, errors, { required = true, nullable = false } = {}) {
  const value = body?.[field];
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    if (required) errors.push(`${field} must contain at least one value.`);
    return nullable ? null : [];
  }
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array of strings.`);
    return nullable ? null : [];
  }
  const cleaned = value.filter((item) => typeof item === "string" && item.trim() !== "").map((item) => item.trim());
  if (required && cleaned.length === 0) errors.push(`${field} must contain at least one value.`);
  return cleaned;
}

function validatePersonal(body, errors) {
  const passport = normalizePassport(body?.passport);
  if (!passport) errors.push("passport is required.");

  return {
    fullNameAr: readString(body, "fullNameAr", errors),
    fullNameEn: readString(body, "fullNameEn", errors),
    passport,
    passportExpiryDate: readDate(body, "passportExpiryDate", errors),
    iqamaExpiryDate: readDate(body, "iqamaExpiryDate", errors),
    universityStudentId: readString(body, "universityStudentId", errors),
    birthDate: readDate(body, "birthDate", errors),
    gender: readEnum(body, "gender", errors),
    nationality: readString(body, "nationality", errors),
    religion: readNullableEnum(body, "religion", errors),
    maritalStatus: readEnum(body, "maritalStatus", errors),
    detailedAddress: readString(body, "detailedAddress", errors),
    phone: readString(body, "phone", errors),
    personalEmail: readString(body, "personalEmail", errors),
    universityEmail: readNullableText(body, "universityEmail", errors),
    emergencyContactName: readString(body, "emergencyContactName", errors),
    emergencyPhone: readString(body, "emergencyPhone", errors),
  };
}

function validateAcademic(body, errors) {
  return {
    faculty: readString(body, "faculty", errors),
    department: readString(body, "department", errors),
    currentLevel: readEnum(body, "currentLevel", errors),
    currentSemester: readString(body, "currentSemester", errors),
    studyType: readEnum(body, "studyType", errors),
    enrollmentStatus: readEnum(body, "enrollmentStatus", errors),
    gpa: readNumber(body, "gpa", errors),
    completedCredits: readNumber(body, "completedCredits", errors),
    remainingCredits: readNumber(body, "remainingCredits", errors),
    enrollmentDate: readDate(body, "enrollmentDate", errors),
    expectedGraduationDate: readDate(body, "expectedGraduationDate", errors),
    academicAdvisor: readNullableText(body, "academicAdvisor", errors),
    graduationProject: readNullableText(body, "graduationProject", errors),
  };
}

function validateSkills(body, errors) {
  return {
    languages: readStringArray(body, "languages", errors),
    computerAndProgrammingSkills: readStringArray(body, "computerAndProgrammingSkills", errors, { required: false, nullable: true }),
    softSkills: readStringArray(body, "softSkills", errors, { required: false, nullable: true }),
    artisticTalents: readStringArray(body, "artisticTalents", errors, { required: false, nullable: true }),
    sportsTalents: readStringArray(body, "sportsTalents", errors, { required: false, nullable: true }),
    hobbiesAndInterests: readStringArray(body, "hobbiesAndInterests", errors),
    trainingCourses: readStringArray(body, "trainingCourses", errors, { required: false, nullable: true }),
    professionalCertificates: readStringArray(body, "professionalCertificates", errors, { required: false, nullable: true }),
    practicalExperience: readStringArray(body, "practicalExperience", errors, { required: false, nullable: true }),
  };
}

function validateAchievements(body, errors) {
  return {
    academicAwards: readStringArray(body, "academicAwards", errors, { required: false, nullable: true }),
    competitions: readStringArray(body, "competitions", errors, { required: false, nullable: true }),
    studentActivities: readStringArray(body, "studentActivities", errors, { required: false, nullable: true }),
    volunteering: readStringArray(body, "volunteering", errors, { required: false, nullable: true }),
    publicationsAndResearch: readStringArray(body, "publicationsAndResearch", errors, { required: false, nullable: true }),
  };
}

function validateAdditional(body, errors) {
  const provider = body?.scholarshipProvider;
  if (typeof provider !== "string") errors.push("scholarshipProvider must be a string.");

  return {
    iqScore: readNullableNumber(body, "iqScore", errors),
    aptitudeTestScores: readNullableText(body, "aptitudeTestScores", errors),
    scholarshipStatus: readEnum(body, "scholarshipStatus", errors),
    scholarshipProvider: typeof provider === "string" ? provider.trim() : "",
    generalNotes: readNullableText(body, "generalNotes", errors),
  };
}

const VALIDATORS = {
  personal: validatePersonal,
  academic: validateAcademic,
  skills: validateSkills,
  achievements: validateAchievements,
  additional: validateAdditional,
};

export function validateSection(section, body) {
  const errors = [];
  const validator = VALIDATORS[section];
  if (!validator) {
    return { value: null, errors: [`Unknown section '${section}'.`] };
  }
  const value = validator(body ?? {}, errors);
  return { value, errors };
}

/**
 * Partial-update validation for manager/supervisor edits.
 * Only fields actually supplied are validated, so untouched values are preserved.
 * Canonical user fields are always rejected here — they are read-only in detail records.
 */
const CANONICAL_USER_FIELDS = new Set([
  "_id", "userId", "email", "name", "roomNumber", "flatNumber",
  "status", "role", "password", "score", "isCompleted", "createdAt", "updatedAt",
]);

const FIELD_KINDS = {
  personal: {
    fullNameAr: "text", fullNameEn: "text", passport: "passport",
    passportExpiryDate: "date", iqamaExpiryDate: "date", universityStudentId: "text",
    birthDate: "date", gender: "enum", nationality: "text", religion: "nullableEnum",
    maritalStatus: "enum", detailedAddress: "text", phone: "text", personalEmail: "text",
    universityEmail: "nullableText", emergencyContactName: "text", emergencyPhone: "text",
  },
  academic: {
    faculty: "text", department: "text", currentLevel: "enum", currentSemester: "text",
    studyType: "enum", enrollmentStatus: "enum", gpa: "number", completedCredits: "number",
    remainingCredits: "number", enrollmentDate: "date", expectedGraduationDate: "date",
    academicAdvisor: "nullableText", graduationProject: "nullableText",
  },
  skills: {
    languages: "tags", computerAndProgrammingSkills: "nullableTags", softSkills: "nullableTags",
    artisticTalents: "nullableTags", sportsTalents: "nullableTags", hobbiesAndInterests: "tags",
    trainingCourses: "nullableTags", professionalCertificates: "nullableTags", practicalExperience: "nullableTags",
  },
  achievements: {
    academicAwards: "nullableTags", competitions: "nullableTags", studentActivities: "nullableTags",
    volunteering: "nullableTags", publicationsAndResearch: "nullableTags",
  },
  additional: {
    iqScore: "nullableNumber", aptitudeTestScores: "nullableText", scholarshipStatus: "enum",
    scholarshipProvider: "text", generalNotes: "nullableText",
  },
};

function coercePartialValue(kind, field, value, errors) {
  // An explicitly empty value clears the stored field.
  if (value === "" || value === null || value === undefined) return null;

  switch (kind) {
    case "text":
    case "nullableText":
      if (typeof value !== "string") {
        errors.push(`${field} must be a string.`);
        return undefined;
      }
      return value.trim() || null;
    case "passport": {
      if (typeof value !== "string") {
        errors.push(`${field} must be a string.`);
        return undefined;
      }
      const passport = normalizePassport(value);
      if (!passport) errors.push(`${field} cannot be empty.`);
      return passport;
    }
    case "date": {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        errors.push(`${field} must be a valid date.`);
        return undefined;
      }
      return date;
    }
    case "number":
    case "nullableNumber": {
      const number = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(number)) {
        errors.push(`${field} must be a finite number.`);
        return undefined;
      }
      return number;
    }
    case "enum":
    case "nullableEnum":
      if (typeof value !== "string" || !ENUMS[field]?.includes(value)) {
        errors.push(`${field} has an invalid value.`);
        return undefined;
      }
      return value;
    case "tags":
    case "nullableTags": {
      const list = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(/[،,]/)
          : null;
      if (!list) {
        errors.push(`${field} must be an array of strings.`);
        return undefined;
      }
      const cleaned = list
        .filter((item) => typeof item === "string" && item.trim() !== "")
        .map((item) => item.trim());
      return cleaned.length ? cleaned : null;
    }
    default:
      errors.push(`${field} has an unsupported type.`);
      return undefined;
  }
}

export function validatePartialSection(section, fields) {
  const errors = [];
  const kinds = FIELD_KINDS[section];
  if (!kinds) return { value: null, errors: [`Unknown section '${section}'.`] };

  const input = fields && typeof fields === "object" && !Array.isArray(fields) ? fields : {};
  const value = {};

  for (const [field, raw] of Object.entries(input)) {
    if (CANONICAL_USER_FIELDS.has(field)) {
      errors.push(`${field} belongs to the user record and cannot be edited here.`);
      continue;
    }
    if (!(field in kinds)) {
      errors.push(`${field} is not a field of the '${section}' section.`);
      continue;
    }
    const coerced = coercePartialValue(kinds[field], field, raw, errors);
    if (coerced !== undefined) value[field] = coerced;
  }

  return { value, errors };
}
