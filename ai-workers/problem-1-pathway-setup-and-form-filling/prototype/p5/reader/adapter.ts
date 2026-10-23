// One reader path for every upload, client or agent (D269, D272). Chooses the reader, reuses a cached extraction for
// an identical file, reader version, prompt, schema, profiles, model and claimed type, and records which method ran.
//   local:  Tesseract 5.5.0 / PDF text layer + rules (local.ts); nothing leaves this computer.
//   ai:     Anthropic API vision through the guarded launch path (launch.ts); only for files on the synthetic allowlist.
//   hybrid: ai, then deterministic checks on its proposals (MRZ check digits, PDF text layer); see verifyAgainstLocal.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLocal, type ReaderOutput } from "./local.ts";
import { DOC_TYPES, DOCS_MANIFEST, READER, READER_JOBS, READER_PROMPTS } from "./policy.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
export const CACHE = join(READER, "cache");
export type ReadResult = { output: ReaderOutput; reader: string; method: string; cached: boolean; cost_usd: number; ms: number; run_file?: string; refused?: string; checks?: any[] };

const synthetic = () => new Map<string, string>((JSON.parse(readFileSync(DOCS_MANIFEST, "utf8")).items ?? []).map((i: any) => [i.sha256, i.file]));
const aiVersion = () => sha(readFileSync(join(READER_PROMPTS, "reader.v1.md")).toString() + readFileSync(join(READER_PROMPTS, "reader-output.v1.schema.json")).toString() + readFileSync(DOC_TYPES).toString() + "claude-opus-5-5").slice(0, 16);
const localVersion = () => sha(readFileSync(join(READER, "local.ts")).toString() + readFileSync(join(READER, "mrz.ts")).toString()).slice(0, 16);

/** The deterministic checks a hybrid read applies to an AI proposal: a passport's machine-readable zone with valid
 *  check digits, or a PDF's own text layer, either confirms the proposed characters or raises a flag. Neither
 *  verifies a fact: staff still confirm. */
export function verifyAgainstLocal(ai: ReaderOutput, local: ReaderOutput): { fact: string; check: string; result: "agrees" | "disagrees" | "not_checked"; local_value: string | null }[] {
  const out: any[] = [];
  for (const f of ai.fields) {
    const l = local.fields.find((x) => x.fact === f.fact);
    const method = (l as any)?.method ?? "";
    if (!l || l.status !== "proposed" || !f.value) { out.push({ fact: f.fact, check: "no local reading", result: "not_checked", local_value: null }); continue; }
    const strong = /MRZ check digits|PDF text layer/.test(method);
    const agree = String(l.value).toUpperCase().replace(/\s+/g, " ").trim() === String(f.value).toUpperCase().replace(/\s+/g, " ").trim();
    out.push({ fact: f.fact, check: method, result: agree ? "agrees" : strong ? "disagrees" : "not_checked", local_value: l.value });
  }
  return out;
}

function cached(key: string): ReadResult | null { const f = join(CACHE, `${key}.json`); return existsSync(f) ? { ...JSON.parse(readFileSync(f, "utf8")), cached: true } : null; }
function store(key: string, r: ReadResult) { mkdirSync(CACHE, { recursive: true }); writeFileSync(join(CACHE, `${key}.json`), JSON.stringify({ ...r, cached: false }, null, 1) + "\n"); }

/** Reads one stored upload. `mode` is chosen by the comparison evidence (E23); an AI read that is refused or not
 *  permitted (a file not on the synthetic allowlist) falls back to the local reader and says so. */
export function readUpload(file: string, claimed: string, mode: "local" | "ai" | "hybrid"): ReadResult {
  const bytes = readFileSync(file), h = sha(bytes);
  const t0 = Date.now();
  const localKey = `${h}.local-${localVersion()}.${claimed}`;
  const local = (): ReadResult => cached(localKey) ?? (() => { const o = readLocal(file, claimed); const r: ReadResult = { output: o, reader: "local OCR/MRZ + rules (Tesseract 5.5.0)", method: "local", cached: false, cost_usd: 0, ms: Date.now() - t0 }; store(localKey, r); return r; })();
  if (mode === "local") return local();
  const syn = synthetic().get(h);
  if (!syn) { const l = local(); return { ...l, refused: "not on the synthetic-document allowlist: AI vision is not permitted for this file (AIW-D271); read locally" }; }
  const aiKey = `${h}.ai-${aiVersion()}.${claimed}`;
  let ai = cached(aiKey);
  // Paid reads only where the spend ledger is the project's own (never in a test copy): an explicit opt-in.
  if (!ai && process.env.P5_PAID_READS !== "1") { const l = local(); return { ...l, refused: "no cached AI read for this file and paid reading is switched off here (P5_PAID_READS); read locally" }; }
  if (!ai) {
    const jobFile = join(READER_JOBS, "reader-c1-case.json");
    const job = JSON.parse(readFileSync(join(READER_JOBS, "reader-c1-comparison.json"), "utf8"));
    job.job_id = "reader-c1-case"; job.purpose = "Case uploads (P5): one call per new file in a batch; no values in this file.";
    job.trials = [{ id: "U1", file: syn, sha256: h, claimed_type: claimed }];
    writeFileSync(jobFile, JSON.stringify(job, null, 1) + "\n");
    const node = process.execPath;
    // A fresh stub pass of this exact path and file list, then the paid read (the launcher refuses live without it).
    const stub = spawnSync(node, [join(READER, "launch.ts"), "--job", "reader-c1-case", "--stub"], { encoding: "utf8", timeout: 120_000 });
    const p = stub.status === 0 ? spawnSync(node, [join(READER, "launch.ts"), "--job", "reader-c1-case", "--live"], { encoding: "utf8", timeout: 600_000 }) : stub;
    let res: any = {};
    try { res = JSON.parse(p.stdout.trim().split("\n").pop() ?? "{}"); } catch { res = { refused: p.stderr.slice(0, 300) }; }
    const rec = res.run_file ? JSON.parse(readFileSync(res.run_file, "utf8")) : null;
    const r0 = rec?.results?.[0];
    if (!r0 || r0.status !== "completed") { const l = local(); return { ...l, refused: `AI vision read failed (${res.refused ?? r0?.attempts?.at(-1)?.error ?? r0?.status ?? "no result"}); read locally instead` }; }
    ai = { output: r0.output, reader: "Anthropic API vision (claude-opus-5-5) under AIW-D271", method: "ai", cached: false, cost_usd: rec.usage.cost_usd, ms: Date.now() - t0, run_file: res.run_file };
    store(aiKey, ai);
  }
  if (mode === "ai") return ai;
  const l = local();
  return { ...ai, method: "hybrid", reader: `${ai.reader} + deterministic checks (${l.reader})`, checks: verifyAgainstLocal(ai.output, l.output) };
}
