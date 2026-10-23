// P2 runner guard: what a drafting run may read, which route it may use, and what maker-written prompt
// text may contain (AIW-D260, AIW-D261). The JSON Schema contracts check shape only; these functions are
// the enforcement, and every P2 drafting call goes through them (runner.ts).
import { Ajv } from "ajv";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  BASE_URL, FORBIDDEN, INVENTORY, KEY_FILE, LABEL, MAX_ATTEMPTS, MODELS, OFFICIAL, PRICE_PER_MTOK, PROMPTS_DIR, PROTOTYPE,
  ROUTE_ID, RUN_CAP_USD, RUNS_DIR, SOLUTION,
} from "./policy.ts";

export class PolicyRefusal extends Error {}
const refuse = (m: string): never => { throw new PolicyRefusal(m); };
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const inside = (p: string, dir: string) => p === dir || p.startsWith(dir + sep);
type ManifestItem = { file: string; path: string; sha256: string };
const manifestItems = (): ManifestItem[] => JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")).items;

export type AdmittedInput = { file: string; sha256: string; kind: "official" | "inventory" | "draft"; bytes: Buffer; parent_sources?: { file: string; sha256: string }[] };
export type AdmitOptions = { allowStubDrafts?: boolean; depth?: number };

/** Admits one drafting input: an official file listed in official-sources/ircc/manifest.json with the same
 *  SHA-256, or the P1 inventory of such a file. The path is resolved first, so "..", symlinks and
 *  forbidden folders cannot slip through. `expectedSha` is the hash the run record names. */
export function admitInput(file: string, expectedSha?: string, opts: AdmitOptions = {}): AdmittedInput {
  const abs = resolve(SOLUTION, file);
  for (const f of FORBIDDEN) if (inside(abs, f)) refuse(`forbidden drafting input (answer key, family values or test output): ${file}`);
  let st;
  try { st = lstatSync(abs); } catch { return refuse(`drafting input not found: ${file}`); }
  if (st.isSymbolicLink() || realpathSync(abs) !== abs) refuse(`drafting input is a link or resolves elsewhere: ${file}`);
  const bytes = readFileSync(abs);
  const h = sha(bytes);
  if (expectedSha !== undefined && expectedSha !== h) refuse(`hash of ${file} differs from the run record`);
  const rel = relative(SOLUTION, abs).split(sep).join("/");
  if (inside(abs, OFFICIAL)) {
    const item = manifestItems().find((i) => join(OFFICIAL, i.path) === abs);
    if (!item) return refuse(`not an official file in the manifest: ${file}`);
    if (item.sha256 !== h) refuse(`official file changed since the manifest: ${file}`);
    return { file: rel, sha256: h, kind: "official", bytes };
  }
  if (dirname(abs) === INVENTORY && abs.endsWith(".inventory.json")) {
    const src = (JSON.parse(bytes.toString("utf8")).summary ?? {}) as { file?: string; sha256?: string };
    const ok = manifestItems().some((i) => `official-sources/ircc/${i.path}` === src.file && i.sha256 === src.sha256);
    if (!ok) refuse(`inventory is not derived from a current official file: ${file}`);
    return { file: rel, sha256: h, kind: "inventory", bytes };
  }
  if (dirname(abs) === RUNS_DIR && abs.endsWith(".json")) return admitDraft(rel, bytes, h, expectedSha, opts);
  return refuse(`not on the drafting allowlist (official files, their P1 inventories, and guarded drafts under AIW-D263): ${file}`);
}

/** AIW-D263: an earlier AI draft made by the guarded launch path from permitted inputs. Verified before
 *  reuse: the exact hash the job names, the parent run (label, contract validity, isolation evidence,
 *  completed status, and every one of its own inputs still admitted today), the exact hash of its output,
 *  and the output's structure against the schema it was drafted to. Stub drafts only feed stub runs. */
