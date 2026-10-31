// P-179 (C11.8): the cost check before any AI start, and a person's override in the one shared ledger (QA-90). Pure and
// ledger-level, on scratch ledgers: no server, no network, US$0. Every rule has a passing and a failing case.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_cost_check.ts
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedShared } from "../../p2/tools/seed-shared-ledger.ts";
import { costCheck } from "../engine/cost-check.ts";
import { COST_WORDS } from "../contracts/cost-check.ts";
import { BudgetExceeded, OverrideRefused, SpendLedger } from "../../p2/ledger.ts";
import { EXPERIMENT_CAP_USD, OVERRIDE_CEILING_USD, WAVE1_START } from "../../p2/policy.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const throws = (f: () => unknown, cls: new (...a: any[]) => Error, re: RegExp) => { try { f(); return false; } catch (e) { return e instanceof cls && re.test((e as Error).message); } }; // eslint-disable-line @typescript-eslint/no-explicit-any -- any error class

// ── 1. costCheck: the same comparisons as SpendLedger.reserve
const at = (spent: number, worst: number, wave = 0, extra: object = {}) => costCheck({ spent, wave: { spent: wave }, worst, ...extra });
ok("C11.8 P-179 pass: the ceiling is the US$120 experiment cap + 10% = US$132", EXPERIMENT_CAP_USD === 120 && OVERRIDE_CEILING_USD === 132);
const fits = at(100, 5, 10, { expected: 1.2 });
ok("C11.8 P-179 pass: under every limit the check fits, shows spend so far against the cap, and offers no Continue", fits.ok && !fits.over.length && !fits.can_continue && fits.spent_usd === 100 && fits.cap_usd === 120 && fits.expected_usd === 1.2 && /spent so far US\$100\.00 of US\$120\.00/.test(fits.words));
ok("C11.8 P-179 pass: exactly at the experiment cap fits (reserve refuses only past it)", at(115, 5).ok);
const exp = at(116, 5);
ok("C11.8 P-179 fail: past the experiment cap: over 'experiment' at US$121, Continue offered (within US$132)", !exp.ok && exp.over.map((o) => o.limit).join() === "experiment" && exp.over[0].after_usd === 121 && exp.can_continue && /Continue records your name/.test(exp.words));
ok("C11.8 P-179 pass: exactly at the Wave 1 cap fits", at(50, 5, 55).ok);
const wave = at(50, 5, 56);
ok("C11.8 P-179 fail (Q1): past the Wave 1 cap (US$60) is a named limit of its own, Continue offered", wave.over.map((o) => o.limit).join() === "wave" && wave.can_continue && /Wave 1 has spent US\$56\.00 of its US\$60\.00/.test(wave.words));
ok("C11.8 P-179 pass: a run at the run cap (US$5) fits", at(0, 5, 0, { run: 5 }).ok);
ok("C11.8 P-179 fail: a run above the run cap is over 'run'", at(0, 6, 0, { run: 6 }).over.map((o) => o.limit).join() === "run");
ok("C11.8 P-179 pass: a form with paid attempts left is not over 'attempts'", at(0, 1, 0, { attempts: { spentForms: [] } }).ok);
const att = at(0, 1, 0, { attempts: { spentForms: ["IMM 5257"] } });
ok("C11.8 P-179 fail (Q2): a form with no paid attempt left is over 'attempts'; Continue allows exactly one more run", att.over.map((o) => o.limit).join() === "attempts" && att.can_continue && /exactly one more run/.test(att.words));
const two = at(117, 5, 57);
ok("C11.8 P-179 fail: past two limits at once, both named, one Continue", two.over.map((o) => o.limit).join() === "experiment,wave" && two.can_continue && /2 limits/.test(two.words));
ok("C11.8 P-179 pass: spend so far + worst case exactly US$132 can still Continue", at(127, 5).can_continue);
const past = at(127.01, 5);
ok("C11.8 P-179 fail: US$132.01 has no Continue: 'The founder must raise the cap.'", !past.ok && !past.can_continue && /past the US\$132\.00 the founder allows on a click\. The founder must raise the cap\./.test(past.words));
ok("C11.8 P-179 pass: an expected cost at or below the worst case is taken", at(0, 2, 0, { expected: 2 }).expected_usd === 2);
ok("C11.8 P-179 fail: an expected cost above the worst case, or a negative amount, is refused", throws(() => at(0, 2, 0, { expected: 2.5 }), Error, /expected cost/) && throws(() => at(-1, 2), Error, /at or above 0/));

