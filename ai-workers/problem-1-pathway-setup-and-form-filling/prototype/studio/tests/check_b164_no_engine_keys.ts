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
/** "fixture": a file or folder (ending in "/") not read at all: the demo story's and the checkpoint's own sample loaders
 *  (P-452: row BK-12 shrinks the list; a new fixture needs the tech lead's ruling in its PR). An entry whose guard starts
 *  "reader content" (text read from an IRCC page, no branch) names no row. */
type EntryKind = Kind | "fixture";
type Hit = { file: string; line: number; kind: Kind; text: string };
type Entry = { guard: string; file: string; kind: EntryKind; text: string; row: string; count?: number };
type Token = { kind: "str" | "id" | "re"; text: string; line: number };

/** The only entries allowed (P-425's three guards), each naming the row that removes it. Remove an entry in that row's
 *  PR; never add one. */
// ALLOW-START (JSON; shrink-only: compared with origin/main's copy of this block)
const ALLOW: Entry[] = [
  {"guard": "fixture (BK-12 sample case as a setting)", "file": "api/src/demo.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": "BK-12"},
  {"guard": "fixture (BK-12 sample case as a setting)", "file": "api/src/forms-demo.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": "BK-12"},
  {"guard": "fixture (BK-12 sample case as a setting)", "file": "api/src/finished-story.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": "BK-12"},
  {"guard": "fixture (BK-12 sample case as a setting)", "file": "api/src/checkpoint-words.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": "BK-12"},
  {"guard": "fixture (BK-12 sample case as a setting)", "file": "api/src/sample-validated.ts", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": "BK-12"},
  {"guard": "fixture (BK-12 sample case as a setting)", "file": "api/src/features/checkpoint/", "kind": "fixture", "text": "loads the demo story's or the configured checkpoint's own Sample content (P-93, DEMO.md), as a person would on the screens; a case's own path never runs it", "row": "BK-12"},
  {"guard": "reader content: a heading read from IRCC's checklist page, no branch", "file": "api/src/saved-readings.ts", "kind": "program", "text": "PARENTS AND GRANDPARENTS SUPER VISA", "row": ""},
];
// ALLOW-END

/** One escape read as the character it stands for ("\\u0049" is "I"), so an escaped key is still a key. */
function unescape(src: string, j: number): [string, number] {
  const e = src[j + 1];
  if (e === "u" && src[j + 2] === "{") { const k = src.indexOf("}", j); return [String.fromCodePoint(parseInt(src.slice(j + 3, k), 16) || 0), k + 1]; }
  if (e === "u") return [String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16) || 0), j + 6];
  if (e === "x") return [String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16) || 0), j + 4];
  return [({ n: "\n", t: "\t", r: "\r" } as Record<string, string>)[e] ?? e, j + 2];
}
/** Reads code from `i` to the end, or (`part`) to the `}` that closes a template's ${…} part, so a part is read by the
 *  same rules as any code (review round 2: a quote inside a regular expression in a part ended the scan). */
function lex(src: string, i: number, line: number, part: boolean, out: Token[]): { i: number; line: number } {
  let prev = "", depth = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "\n") { line++; i++; continue; }
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'") {
      const at = line; let j = i + 1, s = "";
      while (j < n && src[j] !== c && src[j] !== "\n") { if (src[j] === "\\") { const [ch, k] = unescape(src, j); s += ch; j = k; continue; } s += src[j++]; }
      out.push({ kind: "str", text: s, line: at }); i = j + 1; prev = "v"; continue;
    }
    if (c === "`") {
      let at = line, j = i + 1, s = "";
      while (j < n && src[j] !== "`") {
        if (src[j] === "\\") { const [ch, k] = unescape(src, j); s += ch; j = k; continue; }
        if (src[j] === "$" && src[j + 1] === "{") {
          out.push({ kind: "str", text: s, line: at }); s = "";
          ({ i: j, line } = lex(src, j + 2, line, true, out)); at = line; continue;
        }
        if (src[j] === "\n") line++;
        s += src[j++];
      }
      out.push({ kind: "str", text: s, line: at }); i = j + 1; prev = "v"; continue;
    }
    if (c === "/" && !/[\w)\]$]/.test(prev)) {
      let j = i + 1, inClass = false;
      while (j < n && src[j] !== "\n") { if (src[j] === "\\") { j += 2; continue; } if (src[j] === "[") inClass = true; else if (src[j] === "]") inClass = false; else if (src[j] === "/" && !inClass) break; j++; }
      out.push({ kind: "re", text: src.slice(i + 1, j), line }); i = j + 1; while (i < n && /[a-z]/.test(src[i])) i++; prev = "v"; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
      const w = src.slice(i, j); out.push({ kind: "id", text: w, line });
      prev = /^(return|typeof|case|in|of|delete|void|throw|new|yield|await|else|do)$/.test(w) ? "(" : "v"; i = j; continue;
    }
    if (part && c === "{") depth++;
    if (part && c === "}") { if (depth === 0) return { i: i + 1, line }; depth--; }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return { i, line };
}
/** The code's strings (a template's text between its ${…} parts; each part is code), names and regular expressions'
 *  bodies, comments left out. Enough of TypeScript for a scan: a `/` after a value is division, anywhere else a regex. */
