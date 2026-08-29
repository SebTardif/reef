import { describe, expect, it } from "vitest";
import { canonicalBytes, canonicalJson } from "./canonical.js";

function nestObjects(depth: number): unknown {
  let value: unknown = { leaf: true };
  for (let index = 0; index < depth; index++) value = { n: value };
  return value;
}

describe("canonicalJson", () => {
  it("serializes null and treats an empty value as a validation error", () => {
    expect(canonicalJson(null)).toBe("null");
    let emptyError: unknown;
    try {
      canonicalJson(undefined);
    } catch (error) {
      emptyError = error;
    }
    expect(emptyError).toBeInstanceOf(Error);
    expect(emptyError).not.toBeInstanceOf(TypeError);
    expect((emptyError as Error).message).toMatch(/canonical JSON requires a value/i);
  });

  it("rejects about 4000 nested objects with a depth error instead of RangeError", () => {
    let depthError: unknown;
    try {
      canonicalJson(nestObjects(4000));
    } catch (error) {
      depthError = error;
    }
    expect(depthError).toBeInstanceOf(Error);
    expect(depthError).not.toBeInstanceOf(RangeError);
    expect((depthError as Error).message).toMatch(/nesting exceeds maximum depth/i);
  });

  it("still canonicalizes shallow objects, arrays, and null fields", () => {
    expect(canonicalJson({ b: 1, a: null })).toBe('{"a":null,"b":1}');
    expect(canonicalJson([1, null, "x"])).toBe('[1,null,"x"]');
    expect(canonicalBytes({ a: 1 })).toEqual(new TextEncoder().encode('{"a":1}'));
  });
});
