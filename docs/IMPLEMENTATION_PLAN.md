# Implementation Plan: tnc-risk-extractor → LexGuard AI Freemium

> Status: **Disetujui user (18 Sep 2026)** — Gap-debt dikerjakan dulu, lalu Auth Firebase baru, Landing + limit tamu, baru fitur expansion terintegrasi.
> Keputusan terkunci:
> - Firebase: **buat baru dari nol** (Auth + Firestore)
> - Guest limit landing: **3x / hari**
> - AI: **Gemini primary + Groq fallback**

## 1. Konteks & Tujuan

Repo saat ini (`LexGuard AI - Legal Analyzer`) adalah SPA React 19 + Vite + Tailwind + Express + Gemini Strict JSON (`{ daftar_risiko[] }`) untuk mendeteksi 5 kategori klausul jebakan ToS.

Rencana ini menyusun semua gap-debt + pengembangan ke depan agar **saling terintegrasi** lewat satu pintu: **Auth → Quota → History → AI Router**. Tidak ada fitur silo.

Prinsip eksekusi:
1. **Gap-debt / hardening dulu** sebelum fitur baru (anti jebol kuota, hilangkan dummy).
2. AI tetap gratis (tanpa kartu kredit).
3. Landing publik bisa dicoba tamu dengan limit, fitur penuh wajib login.
4. Semua fitur baru wajib lewat skema quota + history yang sama.

## 2. Arsitektur Target

```
[ Landing `/` ] -- guest 3x/hari (IP + localStorage + server) --> [ CTA Login ]
     |
     v (Firebase Google / Email)
[ App `/app` ] -- Bearer idToken --> [ Express API ]
     |-- POST /api/analyze (cek quota Firestore)
     |-- GET /api/history (per-uid)
     |-- GET /api/quotas/me
     |-- AI Router: Gemini Flash (primary) -> Groq gpt-oss (fallback)
     |-- Firestore: users, analyses, quotas_daily, guest_quotas
```

Routing baru (butuh `react-router-dom`):
- `/` = Landing publik + demo analyzer mini (limit 3x).
- `/app` = App existing (`src/App.tsx` saat ini dipindah) + guard login untuk history full, upload, export PDF.
- `/login` = modal/halaman login (atau cukup modal di landing + app).

Satu sumber kebenaran quota:
- Guest: `guest_quotas/{ipHash_YYYY-MM-DD} = { used, limit: 3 }` + `express-rate-limit` + `localStorage lexguard_guest_YYYYMMDD`.
- User login: `quotas_daily/{uid_YYYY-MM-DD} = { used, limit }`, plan di `users/{uid}.plan`.

## 3. Riset API Key AI Gratis (2026)

Hasil riset web Sep 2026, syarat **tanpa kartu kredit**:

| Provider | Model gratis | Limit | Rekomendasi |
|---|---|---|---|
| **Gemini API (primary, dipertahankan)** | `gemini-2.5-flash`, `gemini-3.x-flash`, `3.1-flash-lite`, konteks 1M | ~10–15 RPM, 1000–1500 RPD per-project (lihat live di AI Studio, reset 00:00 PT) | **Ya.** Paling cocok untuk dokumen panjang + Strict JSON sudah jalan di `server.ts:93-126`. Caveat: free-tier *may be used for training* → tambah disclaimer privasi. |
| **Groq (fallback baru)** | `openai/gpt-oss-20b`, `gpt-oss-120b`, `qwen3-27b` | 30 RPM, 1000 RPD, 8K TPM, no-training by default, cepat (LPU) | **Ya.** OpenAI-compatible, bagus untuk privasi + kecepatan. |
| OpenRouter `:free` | 19 model rotasi, `openrouter/free` router | 20 RPM, 50/hari (1000/hari jika pernah top-up $10) | Tidak sebagai primary — terlalu kecil + sering 429 upstream. Opsi Fase 5 saja. |
| Cloudflare Workers AI / Mistral Free / HF $0.10/bln | Beragam | 10k Neurons/hari / $10/bln / $0.10/bln | Cadangan jauh, belum perlu. |

