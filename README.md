# LexGuard AI — Analisis Dokumen Legal

Alat analisis dokumen legal otomatis untuk mendeteksi klausul berisiko pada Syarat & Ketentuan (ToS), kebijakan privasi, dan kontrak. Backend Express memanggil Gemini (Strict JSON `{ daftar_risiko[] }`) untuk 5 kategori klausul jebakan; frontend React menampilkan temuan sebagai kartu risiko, statistik, dan JSON yang dapat diekspor.

> Bukan nasihat hukum. Hasil analisis bersifat informatif dan bukan pengganti konsultasi advokat.

## Fitur

- Analisis teks ToS/kontrak menjadi `daftar_risiko[]` (Tinggi / Sedang / Rendah) via `POST /api/analyze`
- Kuota tamu harian 3x (server, berbasis hash IP) + rate-limit 10 req/10 mnt/IP
- Cache hasil 24 jam (hash SHA256, LRU in-memory) dengan header `X-Cache: HIT/MISS`
- `QuotaCard` real di sidebar (menggantikan data dummy), baca `GET /api/quotas/me`
- Skor Estimasi (beta) + tooltip heuristik; filter Tinggi/Sedang/Rendah
- Ekspor JSON (header + JsonViewer), salin temuan per kartu
- Contoh dokumen bawaan + tab Riwayat/Template (Riwayat real per-user menyusul di Fase 2)

## Tech Stack

- Frontend: React 19, Vite 6, Tailwind CSS 4, lucide-react
- Backend: Express 4, `helmet`, `cors`, `express-rate-limit`, `lru-cache`, `dotenv`
- AI: `@google/genai` (Gemini Flash, fallback antar model)
- Test: `node:test` + `node:assert` via `tsx --test`

## Struktur

```
server.ts                  # Express API + hardening + AI fallback
src/App.tsx                # Shell app + tab router (analisis/riwayat/template)
src/components/            # Sidebar, Header, InputSection, ResultsSection,
                           # RiskCard, QuotaCard, JsonViewer, DocumentInfoSidebar
src/data/contohDokumen.ts  # Contoh dokumen uji
src/types.ts               # HasilAnalisis, ItemRisiko, ContohDokumen
tests/analyze.test.ts      # 6 test backend (node:test)
docs/IMPLEMENTATION_PLAN.md# Rencana integrasi: Fase 0-5
```

## Instalasi

```bash
npm install
cp .env.example .env   # lalu isi GEMINI_API_KEY
npm run dev            # http://localhost:3000
```

## Environment

| Variabel       | Wajib | Default                                                   | Keterangan                                    |
|----------------|-------|-----------------------------------------------------------|-----------------------------------------------|
| `GEMINI_API_KEY` | Ya  | -                                                         | Kunci Gemini API (Secrets AI Studio / `.env`) |
| `PORT`         | Tidak | `3000`                                                    | Port HTTP server                              |
| `GEMINI_MODELS`| Tidak | `gemini-3.6-flash,gemini-3.8-flash,gemini-3.1-flash-lite` | Model kandidat, dicoba berurutan              |
| `APP_URL`      | Tidak | -                                                         | Bila disetel: whitelist origin CORS           |

## Scripts

| Script          | Perintah              |
|-----------------|-----------------------|
| `npm run dev`   | `tsx server.ts` (Vite middleware) |
| `npm run build` | Build frontend + bundle server ke `dist/` |
| `npm start`     | Jalankan `dist/server.cjs` (production) |
| `npm test`      | `tsx --test tests/` (6 test backend) |
| `npm run lint`  | `tsc --noEmit`        |

## API

| Endpoint          | Method | Auth   | Keterangan                                              |
|-------------------|--------|--------|---------------------------------------------------------|
| `/api/health`     | GET    | -      | `{ status: "ok" }`                                      |
| `/api/analyze`    | POST   | -      | Body `{ text }` (maks 50.000 char, teks polos, tanpa HTML/script); error aman 400/429/503 + `Retry-After` |
| `/api/quotas/me`  | GET    | -      | `{ plan: "tamu", used, limit, remaining, resetAt }` (per IP/hari; Bearer menyusul Fase 2) |

## Batasan dan Keamanan

- Validasi: teks kosong/HTML/melebihi 50.000 char/estimasi > 30.000 token → 400
- Rate-limit dan kuota dihitung per IP (`trust proxy` aktif untuk deploy di balik proxy)
- Pesan error ke klien disanitasi; detail internal hanya di log server
- Bundle `dist/server.cjs` diblokir dari static publik (404)
- Tier gratis Gemini dapat dipakai untuk training oleh provider — jangan kirim data sangat sensitif (KTP, password); opsi hapus riwayat direncanakan Fase 2+

## Roadmap

Lihat `docs/IMPLEMENTATION_PLAN.md`: Fase 0 (AI Router Gemini + Groq), Fase 2 (Auth Firebase + Firestore), Fase 3 (Landing + gate tamu 3x/hari), Fase 4 (upload PDF/DOCX/URL, export PDF, compare template).

## Lisensi

Apache-2.0
