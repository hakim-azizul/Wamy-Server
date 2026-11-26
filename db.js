import { MongoClient } from "mongodb";
import { config } from "./config.js";

/** section key -> MongoDB collection name (one collection per student detail form). */
export const STUDENT_DETAIL_COLLECTIONS = Object.freeze({
  personal: "student_personal_info",
  academic: "student_academic_info",
  skills: "student_skills_talents",
  achievements: "student_achievements",
  additional: "student_additional_info",
});

export const SECTION_KEYS = Object.keys(STUDENT_DETAIL_COLLECTIONS);

let client;

export async function connectToMongoDB() {
  if (!config.dbUri) {
    throw new Error("DB_URI is not set. Add it to wamy-server/.env");
  }

  if (client) return client;

  client = new MongoClient(config.dbUri);

  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    client = undefined;
    console.dir(err);
    throw err;
  }
}

export function getDb() {
  if (!client) throw new Error("MongoDB is not connected. Call connectToMongoDB() first.");
  return client.db(config.dbName);
}

/** Better Auth's SINGULAR user collection is the only account source of truth. */
export function userCollection() {
  return getDb().collection("user");
}

/** Better Auth stores email/password credentials here (providerId: "credential"). */
export function accountCollection() {
  return getDb().collection("account");
}

/** Better Auth sessions, keyed by userId. */
export function sessionCollection() {
  return getDb().collection("session");
}

/** Single collection holding every score change (increases and decreases). */
export function scoreTransactionsCollection() {
  return getDb().collection("score_transactions");
}

export function studentDetailsCollection(section) {
  const name = STUDENT_DETAIL_COLLECTIONS[section];
  if (!name) throw new Error(`Unknown student detail section: ${section}`);
  return getDb().collection(name);
}

/**
 * Only maintain indexes for OUR modular student collections.
 * Better Auth owns the indexes for `user` / `account` / `session` — never create
 * a legacy plural `users` collection here.
 */
export async function ensureIndexes() {
  await Promise.all([
    ...SECTION_KEYS.map((section) =>
      studentDetailsCollection(section).createIndex(
        { userId: 1 },
        { unique: true, name: `unique_userId_${section}` },
      ),
    ),
    scoreTransactionsCollection().createIndex(
      { studentUserId: 1, createdAt: -1 },
      { name: "student_score_history" },
    ),
  ]);
}

export async function closeMongoDB() {
  if (client) await client.close();
  client = undefined;
}
