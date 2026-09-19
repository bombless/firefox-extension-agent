import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

async function loadExtensionProtocol() {
  const filename = path.resolve("..", "extension", "protocol.js");
  const source = await fs.readFile(filename, "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(source, context, { filename });
  return context.globalThis.AgentProtocol;
}

test("extractActionBlocks handles nested arrays", async () => {
  const protocol = await loadExtensionProtocol();
  const blocks = protocol.extractActionBlocks(
    'prefix @actions[{"tool":"x","params":{"a":[1,2,3]}}] suffix'
  );
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].actions[0].params.a, [1, 2, 3]);
});

test("extractActionBlocks respects brackets inside strings", async () => {
  const protocol = await loadExtensionProtocol();
  const text = '@actions[{"tool":"x","params":{"text":"] \\\""}}]';
  const blocks = protocol.extractActionBlocks(text);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].actions[0].params.text, '] "');
});

test("extractActionBlocks ignores incomplete JSON", async () => {
  const protocol = await loadExtensionProtocol();
  assert.deepEqual(protocol.extractActionBlocks('@actions[{"tool":"x"}'), []);
});

test("extractActionBlocks finds multiple blocks", async () => {
  const protocol = await loadExtensionProtocol();
  const blocks = protocol.extractActionBlocks(
    '@actions[{"tool":"x","params":{}}] text @actions[{"tool":"y","params":{}}]'
  );
  assert.equal(blocks.length, 2);
  assert.equal(blocks[1].actions[0].tool, "y");
});

test("workspace guard blocks traversal and symlink escape", async () => {
  const { createWorkspaceGuard } = await import("../src/security.js");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fx-agent-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "fx-agent-outside-"));

  try {
    await fs.writeFile(path.join(root, "inside.txt"), "ok");
    await fs.writeFile(path.join(outside, "secret.txt"), "secret");
    await fs.symlink(outside, path.join(root, "escape"));

    const guard = await createWorkspaceGuard(root);

    await assert.rejects(
      guard.resolveSafePath("../../etc/passwd"),
      /escapes workspace/
    );

    await assert.rejects(
      guard.resolveSafePath("/escape/secret.txt"),
      /escapes workspace/
    );

    assert.equal(
      await fs.readFile(await guard.resolveSafePath("/inside.txt"), "utf8"),
      "ok"
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});
