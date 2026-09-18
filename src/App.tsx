/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DocumentInfoSidebar } from "./components/DocumentInfoSidebar";
import { InputSection } from "./components/InputSection";
import { ResultsSection } from "./components/ResultsSection";
import { HasilAnalisis } from "./types";
import { CONTOH_DOKUMEN } from "./data/contohDokumen";
import { AlertCircle, ShieldCheck, FileCheck2, BookOpen, Clock } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("analisis");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Pre-load with sample from prompt for immediate testing
  const [inputText, setInputText] = useState<string>(CONTOH_DOKUMEN[1].teks);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HasilAnalisis | null>(null);
  const [quotaSignal, setQuotaSignal] = useState<number>(0);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = data.error;
        if (typeof msg === "string") {
          try {
            const parsedError = JSON.parse(msg);
            if (parsedError?.error?.message) {
              msg = parsedError.error.message;
            }
          } catch {
            // Keep original string if not JSON
          }
        }
        if (typeof msg === "string" && (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE"))) {
          msg = "Model AI sedang mengalami lonjakan permintaan sesaat dari server Google. Silakan klik tombol 'Coba Lagi' di bawah ini.";
        }
        throw new Error(msg || "Terjadi kesalahan saat memproses dokumen.");
      }

      if (!data || !Array.isArray(data.daftar_risiko)) {
        throw new Error("Respon analisis tidak sesuai dengan format daftar_risiko.");
      }

      setResult(data);
    } catch (err: any) {
      console.error("Error analyzing:", err);
      setError(err.message || "Gagal menghubungi server analisis.");
    } finally {
      setIsLoading(false);
      setQuotaSignal((s) => s + 1);
    }
  };

  const handleNewAnalysis = () => {
    setInputText("");
    setResult(null);
    setError(null);
  };

  const handleExportJson = () => {
    if (!result) return;
    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexguard-analisis-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-900">
      {/* Dark Sidebar matching Design HTML */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        quotaRefreshSignal={quotaSignal}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onNewAnalysis={handleNewAnalysis}
          onExportJson={handleExportJson}
          hasResult={Boolean(result)}
        />

        {/* Tab Router / View Controller */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === "analisis" && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (col-span-4): Document Metadata & Risk Statistics */}
              <div className="lg:col-span-4">
                <DocumentInfoSidebar
                  inputText={inputText}
                  result={result}
                  isLoading={isLoading}
                />
              </div>

              {/* Right Column (col-span-8): Input Document & Risk Findings */}
              <div className="lg:col-span-8 space-y-6">
                <InputSection
                  inputText={inputText}
                  setInputText={setInputText}
                  isLoading={isLoading}
                  onAnalyze={handleAnalyze}
                />

                {error && (
                  <div
                    id="error-banner"
                    className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-bold">Gagal Menganalisis Dokumen</h3>
                        <p className="text-xs sm:text-sm mt-0.5 text-red-700">{error}</p>
                      </div>
                    </div>
                    <button
                      id="btn-retry-analysis"
                      type="button"
                      onClick={handleAnalyze}
                      disabled={isLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-center disabled:opacity-50"
                    >
                      Coba Lagi
                    </button>
                  </div>
                )}

                {result && <ResultsSection result={result} />}

                {!result && !isLoading && !error && (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Siap Menganalisis Dokumen
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Klik <strong>"Analisis Risiko Sekarang"</strong> di atas untuk memindai dokumen dan menghasilkan daftar risiko terstruktur (Strict JSON).
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentTab === "riwayat" && (
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800">Riwayat Kontrak Teranalisis</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Daftar sesi pemeriksaan ToS dan perjanjian legal yang telah dilakukan.
              </p>
              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Perjanjian Sewa Unit & Biaya Keterlambatan</h4>
                    <span className="text-xs text-slate-500 font-mono">2 Klausul Berisiko &bull; Skor 42/100</span>
                  </div>
                  <button
                    onClick={() => {
                      setInputText(CONTOH_DOKUMEN[1].teks);
                      setCurrentTab("analisis");
                    }}
                    type="button"
                    className="text-xs text-blue-600 font-medium hover:underline"
                  >
                    Buka Dokumen &rarr;
                  </button>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Ketentuan Layanan & Pelacakan Lokasi Pengguna</h4>
                    <span className="text-xs text-slate-500 font-mono">1 Klausul Risiko Tinggi &bull; Skor 75/100</span>
                  </div>
                  <button
                    onClick={() => {
                      setInputText(CONTOH_DOKUMEN[0].teks);
                      setCurrentTab("analisis");
                    }}
                    type="button"
                    className="text-xs text-blue-600 font-medium hover:underline"
                  >
                    Buka Dokumen &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentTab === "template" && (
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800">Library Template Dokumen</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Gunakan draf standar untuk menguji ketahanan klausul atau membandingkan klausul yang adil.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CONTOH_DOKUMEN.map((sample) => (
                  <div key={sample.id} className="p-4 border border-slate-200 rounded-lg flex flex-col justify-between hover:border-blue-300 transition-colors">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-1">{sample.judul}</h4>
                      <p className="text-xs text-slate-500 mb-3">{sample.deskripsi}</p>
                    </div>
                    <button
                      onClick={() => {
                        setInputText(sample.teks);
                        setCurrentTab("analisis");
                      }}
                      type="button"
                      className="text-xs text-white bg-blue-600 hover:bg-blue-700 py-1.5 px-3 rounded-md font-medium text-center transition-colors"
                    >
                      Muat ke Editor
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
