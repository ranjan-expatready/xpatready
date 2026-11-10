// B164 (P-425, founder 9 Nov: "no combination key or program-specific branch in engine code"; P-452, Lead 9 on #1501:
// the API too): engine/ and api/src/ code name no combination, pathway or program key, no program by name, no IRCC form
// or guide number as a whole string and no "only in this slice" guard words, outside a shrink-only allow-list (ALLOW
// below; origin/main's copy is the ceiling) whose entries each name the row that removes them (M3-S1 to M3-S5, BK-n).
// Fixture entries leave out the demo story's and the checkpoint's own Sample loaders (P-93), never a case's own path.
// Comments are not code: a key in a comment is not read. A form number is read only as a whole string, the way code
// branches on a form or keys a table by it (a function named after a form, team.ts's imm5476, branches on nothing).
// Pure: reads files, and origin/main's allow-list through git when there is one; no server, no database.
//   tsx studio/tests/check_b164_no_engine_keys.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  B164: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d)}` : ""}`); };
const ROOT = join(import.meta.dirname, "..");
const SELF = "tests/check_b164_no_engine_keys.ts";

type Kind = "key" | "program" | "form" | "slice";
/** "fixture": a file or folder (ending in "/") not read at all: the demo story's and the checkpoint's own sample loaders. */
type EntryKind = Kind | "fixture";
type Hit = { file: string; line: number; kind: Kind; text: string };
type Entry = { guard: string; file: string; kind: EntryKind; text: string; row: string };
type Token = { kind: "str" | "id"; text: string; line: number };

/** The only entries allowed (P-425's three guards), each naming the row that removes it. Remove an entry in that row's
 *  PR; never add one. */
