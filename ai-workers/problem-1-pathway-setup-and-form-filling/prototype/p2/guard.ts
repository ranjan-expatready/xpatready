// P2 runner guard: what a drafting run may read, which route it may use, and what maker-written prompt
// text may contain (AIW-D260, AIW-D261). The JSON Schema contracts check shape only; these functions are
// the enforcement, and every P2 drafting call goes through them (runner.ts).
import { Ajv } from "ajv";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { captureSchemaErrors, fingerprint, noAnswers, type CaptureRecord } from "../contracts/portal-capture.ts";
import { canonical } from "../contracts/rules.ts";
import {
  approvedSourcesDirOk, BASE_URL, FORBIDDEN, INVENTORY, KEY_FILE, LABEL, MAX_ATTEMPTS, MODELS, OFFICIAL, PARTS_DIR, PRICE_PER_MTOK, PROMPTS_DIR, PROTOTYPE,
  QUESTION_LISTS, REVIEW_SHEETS, ROUTE_ID, RUN_CAP_USD, RUNS_DIR, SCREEN_INVENTORIES, SOLUTION,
} from "./policy.ts";

export class PolicyRefusal extends Error {}
const refuse = (m: string): never => { throw new PolicyRefusal(m); };
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const inside = (p: string, dir: string) => p === dir || p.startsWith(dir + sep);
type ManifestItem = { file: string; path: string; sha256: string };
const manifestItems = (): ManifestItem[] => JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")).items;

/** P-80: set on an inventory (or a part of one) of a form approved in the product, from its checked approval record. */
export type ApprovedInProduct = { sha256: string; edition: string; uploaded_by: string; approved_by: string };
export type AdmittedInput = { file: string; sha256: string; kind: "official" | "inventory" | "draft" | "inventory_part" | "screen_inventory" | "question_list" | "review_sheet"; bytes: Buffer; parent_sources?: { file: string; sha256: string }[]; approved?: ApprovedInProduct;
  /** C7.5 part 2: the printed edition a review sheet is of (the launcher checks the job names the same one). */
  edition?: string };
/** approvedDir (P-80): the one copy's approved-sources folder, named by the launcher; without it nothing approved in the
 *  product is admitted. */
export type AdmitOptions = { allowStubDrafts?: boolean; depth?: number; approvedDir?: string };

/** Admits one drafting input: an official file listed in official-sources/ircc/manifest.json with the same
 *  SHA-256, or the P1 inventory of such a file, or (P-80) the inventory of a form a second person approved in the product. The path is resolved first, so "..", symlinks and
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
  if (approvedSourcesDirOk(dirname(abs))) return admitApproved(rel, abs, bytes, h, opts);
  // F1 slice 2: plain names only (a name is sent in the prompt), checked again by the parts' own rules.
  if (dirname(abs) === SCREEN_INVENTORIES && /^[a-z0-9][a-z0-9._-]*\.screens\.json$/.test(basename(abs))) return admitScreens(rel, bytes, h);
  if (dirname(abs) === PARTS_DIR && /^[a-z0-9][a-z0-9._-]*\.part\.json$/.test(basename(abs))) return admitPart(rel, bytes, h, expectedSha, opts);
  if (dirname(abs) === QUESTION_LISTS && /^[a-z0-9][a-z0-9._-]*\.questions\.json$/.test(basename(abs))) return admitQuestionList(rel, bytes, h);
  if (dirname(abs) === REVIEW_SHEETS && /^[a-z0-9][a-z0-9._-]*\.sheet\.json$/.test(basename(abs))) return admitReviewSheet(rel, bytes, h);
  return refuse(`not on the drafting allowlist (official files, their P1 inventories, inventories of forms approved in the product, parts of them, approved screen inventories, combinations' question lists, filled forms' review sheets, and guarded drafts under AIW-D263): ${file}`);
}

/** P-80: the inventory of a form a second person approved in the product. The guard cannot see the database, so the
 *  Studio writes the approval where this can check it: <checksum>.approval.json, the approved PDF <checksum>.pdf and its
 *  inventory <checksum>.inventory.json, in the copy's approved-sources folder. Admitted only from the folder the launcher
 *  named, when the record is for exactly this checksum, the PDF still has it, the inventory was read from that PDF (its
 *  summary names the file and the checksum), and the approver is not the uploader. Anything else is refused. */
