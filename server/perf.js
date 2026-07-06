export function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function envBool(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).toLowerCase());
}

export async function mapConcurrent(items, limit, mapper) {
  if (!items.length) return [];
  const size = Math.max(1, Math.min(limit, items.length));
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: size }, worker));
  return results;
}
