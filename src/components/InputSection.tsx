import React from "react";
import { Sparkles, Trash2, FileText, ArrowRight, Loader2 } from "lucide-react";
import { CONTOH_DOKUMEN } from "../data/contohDokumen";
import { ContohDokumen } from "../types";

interface InputSectionProps {
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  onAnalyze: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  inputText,
  setInputText,
  isLoading,
  onAnalyze,
}) => {
  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  const handleSelectSample = (sample: ContohDokumen) => {
    setInputText(sample.teks);
  };

  const handleClear = () => {
    setInputText("");
  };

  return (
    <section
      id="input-section"
      className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Input Dokumen Legal
          </h2>
          <p className="text-sm font-semibold text-slate-900">
            Pemeriksaan Syarat & Ketentuan (ToS), Kebijakan Privasi, atau Kontrak
          </p>
        </div>

        {inputText.length > 0 && (
          <button
            id="btn-clear-text"
            onClick={handleClear}
            disabled={isLoading}
            className="text-xs font-medium text-slate-500 hover:text-red-600 flex items-center gap-1 self-start sm:self-center transition-colors disabled:opacity-50 px-2 py-1 rounded hover:bg-slate-50"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Kosongkan Teks</span>
          </button>
        )}
      </div>

      {/* Quick Sample Pickers */}
      <div className="mb-4">
        <span className="text-xs font-medium text-slate-500 block mb-1.5">
          Pilih Contoh Kasus Cepat:
        </span>
        <div className="flex flex-wrap gap-2">
          {CONTOH_DOKUMEN.map((sample) => (
            <button
              key={sample.id}
              id={`btn-sample-${sample.id}`}
              onClick={() => handleSelectSample(sample)}
              disabled={isLoading}
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-blue-50/70 hover:border-blue-200 text-slate-700 font-medium transition-colors disabled:opacity-50 text-left"
              title={sample.deskripsi}
            >
              {sample.judul}
            </button>
          ))}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          id="legal-document-textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Tempelkan draf pasal atau perjanjian di sini... (misal: 'Pasal 4.1: Perusahaan berhak kapan saja membagikan seluruh data riwayat penelusuran dan lokasi pengguna kepada mitra afiliasi...')"
          rows={6}
          disabled={isLoading}
          className="w-full rounded-lg border border-slate-200 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans leading-relaxed disabled:bg-slate-50 transition-colors"
        />

        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>
            {wordCount.toLocaleString()} kata &bull; {charCount.toLocaleString()} karakter
          </span>
          <span className="text-slate-400">Maks. 50.000 karakter</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          Engine memindai 5 kategori klausul jebakan dan memformat output dalam{" "}
          <strong className="text-slate-700">Strict JSON</strong>.
        </div>

        <button
          id="btn-analyze-document"
          onClick={onAnalyze}
          disabled={isLoading || !inputText.trim()}
          type="button"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Menganalisis Dokumen...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-blue-200" />
              <span>Analisis Risiko Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </section>
  );
};