export function tokens(src: string): Token[] {
  const out: Token[] = [];
  lex(src, 0, 1, false, out);
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
const FORM = /^\s*((IMM|IRM|CIT|EMP)[ _-]?\d{4}(?!\d)[A-Z0-9]*( [A-Z])?( ?(SCH|SCHEDULE|DEP) ?[0-9A-Z]*)?|guide[ _-]?\d{4}(?!\d)[a-z]?)(\.[a-z]{2,4})?\s*$/i;
/** A form number written into a regular expression with its digits ("/IMM ?5257/"); a pattern for any form ("\\d{4}") is not one. */
const FORM_IN_RE = /(IMM|IRM|CIT|EMP)[^A-Za-z0-9]{0,6}\d{4}/i;
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

/** A combination's program code on its own ("vv", "sp", "pnp": two or three letters, from the data), the way a branch
 *  reads it from a key: `key.split(".")[0] === "sp"`, `key.startsWith("vv")`. Longer first parts ("study", "work",
 *  "lmia") are ordinary words. */
export const codesOf = (known: Set<string>) => new Set([...known].map((k) => k.split(".")[0]).filter((h) => /^[a-z]{2,3}$/.test(h)));
/** A regular expression that names a key ("/vv\\.single/") or a program code before a dot ("/^vv\\./"). */
export function keyInRe(body: string, known: Set<string>): boolean {
  const plain = body.replace(/\\(.)/g, "$1");
  if ([...known].some((k) => k.includes(".") && plain.includes(k))) return true;
  return [...codesOf(known)].some((c) => new RegExp(`(^|[^a-z0-9_])${c}\\.`).test(plain));
}

export function scan(files: { file: string; src: string }[], known: Set<string>): Hit[] {
  const hits: Hit[] = [];
  const codes = codesOf(known);
  for (const { file, src } of files) for (const [i, t, list] of tokens(src).map((t, i, list) => [i, t, list] as const)) {
    const at = { file, line: t.line, text: t.text };
    // A module's name ("fs" in `import … from "fs"`, `require("fs")`, `import("fs")`) is not a program code (review r2 m2).
    const before = list[i - 1];
    if (t.kind === "str" && before?.kind === "id" && /^(from|require|import)$/.test(before.text) && !keyLike(t.text, known)) continue;
    if ((t.kind === "str" && (keyLike(t.text, known) || codes.has(t.text))) || (t.kind === "re" && keyInRe(t.text, known))) hits.push({ ...at, kind: "key" });
    else if (PROGRAM.test(t.text.replace(DEPARTMENT, ""))) hits.push({ ...at, kind: "program" });
    else if ((t.kind === "str" && (FORM.test(t.text) || FORM.test(t.text.split("/").pop() ?? ""))) || (t.kind === "re" && FORM_IN_RE.test(t.text))) hits.push({ ...at, kind: "form" });
    else if (t.kind === "str" && SLICE.test(t.text)) hits.push({ ...at, kind: "slice" });
  }
  return hits;
}

const same = (a: { file: string; kind: string; text: string }, b: { file: string; kind: string; text: string }) => a.file === b.file && a.kind === b.kind && a.text === b.text;
/** What the allow-list does not cover, and the entries nothing matches any more (each must go in the PR that removes
 *  its guard, so the list follows the code down). */
export function judge(hits: Hit[], entries: Entry[], files: string[] = []) {
  const lines = entries.filter((e) => e.kind !== "fixture");
  const unexpected: Hit[] = [], seen = new Map<Entry, number>();
  // Review M1: an entry allows its text exactly `count` times (default 1), so a second copy of an allowed key fails.
  for (const h of hits) { const e = lines.find((x) => same(x, h)); const n = e ? (seen.get(e) ?? 0) + 1 : 0; if (e) seen.set(e, n); if (!e || n > (e.count ?? 1)) unexpected.push(h); }
  return { unexpected, stale: [...lines.filter((e) => (seen.get(e) ?? 0) < (e.count ?? 1)), ...entries.filter((e) => e.kind === "fixture" && !files.some((f) => fixtureOf(f, [e])))] };
}
/** Shrink-only: the entries `next` adds over `base`, allows more often, or moves to another row (review m2). */
export const added = (base: Entry[], next: Entry[]) => next.filter((e) => { const b = base.find((x) => same(x, e)); return !b || (e.count ?? 1) > (b.count ?? 1) || e.row !== b.row; });

/** The rows that remove an entry: M3-S1 to M3-S5 (P-425) and the Bake's BK rows (P-452). */
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
const named = (e: Entry) => !!e.guard && (e.guard.startsWith("reader content") ? e.kind !== "fixture" && e.row === "" : ROW.test(e.row) && (e.kind !== "fixture" || e.text.length > 20));
ok("pass: each entry names its guard and the row that removes it (M3-S1 to M3-S5, BK-n; fixtures BK-12); only reader content names none", entries.every(named), entries.filter((e) => !named(e)));
ok("pass: this file's own ALLOW block reads back as JSON (so origin/main's copy is read, never skipped)", JSON.stringify(allowOf(readFileSync(join(ROOT, SELF), "utf8"))) === JSON.stringify(ALLOW));
let baseText: string | null = null;
try { baseText = execFileSync("git", ["show", `origin/main:./${SELF}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { baseText = null; }
if (baseText !== null) {
  const base = allowOf(baseText);
  ok(`pass: nothing added over origin/main's allow-list (${base?.length ?? "unreadable"} there, ${entries.length} here)`, !!base && added(base, entries).length === 0, base ? added(base, entries) : "origin/main's ALLOW block does not read");
} else {
  // Review m1: only "origin/main has no copy yet" is a reason to skip; on GitHub a missing origin/main is a failure.
  let hasMain = false;
  try { execFileSync("git", ["rev-parse", "--verify", "-q", "origin/main"], { cwd: ROOT, stdio: "ignore" }); hasMain = true; } catch { hasMain = false; }
  if (hasMain || !process.env.GITHUB_ACTIONS) console.log(`NOTE  B164: ${hasMain ? "origin/main has no copy of this suite yet (this PR adds it)" : "no origin/main in this copy"}: nothing to compare with yet`);
  else ok("pass: origin/main is there to compare the allow-list with (CI fetches it)", false);
}
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
  // Review on 7b4452f85, M2 and M3: a branch not written as a dotted string, and IRCC's suffixes.
  ["a key in a regular expression", "const vv = (k: string) => /^vv\\./.test(k);", "key"],
  ["a full key in a regular expression", "const a = /sp\\.outside/.test(k);", "key"],
  ["a program code read from a key", `const sp = key.split(".")[0] === "sp";`, "key"],
  ["a program code as a prefix", `if (key.startsWith("pnp")) go();`, "key"],
  ["a form number with IRCC's suffix", `if (f === "IMM5257E") go();`, "form"],
  ["a form's file name", `const f = "imm5257e.pdf";`, "form"],
  ["a form number in a regular expression", "const r = /IMM ?5257/;", "form"],
  ["an escaped key", `const k = "\\u0076v.single";`, "key"],
  ["a key after a brace inside a template's string", "const w = `${x === \"}\" ? \"a\" : \"b\"}`; const k = \"wp.family\";", "key"],
  ["a slice guard's words", `return { why: "Signing is not derived yet for this combination." };`, "slice"],
];
for (const [what, src, kind] of cases) ok(`fail: ${what} is caught (${src})`, caught(src, kind).length === 1, scan([{ file: "x.ts", src }], known));

const caughtIn = (file: string, src: string) => judge(scan([...engine, { file, src }], known), entries).unexpected.filter((h) => h.file === file);
ok("fail: a key in a new API file is caught (P-452)", caughtIn("api/src/new-thing.ts", `if (c.combination_key === "fs.spouse") charge();`).length === 1);
ok("fail: a fixture covers only its own files: a new API file beside them is read", !fixtureOf("api/src/demo-two.ts", entries) && !!fixtureOf("api/src/features/checkpoint/999-new.ts", entries) && !fixtureOf("api/src/features/checkpointer.ts", entries));
ok("fail: a fixture no file matches is stale", judge([], [{ guard: "fixture", file: "api/src/gone.ts", kind: "fixture", text: "x".repeat(30), row: "BK-12" }], all).stale.length === 1);
ok("fail: an entry with no row is refused unless it is reader content", !named({ guard: "G9", file: "api/src/x.ts", kind: "key", text: "sp.outside", row: "" }) && !named({ guard: "reader content", file: "api/src/x.ts", kind: "fixture", text: "x".repeat(30), row: "" }));

ok("fail: an allowed text a second time in its file is caught (review M1: each entry allows its count)", caughtIn("engine/filing-modes.ts", `const again = (k: string) => (k === "vv.single" ? "own" : "shared");`).length === 1);
ok("fail: an entry that allows more often than origin/main's, or names another row, is added (review M1, m2)", added([{ guard: "g", file: "f", kind: "key", text: "t", row: "M3-S1" }], [{ guard: "g", file: "f", kind: "key", text: "t", row: "M3-S1", count: 2 }]).length === 1 && added([{ guard: "g", file: "f", kind: "key", text: "t", row: "M3-S1" }], [{ guard: "g", file: "f", kind: "key", text: "t", row: "BK-10" }]).length === 1);
ok("fail: an entry allowing two copies when one is left is stale", judge([{ file: "f", line: 1, kind: "key", text: "t" }], [{ guard: "g", file: "f", kind: "key", text: "t", row: "M3-S1", count: 2 }]).stale.length === 1);

// Review round 2 (M): a file is read to its last line of code, so nothing after a mis-read string goes unread.
const lastRead = (src: string) => Math.max(0, ...tokens(src).map((t) => t.line));
/** The code after the last line the scan read: only closing brackets and comments may be left there. */
const unreadOf = (src: string) => src.trimEnd().split("\n").slice(lastRead(src)).join("\n").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/[})\];,\s]/g, "");
const unread = engine.filter(({ src }) => unreadOf(src) !== "");
ok(`pass: every file is read to its last line of code (${engine.length} files)`, unread.length === 0, unread.map((f) => `${f.file}: read to line ${lastRead(f.src)}`));
ok("fail: code left after a string that swallows the rest is named", unreadOf("const a = `abc\nconst k = 1;\nexport { a };\n") !== "" && unreadOf("const a = 1;\n}\n// end\n") === "");
ok("fail: a quote inside a regular expression in a template's part does not end the scan (review round 2)", caughtIn("api/src/new-thing.ts", "const s = `${a.replace(/'/g, \"\")}`;\nconst k = \"sp.outside\";").length === 1);
ok("pass: a form number with a space before its language letter is caught (\"IMM 5257 E\")", FORM.test("IMM 5257 E"));
ok("fail: a form's file at the end of a path is caught", caughtIn("api/src/new-thing.ts", `const p = "official-sources/ircc/forms/imm5257e.pdf";`).length === 1);
ok("pass: a module named like a program code is not a key (import … from \"fs\")", caughtIn("api/src/new-thing.ts", `import { readFileSync } from "fs";\nconst m = require("fs");`).length === 0);

