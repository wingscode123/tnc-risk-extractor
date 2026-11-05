import { analyzeWithGeminiFallback, withDeadline } from "../server.js";
import { evaluationCases } from "./evaluation-cases.js";

if (!process.argv.includes("--live")) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        callsToProvider: 0,
        note: "Synthetic fixtures, not expert legal labels. Use --live only with a configured API key; provider charges may apply.",
        cases: evaluationCases.map(({ id, focus, risky }) => ({
          id,
          focus,
          expectedAnyRisk: risky,
        })),
      },
      null,
      2,
    ),
  );
} else {
  if (
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY"
  ) {
    console.error("GEMINI_API_KEY is required for live evaluation.");
    process.exitCode = 1;
  } else {
    const rows = [];
    for (const item of evaluationCases) {
      const started = Date.now();
      try {
        const { result, modelUsed } = await withDeadline(
          (signal) => analyzeWithGeminiFallback(item.text, undefined, signal),
          60_000,
        );
        rows.push({
          id: item.id,
          modelUsed,
          durationMs: Date.now() - started,
          expectedAnyRisk: item.risky,
          detectedAnyRisk: result.daftar_risiko.length > 0,
          findings: result.daftar_risiko.length,
          // Conservative substring check; a clause number or paraphrase will count as unverified.
          verbatimQuotes: result.daftar_risiko.filter((r) =>
            item.text.includes(r.pasal_terkait),
          ).length,
        });
      } catch {
        rows.push({
          id: item.id,
          error: "provider_or_schema_failure",
          durationMs: Date.now() - started,
        });
      }
    }
    const completed = rows.filter((r) => !r.error);
    console.log(
      JSON.stringify(
        {
          mode: "live",
          note: "Engineering signal only; labels not reviewed by a legal expert. No accuracy claim.",
          completed: completed.length,
          failed: rows.length - completed.length,
          falsePositives: completed.filter(
            (r) => !r.expectedAnyRisk && r.detectedAnyRisk,
          ).length,
          falseNegatives: completed.filter(
            (r) => r.expectedAnyRisk && !r.detectedAnyRisk,
          ).length,
          rows,
        },
        null,
        2,
      ),
    );
    if (completed.length !== rows.length) process.exitCode = 1;
  }
}