// ── 2. The override in the ledger (scratch ledgers at the real US$120 cap)
const fresh = (committed: number, opts: { since?: string } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "p179-")); const l = new SpendLedger(dir);
  if (committed) appendFileSync(join(dir, "spend.jsonl"), JSON.stringify({ type: "reserve", id: "old#1", run_id: "old", attempt: 1, worst_usd: committed, at: opts.since ?? "2026-10-20T00:00:00.000Z" }) + "\n");
  return { dir, l, lines: () => readFileSync(join(dir, "spend.jsonl"), "utf8").split("\n").filter(Boolean).map((x) => JSON.parse(x)) };
};
const a = fresh(118);
ok("C11.8 P-179 pass (today's rule stays): over the experiment cap with no override, reserve refuses", throws(() => a.l.reserve("run-a", 1, 3, 5, "paid"), BudgetExceeded, /^experiment cap US\$120: committed 118\.0000 \+ worst case 3\.0000$/));
const o = a.l.recordOverride({ run_key: "field_map:run-a", limits: ["experiment"], worst_usd: 3, by: "user-A" });
ok("C11.8 P-179 pass: a person's override is recorded in the ledger with who, which limits, the worst case and a 10-minute expiry", a.lines().some((e) => e.type === "override" && e.id === o.id && e.by === "user-A" && e.worst_usd === 3 && e.limits.join() === "experiment" && Date.parse(e.expires_at) - Date.parse(e.at) === 600_000));
ok("C11.8 P-179 fail: an override recorded but never used to start its run does not pass the cap", throws(() => a.l.reserve("run-a", 1, 3, 5, "paid", { overrideId: o.id, runKey: "field_map:run-a" }), BudgetExceeded, /not used to start this run/));
ok("C11.8 P-179 fail: another run's key cannot use it", throws(() => a.l.useOverride(o.id, "field_map:run-b"), OverrideRefused, /another run/));
a.l.useOverride(o.id, "field_map:run-a");
ok("C11.8 P-179 fail: used twice is refused (one click covers one run)", throws(() => a.l.useOverride(o.id, "field_map:run-a"), OverrideRefused, /already used/));
ok("C11.8 P-179 fail: reserve with another run's key is refused", throws(() => a.l.reserve("run-a", 1, 3, 5, "paid", { overrideId: o.id, runKey: "field_map:run-b" }), BudgetExceeded, /another run/));
ok("C11.8 P-179 fail: above the worst case the person accepted is refused", throws(() => a.l.reserve("run-a", 1, 3.01, 5, "paid", { overrideId: o.id, runKey: "field_map:run-a" }), BudgetExceeded, /above the US\$3\.0000 worst case/));
const r1 = a.l.reserve("run-a", 1, 1.5, 5, "paid", { overrideId: o.id, runKey: "field_map:run-a" });
const r2 = a.l.reserve("run-a", 2, 1.5, 5, "paid", { overrideId: o.id, runKey: "field_map:run-a" });
ok("C11.8 P-179 pass: with the used override the run's attempts pass the cap, each line names the override", !!r1 && !!r2 && a.lines().filter((e) => e.override_id === o.id).length === 2 && Math.abs(a.l.committed() - 121) < 1e-9);
ok("C11.8 P-179 fail: once the run's worst case is reserved, nothing more passes on the same click", throws(() => a.l.reserve("run-a", 3, 0.01, 5, "paid", { overrideId: o.id, runKey: "field_map:run-a" }), BudgetExceeded, /worst case the person accepted/));
ok("C11.8 P-179 fail: an unknown override id passes nothing", throws(() => a.l.reserve("run-z", 1, 1, 5, "paid", { overrideId: "override-nope", runKey: "x" }), BudgetExceeded, /no such override/));
ok("C11.8 P-179 fail: an unknown override cannot be used", throws(() => a.l.useOverride("override-nope", "x"), OverrideRefused, /no such override/));

const w = fresh(57, { since: WAVE1_START });
const ow = w.l.recordOverride({ run_key: "k", limits: ["experiment"], worst_usd: 4, by: "user-A" }); w.l.useOverride(ow.id, "k");
ok("C11.8 P-179 fail (Q1): an override that does not name the Wave 1 cap does not pass it", throws(() => w.l.reserve("run-w", 1, 4, 5, "paid", { overrideId: ow.id, runKey: "k" }), BudgetExceeded, /^Wave 1 cap.*does not name the wave limit/));
const ow2 = w.l.recordOverride({ run_key: "k2", limits: ["wave"], worst_usd: 4, by: "user-A" }); w.l.useOverride(ow2.id, "k2");
ok("C11.8 P-179 pass (Q1): an override naming the Wave 1 cap passes it", !!w.l.reserve("run-w", 1, 4, 5, "paid", { overrideId: ow2.id, runKey: "k2" }));