Keputusan: **`GEMINI + GROQ` dengan abstraction layer + fallback chain.** Menambah Groq ≈ menggandakan kuota harian gratis (dua bucket independen).

Env baru yang direncanakan:
```
GEMINI_API_KEY=...            # existing
GROQ_API_KEY=...              # baru
AI_PROVIDER_ORDER="gemini,groq"
GEMINI_MODELS="gemini-3.6-flash,gemini-3.8-flash,gemini-3.1-flash-lite"
GROQ_MODELS="openai/gpt-oss-20b,openai/gpt-oss-120b"
AI_TIMEOUT_MS="30000"
```

## 4. Fase Eksekusi

### Fase 0 — AI Router Abstraction (0.5 hari)

**Tujuan:** lepas dari hardcode Gemini di `server.ts:79-84`.

Tasks:
- [ ] Buat `src/server/ai/router.ts`: `analyzeWithFallback(text) -> { result, providerUsed, latencyMs }`, coba `GEMINI_MODELS` lalu `GROQ_MODELS`, timeout + 800ms jeda antar model (reuse pola existing `server.ts:147`).
- [ ] Reuse `SYSTEM_INSTRUCTION` + `responseSchema` existing agar output tetap `{ daftar_risiko[] }`. Tambah field opsional backward-compatible: `kategori, saran_perbaikan, confidence` (update `src/types.ts` tanpa break frontend lama).
- [ ] Ganti blok candidate-model di `server.ts` ke pemanggil router. Pertahankan mapping error `401/403 → key invalid`, `429 → kuota habis`, sisanya `503` (`server.ts:152-167`).
- [ ] Tambah `GET /api/ai-status` untuk debug provider aktif (tanpa bocorkan key).

Acceptance:
- Cabut `GEMINI_API_KEY` → request tetap sukses via Groq dengan format sama.
- `npm run lint` (`tsc --noEmit`) pass.

Dependensi: `groq-sdk` (atau fetch OpenAI-compatible, lebih ringan).

### Fase 1 — Gap-Debt / Hardening (Prioritas 1, 2–3 hari)

**Tujuan:** amankan kuota + bersihkan dummy sebelum dibuka ke publik. Jangan tambah fitur dulu.

1. Security & abuse:
   - [ ] `express-rate-limit` di `/api/analyze`: guest 10 req/10 mnt/IP, user login 30/10 mnt.
   - [ ] `helmet`, `cors` whitelist `APP_URL`, turunkan `express.json` dari `10mb` → `1mb` (`server.ts:50`).
   - [ ] Validasi: tolak HTML/script, hitung token kasar, tolak > ~30k token walau < 50k char.
   - [ ] Pertahankan blokir `dist/server.cjs` (`server.ts:191-193`), tambah test.
2. Quota & cache beneran:
   - [ ] Hapus dummy `Paket Pro 75/100` di `src/components/Sidebar.tsx:156-170` → ganti `QuotaCard` baca `/api/quotas/me` (sebelum login tampilkan `Tamu: sisa 3/hari`).
   - [ ] Cache hash SHA256 teks → hasil 24 jam (LRU in-memory dulu, pindah Firestore di Fase 2). Hemat 30–50% call untuk contoh yang diulang (`src/data/contohDokumen.ts`).
   - [ ] Tambah header `retry-after` saat 429/503.
3. Skor jujur:
   - [ ] `src/components/DocumentInfoSidebar.tsx:29` rumus `100-high*25-medium*12` → labeli `Skor Estimasi (beta)` + tooltip. Skor resmi dari AI pindah Fase 4.
   - [ ] Izinkan `tingkat_risiko: Rendah` di filter `src/components/ResultsSection.tsx:13` tanpa break data lama.
