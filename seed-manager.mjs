import "dotenv/config";
import { verifyPassword } from "better-auth/crypto";
import {
  closeMongoDB,
  connectToMongoDB,
  getDb,
} from "./db.js";

const CLIENT_AUTH_URL =
  process.env.CLIENT_URL ||
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  "http://localhost:3000";
const MANAGER_NAME = "System Manager";
const MANAGER_EMAIL = "manager@wamy.org";
const MANAGER_PASSWORD = "Manager@1234";

async function dropLegacyUsersCollection(db) {
  try {
    await db.collection("users").drop();
    console.log("Dropped legacy plural 'users' collection.");
  } catch (err) {
    if (err?.codeName === "NamespaceNotFound") return; // already absent
    console.error("Could not drop legacy 'users' collection:", err.message);
  }
}

async function seedManager() {
  try {
    await connectToMongoDB();
    const db = getDb();

    // Better Auth is the only account store: singular `user` + `account`.
    const userCol = db.collection("user");
    const accountCol = db.collection("account");
    const email = MANAGER_EMAIL.trim().toLowerCase();

    // Remove the duplicate collection left behind by the old scrypt-based code.
    await dropLegacyUsersCollection(db);

    let existing = await userCol.findOne({ email });

    if (!existing) {
      // Native Better Auth sign-up creates BOTH `user` and `account` credentials
      // with Better Auth's exact password hash and userId format.
      const response = await fetch(`${CLIENT_AUTH_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: CLIENT_AUTH_URL,
        },
        body: JSON.stringify({
          name: MANAGER_NAME,
          email,
          password: MANAGER_PASSWORD,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          `Better Auth sign-up failed (${response.status}): ${data?.message || JSON.stringify(data)}`,
        );
      }

      existing = await userCol.findOne({ email });
      if (!existing) {
        throw new Error(
          "User created via Better Auth but not found in 'user'. Check DB_NAME in both client and server.",
        );
      }
    }

    // App-specific role/status live on the SAME Better Auth user document.
    await userCol.updateOne(
      { _id: existing._id },
      { $set: { role: "manager", status: "active", updatedAt: new Date() } },
    );

    const account = await accountCol.findOne({
      userId: existing._id,
      providerId: "credential",
    });
    if (!account?.password) {
      throw new Error("Manager has no Better Auth credential record in 'account'.");
    }

    const passwordMatches = await verifyPassword({
      hash: account.password,
      password: MANAGER_PASSWORD,
    });
    if (!passwordMatches) {
      throw new Error("Seeded credentials do not verify with Better Auth.");
    }

    const remainingLegacy = await db.collection("users").countDocuments();
    console.log("First manager ready in Better Auth 'user' collection!");
    console.log({
      _id: existing._id.toString(),
      name: MANAGER_NAME,
      email,
      role: "manager",
      legacyUsersCount: remainingLegacy,
      credentialsVerified: passwordMatches,
    });
  } catch (err) {
    console.error("Failed to seed manager:", err);
    process.exitCode = 1;
  } finally {
    await closeMongoDB();
    if (!process.exitCode) process.exit(0);
  }
}

seedManager();
