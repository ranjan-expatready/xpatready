// No-hard-coding ratchet (P-319; founder 4 Nov ~09:10 IST "Yes, this order": the guard first). Live code must not grow
// its mentions of IRCC form numbers (IMM 5257, IRM 0002, imm5257e.pdf …) or of the samples' combination keys (vv.single,
// wp.family …): forms, combinations and their rules belong in configuration and the library, not in code. Counts, with
// the TypeScript parser, only code text — string, template and regular-expression literals and identifiers — in
// api/src and engine, so a comment (an IRCC citation "// IRCC-F09: IMM 5257 …", an explanation) never counts. Tests,
// fixtures and samples are not live code and are not read. The combination keys are the ones the samples define
// (samples/*.json, any "…key…" property whose value looks like "vv.single").
// Fails when a kind's total rises above tools/no-hard-coding-baseline.json (or, with --against, above the total at that
// commit, so two PRs that each pass alone also pass together in a merge-queue batch, as count-any.mjs). Moving a mention
// between files is not a rise; lower the baseline (--write) when the cleanup removes mentions; never raise it.
//   node studio/tools/no-hard-coding.mjs                   check against the baseline (exit 1 on a rise)
//   node studio/tools/no-hard-coding.mjs --against <ref>   check against the totals at that commit
//   node studio/tools/no-hard-coding.mjs --list            every file with its counts
//   node studio/tools/no-hard-coding.mjs --write           write the baseline from today's counts (refused on a rise)
// Exit: 0 no rise · 1 a rise · 2 could not run.
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import ts from "../node_modules/typescript/lib/typescript.js";

export const AREAS = ["api/src", "engine"];
/** Live code: a .ts file under AREAS that is not a test, a fixture or a sample. */
export const isLive = (rel) => AREAS.some((a) => rel.startsWith(`${a}/`)) && /\.ts$/.test(rel) && !rel.endsWith(".d.ts") &&
  !/(^|\/)(tests?|__tests__|fixtures?|samples?)\//.test(rel) && !/\.(test|spec)\.ts$/.test(rel);
export const FORM = /\b(?:IMM|IRM)[ _-]?\d{4}/gi;

/** The samples' combination keys: every string value of a property whose name contains "key" and that looks like
 *  "vv.single" (prefix of 2–5 letters, a dot, a lower-case name). */