// pass: what is not a key, a program or a guard is left alone.
const clean = [
  `// A comment may say vv.single, Visitor visa, IMM 5257 and "not derived yet for this combination".`,
  `/* sp.outside, Study permit */ const a = 1;`,
  `const fact = "person.date_of_birth", c = "case.application_date", f = "expected.people", h = "holder.spouse";`,
  `const host = "www.canada.ca", file = "manifest.json", e = "exempt.under_age";`,
  `const re = /\\b(IMM|IRM) ?\\d{4}\\b/; const n = a / b / c;`,
  `const r = { role: "spouse_or_partner", words: "Changing the principal is not worked out yet for " };`,
  `export function imm5476() { return "IMM form number"; }`,
  `const w = "That is not a form number: a form number looks like IMM 5257.";`,
  `const u = "https://www.canada.ca/en/immigration-refugees-citizenship/services.html", d = "Immigration, Refugees and Citizenship Canada";`,
];
for (const src of clean) ok(`pass: not caught (${src})`, scan([{ file: "x.ts", src }], known).length === 0, scan([{ file: "x.ts", src }], known));
ok("pass: a line number is the string's own line", scan([{ file: "x.ts", src: "const a = 1;\n\nconst k = `x ${y}\n` + \"sp.outside\";" }], known)[0]?.line === 4);

