import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Compile only the pure recommendation dependency graph, using existing TS.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const out = mkdtempSync(join(tmpdir(), "fff-upsell-"));
try {
  const compiled = spawnSync(process.execPath, [
    require.resolve("typescript/bin/tsc"), "lib/upsell.ts", "--outDir", out,
    "--module", "commonjs", "--target", "es2020", "--skipLibCheck", "--strict",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
  const { getUpsellGroups } = require(join(out, "lib/upsell.js"));
  const { getAvailableItems, resolveLine } = require(join(out, "lib/menu.js"));
  const evaluate = ids => getUpsellGroups(ids.map(itemId => ({ itemId })));
  const cases = [
    [[], []],
    [["unknown"], []],
    [["hamburger-tradicional"], ["drink", "side"]],
    [["coca-cola"], ["eat"]],
    [["pomfrit"], ["drink", "eat"]],
    [["hamburger-tradicional", "pomfrit"], ["drink"]],
    [["coca-cola", "pomfrit"], ["eat"]],
    [["hamburger-tradicional", "coca-cola"], ["side"]],
    [["hamburger-tradicional", "coca-cola", "pomfrit"], []],
  ];
  for (const [ids, kinds] of cases) {
    const groups = evaluate(ids);
    assert.deepEqual(groups.map(g => g.kind), kinds);
    const suggestions = groups.flatMap(g => g.suggestions);
    assert.equal(new Set(suggestions.map(s => s.key)).size, suggestions.length);
    for (const s of suggestions) {
      assert.ok(!ids.includes(s.item.id), "Never suggest an existing item");
      assert.ok(s.item.available);
      assert.equal(s.input.quantity, 1);
      assert.deepEqual(s.input.modifierIds, []);
      assert.equal(s.display.unitPriceCents, resolveLine(s.item, s.input.variantId, []).unitPriceCents);
    }
  }
  assert.equal(evaluate(["hotdog"])[0].suggestions.length, 5);
  assert.equal(evaluate(["coca-cola"])[0].suggestions.length, 6);
  for (const item of getAvailableItems()) {
    const groups = evaluate([item.id]);
    assert.deepEqual(groups.map(g => g.kind), item.category === "pije" ? ["eat"] : item.category === "shtesa" ? ["drink", "eat"] : ["drink", "side"]);
  }
  assert.deepEqual(evaluate(["coca-cola", "coca-cola"]), evaluate(["coca-cola"]));
  console.log("PASS: all category combinations, every menu item, duplicate/unknown IDs, canonical prices, defaults and exclusion rules.");
} finally {
  rmSync(out, { recursive: true, force: true });
}
