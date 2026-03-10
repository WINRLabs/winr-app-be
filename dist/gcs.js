"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readJson = readJson;
exports.writeJson = writeJson;
exports.appendToArray = appendToArray;
exports.setPublic = setPublic;
const storage_1 = require("@google-cloud/storage");
const config_1 = require("./config");
const storage = new storage_1.Storage();
const bucket = storage.bucket(config_1.GCS_BUCKET);
function fullPath(path) {
    const base = config_1.GCS_PREFIX.replace(/\/$/, "");
    const p = path.replace(/^\//, "");
    return base ? `${base}/${p}` : p;
}
/**
 * Read JSON file from GCS, return null if not found.
 */
async function readJson(path) {
    const file = bucket.file(fullPath(path));
    try {
        const [contents] = await file.download();
        return JSON.parse(contents.toString("utf8"));
    }
    catch (err) {
        const code = err?.code;
        if (code === 404)
            return null;
        throw err;
    }
}
/**
 * Write/overwrite JSON file to GCS (pretty-printed).
 */
async function writeJson(path, data) {
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
async function appendToArray(path, item, maxItems = 8760) {
    const existing = await readJson(path);
    const arr = Array.isArray(existing) ? [...existing] : [];
    const itemTs = item?.timestamp;
    if (typeof itemTs === "number" && arr.length > 0) {
        const last = arr[arr.length - 1];
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
async function setPublic(path) {
    const file = bucket.file(fullPath(path));
    try {
        await file.makePublic();
    }
    catch {
        // Ignore if already public or bucket policy handles it
    }
}
//# sourceMappingURL=gcs.js.map