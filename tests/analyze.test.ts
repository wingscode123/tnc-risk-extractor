import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp, analyzeWithGeminiFallback } from "../server.js";

const EMPTY_RESULT = { daftar_risiko: [] };

// Helper: jalankan app tanpa frontend di port acak (isolasi rate-limit/kuota/cache per test).
async function startTestServer(
  analyzeImpl?: (text: string) => Promise<{ result: any; modelUsed: string }>
) {
  const app = await createApp({
    withFrontend: false,
    ...(analyzeImpl ? { analyzeImpl } : {}),
  });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      ),
  };
}

async function postAnalyze(baseUrl: string, body: unknown) {
  const res = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    headers: res.headers,
    body: (await res.json()) as { error?: string; daftar_risiko?: unknown[] },
  };
}

const fakeOk = async () => ({ result: EMPTY_RESULT, modelUsed: "fake" });

describe("POST /api/analyze — validasi input", () => {
  it("teks kosong → 400", async () => {
    const t = await startTestServer(fakeOk);
    try {
      const r = await postAnalyze(t.baseUrl, { text: "   " });
      assert.equal(r.status, 400);
      assert.match(r.body.error ?? "", /kosong/i);
    } finally {
      await t.close();
    }
  });

  it("over-limit (>50.000 char) → 400", async () => {
    const t = await startTestServer(fakeOk);
    try {
      const r = await postAnalyze(t.baseUrl, { text: "x".repeat(50001) });
      assert.equal(r.status, 400);
      assert.match(r.body.error ?? "", /50\.000/);
    } finally {
      await t.close();
    }
  });

  it("HTML/script → 400", async () => {
    const t = await startTestServer(fakeOk);
    try {
      const r = await postAnalyze(t.baseUrl, {
        text: "Pasal 1: <script>alert(1)</script>",
      });
      assert.equal(r.status, 400);
      assert.match(r.body.error ?? "", /HTML\/script/i);
    } finally {
      await t.close();
    }
  });
});

describe("POST /api/analyze — kegagalan AI aman", () => {
  it("semua model gagal/JSON invalid → 503 tanpa bocor detail internal", async () => {
    const prev = process.env.GEMINI_MODELS;
    process.env.GEMINI_MODELS = "satu-model-saja";
    const garbageClient = {
      models: {
        generateContent: async () => ({ text: "bukan json {{{" }),
      },
    };
    const t = await startTestServer((text) =>
      analyzeWithGeminiFallback(text, garbageClient as any)
    );
    try {
      const r = await postAnalyze(t.baseUrl, { text: "Pasal 1: contoh." });
      assert.equal(r.status, 503);
      assert.match(r.body.error ?? "", /lonjakan beban/i);
      assert.doesNotMatch(r.body.error ?? "", /bukan json/);
      assert.ok(r.headers.get("retry-after"));
    } finally {
      await t.close();
      if (prev === undefined) delete process.env.GEMINI_MODELS;
      else process.env.GEMINI_MODELS = prev;
    }
  });
});

describe("analyzeWithGeminiFallback — fallback model", () => {
  it("model pertama gagal → hasil dari model kedua", async () => {
    const prev = process.env.GEMINI_MODELS;
    process.env.GEMINI_MODELS = "model-gagal,model-ok";
    try {
      const calls: string[] = [];
      const client = {
        models: {
          generateContent: async ({ model }: { model: string }) => {
            calls.push(model);
            if (model === "model-gagal") throw new Error("UNAVAILABLE: overload");
            return {
              text: JSON.stringify({
                daftar_risiko: [
                  {
                    pasal_terkait: "P1",
                    tingkat_risiko: "Tinggi",
                    penjelasan_bahasa_manusia: "Contoh.",
                  },
                ],
              }),
            };
          },
        },
      };
      const { result, modelUsed } = await analyzeWithGeminiFallback(
        "Pasal 1: contoh.",
        client as any
      );
      assert.deepEqual(calls, ["model-gagal", "model-ok"]);
      assert.equal(modelUsed, "model-ok");
      assert.ok(Array.isArray(result.daftar_risiko));
    } finally {
      if (prev === undefined) delete process.env.GEMINI_MODELS;
      else process.env.GEMINI_MODELS = prev;
    }
  });
});

describe("POST /api/analyze — rate-limit", () => {
  it("spam 11x dalam 10 menit dari 1 IP → 429 + Retry-After", async () => {
    const t = await startTestServer(fakeOk);
    try {
      let last = { status: 0, headers: new Headers(), body: {} as any };
      for (let i = 0; i < 11; i++) {
        last = await postAnalyze(t.baseUrl, {
          text: `Pasal ${i}: contoh teks legal yang berbeda.`,
        });
      }
      assert.equal(last.status, 429);
      assert.match(last.body.error ?? "", /terlalu banyak/i);
      assert.ok(last.headers.get("retry-after"));
    } finally {
      await t.close();
    }
  });
});
