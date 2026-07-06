import crypto from "crypto";
import { getCreditBalance, getUserPlanSnapshot, consumeCredits } from "./credits.js";
import db from "./db.js";
import { sessionCookieOptions } from "./cookieOptions.js";

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

function clientFingerprint(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim();
  const ua = String(req.headers["user-agent"] || "unknown");
  return crypto.createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);
}

function fingerprintTrackingId(req) {
  return `fp:${clientFingerprint(req)}`;
}

export function ensureVisitorId(req, res) {
  let id = getVisitorId(req);
  if (!id) {
    id = crypto.randomBytes(16).toString("hex");
    res.cookie(VISITOR_COOKIE, id, {
      ...sessionCookieOptions(),
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }
  return id;
}

function readDailyCount(trackingId) {
  return (
    db.prepare("SELECT count FROM visitor_usage_daily WHERE visitor_id = ? AND day = ?").get(trackingId, todayKey())
      ?.count ?? 0
  );
}

function incrementDailyCount(trackingId, amount = 1) {
  const count = Math.max(1, Math.floor(Number(amount) || 1));
  const day = todayKey();
  db.prepare(
    `INSERT INTO visitor_usage_daily (visitor_id, day, count) VALUES (?, ?, ?)
     ON CONFLICT(visitor_id, day) DO UPDATE SET count = count + ?`
  ).run(trackingId, day, count, count);
}

export function getUserDailyUsage(userId) {
  const activityCount =
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM user_activity
         WHERE user_id = ? AND status = 'success'
         AND date(created_at) = date('now')`
      )
      .get(userId)?.c ?? 0;
  const counterCount = readDailyCount(`user:${userId}`);
  return Math.max(activityCount, counterCount);
}

/** Anonymous usage: max of cookie visitor id and IP fingerprint (cookie bypass protection). */
export function getAnonymousDailyUsage(req, res) {
  const cookieId = getVisitorId(req);
  const fpId = fingerprintTrackingId(req);
  const cookieCount = cookieId ? readDailyCount(cookieId) : 0;
  const fpCount = readDailyCount(fpId);
  if (!cookieId) {
    ensureVisitorId(req, res);
  }
  return Math.max(cookieCount, fpCount);
}

export function getDailyUsage(req, res) {
  if (req.user?.id) {
    if (getCreditBalance(req.user.id) > 0) {
      return 0;
    }
    return getUserDailyUsage(req.user.id);
  }
  return getAnonymousDailyUsage(req, res);
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

export function setUsageHeaders(res, snapshot) {
  if (!snapshot) return;
  res.setHeader("X-Usage-Used", String(snapshot.used));
  res.setHeader("X-Usage-Limit", String(snapshot.limit));
  res.setHeader("X-Usage-Remaining", String(snapshot.remaining));
  res.setHeader("X-Usage-Plan", snapshot.plan || "free");
}

export function conversionJobCount(operation, fileCount) {
  const files = Math.max(0, Math.floor(Number(fileCount) || 0));
  if (files === 0) return 1;
  if (operation === "merge" || operation === "create-archive") return 1;
  return files;
}

export function assertWithinDailyLimit(req, res, pendingJobs = 1) {
  const jobs = Math.max(1, Math.floor(Number(pendingJobs) || 1));
  const snapshot = getUsageSnapshot(req, res);

  if (req.user?.id && snapshot.creditBalance > 0) {
    if (snapshot.remaining < jobs) {
      const err = new Error(
        snapshot.remaining <= 0
          ? "You have no conversion credits left. Buy a package to continue."
          : `This job converts ${jobs} file${jobs === 1 ? "" : "s"} but you only have ${snapshot.remaining} credit${snapshot.remaining === 1 ? "" : "s"} left.`
      );
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

  if (snapshot.used + jobs > snapshot.limit) {
    const remaining = Math.max(0, snapshot.limit - snapshot.used);
    const err = new Error(
      remaining <= 0
        ? `Daily limit reached (${FREE_DAILY_LIMIT} conversions per day on the Free plan). Buy a package or try again tomorrow.`
        : `This job converts ${jobs} file${jobs === 1 ? "" : "s"} but you only have ${remaining} free conversion${remaining === 1 ? "" : "s"} left today. Remove extra files or buy credits.`
    );
    err.code = "DAILY_LIMIT";
    err.status = 429;
    err.usage = snapshot;
    throw err;
  }

  return snapshot;
}

export function recordVisitorUsage(req, res, amount = 1) {
  if (req.user?.id) return;
  const cookieId = ensureVisitorId(req, res);
  incrementDailyCount(cookieId, amount);
  incrementDailyCount(fingerprintTrackingId(req), amount);
}

export function recordSuccessfulJob(req, res, amount = 1) {
  const count = Math.max(1, Math.floor(Number(amount) || 1));
  if (req.user?.id) {
    if (getCreditBalance(req.user.id) > 0) {
      consumeCredits(req.user.id, count);
      return;
    }
    incrementDailyCount(`user:${req.user.id}`, count);
    return;
  }
  recordVisitorUsage(req, res, count);
}
