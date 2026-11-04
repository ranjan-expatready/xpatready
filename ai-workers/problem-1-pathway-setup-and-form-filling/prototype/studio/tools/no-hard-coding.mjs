// No-hard-coding ratchet (P-319; founder 4 Nov ~09:10 IST "Yes, this order": the guard first). Live code must not grow
// its mentions of IRCC form numbers (IMM 5257, IRM 0002, imm5257e.pdf, formImm5645 …) or of the samples' combination
// keys (vv.single, wp.family …): forms, combinations and their rules belong in configuration and the library, not in code.
//   Live code: every code or JSON file under api/src, engine and contracts (.ts .tsx .mts .cts .js .mjs .cjs .json, .d.ts
//   too); the tests, fixtures and samples live outside those folders and are not read. In code only the code text counts
//   (string, template and regular-expression literals and identifiers, read with the TypeScript parser), so a comment —
//   an IRCC citation "// IRCC-F09: IMM 5257 …", an explanation — never counts; in JSON every string.
//   Combination keys: each `setup.key` in samples/*.json, at the head and (with --against) at the base, so renaming or
//   removing a sample key in the same PR never stops guarding it.
//   A rise: any one form number (IMM 5257 and imm5257e count as one value) or key named more often than before. A
//   mention moved between files is no rise; dropping IMM 5257 to add IMM 5645 is one.
// CI's gate is --against <base commit> (as count-any.mjs, so two PRs that each pass alone also pass together in a merge
// batch). tools/no-hard-coding-baseline.json is the record per file, for the cleanup: --write lowers it and never
// raises it (with --against it refuses).
//   node studio/tools/no-hard-coding.mjs --against <ref>   check against that commit (exit 1 on a rise)
//   node studio/tools/no-hard-coding.mjs                   check against the baseline
//   node studio/tools/no-hard-coding.mjs --list            every file with its counts
//   node studio/tools/no-hard-coding.mjs --write           write the baseline from today's counts (refused on a rise)
// Exit: 0 no rise · 1 a rise · 2 could not run (a missing folder, a file the parser cannot read, a bad baseline or ref).
import { readdirSync, readFileSync, lstatSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

let ts = null;
try { ts = (await import("../node_modules/typescript/lib/typescript.js")).default; } catch { /* main() says could not run */ }

export const AREAS = ["api/src", "engine", "contracts"];
const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/, JSONF = /\.json$/, PLAIN = /\.(ya?ml|txt|html?|csv|xml)$/;   // PLAIN: read as plain text
/** Live code: a code, JSON or data-text file under AREAS (notes in .md are not code). */
export const isLive = (rel) => AREAS.some((a) => rel.startsWith(`${a}/`)) && (CODE.test(rel) || JSONF.test(rel) || PLAIN.test(rel));
// IMM or IRM, at most two separators of any kind (space, no-break space, dashes, dot, slash, underscore), four digits.
// Not after a letter, so "Law Firm 2024" and "confirm_2025" are not IRM numbers; a capital I after a lower-case letter,
// a digit or "_" starts one, so names like formImm5257 and rowsForIMM5257 count (#945 round 2 m1).
export const FORM = /(?:(?<![A-Za-z])[Ii](?:mm|MM|rm|RM)|(?<=[a-z0-9_$])I(?:mm|MM|rm|RM))[\s\u00a0\u2010-\u2015._/-]{0,2}(\d{4})/g;
const formValue = (m) => `${m[0].slice(0, 3).toUpperCase()} ${m[1]}`;

/** The samples' combination keys: every `setup.key` (a row that becomes a combination when the sample loads). */
export function keysOf(jsonTexts) {
  const keys = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") { if (typeof v.setup?.key === "string" && v.setup.key) keys.add(v.setup.key); Object.values(v).forEach(walk); }
  };
  for (const t of jsonTexts) walk(JSON.parse(t));
  return keys;
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const keyPattern = (keys) => ([...keys].length ? new RegExp(`(?<![\\w.])(?:${[...keys].map(esc).join("|")})(?![\\w])`, "gi") : null);

/** The mentions in one file, by value: { forms: {"IMM 5257": n}, keys: {"vv.single": n} }. */
export function count(file, text, keyRe) {
  if (!ts) throw new Error("the TypeScript parser is missing (studio/node_modules/typescript): run the setup first");
  const n = { forms: {}, keys: {} };
  const add = (t) => {
    for (const m of t.matchAll(FORM)) n.forms[formValue(m)] = (n.forms[formValue(m)] ?? 0) + 1;
    if (keyRe) for (const m of t.matchAll(keyRe)) { const k = m[0].toLowerCase(); n.keys[k] = (n.keys[k] ?? 0) + 1; }
  };
  if (PLAIN.test(file)) { add(text); return n; }
  if (JSONF.test(file)) {
    let j; try { j = JSON.parse(text); } catch (e) { throw new Error(`${file} is not JSON the guard can read: ${e.message}`); }
    const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { add(k); walk(x); } else if (typeof v === "string") add(v); };
    walk(j);
    return n;
  }
  const kind = /\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.jsx$/.test(file) ? ts.ScriptKind.JSX : /\.[mc]?js$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  // A file the parser cannot read (an unclosed comment hides the rest of it) is "could not run", never a pass.
  if (src.parseDiagnostics?.length) throw new Error(`${file} does not parse (${ts.flattenDiagnosticMessageText(src.parseDiagnostics[0].messageText, " ")}): the guard cannot read it`);
  const K = ts.SyntaxKind, TEXT = new Set([K.StringLiteral, K.NoSubstitutionTemplateLiteral, K.TemplateHead, K.TemplateMiddle, K.TemplateTail, K.RegularExpressionLiteral, K.Identifier, K.PrivateIdentifier, K.JsxText]);
  const walk = (node) => {
    if (TEXT.has(node.kind)) add(node.kind === K.Identifier || node.kind === K.PrivateIdentifier ? node.text : node.kind === K.RegularExpressionLiteral || node.kind === K.JsxText ? node.getText(src) : node.text);
    ts.forEachChild(node, walk);
  };
  walk(src);
  return n;
}
const total = (per) => {
  const t = { forms: {}, keys: {} };
  for (const c of Object.values(per)) for (const k of ["forms", "keys"]) for (const [v, x] of Object.entries(c[k])) t[k][v] = (t[k][v] ?? 0) + x;
  return t;
};
const sumOf = (m) => Object.values(m).reduce((s, x) => s + x, 0);
const empty = (c) => !sumOf(c.forms) && !sumOf(c.keys);

