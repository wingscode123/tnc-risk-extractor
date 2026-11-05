import { getDocument, PDFWorker } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { MAX_TEXT_LENGTH } from "./analysis";

export async function importPdf(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  signal?.throwIfAborted();
  if (new TextDecoder().decode(bytes.subarray(0, 1024)).indexOf("%PDF-") < 0)
    throw new Error("File bukan PDF yang dapat dibaca.");
  // An explicit worker avoids silently falling back to parsing untrusted PDF on the UI thread.
  const port = new Worker(workerUrl, { type: "module" });
  const worker = PDFWorker.create({ port });
  const task = getDocument({
    data: bytes,
    worker,
    verbosity: 0,
    useWorkerFetch: false,
    disableFontFace: true,
    useSystemFonts: true,
    enableXfa: false,
    useWasm: false,
    stopAtErrors: true,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  try {
    return await Promise.race([
      (async () => {
        const pdf = await task.promise;
        if (pdf.numPages > 50)
          throw new Error(
            "PDF maksimal 50 halaman. Pisahkan dokumen terlebih dahulu.",
          );
        let text = "";
        for (let n = 1; n <= pdf.numPages; n++) {
          signal?.throwIfAborted();
          const page = await pdf.getPage(n);
          const content = await page.getTextContent();
          let pageText = "";
          for (const item of content.items) {
            if (!("str" in item)) continue;
            pageText += item.str + (item.hasEOL ? "\n" : " ");
            if (text.length + pageText.length > MAX_TEXT_LENGTH)
              throw new Error(
                "Teks PDF melebihi 50.000 karakter. Pisahkan dokumen.",
              );
          }
          page.cleanup();
          if (!pageText.trim())
            throw new Error(
              "PDF memuat halaman tanpa teks yang dapat diekstrak. PDF scan/gambar memerlukan OCR yang belum tersedia.",
            );
          text += pageText.trim() + "\n\n";
        }
        return text.trim();
      })(),
      new Promise<never>((_, reject) => {
        abort = () => reject(new Error("Impor PDF dibatalkan."));
        signal?.addEventListener("abort", abort, { once: true });
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Ekstraksi PDF melewati batas 20 detik. Pisahkan dokumen.",
              ),
            ),
          20_000,
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException")
      throw new Error(
        "PDF dilindungi password. Gunakan salinan tanpa password.",
      );
    if (
      error instanceof Error &&
      /InvalidPDF|MissingPDF|UnknownError/.test(error.name)
    )
      throw new Error(
        "PDF rusak atau tidak didukung. Coba tempelkan teks langsung.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    void task.destroy().catch(() => {});
    worker.destroy();
    port.terminate();
  }
}
