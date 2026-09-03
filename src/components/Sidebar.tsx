import React from "react";
import { FileText, History, BookOpen, Shield, Sparkles, CheckCircle } from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Backdrop for mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-64 bg-[#0F172A] text-slate-100 flex flex-col transition-transform duration-200 shrink-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo Branding */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-lg shadow-sm">
              L
            </div>
            <div>
              <span className="text-white font-semibold text-lg tracking-tight block leading-none">
                LexGuard AI
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-1 block">
                Legal Analyzer
              </span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1"
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Menu Utama
          </div>

          <button
            id="nav-analisis-dokumen"
            type="button"
            onClick={() => {
              setCurrentTab("analisis");
              onCloseMobile?.();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === "analisis"
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-sm flex items-center justify-center ${
                currentTab === "analisis"
                  ? "border-2 border-blue-400 text-blue-400"
                  : "border border-slate-600 text-slate-500"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span>Analisis Dokumen</span>
          </button>

          <button
            id="nav-riwayat-kontrak"
            type="button"
            onClick={() => {
              setCurrentTab("riwayat");
              onCloseMobile?.();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === "riwayat"
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-sm flex items-center justify-center ${
                currentTab === "riwayat"
                  ? "border-2 border-blue-400 text-blue-400"
                  : "border border-slate-600 text-slate-500"
              }`}
            >
              <History className="w-3.5 h-3.5" />
            </div>
            <span>Riwayat Kontrak</span>
          </button>

          <button
            id="nav-library-template"
            type="button"
            onClick={() => {
              setCurrentTab("template");
              onCloseMobile?.();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === "template"
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-sm flex items-center justify-center ${
                currentTab === "template"
                  ? "border-2 border-blue-400 text-blue-400"
                  : "border border-slate-600 text-slate-500"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <span>Library Template</span>
          </button>

          <div className="pt-6 px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Standar Standarisasi
          </div>
          <div className="px-3 py-2 text-xs text-slate-400 bg-slate-900/60 rounded-lg border border-slate-800/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
              <Shield className="h-3 w-3" />
              <span>Strict JSON Output</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Schema compliant: <code className="text-slate-300 font-mono">daftar_risiko</code>
            </p>
          </div>
        </nav>

        {/* Pro Plan Quota Card matching Design HTML */}
        <div className="p-5 border-t border-slate-800/80">
          <div className="bg-slate-800/80 rounded-lg p-3.5 text-xs text-slate-400 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-slate-200">Paket Pro Aktif</p>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">
                Aktif
              </span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 w-3/4 h-full rounded-full"></div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Kuota Pemindaian</span>
              <span className="font-mono text-slate-300">75/100 Dokumen</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
