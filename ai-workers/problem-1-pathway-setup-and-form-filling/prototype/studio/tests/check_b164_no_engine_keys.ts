// B164 (P-425, founder 9 Nov: "no combination key or program-specific branch in engine code"): engine/ code names no
// combination, pathway or program key, no program by name, no IRCC form or guide number and no "only in this slice"
// guard words, outside a shrink-only allow-list (ALLOW below; origin/main's copy is the ceiling) whose entries each name the row that
// removes them (M3-S1 to M3-S5). Comments are not code: a key in a comment is not read. A form number is read only in a
// string, the one way code can branch on a form (a function named after a form, team.ts's imm5476, branches on nothing).
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
type Hit = { file: string; line: number; kind: Kind; text: string };
type Entry = { guard: string; file: string; kind: Kind; text: string; row: string };
type Token = { kind: "str" | "id"; text: string; line: number };

/** The only entries allowed (P-425's three guards), each naming the row that removes it. Remove an entry in that row's
 *  PR; never add one. */
// ALLOW-START (JSON; shrink-only: compared with origin/main's copy of this block)
const ALLOW: Entry[] = [
  {"guard": "G1 EACH_FILES_OWN", "file": "engine/filing-modes.ts", "kind": "key", "text": "vv.single", "row": "M3-S1"},
  {"guard": "G1 EACH_FILES_OWN", "file": "engine/filing-modes.ts", "kind": "form", "text": "Guide 5256 says family members complete their own application forms.", "row": "M3-S1"},
  {"guard": "G2 fees not worked out", "file": "engine/filing-modes.ts", "kind": "slice", "text": "Fees not worked out yet for ", "row": "M3-S1"},
  {"guard": "G2 fees not worked out", "file": "engine/runtime/filings.ts", "kind": "slice", "text": "Fees not worked out yet for ", "row": "M3-S1"},
  {"guard": "G2 fees not worked out", "file": "engine/runtime/filings.ts", "kind": "slice", "text": "Filings and fees are not derived yet for this combination (they are worked out once its fee lines and filing modes are in the fee table). Nothing is guessed.", "row": "M3-S2"},
  {"guard": "G3 checklist not derived", "file": "engine/runtime/case-checklist.ts", "kind": "slice", "text": "The document checklist per person is not derived yet for this combination (it is worked out once its requirements are checked). Nothing is guessed.", "row": "M3-S4"},
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
 *  ("expected.people"), the resolver's "holder.spouse", a fee line's "exempt.under_age", and file names. */
const NOT_KEYS = new Set(["case", "person", "relationship", "expected", "holder", "exempt"]);
const FILE_ENDINGS = new Set(["json", "ts", "tsx", "js", "mjs", "cjs", "pdf", "md", "txt", "csv", "html", "py", "xml", "sql", "png"]);
/** A program by name, in a name or a string. Roles (spouse, child) are not programs; neither are the abbreviations
 *  fact-name.ts upper-cases (LMIA, TRV), which name facts of any program. */
const PROGRAM = /visitor|study.?permit|work.?permit|super.?visa|express.?entry|caregiver|refugee|start.?up.?visa|working.?holiday|post.?graduation|family.?sponsorship|provincial.?nomin/i;
const FORM = /\b(IMM|IRM|CIT|EMP)[ _-]?\d{4}\b|\bguide[ _-]?\d{4}\b/i;
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
    else if (PROGRAM.test(t.text)) hits.push({ ...at, kind: "program" });
    else if (t.kind === "str" && FORM.test(t.text)) hits.push({ ...at, kind: "form" });
    else if (t.kind === "str" && SLICE.test(t.text)) hits.push({ ...at, kind: "slice" });
  }
  return hits;
}

const same = (a: { file: string; kind: string; text: string }, b: { file: string; kind: string; text: string }) => a.file === b.file && a.kind === b.kind && a.text === b.text;
/** What the allow-list does not cover, and the entries nothing matches any more (each must go in the PR that removes
 *  its guard, so the list follows the code down). */
export function judge(hits: Hit[], entries: Entry[]) {
  return { unexpected: hits.filter((h) => !entries.some((e) => same(e, h))), stale: entries.filter((e) => !hits.some((h) => same(e, h))) };
}
/** Shrink-only: the entries `next` adds over `base`. */
export const added = (base: Entry[], next: Entry[]) => next.filter((e) => !base.some((b) => same(b, e)));

