import { ObjectId } from "mongodb";
import {
  accountCollection,
  SECTION_KEYS,
  sessionCollection,
  studentDetailsCollection,
  userCollection,
} from "../db.js";
import { config } from "../config.js";
import { normalizeEmail } from "../utils/validation.js";

/** Strip nothing sensitive: Better Auth user docs never contain a password. */
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
  return userCollection().findOne({ email: normalizeEmail(email) });
}

export async function findUserById(id) {
  if (!ObjectId.isValid(id)) return null;
  return userCollection().findOne({ _id: new ObjectId(id) });
}

/** Better Auth credential record containing the password hash for a user. */
export async function findCredentialByUserId(userId) {
  const id = typeof userId === "string" ? new ObjectId(userId) : userId;
  if (!ObjectId.isValid(id)) return null;
  return accountCollection().findOne({ userId: id, providerId: "credential" });
}

/**
 * Create an account through Better Auth's native sign-up flow so the `user`
 * document and `account` credential record match Better Auth's exact hash and
 * id format. Then add the app-specific fields to the same `user` document.
 */
async function signUpWithBetterAuth({ name, email, password }) {
  const response = await fetch(`${config.clientAuthUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: config.clientAuthUrl,
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.user?.id) {
    const error = new Error(
      data?.message || `Better Auth sign-up failed (${response.status})`,
    );
    if (response.status === 409) error.code = 11000; // maps to HTTP 409 in routes
    throw error;
  }
  return data.user;
}

export async function createUser({
  name,
  email,
  password,
  role,
  phone = null,
  createdBy = null,
  roomNumber = null,
  flatNumber = null,
}) {
  const authUser = await signUpWithBetterAuth({
    name,
    email: normalizeEmail(email),
    password,
  });

  const patch = {
    role,
    status: "active",
    phone: phone || null,
    createdBy: createdBy || null,
    updatedAt: new Date(),
  };
  // student-only fields: never attach these to manager / supervisor accounts.
  if (role === "student") {
    patch.score = config.initialReviewScore;
    patch.roomNumber = roomNumber;
    patch.flatNumber = flatNumber;
  }

  const doc = await userCollection().findOneAndUpdate(
    { _id: new ObjectId(authUser.id) },
    { $set: patch },
    { returnDocument: "after" },
  );
  return toSafeUser(doc);
}

export async function listUsers(filter = {}) {
  const docs = await userCollection().find(filter).sort({ createdAt: -1 }).toArray();
  return docs.map(toSafeUser);
}

export async function updateStudentScore(id, score) {
  if (!ObjectId.isValid(id)) return null;
  const result = await userCollection().findOneAndUpdate(
    { _id: new ObjectId(id), role: "student" },
    { $set: { score, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return toSafeUser(result);
}

/**
 * Delete a user and every record tied to them:
 * - the Better Auth `user` document,
 * - all `account` and `session` records for that userId,
 * - all 5 modular student detail documents when the user was a student.
 * Returns the deleted safe user, or null when the id was invalid/missing.
 */
export async function deleteUserCascade(id, role) {
  if (!ObjectId.isValid(id)) return null;
  const objectId = new ObjectId(id);
  const doc = await userCollection().findOneAndDelete({ _id: objectId });
  if (!doc) return null;

  await Promise.all([
    accountCollection().deleteMany({ userId: objectId }),
    sessionCollection().deleteMany({ userId: objectId }),
  ]);

  if (role === "student") {
    await Promise.all(
      SECTION_KEYS.map((section) =>
        studentDetailsCollection(section).deleteMany({ userId: objectId }),
      ),
    );
  }

  return toSafeUser(doc);
}