function admitApproved(rel: string, abs: string, bytes: Buffer, h: string, opts: AdmitOptions): AdmittedInput {
  const no = (m: string): never => refuse(`approved form ${rel} not admitted (P-80): ${m}`);
  const dir = dirname(abs);
  if (!opts.approvedDir) no("no approved-sources folder was named for this run, so nothing approved in the product is admitted");
  if (resolve(opts.approvedDir!) !== dir) no("it is not in the approved-sources folder named for this run (another copy's or workspace's approval)");
  const m = /^([0-9a-f]{64})\.inventory\.json$/.exec(basename(abs));
  if (!m) no("only the inventory of an approved PDF is admitted, named by its checksum");
  const sum = m![1];
  const inv = json(bytes, no);
  if (!inv || typeof inv !== "object" || !Array.isArray(inv.fields) || !inv.summary) no("it is not a form inventory");
  if (inv.summary.sha256 !== sum) no("its summary checksum is not the one its name gives");
  const plain = (name: string) => { const p = join(dir, name); let st; try { st = lstatSync(p); } catch { return no(`${name} is missing (no approval recorded for this checksum)`); } if (st.isSymbolicLink() || realpathSync(p) !== p) no(`${name} is a link`); return readFileSync(p); };
  const rec = json(plain(`${sum}.approval.json`), no);
  const person = /^[A-Za-z0-9_-]{1,64}$/;
  const pastTime = (t: unknown) => typeof t === "string" && !Number.isNaN(Date.parse(t)) && Date.parse(t) <= Date.now() + 300_000;
  let who: { uploaded_by: string; approved_by: string };
  if (rec?.contract === "official-download/v1") {
    // S4 (M2, M3): downloaded from canada.ca by the form finder, from the form's own page, or a hand upload equal to
    // that file (Q-L1). The same evidence as a manifest row: the official host, the form page, the PDF link, the checksum.
    closed(rec, ["contract", "sha256", "kind", "code", "edition", "file_name", "form_page", "source_url", "fetched_at", "started_by"], [], "official download record", no);
    const official = (u: unknown) => typeof u === "string" && /^https:\/\/(www|ircc)\.canada\.ca\/[^\s@]*$/.test(u);
    if (!official(rec.form_page) || !official(rec.source_url)) no("its record does not show a download from canada.ca");
    if (!person.test(rec.started_by)) no("the person named is not a plain id");
    if (!pastTime(rec.fetched_at)) no("the download time is not a past date and time");
    who = { uploaded_by: rec.started_by, approved_by: "official-download" };
  } else {
    closed(rec, ["contract", "sha256", "kind", "code", "edition", "file_name", "ircc_page", "uploaded_by", "approved_by", "approved_at"], [], "approval record", no);
    if (rec.contract !== "approved-source/v1") no("its approval record is not an approved-source/v1 record");
    if (!person.test(rec.uploaded_by) || !person.test(rec.approved_by)) no("the people named are not plain ids");
    if (rec.uploaded_by.toLowerCase() === rec.approved_by.toLowerCase()) no("approved by the person who uploaded it (a second person approves, P-80)");
    if (!pastTime(rec.approved_at)) no("the approval time is not a past date and time");
    who = { uploaded_by: rec.uploaded_by, approved_by: rec.approved_by };
  }
  if (rec.sha256 !== sum) no("its approval record is for another checksum");
  const printed = typeof rec.edition === "string" ? /^((?:IMM|IRM) [0-9A-Z ]+?) \([0-9]{2}-[0-9]{4}\)$/.exec(rec.edition) : null;
  if (rec.kind !== "form" || !printed) no("the approval is not for a form with a printed edition");
  // Breaker m1 (IRM editions): the edition prints the record's own form number (an IMM 5257 file is never IRM 0002's).
  if (rec.code !== printed![1]) no("the approval's form number is not the one its edition prints");
  const pdfName = `${sum}.pdf`;
  if (sha(plain(pdfName)) !== sum) no("the approved PDF no longer has the approved checksum");
  if (inv.summary.file !== relative(SOLUTION, join(dir, pdfName)).split(sep).join("/")) no("its inventory was not read from the approved PDF");
  return { file: rel, sha256: h, kind: "inventory", bytes, approved: { sha256: sum, edition: rec.edition, ...who } };
}

