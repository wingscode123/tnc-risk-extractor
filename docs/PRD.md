# LexGuard AI — Product Requirements Document

Status: MVP v0.1. Owner: project maintainer. Updated: 2026-11-03.

## 1. Product overview

LexGuard membantu pengguna berbahasa Indonesia membaca ToS, kebijakan privasi,
dan kontrak sebelum menyetujui. Pengguna menempelkan teks, menerima kutipan
klausul dan penjelasan risiko sederhana, lalu meninjau dokumen asli atau
membawa pertanyaan ke penasihat hukum. Produk adalah alat bantu membaca,
bukan penentu keabsahan atau pemberi nasihat hukum.

## 2. Business understanding

Masalah: dokumen panjang dan bahasa legal membuat biaya waktu untuk membaca
tinggi. Target awal: konsumen layanan digital, penyewa, pekerja lepas, dan
pelaku usaha kecil yang melakukan pemeriksaan awal dokumen berbahasa Indonesia.
Persona ini adalah hipotesis produk, belum hasil wawancara pengguna.

Nilai utama: menjelaskan klausul konkret, bukan hanya memberi skor. Model MVP:
akses tamu gratis dengan batas tiga analisis AI berhasil per IP per hari UTC.
Cache hit gratis; permintaan gagal tidak menghabiskan kuota. Rate limit tetap
berlaku pada seluruh permintaan. Belum ada paket berbayar atau klaim penghematan.

Hipotesis yang perlu divalidasi: pengguna memahami temuan, mempercayai kutipan
yang dapat dicek, dan ingin meninjau dokumen berikutnya. Ukur di fase pilot:
penyelesaian analisis, latensi p50/p95, tingkat kegagalan, biaya per analisis,
dan ketepatan kutipan pada dataset berlabel. Belum ada baseline atau target
akurasi yang dapat dipublikasikan. Jangan merekam isi dokumen untuk analytics.

## 3. Scope dan acceptance criteria MVP

| Kebutuhan        | Acceptance criteria                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Landing page     | Menjelaskan masalah, tiga langkah, lima fokus, contoh ilustratif, batasan/privacy, FAQ dan CTA menuju editor; responsif |
| Editor           | Teks polos 1–50.000 karakter; contoh; impor TXT; validasi sebelum request; tampil loading/error                         |
| Analisis         | Gemini dengan fallback terkonfigurasi, timeout total, schema tervalidasi hingga tiap item                               |
| Hasil            | Kutipan, penjelasan, enum Tinggi/Sedang/Rendah, filter, statistik, JSON dan cetak/simpan PDF melalui browser            |
| Integritas state | Hasil selalu terkait snapshot dokumen; mengganti/reset dokumen membatalkan request lama                                 |
| Kuota            | Tiga keberhasilan AI/hari UTC/IP; reservasi atomik per proses; gagal dilepas; cache gratis; 429 dengan Retry-After      |
| Riwayat          | Opt-in, maksimum 10 analisis di browser ini; buka/hapus/hapus semua; kegagalan storage tidak menghilangkan hasil        |
| Privacy          | Peringatan sebelum kirim; tidak ada penyimpanan cloud dokumen; hasil cache memori 24 jam; riwayat lokal transparan      |
| Production       | Build ESM, static terpisah dari bundle server, startup teruji, JSON error konsisten, health/readiness                   |

Riwayat lokal menyimpan teks dan hasil, bukan akun atau sinkronisasi antar perangkat.
Tidak ada klaim bahwa hasil kosong berarti dokumen aman. Skor hanya heuristik
100 dikurangi 25 per Tinggi dan 12 per Sedang, dibatasi 0–100; bukan penilaian hukum.

## 4. UI/UX specification

Bahasa Indonesia; brand LexGuard AI; navy, biru dan aksen mint; tipografi sistem.
Landing menggunakan ruang putih luas, judul editorial, preview dokumen dengan
anotasi risiko, dan CTA jelas. Tidak ada testimoni, angka akurasi atau logo
pelanggan rekaan. Contoh preview diberi label ilustrasi.

