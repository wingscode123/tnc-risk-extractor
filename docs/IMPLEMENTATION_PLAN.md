# Roadmap dan backlog

Sumber kebutuhan: [PRD](PRD.md). Arsitektur existing dipertahankan.

## MVP (M0–M3)

- M0: PRD/business/UIUX, lockfile, TypeScript strict, server ESM, static terpisah.
- M1: schema item/enum, kuota atomik per proses, cache gratis, failure tanpa
  charge kuota, timeout, JSON error, readiness dan metadata log.
- M2: landing, TXT/editor, contoh, hasil/filter/ekspor/cetak PDF, riwayat lokal,
  pembatalan respons lama, clipboard error dan aksesibilitas dasar.
- M3: backend regression, browser desktop/mobile, production checks dan CI.

Hasil aktual: VERIFICATION.md. CI disiapkan, belum dijalankan di GitHub.
Tidak ada deployment publik dalam pekerjaan lokal ini.

## Prioritas lanjutan

Peningkatan lokal setelah MVP: URL tab + focus trap menu, penggabungan request
identik per IP, impor teks DOCX dengan worker terbatas, serta harness evaluasi
delapan fixture sintetis telah diimplementasikan. Evaluasi live dan review label
ahli tetap belum tersedia. Audit screen reader lengkap masih diperlukan.

Peningkatan berikutnya selesai: PDF berbasis teks dengan batas file/halaman/waktu,
perbandingan tekstual lokal per baris, impor dua versi dan handoff ke editor.
OCR, perbandingan risiko semantik, dan ingest URL tetap backlog. Sesuai arahan
owner, konfigurasi API key dan pengujian provider nyata ditempatkan pada gate akhir.

| Prioritas        | Pekerjaan                                                       | Dependensi / gate                                                   | Komponen                        |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| P1               | Evaluasi lima kategori, kasus aman/ambigu/injection dan kutipan | Reviewer domain dan key; ukur false positive/negative, latency/cost | Fixtures dan adapter AI         |
| P1 sebelum scale | Shared quota/rate limit/cache, retention dan deletion           | Topologi hosting/datastore disepakati                               | Storage adapter backend         |
| P2               | Firebase Auth + Firestore per-user history                      | Project/credential, aturan akses dan retensi                        | Auth middleware, repository, UI |
| P2               | Deduplikasi lintas IP jika diperlukan (per-IP selesai)          | Kebijakan quota/cache lintas pengguna, concurrency test             | AI/cache service                |
| P2               | Audit screen reader lengkap (URL/focus trap selesai)            | Keyboard/browser regression                                         | App/Sidebar/Header              |
| P3               | OCR dan perluasan ekstraksi PDF/DOCX                            | Parser, isolasi, batas input, evaluasi ekstraksi                    | Ingestion/UI                    |
| P3               | URL ingestion                                                   | Proteksi SSRF/DNS/redirect/private network dan timeout              | Ingestion service               |
| P3               | Compare semantik risiko (compare teks selesai)                  | Model per klausul dan dataset perbandingan                          | Compare service/UI              |
| P3               | Provider alternatif                                             | Bukti kebutuhan biaya/availability, schema kompatibel               | AI router                       |

Jangan mengganti skor heuristik dengan skor AI tanpa definisi dan evaluasi.
Tanggal integrasi eksternal bergantung dependency dan kriteria kualitasnya.
