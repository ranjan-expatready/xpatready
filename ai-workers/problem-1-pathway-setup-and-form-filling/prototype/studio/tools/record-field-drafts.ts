// Scaffolding (S6 slice R, P-138 "the Load sample recording pass is the one logged exception"; never ported): one logged
// pass that records the draft and blind checker readings of every Sample form edition (api/src/field-drafts.ts), so Load
// sample and the queue replay real readings at US$0 instead of showing every box as Decide.
//   tsx studio/tools/record-field-drafts.ts                          plan only: per edition, saved or not, worst case, fits
//   tsx studio/tools/record-field-drafts.ts --live --max-usd <N>     records what is missing, smallest form first
// The plan runs first in both. Live needs both flags and the founder's go on the amount (plan §6 Q1, Sample). Before each
// round it re-reads what is left of the Wave 1 and experiment caps and stops when the round's worst case is above it or
// above --max-usd; a round above the runner's job budget is never sent. Every live call goes through the guarded
// launcher (p2/launch.ts: stub pass first, ledger, run cap). The log is written to studio/var/record-field-drafts.log.
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { SpendLedger } from "../../p2/ledger.ts";
import { EXPERIMENT_CAP_USD, WAVE1_CAP_USD, WAVE1_START } from "../../p2/policy.ts";
import { draftEdition, editionKey, roundCost, sampleEditions, type EditionSource } from "../api/src/field-drafts.ts";
import { NODE, PROTOTYPE, ROOT, STUDIO } from "../api/src/core.ts";
import { StepRunner } from "../api/src/rounds.ts";

const args = process.argv.slice(2);
const live = args.includes("--live");
const maxUsd = Number(args[args.indexOf("--max-usd") + 1]);
if (live && !(args.includes("--max-usd") && maxUsd > 0)) { console.error("--live needs --max-usd <N>, the amount the founder agreed"); process.exit(2); }

/** What is left of both caps now (p2/ledger.ts, the same numbers the launcher refuses by). */
export function leftUsd() {
  const l = new SpendLedger(join(PROTOTYPE, "p2", "ledger"));
  return Math.min(EXPERIMENT_CAP_USD - l.committed(), WAVE1_CAP_USD - l.committedSince(WAVE1_START));
}

/** The guarded launcher, as the server starts it (sources.ts launchProcess), for the runner. */
const launcher = {
  launchOnce: (jobId: string, mode: "stub" | "live", wanted?: () => Promise<boolean>) => new Promise<{ code: number; out: string; err: string; cancelled?: boolean }>(async (res) => {
    if (mode === "live" && wanted && !(await wanted())) return res({ code: 0, out: "", err: "", cancelled: true });
    const p = spawn(NODE, [join(PROTOTYPE, "p2", "launch.ts"), "--job", jobId, `--${mode}`], { cwd: ROOT });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => res({ code: code ?? 1, out, err }));
  }),
};
const runner = new StepRunner(launcher);
const LOG = join(STUDIO, "var", "record-field-drafts.log");
const log = (o: object) => { mkdirSync(join(STUDIO, "var"), { recursive: true }); appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...o }) + "\n"); };
const usd = (n: number) => `US$${n.toFixed(2)}`;

/** The plan: per edition and round, a saved reading (US$0) or a live one with its cost; nothing is sent. */
async function plan(eds: EditionSource[]) {
  const rows = [];
  for (const e of eds) {
    const saved = await draftEdition(runner, e, "replay", async () => false);
    const c = roundCost(e);
    const need = [!saved.draft.ok, !saved.check.ok].filter(Boolean).length;
    rows.push({ e, need, ...c });
  }
  return rows;
}

const eds = sampleEditions();
const rows = await plan(eds);
let worst = 0, about = 0;
console.log(`Sample form editions: ${eds.length} · left of the caps now ${usd(leftUsd())}${live ? ` · this pass at most ${usd(maxUsd)}` : " · plan only"}`);
for (const r of rows) {
  worst += r.need * r.worstUsd; about += r.need * r.attemptUsd;
  console.log(`${r.e.printed.padEnd(22)} ${String(r.e.fields).padStart(4)} boxes  ${r.need ? `${r.need} round${r.need > 1 ? "s" : ""} to record, about ${usd(r.attemptUsd)} each, worst ${usd(r.worstUsd)}` : "both readings saved, US$0"}${r.need && !r.fitsBudget ? "  · above the runner's job budget: not sent" : ""}`);
}
console.log(`To record: about ${usd(about)} at the output limit, worst ${usd(worst)} (Sample).`);
log({ step: "plan", live, max_usd: live ? maxUsd : null, left_usd: leftUsd(), about_usd: about, worst_usd: worst, editions: rows.map((r) => ({ key: editionKey(r.e), need: r.need, worst_usd: r.worstUsd, fits_budget: r.fitsBudget })) });

if (live) {
  let spent = 0;
  for (const r of rows.filter((x) => x.need)) {
    if (!r.fitsBudget) { console.log(`skip ${r.e.printed}: one attempt (${usd(r.attemptUsd)}) is above the runner's job budget`); log({ step: "skip", key: editionKey(r.e), why: "above runner budget" }); continue; }
    const roundWorst = r.need * r.worstUsd;
    if (roundWorst > leftUsd() || spent + roundWorst > maxUsd) { console.log(`stop before ${r.e.printed}: its worst case ${usd(roundWorst)} is above what is left (${usd(Math.min(leftUsd(), maxUsd - spent))})`); log({ step: "stop", key: editionKey(r.e), worst_usd: roundWorst }); break; }
    const got = await draftEdition(runner, r.e, "live", async () => true, `s6-record-${Date.now()}`);
    spent += got.costUsd;
    const say = (x: typeof got.draft) => x.ok ? `${x.from} ${x.runFile}` : `none: ${x.reason}`;
    console.log(`${r.e.printed}: draft ${say(got.draft)} · check ${say(got.check)} · ${usd(got.costUsd)}`);
    log({ step: "recorded", key: got.key, draft: got.draft.ok ? got.draft.runFile : got.draft.reason, check: got.check.ok ? got.check.runFile : got.check.reason, cost_usd: got.costUsd });
    if ((!got.draft.ok && got.draft.blocked) || (!got.check.ok && got.check.blocked)) break;
  }
  console.log(`Spent ${usd(spent)} in this pass.`);
}