// ALLOW-START (JSON; shrink-only: compared with origin/main's copy of this block)
const ALLOW: Entry[] = [
  {"guard": "fixture", "file": "api/src/demo.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": ""},
  {"guard": "fixture", "file": "api/src/forms-demo.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": ""},
  {"guard": "fixture", "file": "api/src/finished-story.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": ""},
  {"guard": "fixture", "file": "api/src/checkpoint-words.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": ""},
  {"guard": "fixture", "file": "api/src/sample-case.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": ""},
  {"guard": "fixture", "file": "api/src/sample-validated.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": ""},
  {"guard": "fixture", "file": "api/src/features/checkpoint/", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": ""},
  {"guard": "G1 EACH_FILES_OWN", "file": "engine/filing-modes.ts", "kind": "key", "text": "vv.single", "row": "M3-S1"},
  {"guard": "G2 fees not worked out", "file": "engine/filing-modes.ts", "kind": "slice", "text": "Fees not worked out yet for ", "row": "M3-S1"},
  {"guard": "G2 fees not worked out", "file": "engine/runtime/filings.ts", "kind": "slice", "text": "Fees not worked out yet for ", "row": "M3-S1"},
  {"guard": "G2 fees not worked out", "file": "engine/runtime/filings.ts", "kind": "slice", "text": "Filings and fees are not derived yet for this combination (they are worked out once its fee lines and filing modes are in the fee table). Nothing is guessed.", "row": "M3-S2"},
  {"guard": "G3 checklist not derived", "file": "engine/runtime/case-checklist.ts", "kind": "slice", "text": "The document checklist per person is not derived yet for this combination (it is worked out once its requirements are checked). Nothing is guessed.", "row": "M3-S4"},
  {"guard": "BK-8 biometrics ages per pathway", "file": "api/src/case-prepare.ts", "kind": "key", "text": "vv.single", "row": "BK-8"},
  {"guard": "G3 checklist not derived", "file": "api/src/case-stages.ts", "kind": "slice", "text": " its release asks for (the per-person checklist is not worked out yet for this combination)", "row": "M3-S4"},
  {"guard": "M3-S5 answer sheet for online-only forms", "file": "api/src/fill-case.ts", "kind": "program", "text": "Express Entry: the answer sheet only, no PDF copy.", "row": "M3-S5"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5257 SCH1", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5409", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5476", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5475", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IRM 0002", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "program", "text": "Guide 5256, Question 3: \"If you choose a gender identifier that is different than what you currently have or have had on your Canadian temporary resident document (visa, electronic travel authorization, work permit, study permit or visitor record), you need to complete the Request for a Change of Sex or Gender Identifier (IRM 0002) form and send it with your application.\" and \"You also need to complete this form and send it with your application if you’ve never had a Canadian temporary resident document but you intend to apply for one and you identify with a gender that is different than what appears on your foreign travel document or passport.\"", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5707", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5645", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "program", "text": "canada.ca \"Family Information (IMM 5645)\", Who needs to complete this form? (official-sources/ircc/web-pages/page-imm5645.html, saved 19 Oct 2026): \"This form must be completed by each person, 18 years of age or older, applying for a Temporary Resident Visa, a study or work permit outside Canada.\"; canada.ca \"Apply for a visitor visa\" (official-sources/ircc/canada/pages/visit-canada-apply-visitor-visa.html, modified 2026-08-28, saved 27 Oct 2026): \"Your document checklist may include supporting documents such as the following: Family Information (IMM 5645) form\"; Guide 5256: \"This form must be completed by each person, 18 years of age or older\"", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5646", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "guide-5487", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "program", "text": "Guide 5487, applying for a work permit from outside Canada", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "program", "text": ", p. 1, documents list item 1: \"Proof of Payment, if applicable\" / \"Note: If you are applying for an open work permit, provide proof of payment for the open work permit holder fee.\" (Sample, Unconfirmed: expert)", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "key", "text": "vv.single", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5257", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5484", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "key", "text": "wp.lmia_inside", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 5710", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "program", "text": "canada.ca \"Work permit from inside Canada: Forms and documents\" (modified 2026-05-15): \"Your document checklist may include supporting documents such as: … Family Information Form - Visitors, Students and Workers (IMM 5707)\"; IMM 5707 (01-2023) p. 1, Instructions: \"This form must be completed by: each person, 18 years of age or older, or a minor (less than 18 years of age) travelling alone.\"", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "key", "text": "sp.outside", "row": "BK-10"},
  {"guard": "BK-10 form rules into data", "file": "api/src/form-setup.ts", "kind": "form", "text": "IMM 1294", "row": "BK-10"},
  {"guard": "stand-in SI-6 words (row to confirm, tech lead)", "file": "api/src/review-runs.ts", "kind": "program", "text": "Stand-in SI-6: the AI review runs live on the Visitor visa forms only (one trial); other form families follow one at a time with their own tests. Severities are Sample until the immigration expert confirms them.", "row": "BK-10"},
  {"guard": "IRCC checklist-page heading table (row to confirm, tech lead)", "file": "api/src/saved-readings.ts", "kind": "program", "text": "PARENTS AND GRANDPARENTS SUPER VISA", "row": "BK-10"},
  {"guard": "BK-10 form titles into data", "file": "api/src/sources.ts", "kind": "form", "text": "IMM 5257", "row": "BK-10"},
  {"guard": "BK-10 form titles into data", "file": "api/src/sources.ts", "kind": "form", "text": "IMM 1295", "row": "BK-10"},
  {"guard": "BK-10 form titles into data", "file": "api/src/sources.ts", "kind": "program", "text": "Application for Work Permit made Outside of Canada", "row": "BK-10"},
  {"guard": "BK-10 form titles into data", "file": "api/src/sources.ts", "kind": "form", "text": "IMM 5707", "row": "BK-10"},
  {"guard": "BK-10 form titles into data", "file": "api/src/sources.ts", "kind": "form", "text": "IMM 5409", "row": "BK-10"},
  {"guard": "BK-10 form titles into data", "file": "api/src/sources.ts", "kind": "form", "text": "IMM 5476", "row": "BK-10"},
  {"guard": "BK-10 form titles into data", "file": "api/src/sources.ts", "kind": "form", "text": "IMM 5475", "row": "BK-10"},
  {"guard": "BK-10 form titles into data", "file": "api/src/sources.ts", "kind": "form", "text": "IMM 5257 SCH1", "row": "BK-10"},
];
// ALLOW-END

/** The code's strings (a template's text between its ${…} parts, each part on its own) and names, comments and regular
 *  expressions left out. Enough of TypeScript for a scan: a `/` after a value is division, anywhere else a regex. */
export function tokens(src: string): Token[] {
  const out: Token[] = [];
  let i = 0, line = 1, prev = "";
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "\n") { line++; i++; continue; }
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'") {
      const at = line; let j = i + 1, s = "";
      while (j < n && src[j] !== c && src[j] !== "\n") { if (src[j] === "\\") { s += src[j + 1]; j += 2; continue; } s += src[j++]; }
      out.push({ kind: "str", text: s, line: at }); i = j + 1; prev = "v"; continue;
    }
    if (c === "`") {
      let at = line, j = i + 1, s = "";
      while (j < n && src[j] !== "`") {
        if (src[j] === "\\") { s += src[j + 1]; j += 2; continue; }
        if (src[j] === "$" && src[j + 1] === "{") {
          out.push({ kind: "str", text: s, line: at }); s = ""; j += 2;
          // The ${…} part is code: scanned on its own (its strings and names count too).
          let depth = 1; const from = j;
          while (j < n && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; }
          for (const t of tokens(src.slice(from, j - 1))) out.push({ ...t, line: line + t.line - 1 });
          line += (src.slice(from, j).match(/\n/g) ?? []).length; at = line; continue;
        }
        if (src[j] === "\n") line++;
        s += src[j++];
      }
      out.push({ kind: "str", text: s, line: at }); i = j + 1; prev = "v"; continue;
    }
    if (c === "/" && !/[\w)\]$]/.test(prev)) {
      let j = i + 1, inClass = false;
      while (j < n && src[j] !== "\n") { if (src[j] === "\\") { j += 2; continue; } if (src[j] === "[") inClass = true; else if (src[j] === "]") inClass = false; else if (src[j] === "/" && !inClass) break; j++; }
      i = j + 1; while (i < n && /[a-z]/.test(src[i])) i++; prev = "v"; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
      const w = src.slice(i, j); out.push({ kind: "id", text: w, line });
      prev = /^(return|typeof|case|in|of|delete|void|throw|new|yield|await|else|do)$/.test(w) ? "(" : "v"; i = j; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}

