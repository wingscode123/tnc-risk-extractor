import React, { useEffect, useState } from "react";

interface QuotaInfo {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

interface QuotaCardProps {
  refreshSignal?: number;
}

export const QuotaCard: React.FC<QuotaCardProps> = ({ refreshSignal = 0 }) => {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/quotas/me")
      .then((res) => {
        if (!res.ok) throw new Error("quota");
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data && typeof data.remaining === "number") {
          setQuota(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? 3;
  const remaining = quota?.remaining ?? limit;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="bg-slate-800/80 rounded-lg p-3.5 text-xs text-slate-400 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-slate-200">Kuota Harian</p>
        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">
          {quota ? (quota.plan === "tamu" ? "Tamu" : quota.plan) : "..."}
        </span>
      </div>
      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 h-full rounded-full"
          style={{ width: `${pct}%` }}
        ></div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Sisa analisis hari ini</span>
        <span className="font-mono text-slate-300">
          {quota ? `${remaining}/${limit}` : "..."}
        </span>
      </p>
      <p className="mt-2 text-[10px] leading-relaxed">
        {failed
          ? "Kuota belum dapat diperbarui."
          : "Reset 00.00 UTC / 07.00 WIB. Cache gratis; analisis gagal tidak dihitung."}
      </p>
    </div>
  );
};
