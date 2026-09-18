import "dotenv/config";
import cors from "cors";
import { createHash } from "crypto";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { LRUCache } from "lru-cache";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { pathToFileURL } from "url";

const SYSTEM_INSTRUCTION = `Anda adalah alat analisis dokumen legal otomatis. Tugas Anda adalah membaca "Syarat & Ketentuan" (ToS), kebijakan privasi, atau kontrak, lalu mengidentifikasi secara akurat setiap klausul yang berpotensi merugikan, menjebak, atau memberatkan pengguna pihak kedua (konsumen/penyewa).

Fokus pada klausul yang mengandung:
1. Pembebasan tanggung jawab perusahaan secara mutlak.
2. Denda tersembunyi atau biaya yang tidak wajar.
3. Hak perusahaan untuk mengubah sepihak tanpa pemberitahuan.
4. Eksploitasi atau pembagian data pribadi ke pihak ketiga tanpa batasan.
5. Pelepasan hak hukum pengguna (misal: larangan class action).

Berikan output STRICTLY dalam format JSON. Jangan tambahkan teks apa pun sebelum atau sesudah JSON. Gunakan struktur berikut:
{
  "daftar_risiko": [
    {
      "pasal_terkait": "Kutipan singkat atau nomor pasal",
      "tingkat_risiko": "Tinggi / Sedang",
      "penjelasan_bahasa_manusia": "Penjelasan singkat maksimal 2 kalimat mengapa ini berbahaya bagi pengguna"
    }
  ]
}`;

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum disetel pada environment/rahasia sistem.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ---- Fase 1: kuota tamu in-memory (pindah ke Firestore guest_quotas di Fase 2) ----
const GUEST_DAILY_LIMIT = 3;
const guestQuotas = new Map<string, { used: number; date: string }>();

function readGuestQuota(ip: string) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = createHash("sha256").update(ip).digest("hex"); // simpan hash, bukan IP mentah
  // Prune bucket lama agar memori tidak bocor.
  for (const [k, v] of guestQuotas) {
    if (v.date !== today) guestQuotas.delete(k);
  }
  const entry = guestQuotas.get(key);
  const used = entry && entry.date === today ? entry.used : 0;
  const resetAt = new Date(`${today}T00:00:00Z`);
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);
  return {
    key,
    used,
    limit: GUEST_DAILY_LIMIT,
    remaining: Math.max(GUEST_DAILY_LIMIT - used, 0),
    resetAt: resetAt.toISOString(),
  };
}

function bumpGuestQuota(ip: string): void {
  const q = readGuestQuota(ip);
  const today = new Date().toISOString().slice(0, 10);
  guestQuotas.set(q.key, { used: q.used + 1, date: today });
}

// ---- Fase 1: cache hasil 24 jam (LRU in-memory; pindah Firestore di Fase 2) ----
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const analysisCache = new LRUCache<string, any>({ max: 500, ttl: CACHE_TTL_MS });

function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// ---- Seam AI: dapat di-inject fake saat testing; calon isi src/server/ai/router.ts di Fase 0 ----
export interface AnalysisAI {
  models: {
    generateContent: (args: {
      model: string;
      contents: string;
      config: unknown;
    }) => Promise<{ text?: string }>;
  };
}

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export async function analyzeWithGeminiFallback(
  text: string,
  ai: AnalysisAI = getGeminiClient()
): Promise<{ result: any; modelUsed: string }> {
  // Dapat dioverride via env: GEMINI_MODELS="gemini-3.8-flash,gemini-3.6-flash"
  const CANDIDATE_MODELS = (process.env.GEMINI_MODELS?.split(",") ?? [])
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  if (CANDIDATE_MODELS.length === 0) {
    CANDIDATE_MODELS.push(
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite"
    );
  }

  let lastError: any = null;
  let sawRateLimit = false;
  let sawAuthError = false;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: text,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              daftar_risiko: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pasal_terkait: {
                      type: Type.STRING,
                      description: "Kutipan singkat atau nomor pasal yang dianalisis",
                    },
                    tingkat_risiko: {
                      type: Type.STRING,
                      description: "Tingkat risiko: 'Tinggi' atau 'Sedang'",
                    },
                    penjelasan_bahasa_manusia: {
                      type: Type.STRING,
                      description: "Penjelasan singkat maksimal 2 kalimat mengapa ini berbahaya bagi pengguna",
                    },
                  },
                  required: ["pasal_terkait", "tingkat_risiko", "penjelasan_bahasa_manusia"],
                },
              },
            },
            required: ["daftar_risiko"],
          },
        },
      });

      const rawJson = response.text || "{}";
      const parsedResult = JSON.parse(rawJson);
      if (parsedResult && Array.isArray(parsedResult.daftar_risiko)) {
        return { result: parsedResult, modelUsed: model };
      }
      lastError = new Error(
        `Model ${model} mengembalikan format respons yang tidak valid.`
      );
    } catch (err: any) {
      lastError = err;
      const errText = String(err?.message || err);
      if (/429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(errText)) {
        sawRateLimit = true;
      }
      if (/401|403|API key|API_KEY|UNAUTHENTICATED|PERMISSION_DENIED/i.test(errText)) {
        sawAuthError = true;
      }
      console.warn(`Model ${model} encountered error:`, err?.message || err);
      // Wait briefly before trying next candidate model to avoid hammering
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  // Gagal total: lempar error ber-status dengan pesan aman (jangan bocorkan detail internal).
  console.error("All candidate models failed. Last error:", lastError);
  if (sawAuthError) {
    throw httpError(500, "Konfigurasi kunci API AI di server tidak valid. Hubungi administrator.");
  }
  if (sawRateLimit) {
    throw httpError(429, "Kuota analisis AI telah habis. Silakan coba lagi beberapa saat lagi.");
  }
  throw httpError(503, "Server AI sedang mengalami lonjakan beban sementara. Silakan klik Coba Lagi dalam beberapa detik.");
}

