import { MongoClient } from "mongodb";
import { config } from "./config.js";

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

/** Keep the email invariant enforced at the database level. */
export async function ensureIndexes() {
  await usersCollection().createIndex({ email: 1 }, { unique: true, name: "unique_email" });
}

export async function closeMongoDB() {
  if (client) await client.close();
  client = undefined;
}
