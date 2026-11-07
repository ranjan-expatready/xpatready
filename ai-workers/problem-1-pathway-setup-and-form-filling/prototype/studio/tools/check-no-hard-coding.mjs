#!/usr/bin/env node
// no-hard-coding.mjs both ways (P-319): an added form number or combination key in live code fails, a removed or moved
// one passes, comments never count, and every way the review and the breaker found round it is closed. Works on a
// temporary tree and git repository; reads no database and runs no server, US$0.
//   node studio/tools/check-no-hard-coding.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { count, isLive, keyPattern, keysOf, main } from "./no-hard-coding.mjs";

let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
const K = keyPattern(new Set(["vv.single", "wp.family"]));
const n = (text, file = "x.ts") => { const c = count(file, text, K); const s = (m) => Object.values(m).reduce((a, b) => a + b, 0); return { forms: s(c.forms), keys: s(c.keys), c }; };

ok("a form number in a string counts, in each spelling (IMM 5257, IRM-0002, imm5257e.pdf, IMM_5645, IMM.5476, IMM/1294, no-break space, en dash, two spaces)",
  n(`const a = ["IMM 5257", "IRM-0002", "imm5257e.pdf", "IMM_5645", "IMM.5476", "IMM/1294", "IMM 5707", "IMM–5709", "IMM  5710"];`).forms === 9);
ok("a form number in a template, a regular expression, a name (camelCase too), a private name or JSX counts",
  n("const t = `the ${x} IMM 5707`; const r = /IMM 5476/; const imm5645Rows = 1; const formImm5257 = 2; const _IMM5409 = 3; class A { #imm1294 = 1 }").forms === 6 && n("const e = <p>IMM 5257</p>;", "x.tsx").forms === 1);
ok("words that are not form numbers never count (Law Firm 2024, confirm_2025, affirm 1999, firm/1234, swimm 1234; #945 round 2 m1)", n(`const a = ["Maple Law Firm 2024", "confirm_2025", "affirm 1999", "firm/1234", "swimm 1234", "Confirm-2027"]; const confirm2026 = 1;`).forms === 0 && n(`const rowsForIMM5257 = 1; const e = "eIMM 5669";`).forms === 2);
ok("one form number in two spellings is one value (IMM 5257 and imm5257e)", JSON.stringify(n(`const a = ["IMM 5257", "imm5257e.pdf"];`).c.forms) === JSON.stringify({ "IMM 5257": 2 }));
ok("a form number in a comment never counts (an IRCC citation, an explanation)", n("// IRCC-F09: IMM 5257 (05-2026)\n/* IMM 5707 and IMM 5645 */\nconst a = 1; /** IRM 0002 */").forms === 0);
ok("a combination key in a string counts; a longer name or another dotted word does not", n(`const k = "vv.single"; const w = 'wp.family'; const n = "vv.singles"; const m = "x.vv.single"; const o = "sp.student";`).keys === 2);
ok("a key in a comment never counts", n("// on vv.single and wp.family\nconst a = 1;").keys === 0);
ok("JSON under the folders is read: every string, keys and values", n(`{"forms": ["IMM 5257"], "IMM 5645": {"combo": "vv.single"}}`, "api/src/x.json").forms === 2 && n(`{"a": "vv.single"}`, "api/src/x.json").keys === 1);
ok(".jsx is read like .ts, and data text (.yaml, .txt, .html) is read whole", n(`export const A = () => <b>IMM 5257</b>;`, "api/src/x.jsx").forms === 1 && n(`form: IMM 5257\n# IMM 5645`, "api/src/x.yaml").forms === 2 && !isLive("api/src/notes.md"));
ok(".js, .mjs and .tsx files are read like .ts", n(`export const a = "IMM 5257";`, "api/src/x.mjs").forms === 1 && n(`export const a = "IMM 5257";`, "engine/x.js").forms === 1 && n(`export const A = () => <b>{"IMM 5257"}</b>;`, "api/src/x.tsx").forms === 1);
let threw = ""; try { count("x.ts", "const a = 1; /* never closed IMM 5257"); } catch (e) { threw = e.message; }
ok("a file the parser cannot read (an unclosed comment) is could-not-run, never a pass", /does not parse/.test(threw), threw);
ok("live code is every code or JSON file under api/src, engine and contracts, in any folder", ["api/src/demo.ts", "engine/runtime/team.ts", "contracts/forms.ts", "api/src/tests/c.ts", "api/src/samples/x.ts", "engine/fixture/f.ts", "api/src/x.spec.ts", "api/src/x.d.ts", "api/src/x.mts", "contracts/x.json"].every(isLive) && !["web/src/x.ts", "tests/x.ts", "samples/x.json", "api/src/notes.md"].some(isLive));
ok("the keys are the samples' setup.key values only (a fact key or a pathway key is not one)", [...keysOf([JSON.stringify({ programs: [{ key: "retail.temporary_residence", setup: { key: "vv.single" } }, { setup: { key: "wp.family" } }], facts: [{ factKey: "case.intended_stay_to" }] })])].join() === "vv.single,wp.family");

