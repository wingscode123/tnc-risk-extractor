import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DocumentInfoSidebar } from "./components/DocumentInfoSidebar";
import { InputSection } from "./components/InputSection";
import { ResultsSection } from "./components/ResultsSection";
import { LandingPage } from "./components/LandingPage";
import { PrintReport } from "./components/PrintReport";
import { CONTOH_DOKUMEN } from "./data/contohDokumen";
import { isAnalysis, MAX_TEXT_LENGTH } from "./analysis";
import { exportJson } from "./export";
import { readHistory, writeHistory, type SavedAnalysis } from "./history";
import { useWorkspaceRoute } from "./useWorkspaceRoute";
import { CompareSection } from "./components/CompareSection";

export default function App() {
  const { inWorkspace, currentTab, setCurrentTab, navigate } =
    useWorkspaceRoute();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [comparisonTexts, setComparisonTexts] = useState<[string, string]>([
    "",
    "",
  ]);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [quotaSignal, setQuotaSignal] = useState(0);
  const [saveLocally, setSaveLocally] = useState(false);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      setHistory(readHistory());
    } catch {
      setStorageError(
        "Riwayat lokal tidak dapat dibaca. Hasil analisis tetap dapat digunakan.",
      );
    }
    return () => {
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [isMobileSidebarOpen]);

  const changeDocument = (text: string) => {
    setDocumentRevision((v) => v + 1);
    request.current?.abort();
    request.current = null;
    setIsLoading(false);
    setInputText(text);
    setAnalysis(null);
    setError(null);
  };
  const persist = (next: SavedAnalysis[]) => {
    try {
      writeHistory(next);
      setHistory(next);
      setStorageError(null);
    } catch {
      setStorageError(
        "Penyimpanan browser tidak tersedia atau penuh. Perubahan riwayat belum tersimpan. Unduh JSON untuk menyimpan hasil.",
      );
    }
  };
  const analyze = async () => {
    if (
      request.current ||
      !inputText.trim() ||
      inputText.length > MAX_TEXT_LENGTH
    )
      return;
    const controller = new AbortController();
    request.current = controller;
    const text = inputText;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    const timeout = setTimeout(() => controller.abort("timeout"), 65_000);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      const data: unknown = await response.json().catch(() => {
        throw new Error(
          "Respons server tidak dapat dibaca. Silakan coba lagi.",
        );
      });
      if (!response.ok)
        throw new Error(
          data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Analisis gagal. Silakan coba lagi.",
        );
      if (!isAnalysis(data))
        throw new Error(
          "Format hasil analisis tidak valid. Silakan coba lagi.",
        );
      if (request.current !== controller) return;
      const saved: SavedAnalysis = {
        id: crypto.randomUUID(),
        text,
        result: data,
        analyzedAt: new Date().toISOString(),
      };
      setAnalysis(saved);
      if (saveLocally) persist([saved, ...history].slice(0, 10));
    } catch (err) {
      if (request.current === controller)
        setError(
          controller.signal.aborted
            ? "Waktu tunggu habis. Coba lagi; server mungkin masih menyelesaikan analisis."
            : err instanceof Error
              ? err.message
              : "Gagal menghubungi server.",
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setIsLoading(false);
      }
      setQuotaSignal((s) => s + 1);
    }
  };
  if (!inWorkspace)
    return (
      <LandingPage
        onStart={(sample) => {
          if (sample) changeDocument(CONTOH_DOKUMEN[1].teks);
          setCurrentTab("analisis");
        }}
      />
    );

  return (
    <div className="workspace flex min-h-screen bg-slate-50 text-slate-900">
      <a className="skip-link" href="#workspace-main">
        Lewati ke konten
      </a>
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        quotaRefreshSignal={quotaSignal}
      />
      <div id="workspace-content" className="flex min-w-0 flex-1 flex-col">
        <Header
          isMobileSidebarOpen={isMobileSidebarOpen}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((v) => !v)}
          onNewAnalysis={() => {
            changeDocument("");
            setCurrentTab("analisis");
          }}
          onExportJson={() => analysis && exportJson(analysis.result)}
          hasResult={!!analysis}
        />
        <main id="workspace-main" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-3 print:hidden">
            <button
              onClick={() => navigate(false)}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700"
            >
              <ArrowLeft size={16} /> Beranda
            </button>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs text-blue-700">
              Ruang analisis · akses tamu
            </span>
          </div>
          {storageError && (
            <p
              role="status"
              className="mx-auto mb-4 max-w-7xl rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
            >
              {storageError}
            </p>
          )}
          {currentTab === "analisis" && (
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="order-2 lg:order-1 lg:col-span-4">
                <DocumentInfoSidebar
                  inputText={analysis?.text ?? inputText}
                  result={analysis?.result ?? null}
                  isLoading={isLoading}
                  analyzedAt={analysis?.analyzedAt}
                />
              </div>
              <div className="order-1 space-y-6 lg:order-2 lg:col-span-8">
                <InputSection
                  documentRevision={documentRevision}
                  inputText={inputText}
                  setInputText={changeDocument}
                  isLoading={isLoading}
                  onAnalyze={analyze}
                />
                <div className="privacy-note rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
                  <p>
                    <strong>Perhatikan sebelum mengirim.</strong> Teks dikirim
                    ke Gemini untuk diproses. Hasil disimpan di cache memori
                    server hingga 24 jam. Hindari data identitas, password, dan
                    rahasia usaha. Hasil bukan nasihat hukum.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={saveLocally}
                      disabled={isLoading}
                      onChange={(e) => setSaveLocally(e.target.checked)}
                      className="mt-0.5"
                    />
                    Simpan analisis berikutnya di browser ini (maks. 10,
                    termasuk teks). Gunakan hanya pada perangkat pribadi.
                  </label>
                </div>
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  >
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                      <p className="font-semibold">Analisis belum berhasil</p>
                      <p className="mt-1">{error}</p>
                      <button
                        onClick={analyze}
                        disabled={isLoading}
                        className="mt-3 font-semibold underline disabled:opacity-50"
                      >
                        Coba lagi
                      </button>
                    </div>
                  </div>
                )}
                {isLoading && (
                  <p
                    role="status"
                    className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800"
                  >
                    Sedang meninjau dokumen. Proses dapat memerlukan hingga satu
                    menit.
                  </p>
                )}
                {analysis && (
                  <>
                    <div className="result-actions flex flex-wrap justify-end gap-3">
                      <button
                        className="text-sm font-medium text-blue-700 underline"
                        onClick={() => window.print()}
                      >
                        Cetak / simpan PDF
                      </button>
                    </div>
                    <ResultsSection
                      key={analysis.id}
                      result={analysis.result}
                    />
                    <PrintReport analysis={analysis} />
                  </>
                )}
                {!analysis && !isLoading && !error && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <ShieldCheck
                      className="mx-auto mb-3 text-blue-600"
                      size={32}
                    />
                    <h2 className="font-semibold">Mulai dengan dokumen Anda</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Tempelkan teks, impor TXT/DOCX/PDF, atau pilih contoh.
                      Temuan akan tampil di sini.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {currentTab === "riwayat" && (
            <section className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                  <Clock size={22} /> Riwayat di perangkat ini
                </h1>
                {history.length > 0 && (
                  <button
                    onClick={() => persist([])}
                    className="text-sm text-red-700 underline"
                  >
                    Hapus semua
                  </button>
                )}
              </div>
              <p className="mb-6 text-sm text-slate-500">
                Hanya analisis yang Anda pilih untuk disimpan. Menghapus riwayat
                di sini tidak menghapus cache sementara server.
              </p>
              {history.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto mb-3 text-slate-400" />
                  <h2 className="font-semibold">
                    Belum ada analisis tersimpan
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Aktifkan penyimpanan lokal di ruang analisis untuk menyimpan
                    hasil berikutnya.
                  </p>
                  <button
                    onClick={() => setCurrentTab("analisis")}
                    className="mt-5 text-sm text-blue-700 underline"
                  >
                    Mulai analisis
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-medium">
                          {item.text.slice(0, 70)}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(item.analyzedAt).toLocaleString("id-ID")} ·{" "}
                          {item.result.daftar_risiko.length} temuan
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          changeDocument(item.text);
                          setAnalysis(item);
                          setCurrentTab("analisis");
                        }}
                        className="text-sm font-semibold text-blue-700"
                      >
                        Buka
                      </button>
                      <button
                        aria-label={`Hapus analisis ${item.text.slice(0, 30)}`}
                        onClick={() =>
                          persist(history.filter((h) => h.id !== item.id))
                        }
                        className="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {currentTab === "compare" && (
            <CompareSection
              texts={comparisonTexts}
              setTexts={setComparisonTexts}
              editorText={inputText}
              onAnalyzeText={(text) => {
                changeDocument(text);
                setCurrentTab("analisis");
              }}
            />
          )}
          {currentTab === "template" && (
            <section className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              <h1 className="flex items-center gap-2 text-xl font-semibold">
                <BookOpen size={22} /> Contoh dokumen
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Contoh ilustratif untuk mencoba pemeriksaan. Bukan template
                kontrak yang disarankan atau disahkan secara hukum.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {CONTOH_DOKUMEN.map((sample) => (
                  <article
                    key={sample.id}
                    className="flex flex-col rounded-lg border border-slate-200 p-5"
                  >
                    <h2 className="font-semibold">{sample.judul}</h2>
                    <p className="mt-2 flex-1 text-sm text-slate-500">
                      {sample.deskripsi}
                    </p>
                    <button
                      onClick={() => {
                        changeDocument(sample.teks);
                        setCurrentTab("analisis");
                      }}
                      className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Muat ke editor
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
        <footer className="workspace-footer border-t border-slate-200 p-4 text-center text-xs text-slate-500">
          LexGuard AI · Bantuan membaca dokumen, bukan nasihat hukum.
        </footer>
      </div>
    </div>
  );
}
