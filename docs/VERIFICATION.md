# Verifikasi MVP

Tanggal: 2026-11-03. Lingkungan lokal Windows, Node.js v24.22.1, npm 11.19.1.
CI dikonfigurasi pada Node.js 22; eksekusi GitHub belum dilakukan.

## Hasil

| Pemeriksaan                        | Hasil                                                |
| ---------------------------------- | ---------------------------------------------------- |
| TypeScript strict (`npm run lint`) | Lulus                                                |
| Backend (`npm test`)               | 18 test lulus (backend dan domain)                   |
| Production build (`npm run build`) | Lulus; ESM server dan client terpisah                |
| Browser (`npm run test:e2e`)       | 25 lulus, 1 skip (uji modal mobile pada desktop)     |
| Format (`npm run format:check`)    | Lulus                                                |
| Whitespace (`git diff --check`)    | Tidak ada error whitespace                           |
| Dependency audit saat install      | 0 vulnerability dilaporkan npm pada saat pemeriksaan |

## Cakupan bukti

PDF asli sintetis diuji dengan parser sebenarnya: teks valid, halaman tanpa teks,
51 halaman, PDF rusak, dan file >5 MB. Input lama dipertahankan saat impor gagal;
impor tidak memanggil API AI. Perbandingan diuji untuk tambah/hapus, rekonstruksi
kedua sumber (termasuk baris berulang/kosong), batas kerja, perubahan spasi,
hasil stale, pemindahan versi ke editor, input tetap saat pindah tab, serta dua
impor PDF bersamaan. Screenshot perbandingan desktop/mobile diperiksa.

Peningkatan lanjutan: penggabungan request identik mengonsumsi satu kuota,
URL tab/reload/Back, focus trap/Escape/restore focus menu mobile, DOCX lokal,
penolakan XML terlalu besar dan DTD/entity, serta pembatalan worker saat reset
sudah diuji. Satu test modal mobile sengaja dilewati pada project desktop.
Harness evaluasi berhasil dry-run 8 kasus tanpa panggilan provider;
lihat [Evaluasi AI](AI_EVALUATION.md). CI belum dieksekusi di GitHub.

Backend: input kosong, panjang berlebih, HTML, malformed JSON, body terlalu besar,
fallback model, respons invalid, sanitasi error, rate limit, kuota harian,
cache gratis, kegagalan tanpa konsumsi kuota, concurrency reservation, pergantian
hari UTC, timeout/abort, dan isolasi state antar aplikasi.

Browser: landing dan browser back, editor kosong, analisis/hasil, JSON download,
hilangnya hasil lama setelah edit, opt-in history/reload/reopen/delete, TXT import,
filter tanpa temuan, JSON view, laporan print yang tetap memuat semua risiko,
hasil kosong dengan batasan AI, output invalid, storage gagal, dan reset saat
request berjalan. Layout landing/workspace diperiksa melalui screenshot
desktop/mobile; tidak ada horizontal overflow pada viewport yang diuji.

Production server dijalankan langsung dari `dist/server.mjs` tanpa NODE_ENV.
Health 200, readiness 503 tanpa key, analisis nyata tanpa key 503 dengan pesan
konfigurasi. Akses server bundle, sourcemap, .env, package.json dan endpoint API
tak dikenal menghasilkan 404. Server test dihentikan setelah pengujian.

## Batas verifikasi

Keberhasilan AI dalam browser menggunakan mock HTTP; backend memakai fake
provider yang diinject. Tidak dilakukan panggilan Gemini nyata karena
GEMINI_API_KEY belum tersedia. Akses model, billing, kualitas deteksi legal,
ketepatan kutipan, dan perilaku provider production belum terbukti.

Model dan mekanisme abort mengacu pada dokumentasi resmi:

- https://aistudio.google.com/docs/models
- https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html

Mobile menggunakan emulasi Chromium, bukan perangkat fisik. Cetak diverifikasi
dengan print media; dialog penyimpanan PDF bergantung browser/OS. Belum ada
pengujian beban, beberapa replica, deploy publik, audit screen reader lengkap,
atau evaluasi domain legal. Ini MVP untuk satu proses, bukan bukti kesiapan
deployment publik pada skala besar.
