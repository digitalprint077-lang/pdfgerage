import crypto from "crypto";
import db from "./db.js";
import { FREE_DAILY_LIMIT, FREE_MAX_FILE_MB, getUserDailyUsage } from "./usageLimits.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS user_credits (
    user_id INTEGER PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS credit_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    external_id TEXT UNIQUE,
    plan_type TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    provider TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

try {
  const cols = db.prepare("PRAGMA table_info(credit_purchases)").all();
  const names = cols.map((c) => c.name);
  if (names.includes("stripe_session_id") && !names.includes("external_id")) {
    db.exec("ALTER TABLE credit_purchases RENAME COLUMN stripe_session_id TO external_id");
  }
  if (!names.includes("provider")) {
    db.exec("ALTER TABLE credit_purchases ADD COLUMN provider TEXT NOT NULL DEFAULT 'manual'");
  }
} catch {
  /* migration best-effort */
}

export function generateOrderRef() {
  return `PG-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function getCreditBalance(userId) {
  if (!userId) return 0;
  return db.prepare("SELECT balance FROM user_credits WHERE user_id = ?").get(userId)?.balance ?? 0;
}

export function addCredits(userId, credits) {
  const amount = Math.max(0, Math.floor(Number(credits) || 0));
  if (!userId || amount <= 0) return getCreditBalance(userId);

  db.prepare(
    `INSERT INTO user_credits (user_id, balance, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       balance = balance + excluded.balance,
       updated_at = datetime('now')`
  ).run(userId, amount);

  return getCreditBalance(userId);
}

export function fulfillPurchase(externalId) {
  const row = db
    .prepare("SELECT user_id, credits, status FROM credit_purchases WHERE external_id = ?")
    .get(externalId);
  if (!row || row.status === "completed") return false;

  addCredits(row.user_id, row.credits);
  markPurchaseCompleted(externalId);
  return true;
}

export function consumeCredits(userId, amount = 1) {
  const cost = Math.max(1, Math.floor(Number(amount) || 1));
  const result = db
    .prepare(
      `UPDATE user_credits SET balance = balance - ?, updated_at = datetime('now')
       WHERE user_id = ? AND balance >= ?`
    )
    .run(cost, userId, cost);
  return result.changes === 1;
}

export function getUserPlanSnapshot(userId) {
  if (!userId) return null;

  const credits = getCreditBalance(userId);
  if (credits > 0) {
    return {
      plan: "package",
      name: "Package",
      limit: credits,
      used: 0,
      remaining: credits,
      maxFileSizeMb: 2048,
      creditBalance: credits,
    };
  }

  const usedToday = getUserDailyUsage(userId);
  return {
    plan: "free",
    name: "Free",
    limit: FREE_DAILY_LIMIT,
    used: usedToday,
    remaining: Math.max(0, FREE_DAILY_LIMIT - usedToday),
    maxFileSizeMb: FREE_MAX_FILE_MB,
    creditBalance: 0,
  };
}

export function recordPurchasePending({
  userId,
  externalId,
  planType,
  credits,
  amountCents,
  currency = "usd",
  provider = "manual",
}) {
  db.prepare(
    `INSERT OR IGNORE INTO credit_purchases (user_id, external_id, plan_type, credits, amount_cents, currency, provider, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).run(userId, externalId, planType, credits, amountCents, currency, provider);
}

export function markPurchaseCompleted(externalId) {
  return db.prepare("UPDATE credit_purchases SET status = 'completed' WHERE external_id = ?").run(externalId);
}

export function markPurchaseAwaitingReview(externalId) {
  return db
    .prepare("UPDATE credit_purchases SET status = 'awaiting_review' WHERE external_id = ? AND status = 'pending'")
    .run(externalId);
}

export function getPurchaseByExternalId(externalId, userId = null) {
  const row = db.prepare("SELECT * FROM credit_purchases WHERE external_id = ?").get(externalId);
  if (!row) return null;
  if (userId != null && row.user_id !== userId) return null;
  return row;
}

export function getUserPurchases(userId, limit = 50) {
  return db
    .prepare(
      `SELECT external_id, plan_type, credits, amount_cents, currency, provider, status, created_at
       FROM credit_purchases WHERE user_id = ?
       ORDER BY datetime(created_at) DESC LIMIT ?`
    )
    .all(userId, limit)
    .map((row) => ({
      orderId: row.external_id,
      planType: row.plan_type,
      credits: row.credits,
      amountUsd: row.amount_cents / 100,
      currency: row.currency,
      provider: row.provider,
      status: row.status,
      createdAt: row.created_at,
    }));
}