/** The structure's keys as the data names them: every pathway, program, category and combination key in the samples
 *  (programs.json, wave1.json, routes.json) and the fee table's combinations. Their first parts ("vv", "individual")
 *  mark a key too, so a new combination of a known program is caught before it is in any sample. */
function knownKeys(): Set<string> {
  const keys = new Set<string>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if ((k === "key" || k === "combination_key") && typeof v === "string") keys.add(v); walk(v); }
  };
  for (const f of ["programs", "wave1", "routes"]) walk(JSON.parse(readFileSync(join(ROOT, "samples", `${f}.json`), "utf8")));
  for (const k of Object.keys(JSON.parse(readFileSync(join(ROOT, "samples/fee-table.json"), "utf8")).combinations ?? {})) keys.add(k);
  return keys;
}

/** Dotted names that are not structure keys: shared facts ("person.date_of_birth"), a check's field paths
 *  ("expected.people", "uci.subject", "cited.quote"), the resolver's "holder.spouse", a fee line's "exempt.under_age", and file names. */
const NOT_KEYS = new Set(["case", "person", "relationship", "expected", "holder", "exempt", "uci", "cited"]);
const FILE_ENDINGS = new Set(["json", "ts", "tsx", "js", "mjs", "cjs", "pdf", "md", "txt", "csv", "html", "py", "xml", "sql", "png"]);
/** A program by name, in a name or a string. Roles (spouse, child) are not programs; neither are the abbreviations
 *  fact-name.ts upper-cases (LMIA, TRV), which name facts of any program. */
const PROGRAM = /visitor|study.?permit|work.?permit|super.?visa|express.?entry|caregiver|refugee|start.?up.?visa|working.?holiday|post.?graduation|family.?sponsorship|provincial.?nomin/i;
/** A form or guide number as a whole string ("IMM 5257", "IMM 5257 SCH1", "IRM 0002", "Guide 5256"): what code compares
 *  a form against or keys a table by. A number inside words (a citation, "a form number looks like IMM 5257") is text. */
const FORM = /^\s*((IMM|IRM|CIT|EMP)[ _-]?\d{4}[A-Z]?( ?(SCH|SCHEDULE|DEP) ?[0-9A-Z]*)?|guide[ _-]?\d{4})\s*$/i;
/** IRCC's own name (and its URL path) names no program. */
const DEPARTMENT = /immigration,? refugees,? and citizenship|immigration-refugees-citizenship/gi;
/** The words of a guard that holds a capability to the combinations worked out so far (P-425's three guards). A refusal
 *  that depends on a setting rather than on which combination it is (filing-changes.ts: "…not worked out yet for X:
 *  its people are on the principal's application", a filing mode) is not one. */
const SLICE = /\bnot (derived|worked out) yet for this combination\b|\bfees (are )?not worked out yet\b/i;

/** A dotted key only: a one-word program key ("lmia", "visitors", "study") is also an ordinary word (fact-name.ts
 *  upper-cases "lmia"); a program named in one word is PROGRAM's to catch. */
export function keyLike(s: string, known: Set<string>): boolean {
  if (!s.includes(".")) return false;
  if (known.has(s) || known.has(s.replace(/\.$/, ""))) return true;
  if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*\.?$/.test(s)) return false;
  const [head, ...rest] = s.split(".");
  const prefixes = new Set([...known].map((k) => k.split(".")[0]));
  if (prefixes.has(head)) return true;
  // A new program's combination (two to five letters, one dot: "ee.fsw"), unless it is a fact, a path or a file name.
  return /^[a-z]{2,5}\.[a-z][a-z0-9_]*$/.test(s) && !NOT_KEYS.has(head) && !FILE_ENDINGS.has(rest[0]);
}

