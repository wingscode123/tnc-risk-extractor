import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ArrowRightLeft, FileUp } from "lucide-react";
import { compareDocuments, type DiffLine } from "../compare";
import { importDocument } from "../importDocument";

function VersionEditor({
  label,
  value,
  onChange,
  onBusy,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const fieldId = label === "Versi awal" ? "compare-before" : "compare-after";
  useEffect(() => () => request.current?.abort(), []);
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <label className="mb-3 block text-sm font-semibold" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        disabled={busy}
        aria-invalid={value.length > 50_000}
        className="w-full rounded-lg border border-slate-200 p-3 text-sm leading-relaxed"
        placeholder="Tempelkan teks versi ini..."
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-200 p-2 font-medium text-slate-700">
          <FileUp size={14} />
          {busy ? "Membaca..." : "Impor dokumen"}
          <input
            aria-label={`Impor ${label.toLowerCase()}`}
            type="file"
            accept=".txt,.docx,.pdf"
            disabled={busy}
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const controller = new AbortController();
              request.current = controller;
              setBusy(true);
              onBusy(true);
              setError("");
              try {
                const text = await importDocument(file, controller.signal);
                if (!controller.signal.aborted) onChange(text);
              } catch (err) {
                if (!controller.signal.aborted)
                  setError(err instanceof Error ? err.message : "Impor gagal.");
              } finally {
                if (!controller.signal.aborted) {
                  setBusy(false);
                  onBusy(false);
                  request.current = null;
                }
              }
            }}
          />
        </label>
        <span>{value.length.toLocaleString("id-ID")} / 50.000 karakter</span>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function CompareSection({
  texts,
  setTexts,
  editorText,
  onAnalyzeText,
}: {
  texts: [string, string];
  setTexts: Dispatch<SetStateAction<[string, string]>>;
  editorText: string;
  onAnalyzeText: (text: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<{
    before: string;
    after: string;
    lines: DiffLine[];
  } | null>(null);
  const [error, setError] = useState("");
  const [showSame, setShowSame] = useState(false);
  const [busy, setBusy] = useState<[boolean, boolean]>([false, false]);
  const [revision, setRevision] = useState(0);
  const result =
    snapshot?.before === texts[0] && snapshot?.after === texts[1]
      ? snapshot.lines
      : null;
  const counts = result?.reduce(
    (acc, line) => ({ ...acc, [line.kind]: acc[line.kind] + 1 }),
    { added: 0, removed: 0, same: 0 },
  );
  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <ArrowRightLeft size={22} /> Bandingkan versi dokumen
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
        Lihat baris yang ditambahkan atau dihapus antara dua versi. Perbandingan
        dilakukan lokal di browser, tanpa AI dan tanpa memakai kuota. Ini
        perubahan teks, bukan penilaian risiko hukum.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Maks. 50.000 karakter / 500 baris per versi. TXT 200 KB, DOCX 2 MB, PDF
        teks 5 MB / 50 halaman. Urutan hasil ekstraksi dan perbedaan spasi dapat
        memengaruhi hasil; tinjau teks terlebih dahulu.
      </p>
      <div className="my-5 flex flex-wrap gap-4 text-sm">
        <button
          disabled={!editorText || busy.some(Boolean)}
          onClick={() => setTexts([editorText, texts[1]])}
          className="text-blue-700 underline disabled:opacity-40"
        >
          Gunakan teks editor sebagai versi awal
        </button>
        <button
          onClick={() => {
            setRevision((r) => r + 1);
            setBusy([false, false]);
            setTexts(["", ""]);
            setSnapshot(null);
            setError("");
          }}
          className="text-slate-500 underline"
        >
          Kosongkan kedua versi
        </button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {(["Versi awal", "Versi baru"] as const).map((label, index) => (
          <VersionEditor
            key={`${revision}-${index}`}
            label={label}
            value={texts[index]}
            onChange={(text) => {
              setTexts((current) =>
                index === 0 ? [text, current[1]] : [current[0], text],
              );
              setError("");
            }}
            onBusy={(value) =>
              setBusy((current) =>
                index === 0 ? [value, current[1]] : [current[0], value],
              )
            }
          />
        ))}
      </div>
      <button
        disabled={busy.some(Boolean) || !texts[0].trim() || !texts[1].trim()}
        className="my-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        onClick={() => {
          try {
            const lines = compareDocuments(...texts);
            setSnapshot({ before: texts[0], after: texts[1], lines });
            setError("");
          } catch (err) {
            setSnapshot(null);
            setError(
              err instanceof Error ? err.message : "Perbandingan gagal.",
            );
          }
        }}
      >
        Bandingkan perubahan
      </button>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {result && counts && (
        <section
          aria-label="Hasil perbandingan"
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 className="font-semibold">
            {counts.added + counts.removed === 0
              ? "Tidak ada perubahan teks"
              : "Perubahan ditemukan"}
          </h2>
          <p role="status" className="mt-2 text-sm text-slate-600">
            {counts.added} baris ditambahkan · {counts.removed} baris dihapus ·{" "}
            {counts.same} baris sama
          </p>
          <label className="my-4 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showSame}
              onChange={(e) => setShowSame(e.target.checked)}
            />
            Tampilkan baris yang sama
          </label>
          <ol className="space-y-2">
            {result
              .filter((line) => showSame || line.kind !== "same")
              .map((line, index) => (
                <li
                  key={index}
                  className={`rounded border p-3 text-sm whitespace-pre-wrap break-words ${line.kind === "added" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : line.kind === "removed" ? "border-red-200 bg-red-50 text-red-900" : "border-slate-100 text-slate-600"}`}
                >
                  <span className="mr-2 font-bold">
                    {line.kind === "added"
                      ? "+ Ditambahkan:"
                      : line.kind === "removed"
                        ? "− Dihapus:"
                        : "= Sama:"}
                  </span>
                  {line.text || "(baris kosong)"}
                </li>
              ))}
          </ol>
          <button
            onClick={() => onAnalyzeText(texts[1])}
            className="mt-5 text-sm font-semibold text-blue-700 underline"
          >
            Buka versi baru di editor analisis
          </button>
        </section>
      )}
    </section>
  );
}
