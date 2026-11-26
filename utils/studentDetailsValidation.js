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
