import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { ItemRisiko } from "../types";

interface RiskCardProps {
  item: ItemRisiko;
  index: number;
}

export const RiskCard: React.FC<RiskCardProps> = ({ item, index }) => {
  const [copied, setCopied] = useState(false);

  const isHighRisk = item.tingkat_risiko?.toLowerCase().includes("tinggi");

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `[${item.tingkat_risiko}] ${item.pasal_terkait}\nPenjelasan: ${item.penjelasan_bahasa_manusia}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`risk-card-${index}`}
      className={`p-4 rounded-lg border transition-all duration-150 ${
        isHighRisk
          ? "border-red-200 bg-red-50/30 hover:border-red-300"
          : "border-orange-200 bg-orange-50/30 hover:border-orange-300"
      }`}
    >
      <div className="flex justify-between items-start mb-2.5">
        <div className="flex items-center gap-2">
          <span
            id={`risk-badge-${index}`}
            className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              isHighRisk
                ? "text-red-600 bg-red-100"
                : "text-orange-600 bg-orange-100"
            }`}
          >
            {item.tingkat_risiko || (isHighRisk ? "Tinggi" : "Sedang")}
          </span>
          <span className="text-xs text-slate-400 font-mono">#{index + 1}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono italic max-w-[200px] truncate">
            {item.pasal_terkait.slice(0, 35)}
          </span>
          <button
            id={`btn-copy-clause-${index}`}
            onClick={handleCopy}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded bg-white/80 hover:bg-white border border-slate-200/80 transition-colors"
            title="Salin temuan ini"
            type="button"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-[11px] text-emerald-700 font-medium">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span className="text-[11px]">Salin</span>
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-900 mb-2 leading-snug">
        '{item.pasal_terkait}'
      </p>

      <p className="text-xs text-slate-600 leading-relaxed italic">
        <span className="font-semibold text-slate-700 not-italic">Penjelasan: </span>
        {item.penjelasan_bahasa_manusia}
      </p>
    </div>
  );
};