const c = fresh(127);
const before = c.lines().length;
ok("C11.8 P-179 pass: an override up to exactly US$132 is recorded", !!c.l.recordOverride({ run_key: "c", limits: ["experiment"], worst_usd: 5, by: "user-A" }).id);
const c2 = fresh(127.01);
ok("C11.8 P-179 fail: an override that would take spend to US$132.01 is refused and nothing is written", throws(() => c2.l.recordOverride({ run_key: "c", limits: ["experiment"], worst_usd: 5, by: "user-A" }), OverrideRefused, /ceiling US\$132.*founder must raise the cap/) && c2.lines().length === 1 && before === 1);
// A reservation made after other spend arrived: the ceiling is checked again at reserve time.
const d = fresh(120); const od = d.l.recordOverride({ run_key: "d", limits: ["experiment"], worst_usd: 12, by: "user-A" }); d.l.useOverride(od.id, "d");
appendFileSync(join(d.dir, "spend.jsonl"), JSON.stringify({ type: "reserve", id: "other#1", run_id: "other", attempt: 1, worst_usd: 1, at: new Date().toISOString() }) + "\n");
ok("C11.8 P-179 fail: spend that arrived after the click still stops a reservation at the US$132 ceiling", throws(() => d.l.reserve("run-d", 1, 12, 15, "paid", { overrideId: od.id, runKey: "d" }), BudgetExceeded, /past the US\$132 ceiling/));

const p = fresh(0);
ok("C11.8 P-179 fail: the system, or no one, cannot record an override (only a person's click)", throws(() => p.l.recordOverride({ run_key: "p", limits: ["experiment"], worst_usd: 1, by: "system" }), OverrideRefused, /only a person/) && throws(() => p.l.recordOverride({ run_key: "p", limits: ["experiment"], worst_usd: 1, by: "" }), OverrideRefused, /only a person/));
ok("C11.8 P-179 fail: an override naming no limit, an unknown one or a negative worst case is refused", throws(() => p.l.recordOverride({ run_key: "p", limits: [], worst_usd: 1, by: "user-A" }), OverrideRefused, /limits/) && throws(() => p.l.recordOverride({ run_key: "p", limits: ["everything" as "run"], worst_usd: 1, by: "user-A" }), OverrideRefused, /limits/) && throws(() => p.l.recordOverride({ run_key: "p", limits: ["run"], worst_usd: -1, by: "user-A" }), OverrideRefused, /at or above 0/));
appendFileSync(join(p.dir, "spend.jsonl"), JSON.stringify({ type: "override", id: "override-old", run_key: "p", limits: ["experiment"], worst_usd: 1, by: "user-A", at: "2026-10-30T00:00:00.000Z", expires_at: "2026-10-30T00:10:00.000Z" }) + "\n");
ok("C11.8 P-179 fail: an override not used within its 10 minutes has expired", throws(() => p.l.useOverride("override-old", "p"), OverrideRefused, /expired/));
ok("C11.8 P-179 pass: override and use lines count nothing toward any cap", p.l.committed() === 0);
// check_cost_override found it (30 Oct): with spend already past the cap after a Continue, a free start (rules only, saved
// answers, a stub pass) was flagged over the cap, so every free start would have needed a Continue.
const free = at(130, 0, 70);
ok("C11.8 P-179 pass: a start that spends nothing fits even with spend past the cap and the wave (no dialog)", free.ok && !free.over.length && /^Fits/.test(free.words), free);
ok("C11.8 P-179 fail: one cent of worst case with spend past the cap is over again (and past US$132: no Continue)", !at(130, 0.01).ok && !at(132, 0.01).can_continue);

