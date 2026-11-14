// B170c (P-464 to P-476, P-542; design/xfa-reuse-analysis-2026-11-11.md §4.1 row c, §4.2): the one file our code may
// import to use our XFA engine (packages/xfa-engine, B170a). Only this folder reaches the engine (§4.2 (2), one
// direction): it runs the engine in a separate process with a time limit (./run-engine.mjs; §4.2 (6)) and turns its
// answer into ours, typed:
//   passes         the form's own Validate completes; with the form's own barcode texts
//   stops_at       the form's own Validate stops at its first missing box, with the form's own message
//   reads          the engine reads the form, but no descriptor is recorded for it, so its own check cannot run
//   not_available  the engine cannot answer for this form, with the reason (§4.2 (4): fail closed, say why; never a
//                  pass, never a silent blank). The engine's form-script part reads 4 of our 18 Paper editions
//                  (design/xfa-writer-trial-2026-11-13.md §7); every other form lands here, with the engine's reason.
// Each answer carries the page count where the engine laid the form out.
// Switches (§4.2 (3)): each engine feature reaches a person only when its row turns its switch on, in that row's PR;
// all are off here, and nothing in the app calls this file yet, so with every switch off the app is exactly as before.
// Forms are data (§4.2 (7), P-319, P-425): no form number, box name or program here. The descriptor (the form's own
// Validate button, validated flag, first-missing-field variable and barcode container) is part of the form's record in
// samples/xfa-forms.json, keyed by the official file's SHA-256, beside the fill-trial register (samples/fill-trials.json).
// No model call (US$0).
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The engine features the app may use, each off until its row proves it (analysis §4.1: rows d, e, f, h, i). */
export const XFA_SWITCHES = Object.freeze({
  /** The form's own Validate before download, one line on the copy's row (B170f). */
  formCheck: false,
  /** The form's own barcode texts compared with the case facts before download (B170e part 2). */
  barcodeCheck: false,
  /** "View form": the filled form drawn as pages in the app, read-only (B170d). */
  viewForm: false,
  /** Validate in the app, no download and re-upload (B170h; needs the founder's ruling with counsel). */
  validateInApp: false,
  /** The engine's writer in place of ours (B170i: ours stays unless a trial shows a clear win, P-469). */
  engineWriter: false,
} as const);
export type XfaSwitch = keyof typeof XFA_SWITCHES;
/** Whether an engine feature is on. Every caller asks here first; an off feature keeps today's behaviour. */
export const xfaOn = (feature: XfaSwitch, switches: Readonly<Record<XfaSwitch, boolean>> = XFA_SWITCHES): boolean => switches[feature] === true;

/** The form's own Validate button and what it sets, as SOM paths from the form's root subform (the engine's Pack form
 *  descriptor). Data on the form's record, never code. */
export type XfaDescriptor = {
  validateButton: string;
  validatedFlag: string;
  validatedValue: string;
  firstMissingField: string;
  barcodes: string;
  clearButton?: string;
};

export type XfaAnswer =
  | { status: "passes"; pages: number; barcodeTexts: (string | null)[] }
  | { status: "stops_at"; pages: number; box: string | null; message: string | null }
  | { status: "reads"; pages: number; why: string }
  | { status: "not_available"; reason: string; code: string };

export type XfaAskOptions = {
  /** The form's descriptor; undefined: looked up in the form records (by `formSha256`, else by the file's own SHA-256);
   *  null: only ask whether the engine reads the form. */
  descriptor?: XfaDescriptor | null;
  /** The SHA-256 of the edition's official (blank) file. A filled copy's own bytes differ from its edition's, so the
   *  caller that knows the edition (the copy's field map: form_sha256) names it here (review minor 1). */
  formSha256?: string;
  /** The time limit for the whole answer (start, read, lay out, Validate); default 20 s (measured: under 2 s). */
  timeoutMs?: number;
  /** The wall clock the form's scripts see (default now) and the form's local zone (default the firms' zone). */
  clock?: number;
  timezone?: string;
  /** Where the engine package is (default: packages/xfa-engine at the repository's root). */
  engineDir?: string;
  /** Where the form records are (default: samples/xfa-forms.json). */
  formsFile?: string;
  /** BK-25: the defects of the form's own script its record names (default: the record's, by SHA-256). */
  knownDefects?: KnownFormDefect[];
};
/** BK-25: a defect in a form's own script that its record names, cited (IMM 1295 (09-2023): after a complete Validate the
 *  script focuses Page4.Consent1.Signature.C1CertificateIssueDate, a node its template does not have; the engine's own
 *  corpus test, packages/xfa-engine/src/__tests__/corpus/form-cases.ts, expects exactly that one member). The run stays
 *  strict unless a record names one; then a skipped member is accepted only when it is a named one and the form's own
 *  Validate has completed, so a stop or a box is never reached past script the engine skipped. */