export function scan(files: { file: string; src: string }[], known: Set<string>): Hit[] {
  const hits: Hit[] = [];
  for (const { file, src } of files) for (const t of tokens(src)) {
    const at = { file, line: t.line, text: t.text };
    if (t.kind === "str" && keyLike(t.text, known)) hits.push({ ...at, kind: "key" });
    else if (PROGRAM.test(t.text.replace(DEPARTMENT, ""))) hits.push({ ...at, kind: "program" });
    else if (t.kind === "str" && FORM.test(t.text)) hits.push({ ...at, kind: "form" });
    else if (t.kind === "str" && SLICE.test(t.text)) hits.push({ ...at, kind: "slice" });
  }
  return hits;
}

const same = (a: { file: string; kind: string; text: string }, b: { file: string; kind: string; text: string }) => a.file === b.file && a.kind === b.kind && a.text === b.text;
/** What the allow-list does not cover, and the entries nothing matches any more (each must go in the PR that removes
 *  its guard, so the list follows the code down). */
export function judge(hits: Hit[], entries: Entry[], files: string[] = []) {
  const lines = entries.filter((e) => e.kind !== "fixture");
  return { unexpected: hits.filter((h) => !lines.some((e) => same(e, h))),
    stale: [...lines.filter((e) => !hits.some((h) => same(e, h))), ...entries.filter((e) => e.kind === "fixture" && !files.some((f) => fixtureOf(f, [e])))] };
}
/** Shrink-only: the entries `next` adds over `base`. */
export const added = (base: Entry[], next: Entry[]) => next.filter((e) => !base.some((b) => same(b, e)));

/** The rows that remove an entry: M3-S1 to M3-S5 (P-425) and the Bake's BK rows (P-452); a fixture names none. */
const ROW = /^(M3-S[1-5]|BK-\d+)$/;

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs|cjs|js)$/.test(f) ? [p] : []; });
/** P-452 (Lead 9, 10 Nov): the engine and the API, where a pathway branch would break P-448 ("a new combination is
 *  content only"). */
const DIRS = ["engine", "api/src"];
const entries: Entry[] = ALLOW;
const fixtureOf = (file: string, list: Entry[]) => list.find((e) => e.kind === "fixture" && (e.file.endsWith("/") ? file.startsWith(e.file) : file === e.file));
const all = DIRS.flatMap((d) => walk(join(ROOT, d))).map((p) => relative(ROOT, p));
const engine = all.filter((f) => !fixtureOf(f, entries)).map((file) => ({ file, src: readFileSync(join(ROOT, file), "utf8") }));
const known = knownKeys();
/** The ALLOW block of a copy of this file, read as JSON (origin/main's, for shrink-only). */
export function allowOf(text: string): Entry[] | null {
  const m = /\/\/ ALLOW-START[^\n]*\nconst ALLOW: Entry\[\] = (\[[\s\S]*?\]);\n\/\/ ALLOW-END/.exec(text);
  return m ? JSON.parse(m[1].replace(/,\s*\]$/, "]")) : null;
}

// pass: today's engine has nothing outside the allow-list, and every entry still matches.
const real = judge(scan(engine, known), entries, all);
ok(`pass: no combination key, program name, form number or slice guard in engine/ or api/src/ outside the allow-list (${engine.length} files read, ${all.length - engine.length} fixture files left out)`, engine.length > 150 && real.unexpected.length === 0, real.unexpected);
ok("pass: every allow-list entry still matches the code (a removed guard takes its entry with it)", real.stale.length === 0, real.stale);
ok("pass: the scan reads the keys from the data (vv.single, sp.outside, individual.visitors.visitor_visa)", ["vv.single", "sp.outside", "individual.visitors.visitor_visa"].every((k) => known.has(k)));