// B170c (analysis §4.2 (7), §4.3 L3; P-319, P-425): our XFA engine's source (packages/xfa-engine/src) and its adapter
// (engine/xfa/, read above with engine/) name no form and no box. The engine is generic XFA code: its code holds no form
// or guide number in any string or regular expression (stricter than the whole-string rule above), and no box path from
// a form's record (samples/xfa-forms.json, its descriptors). Its test folders (__tests__) are left out: they test the
// engine on the real forms they name, and never run in the app. Comments are not code, as above (three of the engine's
// comments cite the form a measurement came from). Its other keys and words are not read: they are XFA's own
// ("app.alert", "event.target"), not ours.
const ENGINE_SRC = join(ROOT, "..", "..", "..", "..", "packages", "xfa-engine", "src");
const FORM_IN_TEXT = /\b(IMM|IRM|CIT|EMP)[ _-]?\d{4}(?!\d)|\bguide[ _-]?\d{4}(?!\d)/i;
/** Every box path a form record names, and each path's dotted parts of two or more names: what a branch on a box reads. */
export function boxNamesOf(records: { descriptor?: Record<string, unknown> }[]): Set<string> {
  const names = new Set<string>();
  for (const r of records) for (const [k, v] of Object.entries(r.descriptor ?? {})) if (typeof v === "string" && k !== "validatedValue") names.add(v);
  return names;
}
/** The engine's (or the adapter's) code that names a form or a box. A one-word box ("Barcodes") counts only as a
 *  whole string; a dotted path counts anywhere in a string or a regular expression. */