4. Kualitas:
   - [ ] 5 test minimal: kosong → 400, over-limit → 400, JSON invalid → 503 aman, fallback model, rate-limit.
   - [ ] Dokumentasikan semua env baru di `.env.example`.

Dependensi baru: `express-rate-limit, helmet, cors, lru-cache`.

Acceptance: spam 11x dalam 10 mnt dari 1 IP → 429 dengan pesan Indonesia yang jelas; teks contoh yang sama kedua kali → latency < 200ms (cache hit).

### Fase 2 — Auth + User System Firebase Baru (3–4 hari)

Setup dari nol (belum ada project):

- [ ] Firebase Console: project `lexguard-ai`, enable Auth (Google + Email/Password), Firestore, Web App config.
- [ ] Frontend: `npm i firebase`, `src/lib/firebase.ts`, `src/context/AuthContext.tsx` (user, idToken, loading), `LoginModal` + route `/login`.
- [ ] Backend: `npm i firebase-admin`, middleware `verifyFirebaseToken` (cek `Authorization: Bearer <idToken>`). Service account via env `FIREBASE_SERVICE_ACCOUNT_JSON` (jangan commit).
- [ ] Firestore schema (baru):
```
users/{uid}: { email, displayName, photoURL, plan: "free", createdAt, lastLoginAt }
analyses/{autoId}: { uid, textHash, textPreview(≤500 char), charCount, result, provider, createdAt }
quotas_daily/{uid_YYYY-MM-DD}: { used, limit: 20, resetAt }
guest_quotas/{ipHash_YYYY-MM-DD}: { used, limit: 3 }
```
- [ ] Security Rules: user hanya baca `analyses` miliknya; `quotas_*` hanya via Admin SDK.
- [ ] Migrasi tab Riwayat (`src/App.tsx:179-223` hardcode 2 item) → `GET /api/history?limit=20` real + tombol hapus.
- [ ] Limit: Free login 20x/hari, Pro (flag manual `users.plan`) 100x/hari.

API contract baru:
```
POST /api/analyze { text } + Bearer? → { daftar_risiko[], quota { used, limit, remaining }, provider }
GET /api/history → { items[] } (auth wajib)
GET /api/quotas/me → { plan, used, limit, remaining, resetAt } (guest → by IP)
```

Acceptance: login Google → analyze tercatat di `analyses` → logout → `/api/history` 401.

Dependensi: `firebase, firebase-admin`.

### Fase 3 — Landing Page + Freemium Gate 3x/hari (3 hari)

- [ ] `npm i react-router-dom`. Pindah `src/App.tsx` → `src/pages/AppPage.tsx` (`/app`), buat `src/pages/LandingPage.tsx` (`/`).
- [ ] Landing sections: Hero + demo mini (reuse `InputSection` compact) + 5 fokus evaluasi + contoh hasil (`RiskCard`) + pricing (Tamu 3x/hari / Free login 20x / Pro soon) + FAQ privasi (jelaskan data free-tier Gemini) + CTA login + footer disclaimer *bukan nasihat hukum*.
- [ ] Gating:
```
if (!user && guestUsed >= 3) → kunci demo, tampilkan LoginModal ("Masuk untuk 20x/hari + Riwayat + Export PDF")
else → izinkan analyze, increment guest_quotas + localStorage
```
- [ ] SEO: update `index.html` title/description OG, tambah `public/assets/hero.png`.
- [ ] `Header`/`Sidebar` existing tetap untuk `/app`; landing punya navbar ringan sendiri.

Acceptance (incognito): 3x sukses → ke-4 diblokir dengan CTA → setelah login Google quota jadi 20 dan demo terbuka lagi.

### Fase 4 — Fitur Terintegrasi Penuh (1–2 minggu, setelah Fase 1–3 stabil)

Semua lewat Auth + Quota + History yang sama:

