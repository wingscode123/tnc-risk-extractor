import React, { useState } from "react";
import { MAX_TEXT_LENGTH } from "../analysis";
import { useEffect, useRef } from "react";
import { Sparkles, Trash2, FileText, ArrowRight, Loader2 } from "lucide-react";
import { CONTOH_DOKUMEN } from "../data/contohDokumen";
import { ContohDokumen } from "../types";
import { importDocument } from "../importDocument";

interface InputSectionProps {
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  onAnalyze: () => void;
  documentRevision?: number;
}

export const InputSection: React.FC<InputSectionProps> = ({
  inputText,
  setInputText,
  isLoading,
  onAnalyze,
  documentRevision = 0,
}) => {
  const charCount = inputText.length;
  const [fileError, setFileError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    importRequest.current?.abort();
    importRequest.current = null;
    setIsImporting(false);
    setFileError(null);
    return () => {
      importRequest.current?.abort();
      importRequest.current = null;
    };
  }, [documentRevision]);
  const busy = isLoading || isImporting;
  const overLimit = charCount > MAX_TEXT_LENGTH;
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
            Pemeriksaan Syarat & Ketentuan (ToS), Kebijakan Privasi, atau
            Kontrak
          </p>
        </div>

        {inputText.length > 0 && (
          <button
            id="btn-clear-text"
            onClick={handleClear}
            disabled={busy}
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
              disabled={busy}
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-blue-50/70 hover:border-blue-200 text-slate-700 font-medium transition-colors disabled:opacity-50 text-left"
              title={sample.deskripsi}
            >
              {sample.judul}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
          <FileText size={14} />{" "}
          {isImporting ? "Membaca dokumen..." : "Impor TXT, DOCX, atau PDF"}
          <input
            aria-label="Impor dokumen"
            type="file"
            accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={busy}
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              setFileError(null);
              if (!file) return;
              const controller = new AbortController();
              importRequest.current = controller;
              setIsImporting(true);
              try {
                const text = await importDocument(file, controller.signal);
                if (importRequest.current !== controller) return;
                setInputText(text);
              } catch (error) {
                if (controller.signal.aborted) return;
                setFileError(
                  error instanceof Error
                    ? error.message
                    : "File tidak dapat dibaca.",
                );
              } finally {
                if (importRequest.current === controller) {
                  importRequest.current = null;
                  setIsImporting(false);
                }
              }
            }}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          TXT maks. 200 KB, DOCX 2 MB, PDF berbasis teks 5 MB / 50 halaman.
          Maksimal 50.000 karakter. Periksa teks hasil impor: urutan PDF dapat
          berubah; gambar, format, dan OCR tidak didukung. DOCX mengambil teks
          utama saja.
        </p>
        {fileError && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {fileError}
          </p>
        )}
      </div>
      <label
        htmlFor="legal-document-textarea"
        className="mb-2 block text-xs font-semibold text-slate-600"
      >
        Teks dokumen
      </label>
      {/* Main Textarea */}
      <div className="relative">
        <textarea
          id="legal-document-textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Tempelkan draf pasal atau perjanjian di sini... (misal: 'Pasal 4.1: Perusahaan berhak kapan saja membagikan seluruh data riwayat penelusuran dan lokasi pengguna kepada mitra afiliasi...')"
          rows={6}
          disabled={busy}
          aria-invalid={overLimit}
          aria-describedby="input-length-help"
          className="w-full rounded-lg border border-slate-200 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans leading-relaxed disabled:bg-slate-50 transition-colors"
        />

        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>
            {wordCount.toLocaleString()} kata &bull;{" "}
            {charCount.toLocaleString()} karakter
          </span>
          <span
            id="input-length-help"
            className={overLimit ? "text-red-700" : "text-slate-400"}
          >
            {overLimit
              ? "Teks terlalu panjang. Kurangi hingga 50.000 karakter."
              : "Maks. 50.000 karakter"}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          Meninjau 5 fokus klausul dan menjelaskan potensi dampaknya untuk Anda.
        </div>

        <button
          id="btn-analyze-document"
          onClick={onAnalyze}
          disabled={busy || !inputText.trim() || overLimit}
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
