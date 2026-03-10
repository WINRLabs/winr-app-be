import { Storage } from "@google-cloud/storage";
import { GCS_BUCKET, GCS_PREFIX } from "./config";

const storage = new Storage();
const bucket = storage.bucket(GCS_BUCKET);

function fullPath(path: string): string {
  const base = GCS_PREFIX.replace(/\/$/, "");
  const p = path.replace(/^\//, "");
  return base ? `${base}/${p}` : p;
}

/**
 * Read JSON file from GCS, return null if not found.
 */
export async function readJson<T>(path: string): Promise<T | null> {
  const file = bucket.file(fullPath(path));
  try {
    const [contents] = await file.download();
    return JSON.parse(contents.toString("utf8")) as T;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 404) return null;
    throw err;
  }
}

/**
 * Write/overwrite JSON file to GCS (pretty-printed).
 */
export async function writeJson(path: string, data: unknown): Promise<void> {
  const file = bucket.file(fullPath(path));
  await file.save(JSON.stringify(data, null, 2), {
    contentType: "application/json",
  });
  await setPublic(path);
}

/**
 * Append item to a JSON array file (read → push → write).
 * Keeps last N items only (default: 8760 = 1 year of hourly data).
 * Skips append if last item has the same hour as current (dedup).
 */
export async function appendToArray(
  path: string,
  item: unknown,
  maxItems: number = 8760
): Promise<void> {
  const existing = await readJson<unknown[]>(path);
  const arr = Array.isArray(existing) ? [...existing] : [];

  const itemTs = (item as { timestamp?: number })?.timestamp;
  if (typeof itemTs === "number" && arr.length > 0) {
    const last = arr[arr.length - 1] as { timestamp?: number };
    const lastTs = last?.timestamp;
    if (typeof lastTs === "number") {
      const hourMs = 60 * 60 * 1000;
      if (Math.floor(lastTs / hourMs) === Math.floor(itemTs / hourMs)) {
        return; // same hour, skip duplicate
      }
    }
  }

  arr.push(item);
  const trimmed = arr.length > maxItems ? arr.slice(-maxItems) : arr;
  await writeJson(path, trimmed);
}

/**
 * Make file publicly readable.
 */
export async function setPublic(path: string): Promise<void> {
  const file = bucket.file(fullPath(path));
  try {
    await file.makePublic();
  } catch {
    // Ignore if already public or bucket policy handles it
  }
}
