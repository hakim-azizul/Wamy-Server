import { ObjectId } from "mongodb";
import { scoreTransactionsCollection, userCollection } from "../db.js";

/** Minimal safe student view (no password — Better Auth user docs have none). */
function safeStudent(doc) {
  if (!doc) return null;
  const { password: _password, ...rest } = doc;
  return { ...rest, _id: String(doc._id), createdBy: doc.createdBy ? String(doc.createdBy) : null };
}

/**
 * Only managers may receive score-modifier attribution. Every other caller
 * gets the transaction with all actor identity fields removed entirely.
 */
function toClientTransaction(doc, includeActor = false) {
  if (!doc) return null;

  const base = {
    _id: String(doc._id),
    studentUserId: String(doc.studentUserId),
    studentEmail: doc.studentEmail,
    delta: doc.delta,
    previousScore: doc.previousScore,
    newScore: doc.newScore,
    reason: doc.reason,
    violationSeverity: doc.violationSeverity ?? null,
    severityLabel: doc.severityLabel ?? null,
    createdAt: doc.createdAt,
  };

  if (!includeActor) return base;

  return {
    ...base,
    actorUserId: String(doc.actorUserId),
    actorEmail: doc.actorEmail,
    actorName: doc.actorName ?? null,
    actorRole: doc.actorRole,
  };
}

/**
 * Atomically increment a student's score and append one transaction record.
 * `previousScore` is derived from the atomic result so concurrent updates
 * cannot log a stale previous value.
 */
export async function adjustStudentScore({
  studentUserId,
  delta,
  reason,
  violationSeverity,
  severityLabel,
  actor,
  includeActor = false,
}) {
  const objectId = new ObjectId(studentUserId);

  const student = await userCollection().findOneAndUpdate(
    { _id: objectId, role: "student" },
    { $inc: { score: delta }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!student) return null;

  const newScore = typeof student.score === "number" ? student.score : 0;
  const previousScore = newScore - delta;

  const transaction = {
    studentUserId: objectId,
    studentEmail: student.email,
    actorUserId: new ObjectId(actor._id),
    actorEmail: actor.email,
    actorName: actor.name,
    actorRole: actor.role,
    delta,
    previousScore,
    newScore,
    reason,
    violationSeverity: delta < 0 ? violationSeverity : null,
    severityLabel: delta < 0 ? severityLabel : null,
    createdAt: new Date(),
  };

  const result = await scoreTransactionsCollection().insertOne(transaction);

  return {
    transaction: toClientTransaction({ ...transaction, _id: result.insertedId }, includeActor),
    student: safeStudent(student),
  };
}

/** Newest-first transactions, optionally filtered by any fields. */
export async function listScoreTransactions(filter = {}, limit = 200, includeActor = false) {
  const docs = await scoreTransactionsCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => toClientTransaction(doc, includeActor));
}

/** Remove all history linked to a student (used by cascading account deletion). */
export async function deleteScoreTransactionsForStudent(userId) {
  const objectId = new ObjectId(userId);
  await scoreTransactionsCollection().deleteMany({ studentUserId: objectId });
}
