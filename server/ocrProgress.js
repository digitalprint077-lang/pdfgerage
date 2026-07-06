const store = new Map();
const TTL_MS = 15 * 60 * 1000;

export function setOcrProgress(id, data) {
  if (!id) return;
  store.set(id, { ...data, updatedAt: Date.now() });
}

export function getOcrProgress(id) {
  if (!id) return null;
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    store.delete(id);
    return null;
  }
  return entry;
}

export function clearOcrProgress(id) {
  if (id) store.delete(id);
}