// The command, on a temporary tree and git repository.
const T = mkdtempSync(join(tmpdir(), "no-hard-coding-"));
const put = (p, s) => { mkdirSync(dirname(join(T, p)), { recursive: true }); writeFileSync(join(T, p), s); };
const SAMPLE = (k1 = "vv.single", k2 = "wp.family") => JSON.stringify({ programs: [{ key: "retail.x", setup: { key: k1 } }, { setup: { key: k2 } }] });
mkdirSync(join(T, "tools"));
put("samples/programs.json", SAMPLE());
put("api/src/a.ts", `export const f = "IMM 5257"; // IMM 5707\nexport const k = "vv.single";\n`);
put("engine/b.ts", `export const g = ["IRM 0002"];\n`);
put("contracts/c.ts", `export const h = "IMM 5645";\n`);
const git = (...a) => spawnSync("git", a, { cwd: T, encoding: "utf8" });
const commit = (m) => { git("add", "-A"); git("-c", "user.email=x@y", "-c", "user.name=x", "commit", "-q", "--allow-empty", "-m", m); return git("rev-parse", "HEAD").stdout.trim(); };
git("init", "-q");
// The command in-process (one parser load for every case; the real tree below runs it as CI does, as a process).
const run = (...a) => {
  const out = [], [log, err] = [console.log, console.error];
  console.log = console.error = (x) => out.push(String(x));
  let code;
  try { code = main(["--studio", T, ...a]); } catch (e) { code = 2; out.push(`no-hard-coding could not run: ${e.message}`); } finally { console.log = log; console.error = err; }
  return { code, out: out.join("\n") };
};
const reset = () => { git("reset", "-q", "--hard", base); git("clean", "-qfd"); };

