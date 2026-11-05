import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
import { pdfFixture } from "./pdfFixture";
test("PDF extracts local text and rejects missing text, excess pages and invalid files", async ({
  page,
}) => {
  let aiCalls = 0;
  const errors: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/analyze")) aiCalls++;
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/app");
  const upload = (buffer: Buffer) =>
    page.getByLabel("Impor dokumen", { exact: true }).setInputFiles({
      name: "kontrak.pdf",
      mimeType: "application/pdf",
      buffer,
    });
  await upload(pdfFixture("Pasal 1: Biaya 100."));
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "Pasal 1: Biaya 100.",
  );
  await upload(pdfFixture(""));
  await expect(page.getByRole("alert")).toContainText("OCR");
  await upload(pdfFixture("Pasal 1", 51));
  await expect(page.getByRole("alert")).toContainText("50 halaman");
  await upload(Buffer.from("%PDF-1.7\nbroken"));
  await expect(page.getByRole("alert")).toContainText("rusak");
  await upload(Buffer.alloc(5_000_001));
  await expect(page.getByRole("alert")).toContainText("5 MB");
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "Pasal 1: Biaya 100.",
  );
  expect(aiCalls).toBe(0);
  expect(errors).toEqual([]);
});
test("comparison shows edits, clears stale output and opens new version without AI", async ({
  page,
  isMobile,
}, testInfo) => {
  let aiCalls = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/analyze")) aiCalls++;
  });
  await page.goto("/app/bandingkan");
  await page
    .getByLabel("Versi awal", { exact: true })
    .fill("Pasal 1\nBiaya 100");
  await page
    .getByLabel("Versi baru", { exact: true })
    .fill("Pasal 1\nBiaya 200");
  await page.getByRole("button", { name: "Bandingkan perubahan" }).click();
  await expect(
    page.getByRole("region", { name: "Hasil perbandingan" }),
  ).toContainText("1 baris ditambahkan");
  await expect(page.getByText("+ Ditambahkan:").locator("..")).toContainText(
    "Biaya 200",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("comparison.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Versi baru", { exact: true })
    .fill("Pasal 1\nBiaya 300");
  await expect(
    page.getByRole("region", { name: "Hasil perbandingan" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Bandingkan perubahan" }).click();
  await page
    .getByRole("button", { name: "Buka versi baru di editor analisis" })
    .click();
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "Pasal 1\nBiaya 300",
  );
  if (isMobile) await page.getByTitle("Buka Menu").click();
  await page.locator("#nav-compare").click();
  await expect(page.getByLabel("Versi awal", { exact: true })).toHaveValue(
    "Pasal 1\nBiaya 100",
  );
  await page.getByRole("button", { name: "Kosongkan kedua versi" }).click();
  await expect(page.getByLabel("Versi awal", { exact: true })).toHaveValue("");
  expect(aiCalls).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("comparison can import two PDFs independently without overwriting either version", async ({
  page,
}) => {
  await page.goto("/app/bandingkan");
  await Promise.all([
    page.getByLabel("Impor versi awal").setInputFiles({
      name: "before.pdf",
      mimeType: "application/pdf",
      buffer: pdfFixture("Biaya 100"),
    }),
    page.getByLabel("Impor versi baru").setInputFiles({
      name: "after.pdf",
      mimeType: "application/pdf",
      buffer: pdfFixture("Biaya 200"),
    }),
  ]);
  await expect(page.getByLabel("Versi awal", { exact: true })).toHaveValue(
    "Biaya 100",
  );
  await expect(page.getByLabel("Versi baru", { exact: true })).toHaveValue(
    "Biaya 200",
  );
  await page.getByRole("button", { name: "Bandingkan perubahan" }).click();
  await expect(
    page.getByRole("region", { name: "Hasil perbandingan" }),
  ).toContainText("Biaya 200");
});
test("tab URLs survive reload and browser history", async ({
  page,
  isMobile,
}) => {
  await page.goto("/app/contoh");
  await expect(
    page.getByRole("heading", { name: "Contoh dokumen", exact: true }),
  ).toBeVisible();
  if (isMobile) await page.getByTitle("Buka Menu").click();
  await page.locator("#nav-riwayat-kontrak").click();
  await expect(page).toHaveURL(/\/app\/riwayat$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Riwayat di perangkat ini" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Contoh dokumen", exact: true }),
  ).toBeVisible();
});
test("mobile menu traps focus and restores opener", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile modal only");
  await page.goto("/app");
  const opener = page.getByRole("button", { name: "Buka menu", exact: true });
  await opener.click();
  await expect(page.getByRole("dialog", { name: "Menu utama" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tutup menu" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#nav-compare")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Tutup menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute("aria-expanded", "false");
});
test("DOCX import extracts local text and rejects oversized XML and entities", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/analyze")) requests++;
  });
  await page.goto("/app");
  const wrap = (content: string) =>
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${content}</w:body></w:document>`;
  const upload = async (xml: string) =>
    page.getByLabel("Impor dokumen", { exact: true }).setInputFiles({
      name: "kontrak.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from(
        zipSync({
          "word/document.xml": strToU8(xml),
          "word/header1.xml": strToU8("Header should not be imported"),
        }),
      ),
    });
  await upload(
    wrap(
      "<w:p><w:r><w:t>Pasal 1: </w:t></w:r><w:r><w:t>Teks utama.</w:t></w:r></w:p><w:p><w:r><w:t>Pasal 2.</w:t></w:r></w:p>",
    ),
  );
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "Pasal 1: Teks utama.\nPasal 2.",
  );
  await upload(
    '<!DOCTYPE test [<!ENTITY x "bad">]>' +
      wrap("<w:p><w:r><w:t>&x;</w:t></w:r></w:p>"),
  );
  await expect(page.getByRole("alert")).toContainText("Struktur XML");
  await upload(wrap("x".repeat(2_000_001)));
  await expect(page.getByRole("alert")).toContainText("melebihi batas");
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "Pasal 1: Teks utama.\nPasal 2.",
  );
  expect(requests).toBe(0);
});
test("reset cancels an in-progress DOCX import", async ({ page }) => {
  await page.addInitScript(() => {
    window.Worker = class {
      postMessage() {
        document.body.dataset.workerStarted = "yes";
      }
      terminate() {
        document.body.dataset.workerTerminated = "yes";
      }
    } as unknown as typeof Worker;
  });
  await page.goto("/app");
  await page.getByLabel("Impor dokumen", { exact: true }).setInputFiles({
    name: "slow.docx",
    mimeType: "application/zip",
    buffer: Buffer.from("test"),
  });
  await expect(page.getByText("Membaca dokumen...")).toBeVisible();
  await page.getByRole("button", { name: "Analisis Baru" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-worker-terminated",
    "yes",
  );
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "",
  );
});
const result = {
  daftar_risiko: [
    {
      pasal_terkait: "Pasal 4.1",
      tingkat_risiko: "Tinggi",
      penjelasan_bahasa_manusia: "Ketentuan dapat berubah sepihak.",
    },
  ],
};
test("landing explains product and opens a clean editor", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Sebelum klik/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Periksa dokumen saya" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "",
  );
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: /Sebelum klik/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("analysis renders, saves locally, reopens, exports and clears stale results", async ({
  page,
  isMobile,
}, testInfo) => {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ json: result }),
  );
  await page.goto("/app");
  await page
    .getByLabel("Teks dokumen", { exact: true })
    .fill("Pasal 4.1: Perubahan sepihak.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Analisis Risiko Sekarang" }).click();
  await expect(
    page
      .locator("#results-section")
      .getByText("Penjelasan: Ketentuan dapat berubah sepihak.", {
        exact: true,
      }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("workspace.png"),
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page.locator("#btn-header-export-json").click();
  expect((await download).suggestedFilename()).toMatch(/lexguard.*json/);
  await page.getByLabel("Teks dokumen", { exact: true }).fill("Dokumen lain");
  await expect(page.locator("#results-section")).toHaveCount(0);
  if (isMobile) await page.getByTitle("Buka Menu").click();
  await page.locator("#nav-riwayat-kontrak").click();
  await expect(
    page.getByText("Pasal 4.1: Perubahan sepihak.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  if (isMobile) await page.getByTitle("Buka Menu").click();
  await page.locator("#nav-riwayat-kontrak").click();
  await page.getByRole("button", { name: "Buka", exact: true }).click();
  await expect(page.locator("#results-section")).toBeVisible();
  if (isMobile) await page.getByTitle("Buka Menu").click();
  await page.locator("#nav-riwayat-kontrak").click();
  await page.getByRole("button", { name: "Hapus semua" }).click();
  await expect(
    page.getByRole("heading", { name: "Belum ada analisis tersimpan" }),
  ).toBeVisible();
});
test("TXT import, filtering and an empty result remain understandable", async ({
  page,
}) => {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ json: result }),
  );
  await page.goto("/app");
  await page.getByLabel("Impor dokumen", { exact: true }).setInputFiles({
    name: "kontrak.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Pasal 4.1: Teks impor."),
  });
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "Pasal 4.1: Teks impor.",
  );
  await page.getByRole("button", { name: "Analisis Risiko Sekarang" }).click();
  await page.locator("#filter-sedang").click();
  await expect(
    page.getByText("Tidak ada temuan pada filter ini."),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("region", { name: "Laporan cetak lengkap" }),
  ).toContainText("Risiko Tinggi");
  await page.emulateMedia({ media: "screen" });
  await page.locator("#tab-json-view").click();
  await expect(page.locator("#strict-json-output")).toContainText(
    "daftar_risiko",
  );
  await page.getByRole("button", { name: "Analisis Baru" }).click();
  await page.unroute("**/api/analyze");
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ json: { daftar_risiko: [] } }),
  );
  await page
    .getByLabel("Teks dokumen", { exact: true })
    .fill("Dokumen tanpa temuan");
  await page.getByRole("button", { name: "Analisis Risiko Sekarang" }).click();
  await expect(
    page.getByRole("heading", { name: "Tidak ada risiko yang terdeteksi" }),
  ).toBeVisible();
  await expect(
    page.getByText(/hasil ini bukan jaminan keamanan/),
  ).toBeVisible();
});
test("invalid AI data and storage failure do not crash the workspace", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("storage denied");
    };
  });
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ json: { daftar_risiko: [null] } }),
  );
  await page.goto("/app");
  await page.getByLabel("Teks dokumen", { exact: true }).fill("Uji input");
  await page.getByRole("button", { name: "Analisis Risiko Sekarang" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Format hasil analisis tidak valid",
  );
  await page.unroute("**/api/analyze");
  await page.route("**/api/analyze", (route) =>
    route.fulfill({ json: result }),
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(page.locator("#results-section")).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Penyimpanan browser tidak tersedia",
  );
});
test("reset during a pending request cannot restore the old result", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  await page.route("**/api/analyze", async (route) => {
    await gate;
    await route.fulfill({ json: result }).catch(() => {});
  });
  await page.goto("/app");
  await page.getByLabel("Teks dokumen", { exact: true }).fill("Old document");
  await page.getByRole("button", { name: "Analisis Risiko Sekarang" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sedang meninjau" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analisis Baru" }).click();
  release();
  await expect(page.getByLabel("Teks dokumen", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.locator("#results-section")).toHaveCount(0);
});
test("production serves only public assets and returns honest readiness", async ({
  request,
}) => {
  expect((await request.get("/api/health")).status()).toBe(200);
  expect((await request.get("/api/ready")).status()).toBe(503);
  for (const path of [
    "/server.mjs",
    "/server.cjs",
    "/server.cjs.map",
    "/.env",
    "/package.json",
    "/api/missing",
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  const response = await request.post("/api/analyze", {
    data: { text: "Pasal uji." },
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain("belum dikonfigurasi");
});