export type KnownFormDefect = { class: string; member: string; why: string };

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = resolve(HERE, "..", "..");
const CHILD = join(HERE, "run-engine.mjs");
/** The firms' calendar zone (the Sample firms and the database work in Toronto time; api/src/earlier-facts.ts). */
const FIRM_ZONE = "America/Toronto";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_ANSWER_BYTES = 4 << 20;
export const XFA_FORMS_FILE = join(STUDIO, "samples", "xfa-forms.json");

/** packages/xfa-engine at the repository's root: the nearest folder above this one that holds it. */
export function engineDirectory(from = HERE): string {
  for (let d = from; ; d = dirname(d)) {
    const p = join(d, "packages", "xfa-engine");
    if (existsSync(join(p, "package.json"))) return p;
    if (dirname(d) === d) return join(from, "packages", "xfa-engine");
  }
}

/** One form record (an official file's edition) with the engine's descriptor for it. */
export type XfaFormRecord = { form: string; edition: string; official_file: string; form_sha256: string; descriptor: XfaDescriptor; source: string; known_form_defects?: KnownFormDefect[] };
/** The form records; a missing file is none, a file that does not read stops loudly (never every form silently bare). */
export function xfaFormRecords(file = XFA_FORMS_FILE): XfaFormRecord[] {
  if (!existsSync(file)) return [];
  const forms = (JSON.parse(readFileSync(file, "utf8")) as { forms?: unknown }).forms;
  if (!Array.isArray(forms)) throw new Error(`${file}: "forms" is not a list`);
  return forms as XfaFormRecord[];
}
/** The descriptor recorded for this exact file (by SHA-256: another edition never borrows one), or null. */
export function xfaDescriptorFor(sha256: string, file = XFA_FORMS_FILE): XfaDescriptor | null {
  return xfaFormRecords(file).find((r) => r.form_sha256 === sha256)?.descriptor ?? null;
}

/** BK-25: the known defects of the form's own script recorded for this exact file (by SHA-256), or none. */
export function xfaKnownDefectsFor(sha256: string, file = XFA_FORMS_FILE): KnownFormDefect[] {
  return xfaFormRecords(file).find((r) => r.form_sha256 === sha256)?.known_form_defects ?? [];
}

const isDescriptor = (d: unknown): d is XfaDescriptor => {
  const r = d as Record<string, unknown> | null;
  return !!r && typeof r === "object" && (["validateButton", "validatedFlag", "validatedValue", "firstMissingField", "barcodes"] as const).every((k) => typeof r[k] === "string" && r[k] !== "") && (r.clearButton === undefined || typeof r.clearButton === "string");
};
const notAvailable = (code: string, reason: string): XfaAnswer => ({ status: "not_available", code, reason });

/** The engine's raw answer (./run-engine.mjs) in our words. Anything unexpected is "not available", never a pass. */
export function answerOf(raw: unknown): XfaAnswer {
  const r = (raw ?? {}) as Record<string, unknown>;
  const pages = typeof r.pages === "number" && r.pages >= 0 ? r.pages : null;
  switch (r.kind) {
    case "complete":
      if (pages === null || !Array.isArray(r.barcodes)) return notAvailable("BAD_ANSWER", "the engine's answer could not be read");
      // Review minor 4: the form's own save step must have encoded its barcodes; a pass without them is no pass.
      if (r.barcodesValidated !== true) return notAvailable("NOT_ENCODED", "the form's own Validate completed, but its own save step did not encode its barcodes");
      return { status: "passes", pages, barcodeTexts: r.barcodes.map((b: unknown) => (typeof b === "string" ? b : null)) };
    case "incomplete":
      return pages === null ? notAvailable("BAD_ANSWER", "the engine's answer could not be read") : { status: "stops_at", pages, box: typeof r.firstMissingField === "string" ? r.firstMissingField : null, message: Array.isArray(r.messages) && typeof r.messages[0] === "string" ? (r.messages[0] as string) : null };
    case "reads":
      return pages === null ? notAvailable("BAD_ANSWER", "the engine's answer could not be read") : { status: "reads", pages, why: "the engine reads this form, but the form records hold no descriptor of its own Validate for this file (looked up by SHA-256: a filled copy is looked up by its edition's official file), so its own check cannot run" };
    case "refused":
      return notAvailable(String(r.code ?? "REFUSED"), `the engine cannot read this form yet: ${String(r.message ?? "no reason given")}`);
    case "bad_descriptor":
      return notAvailable("BAD_DESCRIPTOR", `the form's record does not describe its own Validate in a way the engine accepts: ${String(r.message ?? "")}`.trim());
    case "no_engine":
      return notAvailable("NO_ENGINE", `the form engine is not built on this server (packages/xfa-engine: npm ci --legacy-peer-deps, npm run build): ${String(r.message ?? "")}`.trim());
    default:
      return notAvailable("BAD_ANSWER", "the engine's answer could not be read");
  }
}