- [ ] Input kaya di `InputSection`: upload PDF/DOCX/TXT (`pdfjs-dist`, `mammoth`), drag-drop, fetch URL ToS (server fetch + extract teks, max 50k char, timeout 15s). Batas file 5MB.
- [ ] Output kaya: `kategori` (5 fokus), `saran_perbaikan`, `confidence`, level `Rendah`. Update `RiskCard.tsx`, `ResultsSection.tsx` (filter + count), klik kartu → highlight/scroll ke sumber di textarea.
- [ ] History penuh: search + buka ulang (load ke editor) + hapus + paginasi.
- [ ] Export: JSON (existing `Header.tsx`/`JsonViewer.tsx`) + Markdown + PDF 1-klik (server `pdfkit` atau client `jspdf`) dengan kop skor + disclaimer.
- [ ] Template compare: `Library Template` existing → mode `Bandingkan: Dokumenmu vs Template Adil` + diff sederhana.
- [ ] Skor resmi dari AI (ganti heuristik Fase 1) + penjelasan.

### Fase 5 — Polish / Scale (opsional)

- [ ] Analytics anonim (jumlah analisis/hari, kategori tersering) tanpa simpan teks penuh.
- [ ] Admin set `plan=pro` manual di Firestore.
- [ ] OpenRouter `:free` sebagai fallback ke-3.
- [ ] i18n ID/EN, PWA, RAG UU ITE/UU PDP/UUPK sebagai referensi, Chrome extension (later).

## 5. Peta Integrasi (agar tidak silo)

| Fitur | Wajib lewat | Catatan |
|---|---|---|
| Demo landing | `POST /api/analyze` tanpa token + `guest_quotas` | Limit 3, tanpa history server |
| App full | `POST /api/analyze` + Bearer + `quotas_daily` + tulis `analyses` | Limit 20 (free) |
| Upload PDF/DOCX/URL | Ekstrak → string → jalur analyze yang sama | Tidak ada endpoint AI kedua |
| History | `GET /api/history` (uid dari token) | Riwayat tamu hanya localStorage, tidak campur server |
| Export JSON/MD/PDF | Render dari `result` yang sudah tersimpan | Tidak panggil AI ulang |
| QuotaCard | `GET /api/quotas/me` | Ganti dummy Sidebar |
| AI Router | Gemini → Groq | Frontend tidak tahu provider, hanya tampil `provider` untuk transparansi |

## 6. Estimasi & Urutan

```
Minggu 1: Fase 0 (0.5 hari) + Fase 1 hardening (2–3 hari)
Minggu 2: Fase 2 Auth + Firestore (3–4 hari)
Minggu 3: Fase 3 Landing + gate 3x (3 hari)
Minggu 4–5: Fase 4 upload/history/export/compare (1–2 minggu)
```

MVP terintegrasi s/d Fase 3: **~8–10 hari kerja 1 dev.**

## 7. Risiko & Mitigasi

- Gemini ubah limit per-project tanpa notice → mitigasi Groq fallback + cache hash.
- `firebase-admin` key bocor → via secret manager/env server saja, tambah `.gitignore`.
- PDF/URL parsing bengkak → batas 5MB/50k char/timeout, sanitize HTML.
- Data training free-tier → disclaimer + opsi hapus history + jangan kirim KTP/password ke analyzer.
- Double-spend quota saat retry → idempotency key `textHash` + transaksi Firestore.

## 8. Definition of Done per Fase

- Fase 0: fallback terbukti, lint pass.
- Fase 1: rate-limit + cache + tanpa dummy, 5 test pass.
- Fase 2: login Google end-to-end + history per-user.
- Fase 3: tamu 3x diblokir benar + CTA login konversi.
- Fase 4: upload + export PDF + compare jalan dengan quota yang sama.

---
*Sumber kode saat ini: `server.ts`, `src/App.tsx`, `src/components/*`, `src/data/contohDokumen.ts`, `.env.example`, `package.json`.*
