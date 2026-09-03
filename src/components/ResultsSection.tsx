import React, { useState } from "react";
import { LayoutGrid, Code, CheckCircle2 } from "lucide-react";
import { HasilAnalisis } from "../types";
import { RiskCard } from "./RiskCard";
import { JsonViewer } from "./JsonViewer";

interface ResultsSectionProps {
  result: HasilAnalisis;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [filterLevel, setFilterLevel] = useState<"all" | "Tinggi" | "Sedang">("all");

  const items = result.daftar_risiko || [];
  const highCount = items.filter((item) =>
    item.tingkat_risiko?.toLowerCase().includes("tinggi")
  ).length;
  const mediumCount = items.filter((item) =>
    item.tingkat_risiko?.toLowerCase().includes("sedang")
  ).length;

  const filteredItems = items.filter((item) => {
    if (filterLevel === "all") return true;
    return item.tingkat_risiko?.toLowerCase().includes(filterLevel.toLowerCase());
  });

  const hasHighRisk = highCount > 0;

  return (
    <section
      id="results-section"
      className="bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-hidden"
    >
      {/* Header matching Design HTML: px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">
            Daftar Temuan Risiko (Strict JSON Output)
          </h2>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              hasHighRisk
                ? "bg-red-100 text-red-600"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {items.length > 0 ? "Analisis Selesai" : "Bersih / Aman"}
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-white self-start sm:self-center shadow-2xs">
          <button
            id="tab-visual-view"
            type="button"
            onClick={() => setActiveTab("visual")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === "visual"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Kartu Temuan</span>
          </button>

          <button
            id="tab-json-view"
            type="button"
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === "json"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Format JSON</span>
          </button>
        </div>
      </div>

      {/* Filter bar for Visual Tab */}
      {activeTab === "visual" && items.length > 0 && (
        <div className="px-6 py-2.5 bg-slate-50/40 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-slate-500 mr-1">Filter:</span>
            <button
              id="filter-all"
              type="button"
              onClick={() => setFilterLevel("all")}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                filterLevel === "all"
                  ? "bg-slate-900 text-white font-medium"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Semua ({items.length})
            </button>
            <button
              id="filter-tinggi"
              type="button"
              onClick={() => setFilterLevel("Tinggi")}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                filterLevel === "Tinggi"
                  ? "bg-red-600 text-white font-medium"
                  : "bg-white border border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              Tinggi ({highCount})
            </button>
            <button
              id="filter-sedang"
              type="button"
              onClick={() => setFilterLevel("Sedang")}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                filterLevel === "Sedang"
                  ? "bg-orange-500 text-white font-medium"
                  : "bg-white border border-orange-200 text-orange-600 hover:bg-orange-50"
              }`}
            >
              Sedang ({mediumCount})
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            {filteredItems.length} dari {items.length} pasal ditampilkan
          </span>
        </div>
      )}

      {/* Body Content */}
      <div className="p-6">
        {activeTab === "json" ? (
          <JsonViewer data={result} />
        ) : items.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">
              Tidak Ditemukan Klausul Berbahaya
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Berdasarkan 5 parameter klausul jebakan, dokumen tidak memuat klausul yang memberatkan pengguna secara sepihak.
            </p>
          </div>
        ) : (
          <div id="risk-cards-grid" className="space-y-3.5">
            {filteredItems.map((item, idx) => (
              <RiskCard key={idx} item={item} index={idx} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