/** The command (exported so the self-check runs it in-process, without a parser load per case). Returns the exit code;
 *  throws when it could not run. */
export function main(argv) {
  if (!ts) throw new Error("the TypeScript parser is missing (studio/node_modules/typescript): run the setup first");
  const at = argv.indexOf("--studio"), STUDIO = at >= 0 ? resolve(argv[at + 1]) : join(import.meta.dirname, "..");   // the self-check points this at a temporary tree
  const BASE = join(STUDIO, "tools", "no-hard-coding-baseline.json");
  // Only the known options: a typo or "--against=<sha>" would otherwise fall back to the baseline a PR can edit (m6).
  for (let i = 0; i < argv.length; i++) { if (argv[i] === "--against" || argv[i] === "--studio") i++; else if (argv[i] !== "--list" && argv[i] !== "--write") throw new Error(`unknown option ${argv[i]} (want --against <commit>, --list or --write)`); }
  const ref = argv.indexOf("--against"), commit = ref >= 0 ? argv[ref + 1] : null;
  if (ref >= 0 && !commit) throw new Error("--against wants a commit");
  if (argv.includes("--write") && ref >= 0) throw new Error("--write compares with the stored baseline only; drop --against");
  for (const a of AREAS) if (!existsSync(join(STUDIO, a))) throw new Error(`${a} is missing: the guard would check nothing there (moved?)`);
  // A symbolic link is skipped here as at the base (git mode 120000): its text is a path, not code (round 2 m2).
  const files = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n), st = lstatSync(p); return st.isSymbolicLink() ? [] : st.isDirectory() ? files(p) : [p]; });
  const samples = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith(".json")).map((n) => readFileSync(join(dir, n), "utf8")) : []);
  const git = (...a) => execFileSync("git", a, { cwd: STUDIO, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
  const baseText = new Map();
  if (commit) {
    try { git("rev-parse", "--verify", "--quiet", `${commit}^{commit}`); } catch { throw new Error(`--against ${commit} is not a commit`); }
    const pre = git("rev-parse", "--show-prefix").trim();
    // -z: a name with non-ASCII letters comes back as it is, not C-quoted (round 2 m2); links (120000) are skipped.
    const want = git("ls-tree", "-r", "-z", commit, "--", ...AREAS, "samples").split("\0").filter(Boolean).map((l) => { const tab = l.indexOf("\t"); return { mode: l.slice(0, 6), f: l.slice(tab + 1) }; })
      .filter(({ mode, f }) => mode !== "120000" && (isLive(f) || (f.startsWith("samples/") && f.endsWith(".json")))).map(({ f }) => f);
    // Every file at the base in one git call (one `git show` per file grows with the tree).
    const r = spawnSync("git", ["cat-file", "--batch"], { cwd: STUDIO, input: want.map((f) => `${commit}:${pre}${f}\n`).join(""), maxBuffer: 1 << 29 });
    if (r.status !== 0) throw new Error(`cannot read the files at ${commit}: ${String(r.stderr).trim()}`);
    const buf = r.stdout;
    let i = 0;
    for (const f of want) {
      const nl = buf.indexOf(10, i), head = buf.subarray(i, nl).toString().split(" ");
      if (head[1] !== "blob") throw new Error(`cannot read ${f} at ${commit}`);
      const len = Number(head[2]);
      baseText.set(f, buf.subarray(nl + 1, nl + 1 + len).toString("utf8"));
      i = nl + 1 + len + 1;
    }
  }
  const baseSamples = [...baseText].filter(([f]) => f.startsWith("samples/")).map(([, t]) => t);
  const keys = new Set([...keysOf(samples(join(STUDIO, "samples"))), ...keysOf(baseSamples)]);
  const keyRe = keyPattern(keys);
  const per = {};
  for (const f of AREAS.flatMap((a) => files(join(STUDIO, a)))) { const rel = relative(STUDIO, f); if (isLive(rel)) { const c = count(rel, readFileSync(f, "utf8"), keyRe); if (!empty(c)) per[rel] = c; } }
  const now = total(per);
  if (argv.includes("--list")) for (const [f, c] of Object.entries(per).sort((a, b) => sumOf(b[1].forms) + sumOf(b[1].keys) - sumOf(a[1].forms) - sumOf(a[1].keys))) console.log(`${String(sumOf(c.forms)).padStart(4)} forms ${String(sumOf(c.keys)).padStart(3)} keys  ${f}`);
  let wasPer = {}, from = "baseline";
  if (commit) {
    for (const [f, t] of baseText) if (isLive(f)) { const c = count(f, t, keyRe); if (!empty(c)) wasPer[f] = c; }
    from = `at ${/^[0-9a-f]{12,}$/.test(commit) ? commit.slice(0, 9) : commit}`;
  } else if (existsSync(BASE)) {
    let b; try { b = JSON.parse(readFileSync(BASE, "utf8")); } catch (e) { throw new Error(`the baseline does not parse: ${e.message}`); }
    const good = (m) => m && typeof m === "object" && Object.values(m).every((x) => Number.isInteger(x) && x >= 0);
    if (!b?.files || typeof b.files !== "object" || !Object.values(b.files).every((c) => good(c?.forms) && good(c?.keys))) throw new Error("the baseline is not in the guard's shape (files → {forms, keys} of counts): rewrite it with --write");
    wasPer = b.files;
  } else if (!argv.includes("--write")) throw new Error(`no baseline ${relative(STUDIO, BASE)}: write it with --write`);
  else wasPer = per;   // the first --write
  const was = total(wasPer);
  // No key at all: the samples moved or changed shape, and the key half of the guard would check nothing (round 2 m5).
  if (!keys.size) throw new Error("no combination key read from samples/*.json (setup.key): could not run");
  const rise = [];
  for (const k of ["forms", "keys"]) for (const [v, x] of Object.entries(now[k])) if (x > (was[k][v] ?? 0)) rise.push(`${v} ${was[k][v] ?? 0} → ${x}`);
  const grew = Object.entries(per).filter(([f, c]) => ["forms", "keys"].some((k) => Object.entries(c[k]).some(([v, x]) => x > (wasPer[f]?.[k]?.[v] ?? 0)))).map(([f]) => f);
  const line = `${sumOf(now.forms)} IRCC form numbers, ${sumOf(now.keys)} combination keys in live code (${from} ${sumOf(was.forms)} and ${sumOf(was.keys)})`;
  if (argv.includes("--write")) {
    if (rise.length) throw new Error(`refused: named more often than in the baseline: ${rise.join(", ")}; a baseline is only lowered`);
    writeFileSync(BASE, JSON.stringify({ note: "IRCC form numbers and sample combination keys in live code (api/src, engine, contracts; comments not counted), by tools/no-hard-coding.mjs (P-319). The record per file for the cleanup; CI's gate is --against the base commit. Lower it with --write; never raise it.", total: { forms: sumOf(now.forms), keys: sumOf(now.keys) }, files: Object.fromEntries(Object.entries(per).sort()) }, null, 2) + "\n");
    console.log(`no-hard-coding: baseline written: ${line}, ${Object.keys(per).length} files.`);
    return 0;
  }
  if (rise.length) {
    console.log(`no-hard-coding FAILED: named more often than ${from}: ${rise.join(", ")}. Put the form or combination in configuration or the library (or the mention in a comment, a test or a sample), not in code.`);
    for (const g of grew) console.log(`  more in ${g}`);
    return 1;
  }
  console.log(`no-hard-coding: ${line}.${grew.length ? ` Moved into: ${grew.join(", ")}.` : ""}${!commit && sumOf(now.forms) + sumOf(now.keys) < sumOf(was.forms) + sumOf(was.keys) ? " Lower the baseline: node studio/tools/no-hard-coding.mjs --write" : ""}`);
  return 0;
}
// Run as a command: compare real paths, so a path through a symbolic link (macOS /tmp) still runs it (round 2 M1).
const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(import.meta.filename)) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error(`no-hard-coding could not run: ${String(e?.message ?? e).split("\n")[0]}`); process.exit(2); }
}
