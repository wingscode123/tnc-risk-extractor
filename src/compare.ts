import { MAX_TEXT_LENGTH } from "./analysis";
export interface DiffLine {
  kind: "same" | "added" | "removed";
  text: string;
}
export function compareDocuments(before: string, after: string): DiffLine[] {
  if (!before.trim() || !after.trim())
    throw new Error("Isi kedua versi dokumen terlebih dahulu.");
  if (before.length > MAX_TEXT_LENGTH || after.length > MAX_TEXT_LENGTH)
    throw new Error("Setiap versi maksimal 50.000 karakter.");
  const a = before.replace(/\r\n?/g, "\n").split("\n");
  const b = after.replace(/\r\n?/g, "\n").split("\n");
  if (a.length > 500 || b.length > 500)
    throw new Error(
      "Perbandingan maksimal 500 baris per versi. Bandingkan per bagian.",
    );
  const width = b.length + 1;
  const lengths = new Uint16Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i * width + j] =
        a[i] === b[j]
          ? 1 + lengths[(i + 1) * width + j + 1]
          : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
    }
  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      lines.push({ kind: "same", text: a[i++] });
      j++;
    } else if (
      i < a.length &&
      (j === b.length ||
        lengths[(i + 1) * width + j] >= lengths[i * width + j + 1])
    )
      lines.push({ kind: "removed", text: a[i++] });
    else lines.push({ kind: "added", text: b[j++] });
  }
  return lines;
}
