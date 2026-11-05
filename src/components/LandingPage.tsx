import {
  ArrowRight,
  Check,
  FileText,
  ShieldCheck,
  Scale,
  ArrowUpRight,
} from "lucide-react";

const focuses = [
  [
    "01",
    "Tanggung jawab yang hilang",
    "Pembebasan tanggung jawab perusahaan yang membebankan seluruh risiko kepada Anda.",
  ],
  [
    "02",
    "Biaya di balik kalimat kecil",
    "Denda tersembunyi, biaya tambahan, dan kewajiban pembayaran yang tidak wajar.",
  ],
  [
    "03",
    "Aturan yang bisa berubah",
    "Hak mengubah perjanjian sepihak tanpa pemberitahuan yang memadai.",
  ],
  [
    "04",
    "Data yang berpindah tangan",
    "Pembagian atau pemanfaatan data pribadi dengan batasan yang tidak jelas.",
  ],
  [
    "05",
    "Hak yang Anda lepaskan",
    "Pembatasan gugatan dan klausul penyelesaian sengketa yang memberatkan.",
  ],
];

export function LandingPage({
  onStart,
}: {
  onStart: (sample?: boolean) => void;
}) {
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <header className="landing-nav wrap">
        <a href="/" className="brand">
          <span className="brand-mark">
            <Scale size={21} />
          </span>
          LexGuard<span className="brand-ai">AI</span>
        </a>
        <nav aria-label="Navigasi beranda" className="landing-links">
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#fitur">Yang kami tinjau</a>
          <a href="#faq">FAQ</a>
        </nav>
        <button className="btn-dark" onClick={() => onStart()}>
          Mulai analisis <ArrowUpRight size={16} />
        </button>
      </header>
      <main id="main-content">
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> BACA LEBIH JELAS. PUTUSKAN LEBIH SADAR.
            </p>
            <h1>
              Sebelum klik
              <br />
              <span>“Saya setuju.”</span>
            </h1>
            <p className="hero-description">
              Kenali klausul yang perlu Anda pertanyakan. LexGuard membantu
              mengurai syarat layanan, kebijakan privasi, dan kontrak menjadi
              penjelasan yang mudah dipahami.
            </p>
            <div className="hero-actions">
              <button className="btn-blue" onClick={() => onStart()}>
                Periksa dokumen saya <ArrowRight size={18} />
              </button>
              <button className="text-button" onClick={() => onStart(true)}>
                Coba dengan contoh <ArrowUpRight size={16} />
              </button>
            </div>
            <p className="hero-note">
              <Check size={14} /> Tanpa membuat akun <span>·</span> 3 analisis
              AI berhasil / hari / IP
            </p>
          </div>
          <div className="hero-preview" aria-label="Ilustrasi temuan analisis">
            <div className="preview-top">
              <span>
                <FileText size={16} /> Perjanjian layanan
              </span>
              <span className="preview-demo">ILUSTRASI</span>
            </div>
            <div className="preview-paper">
              <p className="document-eyebrow">SYARAT & KETENTUAN</p>
              <h2>
                Detail kecil.
                <br />
                Dampak yang besar.
              </h2>
              <div className="paper-line" />
              <div className="paper-line short" />
              <p className="preview-clause">
                Pasal 4.1
                <br />
                <mark>
                  Perusahaan dapat mengubah ketentuan perjanjian kapan saja
                  tanpa pemberitahuan kepada pengguna.
                </mark>
              </p>
              <div className="paper-line" />
              <div className="paper-line short" />
            </div>
            <div className="preview-finding">
              <span className="finding-icon">
                <ShieldCheck size={22} />
              </span>
              <div>
                <p>
                  <span className="risk-dot" /> PERLU DITINJAU
                </p>
                <h3>Perubahan sepihak</h3>
                <p>
                  Anda dapat terikat aturan baru tanpa kesempatan meninjaunya
                  terlebih dahulu.
                </p>
              </div>
            </div>
            <p className="preview-caption">
              Contoh penjelasan · bukan hasil pemeriksaan dokumen Anda
            </p>
          </div>
        </section>
        <div className="use-cases">
          <div className="wrap">
            <span>UNTUK DOKUMEN SEHARI-HARI</span>
            <p>Syarat layanan</p>
            <span className="case-divider" />
            <p>Kebijakan privasi</p>
            <span className="case-divider" />
            <p>Perjanjian sewa</p>
            <span className="case-divider" />
            <p>Kontrak kerja sama</p>
          </div>
        </div>
        <section id="cara-kerja" className="section wrap">
          <div className="section-heading">
            <p className="eyebrow">DARI TEKS KE PEMAHAMAN</p>
            <h2>
              Tiga langkah sebelum
              <br />
              mengambil keputusan.
            </h2>
          </div>
          <div className="steps-grid">
            {[
              [
                "01",
                "Bawa dokumennya",
                "Tempelkan teks atau impor TXT, DOCX, dan PDF berbasis teks. Mulai dari satu pasal hingga 50.000 karakter.",
              ],
              [
                "02",
                "Kenali titik risikonya",
                "AI meninjau lima fokus klausul dan menyajikan kutipan beserta penjelasan singkat.",
              ],
              [
                "03",
                "Tentukan langkah Anda",
                "Periksa kembali konteks asli, simpan hasil, atau diskusikan temuan dengan penasihat hukum.",
              ],
            ].map(([n, title, description]) => (
              <article key={n}>
                <span className="step-number">{n}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="fitur" className="focus-section">
          <div className="wrap focus-layout">
            <div className="focus-intro">
              <p className="eyebrow">LIMA FOKUS PEMERIKSAAN</p>
              <h2>
                Yang tertulis
                <br />
                perlu dimengerti.
              </h2>
              <p>
                Kami mencari potensi beban bagi pihak konsumen atau penyewa,
                lalu menjelaskan alasan klausul itu perlu diperhatikan.
              </p>
              <button className="text-button" onClick={() => onStart(true)}>
                Lihat contoh dokumen <ArrowRight size={17} />
              </button>
            </div>
            <div className="focus-list">
              {focuses.map(([n, title, description]) => (
                <article key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="section wrap responsibility">
          <div>
            <p className="eyebrow">KENDALI TETAP PADA ANDA</p>
            <h2>
              Alat bantu membaca.
              <br />
              Keputusan tetap manusia.
            </h2>
          </div>
          <div>
            <p>
              AI bisa melewatkan konteks atau memberikan temuan yang keliru.
              Tidak ada temuan bukan berarti dokumen aman. LexGuard bukan
              pengganti nasihat advokat.
            </p>
            <p>
              Teks dikirim ke layanan Gemini untuk dianalisis. Hasil di-cache di
              memori server hingga 24 jam. Riwayat hanya disimpan di browser
              jika Anda memilihnya. Hindari mengirim password, identitas
              pribadi, atau rahasia usaha.
            </p>
          </div>
        </section>
        <section id="faq" className="faq-section wrap">
          <div>
            <p className="eyebrow">SEBELUM ANDA MULAI</p>
            <h2>Pertanyaan yang wajar.</h2>
          </div>
          <div className="faq-list">
            {[
              [
                "Apakah saya perlu membuat akun?",
                "Tidak. MVP ini dapat digunakan sebagai tamu. Tersedia tiga analisis AI berhasil per IP per hari, direset pukul 00.00 UTC (07.00 WIB). Hasil yang sudah ada di cache tidak menggunakan kuota baru.",
              ],
              [
                "Dokumen apa yang bisa diperiksa?",
                "Tempelkan teks hingga 50.000 karakter, impor TXT (200 KB), DOCX (2 MB), atau PDF berbasis teks (5 MB, 50 halaman). Tinjau teks impor; format dan urutannya dapat berbeda dari dokumen asli. PDF scan/gambar, OCR, dan pengambilan dari URL belum tersedia.",
              ],
              [
                "Apakah hasilnya merupakan nasihat hukum?",
                "Tidak. Temuan adalah bantuan untuk memahami klausul dan menentukan pertanyaan lanjutan. Selalu baca konteks asli dan konsultasikan keputusan penting dengan profesional hukum.",
              ],
              [
                "Di mana riwayat saya disimpan?",
                "Secara default riwayat tidak disimpan. Jika diaktifkan, maksimal 10 analisis beserta teks disimpan di browser perangkat ini. Anda dapat menghapusnya kapan saja. Riwayat tidak disinkronkan ke akun atau cloud.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="cta-section wrap">
          <div>
            <p className="eyebrow">PAHAMI SEBELUM MENYETUJUI</p>
            <h2>Mulai dari satu pasal.</h2>
            <p>
              Ubah kalimat yang membingungkan menjadi pertanyaan yang lebih
              jelas.
            </p>
          </div>
          <button className="btn-blue" onClick={() => onStart()}>
            Buka ruang analisis <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <footer className="landing-footer wrap">
        <a href="/" className="brand">
          <Scale size={21} /> LexGuard AI
        </a>
        <p>© {new Date().getFullYear()} LexGuard AI · Bukan nasihat hukum.</p>
        <a href="#main-content">Kembali ke atas ↑</a>
      </footer>
    </div>
  );
}