let r = run();
ok("no baseline: could not run (exit 2), never a pass", r.code === 2 && /no baseline/.test(r.out), r);
r = run("--write");
ok("--write writes the baseline (3 form numbers with contracts, 1 key; the comment is not counted)", r.code === 0 && /3 IRCC form numbers, 1 combination keys/.test(r.out), r);
const base = commit("base");
r = run("--against", base);
ok("unchanged: passes against the base commit", r.code === 0, r);
put("engine/d.ts", `export const x = "IMM 1294";\n`);
r = run("--against", base);
ok("an added form number fails (exit 1), naming the value and the file", r.code === 1 && /IMM 1294 0 → 1/.test(r.out) && /more in engine\/d\.ts/.test(r.out), r);
r = run();
ok("an added form number fails against the baseline too", r.code === 1, r);
r = run("--write");
ok("--write refuses to raise the baseline", r.code === 2 && /refused/.test(r.out), r);
reset(); put("engine/b.ts", `export const g = [];\n`);
r = run("--write");
ok("--write lowers the baseline when a mention is removed", r.code === 0 && /2 IRCC form numbers/.test(r.out) && JSON.parse(readFileSync(join(T, "tools/no-hard-coding-baseline.json"), "utf8")).total.forms === 2, r);
reset();
r = run("--write", "--against", base);
ok("--write with --against is refused (it compares with the stored baseline only)", r.code === 2 && /drop --against/.test(r.out), r);
reset(); put("engine/b.ts", `export const g = [];\n`); put("engine/d.ts", `export const x = "IMM 1294";\n`);
r = run("--against", base);
ok("a swap in one kind fails: dropping IRM 0002 to add IMM 1294 is a rise of IMM 1294", r.code === 1 && /IMM 1294 0 → 1/.test(r.out), r);
reset(); put("engine/b.ts", `export const g = [];\n`); put("api/src/moved.ts", `export const g = ["IRM 0002"];\n`);
r = run("--against", base);
ok("a mention moved to another file is no rise, and is said", r.code === 0 && /Moved into: api\/src\/moved\.ts/.test(r.out), r);
reset(); put("api/src/a.ts", `export const f = "IMM 5257"; export const k = "vv.single"; export const k2 = "wp.family";\n`);
r = run("--against", base);
ok("an added combination key fails (exit 1)", r.code === 1 && /wp\.family 0 → 1/.test(r.out), r);
reset(); put("api/src/a.ts", `export const f = "IMM 5257"; // vv.single moved to configuration\n`);
r = run("--against", base);
ok("a removed key passes", r.code === 0, r);
r = run();
ok("lower than the baseline passes and says to lower it", r.code === 0 && /Lower the baseline/.test(r.out), r);
reset(); put("samples/programs.json", SAMPLE("vv-single")); put("api/src/a.ts", `export const f = "IMM 5257";\nexport const k = ["vv.single", "vv.single"];\n`);
r = run("--against", base);
ok("a sample key renamed in the same PR is still guarded (keys from the base and the head)", r.code === 1 && /vv\.single 1 → 2/.test(r.out), r);
reset(); put("samples/programs.json", SAMPLE("vv.single", "sp.student")); put("api/src/a.ts", `export const f = "IMM 5257"; export const k = "vv.single"; export const s = "sp.student";\n`);
r = run("--against", base);
ok("a key added to the samples in the same PR, and named in code, fails", r.code === 1 && /sp\.student 0 → 1/.test(r.out), r);
reset(); put("samples/programs.json", JSON.stringify({ programs: [{ combo: { key: "vv.single" } }] }));
r = run();
ok("no combination key read while the baseline names keys: could not run (exit 2)", r.code === 2 && /no combination key/.test(r.out), r);
reset(); put("api/src/samples/x.ts", `export const a = "IMM 9999";\n`); put("api/src/x.json", `{"a": "IMM 8888"}\n`); put("api/src/y.mjs", `export const b = "IMM 7777";\n`);
r = run("--against", base);
ok("a sample folder, a JSON file or an .mjs file under the folders is live code (a rise)", r.code === 1 && /IMM 9999/.test(r.out) && /IMM 8888/.test(r.out) && /IMM 7777/.test(r.out), r);
reset(); writeFileSync(join(T, "tools/no-hard-coding-baseline.json"), JSON.stringify({ total: {}, files: { "api/src/a.ts": { forms: { "IMM 5257": "1x" }, keys: {} } } }));
r = run();
ok("a baseline not in the guard's shape: could not run (exit 2)", r.code === 2 && /not in the guard's shape/.test(r.out), r);
reset(); rmSync(join(T, "contracts"), { recursive: true });
r = run("--against", base);
ok("a missing folder (moved code): could not run (exit 2), never a pass on nothing", r.code === 2 && /contracts is missing/.test(r.out), r);
reset();
for (const bad of ["0000000", "HEAD:api"]) { r = run("--against", bad); ok(`--against ${bad}: could not run (exit 2)`, r.code === 2, r); }
r = run("--against=" + base);
ok("an unknown option (\"--against=<sha>\", a typo) is could-not-run (exit 2), never a fall-back to the baseline (round 2 m6)", r.code === 2 && /unknown option/.test(r.out), r);
put("samples/programs.json", JSON.stringify({ programs: [{ combo: { key: "vv.single" } }] }));
r = run();
ok("no combination key read from the samples (none at the head, none at the base): could not run (exit 2; round 2 m5)", r.code === 2 && /no combination key/.test(r.out), r);
reset();
r = run("--against");
ok("--against with no commit (an empty base sha in CI): could not run (exit 2)", r.code === 2, r);
// Round 2 M1: run through a path with a symbolic link in it (macOS /tmp), the command still runs and still fails a rise.
put("engine/d.ts", `export const x = "IMM 1294";\n`);
const link = join(T, "tool-link"); mkdirSync(link); symlinkSync(join(import.meta.dirname, "no-hard-coding.mjs"), join(link, "no-hard-coding.mjs"));
const viaLink = spawnSync(process.execPath, [join(link, "no-hard-coding.mjs"), "--studio", T, "--against", base], { encoding: "utf8" });
ok("run through a symbolic link, the command still runs and fails a rise (exit 1, never a silent 0)", viaLink.status === 1 && /IMM 1294 0 → 1/.test(viaLink.stdout), { code: viaLink.status, out: viaLink.stdout + viaLink.stderr });
reset();
rmSync(T, { recursive: true, force: true });

// The real tree today: never could-not-run; a rise against the stored baseline is a warning here (CI's gate is
// --against the base commit, which a samples-only PR may pass while the stored record lags).
r = spawnSync(process.execPath, [join(import.meta.dirname, "no-hard-coding.mjs")], { encoding: "utf8" });
ok(`the real tree reads (${(r.stdout.match(/\d+ IRCC form numbers, \d+ combination keys/) ?? ["?"])[0]})`, r.status === 0 || r.status === 1, r.stdout + r.stderr);
if (r.status === 1) console.log(`WARN  the real tree is above the stored baseline: ${r.stdout.trim().split("\n")[0]}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
