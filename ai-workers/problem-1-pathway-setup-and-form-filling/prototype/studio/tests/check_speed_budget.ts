// P-184: the shared speed-budget helper (tests/speed_budget.cjs) judges a budget on a quiet machine and reports it,
// not judged, on a busy one; the budget itself never moves. No server, no AI (US$0).
//   tsx studio/tests/check_speed_budget.ts
import { createRequire } from "node:module";
const { speed, machine } = createRequire(import.meta.url)("./speed_budget.cjs") as typeof import("./speed_budget.cjs");

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const quiet = { load: 3.2, cores: 8, busy: false }, edge = { load: 8, cores: 8, busy: false }, busy = { load: 12.4, cores: 8, busy: true };

const a = speed("first view under 1 s", 1593 < 1000, "1593 ms", quiet);
ok("P-184 fail: on a quiet machine a missed budget fails the run, with the time and the load", !a.ok && a.label === "first view under 1 s" && /1593 ms · load 3\.2 on 8 cores/.test(a.detail), a);
const b = speed("first view under 1 s", 529 < 1000, "529 ms", quiet);
ok("P-184 pass: on a quiet machine a met budget passes, judged", b.ok && !/not judged/.test(b.label), b);
const c = speed("first view under 1 s", 1593 < 1000, "1593 ms", busy);
ok("P-184 pass: on a busy machine the step passes as \"not judged: machine busy\" and prints the time and the load", c.ok && /not judged: machine busy \(load 12\.4 on 8 cores\)/.test(c.label) && /1593 ms/.test(c.detail), c);
const d = speed("tab under 200 ms", 260 < 200, { tab: [261, 276, 263] }, edge);
ok("P-184 fail: at exactly the core count the budget is still judged (busy means above it)", !d.ok && !/not judged/.test(d.label), d);
const m = machine();
ok("P-184: the machine reading is the one-minute load against the core count", typeof m.load === "number" && m.cores > 0 && m.busy === m.load > m.cores, m);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