Alur: `/` → `/app` → input/contoh/TXT → review pemberitahuan → analisis →
temuan/filter/ekspor → opsional simpan riwayat. Navigasi kembali ke beranda
tersedia. Tab riwayat dan contoh adalah bagian workspace. Browser back didukung.

State wajib: editor kosong, siap, melewati batas, memproses, berhasil dengan
temuan, berhasil tanpa temuan, kuota habis, provider gagal, storage lokal gagal.
Tombol memiliki nama aksesibel, textarea memiliki label, focus terlihat,
status memakai live region, menu mobile dapat ditutup lewat Escape.

## 5. Technical approach

Pertahankan React 19 + Vite + Tailwind dan Express + Gemini. Kontrak dan
validasi hasil dibagi antara client dan server. Cache dan kuota di-scope per
instance aplikasi agar test terisolasi. Model/API key hanya di server. Model
default mengikuti dokumentasi provider yang diverifikasi saat implementasi;
operator dapat mengganti melalui GEMINI_MODELS. Runtime tidak mengasumsikan
akun provider memiliki akses model tertentu.

Satu proses adalah batas deployment MVP. Beberapa replica membutuhkan shared
quota/rate-limit store dan strategi cache yang disepakati. Trust proxy default
nonaktif; jumlah hop harus ditetapkan sesuai infrastruktur. Dokumen dianggap
data tak tepercaya: instruksi di dalam dokumen tidak boleh mengganti tugas AI.

## 6. Perbaikan existing

P0: startup CommonJS/import.meta; kuota tidak ditegakkan; validasi output dangkal.
P1: hasil lama pada teks baru; request race; JSON error parser; timeout;
cache/kuota lintas test; data riwayat dummy; klaim "aman"; token check tak terjangkau.
P2: clipboard gagal; duplikasi export/statistik; aksesibilitas; bahasa HTML;
metadata package; dependency lock; dokumentasi terabaikan; CI dan smoke test.

## 7. Roadmap dan release gates

M0: PRD, baseline dependency/build dan dokumentasi. Gate: typecheck/build.
M1: API/schema/quota/error/timeout. Gate: integration test termasuk concurrency.
M2: landing/editor/hasil/riwayat lokal. Gate: browser desktop/mobile dan flow test.
M3: CI, production smoke, runbook, laporan verifikasi. Gate: semua check lokal lulus.
M4 (lanjutan): dataset yang direview ahli, evaluasi kualitas dan biaya; Firebase
Auth/Firestore bila kebutuhan akun terkonfirmasi; shared quota store sebelum
multi-instance. Memerlukan credential/project dan kebijakan retensi.
M5 (lanjutan): PDF/DOCX dengan parsing terisolasi dan OCR; URL dengan proteksi
SSRF; perbandingan dokumen dan provider kedua setelah evaluasi kebutuhan.

M4/M5 merupakan backlog eksplisit, bukan fitur yang dijanjikan oleh landing MVP.
Scope pekerjaan ini menyelesaikan M0–M3 tanpa provisioning layanan eksternal.

## 8. Risks

Pembaruan setelah MVP: DOCX teks utama kini tersedia (2 MB, worker berbatas waktu,
preview sebelum analisis). URL tab, focus trap mobile, deduplikasi request per IP,
dan harness evaluasi sintetis juga selesai. OCR, data cloud, review ahli, dan
evaluasi live tetap backlog; ini tidak mengubah batas kualitas produk.

Pembaruan berikutnya: impor PDF berbasis teks dan perbandingan versi per baris
tersedia tanpa API. Batas PDF 5 MB / 50 halaman / 50.000 karakter, timeout 20 detik;
tanpa OCR, halaman tanpa teks ditolak. Compare maksimal 500 baris per versi,
mempertahankan spasi dan tanda baca, tidak menilai perubahan risiko hukum.

AI dapat melewatkan atau mengarang risiko; output schema valid tidak menjamin
ketepatan legal. Batas IP dapat berbagi kuota pada NAT. Memori hilang ketika
restart. Data browser lokal dapat dibaca pengguna perangkat yang sama. Request
timeout tidak menjamin provider tidak menagih. Deployment publik memerlukan
verifikasi secret, proxy, TLS, kebijakan provider, dan kebutuhan persistence.