// ── Break B1 (CHECK 30 Oct): every live step runs a stub pass first. The stub never spends, so it reserves US$0 and passes
// no cap, with spend past the experiment cap or a run past its own; a paid reservation is still refused there.
const b1 = fresh(119.5);
const stub = (() => { try { return b1.l.reserve("run-s", 1, 1.38, 5, "stub"); } catch (e) { return e as Error; } })();
ok("C11.8 break B1 pass: past the experiment cap, a stub pass (US$0) is reserved, at US$0", typeof stub === "string" && b1.lines().find((x) => x.id === stub)?.worst_usd === 0, stub);
ok("C11.8 break B1 pass: a stub pass bigger than the run cap is reserved too (it spends nothing)", typeof (() => { try { return b1.l.reserve("run-big", 1, 6, 5, "stub"); } catch (e) { return e; } })() === "string");
ok("C11.8 break B1 pass: with spend past the cap a US$0 paid reservation (nothing to spend) passes no limit", typeof (() => { try { return fresh(121).l.reserve("run-z", 1, 0, 5, "paid"); } catch (e) { return e; } })() === "string");
ok("C11.8 break B1 fail: the paid attempt after it is still refused without a Continue", throws(() => b1.l.reserve("run-s", 2, 1.38, 5, "paid"), BudgetExceeded, /^experiment cap US\$120/));
ok("C11.8 break B1 fail: the stub's US$0 counts nothing: committed stays US$119.50", Math.abs(b1.l.committed() - 119.5) < 1e-9, b1.l.committed());

// ── Break M1: a ledger line whose amount is not a number of US$ at or above 0 stops every reservation in words, never
// switching the caps off (NaN) or lowering spend (below 0); settle refuses such an amount.
for (const [what, line] of [["no amount", { type: "reserve", id: "x#1", run_id: "x", attempt: 1, at: "2026-10-29T00:00:00.000Z" }], ["a text amount", { type: "reserve", id: "x#1", run_id: "x", attempt: 1, worst_usd: "4", at: "2026-10-29T00:00:00.000Z" }], ["a negative amount", { type: "reserve", id: "x#1", run_id: "x", attempt: 1, worst_usd: -50, at: "2026-10-29T00:00:00.000Z" }], ["a negative settle", { type: "settle", id: "old#1", actual_usd: -100, outcome: "ok", at: "2026-10-29T00:00:00.000Z" }]] as const) {
  const m = fresh(119); appendFileSync(join(m.dir, "spend.jsonl"), JSON.stringify(line) + "\n");
  ok(`C11.8 break M1 fail: a ledger line with ${what} refuses a US$4 reservation at US$119 in words (not admitted, no TypeError)`, throws(() => m.l.reserve("run-m", 1, 4, 5, "paid"), BudgetExceeded, /amount is not a number of US\$ at or above 0/));
}
const m1 = fresh(100); const mr = m1.l.reserve("run-m", 1, 1, 5, "paid");
ok("C11.8 break M1 fail: settle refuses a negative or non-number cost", throws(() => m1.l.settle(mr, -100, "ok"), BudgetExceeded, /at or above 0/) && throws(() => m1.l.settle(mr, NaN, "ok"), BudgetExceeded, /at or above 0/));
m1.l.settle(mr, 0.5, "ok");
ok("C11.8 break M1 pass: a clean ledger adds up as before (US$100 + a US$0.50 settle)", Math.abs(m1.l.committed() - 100.5) < 1e-9, m1.l.committed());

// ── Break m3: Continues recorded and not started yet hold their worst case against US$132, so two cannot pass it together.
const h = fresh(125);
const h1 = (() => { try { return h.l.recordOverride({ run_key: "h1", limits: ["experiment"], worst_usd: 6, by: "user-A" }).id; } catch (e) { return e as Error; } })();
ok("C11.8 break m3 pass: at US$125 one US$6 Continue is recorded (US$131)", typeof h1 === "string", h1);
ok("C11.8 break m3 fail: a second US$6 Continue for another run is refused while the first is held (before: both recorded)", throws(() => h.l.recordOverride({ run_key: "h2", limits: ["experiment"], worst_usd: 6, by: "user-A" }), OverrideRefused, /held by other Continues not started yet.*founder must raise the cap/) && h.lines().filter((x) => x.type === "override").length === 1);
ok("C11.8 break m3 pass: what Continues hold is US$6 while unused, US$0 once used (its run's reservations count instead)", h.l.heldByOverridesUsd() === 6 && (h.l.useOverride(h1 as string, "h1"), h.l.heldByOverridesUsd() === 0));
ok("C11.8 break m3 pass: an expired Continue holds nothing", fresh(0).l.heldByOverridesUsd([{ type: "override", id: "o", run_key: "k", limits: ["run"], worst_usd: 5, by: "user-A", at: "2026-10-01T00:00:00.000Z", expires_at: "2026-10-01T00:10:00.000Z" }] as never) === 0);

