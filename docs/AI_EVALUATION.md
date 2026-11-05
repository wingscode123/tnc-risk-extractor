# Evaluasi AI

Harness engineering tersedia melalui `npm run eval:ai` (dry-run tanpa request).
Delapan kasus sintetis mencakup lima kategori fokus, dua kontrol negatif, dan
satu prompt injection. Tidak ada dokumen pengguna dalam fixture.

Untuk evaluasi provider nyata, isi secret server lalu jalankan:

```text
npm run eval:ai -- --live
```

Mode live melakukan hingga delapan analisis dengan fallback model dan timeout
60 detik per kasus; provider dapat mengenakan biaya. Output JSON mencatat model,
durasi, jumlah temuan, ekspektasi deteksi, serta jumlah kutipan yang merupakan
substring verbatim input. Error provider dilaporkan tanpa detail sensitif.

False positive/negative dihitung pada tingkat dokumen (ada/tidak ada temuan),
bukan klasifikasi per kategori. Pencocokan kutipan konservatif: nomor pasal dan
parafrase dapat terhitung tidak terverifikasi. Harness belum mencatat token atau
biaya aktual dan tidak boleh dipakai untuk klaim biaya/akurasi produk.

Label fixture merupakan hipotesis engineering, belum hasil review ahli hukum.
Sebelum pilot publik, perluas dataset dengan kasus ambigu, pertahankan set uji
terpisah, minta reviewer domain menandai kutipan/risiko, dan bandingkan hasil
lintas versi prompt/model. Jangan menjalankan live eval otomatis pada CI.

Status saat ini: dry-run berhasil dengan 8 kasus dan 0 panggilan provider.
Live belum dijalankan karena API key tidak tersedia.