/** B164's first list (10 Nov): the allow-list may only ever be a part of it. */
const FIRST: Pick<Entry, "file" | "kind" | "text">[] = [
  { file: "engine/filing-modes.ts", kind: "key", text: "vv.single" },
  { file: "engine/filing-modes.ts", kind: "form", text: "Guide 5256 says family members complete their own application forms." },
  { file: "engine/filing-modes.ts", kind: "slice", text: "Fees not worked out yet for " },
  { file: "engine/runtime/filings.ts", kind: "slice", text: "Fees not worked out yet for " },
  { file: "engine/runtime/filings.ts", kind: "slice", text: "Filings and fees are not derived yet for this combination (they are worked out once its fee lines and filing modes are in the fee table). Nothing is guessed." },
  { file: "engine/runtime/case-checklist.ts", kind: "slice", text: "The document checklist per person is not derived yet for this combination (it is worked out once its requirements are checked). Nothing is guessed." },
];
const ROWS = new Set(["M3-S1", "M3-S2", "M3-S3", "M3-S4", "M3-S5"]);

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs|cjs|js)$/.test(f) ? [p] : []; });
const engine = walk(join(ROOT, "engine")).map((p) => ({ file: relative(ROOT, p), src: readFileSync(p, "utf8") }));
const known = knownKeys();
const entries: Entry[] = ALLOW;
/** The ALLOW block of a copy of this file, read as JSON (origin/main's, for shrink-only). */
export function allowOf(text: string): Entry[] | null {
  const m = /\/\/ ALLOW-START[^\n]*\nconst ALLOW: Entry\[\] = (\[[\s\S]*?\]);\n\/\/ ALLOW-END/.exec(text);
  return m ? JSON.parse(m[1].replace(/,\s*\]$/, "]")) : null;
}

// pass: today's engine has nothing outside the allow-list, and every entry still matches.
const real = judge(scan(engine, known), entries);
ok(`pass: no combination key, program name, form number or slice guard in engine/ outside the allow-list (${engine.length} files read)`, engine.length > 50 && real.unexpected.length === 0, real.unexpected);
ok("pass: every allow-list entry still matches the code (a removed guard takes its entry with it)", real.stale.length === 0, real.stale);
ok("pass: the scan reads the keys from the data (vv.single, sp.outside, individual.visitors.visitor_visa)", ["vv.single", "sp.outside", "individual.visitors.visitor_visa"].every((k) => known.has(k)));

// The allow-list can only shrink.
ok(`pass: the allow-list is part of B164's first list (${entries.length} of ${FIRST.length})`, entries.every((e) => FIRST.some((f) => same(f, e))), entries.filter((e) => !FIRST.some((f) => same(f, e))));
ok("pass: each entry names its guard and the row that removes it (M3-S1 to M3-S5)", entries.every((e) => e.guard && ROWS.has(e.row)), entries.filter((e) => !ROWS.has(e.row)));
ok("pass: this file's own ALLOW block reads back as JSON (so origin/main's copy is read, never skipped)", JSON.stringify(allowOf(readFileSync(join(ROOT, SELF), "utf8"))) === JSON.stringify(ALLOW));
let baseText: string | null = null;
try { baseText = execFileSync("git", ["show", `origin/main:./${SELF}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { baseText = null; }
if (baseText !== null) {
  const base = allowOf(baseText);
  ok(`pass: nothing added over origin/main's allow-list (${base?.length ?? "unreadable"} there, ${entries.length} here)`, !!base && added(base, entries).length === 0, base ? added(base, entries) : "origin/main's ALLOW block does not read");
} else console.log("NOTE  B164: origin/main has no copy of this suite yet (this PR adds it) or there is no origin/main here: compared with B164's first list only");
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
  ["a guide number", `const why = "guide 5709 says so";`, "form"],
  ["a slice guard's words", `return { why: "Signing is not derived yet for this combination." };`, "slice"],
];
for (const [what, src, kind] of cases) ok(`fail: ${what} is caught (${src})`, caught(src, kind).length === 1, scan([{ file: "x.ts", src }], known));

// pass: what is not a key, a program or a guard is left alone.
const clean = [
  `// A comment may say vv.single, Visitor visa, IMM 5257 and "not derived yet for this combination".`,
  `/* sp.outside, Study permit */ const a = 1;`,
  `const fact = "person.date_of_birth", c = "case.application_date", f = "expected.people", h = "holder.spouse";`,
  `const host = "www.canada.ca", file = "manifest.json", e = "exempt.under_age";`,
  `const re = /IMM 5257|vv\\.single/; const n = a / b / c;`,
  `const r = { role: "spouse_or_partner", words: "Changing the principal is not worked out yet for " };`,
  `export function imm5476() { return "IMM form number"; }`,
];
for (const src of clean) ok(`pass: not caught (${src})`, scan([{ file: "x.ts", src }], known).length === 0, scan([{ file: "x.ts", src }], known));
ok("pass: a line number is the string's own line", scan([{ file: "x.ts", src: "const a = 1;\n\nconst k = `x ${y}\n` + \"sp.outside\";" }], known)[0]?.line === 4);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
