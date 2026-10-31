// P-179 (C11.8): the cost check before any AI start, and a person's override in the one shared ledger (QA-90). Pure and
// ledger-level, on scratch ledgers: no server, no network, US$0. Every rule has a passing and a failing case.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_cost_check.ts
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedShared } from "../../p2/tools/seed-shared-ledger.ts";
import { costCheck } from "../engine/cost-check.ts";
import { COST_WORDS } from "../contracts/cost-check.ts";
import { BudgetExceeded, LedgerBusy, OverrideRefused, SpendLedger } from "../../p2/ledger.ts";
import { runDrafting } from "../../p2/runner.ts";
import { createHash } from "node:crypto";
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
// N6 (review N2): the words say wait (the hold ends by itself within 10 minutes), not that the founder must raise the cap.
ok("C11.8 break m3 fail: a second US$6 Continue for another run is refused while the first is held (before: both recorded)", throws(() => h.l.recordOverride({ run_key: "h2", limits: ["experiment"], worst_usd: 6, by: "user-A" }), OverrideRefused, /^Other Continues chosen in the last 10 minutes still hold US\$6\.00 until their runs start; with them, this run could take spend to US\$137\.00, past the US\$132\.00 a click may allow\. Wait a few minutes, then look at the cost again$/) && h.lines().filter((x) => x.type === "override").length === 1);
// N6 (break n2): a used Continue holds its worst case until its run reserves it (before: US$0 once used, so a second
// Continue was recorded and its run refused at reserve).
ok("C11.8 break n2 pass: what a Continue holds is US$6 while unused, still US$6 once used and its run not reserved yet, US$0 once reserved", h.l.heldByOverridesUsd() === 6 && (h.l.useOverride(h1 as string, "h1"), h.l.heldByOverridesUsd() === 6) && (h.l.reserve("run-h1", 1, 6, 6, "paid", { overrideId: h1 as string, runKey: "h1" }), h.l.heldByOverridesUsd() === 0), h.l.heldByOverridesUsd());
const n2 = fresh(125); const n2a = n2.l.recordOverride({ run_key: "x1", limits: ["experiment"], worst_usd: 6, by: "user-A" }); n2.l.useOverride(n2a.id, "x1");
ok("C11.8 break n2 fail: a second Continue while the first one's run waits in the queue (used, not reserved) is refused, nothing written", throws(() => n2.l.recordOverride({ run_key: "x2", limits: ["experiment"], worst_usd: 6, by: "user-B" }), OverrideRefused, /still hold US\$6\.00/) && n2.lines().filter((x) => x.type === "override").length === 1);
n2.l.reserve("run-x1", 1, 2, 6, "paid", { overrideId: n2a.id, runKey: "x1" });
ok("C11.8 break n2 pass: part reserved: it holds only the rest of its worst case (US$4)", Math.abs(n2.l.heldByOverridesUsd() - 4) < 1e-9, n2.l.heldByOverridesUsd());
ok("C11.8 break n2 pass: once its run has ended (the API names it), it holds nothing, and a Continue for another run is recorded", n2.l.heldByOverridesUsd(undefined, undefined, undefined, new Set([n2a.id])) === 0 && typeof n2.l.recordOverride({ run_key: "x3", limits: ["experiment"], worst_usd: 4, by: "user-B" }, { ended: new Set([n2a.id]) }).id === "string");
ok("C11.8 break m3 pass: an expired Continue holds nothing", fresh(0).l.heldByOverridesUsd([{ type: "override", id: "o", run_key: "k", limits: ["run"], worst_usd: 5, by: "user-A", at: "2026-10-01T00:00:00.000Z", expires_at: "2026-10-01T00:10:00.000Z" }] as never) === 0);

