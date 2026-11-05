import { unzipSync, strFromU8 } from "fflate";
const XML_LIMIT = 2_000_000;
self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    let count = 0;
    const files = unzipSync(new Uint8Array(event.data), {
      filter: (file) => {
        if (++count > 2000) throw new Error("Arsip terlalu kompleks.");
        if (file.name !== "word/document.xml") return false;
        if (file.originalSize > XML_LIMIT)
          throw new Error("Isi dokumen terlalu besar.");
        return true;
      },
    });
    const document = files["word/document.xml"];
    if (!document || document.length > XML_LIMIT)
      throw new Error("DOCX tidak memiliki isi dokumen yang dapat dibaca.");
    self.postMessage({ xml: strFromU8(document) });
  } catch {
    self.postMessage({
      error:
        "DOCX rusak, terenkripsi, terlalu kompleks, atau melebihi batas ekstraksi.",
    });
  }
};
