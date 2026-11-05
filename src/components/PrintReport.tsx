import type { SavedAnalysis } from "../history";
export function PrintReport({ analysis }: { analysis: SavedAnalysis }) {
  return (
    <section className="print-report hidden" aria-label="Laporan cetak lengkap">
      <h1>LexGuard AI — Laporan analisis</h1>
      <p>{new Date(analysis.analyzedAt).toLocaleString("id-ID")}</p>
      <p>Dokumen: {analysis.text.split("\n")[0].slice(0, 120)}</p>
      <p>
        {analysis.result.daftar_risiko.length} temuan · Semua tingkat risiko
      </p>
      <p>
        Hasil AI bukan nasihat hukum atau jaminan keamanan. Periksa kutipan
        dalam konteks dokumen asli.
      </p>
      {analysis.result.daftar_risiko.length === 0 && (
        <p>Tidak ada risiko terdeteksi pada lima fokus pemeriksaan.</p>
      )}
      {analysis.result.daftar_risiko.map((item, index) => (
        <article key={index}>
          <h2>
            {index + 1}. Risiko {item.tingkat_risiko}
          </h2>
          <blockquote>{item.pasal_terkait}</blockquote>
          <p>{item.penjelasan_bahasa_manusia}</p>
        </article>
      ))}
    </section>
  );
}
