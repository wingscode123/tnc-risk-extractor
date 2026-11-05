# LexGuard AI

Alat bantu membaca syarat layanan, kebijakan privasi, dan kontrak dalam bahasa
Indonesia. React menampilkan kutipan dan penjelasan risiko dari Gemini melalui
API Express. Hasil bukan nasihat hukum atau jaminan keamanan dokumen.

## Mulai lokal

Gunakan Node.js 22.13+ atau 24+ dan npm. Dari directory project:

```powershell
npm ci
Copy-Item .env.example .env
# Isi GEMINI_API_KEY di .env; jangan commit secret.
npm run dev
```

Buka http://localhost:3000 untuk landing; `/app` untuk ruang analisis.
Tanpa API key, UI tetap dapat dibuka dan API analisis mengembalikan 503 yang jelas.

## Fitur MVP

- Landing: penjelasan produk, ilustrasi, cara kerja, lima fokus dan FAQ.
- Input 50.000 karakter, tiga contoh, impor TXT maksimal 200 KB dan DOCX maksimal 2 MB.
- PDF berbasis teks maksimal 5 MB / 50 halaman: parsing lokal dengan worker PDF.js, timeout 20 detik, tanpa OCR. Halaman tanpa teks ditolak agar tidak menghasilkan impor parsial secara diam-diam.
- Bandingkan versi di `/app/bandingkan`: perbedaan per baris, maksimal 500 baris per versi, tanpa API/kuota. Impor dua dokumen atau gunakan teks editor, lalu buka versi baru di editor analisis.
- DOCX diekstrak lokal dalam worker berbatas waktu; teks utama saja, bukan gambar/header/catatan kaki. Tinjau teks sebelum analisis.
- URL tab `/app/riwayat` dan `/app/contoh`, browser Back/reload, menu mobile dengan focus trap.
- Request identik bersamaan dari IP sama digabung menjadi satu panggilan AI dan satu penggunaan kuota.
- Gemini fallback, schema runtime per item, timeout total 60 detik.
- Kartu/filter risiko, statistik, skor heuristik, salin, ekspor JSON.
- Cetak/simpan PDF menggunakan dialog browser.
- Riwayat opsional di browser ini, maksimal 10 analisis, dapat dihapus.
- Kuota 3 keberhasilan AI per IP/hari UTC; gagal tidak dihitung; cache hit gratis.
- Rate limit 10 request analisis/10 menit/IP, termasuk request cache dan invalid.

## Pemeriksaan dan production

```text
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm start
```

`lint` adalah pemeriksaan TypeScript strict. Browser tests menjalankan hasil
build production pada port 4173 untuk desktop/mobile. Hasil sukses AI di browser
menggunakan mock API; kontrak backend memakai fake provider. Tidak ada panggilan
AI berbayar dalam test. Build menghasilkan `dist/client/` (publik) dan
`dist/server.mjs` (privat). `npm start` otomatis memakai mode production.
`npm run preview` hanya preview statis, tanpa API Express.

## Environment

| Variabel           | Default / fungsi                                           |
| ------------------ | ---------------------------------------------------------- |
| `GEMINI_API_KEY`   | Wajib untuk analisis nyata; hanya dibaca server            |
| `GEMINI_MODELS`    | `gemini-3.8-flash,gemini-3.1-flash-lite`, dicoba berurutan |
| `PORT`             | `3000`                                                     |
| `APP_URL`          | Kosong; origin CORS tambahan dipisah koma jika diperlukan  |
| `TRUST_PROXY_HOPS` | `0`; atur jumlah hop berdasarkan proxy deployment          |
| `DISABLE_HMR`      | `true` untuk menonaktifkan HMR development                 |

Default mengacu pada [model resmi Google](https://aistudio.google.com/docs/models).
Akses aktual bergantung akun/region/kuota provider. AbortSignal mengikuti
[SDK Google](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html);
pembatalan client tidak menjamin penghentian pemrosesan atau tagihan provider.

## API

| Endpoint             | Respons                                                         |
| -------------------- | --------------------------------------------------------------- |
| `GET /api/health`    | 200: proses hidup                                               |
| `GET /api/ready`     | 200: key disetel; 503: belum dikonfigurasi. Bukan ping provider |
| `GET /api/quotas/me` | `plan`, `used`, `pending`, `limit`, `remaining`, `resetAt`      |
| `POST /api/analyze`  | Body `{ "text": "..." }`; respons `{ "daftar_risiko": [...] }`  |

Risiko memiliki `pasal_terkait`, `tingkat_risiko` (Tinggi/Sedang/Rendah), dan
`penjelasan_bahasa_manusia`. `X-Cache`: HIT/MISS/COALESCED. Error JSON memuat `error`;
400/413 untuk input, 429 untuk pembatasan, 503 untuk AI unavailable, 500 untuk
kegagalan tak terduga. 429/503 menyertakan Retry-After.

## Data dan batas operasional

Teks dikirim ke Gemini. Hasil memuat kutipan dan di-cache di memori 24 jam,
maksimal 500 entri. Dokumen lengkap tidak disimpan di server. Riwayat lokal opt-in
menyimpan teks dan hasil; penghapusan lokal tidak menghapus cache server.
Log aplikasi berisi metadata, bukan isi dokumen/raw error provider.

Kuota/cache/rate limit berada dalam satu proses: restart menghapus state.
Deploy satu instance untuk MVP. Beberapa replica memerlukan shared store.
Pengguna pada IP publik yang sama berbagi kuota. Reset 00.00 UTC / 07.00 WIB.
Cache tetap dapat dibaca ketika kuota habis, dengan rate limit tetap berlaku.

## Struktur dan dokumen

- `server.ts`: API, kuota/cache, AI, middleware dan startup.
- `src/analysis.ts`, `src/types.ts`: kontrak, validasi dan statistik bersama.
- `src/App.tsx`: orkestrasi workspace dan request.
- `src/components/`: landing, input, hasil, sidebar, clipboard.
- `src/history.ts`, `src/export.ts`: storage lokal dan ekspor.
- `tests/`: kontrak/backend dan browser regression.
- [PRD](docs/PRD.md): overview, business, UI/UX dan acceptance criteria.
- [Arsitektur dan operasi](docs/ARCHITECTURE.md).
- [Roadmap dan backlog](docs/IMPLEMENTATION_PLAN.md).
- [Hasil verifikasi](docs/VERIFICATION.md).
- [Harness evaluasi AI](docs/AI_EVALUATION.md).

Evaluasi engineering: `npm run eval:ai` menampilkan delapan fixture sintetis tanpa
memanggil provider. `npm run eval:ai -- --live` menggunakan API key dan dapat
menimbulkan biaya; laporannya mencakup deteksi risiko, kutipan verbatim, latensi,
dan model. Label belum direview ahli sehingga bukan ukuran akurasi hukum.

Firebase Auth/Firestore, OCR, URL ingestion, perbandingan risiko semantik,
dan provider kedua belum diimplementasikan; lihat backlog untuk dependensinya.
