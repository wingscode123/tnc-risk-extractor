import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  History,
  BookOpen,
  Shield,
  ArrowRightLeft,
} from "lucide-react";
import { QuotaCard } from "./QuotaCard";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  quotaRefreshSignal?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpenMobile = false,
  onCloseMobile,
  quotaRefreshSignal = 0,
}) => {
  const panel = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(
    () => !window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setMobile(!media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !isOpenMobile || !panel.current) return;
    const opener = document.activeElement as HTMLElement | null;
    const content = document.getElementById("workspace-content");
    const wasInert = content?.inert ?? false;
    const overflow = document.body.style.overflow;
    if (content) content.inert = true;
    document.body.style.overflow = "hidden";
    const buttons = () =>
      Array.from(
        panel.current!.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], [tabindex="0"]',
        ),
      );
    buttons()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = buttons();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      if (content) content.inert = wasInert;
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [mobile, isOpenMobile]);
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
        ref={panel}
        role={mobile && isOpenMobile ? "dialog" : undefined}
        aria-modal={mobile && isOpenMobile ? true : undefined}
        aria-label="Menu utama"
        inert={mobile && !isOpenMobile}
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
              aria-label="Tutup menu"
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
            aria-current={currentTab === "analisis" ? "page" : undefined}
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
            aria-current={currentTab === "riwayat" ? "page" : undefined}
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
            aria-current={currentTab === "template" ? "page" : undefined}
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
            <span>Contoh Dokumen</span>
          </button>

          <button
            id="nav-compare"
            aria-current={currentTab === "compare" ? "page" : undefined}
            type="button"
            onClick={() => {
              setCurrentTab("compare");
              onCloseMobile?.();
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${currentTab === "compare" ? "border border-blue-500/20 bg-blue-600/15 text-blue-400" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}
          >
            <ArrowRightLeft size={20} />
            <span>Bandingkan Versi</span>
          </button>
          <div className="pt-6 px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Tentang hasil
          </div>
          <div className="px-3 py-2 text-xs text-slate-400 bg-slate-900/60 rounded-lg border border-slate-800/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
              <Shield className="h-3 w-3" />
              <span>Tinjau kembali konteks asli</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Temuan AI adalah bantuan membaca dan bukan nasihat hukum.
            </p>
          </div>
        </nav>

        {/* Kuota harian real dari server (ganti dummy Paket Pro) */}
        <div className="p-5 border-t border-slate-800/80">
          <QuotaCard refreshSignal={quotaRefreshSignal} />
        </div>
      </aside>
    </>
  );
};
