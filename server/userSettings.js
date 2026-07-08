import db from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    notify_usage_alerts INTEGER NOT NULL DEFAULT 1,
    notify_product_updates INTEGER NOT NULL DEFAULT 1,
    notify_billing INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const DEFAULTS = {
  notifyUsageAlerts: true,
  notifyProductUpdates: true,
  notifyBilling: true,
};

function rowToSettings(row) {
  if (!row) return { ...DEFAULTS };
  return {
    notifyUsageAlerts: Boolean(row.notify_usage_alerts),
    notifyProductUpdates: Boolean(row.notify_product_updates),
    notifyBilling: Boolean(row.notify_billing),
    updatedAt: row.updated_at,
  };
}

export function getUserSettings(userId) {
  const row = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId);
  return rowToSettings(row);
}

export function updateUserSettings(userId, patch) {
  const current = getUserSettings(userId);
  const next = {
    notifyUsageAlerts: patch.notifyUsageAlerts ?? current.notifyUsageAlerts,
    notifyProductUpdates: patch.notifyProductUpdates ?? current.notifyProductUpdates,
    notifyBilling: patch.notifyBilling ?? current.notifyBilling,
  };

  db.prepare(
    `INSERT INTO user_settings (user_id, notify_usage_alerts, notify_product_updates, notify_billing, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       notify_usage_alerts = excluded.notify_usage_alerts,
       notify_product_updates = excluded.notify_product_updates,
       notify_billing = excluded.notify_billing,
       updated_at = datetime('now')`
  ).run(
    userId,
    next.notifyUsageAlerts ? 1 : 0,
    next.notifyProductUpdates ? 1 : 0,
    next.notifyBilling ? 1 : 0
  );

  return getUserSettings(userId);
}

export function deleteUserAccount(userId) {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM user_activity WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_credits WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM credit_purchases WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_settings WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });
  tx();
}
