import { useEffect, useRef, useState } from "react";
export function useClipboard() {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy(text: string) {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Tersalin");
    } catch {
      setStatus("Gagal menyalin. Gunakan ekspor JSON.");
    }
    timer.current = setTimeout(() => setStatus(""), 2500);
  }
  return { status, copy };
}
