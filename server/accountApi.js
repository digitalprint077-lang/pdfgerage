import bcrypt from "bcryptjs";
import db from "./db.js";
import { getUserPurchases } from "./credits.js";
import { deleteUserAccount, getUserSettings, updateUserSettings } from "./userSettings.js";
import { sessionCookieOptions } from "./cookieOptions.js";

const AUTH_COOKIE = "auth_token";

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, sessionCookieOptions());
}

export function settingsGetHandler(req, res) {
  try {
    res.json({ settings: getUserSettings(req.userRow.id) });
  } catch (err) {
    console.error("settings get error:", err);
    res.status(500).json({ error: "Could not load settings" });
  }
}

export function settingsUpdateHandler(req, res) {
  try {
    const body = req.body || {};
    const patch = {};

    if (typeof body.notifyUsageAlerts === "boolean") patch.notifyUsageAlerts = body.notifyUsageAlerts;
    if (typeof body.notifyProductUpdates === "boolean") patch.notifyProductUpdates = body.notifyProductUpdates;
    if (typeof body.notifyBilling === "boolean") patch.notifyBilling = body.notifyBilling;

    const settings = updateUserSettings(req.userRow.id, patch);
    res.json({ settings });
  } catch (err) {
    console.error("settings update error:", err);
    res.status(500).json({ error: "Could not save settings" });
  }
}

export function invoicesHandler(req, res) {
  try {
    const purchases = getUserPurchases(req.userRow.id);
    res.json({ invoices: purchases });
  } catch (err) {
    console.error("invoices error:", err);
    res.status(500).json({ error: "Could not load invoices" });
  }
}

export async function deleteAccountHandler(req, res) {
  try {
    const emailConfirm = String(req.body?.emailConfirm || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (emailConfirm !== req.userRow.email.toLowerCase()) {
      return res.status(400).json({ error: "Email confirmation does not match your account." });
    }

    if (req.userRow.password_hash) {
      if (!password) {
        return res.status(400).json({ error: "Password is required to delete this account." });
      }
      const ok = await bcrypt.compare(password, req.userRow.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Password is incorrect." });
      }
    }

    deleteUserAccount(req.userRow.id);
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (err) {
    console.error("delete account error:", err);
    res.status(500).json({ error: "Could not delete account" });
  }
}

export function activityExportHandler(req, res) {
  try {
    const rows = db
      .prepare(
        `SELECT operation, from_format, to_format, file_name, status, created_at
         FROM user_activity WHERE user_id = ?
         ORDER BY datetime(created_at) DESC`
      )
      .all(req.userRow.id);

    const header = "Date,Operation,From,To,File,Status\n";
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [r.created_at, r.operation, r.from_format, r.to_format, r.file_name, r.status].map(escape).join(",")
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="pdfgerage-activity.csv"');
    res.send(header + lines.join("\n"));
  } catch (err) {
    console.error("activity export error:", err);
    res.status(500).json({ error: "Could not export activity" });
  }
}