/** Asks the engine about one PDF, in a separate process with a time limit. Never throws: whatever goes wrong is
 *  "not available" with the reason. */
export async function askXfaEngine(file: string, options: XfaAskOptions = {}): Promise<XfaAnswer> {
  const engine = options.engineDir ?? engineDirectory();
  if (!existsSync(join(engine, "dist", "index.js"))) return answerOf({ kind: "no_engine", message: `${join(engine, "dist", "index.js")} is missing` });
  let descriptor = options.descriptor, knownDefects = options.knownDefects ?? [];
  if (descriptor === undefined) {
    try {
      const sha = options.formSha256 ?? createHash("sha256").update(readFileSync(file)).digest("hex");
      descriptor = xfaDescriptorFor(sha, options.formsFile);
      if (!options.knownDefects) knownDefects = xfaKnownDefectsFor(sha, options.formsFile);
    } catch (e) { const err = e as NodeJS.ErrnoException; return notAvailable(String(err?.code ?? "UNREADABLE"), `the form's file or its record cannot be read: ${String(err?.message ?? e)}`); }
  }
  if (!knownDefects.every((d) => d && typeof d.class === "string" && typeof d.member === "string" && d.class !== "" && d.member !== "" && typeof d.why === "string" && d.why.length >= 20)) return notAvailable("BAD_DESCRIPTOR", "the form's record names a defect of its own script without its class, member and why (20 characters or more)");
  if (descriptor && !isDescriptor(descriptor)) return notAvailable("BAD_DESCRIPTOR", "the form's record does not describe its own Validate (each of validateButton, validatedFlag, validatedValue, firstMissingField and barcodes must be text)");
  const request = JSON.stringify({ engine, file: resolve(file), descriptor, knownDefects: knownDefects.map((d) => ({ class: d.class, member: d.member })), clock: options.clock ?? Date.now(), timezone: options.timezone ?? FIRM_ZONE });
  const limit = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise<XfaAnswer>((done) => {
    let out = "", err = "", settled = false;
    const finish = (a: XfaAnswer) => { if (!settled) { settled = true; clearTimeout(timer); done(a); } };
    const child = spawn(process.execPath, [CHILD], { stdio: ["pipe", "pipe", "pipe"] });
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8"); // review minor 7: a character split across chunks stays whole
    const timer = setTimeout(() => { child.kill("SIGKILL"); finish(notAvailable("TIME_LIMIT", `the engine took longer than ${Math.round(limit / 100) / 10} s on this form and was stopped`)); }, limit);
    child.stdout.on("data", (b: string) => { out += b; if (out.length > MAX_ANSWER_BYTES) { child.kill("SIGKILL"); finish(notAvailable("BAD_ANSWER", "the engine's answer was too long")); } });
    child.stderr.on("data", (b: string) => { err = (err + b).slice(-2000); });
    child.on("error", (e) => finish(notAvailable("NO_PROCESS", `the engine's process could not start: ${e.message}`)));
    child.on("close", (code) => {
      const line = out.trim().split("\n").pop() ?? "";
      if (code === 0 && line) { try { return finish(answerOf(JSON.parse(line))); } catch { /* below */ } }
      const last = err.trim().split("\n").pop();
      finish(notAvailable("NO_ANSWER", `the engine stopped without an answer (exit ${code ?? "killed"})${last ? `: ${last}` : ""}`));
    });
    child.stdin.on("error", () => { /* the close handler reports it */ });
    child.stdin.end(request);
  });
}