function admitDraft(rel: string, bytes: Buffer, h: string, expectedSha: string | undefined, opts: AdmitOptions): AdmittedInput {
  const no = (m: string): never => refuse(`draft ${rel} not admitted (AIW-D263): ${m}`);
  if (expectedSha === undefined) no("a draft input needs its exact hash in the job");
  if ((opts.depth ?? 0) > 3) no("draft chain deeper than three steps");
  let env: any;
  try { env = JSON.parse(bytes.toString("utf8")); } catch { return no("not JSON"); }
  if (env.label !== LABEL) no("missing the AIW-D260 label");
  if (env.caller !== "live" && !(opts.allowStubDrafts && env.caller === "stub")) no(`made by the ${env.caller} caller; only live drafts feed live runs`);
  if (env.contract_valid !== true) no("its run record did not meet the drafting-run contract");
  if (!["completed", "completed_with_unresolved"].includes(env.drafting_run?.status)) no(`parent run status is ${env.drafting_run?.status}`);
  const iso = env.launch_evidence?.isolation;
  if (!(iso?.permission_model && iso.entry_is_draft_ts && iso.forbidden_readable?.length === 0 && iso.writable_outside_ledger?.length === 0)) no("parent run lacks isolation evidence");
  if (typeof env.raw_output !== "string" || sha(Buffer.from(env.raw_output, "utf8")) !== env.launch_evidence?.output_sha256) no("output hash differs from the one its launcher recorded");
  const schemaFile = env.launch_evidence?.schema_file;
  if (typeof schemaFile !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(schemaFile)) no("parent output schema not named");
  const schemaBytes = readFileSync(join(PROMPTS_DIR, schemaFile));
  if (sha(schemaBytes) !== env.launch_evidence?.schema_sha256) no("parent output schema changed since the run");
  const validate = new Ajv({ allErrors: true, strict: false }).compile(JSON.parse(schemaBytes.toString("utf8")));
  if (!validate(JSON.parse(env.raw_output))) no("output does not meet its schema");
  const parents = (env.drafting_run.inputs?.official_files ?? []) as { file: string; sha256: string }[];
  if (!parents.length) no("parent run lists no inputs");
  const sources = parents.flatMap((p) => {
    const a = admitInput(p.file, p.sha256, { ...opts, depth: (opts.depth ?? 0) + 1 });
    return a.kind === "draft" ? a.parent_sources ?? [] : [{ file: a.file, sha256: a.sha256 }];
  });
  return { file: rel, sha256: h, kind: "draft", bytes, parent_sources: sources };
}

export type RouteSettings = { provider_route: string; model: string; max_attempts: number; budget_usd: number; max_output_tokens: number };

/** Refuses any route, model or budget other than the one AIW-D261 records. */
export function assertRoute(s: RouteSettings): void {
  if (s.provider_route !== ROUTE_ID) refuse(`provider route "${s.provider_route}" is not the recorded AIW-D261 route`);
  if (!(MODELS as readonly string[]).includes(s.model)) refuse(`model ${s.model} is not approved for P2 drafting`);
  if (!PRICE_PER_MTOK[s.model]) refuse(`no price recorded for ${s.model}; spend cannot be bounded`);
  if (!(Number.isInteger(s.max_attempts) && s.max_attempts >= 1 && s.max_attempts <= MAX_ATTEMPTS)) refuse(`max_attempts must be 1-${MAX_ATTEMPTS}`);
  if (!(s.budget_usd > 0 && s.budget_usd <= RUN_CAP_USD)) refuse(`budget_usd must be above 0 and at most ${RUN_CAP_USD}`);
  if (!(Number.isInteger(s.max_output_tokens) && s.max_output_tokens >= 1)) refuse("max_output_tokens must be a positive integer");
  const env = process.env.ANTHROPIC_BASE_URL;
  if (env && env.replace(/\/$/, "") !== BASE_URL) refuse("ANTHROPIC_BASE_URL points away from the Anthropic API");
}

/** Validates a whole run record against the policy: route plus every input admitted by path and hash. */
export function admitRun(run: { inputs: { official_files: { file: string; sha256: string }[] }; settings: RouteSettings }, opts: AdmitOptions = {}): AdmittedInput[] {
  assertRoute(run.settings);
  return run.inputs.official_files.map((f) => admitInput(f.file, f.sha256, opts));
}

/** The strings maker-written prompt text must never contain: every box path named by any version of the
 *  answer key, and every value of the made-up family (5+ characters, not a bare number or date). Read only by
 *  the launcher; the drafting process receives them as salted hashes (screen.ts), never in plain text.
 *  R4-R2-M1: the key files are found, not listed. Every file in expected/ that names box paths counts, so a new
 *  key version (v2 added DateOfMarriage) is screened from the moment it exists. */
