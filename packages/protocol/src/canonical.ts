import { sha256 } from "@noble/hashes/sha2.js";
import { hex, utf8 } from "./encoding.js";

const MAX_CANONICAL_DEPTH = 64;

export function canonicalJson(value: unknown): string {
  return canonicalize(value, 0);
}

function canonicalize(value: unknown, depth: number): string {
  if (depth > MAX_CANONICAL_DEPTH) throw new Error("canonical JSON nesting exceeds maximum depth");
  if (value === undefined) throw new Error("canonical JSON requires a value");
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonical JSON requires finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item, depth + 1)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key], depth + 1)}`);
    return `{${entries.join(",")}}`;
  }
  throw new TypeError("unsupported canonical JSON value");
}

export function canonicalBytes(value: unknown): Uint8Array {
  return utf8(canonicalJson(value));
}

export function sha256Hex(value: Uint8Array): string {
  return hex(sha256(value));
}