const json = (bytes: Buffer, no: (m: string) => never) => { try { return JSON.parse(bytes.toString("utf8")); } catch { return no("not JSON"); } };
/** A record with exactly these keys (some optional): an unknown key could carry text past the checks into a prompt. */
const closed = (o: unknown, required: string[], optional: string[], what: string, no: (m: string) => never) => {
  if (!o || typeof o !== "object" || Array.isArray(o)) return no(`${what} is not an object`);
  const keys = Object.keys(o);
  const extra = keys.filter((k) => !required.includes(k) && !optional.includes(k));
  if (extra.length) no(`${what} has keys a ${what} does not have (${extra.slice(0, 3).join(", ")})`);
  const missing = required.filter((k) => !keys.includes(k));
  if (missing.length) no(`${what} lacks ${missing.join(", ")}`);
};

/** QA-162: a combination's question list, made by the studio from its draft (role, library key and label of each question
 *  it asks), so an AI round names a question by its key. Names only, never an answer: a closed record of plain one-line
 *  labels (no control, format, line or paragraph separator characters, no angle bracket of any form, so nothing can
 *  forge a line or close the input it is sent in), library keys, at most 2,000 questions and 200 KB, none twice; never a
 *  representative's (the firm's) role or key. */
const LABEL_BAD = /[\p{C}\p{Zl}\p{Zp}<>\uFF1C\uFF1E\u2039\u203A\u00AB\u00BB\u2329\u232A\u3008\u3009\u27E8\u27E9]/u;
function admitQuestionList(rel: string, bytes: Buffer, h: string): AdmittedInput {
  const no = (m: string): never => refuse(`question list ${rel} not admitted: ${m}`);
  if (bytes.length > 200_000) no("it is larger than 200 KB");
  const env = json(bytes, no);
  closed(env, ["contract", "combination", "questions"], [], "question list", no);
  if (env.contract !== "question-list/v1") no("not a question-list/v1 record");
  if (typeof env.combination !== "string" || !/^[a-z0-9][a-z0-9._-]{0,80}$/.test(env.combination)) no("its combination is not a plain key");
  if (!Array.isArray(env.questions) || !env.questions.length || env.questions.length > 2000) no("it holds no question, or more than 2,000");
  const seen = new Set<string>();
  for (const q of env.questions as unknown[]) {
    closed(q, ["role", "key", "label"], [], "question", no);
    const { role, key, label } = q as Record<string, unknown>;
    if (typeof role !== "string" || !/^[a-z][a-z_]{0,40}$/.test(role) || role.startsWith("representative")) no(`"${String(role).slice(0, 40)}" is not the role of a person applying or of the case`);
    if (typeof key !== "string" || key.length > 120 || !/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(key) || key.startsWith("representative.")) no(`"${String(key).slice(0, 60)}" is not a library key of a person applying or of the case`);
    if (typeof label !== "string" || !label.trim() || Array.from(label).length > 300 || LABEL_BAD.test(label)) no(`the label of ${String(key)} is not one plain line of at most 300 characters`);
    const k = `${role}|${key}`;
    if (seen.has(k)) no(`${k} appears twice`);
    seen.add(k);
  }
  return { file: rel, sha256: h, kind: "question_list", bytes };
}

