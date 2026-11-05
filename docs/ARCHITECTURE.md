# Arsitektur dan operasi

`/` adalah landing; `/app` adalah React workspace. Express melayani API dan
aset hasil Vite. Development menggunakan Vite middleware. Backend dibundle
menjadi ESM agar entry guard `import.meta.url` tetap benar.

## Alur backend

Rate limit → validasi → hash teks berversi → cache → reservasi kuota → Gemini
fallback/timeout → validasi hasil → cache/commit penggunaan → respons.
`finally` melepas reservasi saat berhasil/gagal. Cache sebelum kuota. Request
identik yang sedang berjalan digabung hanya dalam identitas IP yang sama.
Satu reservasi/keberhasilan dihitung untuk kelompok request itu; rate limit
tetap menghitung setiap HTTP request. Header COALESCED menunjukkan request
yang menunggu pekerjaan identik. Kegagalan tidak dicache dan dapat dicoba ulang.

LRU: 500 hasil, TTL 24 jam. Map kuota dibersihkan saat hari UTC berganti;
maksimum 100.000 IP/hari. IP baru menerima 503 saat kapasitas penuh, bukan
menggusur kuota aktif. Hash IP tidak disertakan dalam respons/log. Request yang
melewati pergantian hari tetap memakai bucket hari request dimulai, sehingga
tidak mengubah bucket hari baru.

## Client dan data

Snapshot menyatukan teks/hasil/waktu. Mengubah atau mereset dokumen membatalkan
fetch dan mengganti identitas request; respons lama tidak dapat mengisi hasil
baru. Timeout client 65 detik, server 60 detik, per panggilan SDK 25 detik.
Server membatasi waktu meski provider mengabaikan signal. Browser reset/abort
tidak menghentikan server dan dapat tetap menggunakan kuota bila AI berhasil.

Riwayat adalah localStorage berversi, opt-in per sesi, maksimum 10; divalidasi
ketika dibaca. Kegagalan storage ditampilkan tanpa menghilangkan hasil saat ini.
Tidak ada auth/cloud persistence/analytics/sinkronisasi antar tab.

URL tab disimpan pada pathname; popstate mendukung browser Back/Forward.
Sidebar mobile tertutup bersifat inert. Ketika terbuka, fokus dikunci di dialog,
konten utama inert, scroll body dikunci; penutupan mengembalikan fokus ke opener.

DOCX dibaca lokal. Worker fflate mengekstrak hanya word/document.xml: file maksimum
2 MB, XML maksimum 2 MB, 2.000 entri, timeout 3 detik. Worker diterminasi setelah
selesai/gagal. Main thread menolak DTD/entity dan XML rusak sebelum mengambil teks
paragraf WordprocessingML. Tidak ada render HTML, eksekusi macro, pengambilan
external relationship, atau upload file asli. Header/footer, footnote, gambar,
format dan OCR tidak disertakan. Hasil dibatasi 50.000 karakter dan ditinjau di editor.

Referensi library: https://github.com/101arrowz/fflate/blob/master/README.md

PDF berbasis teks memakai PDF.js yang dimuat dinamis saat impor pertama. Worker
modul disajikan dari origin yang sama; setiap impor memiliki worker sendiri,
bukan global worker bersama. Input file 5 MB, maksimal 50 halaman/50.000 karakter,
timeout parsing 20 detik. Pembatalan/reset menutup task dan menghentikan worker.
Tidak ada renderer PDF, sandbox JavaScript, XFA, atau eksekusi action dokumen.
Semua byte berasal dari file lokal; tidak ada URL dokumen atau CDN parser.
Parser menerima hanya teks; halaman tanpa teks ditolak (termasuk halaman kosong)
agar pengguna tidak menerima dokumen yang sebagian halamannya terlewat.
Layout multi-kolom, urutan, font khusus, dan hasil ekstraksi kompleks tetap perlu
ditinjau. Input/time dibatasi, tetapi worker bukan jaminan batas heap memori.
Bundle parser dan worker berukuran lebih besar dari kode aplikasi dan hanya
diunduh ketika PDF digunakan; build Vite dapat memberi peringatan ukuran chunk.

Referensi PDF.js: https://mozilla.github.io/pdf.js/examples/

Perbandingan memakai LCS per baris, maksimal 500 baris per versi (tabel 501×501
Uint16). Input dibatasi 50.000 karakter. Hanya CRLF/CR dinormalisasi menjadi LF;
spasi, tanda baca dan urutan baris tetap signifikan. Baris pindah tampil sebagai
hapus/tambah. Hasil adalah perubahan tekstual, bukan klasifikasi risiko atau
jaminan ekuivalensi hukum. Kedua teks ada di memori App agar perpindahan tab
tidak menghapus input; reload menghapus input yang tidak disimpan. Snapshot hasil
hanya ditampilkan saat kedua teks masih sesuai. Semua kerja dilakukan lokal.

## Runbook deployment

1. `npm ci`, jalankan checks, lalu `npm run build`.
2. Inject GEMINI_API_KEY lewat secret manager. Jangan letakkan di frontend.
3. Jalankan satu instance `npm start`. Atur PORT jika perlu.
4. Atur TRUST_PROXY_HOPS sesuai hop nyata di reverse proxy. Forwarded headers
   tidak boleh dipercaya tanpa memastikan topologi ingress.
5. Gunakan TLS di ingress. Hanya `dist/client` yang publik; jangan expose root
   repository atau seluruh `dist` lewat server statis terpisah.
6. Health memeriksa proses. Ready hanya memeriksa keberadaan key, bukan validitas,
   akses model, kuota provider, atau kualitas hasil.

SIGINT/SIGTERM menutup listener dan menunggu koneksi selesai. Log JSON memuat
event/model/durasi/status. Operator perlu menghindari logging body di ingress.

## Troubleshooting

| Gejala                  | Pemeriksaan                                                |
| ----------------------- | ---------------------------------------------------------- |
| 503 belum dikonfigurasi | Secret key dan restart proses                              |
| 503 konfigurasi AI      | Validitas key dan akses model; jangan log secret           |
| 429 harian              | used/pending/resetAt; tunggu reset atau cache dokumen sama |
| 429 rate limit          | Retry-After; cek apakah IP terbaca sebagai proxy           |
| Timeout                 | Latensi provider/model kandidat; hindari retry tanpa batas |
| Riwayat gagal           | Browser storage penuh/diblokir; ekspor JSON tersedia       |
| Preview tanpa API       | Gunakan npm start/dev, bukan vite preview                  |

Shared state wajib sebelum multi-instance. Ubah prefix versi cache ketika
prompt/schema berubah. Struktur valid tidak menjamin kutipan faktual; evaluasi
ahli tetap diperlukan sebelum klaim kualitas.
