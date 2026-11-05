import { it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp } from "../server.js";
import { isAnalysis, riskSummary } from "../src/analysis.js";

type Options = Parameters<typeof createApp>[0];
const ok = async () => ({ result: { daftar_risiko: [] }, modelUsed: "fake" });
async function fixture(options: Options = {}) {
  const app = await createApp({
    withFrontend: false,
    analyzeImpl: ok,
    ...options,
  });
  const server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    url,
    post: (text: string) =>
      fetch(`${url}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
    quota: async () => (await fetch(`${url}/api/quotas/me`)).json(),
    close: () =>
      new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r()))),
  };
}
it("coalesces identical concurrent requests and spends one quota", async () => {
  let release!: () => void;
  let started!: () => void;
  let calls = 0;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const ready = new Promise<void>((r) => {
    started = r;
  });
  const f = await fixture({
    analyzeImpl: async () => {
      calls++;
      started();
      await gate;
      return ok();
    },
  });
  try {
    const first = f.post("identical");
    await ready;
    const second = f.post("identical");
    assert.equal((await f.quota()).pending, 1);
    release();
    const results = await Promise.all([first, second]);
    assert.deepEqual(
      results.map((r) => r.status),
      [200, 200],
    );
    assert.equal(results[1].headers.get("x-cache"), "COALESCED");
    assert.equal(calls, 1);
    assert.equal((await f.quota()).used, 1);
  } finally {
    release();
    await f.close();
  }
});
it("validates each AI item and exact risk enum", () => {
  for (const item of [
    null,
    {},
    { pasal_terkait: 5 },
    {
      pasal_terkait: "a",
      tingkat_risiko: "Tinggi sekali",
      penjelasan_bahasa_manusia: "b",
    },
  ]) {
    assert.equal(isAnalysis({ daftar_risiko: [item] }), false);
  }
  assert.equal(isAnalysis({ daftar_risiko: [] }), true);
  assert.equal(
    riskSummary({
      daftar_risiko: Array.from({ length: 5 }, () => ({
        pasal_terkait: "a",
        tingkat_risiko: "Tinggi",
        penjelasan_bahasa_manusia: "b",
      })),
    }).score,
    0,
  );
});
it("enforces three successes while cache hits remain free", async () => {
  let calls = 0;
  const f = await fixture({
    analyzeImpl: async () => {
      calls++;
      return ok();
    },
  });
  try {
    for (const text of ["dokumen a", "dokumen b", "dokumen c"])
      assert.equal((await f.post(text)).status, 200);
    const denied = await f.post("dokumen d");
    assert.equal(denied.status, 429);
    assert.ok(denied.headers.get("retry-after"));
    const cached = await f.post("dokumen a");
    assert.equal(cached.status, 200);
    assert.equal(cached.headers.get("x-cache"), "HIT");
    assert.equal(calls, 3);
    assert.equal((await f.quota()).used, 3);
  } finally {
    await f.close();
  }
});
it("does not spend quota on failures or malformed AI items", async () => {
  let attempts = 0;
  const f = await fixture({
    analyzeImpl: async () => {
      attempts++;
      if (attempts === 1) throw new Error("private provider detail");
      return { result: { daftar_risiko: [null] } as never, modelUsed: "fake" };
    },
  });
  try {
    const failed = await f.post("a");
    assert.equal(failed.status, 500);
    assert.doesNotMatch(await failed.text(), /private provider/);
    assert.equal((await f.post("b")).status, 503);
    const quota = await f.quota();
    assert.equal(quota.used, 0);
    assert.equal(quota.pending, 0);
  } finally {
    await f.close();
  }
});
it("reserves concurrent requests before calling the provider", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  let started = 0;
  let ready!: () => void;
  const allStarted = new Promise<void>((r) => {
    ready = r;
  });
  const f = await fixture({
    analyzeImpl: async () => {
      if (++started === 3) ready();
      await gate;
      return ok();
    },
  });
  try {
    const first = ["one", "two", "three"].map((text) => f.post(text));
    await allStarted;
    assert.equal((await f.quota()).pending, 3);
    assert.equal((await f.post("four")).status, 429);
    release();
    assert.deepEqual(
      (await Promise.all(first)).map((r) => r.status),
      [200, 200, 200],
    );
    assert.equal((await f.quota()).used, 3);
  } finally {
    release();
    await f.close();
  }
});
it("resets quota on UTC day boundary", async () => {
  let time = Date.parse("2026-11-03T23:59:59Z");
  const f = await fixture({ now: () => time });
  try {
    await f.post("yesterday");
    assert.equal((await f.quota()).used, 1);
    time += 2000;
    const q = await f.quota();
    assert.equal(q.used, 0);
    assert.equal(q.resetAt, "2026-11-05T00:00:00.000Z");
  } finally {
    await f.close();
  }
});
it("bounds wait time, aborts provider and releases quota", async () => {
  let signal: AbortSignal | undefined;
  const f = await fixture({
    analysisTimeoutMs: 20,
    analyzeImpl: async (_text, s) => {
      signal = s;
      return new Promise(() => {});
    },
  });
  try {
    const r = await f.post("timeout");
    assert.equal(r.status, 503);
    assert.equal(signal?.aborted, true);
    assert.equal((await f.quota()).remaining, 3);
  } finally {
    await f.close();
  }
});
it("returns JSON errors for malformed, oversized and missing bodies", async () => {
  const f = await fixture();
  try {
    for (const [body, status] of [
      ["{", 400],
      [JSON.stringify({ text: "a".repeat(1_100_000) }), 413],
      ["null", 400],
    ] as const) {
      const r = await fetch(`${f.url}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      assert.equal(r.status, status);
      assert.equal(typeof (await r.json()).error, "string");
    }
    const empty = await fetch(`${f.url}/api/analyze`, { method: "POST" });
    assert.equal(empty.status, 400);
    const missing = await fetch(`${f.url}/api/not-a-route`);
    assert.equal(missing.status, 404);
    assert.ok((await missing.json()).error);
  } finally {
    await f.close();
  }
});
it("isolates quota and cache between application instances", async () => {
  const first = await fixture();
  const second = await fixture();
  try {
    await first.post("same");
    const r = await second.post("same");
    assert.equal(r.headers.get("x-cache"), "MISS");
    assert.equal((await second.quota()).used, 1);
  } finally {
    await first.close();
    await second.close();
  }
});