// The allow-list can only shrink.
ok("pass: each entry names its guard and the row that removes it (M3-S1 to M3-S5, BK-n); a fixture says why it is one", entries.every((e) => e.guard && (e.kind === "fixture" ? e.row === "" && e.text.length > 20 : ROW.test(e.row))), entries.filter((e) => !(e.kind === "fixture" ? e.row === "" : ROW.test(e.row))));
ok("pass: this file's own ALLOW block reads back as JSON (so origin/main's copy is read, never skipped)", JSON.stringify(allowOf(readFileSync(join(ROOT, SELF), "utf8"))) === JSON.stringify(ALLOW));
let baseText: string | null = null;
try { baseText = execFileSync("git", ["show", `origin/main:./${SELF}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { baseText = null; }
if (baseText !== null) {
  const base = allowOf(baseText);
  ok(`pass: nothing added over origin/main's allow-list (${base?.length ?? "unreadable"} there, ${entries.length} here)`, !!base && added(base, entries).length === 0, base ? added(base, entries) : "origin/main's ALLOW block does not read");
} else console.log("NOTE  B164: origin/main has no copy of this suite yet (this PR adds it) or there is no origin/main here: nothing to compare with yet");
ok("fail: an entry added over the base is named", added(entries, [...entries, { guard: "G4", file: "engine/runtime/new.ts", kind: "key", text: "sp.outside", row: "M3-S1" }]).length === 1);
ok("fail: an entry nothing matches is stale", judge([], entries.slice(0, 1)).stale.length === 1);

// fail: each kind is caught in new code, the whole engine plus one new file.
const caught = (src: string, kind: Kind) => judge(scan([...engine, { file: "engine/runtime/new-thing.ts", src }], known), entries).unexpected.filter((h) => h.file === "engine/runtime/new-thing.ts" && h.kind === kind);
const cases: [string, string, Kind][] = [
  ["a combination key in a branch", `export const f = (k: string) => (k === "sp.outside" ? 1 : 0);`, "key"],
  ["a new combination of a known program", `const k = 'wp.open_spouse';`, "key"],
  ["a new program's combination", `const k = "ee.fsw";`, "key"],
  ["a key built in a template", "const k = `vv.${kind}`;", "key"],
  ["a pathway key", `if (p === "individual.study_permits") go();`, "key"],
  ["a key inside a template's ${…} part", "const w = `${x === \"sv.super_visa\" ? \"a\" : \"b\"}`;", "key"],
  ["a program named in code", `const isStudyPermit = (x: string) => x.length > 0;`, "program"],
  ["a program in a string", `const label = "Work permit";`, "program"],
  ["a form number in a branch", `if (form === "IMM 5257") skip();`, "form"],
  ["a guide number", `const g = "Guide 5709";`, "form"],
  ["a form number with its schedule", `if (f === "IMM 0008 SCH4A") x();`, "form"],
  ["a slice guard's words", `return { why: "Signing is not derived yet for this combination." };`, "slice"],
];
for (const [what, src, kind] of cases) ok(`fail: ${what} is caught (${src})`, caught(src, kind).length === 1, scan([{ file: "x.ts", src }], known));

const caughtIn = (file: string, src: string) => judge(scan([...engine, { file, src }], known), entries).unexpected.filter((h) => h.file === file);
ok("fail: a key in a new API file is caught (P-452)", caughtIn("api/src/new-thing.ts", `if (c.combination_key === "fs.spouse") charge();`).length === 1);
ok("fail: a fixture covers only its own files: a new API file beside them is read", !fixtureOf("api/src/demo-two.ts", entries) && !!fixtureOf("api/src/features/checkpoint/999-new.ts", entries) && !fixtureOf("api/src/features/checkpointer.ts", entries));
ok("fail: a fixture no file matches is stale", judge([], [{ guard: "fixture", file: "api/src/gone.ts", kind: "fixture", text: "x".repeat(30), row: "" }], all).stale.length === 1);

// pass: what is not a key, a program or a guard is left alone.
const clean = [
  `// A comment may say vv.single, Visitor visa, IMM 5257 and "not derived yet for this combination".`,
  `/* sp.outside, Study permit */ const a = 1;`,
  `const fact = "person.date_of_birth", c = "case.application_date", f = "expected.people", h = "holder.spouse";`,
  `const host = "www.canada.ca", file = "manifest.json", e = "exempt.under_age";`,
  `const re = /IMM 5257|vv\\.single/; const n = a / b / c;`,
  `const r = { role: "spouse_or_partner", words: "Changing the principal is not worked out yet for " };`,
  `export function imm5476() { return "IMM form number"; }`,
  `const w = "That is not a form number: a form number looks like IMM 5257.";`,
  `const u = "https://www.canada.ca/en/immigration-refugees-citizenship/services.html", d = "Immigration, Refugees and Citizenship Canada";`,
];
for (const src of clean) ok(`pass: not caught (${src})`, scan([{ file: "x.ts", src }], known).length === 0, scan([{ file: "x.ts", src }], known));
ok("pass: a line number is the string's own line", scan([{ file: "x.ts", src: "const a = 1;\n\nconst k = `x ${y}\n` + \"sp.outside\";" }], known)[0]?.line === 4);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
