#!/usr/bin/env node
// no-hard-coding.mjs both ways (P-319): an added form number or combination key in live code fails, a removed one
// passes, and comments, tests, fixtures and samples are never counted. Works on a temporary tree and git repository;
// reads no database and runs no server, US$0.
//   node studio/tools/check-no-hard-coding.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { count, isLive, keyPattern, sampleKeys } from "./no-hard-coding.mjs";

let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
const K = keyPattern(["vv.single", "wp.family"]);
const c = (text) => count("x.ts", text, K);

ok("a form number in a string counts, in each spelling (IMM 5257, IRM-0002, imm5257e.pdf, IMM_5645)", c(`const a = ["IMM 5257", "IRM-0002", "imm5257e.pdf", "IMM_5645"];`).forms === 4);
ok("a form number in a template, a regular expression or a name counts", c("const t = `the ${x} IMM 5707`; const r = /IMM 5476/; const imm5645Rows = 1;").forms === 3);
ok("a form number in a comment never counts (an IRCC citation, an explanation)", c("// IRCC-F09: IMM 5257 (05-2026)\n/* IMM 5707 and IMM 5645 */\nconst a = 1; /** IRM 0002 */").forms === 0);
ok("a combination key in a string counts; a longer name or another dotted word does not", c(`const k = "vv.single"; const w = 'wp.family'; const n = "vv.singles"; const m = "x.vv.single"; const o = "sp.student";`).keys === 2);
ok("a key in a comment never counts", c("// on vv.single and wp.family\nconst a = 1;").keys === 0);
ok("live code is api/src and engine; tests, fixtures, samples and .d.ts are not", isLive("api/src/demo.ts") && isLive("engine/runtime/team.ts") && ![
  "api/src/demo.test.ts", "engine/x.spec.ts", "api/src/fixtures/a.ts", "engine/samples/b.ts", "api/src/tests/c.ts", "web/src/x.ts", "tests/x.ts", "api/src/x.d.ts", "api/src/x.js"].some(isLive));

const T = mkdtempSync(join(tmpdir(), "no-hard-coding-"));
const put = (p, s) => { mkdirSync(join(T, p, ".."), { recursive: true }); writeFileSync(join(T, p), s); };
mkdirSync(join(T, "tools"));
put("samples/programs.json", JSON.stringify({ combinations: [{ combinationKey: "vv.single", label: "Visitor visa" }, { key: "wp.family" }, { name: "not.akey" }, { key: "Not a key" }] }));
ok("the keys are the samples' \"…key…\" values that look like a combination key", sampleKeys(join(T, "samples")).join() === "vv.single,wp.family", sampleKeys(join(T, "samples")));
put("api/src/a.ts", `export const f = "IMM 5257"; // IMM 5707\nexport const k = "vv.single";\n`);
put("engine/b.ts", `export const g = ["IRM 0002"];\n`);
put("api/src/a.test.ts", `const t = "IMM 9999 vv.single";\n`);
const git = (...a) => spawnSync("git", a, { cwd: T, encoding: "utf8" });
git("init", "-q"); git("-c", "user.email=x@y", "-c", "user.name=x", "commit", "-q", "--allow-empty", "-m", "root");
git("add", "-A"); git("-c", "user.email=x@y", "-c", "user.name=x", "commit", "-q", "-m", "base");
const base = git("rev-parse", "HEAD").stdout.trim();
const run = (...a) => { const r = spawnSync(process.execPath, [join(import.meta.dirname, "no-hard-coding.mjs"), "--studio", T, ...a], { encoding: "utf8" }); return { code: r.status, out: r.stdout + r.stderr }; };

let r = run();
ok("no baseline: could not run (exit 2), never a pass", r.code === 2 && /no baseline/.test(r.out), r);
r = run("--write");
ok("--write writes the baseline (2 form numbers, 1 key: the comment and the test are not counted)", r.code === 0 && /2 form numbers, 1 combination keys in 2 files/.test(r.out), r);
r = run();
ok("unchanged: passes against the baseline", r.code === 0, r);
put("engine/c.ts", `export const h = "IMM 5645";\n`);
r = run();
ok("an added form number fails against the baseline (exit 1), naming the file", r.code === 1 && /IRCC form numbers rose to 3/.test(r.out) && /more in engine\/c\.ts/.test(r.out), r);
r = run("--against", base);
ok("an added form number fails against the base commit (exit 1)", r.code === 1 && /rose to 3 \(at [0-9a-f]{9} 2\)/.test(r.out), r);
r = run("--write");
ok("--write refuses to raise the baseline", r.code === 2 && /refused/.test(r.out), r);
rmSync(join(T, "engine/c.ts"));
put("api/src/a.ts", `export const f = "IMM 5257";\nexport const k = "vv.single"; export const k2 = "wp.family";\n`);
r = run("--against", base);
ok("an added combination key fails (exit 1)", r.code === 1 && /combination keys rose to 2/.test(r.out), r);
put("api/src/a.ts", `export const f = "IMM 5257"; // vv.single moved to configuration\n`);
r = run("--against", base);
ok("a removed key passes", r.code === 0, r);
r = run();
ok("lower than the baseline passes and says to lower it", r.code === 0 && /Lower the baseline/.test(r.out), r);
put("engine/b.ts", `export const g = [];\n`); put("api/src/moved.ts", `export const g = ["IRM 0002"];\n`); put("api/src/a.ts", `export const f = "IMM 5257"; export const k = "vv.single";\n`);
r = run("--against", base);
ok("a mention moved to another file is no rise", r.code === 0, r);
put("api/src/fixtures/f.ts", `export const x = "IMM 1111 IMM 2222 wp.family";\n`); put("api/src/z.test.ts", `const y = "IMM 3333";\n`);
r = run("--against", base);
ok("a fixture or a test file with form numbers and keys is skipped", r.code === 0, r);
r = run("--against", "0000000");
ok("a base that cannot be read: could not run (exit 2)", r.code === 2, r);
rmSync(T, { recursive: true, force: true });

// The real tree today: green against its own baseline.
r = spawnSync(process.execPath, [join(import.meta.dirname, "no-hard-coding.mjs")], { encoding: "utf8" });
ok(`the real tree passes its baseline (${(r.stdout.match(/\d+ IRCC form numbers, \d+ combination keys/) ?? ["?"])[0]})`, r.status === 0, r.stdout + r.stderr);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
