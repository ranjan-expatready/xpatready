// A short name for a shared field from its key ("person.intended_job_title" → "Intended job title"), for a question no
// one has written yet (QA-82: the author's Questions tab shows the short name; the client and Preview keep the meaning).
// Pure, no imports, so the web page can use it without the render engine (QA-172).
const ABBREVIATIONS = new Set(["dli", "eta", "id", "ircc", "lmia", "noc", "pgwp", "pr", "sin", "tb", "trv", "uci", "us", "uscis"]);
const PROPER: Record<string, string> = { canada: "Canada", canadian: "Canadian" };
export const factName = (key: string) => { const w = (key.split(".").pop() ?? key).split("_").map((x) => ABBREVIATIONS.has(x) ? x.toUpperCase() : PROPER[x] ?? x).join(" "); return w.charAt(0).toUpperCase() + w.slice(1); };
