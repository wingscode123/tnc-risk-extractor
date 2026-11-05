import { it } from "node:test";
import assert from "node:assert/strict";
import { compareDocuments } from "../src/compare.js";
it("reconstructs both source versions including repeated and blank lines", () => {
  const versions = [
    ["Pasal 1\nBiaya 100\nPasal 3", "Pasal 1\nBiaya 200\nPasal 3"],
    ["a\na\n\nb\n", "a\n\nb\na"],
    ["sama", "sama"],
    ["awal", "baru"],
    ["a\r\nb", "a\nb"],
  ];
  for (const [before, after] of versions) {
    const lines = compareDocuments(before, after);
    assert.equal(
      lines
        .filter((l) => l.kind !== "added")
        .map((l) => l.text)
        .join("\n"),
      before.replace(/\r\n?/g, "\n"),
    );
    assert.equal(
      lines
        .filter((l) => l.kind !== "removed")
        .map((l) => l.text)
        .join("\n"),
      after.replace(/\r\n?/g, "\n"),
    );
  }
});
it("identifies insertions/deletions and preserves whitespace differences", () => {
  assert.deepEqual(
    compareDocuments("Pasal 1\nBiaya 100", "Pasal 1\nBiaya 200").map(
      (l) => l.kind,
    ),
    ["same", "removed", "added"],
  );
  assert.equal(
    compareDocuments(" a ", "a").filter((l) => l.kind === "same").length,
    0,
  );
});
it("bounds comparison work and rejects empty or overlong input", () => {
  assert.throws(() => compareDocuments("", "b"), /kedua versi/);
  assert.throws(() => compareDocuments("a".repeat(50_001), "b"), /50.000/);
  assert.throws(
    () => compareDocuments(Array(501).fill("a").join("\n"), "b"),
    /500 baris/,
  );
  assert.equal(
    compareDocuments(
      Array(500).fill("a").join("\n"),
      Array(500).fill("b").join("\n"),
    ).length,
    1000,
  );
});
