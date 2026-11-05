import { isAnalysis } from "./analysis";
import type { HasilAnalisis } from "./types";
export interface SavedAnalysis {
  id: string;
  text: string;
  result: HasilAnalisis;
  analyzedAt: string;
}
export const HISTORY_KEY = "lexguard.history.v1";
export function readHistory(): SavedAnalysis[] {
  const data: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (item): item is SavedAnalysis =>
        item &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        item.text.length <= 50_000 &&
        typeof item.analyzedAt === "string" &&
        Number.isFinite(Date.parse(item.analyzedAt)) &&
        isAnalysis(item.result),
    )
    .slice(0, 10);
}
export function writeHistory(items: SavedAnalysis[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 10)));
}
