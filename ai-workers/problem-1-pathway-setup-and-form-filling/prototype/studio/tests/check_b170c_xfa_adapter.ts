// B170c (P-464 to P-476, P-542; design/xfa-reuse-analysis-2026-11-11.md §4.1 row c, §4.2): the one adapter to our XFA
// engine (engine/xfa/index.ts) and its switches. Each rule with a passing and a failing case:
//   the made-up form from the engine's fixtures and the committed blank IMM 5257 come back "not complete" with the form's
//   own first missing box and message (IMM 5257's descriptor found by the file's SHA-256 in samples/xfa-forms.json);
//   a form the engine refuses (the blank IMM 1294, refused for its input pattern: writer trial §7) comes back
//   "not available" with the engine's reason, and the engine's process exits 0 on it; a form the engine reads with no
//   recorded descriptor comes back "reads" (never a pass); another edition never borrows a descriptor; a time-out, an
//   engine that is not built, a wrong descriptor and an unreadable answer are each "not available", never a pass;
//   every switch is off and, while they are, no app file imports the adapter (the app behaves exactly as before); only
//   engine/xfa/ reaches the engine (one direction, §4.2 (2)); the form records are the engine's own files, unchanged.
//   Review round 1 (Major 1, minors 1-5): the engine runs strict, so no answer rests on script it skipped (fake engines
//   show the child asks for strict and refuses a skipped member); a real pass on a copy the engine's own fill script
//   filled and validated, found by its edition's official file; a malformed record and unencoded barcodes fail closed.
// FIXTURE DATA: the engine's made-up form (packages/xfa-engine/fixtures/synthetic) and IRCC's committed blank forms
// (official-sources/ircc, checked against the manifest's SHA-256). The engine is built here when its dist/ is missing
// (npm ci --legacy-peer-deps, npm run build in packages/xfa-engine, as its own CI job does).
// Pure: no server, no database, no model call (US$0).
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_b170c_xfa_adapter.ts
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { answerOf, askXfaEngine, engineDirectory, XFA_FORMS_FILE, XFA_SWITCHES, xfaDescriptorFor, xfaFormRecords, xfaOn, type XfaAnswer, type XfaSwitch } from "../engine/xfa/index.ts";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  B170c: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 600)}` : ""}`); };
const STUDIO = join(import.meta.dirname, "..");
const SOLUTION = join(STUDIO, "..", "..");
const ENGINE = engineDirectory();
const SYNTH = join(ENGINE, "fixtures", "synthetic");
const OFFICIAL = join(SOLUTION, "official-sources", "ircc");
const manifest = (JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")).items as { file: string; path: string; sha256?: string }[]);
const blank = (file: string) => { const m = manifest.find((i) => i.file === file); if (!m) throw new Error(`${file} is not in the official manifest`); return join(OFFICIAL, m.path); };
const sha = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");
const CLOCK = Date.parse("2026-11-13T12:00:00Z");

// The engine, built as its own CI job builds it, when this copy has no build yet.
if (!existsSync(join(ENGINE, "dist", "index.js"))) {
  console.log("NOTE  B170c: building packages/xfa-engine (npm ci --legacy-peer-deps, npm run build)");
  execFileSync("npm", ["ci", "--legacy-peer-deps", "--no-audit", "--no-fund"], { cwd: ENGINE, stdio: "inherit" });
  execFileSync("npm", ["run", "build"], { cwd: ENGINE, stdio: "inherit" });
}
ok("pass: the engine is found at packages/xfa-engine and built", existsSync(join(ENGINE, "package.json")) && existsSync(join(ENGINE, "dist", "index.js")), ENGINE);

// ---- switches: all off, and while they are, the app does not use the adapter ----
const names = Object.keys(XFA_SWITCHES) as XfaSwitch[];
ok("pass: five switches: form's own check, barcode check, view form, validate in the app, engine writer", JSON.stringify([...names].sort()) === JSON.stringify(["barcodeCheck", "engineWriter", "formCheck", "validateInApp", "viewForm"]), names);
ok("pass: every switch is off", names.every((n) => XFA_SWITCHES[n] === false && !xfaOn(n)), XFA_SWITCHES);
ok("fail: a switch turned on reads as on (xfaOn reads the list it is given)", xfaOn("viewForm", { ...XFA_SWITCHES, viewForm: true }) && !xfaOn("formCheck", { ...XFA_SWITCHES, viewForm: true }));
ok("fail: the switch list cannot be changed at run time", (() => { try { (XFA_SWITCHES as Record<XfaSwitch, boolean>).viewForm = true; } catch { /* frozen */ } return XFA_SWITCHES.viewForm === false; })());

const walk = (dir: string): string[] => !existsSync(dir) ? [] : readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === "node_modules" || f === "dist" ? [] : walk(p)) : /\.(tsx?|mjs|cjs|js)$/.test(f) ? [p] : []; });
const app = ["api/src", "engine", "web/src", "contracts"].flatMap((d) => walk(join(STUDIO, d))).map((p) => ({ file: relative(STUDIO, p), src: readFileSync(p, "utf8") })).filter((f) => !f.file.startsWith("engine/xfa/"));
// Review minor 5: any import form (from, import(), require) and any extension.
const importsAdapter = (src: string) => /(from\s+|import\(\s*|require\(\s*)["'][^"']*(engine\/xfa|\.\.?\/xfa)(\/index(\.[cm]?[jt]sx?)?)?\/?["']/.test(src);
const reachesEngine = (src: string) => /packages[/\\"', ]+xfa-engine|@expatready-eros\/xfa-engine|run-engine\.mjs/.test(src);
const users = app.filter((f) => importsAdapter(f.src)).map((f) => f.file);
// Review minor 5: unconditional. The row that turns a switch on and calls the adapter changes this check in its own PR.
ok(`pass: every switch is off and no app file uses the adapter, so the app behaves exactly as before (${app.length} files read)`, app.length > 200 && names.every((n) => !XFA_SWITCHES[n]) && users.length === 0, users);
ok("fail: an import of the adapter is seen, in any form", importsAdapter(`import { askXfaEngine } from "../engine/xfa/index.ts";`) && importsAdapter(`import { xfaOn } from "./xfa/index.ts";`) && importsAdapter(`import { xfaOn } from "../engine/xfa/index.js";`) && importsAdapter(`const a = require("../engine/xfa");`) && importsAdapter(`const a = await import("../../engine/xfa/index.ts");`) && !importsAdapter(`import { x } from "../engine/xfa-other.ts";`));
const direct = app.filter((f) => reachesEngine(f.src)).map((f) => f.file);
ok("pass: only engine/xfa/ reaches the engine (no other app file names packages/xfa-engine or the engine's process)", direct.length === 0, direct);
ok("fail: a direct reach to the engine is seen", reachesEngine(`const X = await import(join(ROOT, "packages", "xfa-engine", "dist", "index.js"));`) && reachesEngine(`import { openXfaPdf } from "@expatready-eros/xfa-engine";`));

// ---- the form records: the engine's own descriptor files, unchanged, for the exact official files ----
const records = xfaFormRecords();
ok("pass: two form records (the engine's two descriptor files), each for its official file's SHA-256 in the manifest", records.length === 2 && records.every((r) => { const m = manifest.find((i) => i.file === r.official_file); return !!m && sha(join(OFFICIAL, m.path)) === r.form_sha256; }), records.map((r) => r.form_sha256));
ok("pass: each descriptor is its source file, unchanged", records.every((r) => JSON.stringify(JSON.parse(readFileSync(join(SOLUTION, "..", "..", r.source), "utf8"))) === JSON.stringify(r.descriptor)), records.map((r) => r.source));
ok("fail: another edition never borrows a descriptor (a file the records do not hold has none)", xfaDescriptorFor(sha(blank("imm5257e-pre-2023.pdf"))) === null && xfaDescriptorFor("0".repeat(64)) === null);
const scratch = mkdtempSync(join(tmpdir(), "b170c-"));
try {
  const broken = join(scratch, "forms.json"); writeFileSync(broken, "{ not json");
  const a = await askXfaEngine(blank("imm5257e.pdf"), { formsFile: broken, clock: CLOCK });
  ok("fail: form records that do not read make the answer 'not available', never a bare 'reads'", a.status === "not_available", a);

  // ---- Done when (1): not complete, with the form's own first missing box and message ----
  const synth = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { descriptor: JSON.parse(readFileSync(join(SYNTH, "synthetic-form.pack.json"), "utf8")), clock: CLOCK });
  ok("pass: the engine's made-up form: not complete, stops at its own first missing box with its own message", synth.status === "stops_at" && /Name\[0\]$/.test(synth.box ?? "") && synth.message === "Name is required" && synth.pages > 0, synth);
  const t0 = Date.now();
  const imm = await askXfaEngine(blank("imm5257e.pdf"), { clock: CLOCK });
  const took = Date.now() - t0;
  ok(`pass: the blank IMM 5257 (descriptor found by its SHA-256): not complete, stops at the form's own first missing box with its own message, 5 pages (${took} ms)`, imm.status === "stops_at" && /ServiceIn\[0\]$/.test(imm.box ?? "") && /must contain a value/.test(imm.message ?? "") && /service in/i.test(imm.message ?? "") && imm.pages === 5, imm);

  // ---- Done when (2): a refused form is "not available" with the reason; the engine's process exits 0 ----
  const refused = await askXfaEngine(blank("imm1294e.pdf"), { clock: CLOCK });
  ok("pass: the blank IMM 1294 (refused by the engine): not available, with the engine's reason and code", refused.status === "not_available" && refused.code === "UNSUPPORTED_FEATURE" && /cannot read this form yet: .*picture/i.test(refused.reason), refused);
  const child = spawnSync(process.execPath, [join(STUDIO, "engine", "xfa", "run-engine.mjs")], { input: JSON.stringify({ engine: ENGINE, file: blank("imm1294e.pdf"), descriptor: null, clock: CLOCK, timezone: "UTC" }), encoding: "utf8", timeout: 60_000 });
  ok("pass: on a refused form the engine's process exits 0 with one answer line (a refusal is an answer, not a crash)", child.status === 0 && JSON.parse(child.stdout.trim()).kind === "refused", { status: child.status, out: child.stdout.slice(0, 200), err: child.stderr.slice(0, 200) });
  const bad = spawnSync(process.execPath, [join(STUDIO, "engine", "xfa", "run-engine.mjs")], { input: "not json", encoding: "utf8", timeout: 60_000 });
  ok("fail: a request that cannot be read exits 1, the engine process's one non-zero exit", bad.status === 1 && /not JSON/.test(bad.stderr));

  // ---- a form the engine reads with no recorded descriptor: "reads", never a pass ----
  const reads = await askXfaEngine(blank("imm5645e.pdf"), { clock: CLOCK });
  ok("pass: a form the engine reads with no recorded descriptor: 'reads' with its pages and why, never a pass", reads.status === "reads" && reads.pages > 0 && /no descriptor/.test(reads.why), reads);

  // ---- fail closed ----
  const wrong = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { descriptor: { validateButton: "Nowhere.Button", validatedFlag: "Nowhere.Flag", validatedValue: "Yes", firstMissingField: "noVar", barcodes: "Nowhere.Codes" }, clock: CLOCK });
  ok("fail: a descriptor that names nothing on the form is 'not available' with the engine's reason, never a pass", wrong.status === "not_available" && wrong.reason.length > 30, wrong);
  const slow = await askXfaEngine(blank("imm5257e.pdf"), { clock: CLOCK, timeoutMs: 30 });
  ok("fail: past the time limit the engine's process is stopped and the answer is 'not available' with the limit", slow.status === "not_available" && slow.code === "TIME_LIMIT" && /longer than/.test(slow.reason), slow);
  const none = await askXfaEngine(blank("imm5257e.pdf"), { engineDir: scratch, clock: CLOCK });
  ok("fail: an engine that is not built is 'not available', saying how to build it", none.status === "not_available" && none.code === "NO_ENGINE" && /npm run build/.test(none.reason), none);
  const missing = await askXfaEngine(join(scratch, "no-such.pdf"), { clock: CLOCK });
  ok("fail: a file that is not there is 'not available' with the reason", missing.status === "not_available" && /cannot be read/.test(missing.reason), missing);
  const shape = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { descriptor: { validateButton: "Summary.ValidateBtn" } as never, clock: CLOCK });
  ok("fail: a form record that does not describe the Validate fully is 'not available' as our record's fault, not the form's (review minor 3)", shape.status === "not_available" && shape.code === "BAD_DESCRIPTOR" && !/cannot read this form/.test(shape.reason), shape);

  // ---- review Major 1: strict. A fake engine records what the child asks of it; the real answers are above. ----
  const fake = (name: string, body: string) => { const d = join(scratch, name); mkdirSync(join(d, "dist"), { recursive: true }); writeFileSync(join(d, "package.json"), '{"type":"module"}'); writeFileSync(join(d, "dist", "index.js"), `export const openXfaPdf = async () => ({});\nexport const packFormDescriptorSchema = { parse: (d) => d };\n${body}`); return d; };
  const runtimeOf = (unsupported: string) => `{ load() {}, layout: () => ({ pages: [{}] }), validate: () => ({ complete: true, notes: [] }), encodeBarcodes: () => ({ validated: true, payloads: ["t"] }), unsupported: ${unsupported}, dispose() {} }`;
  const desc = JSON.parse(readFileSync(join(SYNTH, "synthetic-form.pack.json"), "utf8"));
  const strictOnly = fake("strict-only", `export const createFormRuntime = async (pdf, o) => { if (o.strict !== true) return ${runtimeOf("[]")}; const e = new Error("unsupported member Thing.member"); e.code = "UNSUPPORTED_MEMBER"; throw e; };`);
  const s1 = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { engineDir: strictOnly, descriptor: desc, clock: CLOCK });
  ok("fail: the engine runs strict: a form whose script touches a member the engine does not model is 'not available', never a pass (an engine that passes it only when not strict)", s1.status === "not_available" && s1.code === "UNSUPPORTED_MEMBER", s1);
  const skips = fake("skips", `export const createFormRuntime = async () => (${runtimeOf('[{ class: "field", member: "thing" }]')});`);
  const s2 = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { engineDir: skips, descriptor: desc, clock: CLOCK });
  ok("fail: an answer the engine reached while skipping a member is 'not available', naming the member, never a pass", s2.status === "not_available" && s2.code === "UNSUPPORTED_MEMBER" && /field\.thing/.test(s2.reason), s2);
  const clean = fake("clean", `export const createFormRuntime = async (pdf, o) => { if (o.strict !== true) throw new Error("not strict"); return ${runtimeOf("[]")}; };`);
  const s3 = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { engineDir: clean, descriptor: desc, clock: CLOCK });
  ok("pass: the same check with nothing skipped passes through the child (strict asked for)", s3.status === "passes" && JSON.stringify(s3.barcodeTexts) === '["t"]', s3);
  // BK-25: a defect of the form's own script that its record names (IMM 1295's focus on a node its template lacks) is
  // accepted only after a complete Validate, and only that member; strict otherwise.
  const DEFECT = [{ class: "subform", member: "C1CertificateIssueDate", why: "the form's own script focuses a node its template does not have" }];
  const lax = (unsupported: string, complete = true) => fake(`lax-${complete}-${unsupported.length}`, `export const createFormRuntime = async (pdf, o) => { if (o.strict !== false) throw Object.assign(new Error("strict"), { code: "STRICT" }); return { load() {}, layout: () => ({ pages: [{}] }), validate: () => (${complete} ? { complete: true, notes: [] } : { complete: false, firstMissingField: "Box", messages: [{ text: "m" }] }), encodeBarcodes: () => ({ validated: true, payloads: ["t"] }), unsupported: ${unsupported}, dispose() {} }; };`);
  const k1 = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { engineDir: lax('[{ class: "subform", member: "C1CertificateIssueDate" }]'), descriptor: desc, knownDefects: DEFECT, clock: CLOCK });
  ok("BK-25 pass: a complete Validate whose only skipped member is the one the form's record names passes (the run is not strict only then)", k1.status === "passes", k1);
  const k2 = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { engineDir: lax('[{ class: "subform", member: "C1CertificateIssueDate" }, { class: "field", member: "thing" }]'), descriptor: desc, knownDefects: DEFECT, clock: CLOCK });
  ok("BK-25 fail: a member the record does not name, beside the named one, is still 'not available', naming it", k2.status === "not_available" && k2.code === "UNSUPPORTED_MEMBER" && /field\.thing/.test(k2.reason), k2);
  const k3 = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { engineDir: lax('[{ class: "subform", member: "C1CertificateIssueDate" }]', false), descriptor: desc, knownDefects: DEFECT, clock: CLOCK });
  ok("BK-25 fail: the named member skipped on a Validate that did not complete is 'not available', never a stop reached past skipped script", k3.status === "not_available" && k3.code === "UNSUPPORTED_MEMBER", k3);
  const k4 = await askXfaEngine(join(SYNTH, "synthetic-form.pdf"), { engineDir: lax("[]"), descriptor: desc, knownDefects: [{ class: "subform", member: "x", why: "short" }], clock: CLOCK });
  ok("BK-25 fail: a record that names a defect without its why is our record's fault, 'not available'", k4.status === "not_available" && k4.code === "BAD_DESCRIPTOR", k4);
  ok("BK-25: IMM 1295 (09-2023)'s record names exactly the one defect the engine's own corpus test expects after its Validate", JSON.stringify((records.find((r) => r.form === "IMM 1295")?.known_form_defects ?? []).map((d) => [d.class, d.member])) === JSON.stringify([["subform", "C1CertificateIssueDate"]])
    && /unsupportedAfterValidate: \[\{ class: 'subform', member: 'C1CertificateIssueDate' \}\]/.test(readFileSync(join(ENGINE, "src", "__tests__", "corpus", "form-cases.ts"), "utf8")));

  // ---- review minor 2 and minor 1: the real pass, on a copy filled and validated by the engine's own fill script, ----
  // ---- found by its edition's official file (a filled copy's own SHA-256 is not its edition's) ----
  const filled = join(scratch, "filled.pdf");
  execFileSync(process.execPath, [join(ENGINE, "scripts", "fill-sample.mjs"), blank("imm5257e.pdf"), filled, join(ENGINE, "src", "__tests__", "fixtures", "form-data", "imm5257.synthetic.json"), join(ENGINE, "src", "__tests__", "fixtures", "form-data", "imm5257.pack.json"), "--tz", "America/Toronto", "--clock", "2026-11-13T12:00:00Z"], { cwd: ENGINE, stdio: "pipe", timeout: 120_000 });
  const edition = sha(blank("imm5257e.pdf"));
  const passed = await askXfaEngine(filled, { formSha256: edition, clock: CLOCK });
  ok("pass: a copy of IMM 5257 filled with the engine's made-up person passes the form's own Validate, with its five barcode texts", passed.status === "passes" && passed.barcodeTexts.length === 5 && passed.barcodeTexts.every((t) => typeof t === "string" && t.length > 20) && passed.pages >= 5, passed);
  const unnamed = await askXfaEngine(filled, { clock: CLOCK });
  ok("fail: the same filled copy without its edition named finds no descriptor and says so truly ('reads', why names the file and the edition), never a pass", unnamed.status === "reads" && /filled copy is looked up by its edition/.test(unnamed.why), unnamed);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// ---- the engine's raw answers in our words: anything unexpected is "not available" ----
