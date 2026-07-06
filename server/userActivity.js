import { getUserPlanSnapshot } from "./credits.js";
import db from "./db.js";
import { FREE_DAILY_LIMIT, FREE_MAX_FILE_MB, getUserDailyUsage } from "./usageLimits.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS user_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    operation TEXT NOT NULL,
    from_format TEXT NOT NULL DEFAULT '',
    to_format TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'success',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at);
`);

export function recordUserActivity({ userId, operation, fromFormat = "", toFormat = "", fileName = "", status = "success" }) {
  if (!userId) return;
  db.prepare(
    `INSERT INTO user_activity (user_id, operation, from_format, to_format, file_name, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, operation, fromFormat, toFormat, fileName, status);
}

function mapActivityRow(row) {
  return {
    id: row.id,
    operation: row.operation,
    fromFormat: row.from_format,
    toFormat: row.to_format,
    fileName: row.file_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function getUserDashboard(userId, userEmail, userRow) {
  const totalConversions =
    db.prepare("SELECT COUNT(*) AS c FROM user_activity WHERE user_id = ? AND status = 'success'").get(userId)?.c ?? 0;

  const thisMonth =
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM user_activity
         WHERE user_id = ? AND status = 'success'
         AND created_at >= datetime('now', 'start of month')`
      )
      .get(userId)?.c ?? 0;

  const usedToday = getUserDailyUsage(userId);

  const ocrJobs =
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM user_activity
         WHERE user_id = ? AND operation = 'ocr' AND status = 'success'`
      )
      .get(userId)?.c ?? 0;

  const translateJobs =
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM user_activity
         WHERE user_id = ? AND operation = 'translate' AND status = 'success'`
      )
      .get(userId)?.c ?? 0;

  const mergeJobs =
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM user_activity
         WHERE user_id = ? AND operation = 'merge' AND status = 'success'`
      )
      .get(userId)?.c ?? 0;

  const recentRows = db
    .prepare(
      `SELECT id, operation, from_format, to_format, file_name, status, created_at
       FROM user_activity WHERE user_id = ?
       ORDER BY datetime(created_at) DESC LIMIT 30`
    )
    .all(userId);

  const lastActivity = recentRows[0]?.created_at ?? null;

  const supportMessages =
    db.prepare("SELECT COUNT(*) AS c FROM contact_messages WHERE email = ? COLLATE NOCASE").get(userEmail)?.c ?? 0;

  const operationBreakdown = db
    .prepare(
      `SELECT operation, COUNT(*) AS count FROM user_activity
       WHERE user_id = ? AND status = 'success'
       GROUP BY operation ORDER BY count DESC LIMIT 6`
    )
    .all(userId)
    .map((r) => ({ operation: r.operation, count: r.count }));

  const planSnapshot = getUserPlanSnapshot(userId);

  return {
    stats: {
      totalConversions,
      thisMonth,
      usedToday,
      ocrJobs,
      translateJobs,
      mergeJobs,
    },
    plan: {
      name: planSnapshot.name,
      id: planSnapshot.plan,
      dailyLimit: planSnapshot.limit,
      usedToday: planSnapshot.plan === "free" ? usedToday : 0,
      remainingToday: planSnapshot.remaining,
      maxFileSizeMb: planSnapshot.maxFileSizeMb,
      creditBalance: planSnapshot.creditBalance,
    },
    recentActivity: recentRows.map(mapActivityRow),
    operationBreakdown,
    supportMessages,
    lastActivityAt: lastActivity,
    security: {
      authProvider: userRow.google_id ? "google" : "email",
      hasPassword: Boolean(userRow.password_hash),
      googleConnected: Boolean(userRow.google_id),
    },
  };
}

export { FREE_DAILY_LIMIT, FREE_MAX_FILE_MB };
