import { MAX_TEXT_LENGTH } from "./analysis";
export async function importDocument(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  signal?.throwIfAborted();
  const docx = file.name.toLowerCase().endsWith(".docx");
  const pdf = file.name.toLowerCase().endsWith(".pdf");
  if (!docx && !pdf && !file.name.toLowerCase().endsWith(".txt"))
    throw new Error("Pilih file TXT, DOCX, atau PDF.");
  if (file.size > (pdf ? 5_000_000 : docx ? 2_000_000 : 200_000))
    throw new Error(
      pdf
        ? "PDF maksimal 5 MB."
        : docx
          ? "DOCX maksimal 2 MB."
          : "TXT maksimal 200 KB.",
    );
  let text: string;
  if (pdf) text = await (await import("./importPdf")).importPdf(file, signal);
  else if (!docx) text = await file.text();
  else {
    const data = await file.arrayBuffer();
    signal?.throwIfAborted();
    const xml = await new Promise<string>((resolve, reject) => {
      const worker = new Worker(
        new URL("./importDocx.worker.ts", import.meta.url),
        { type: "module" },
      );
      const finish = (error?: string, value?: string) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
        worker.terminate();
        if (error) reject(new Error(error));
        else resolve(value!);
      };
      const timer = setTimeout(
        () => finish("Ekstraksi terlalu lama. Coba tempelkan teks langsung."),
        3000,
      );
      worker.onmessage = (
        event: MessageEvent<{ xml?: string; error?: string }>,
      ) => finish(event.data.error, event.data.xml);
      worker.onerror = () =>
        finish("DOCX tidak dapat dibaca. Coba tempelkan teks langsung.");
      const cancel = () => finish("Impor dibatalkan.");
      signal?.addEventListener("abort", cancel, { once: true });
      worker.postMessage(data, [data]);
    });
    if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml))
      throw new Error("Struktur XML dokumen tidak didukung.");
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror"))
      throw new Error("Struktur DOCX tidak valid.");
    const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    text = Array.from(document.getElementsByTagNameNS(ns, "p"))
      .map((p) =>
        Array.from(p.getElementsByTagNameNS(ns, "t"))
          .filter((t) => {
            for (
              let parent = t.parentElement;
              parent;
              parent = parent.parentElement
            ) {
              if (parent.namespaceURI === ns && parent.localName === "del")
                return false;
            }
            return true;
          })
          .map((t) => t.textContent ?? "")
          .join(""),
      )
      .join("\n")
      .trim();
  }
  signal?.throwIfAborted();
  if (!text.trim())
    throw new Error("Dokumen tidak berisi teks yang dapat dibaca.");
  if (text.length > MAX_TEXT_LENGTH || text.includes("\u0000"))
    throw new Error(
      "Teks harus maksimal 50.000 karakter dan tidak mengandung data biner.",
    );
  return text;
}
