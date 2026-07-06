import crypto from "crypto";
import { getCreditBalance, getUserPlanSnapshot, consumeCredits } from "./credits.js";
import db from "./db.js";

export const FREE_DAILY_LIMIT = 15;
export const FREE_MAX_FILE_MB = 100;
export const PAID_MAX_FILE_MB = 2048;
const VISITOR_COOKIE = "pg_vid";

db.exec(`
  CREATE TABLE IF NOT EXISTS visitor_usage_daily (
    visitor_id TEXT NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (visitor_id, day)
  );
`);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getVisitorId(req) {
  return req.cookies?.[VISITOR_COOKIE] || null;
}

export function ensureVisitorId(req, res) {
  let id = getVisitorId(req);
  if (!id) {
    id = crypto.randomBytes(16).toString("hex");
    res.cookie(VISITOR_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.API_URL && process.env.FRONTEND_URL ? "none" : "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }
  return id;
}

export function getUserDailyUsage(userId) {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM user_activity
         WHERE user_id = ? AND status = 'success'
         AND date(created_at) = date('now')`
      )
      .get(userId)?.c ?? 0
  );
}

export function getVisitorDailyUsage(visitorId) {
  if (!visitorId) return 0;
  return (
    db
      .prepare("SELECT count FROM visitor_usage_daily WHERE visitor_id = ? AND day = ?")
      .get(visitorId, todayKey())?.count ?? 0
  );
}

export function getDailyUsage(req, res) {
  if (req.user?.id) {
    if (getCreditBalance(req.user.id) > 0) {
      return 0;
    }
    return getUserDailyUsage(req.user.id);
  }
  const visitorId = ensureVisitorId(req, res);
  return getVisitorDailyUsage(visitorId);
}

export function getUsageSnapshot(req, res) {
  if (req.user?.id) {
    const plan = getUserPlanSnapshot(req.user.id);
    if (plan) {
      return {
        plan: plan.plan,
        limit: plan.limit,
        used: plan.used,
        remaining: plan.remaining,
        maxFileSizeMb: plan.maxFileSizeMb,
        creditBalance: plan.creditBalance,
      };
    }
  }

  const used = getDailyUsage(req, res);
  const limit = FREE_DAILY_LIMIT;
  return {
    plan: "free",
    limit,
    used,
    remaining: Math.max(0, limit - used),
    maxFileSizeMb: FREE_MAX_FILE_MB,
    creditBalance: 0,
  };
}

export function assertWithinDailyLimit(req, res) {
  const snapshot = getUsageSnapshot(req, res);

  if (req.user?.id && snapshot.creditBalance > 0) {
    if (snapshot.remaining <= 0) {
      const err = new Error("You have no conversion credits left. Buy a package to continue.");
      err.code = "NO_CREDITS";
      err.status = 429;
      err.usage = snapshot;
      throw err;
    }
    return snapshot;
  }

  if (snapshot.used >= snapshot.limit) {
    const err = new Error(
      `Daily limit reached (${FREE_DAILY_LIMIT} conversions per day on the Free plan). Buy a package or try again tomorrow.`
    );
    err.code = "DAILY_LIMIT";
    err.status = 429;
    err.usage = snapshot;
    throw err;
  }
  return snapshot;
}

export function recordVisitorUsage(req, res) {
  if (req.user?.id) return;
  const visitorId = ensureVisitorId(req, res);
  const day = todayKey();
  db.prepare(
    `INSERT INTO visitor_usage_daily (visitor_id, day, count) VALUES (?, ?, 1)
     ON CONFLICT(visitor_id, day) DO UPDATE SET count = count + 1`
  ).run(visitorId, day);
}

export function recordSuccessfulJob(req, res) {
  if (req.user?.id) {
    if (getCreditBalance(req.user.id) > 0) {
      consumeCredits(req.user.id, 1);
    }
    return;
  }
  recordVisitorUsage(req, res);
}