const pairs: [string, unknown, (a: XfaAnswer) => boolean][] = [
  ["a complete form passes, with its barcode texts", { kind: "complete", pages: 6, barcodes: ["a|b", null], barcodesValidated: true }, (a) => a.status === "passes" && a.pages === 6 && JSON.stringify(a.barcodeTexts) === '["a|b",null]'],
  ["an incomplete form stops at its box with its message", { kind: "incomplete", pages: 5, firstMissingField: "x.y[0]", messages: ["m1", "m2"] }, (a) => a.status === "stops_at" && a.box === "x.y[0]" && a.message === "m1"],
  ["an incomplete form with no box or message still stops (never a pass)", { kind: "incomplete", pages: 5, firstMissingField: null, messages: [] }, (a) => a.status === "stops_at" && a.box === null && a.message === null],
  ["a complete answer without pages is not available", { kind: "complete", barcodes: [] }, (a) => a.status === "not_available"],
  ["a complete answer without barcodes is not available", { kind: "complete", pages: 1 }, (a) => a.status === "not_available"],
  ["a complete answer whose barcodes the form's save step did not encode is not available (review minor 4)", { kind: "complete", pages: 1, barcodes: [null], barcodesValidated: false }, (a) => a.status === "not_available" && a.code === "NOT_ENCODED"],
  ["a record the engine refuses as a descriptor is not available as our record's fault", { kind: "bad_descriptor", message: "x" }, (a) => a.status === "not_available" && a.code === "BAD_DESCRIPTOR"],
  ["an unknown answer is not available", { kind: "passed" }, (a) => a.status === "not_available" && a.code === "BAD_ANSWER"],
  ["no answer is not available", null, (a) => a.status === "not_available"],
];
for (const [what, raw, good] of pairs) ok(`${what.includes("not available") || what.includes("never") ? "fail" : "pass"}: ${what}`, good(answerOf(raw)), answerOf(raw));
ok("pass: the form records file is samples/xfa-forms.json", XFA_FORMS_FILE.endsWith(join("samples", "xfa-forms.json")));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
