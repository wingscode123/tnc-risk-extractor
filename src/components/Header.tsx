import React from "react";
import { Menu, Download, UploadCloud, RefreshCw, FileText } from "lucide-react";

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
  onNewAnalysis?: () => void;
  onExportJson?: () => void;
  hasResult?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onNewAnalysis,
  onExportJson,
  hasResult = false,
}) => {
  return (
    <header
      id="app-header"
      className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20"
    >
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
            title="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-slate-400 font-medium">Home</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800">Analisis Dokumen Legal</span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            ToS & Kontrak
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {hasResult && onExportJson && (
          <button
            id="btn-header-export-json"
            type="button"
            onClick={onExportJson}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Ekspor JSON</span>
          </button>
        )}

        {onNewAnalysis && (
          <button
            id="btn-header-new-contract"
            type="button"
            onClick={onNewAnalysis}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Analisis Baru</span>
          </button>
        )}
      </div>
    </header>
  );
};
