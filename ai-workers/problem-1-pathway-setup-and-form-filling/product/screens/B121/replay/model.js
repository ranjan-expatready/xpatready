// node model.js <outdir>: predicted PR check minutes for each replayed run, p50/p75, and the failed-suite check.
const fs = require("fs"); const runs = require("./runs.json"); const OUT = process.argv[2];
const ROOT = process.env.REPO ?? require("child_process").execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim(), P = "ai-workers/problem-1-pathway-setup-and-form-filling";
const tsv = fs.readFileSync(`${ROOT}/${P}/product/tools/suite-times.tsv`, "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t"));
const weight = new Map(tsv.map(([n, t]) => [n, +t]));
// measured seconds per suite: median over the window's ALL runs
const meas = new Map();
for (const r of runs) if (r.mode === "ALL") for (const [n, s] of Object.entries(r.suites)) if (s.st === "PASS" || s.st === "FAIL") { if (!meas.has(n)) meas.set(n, []); meas.get(n).push(s.t); }
const med = (a) => { a = [...a].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : undefined; };
const secs = (n) => med(meas.get(n) ?? []) ?? weight.get(n) ?? 30;
const QUAR = new Set(["check_forms_c36_rule_facts_browser.cjs", "check_screen01_api.ts", "check_d1_reset_to_six_browser.cjs"]);
const R1 = ["check_runtime_r1c.cjs", "check_runtime_r1d.ts", "check_runtime_r1a.ts"];
// all suites known (from an ALL run's table) = the universe for ALL
const universe = new Set(); for (const r of runs) if (r.mode === "ALL") for (const n of Object.keys(r.suites)) universe.add(n);
function deal(units, n) {   // run-suites.sh: longest first by suite-times.tsv, to the least-loaded shard
  const w = (u) => QUAR.has(u) ? 0 : (weight.get(u) ?? 30) + (u === "check_runtime_r1a.ts" ? (weight.get("check_runtime_r1c.cjs") ?? 30) + (weight.get("check_runtime_r1d.ts") ?? 30) : 0);
  const o = [...units].sort((a, b) => w(b) - w(a) || (a < b ? -1 : 1)); const load = Array(n).fill(0), real = Array(n).fill(0);
  for (const u of o) { let b = 0; for (let k = 1; k < n; k++) if (load[k] < load[b]) b = k; load[b] += w(u);
    real[b] += QUAR.has(u) ? 0 : secs(u) + (u === "check_runtime_r1a.ts" ? secs("check_runtime_r1c.cjs") + secs("check_runtime_r1d.ts") : 0); }
  return real;
}
const unitsOf = (names) => { const u = new Set(); for (const n of names) u.add(R1.includes(n) ? "check_runtime_r1a.ts" : n); return u; };
const FACTOR = 1.12, PER = 4;   // suites step = sum x 1.12 + 4 s (calibrated below)
function predict(r, names) {
  const n = r.nShards; const real = deal(unitsOf(names), n);
  const steps = real.map((x) => x * FACTOR + PER);
  // setup per shard and the run's offset, measured on the run itself
  const sh = Object.values(r.setup); const stepOf = (v) => (v.steps.find((s) => s[0].startsWith("studio suites")) ?? [0, 0])[1];
  const setupMax = Math.max(...sh.map((v) => v.total - stepOf(v)));
  const maxShard = Math.max(...sh.map((v) => v.total)); const offset = r.dur * 60 - maxShard;
  return (offset + setupMax + Math.max(...steps)) / 60;
}
const q = (a, p) => { a = [...a].sort((x, y) => x - y); const i = (a.length - 1) * p, l = Math.floor(i); return a[l] + (a[Math.ceil(i)] - a[l]) * (i - l); };
// calibration on the runs' own selections
let err = [];
for (const r of runs) if (r.nShards > 1 && Object.keys(r.suites).length && r.concl === "success") err.push([predict(r, Object.keys(r.suites)) - r.dur, r.id]);
console.log("calibration (predicted - actual, min): median", q(err.map((e) => e[0]), .5).toFixed(2), "range", Math.min(...err.map((e) => e[0])).toFixed(1), Math.max(...err.map((e) => e[0])).toFixed(1));
const succ = runs.filter((r) => r.concl === "success"); const before = [], after = []; const rows = [];
for (const r of succ) {
  before.push(r.dur);
  let a = r.dur, why = "unchanged (no suites)";
  if (r.nShards > 1 && fs.existsSync(`${OUT}/${r.id}.tsv`)) {
    const sel = fs.readFileSync(`${OUT}/${r.id}.tsv`, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
    const names = sel[0]?.[0] === "ALL" ? [...universe] : sel.map((x) => x[0]);
    a = predict(r, names); why = sel[0]?.[0] === "ALL" ? `ALL: ${sel[0][1].slice(0, 70)}` : `${names.length} suites`;
  }
  after.push(a); rows.push([r.id, r.pr ?? "", r.dur.toFixed(1), a.toFixed(1), why]);
}
for (const x of rows) if (x[4] !== "unchanged (no suites)") console.log(x.join("\t"));
console.log(`60 successful PR checks: before median ${q(before, .5).toFixed(1)} p75 ${q(before, .75).toFixed(1)} (>=10 min: ${before.filter((x) => x >= 10).length}) · after median ${q(after, .5).toFixed(1)} p75 ${q(after, .75).toFixed(1)} (>=10 min: ${after.filter((x) => x >= 10).length})`);
// every suite that failed on the replayed runs: still chosen?
for (const r of runs) for (const [n, s] of Object.entries(r.suites)) if (s.st === "FAIL") {
  const f = `${OUT}/${r.id}.tsv`; if (!fs.existsSync(f)) { console.log("FAILED-SUITE", r.id, n, "no replay"); continue; }
  const sel = fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
  const chosen = sel[0]?.[0] === "ALL" || sel.some((x) => x[0] === n || (R1.includes(n) && R1.includes(x[0])));
  console.log(chosen ? "KEPT  " : "LOST  ", r.id, `#${r.pr ?? "?"}`, n, chosen ? (sel[0][0] === "ALL" ? "ALL" : sel.find((x) => x[0] === n)?.[1]?.slice(0, 80)) : "");
}
