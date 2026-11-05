import type { HasilAnalisis, ItemRisiko } from "./types";
export const MAX_TEXT_LENGTH = 50_000;
export const RISK_LEVELS = ["Tinggi", "Sedang", "Rendah"] as const;
export function isAnalysis(value: unknown): value is HasilAnalisis {
  if (!value || typeof value !== "object" || !("daftar_risiko" in value))
    return false;
  return (
    Array.isArray(value.daftar_risiko) &&
    value.daftar_risiko.length <= 200 &&
    value.daftar_risiko.every((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const r = item as Record<string, unknown>;
      return (
        typeof r.pasal_terkait === "string" &&
        r.pasal_terkait.trim().length > 0 &&
        r.pasal_terkait.length <= 5000 &&
        typeof r.penjelasan_bahasa_manusia === "string" &&
        r.penjelasan_bahasa_manusia.trim().length > 0 &&
        r.penjelasan_bahasa_manusia.length <= 5000 &&
        RISK_LEVELS.includes(r.tingkat_risiko as ItemRisiko["tingkat_risiko"])
      );
    })
  );
}
export function riskSummary(result: HasilAnalisis) {
  const counts = { Tinggi: 0, Sedang: 0, Rendah: 0 };
  for (const item of result.daftar_risiko) counts[item.tingkat_risiko]++;
  return {
    ...counts,
    total: result.daftar_risiko.length,
    score: Math.max(0, 100 - counts.Tinggi * 25 - counts.Sedang * 12),
  };
}
