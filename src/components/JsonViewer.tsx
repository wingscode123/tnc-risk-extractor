import React, { useState } from "react";
import { Copy, Check, Download, FileCode2 } from "lucide-react";
import { HasilAnalisis } from "../types";

interface JsonViewerProps {
  data: HasilAnalisis;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analisis-risiko-legal-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="json-viewer-container" className="border border-slate-300 rounded-xl bg-slate-900 text-slate-100 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-mono font-medium text-slate-300">
            Output Format: STRICT JSON (daftar_risiko)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-download-json"
            onClick={handleDownload}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh JSON</span>
          </button>

          <button
            id="btn-copy-json"
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre
        id="strict-json-output"
        className="p-4 text-xs sm:text-sm font-mono leading-relaxed overflow-x-auto max-h-[500px] text-emerald-300 scrollbar-thin scrollbar-thumb-slate-700"
      >
        <code>{jsonString}</code>
      </pre>
    </div>
  );
};
