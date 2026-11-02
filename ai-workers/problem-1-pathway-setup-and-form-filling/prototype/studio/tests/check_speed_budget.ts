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
const hosted = machine({ RUNNER_ENVIRONMENT: "github-hosted" });
const e = speed("tab under 200 ms", 273 < 200, { tab: [291, 273, 275] }, hosted);
ok("Lead 1 Nov pass: on a GitHub-hosted machine the budget is not judged, said so with the reason, the time and the load", hosted.busy && e.ok && /not judged: CI machine \(\d+ cores\): judged by the nightly run on the Mac \(load [\d.]+ on \d+ cores\)/.test(e.label) && /291/.test(e.detail), e);
const nightly = machine({ RUNNER_ENVIRONMENT: "github-hosted", SPEED_JUDGE: "1" });
ok("T1 (P-228 (6)): the nightly full run on GitHub (SPEED_JUDGE=1) is judged by load like the Mac, with no CI reason", !nightly.reason && nightly.busy === nightly.load > nightly.cores, nightly);
ok("T1 fail: a pull-request shard on GitHub (no SPEED_JUDGE) is still never judged", hosted.busy === true && !!hosted.reason && machine({ RUNNER_ENVIRONMENT: "github-hosted", SPEED_JUDGE: "0" }).busy === true);
const selfHosted = machine({ RUNNER_ENVIRONMENT: "self-hosted" });
ok("Lead 1 Nov fail: the Mac runner (self-hosted) and a lane copy are judged by load as before, with no CI reason", !selfHosted.reason && selfHosted.busy === selfHosted.load > selfHosted.cores && !machine({}).reason, selfHosted);
const m = machine();
// P-215: speed budgets are judged on the Mac nightly only. On a GitHub-hosted machine this check reports the reading and
// that it is not judged (busy, with the CI reason); everywhere else the reading is the load against the cores, as before.
if (m.reason) ok("P-215 (GitHub-hosted machine): the reading is reported and not judged (busy, with the CI reason); the Mac nightly judges the budgets", typeof m.load === "number" && m.cores > 0 && m.busy === true && /nightly run on the Mac/.test(m.reason), m);
else ok("P-184: the machine reading is the one-minute load against the core count", typeof m.load === "number" && m.cores > 0 && m.busy === (m.load > m.cores), m);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
