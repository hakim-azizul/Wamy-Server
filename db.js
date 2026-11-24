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

export function usersCollection() {
  return getDb().collection("users");
}

export function studentDetailsCollection(section) {
  const name = STUDENT_DETAIL_COLLECTIONS[section];
  if (!name) throw new Error(`Unknown student detail section: ${section}`);
  return getDb().collection(name);
}

/** Enforce the invariants: unique email, and one detail document per student per section. */
export async function ensureIndexes() {
  await usersCollection().createIndex({ email: 1 }, { unique: true, name: "unique_email" });

  await Promise.all(
    SECTION_KEYS.map((section) =>
      studentDetailsCollection(section).createIndex(
        { userId: 1 },
        { unique: true, name: `unique_userId_${section}` },
      ),
    ),
  );
}

export async function closeMongoDB() {
  if (client) await client.close();
  client = undefined;
}