export const FAMILY_SOURCES = ["p1/e5-family-values.json", "p1/adobe-complete-1295-values.json"];
export function answerKeyFiles(): string[] {
  const dir = join(PROTOTYPE, "expected");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().filter((f) => {
    const k = JSON.parse(readFileSync(join(dir, f), "utf8"));
    return (k.instances ?? []).some((i: { entries?: { data_path?: string }[] }) => (i.entries ?? []).some((e) => e.data_path));
  }).map((f) => `expected/${f}`);
}
export function canaryStrings(): { box_paths: string[]; family_values: string[]; sources: { file: string; sha256: string }[] } {
  const box = new Set<string>(), family = new Set<string>();
  const sources: { file: string; sha256: string }[] = [];
  const keys = answerKeyFiles();
  if (!keys.length) refuse("no answer key found in expected/; refusing to screen against nothing");
  for (const f of keys) {
    const keyBytes = readFileSync(join(PROTOTYPE, f));
    sources.push({ file: `prototype/${f}`, sha256: sha(keyBytes) });
    for (const i of JSON.parse(keyBytes.toString("utf8")).instances ?? []) for (const e of i.entries ?? []) if (e.data_path) box.add(e.data_path);
  }
  const strings = (v: unknown): string[] => typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
  for (const f of FAMILY_SOURCES) {
    const b = readFileSync(join(PROTOTYPE, f));
    sources.push({ file: `prototype/${f}`, sha256: sha(b) });
    const d = JSON.parse(b.toString("utf8"));
    for (const s of strings(d.values ?? d.forms)) if (s.length >= 5 && !/^[0-9-]+$/.test(s)) family.add(s);
  }
  return { box_paths: [...box].sort(), family_values: [...family].sort(), sources };
}

/** Screens maker-written text that will go into a prompt (prompt template, output contract). It may name
 *  no box path from the answer key and no value of the made-up family. Run by the launcher, which may read
 *  those files; the isolated drafting process repeats the same screen from salted hashes (screen.ts). */
export function screenMakerText(texts: { name: string; text: string }[], opts: { familyValuesOnly?: boolean; publicText?: string; canary?: ReturnType<typeof canaryStrings> } = {}): void {
  const c = opts.canary ?? canaryStrings(); // the launcher passes the one set it also hashes into the digest
  // Box paths are public (every inventory lists them), so an AI draft is screened for family values only.
  const canaries = new Set<string>([...(opts.familyValuesOnly ? [] : c.box_paths), ...c.family_values]);
  // An AI draft may repeat words printed on the official form it was made from (an option such as "Female",
  // a heading such as "MOTHER"); a value that also occurs in that public text is not family data. Found on the
  // first live chain, 20 Oct 2026 (discovery D16). Maker-written text gets no such exemption.
  const exempt = (c: string) => !!opts.publicText && opts.publicText.includes(c);
  for (const t of texts) for (const c of canaries) if (t.text.includes(c) && !exempt(c)) refuse(`${t.name} contains "${c}" from the answer key or the family values`);
}

/** Node permission-model arguments for the drafting process: it can read the official files, their
 *  inventories, the runner code, the contracts, the SDK and the key file, write only the spend ledger,
 *  and read nothing else (no answer key, no family values).
 *  `--preserve-symlinks` (QA-8): the module loader keeps a package's path as found instead of resolving it with
 *  realpath, which stats every link on the way. In a lane copy `node_modules` is a link whose target runs through a
 *  second link (the copy's `.tools`); resolving it needed read access to that link, which would grant the whole tools
 *  folder. With the flag the allowances below suffice everywhere, and none is widened. */
export function isolatedNodeArgs(ledgerDir: string): string[] {
  const nodeModules = realpathSync(join(PROTOTYPE, "node_modules"));
  const reads = [OFFICIAL, INVENTORY, join(PROTOTYPE, "p2"), join(PROTOTYPE, "contracts"), join(PROTOTYPE, "package.json"), join(PROTOTYPE, "node_modules"), nodeModules, dirname(KEY_FILE), ledgerDir];
  return ["--permission", "--preserve-symlinks", ...reads.map((r) => `--allow-fs-read=${r}`), `--allow-fs-write=${ledgerDir}`];
}

/** Reads the founder's key file (AIW-D261); refuses unsafe permissions; never prints the key. */
export function loadKey(): string {
  let mode: number;
  try { mode = statSync(KEY_FILE).mode & 0o777; } catch { return refuse(`key file missing: ${KEY_FILE} (copy anthropic.env.example, add the key, chmod 600)`); }
  if (mode & 0o077) refuse(`key file is readable by others (mode ${mode.toString(8)}); run chmod 600`);
  const line = readFileSync(KEY_FILE, "utf8").split("\n").find((l) => l.startsWith("ANTHROPIC_API_KEY="));
  const key = line?.slice("ANTHROPIC_API_KEY=".length).trim() ?? "";
  if (!key) refuse("ANTHROPIC_API_KEY is empty in the key file");
  return key;
}
