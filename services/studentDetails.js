import { ObjectId } from "mongodb";
import { SECTION_KEYS, studentDetailsCollection } from "../db.js";
import { findUserById } from "./users.js";

function toClientDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    _id: String(_id),
    userId: String(doc.userId),
  };
}

/** True when the id belongs to an existing student account. */
export async function isStudentAccount(userId) {
  const user = await findUserById(userId);
  return Boolean(user && user.role === "student");
}

/** Fetch all five sections for a student plus a completion count. */
export async function getStudentBundle(userId) {
  const objectId = new ObjectId(userId);
  const entries = await Promise.all(
    SECTION_KEYS.map(async (section) => {
      const doc = await studentDetailsCollection(section).findOne({ userId: objectId });
      return [section, toClientDoc(doc)];
    }),
  );

  const bundle = Object.fromEntries(entries);
  const completedSections = SECTION_KEYS.filter((section) => bundle[section]?.isCompleted).length;

  // Canonical account fields always come from Better Auth's `user` document.
  const account = await findUserById(userId);
  const user = account
    ? {
        name: account.name,
        email: account.email,
        roomNumber: account.roomNumber ?? null,
        flatNumber: account.flatNumber ?? null,
      }
    : null;

  return {
    userId: String(userId),
    user,
    ...bundle,
    completionSummary: { completedSections, totalSections: 5 },
  };
}

/** Upsert one section (one document per student per collection). */
export async function upsertStudentSection(userId, section, value) {
  const objectId = new ObjectId(userId);
  const filter = { userId: objectId };
  const now = new Date();

  await studentDetailsCollection(section).updateOne(
    filter,
    {
      $set: { ...value, userId: objectId, isCompleted: true, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  return toClientDoc(await studentDetailsCollection(section).findOne(filter));
}

/**
 * Partial edit by manager/supervisor: only the supplied fields are touched, so
 * `null` clears a value and omitted fields keep their current value.
 * Canonical user fields are rejected by validatePartialSection before this runs.
 */
export async function patchStudentSection(userId, section, fields) {
  const objectId = new ObjectId(userId);
  const filter = { userId: objectId };
  const now = new Date();

  await studentDetailsCollection(section).updateOne(
    filter,
    {
      $set: { ...fields, updatedAt: now },
      $setOnInsert: { userId: objectId, createdAt: now, isCompleted: false },
    },
    { upsert: true },
  );

  const saved = toClientDoc(await studentDetailsCollection(section).findOne(filter));
  const bundle = await getStudentBundle(userId);
  return { section: saved, bundle };
}