/** C7.5 part 2: a filled form's review sheet, written by the studio (engine/runtime/form-review.ts reviewSheet): its printed
 *  edition and, box by box, the caption, the library fact and the value the form would read. Admitted only as a closed
 *  review-sheet/v1 record of at most 2,000 boxes and 400 KB, each box named once, every text one plain line (LABEL_BAD:
 *  nothing can forge a line or close the input it is sent in), never a representative's (the firm's) fact. The values are
 *  the case's answers: sent as delimited data, never as instructions (AG11-D13), and only on a run a person started. */
function admitReviewSheet(rel: string, bytes: Buffer, h: string): AdmittedInput {
  const no = (m: string): never => refuse(`review sheet ${rel} not admitted: ${m}`);
  if (bytes.length > 400_000) no("it is larger than 400 KB");
  const env = json(bytes, no);
  closed(env, ["contract", "form_edition", "fields"], [], "review sheet", no);
  if (env.contract !== "review-sheet/v1") no("not a review-sheet/v1 record");
  if (typeof env.form_edition !== "string" || !/^(IMM|IRM) [0-9A-Z ]+ \([0-9]{2}-[0-9]{4}\)$/.test(env.form_edition)) no("its form edition is not a printed edition such as IMM 0000 (MM-YYYY)");
  if (!Array.isArray(env.fields) || !env.fields.length || env.fields.length > 2000) no("it holds no box, or more than 2,000");
  // "|" is the column mark of a sheet line in the prompt (p2/prompt.ts), so no text carries it (C7.5 challenge m1).
  const line = (v: unknown, max: number) => typeof v === "string" && !!v.trim() && Array.from(v).length <= max && !LABEL_BAD.test(v) && !v.includes("|");
  const seen = new Set<string>();
  for (const f of env.fields as unknown[]) {
    closed(f, ["box", "caption", "fact", "value"], [], "box", no);
    const { box, caption, fact, value } = f as Record<string, unknown>;
    if (!line(box, 200)) no(`"${String(box).slice(0, 40)}" is not a box name of one plain line of at most 200 characters`);
    if (!line(caption, 300)) no(`the caption of ${String(box)} is not one plain line of at most 300 characters`);
    if (fact !== null && (typeof fact !== "string" || fact.length > 120 || !/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(fact))) no(`the fact of ${String(box)} is not a library key`);
    if (typeof fact === "string" && fact.startsWith("representative.")) no(`${String(box)} holds the representative's (the firm's) fact, which a review sheet never carries`);
    // C7.5 challenge m1: no contact detail (email, telephone, fax) is sent, as the studio's sheet already leaves them out.
    if (typeof fact === "string" && /(^|[._])(e_?mail|phone|telephone|fax|mobile)([._]|$)/.test(fact)) no(`${String(box)} holds a contact detail (${fact}), which a review sheet never carries`);
    if (!line(value, 500)) no(`the value of ${String(box)} is not one plain line of at most 500 characters`);
    if (seen.has(box as string)) no(`${String(box)} appears twice`);
    seen.add(box as string);
  }
  return { file: rel, sha256: h, kind: "review_sheet", bytes, edition: env.form_edition };
}

/** F1 slice 2: an approved portal screen inventory (P-66). Admitted only when it meets the capture contract, holds no
 *  answer, its fingerprint is the one recomputed from its structure, and a second person approved it. */
