import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { usersCollection } from "../db.js";
import { hashPassword } from "../utils/password.js";
import { normalizeEmail } from "../utils/validation.js";

/** Strip the password hash before any response. createdBy is the creator's NAME. */
export function toSafeUser(doc) {
  if (!doc) return null;
  const { password: _password, ...rest } = doc;
  return {
    ...rest,
    _id: String(doc._id),
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
  };
}

export async function findUserByEmail(email) {
  return usersCollection().findOne({ email: normalizeEmail(email) });
}

export async function findUserById(id) {
  if (!ObjectId.isValid(id)) return null;
  return usersCollection().findOne({ _id: new ObjectId(id) });
}

/**
 * Create a lightweight user account in the single `users` collection.
 * Role is always supplied by the route (never trusted from the request body).
 * `score` is added ONLY to student accounts; detailed profiles live in the
 * five separate student detail collections.
 */
export async function createUser({ name, email, password, role, phone = null, createdBy = null }) {
  const now = new Date();
  const doc = {
    name,
    email: normalizeEmail(email),
    password: hashPassword(password),
    role,
    status: "active",
    phone: phone || null,
    createdBy: createdBy || null,
    createdAt: now,
    updatedAt: now,
  };

  if (role === "student") {
    doc.score = config.initialReviewScore;
  }

  const result = await usersCollection().insertOne(doc);
  return toSafeUser({ ...doc, _id: result.insertedId });
}

export async function listUsers(filter = {}) {
  const docs = await usersCollection().find(filter).sort({ createdAt: -1 }).toArray();
  return docs.map(toSafeUser);
}

export async function updateStudentScore(id, score) {
  if (!ObjectId.isValid(id)) return null;
  const result = await usersCollection().findOneAndUpdate(
    { _id: new ObjectId(id), role: "student" },
    { $set: { score, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return toSafeUser(result);
}