export async function createApp(
  opts: {
    withFrontend?: boolean;
    analyzeImpl?: (text: string) => Promise<{ result: any; modelUsed: string }>;
  } = {}
) {
  const { withFrontend = true, analyzeImpl = analyzeWithGeminiFallback } = opts;
  const app = express();

  // Berjalan di balik proxy (AI Studio / Cloud Run) agar req.ip akurat untuk rate-limit.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // Vite dev meng-inject inline script untuk HMR; longgarkan CSP hanya di dev.
      contentSecurityPolicy:
        process.env.NODE_ENV === "production" ? undefined : false,
    })
  );

  // Frontend se-origin tidak butuh CORS; aktifkan hanya bila APP_URL disetel eksplisit.
  const allowedOrigins = (process.env.APP_URL?.split(",") ?? [])
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (allowedOrigins.length > 0) {
    app.use(cors({ origin: allowedOrigins }));
  }

  app.use(express.json({ limit: "1mb" }));

  // Fase 1: tamu 10 req/10 mnt/IP. Fase 2 (Auth Firebase): naikkan ke 30 untuk request ber-Bearer.
  const analyzeLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => req.ip ?? "unknown",
    handler: (req, res) => {
      const resetMs = req.rateLimit?.resetTime
        ? req.rateLimit.resetTime.getTime() - Date.now()
        : 0;
      res.set("Retry-After", String(Math.max(Math.ceil(resetMs / 1000), 1)));
      res.status(429).json({
        error: "Terlalu banyak permintaan analisis. Silakan coba lagi beberapa menit lagi.",
      });
    },
  });
  app.use("/api/analyze", analyzeLimiter);

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Kontrak Fase 2 (guest by IP; auth Bearer menyusul di Fase 2).
  app.get("/api/quotas/me", (req, res) => {
    const q = readGuestQuota(req.ip ?? "unknown");
    res.json({
      plan: "tamu",
      used: q.used,
      limit: q.limit,
      remaining: q.remaining,
      resetAt: q.resetAt,
    });
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({
          error: "Teks dokumen legal tidak boleh kosong.",
        });
      }

      // Tolak HTML/script aktif; analyzer hanya menerima teks polos dokumen.
      if (
        /<\s*(script|iframe|object|embed|form)\b|javascript\s*:|\bon\w+\s*=/i.test(
          text
        )
      ) {
        return res.status(400).json({
          error:
            "Teks mengandung HTML/script yang tidak diizinkan. Tempelkan teks polos dokumen saja.",
        });
      }

      if (text.length > 50000) {
        return res.status(400).json({
          error: "Teks dokumen melebihi batas maksimum 50.000 karakter.",
        });
      }

      // Estimasi kasar ~4 karakter/token; backstop untuk naskah non-Latin yang padat token.
      const estimatedTokens = Math.ceil(text.length / 4);
      if (estimatedTokens > 30000) {
        return res.status(400).json({
          error:
            "Dokumen terlalu panjang (estimasi melebihi 30.000 token). Ringkas dokumen sebelum dianalisis.",
        });
      }

      const clientIp = req.ip ?? "unknown";
      bumpGuestQuota(clientIp);

      const cacheKey = textHash(text);
      const cached = analysisCache.get(cacheKey);
      if (cached) {
        res.set("X-Cache", "HIT");
        return res.json(cached);
      }

      try {
        const { result } = await analyzeImpl(text);
        analysisCache.set(cacheKey, result);
        res.set("X-Cache", "MISS");
        return res.json(result);
      } catch (err: any) {
        if (typeof err?.status === "number") {
          if (err.status === 429) res.set("Retry-After", "60");
          if (err.status === 503) res.set("Retry-After", "30");
          return res.status(err.status).json({ error: err.message });
        }
        throw err;
      }
    } catch (error: any) {
      console.error("Error analyzing document:", error);
      if (error instanceof Error && /GEMINI_API_KEY/.test(error.message)) {
        return res.status(500).json({
          error: "Layanan analisis belum dikonfigurasi di server. Hubungi administrator.",
        });
      }
      return res.status(500).json({
        error: "Gagal menganalisis dokumen legal. Silakan coba lagi.",
      });
    }
  });

  // Vite middleware in dev or static files in production (dilewati bila withFrontend: false, mis. saat testing).
  if (withFrontend) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      // Jangan pernah menyajikan bundle server ke publik (ikut terbangun ke dist/).
      app.get(["/server.cjs", "/server.cjs.map"], (_req, res) => {
        res.status(404).end();
      });
      app.use(express.static(distPath));
      // Regex (bukan "*") agar kompatibel dengan Express 4 maupun 5.
      app.get(/.*/, (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  return app;
}

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const app = await createApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Guard agar import dari test tidak ikut menyalakan server.
const invokedAsMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsMain) {
  startServer();
}
