/**
 * Parse structured OCR lines into label / value rows for bordered tables.
 */
export function parseFormFields(structuredText) {
  const fields = [];
  const seen = new Set();

  for (const rawLine of String(structuredText || "").split(/\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("--- Page")) continue;

    let label = "";
    let value = "";

    const numbered = line.match(/^(\d+\.)\s*(.+?)\s{2,}(.+)$/);
    if (numbered) {
      label = `${numbered[1]} ${numbered[2].trim()}`;
      value = numbered[3].trim();
    } else {
      const split = line.match(/^(.{4,}?)\s{3,}(.+)$/);
      if (split) {
        label = split[1].trim();
        value = split[2].trim();
      } else {
        label = line;
        value = "";
      }
    }

    label = label.replace(/\s+/g, " ").trim();
    value = value.replace(/\s+/g, " ").trim();
    if (!label) continue;

    const key = `${label}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({ label, value });
  }

  return fields;
}
