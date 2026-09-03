import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({
          error: "Teks dokumen legal tidak boleh kosong.",
        });
      }

      if (text.length > 50000) {
        return res.status(400).json({
          error: "Teks dokumen melebihi batas maksimum 50.000 karakter.",
        });
      }

      const ai = getGeminiClient();
      const CANDIDATE_MODELS = [
        "gemini-3.6-flash",
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
      ];

      let lastError: any = null;
      let parsedResult: any = null;

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
          parsedResult = JSON.parse(rawJson);
          if (parsedResult && Array.isArray(parsedResult.daftar_risiko)) {
            return res.json(parsedResult);
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${model} encountered error:`, err?.message || err);
          // Wait briefly before trying next candidate model to avoid hammering
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      // If all candidate models fail
      console.error("All candidate models failed. Last error:", lastError);
      const errMsg =
        lastError?.message ||
        "Server AI sedang mengalami lonjakan beban sementara. Silakan klik Coba Lagi dalam beberapa detik.";
      return res.status(503).json({
        error: errMsg,
      });
    } catch (error: any) {
      console.error("Error analyzing document:", error);
      return res.status(500).json({
        error: error.message || "Gagal menganalisis dokumen legal.",
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
