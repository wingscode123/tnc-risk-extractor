import React from "react";
import { HasilAnalisis } from "../types";
import { ShieldAlert, AlertTriangle, CheckCircle, Scale, ShieldCheck, FileText } from "lucide-react";

interface DocumentInfoSidebarProps {
  inputText: string;
  result: HasilAnalisis | null;
  isLoading: boolean;
}

export const DocumentInfoSidebar: React.FC<DocumentInfoSidebarProps> = ({
  inputText,
  result,
  isLoading,
}) => {
  const items = result?.daftar_risiko || [];
  const highCount = items.filter((item) =>
    item.tingkat_risiko?.toLowerCase().includes("tinggi")
  ).length;
  const mediumCount = items.filter((item) =>
    item.tingkat_risiko?.toLowerCase().includes("sedang")
  ).length;

  const totalWords = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const totalChars = inputText.length;

  // Calculate a representative safety score (100 is pristine, deduct 20 for high risk, 10 for medium)
  const safetyScore = result
    ? Math.max(10, Math.min(100, 100 - highCount * 25 - mediumCount * 12))
    : null;

  const scoreColor =
    safetyScore === null
      ? "text-slate-400"
      : safetyScore < 50
      ? "text-red-500"
      : safetyScore < 80
      ? "text-orange-500"
      : "text-emerald-500";

  // Document name heuristic
  const firstLine = inputText.trim().split("\n")[0] || "Dokumen_Perjanjian.txt";
  const docName =
    firstLine.length > 35 ? firstLine.slice(0, 32) + "..." : firstLine || "Draft_Perjanjian_v1.txt";

  const currentDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      {/* Informasi Dokumen Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Informasi Dokumen
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Nama Dokumen / Sumber</p>
            <p className="text-sm font-semibold text-slate-800 break-words font-mono text-xs sm:text-sm">
              {docName}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Tanggal Analisis</p>
            <p className="text-sm font-semibold text-slate-800">{currentDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Kapasitas Teks</p>
            <p className="text-sm font-semibold text-slate-800">
              {totalWords.toLocaleString()} Kata &bull; {totalChars.toLocaleString()} Karakter
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Skor Keamanan</span>
            <span className={`text-xl font-bold ${scoreColor}`}>
              {safetyScore !== null ? `${safetyScore}/100` : "--/100"}
            </span>
          </div>
        </div>
      </div>

      {/* Statistik Risiko Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex-1">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Statistik Risiko
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm text-slate-600">Risiko Tinggi</span>
            </div>
            <span className="font-bold text-slate-900 font-mono text-base">
              {highCount < 10 ? `0${highCount}` : highCount}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-400"></span>
              <span className="text-sm text-slate-600">Risiko Sedang</span>
            </div>
            <span className="font-bold text-slate-900 font-mono text-base">
              {mediumCount < 10 ? `0${mediumCount}` : mediumCount}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400"></span>
              <span className="text-sm text-slate-600">Total Klausul Terdeteksi</span>
            </div>
            <span className="font-bold text-slate-900 font-mono text-base">
              {items.length < 10 ? `0${items.length}` : items.length}
            </span>
          </div>
        </div>

        {/* 5 Kriteria Fokus Legal */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">
            5 Fokus Evaluasi
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-semibold shrink-0">1.</span>
              <span>Pembebasan tanggung jawab mutlak</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-semibold shrink-0">2.</span>
              <span>Denda tersembunyi / tidak wajar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-semibold shrink-0">3.</span>
              <span>Ubah sepihak tanpa notifikasi</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 font-semibold shrink-0">4.</span>
              <span>Eksploitasi data pihak ketiga</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500 font-semibold shrink-0">5.</span>
              <span>Pelepasan hak hukum (class action)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
