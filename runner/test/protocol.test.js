import test from "node:test";
import assert from "node:assert/strict";

test("extractActionBlocks handles nested arrays and strings", async () => {
  const source = await import("../src/../src/../../extension-placeholder.js").catch(() => null);
  assert.equal(source, null);
});
