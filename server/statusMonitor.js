import db from "./db.js";

const HISTORY_DAYS = 90;

db.exec(`
  CREATE TABLE IF NOT EXISTS status_daily (
    day TEXT PRIMARY KEY,
    webinterface INTEGER NOT NULL DEFAULT 1,
    api INTEGER NOT NULL DEFAULT 1,
    conversions INTEGER NOT NULL DEFAULT 1
  );
`);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayKeys(count = HISTORY_DAYS) {
  const keys = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() - i);
    keys.push(copy.toISOString().slice(0, 10));
  }
  return keys;
}

export function recordDailyStatus({ webinterface, api, conversions }) {
  const day = todayKey();
  db.prepare(
    `INSERT INTO status_daily (day, webinterface, api, conversions)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       webinterface = excluded.webinterface,
       api = excluded.api,
       conversions = excluded.conversions`
  ).run(day, webinterface ? 1 : 0, api ? 1 : 0, conversions ? 1 : 0);
}

function getHistoryColumn(column) {
  const allowed = { webinterface: "webinterface", api: "api", conversions: "conversions" };
  const col = allowed[column];
  if (!col) throw new Error(`Invalid status column: ${column}`);

  const rows = db.prepare(`SELECT day, ${col} AS up FROM status_daily`).all();
  const map = new Map(rows.map((r) => [r.day, !!r.up]));
  const keys = dayKeys();
  return keys.map((day) => ({
    day,
    up: map.has(day) ? map.get(day) : true,
  }));
}

function uptimePercent(history) {
  if (!history.length) return 100;
  const up = history.filter((h) => h.up).length;
  return Math.round((up / history.length) * 100000) / 1000;
}

export function buildStatusSnapshot({
  apiOk,
  webOk,
  libreOffice,
  pdf2docx,
  tesseract,
  translate,
}) {
  const conversionsOk = libreOffice && tesseract;
  recordDailyStatus({
    webinterface: webOk,
    api: apiOk,
    conversions: conversionsOk,
  });

  const webHistory = getHistoryColumn("webinterface");
  const apiHistory = getHistoryColumn("api");
  const convHistory = getHistoryColumn("conversions");

  const endpointsOk = webOk && apiOk;
  const regionsOk = apiOk;
  const conversionsOperational = conversionsOk;

  const allOk = endpointsOk && conversionsOperational;

  return {
    overall: allOk ? "operational" : apiOk ? "degraded" : "outage",
    overallLabel: allOk
      ? "All services are online"
      : apiOk
        ? "Some services are degraded"
        : "Service outage",
    updatedAt: new Date().toISOString(),
    endpoints: {
      operational: endpointsOk,
      items: [
        {
          id: "webinterface",
          name: "Web interface",
          operational: webOk,
          uptimePercent: uptimePercent(webHistory),
          history: webHistory.map((h) => h.up),
        },
        {
          id: "api",
          name: "API",
          operational: apiOk,
          uptimePercent: uptimePercent(apiHistory),
          history: apiHistory.map((h) => h.up),
        },
      ],
    },
    regions: {
      operational: regionsOk,
      items: [
        {
          id: "primary",
          name: "Primary region",
          operational: regionsOk,
          detail: "PDF Gerage cloud infrastructure",
        },
      ],
    },
    conversions: {
      operational: conversionsOperational,
      uptimePercent: uptimePercent(convHistory),
      history: convHistory.map((h) => h.up),
      items: [
        { id: "libreoffice", name: "LibreOffice", operational: !!libreOffice, detail: "Documents & Office formats" },
        { id: "tesseract", name: "Tesseract OCR", operational: !!tesseract, detail: "Scan & image text" },
        { id: "pdf2docx", name: "pdf2docx", operational: !!pdf2docx, detail: "PDF to Word (Python)" },
        {
          id: "translate",
          name: "Translation",
          operational: !!(translate?.google?.available || translate?.primary),
          detail: translate?.primary ? `Primary: ${translate.primary}` : "Translation providers",
        },
      ],
    },
  };
}