function admitScreens(rel: string, bytes: Buffer, h: string): AdmittedInput {
  const no = (m: string): never => refuse(`screen inventory ${rel} not admitted: ${m}`);
  const env = json(bytes, no);
  closed(env, ["contract", "fingerprint", "record", "approval"], [], "screen inventory", no);
  if (env.contract !== "screen-inventory/v1") no("not a screen-inventory/v1 record");
  closed(env.approval, ["capture_id", "captured_by", "approved_by", "approved_at", "edition"], [], "approval", no);
  if (Object.values(env.approval).some((v) => typeof v !== "string" || v.length > 200)) no("an approval entry is not a short text");
  const person = /^[A-Za-z0-9_-]{1,64}$/;
  if (!person.test(env.approval.captured_by) || !person.test(env.approval.approved_by)) no("the people named are not plain ids");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(env.approval.approved_at) || Date.parse(env.approval.approved_at) > Date.now() + 300_000) no("the approval time is not a past date and time");
  const r = env.record as CaptureRecord;
  if (captureSchemaErrors(r).length) no("its record does not meet the capture contract");
  if (noAnswers(r).length) no(`it carries an answer (${noAnswers(r).slice(0, 2).join(", ")})`);
  const ids = r.screens.flatMap((s) => s.inputs.map((i) => i.id));
  if (new Set(ids).size !== ids.length) no("an element id appears more than once");
  if (fingerprint(r) !== env.fingerprint) no("its fingerprint is not the one its structure gives (changed after approval)");
  const a = env.approval ?? {};
  if (typeof a.captured_by !== "string" || typeof a.approved_by !== "string" || !a.captured_by || !a.approved_by) no("no approval recorded");
  if (a.captured_by.toLowerCase() === a.approved_by.toLowerCase()) no("approved by the person who captured it (a second person approves, P-66)");
  // A screen's key is its place in the order (s01, s02 …): the key is sent, the order is in the fingerprint.
  if (r.screens.some((s) => s.key !== `s${String(s.order).padStart(2, "0")}`)) no("a screen's key does not follow its order");
  if (typeof a.approved_at !== "string" || Number.isNaN(Date.parse(a.approved_at))) no("no approval time");
  return { file: rel, sha256: h, kind: "screen_inventory", bytes };
}

/** F1 slice 2 (A4): a part of an admitted inventory or screen inventory. Admitted only when its parent is admitted at
 *  the hash it names, and everything it holds is copied unchanged from that parent: the same summary, row groups and
 *  presence scripts, and form fields (or screen inputs) each found in the parent, none twice. */