// ── N6 review N2: a person's own unused Continue for the same run (left by a launch refused after the click) no longer
// blocks their retry: it is the one the retry uses. The costCheck and the ledger agree on what other Continues hold.
const rn = fresh(120.012);
const rn1 = rn.l.recordOverride({ run_key: "rn", limits: ["experiment"], worst_usd: 9.99, by: "user-A" });
const rn2 = (() => { try { return rn.l.recordOverride({ run_key: "rn", limits: ["experiment"], worst_usd: 9.99, by: "user-A" }); } catch (e) { return e as Error; } })();
ok("C11.8 N6 review N2 pass: the same person's Continue for the same run, unused, is used again (same id, no second line; before: 409 'held … the founder must raise the cap')", !(rn2 instanceof Error) && rn2.id === rn1.id && rn2.again === true && rn.lines().filter((x) => x.type === "override").length === 1, rn2);
ok("C11.8 N6 review N2 pass: and it still starts one run only", (rn.l.useOverride(rn1.id, "rn", "user-A"), throws(() => rn.l.useOverride(rn1.id, "rn", "user-A"), OverrideRefused, /already used/)));
const ro = fresh(120.012); ro.l.recordOverride({ run_key: "ro", limits: ["experiment"], worst_usd: 9.99, by: "user-A" });
const roB = (() => { try { return ro.l.recordOverride({ run_key: "ro", limits: ["experiment"], worst_usd: 9.99, by: "user-D" }); } catch (e) { return e as Error; } })();
ok("C11.8 N6 review N2 pass: another person's Continue for the same run is their own line, and the first does not hold against it (one run key starts one run)", !(roB instanceof Error) && !roB.again && ro.lines().filter((x) => x.type === "override").length === 2, roB);
ok("C11.8 N6 review N2 fail: a Continue for another run is still held back by it (US$9.99 held), in wait words", throws(() => ro.l.recordOverride({ run_key: "ro-other", limits: ["experiment"], worst_usd: 9.99, by: "user-A" }), OverrideRefused, /still hold US\$9\.99.*Wait a few minutes/));
ok("C11.8 N6 review N2 pass: what is held leaves out the run key looked at, and counts one run key once", Math.abs(ro.l.heldByOverridesUsd(undefined, undefined, "ro")) < 1e-9 && Math.abs(ro.l.heldByOverridesUsd(undefined, undefined, "ro-other") - 9.99) < 1e-9);
const heldCc = at(120.012, 9.99, 0, { held: 9.99 });
ok("C11.8 N6 review N2 fail: costCheck counts what other Continues hold as the ledger does: no Continue, words say wait (not the founder)", !heldCc.ok && !heldCc.can_continue && heldCc.held_usd === 9.99 && /still hold US\$9\.99.*Wait a few minutes, then look at the cost again\./.test(heldCc.words) && !/founder/.test(heldCc.words), heldCc);
ok("C11.8 N6 review N2 pass: with nothing held, the same start offers Continue (the ledger records it)", at(120.012, 9.99, 0, { held: 0 }).can_continue && typeof fresh(120.012).l.recordOverride({ run_key: "z", limits: ["experiment"], worst_usd: 9.99, by: "user-A" }).id === "string");
ok("C11.8 N6 review N2 pass: past US$132 on its own, the words still send it to the founder (held or not)", /founder must raise the cap/.test(at(127.01, 5, 0, { held: 3 }).words));