export function engineHits(files: { file: string; src: string }[], boxes: Set<string>): Hit[] {
  const hits: Hit[] = [];
  for (const { file, src } of files) for (const t of tokens(src)) {
    if (t.kind === "id") continue;
    const plain = t.kind === "re" ? t.text.replace(/\\(.)/g, "$1") : t.text;
    if (FORM_IN_TEXT.test(plain) || (t.kind === "re" && FORM_IN_RE.test(t.text))) hits.push({ file, line: t.line, kind: "form", text: t.text });
    else if ([...boxes].some((b) => (b.includes(".") ? plain.includes(b) : plain === b))) hits.push({ file, line: t.line, kind: "key", text: t.text });
  }
  return hits;
}
const boxes = boxNamesOf((JSON.parse(readFileSync(join(ROOT, "samples", "xfa-forms.json"), "utf8")) as { forms: { descriptor?: Record<string, unknown> }[] }).forms);
const walkSrc = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === "__tests__" ? [] : walkSrc(p)) : /\.(tsx?|mjs|cjs|js)$/.test(f) && !/\.d\.ts$/.test(f) ? [p] : []; });
const engineSrc = walkSrc(ENGINE_SRC).map((p) => ({ file: relative(join(ROOT, "..", "..", "..", ".."), p), src: readFileSync(p, "utf8") }));
const adapter = engine.filter((f) => f.file.startsWith("engine/xfa/"));
const eh = engineHits([...engineSrc, ...adapter], boxes);
ok(`pass: our XFA engine's source and its adapter name no form and no recorded box in code (${engineSrc.length} engine files outside its test folders, ${adapter.length} adapter files, ${boxes.size} box paths from samples/xfa-forms.json)`, engineSrc.length > 100 && adapter.length >= 2 && boxes.size >= 5 && eh.length === 0, eh);
// Files the scan cannot read to their end (template-heavy script preludes): their whole text, comment lines left out,
// is read for a form number too, so nothing after a mis-read goes unseen.
const commentFree = (src: string) => src.split("\n").filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join("\n");
const tails = engineSrc.filter(({ src }) => unreadOf(src) !== "").filter(({ src }) => FORM_IN_TEXT.test(commentFree(src)) || [...boxes].some((b) => b.includes(".") && commentFree(src).includes(b)));
ok("pass: engine files the scan reads only in part hold no form number or box path anywhere outside comment lines", tails.length === 0, tails.map((f) => f.file));
ok("fail: a form number inside a longer string in the engine is caught", engineHits([{ file: "packages/xfa-engine/src/x.ts", src: `const why = "only for IMM 5257 forms";` }], boxes).length === 1);
ok("fail: a form number in an engine regular expression is caught", engineHits([{ file: "packages/xfa-engine/src/x.ts", src: "const r = /imm ?1295/i;" }], boxes).length === 1);
ok("fail: a recorded box path in the engine or the adapter is caught", engineHits([{ file: "engine/xfa/index.ts", src: `const flag = "${[...boxes].find((b) => b.includes("."))}";` }], boxes).length === 1);
ok("fail: a recorded one-word box as a whole string is caught", engineHits([{ file: "packages/xfa-engine/src/x.ts", src: `const b = "${[...boxes].find((b) => !b.includes("."))}";` }], boxes).length === 1);
ok("pass: comments and XFA's own words are not caught (\"app.alert\", a cited form in a comment)", engineHits([{ file: "packages/xfa-engine/src/x.ts", src: `// measured on IMM5257's Page1\nconst a = "app.alert"; const b = "Barcode";` }], boxes).length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