function admitPart(rel: string, bytes: Buffer, h: string, expectedSha: string | undefined, opts: AdmitOptions): AdmittedInput {
  const no = (m: string): never => refuse(`inventory part ${rel} not admitted: ${m}`);
  if ((opts.depth ?? 0) > 3) no("chain deeper than three steps");
  const env = json(bytes, no);
  if (env.contract !== "inventory-part/v1") no("not an inventory-part/v1 record");
  const p = env.part ?? {};
  closed(p, ["index", "count"], ["section"], "part number", no);
  if (!(Number.isInteger(p.index) && Number.isInteger(p.count) && p.index >= 1 && p.index <= p.count)) no("its part number is not n of m");
  closed(env.parent, ["file", "sha256"], [], "parent", no);
  if (typeof env.parent?.file !== "string" || typeof env.parent?.sha256 !== "string") no("no parent named");
  const parent = admitInput(env.parent.file, env.parent.sha256, { ...opts, depth: (opts.depth ?? 0) + 1 });
  if (parent.file !== env.parent.file) no("its parent is named by another path than the parent's own");
  if (parent.kind !== "inventory" && parent.kind !== "screen_inventory") no(`its parent is a ${parent.kind}, not an inventory or a screen inventory`);
  const pj = json(parent.bytes, no);
  const same = (a: unknown, b: unknown) => canonical((a ?? null) as never) === canonical((b ?? null) as never);
  if (parent.kind === "inventory") {
    closed(env, ["contract", "parent", "part", "fields"], ["summary", "groups", "presence_scripts"], "part", no);
    for (const k of ["summary", "groups", "presence_scripts"]) if (!same(env[k], pj[k])) no(`its ${k} differs from the parent's`);
    const known = new Set((pj.fields ?? []).map((f: unknown) => canonical(f as never)));
    const mine = (env.fields ?? []).map((f: unknown) => canonical(f as never));
    if (!mine.length) no("it holds no form field");
    if (new Set(mine).size !== mine.length) no("a form field appears twice");
    if (mine.some((f: string) => !known.has(f))) no("a form field is not in the parent inventory as it is there");
    // The section names it gives (sent with the part) are its own fields' sections, nothing else.
    if (p.section !== undefined) {
      const own = (env.fields as { section?: string; data_path?: string }[]).flatMap((f) => [f.section ?? "", f.data_path ?? ""]).filter(Boolean);
      const ok = typeof p.section === "string" && p.section.length <= 500 && p.section.split(", ").every((s: string) => s && own.some((o) => o === s || o.startsWith(`${s}.`)));
      if (!ok) no("its section names are not the sections of its form fields");
    }
  } else if (parent.kind === "screen_inventory") {
    closed(env, ["contract", "parent", "part", "inputs"], [], "part", no);
    if (p.section !== undefined && p.section !== "inputs left open") no("a screen part names no section");
    const screens = new Map((pj.record.screens as { key: string; title: string; inputs: unknown[] }[]).map((s) => [s.key, s]));
    const mine = (env.inputs ?? []) as { screen: string; title: string; input: { id: string } }[];
    if (!Array.isArray(mine)) no("its inputs are not a list");
    for (const x of mine) closed(x, ["screen", "title", "input"], [], "input entry", no);
    if (!mine.length) no("it holds no input");
    if (new Set(mine.map((x) => x.input?.id)).size !== mine.length) no("an input appears twice");
    for (const x of mine) {
      const s = screens.get(x.screen);
      if (!s || s.title !== x.title || !s.inputs.some((i) => same(i, x.input))) no(`input ${x.input?.id} is not on screen ${x.screen} of the parent as it is there`);
    }
  } else no(`its parent is a ${parent.kind}, not an inventory or a screen inventory`);
  if (expectedSha !== undefined && expectedSha !== h) no("hash differs from the run record");
  return { file: rel, sha256: h, kind: "inventory_part", bytes, parent_sources: [{ file: parent.file, sha256: parent.sha256 }], ...(parent.approved ? { approved: parent.approved } : {}) };
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

/** F1 slice 2 (break m5): the drafting process may read all of p2, and Node follows a link, so a link planted under p2
 *  (say p2/parts/x.json → the answer key) would be readable there even though admitInput refuses links. The launcher
 *  refuses to start while any link sits under p2 (node_modules lives outside it). */
export function assertNoLinksUnder(dir: string): void {
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isSymbolicLink()) refuse(`a link sits under ${relative(SOLUTION, dir)} (${relative(SOLUTION, p)}); the drafting process could read through it. Remove it first.`);
      if (e.isDirectory()) walk(p);
    }
  };
  walk(dir);
}

/** Node permission-model arguments for the drafting process: it can read the official files, their
 *  inventories, the runner code, the contracts, the SDK and the key file, write only the spend ledger,
 *  and read nothing else (no answer key, no family values).
 *  `--preserve-symlinks` (QA-8): the module loader keeps a package's path as found instead of resolving it with
 *  realpath, which stats every link on the way. In a lane copy `node_modules` is a link whose target runs through a
 *  second link (the copy's `.tools`); resolving it needed read access to that link, which would grant the whole tools
 *  folder. With the flag the allowances below suffice everywhere, and none is widened. */
export function isolatedNodeArgs(ledgerDir: string, approvedDir?: string): string[] {
  const nodeModules = realpathSync(join(PROTOTYPE, "node_modules"));
  // P-80: one copy's approved-sources folder, only when the launcher names one; never any other part of the Studio's files.
  if (approvedDir !== undefined && !approvedSourcesDirOk(approvedDir)) refuse(`not an approved-sources folder of a Studio copy: ${approvedDir}`);
  const reads = [OFFICIAL, INVENTORY, join(PROTOTYPE, "p2"), join(PROTOTYPE, "contracts"), join(PROTOTYPE, "package.json"), join(PROTOTYPE, "node_modules"), nodeModules, dirname(KEY_FILE), ledgerDir, ...(approvedDir ? [approvedDir] : [])];
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