// ── N6 (break n4, review n3): override lines and the reservation's time are checked like amounts: a malformed line stops
// every Continue and reservation in words (before: NaN held, a lower hold, a TypeError 500, or a Continue that never expired).
const badOverride = (extra: object) => ({ type: "override", id: "override-bad", run_key: "k", limits: ["experiment"], worst_usd: 5, by: "user-A", at: "2026-10-30T00:00:00.000Z", expires_at: "2099-01-01T00:00:00.000Z", ...extra });
for (const [what, line, re] of [
  ["no worst case", badOverride({ worst_usd: undefined }), /override line \(override-bad\) whose amount is not a number of US\$ at or above 0/],
  ["a worst case below 0", badOverride({ worst_usd: -100 }), /amount is not a number/],
  ["a text worst case", badOverride({ worst_usd: "6" }), /amount is not a number/],
  ["no expiry", badOverride({ expires_at: undefined }), /time or expiry is missing/],
  ["limits as text", badOverride({ limits: "experiment,wave" }), /limits are not a list of known limits/],
  ["no person", badOverride({ by: undefined }), /id, run or person is missing/],
  ["a reservation with no time", { type: "reserve", id: "r#1", run_id: "r", attempt: 1, worst_usd: 1 }, /reserve line \(r#1\) whose time is missing/],
] as const) {
  const m = fresh(119); appendFileSync(join(m.dir, "spend.jsonl"), JSON.stringify(line) + "\n");
  ok(`C11.8 N6 break n4 fail: a ledger line with ${what} refuses a Continue and a reservation in words (BudgetExceeded, nothing written)`, throws(() => m.l.recordOverride({ run_key: "n", limits: ["experiment"], worst_usd: 6, by: "user-A" }), BudgetExceeded, re) && throws(() => m.l.reserve("run-n", 1, 0.5, 5, "paid"), BudgetExceeded, re) && m.lines().length === 2);
}
ok("C11.8 N6 break n4 pass: well-formed override and use lines pass the check (a clean ledger adds up as before)", (() => { const g = fresh(100); const x = g.l.recordOverride({ run_key: "g", limits: ["experiment", "wave"], worst_usd: 1, by: "user-A" }); g.l.useOverride(x.id, "g"); return Math.abs(g.l.committed() - 100) < 1e-9; })());

// ── #131 review M1: a Continue past "attempts" only (no money limit passed) still holds its run to the worst case the
// person accepted: before, every reservation that passed no limit was admitted, so one click could pay for ~3 runs.
const ao = fresh(10); const aoO = ao.l.recordOverride({ run_key: "ao", limits: ["attempts"], worst_usd: 2, by: "user-A" }); ao.l.useOverride(aoO.id, "ao");
const ao1 = (() => { try { return ao.l.reserve("run-ao", 1, 2, 5, "paid", { overrideId: aoO.id, runKey: "ao" }); } catch (e) { return e as Error; } })();
ok("C11.8 #131 review M1 pass: an attempts-only Continue admits its run up to the accepted worst case (US$2)", typeof ao1 === "string" && ao.l.overrideRoomUsd(aoO.id) === 0, ao1);
ok("C11.8 #131 review M1 fail: a second US$2 reservation under it (a retry) is refused, above what is left of the accepted worst case (before: admitted)", throws(() => ao.l.reserve("run-ao", 2, 2, 5, "paid", { overrideId: aoO.id, runKey: "ao" }), BudgetExceeded, /above the US\$0\.0000 left of the worst case the person accepted/));
ok("C11.8 #131 review M1 pass: a US$0 stub pass under it still runs (it spends nothing)", typeof (() => { try { return ao.l.reserve("run-ao", 3, 0.5, 5, "stub", { overrideId: aoO.id, runKey: "ao" }); } catch (e) { return e; } })() === "string");

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

// ── N6 break N1: the one-runner lock (spend.lock) names its holder; a lock whose process has exited (SIGTERM from Stop, a
// crash) is broken, so it no longer stops every copy's AI steps until a person deletes it. A live holder still refuses.
const runLock = fresh(0), runLockFile = join(runLock.dir, "spend.lock");
const LEDGER_TS = join(import.meta.dirname, "..", "..", "p2", "ledger.ts");
const holderSrc = `import { SpendLedger } from ${JSON.stringify(LEDGER_TS)}; await new SpendLedger(${JSON.stringify(runLock.dir)}).withLock(async () => { console.log("held"); await new Promise((r) => setTimeout(r, 60_000)); });`;
const runHolder = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", holderSrc], { stdio: ["ignore", "pipe", "ignore"] });
await new Promise<void>((res) => runHolder.stdout!.on("data", (d) => { if (String(d).includes("held")) res(); }));
ok("C11.8 N6 break N1 pass: the lock names its holder (this computer and its process id)", new RegExp(`:${runHolder.pid}:[0-9a-f]+$`).test(readFileSync(runLockFile, "utf8")), readFileSync(runLockFile, "utf8"));
const liveRefused = await runLock.l.withLock(async () => "entered").then(() => false, (e) => e instanceof BudgetExceeded && /locked by another runner/.test(e.message));
ok("C11.8 N6 break N1 fail: while the holder runs, a second runner is refused and the holder's lock stays", liveRefused && existsSync(runLockFile));
runHolder.kill("SIGTERM"); await new Promise((r) => runHolder.once("exit", r));
ok("C11.8 N6 break N1 pass: SIGTERM skips the holder's finally: its lock is left behind (the break, reproduced)", existsSync(runLockFile));
const afterCrash = await runLock.l.withLock(async () => "entered").catch((e) => e as Error);
ok("C11.8 N6 break N1 pass: the next runner breaks the lock of the exited process at once, runs, and leaves no lock or moved-aside file (before: 'ledger locked by another runner' until a person deleted it)", afterCrash === "entered" && !existsSync(runLockFile) && !readdirSync(runLock.dir).some((f) => /\.stale-|\.new-/.test(f)), afterCrash);
writeFileSync(runLockFile, "");
ok("C11.8 N6 break N1 fail: an empty lock (older form, holder unknown) is not broken while under an hour old", await runLock.l.withLock(async () => "entered").then(() => false, (e) => /locked by another runner/.test((e as Error).message)) && existsSync(runLockFile));
const hourOld = new Date(Date.now() - 3_700_000); utimesSync(runLockFile, hourOld, hourOld);
ok("C11.8 N6 break N1 pass: an empty lock over an hour old is broken", (await runLock.l.withLock(async () => "entered").catch((e) => e)) === "entered" && !existsSync(runLockFile));
writeFileSync(runLockFile, `another-computer:1:abcdef`);
ok("C11.8 N6 break N1 fail: a lock naming another computer is never judged by its process id here", await runLock.l.withLock(async () => "entered").then(() => false, (e) => /locked by another runner/.test((e as Error).message)));
rmSync(runLockFile);

// ── N6 break n1: the short reserve lock of an exited process is broken at once (before: every call froze until it was 30 s
// old), and the API's ledger waits 2 s, not 10 s, then says busy (LedgerBusy), not "fix the ledger line".
const rl = fresh(0), rlFile = join(rl.dir, "spend.reserve.lock");
const dead = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" }).stdout;
writeFileSync(rlFile, `${(await import("node:os")).hostname()}:${dead}:abc123`);
const t3 = Date.now(); const rlr = rl.l.reserve("run-rl", 1, 1, 5, "paid");
ok("C11.8 N6 break n1 pass: a fresh reserve lock whose process has exited is broken at once (< 1 s; before: 10 s wait, then refused)", typeof rlr === "string" && Date.now() - t3 < 1_000 && !existsSync(rlFile), Date.now() - t3);
writeFileSync(rlFile, `${(await import("node:os")).hostname()}:${process.ppid}:abc123`);
const apiL = new SpendLedger(rl.dir, undefined, { waitMs: 2_000 }); const t4 = Date.now();
ok("C11.8 N6 break n1 fail: a live holder's lock is kept; the API's ledger gives up after 2 s with LedgerBusy (busy words)", throws(() => apiL.recordOverride({ run_key: "b", limits: ["experiment"], worst_usd: 1, by: "user-A" }), LedgerBusy, /ledger busy: .* for 2 s/) && Date.now() - t4 >= 1_900 && Date.now() - t4 < 4_000 && existsSync(rlFile), Date.now() - t4);
rmSync(rlFile);

// ── N6 break n5: settle appends under the short lock, so a seed's read-and-replace cannot drop it.
const st = fresh(0); const stId = st.l.reserve("run-st", 1, 2, 5, "paid");
const stHolder = spawn(process.execPath, ["-e", `const fs=require("node:fs");fs.writeFileSync(${JSON.stringify(join(st.dir, "spend.reserve.lock"))},"seed");setTimeout(()=>fs.unlinkSync(${JSON.stringify(join(st.dir, "spend.reserve.lock"))}),1200);`], { stdio: "ignore" });
while (!existsSync(join(st.dir, "spend.reserve.lock"))) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
const t5 = Date.now(); st.l.settle(stId, 0.5, "ok");
ok("C11.8 N6 break n5 pass: settle waited for the lock holder (≥ 1 s; before: appended at once, inside a seed's rewrite) and was kept", Date.now() - t5 >= 1_000 && Math.abs(st.l.committed() - 0.5) < 1e-9, { ms: Date.now() - t5, c: st.l.committed() });
stHolder.kill();
// PR #121 review (Devin): a settle never appends outside the short lock (a seed's rewrite could drop it): busy → LedgerBusy.
const sb = fresh(0); const sbId = sb.l.reserve("run-sb", 1, 2, 5, "paid"); const liveTok = `${(await import("node:os")).hostname()}:${process.ppid}:abc123`;
writeFileSync(join(sb.dir, "spend.reserve.lock"), liveTok);
const sbL = new SpendLedger(sb.dir, undefined, { waitMs: 300 });
ok("C11.8 N6 PR review fail: with the lock held past the wait, settle writes nothing outside the lock (LedgerBusy; before 2b4332ff's fallback appended unlocked)", throws(() => sbL.settle(sbId, 0.25, "ok"), LedgerBusy, /ledger busy/) && !sb.lines().some((x) => x.type === "settle"));
rmSync(join(sb.dir, "spend.reserve.lock"));
// Break 3 m3, kept: the runner never pays twice because a settle was busy. A US$0 stub call whose answer arrives while
// another process holds the lock: one call, the answer kept, the reservation left at its worst case, the reason noted.
const rr = fresh(0); const rrL = new SpendLedger(rr.dir, undefined, { waitMs: 300 });
const INV = "prototype/p1/inventory/application-forms-guides.text.inventory.json";
const invSha = createHash("sha256").update(readFileSync(join(import.meta.dirname, "..", "..", "..", INV))).digest("hex");
let rrCalls = 0;
const rrCaller = Object.assign(async () => { rrCalls++; writeFileSync(join(rr.dir, "spend.reserve.lock"), liveTok); return { text: "{\"answer\":1}", stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } }; }, { kind: "stub" as const });
const rro = await runDrafting({ run_id: "run-rr", inputs: { official_files: [{ file: INV, sha256: invSha }] }, settings: { provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: "claude-opus-5-5", effort: "low", timeout_ms: 300000, max_attempts: 2, budget_usd: 5, max_output_tokens: 1000 } } as never, () => ({ system: "s", user: "u" }) as never, rrCaller as never, rrL, { allowStubDrafts: true } as never);
rmSync(join(rr.dir, "spend.reserve.lock"), { force: true });
ok("C11.8 N6 break 3 m3 pass: a busy settle keeps the answer: one call, completed, the reservation kept (no settle line), the reason noted", rrCalls === 1 && rro.status === "completed" && rro.text === "{\"answer\":1}" && !rr.lines().some((x) => x.type === "settle") && /counted at its worst case: ledger busy/.test(String((rro.attempts[0] as { settle_error?: string }).settle_error)), { rrCalls, s: rro.status, a: rro.attempts });
// PR #121 review (Devin): breakers of a stale lock take turns (a breaker's own short lock); a fresh lock is never moved.
const bt = fresh(0), btLock = join(bt.dir, "spend.reserve.lock"), btTurn = `${btLock}.break`;
writeFileSync(btLock, "crashed-holder"); const btOld = new Date(Date.now() - 60_000); utimesSync(btLock, btOld, btOld);
writeFileSync(btTurn, "");
const btHolder = spawn(process.execPath, ["-e", `setTimeout(()=>require("node:fs").unlinkSync(${JSON.stringify(btTurn)}),1000)`], { stdio: "ignore" });
const t6 = Date.now(); const btr = bt.l.reserve("run-bt", 1, 1, 5, "paid");
ok("C11.8 N6 PR review pass: while another breaker has its turn, a waiter does not touch the stale lock; it breaks it once the turn ends (≥ 1 s)", typeof btr === "string" && Date.now() - t6 >= 900 && !existsSync(btTurn) && !readdirSync(bt.dir).some((f) => /\.stale-|\.break$/.test(f)), Date.now() - t6);
btHolder.kill();
writeFileSync(btLock, "crashed-holder"); utimesSync(btLock, btOld, btOld); writeFileSync(btTurn, ""); utimesSync(btTurn, btOld, btOld);
const t7 = Date.now(); const btr2 = bt.l.reserve("run-bt", 2, 1, 5, "paid");
ok("C11.8 N6 PR review pass: a breaker's turn left by a crash (older than 5 s) is cleared, and the stale lock broken at once", typeof btr2 === "string" && Date.now() - t7 < 1_000 && !existsSync(btTurn), Date.now() - t7);
// Break 3 m7: the person's own unused Continue is used again only while it still fits the ceiling.
const rc = fresh(120); const rc1 = rc.l.recordOverride({ run_key: "rc", limits: ["experiment"], worst_usd: 6, by: "user-A" });
rc.l.reserve("other", 1, 0, 5, "paid"); appendFileSync(join(rc.dir, "spend.jsonl"), JSON.stringify({ type: "reserve", id: "late#1", run_id: "late", attempt: 1, worst_usd: 7, at: "2026-10-20T00:00:00.000Z" }) + "\n");
ok("C11.8 N6 break 3 m7 fail: spend arrived since (US$127 + US$6 past US$132): the own Continue is not handed back, the ceiling refuses", throws(() => rc.l.recordOverride({ run_key: "rc", limits: ["experiment"], worst_usd: 6, by: "user-A" }), OverrideRefused, /founder must raise the cap/) && !!rc1.id);

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