// ── Break m7: a Continue is used only by the person who recorded it.
const pr = fresh(118); const po = pr.l.recordOverride({ run_key: "pr", limits: ["experiment"], worst_usd: 3, by: "user-A" });
ok("C11.8 break m7 fail: another person cannot use it, and it stays unused", throws(() => pr.l.useOverride(po.id, "pr", "user-Z"), OverrideRefused, /another person/) && !pr.lines().some((x) => x.type === "override_use"));
ok("C11.8 break m7 pass: the person who recorded it can", (() => { try { return pr.l.useOverride(po.id, "pr", "user-A").id === po.id; } catch { return false; } })());

// ── Break m6: a line that is not JSON stops reservations in words (before: a bare SyntaxError, a 500 with no words).
const bj = fresh(10); appendFileSync(join(bj.dir, "spend.jsonl"), "{not json\n");
ok("C11.8 break m6 fail: a line that is not a ledger entry refuses a reservation in words, naming the line", throws(() => bj.l.reserve("run-j", 1, 1, 5, "paid"), BudgetExceeded, /has a line \(2\) that is not a ledger entry/));

// ── Review m9: the ledger lock. A holder removes only its own lock; a crashed (old) lock is broken; a fresh one is not.
const lk = fresh(0), lockFile = join(lk.dir, "spend.reserve.lock");
lk.l.withReserveLock(() => writeFileSync(lockFile, "another-holder"));
ok("C11.8 review m9 pass: a holder leaving the lock removes only its own (a lock now holding another token stays; before: deleted)", existsSync(lockFile) && readFileSync(lockFile, "utf8") === "another-holder");
writeFileSync(lockFile, "crashed-holder"); const old = new Date(Date.now() - 60_000); utimesSync(lockFile, old, old);
const t0 = Date.now(); const rk = lk.l.reserve("run-k", 1, 1, 5, "paid");
ok("C11.8 review m9 pass: a lock older than 30 s (a crash) is broken: the reservation goes through at once and leaves no lock or moved-aside file", typeof rk === "string" && Date.now() - t0 < 2_000 && !existsSync(lockFile) && !readdirSync(lk.dir).some((f) => f.includes(".stale-")));
writeFileSync(lockFile, "live-holder");
const t1 = Date.now();
ok("C11.8 review m9 fail: a fresh lock is never broken: the reservation waits, then refuses 'ledger busy' (10 s), and the lock stays", throws(() => lk.l.reserve("run-k", 2, 1, 5, "paid"), BudgetExceeded, /ledger busy/) && Date.now() - t1 >= 9_500 && readFileSync(lockFile, "utf8") === "live-holder");
rmSync(lockFile);

// ── Review m8: the seed tool rewrites the shared file under the ledger's lock, so it waits for a copy that holds it.
const sd = fresh(5);
const holder = spawn(process.execPath, ["-e", `const fs=require("node:fs");fs.writeFileSync(${JSON.stringify(join(sd.dir, "spend.reserve.lock"))},"child");fs.appendFileSync(${JSON.stringify(join(sd.dir, "spend.jsonl"))},JSON.stringify({type:"reserve",id:"child#1",run_id:"child",attempt:1,worst_usd:2,at:"2026-10-29T00:00:00.000Z"})+"\\n");setTimeout(()=>fs.unlinkSync(${JSON.stringify(join(sd.dir, "spend.reserve.lock"))}),1500);`], { stdio: "ignore" });
while (!existsSync(join(sd.dir, "spend.reserve.lock"))) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
const t2 = Date.now();
const seeded = seedShared(sd.dir, [JSON.stringify({ type: "reserve", id: "copy#1", run_id: "copy", attempt: 1, worst_usd: 1, at: "2026-10-21T00:00:00.000Z" })]);
ok("C11.8 review m8 pass: the seed waited for the copy holding the lock (≥ 1 s) and kept that copy's reservation and its own (US$8)", Date.now() - t2 >= 1_000 && seeded.all.length === 3 && Math.abs(sd.l.committed() - 8) < 1e-9, { ms: Date.now() - t2, n: seeded.all.length, c: sd.l.committed() });
holder.kill();

// The shared contract and the engine say the same: the dialog's words are built from the same check.

ok("C11.8 P-179 pass: the dialog shows spend so far against the cap, the worst case and what Continue allows", COST_WORDS.spent(exp) === "Spent so far US$116.00 of US$120.00" && COST_WORDS.worst(exp) === "At most US$5.00" && /allows this one run, up to US\$5\.00\. Total spend stays within US\$132\.00/.test(COST_WORDS.continueNote(exp)));
ok("C11.8 P-179 fail: an unknown expected cost is said as such, never as US$0", COST_WORDS.expected(exp) === "Expected not known yet");

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