export function sampleKeys(samplesDir) {
  const keys = new Set();
  const walk = (v, name = "") => {
    if (Array.isArray(v)) for (const x of v) walk(x, name);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
    else if (typeof v === "string" && /key/i.test(name) && /^[a-z]{2,5}\.[a-z][a-z_]*$/.test(v)) keys.add(v);
  };
  for (const f of existsSync(samplesDir) ? readdirSync(samplesDir).filter((n) => n.endsWith(".json")) : []) walk(JSON.parse(readFileSync(join(samplesDir, f), "utf8")));
  return [...keys].sort();
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const keyPattern = (keys) => (keys.length ? new RegExp(`(?<![\\w.])(?:${keys.map(esc).join("|")})(?![\\w])`, "g") : null);

/** The mentions in one file's code text (comments are not nodes, so they are never read). */
export function count(file, text, keyRe) {
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const n = { forms: 0, keys: 0 };
  const K = ts.SyntaxKind, TEXT = new Set([K.StringLiteral, K.NoSubstitutionTemplateLiteral, K.TemplateHead, K.TemplateMiddle, K.TemplateTail, K.RegularExpressionLiteral, K.Identifier]);
  const walk = (node) => {
    if (TEXT.has(node.kind)) {
      const t = node.kind === K.RegularExpressionLiteral || node.kind === K.Identifier ? node.getText(src) : node.text;
      n.forms += (t.match(FORM) ?? []).length;
      if (keyRe) n.keys += (t.match(keyRe) ?? []).length;
    }
    ts.forEachChild(node, walk);
  };
  walk(src);
  return n;
}
const sum = (per) => Object.values(per).reduce((s, x) => ({ forms: s.forms + x.forms, keys: s.keys + x.keys }), { forms: 0, keys: 0 });

function main(argv) {
  const at = argv.indexOf("--studio"), STUDIO = at >= 0 ? resolve(argv[at + 1]) : join(import.meta.dirname, "..");   // the self-check points this at a temporary tree
  const BASE = join(STUDIO, "tools", "no-hard-coding-baseline.json");
  const files = (dir) => (existsSync(dir) ? readdirSync(dir) : []).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : [p]; });
  const keyRe = keyPattern(sampleKeys(join(STUDIO, "samples")));
  const per = {};
  for (const f of AREAS.flatMap((a) => files(join(STUDIO, a)))) { const rel = relative(STUDIO, f); if (isLive(rel)) { const c = count(rel, readFileSync(f, "utf8"), keyRe); if (c.forms || c.keys) per[rel] = c; } }
  const now = sum(per);
  if (argv.includes("--list")) for (const [f, c] of Object.entries(per).sort((a, b) => b[1].forms + b[1].keys - a[1].forms - a[1].keys)) console.log(`${String(c.forms).padStart(4)} forms ${String(c.keys).padStart(3)} keys  ${f}`);
  let was, wasPer = {}, from;
  const ref = argv.indexOf("--against");
  if (ref >= 0) {
    const commit = argv[ref + 1];
    if (!commit) throw new Error("--against wants a commit");
    const git = (...a) => execFileSync("git", a, { cwd: STUDIO, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
    const pre = git("rev-parse", "--show-prefix").trim();
    // The keys are read at the head: a PR that adds a sample key and code that names it counts the code as a rise.
    for (const f of git("ls-tree", "-r", "--name-only", commit, "--", ...AREAS).split("\n").filter(isLive)) { const c = count(f, git("show", `${commit}:${pre}${f}`), keyRe); if (c.forms || c.keys) wasPer[f] = c; }
    was = sum(wasPer); from = `at ${/^[0-9a-f]{12,}$/.test(commit) ? commit.slice(0, 9) : commit}`;
  } else {
    if (!existsSync(BASE) && !argv.includes("--write")) throw new Error(`no baseline ${relative(STUDIO, BASE)}: write it with --write`);
    const b = existsSync(BASE) ? JSON.parse(readFileSync(BASE, "utf8")) : { total: now, files: per };   // the first --write
    was = b.total; wasPer = b.files ?? {}; from = "baseline";
  }
  const rose = ["forms", "keys"].filter((k) => now[k] > was[k]);
  const grew = Object.entries(per).filter(([f, c]) => c.forms > (wasPer[f]?.forms ?? 0) || c.keys > (wasPer[f]?.keys ?? 0)).map(([f, c]) => `${f} (forms ${wasPer[f]?.forms ?? 0} → ${c.forms}, keys ${wasPer[f]?.keys ?? 0} → ${c.keys})`);
  if (argv.includes("--write")) {
    if (rose.length) throw new Error(`refused: the counts rose (${rose.join(", ")}); a baseline is only lowered`);
    writeFileSync(BASE, JSON.stringify({ note: "IRCC form numbers and sample combination keys in live code (api/src, engine; comments, tests, fixtures and samples not counted), by tools/no-hard-coding.mjs (P-319). Lower it as the cleanup moves them into configuration; never raise it.", total: now, files: Object.fromEntries(Object.entries(per).sort()) }, null, 2) + "\n");
    console.log(`no-hard-coding: baseline written: ${now.forms} form numbers, ${now.keys} combination keys in ${Object.keys(per).length} files.`);
    return 0;
  }
  if (rose.length) {
    console.log(`no-hard-coding FAILED: ${rose.map((k) => `${k === "forms" ? "IRCC form numbers" : "combination keys"} rose to ${now[k]} (${from} ${was[k]})`).join("; ")} in live code. Put the form or combination in configuration or the library (or the mention in a comment, a test or a sample), not in code.`);
    for (const g of grew) console.log(`  more in ${g}`);
    return 1;
  }
  const lower = ["forms", "keys"].filter((k) => now[k] < was[k]);
  console.log(`no-hard-coding: ${now.forms} IRCC form numbers, ${now.keys} combination keys in live code (${from} ${was.forms} and ${was.keys}).${lower.length && ref < 0 ? " Lower the baseline: node studio/tools/no-hard-coding.mjs --write" : ""}`);
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error(`no-hard-coding could not run: ${e.message.split("\n")[0]}`); process.exit(2); }
}
