import { getUserPlanSnapshot } from "./credits.js";
import db from "./db.js";
import { getUserSettings } from "./userSettings.js";
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

const RANGE_SQL = {
  "24h": "datetime('now', '-1 day')",
  month: "datetime('now', 'start of month')",
  year: "datetime('now', '-1 year')",
  all: null,
};

const BUCKET_FMT = {
  hourly: "%Y-%m-%d %H:00",
  daily: "%Y-%m-%d",
  monthly: "%Y-%m",
};

export function getUsageChart(userId, range = "24h", granularity = "hourly") {
  const since = RANGE_SQL[range] ?? RANGE_SQL["24h"];
  const fmt = BUCKET_FMT[granularity] ?? BUCKET_FMT.hourly;
  const where = since
    ? `user_id = ? AND datetime(created_at) >= ${since}`
    : "user_id = ?";

  const rows = db
    .prepare(
      `SELECT strftime('${fmt}', created_at) AS bucket,
              SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
              SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS failed
       FROM user_activity
       WHERE ${where}
       GROUP BY bucket
       ORDER BY bucket ASC`
    )
    .all(userId);

  const totals = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
         SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS failed
       FROM user_activity
       WHERE ${where}`
    )
    .get(userId);

  return {
    points: rows.map((r) => ({
      label: r.bucket,
      success: r.success ?? 0,
      failed: r.failed ?? 0,
      total: (r.success ?? 0) + (r.failed ?? 0),
    })),
    successful: totals?.success ?? 0,
    failed: totals?.failed ?? 0,
    creditsConsumed: totals?.success ?? 0,
  };
}

export function getUserDashboard(userId, userEmail, userRow, chartOpts = {}) {
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
       ORDER BY datetime(created_at) DESC LIMIT 100`
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
  const chartRange = chartOpts.range || "24h";
  const chartGranularity = chartOpts.granularity || "hourly";
  const usageChart = getUsageChart(userId, chartRange, chartGranularity);

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
    usageChart: {
      range: chartRange,
      granularity: chartGranularity,
      ...usageChart,
    },
    security: {
      authProvider: userRow.google_id ? "google" : "email",
      hasPassword: Boolean(userRow.password_hash),
      googleConnected: Boolean(userRow.google_id),
    },
    settings: getUserSettings(userId),
  };
}

export { FREE_DAILY_LIMIT, FREE_MAX_FILE_MB };
