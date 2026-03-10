/**
 * Read JSON file from GCS, return null if not found.
 */
export declare function readJson<T>(path: string): Promise<T | null>;
/**
 * Write/overwrite JSON file to GCS (pretty-printed).
 */
export declare function writeJson(path: string, data: unknown): Promise<void>;
/**
 * Append item to a JSON array file (read → push → write).
 * Keeps last N items only (default: 8760 = 1 year of hourly data).
 * Skips append if last item has the same hour as current (dedup).
 */
export declare function appendToArray(path: string, item: unknown, maxItems?: number): Promise<void>;
/**
 * Make file publicly readable.
 */
export declare function setPublic(path: string): Promise<void>;
//# sourceMappingURL=gcs.d.ts.map