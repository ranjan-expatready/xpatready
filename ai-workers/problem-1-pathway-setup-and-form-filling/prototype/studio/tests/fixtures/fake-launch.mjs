// Scaffolding (QA-34, P-69): stands in for p2/launch.ts on an isolated test copy started with STUDIO_FAKE_LAUNCHER (the
// server honours it only there), so the paid-call refusal and provider-limit paths of a live draft are tested with no
// network and no cost. The test writes the scenario to <STUDIO_VAR>/fake-launch.json:
//   { "stub": Step, "live": Step, "locked_first": true? }   Step = { exit, out?: {...}, err?: "...", record?: {...}, sleep_ms? }
// A step with a record writes it as the run file and prints {"run_file": …}; "locked_first" answers the first live call
// with the ledger's "ledger locked" (the server waits and launches again). Every call is appended to fake-launch.log.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VAR = process.env.STUDIO_VAR;
if (!VAR) { console.error("fake launcher: STUDIO_VAR is not set"); process.exit(2); }
const job = process.argv[process.argv.indexOf("--job") + 1];
const mode = process.argv.includes("--live") ? "live" : "stub";
const scenario = JSON.parse(readFileSync(join(VAR, "fake-launch.json"), "utf8"));
appendFileSync(join(VAR, "fake-launch.log"), `${JSON.stringify({ job, mode, at: new Date().toISOString() })}\n`);
const count = join(VAR, "fake-launch.count");
const n = existsSync(count) ? Number(readFileSync(count, "utf8")) : 0;
if (mode === "live") writeFileSync(count, String(n + 1));
if (mode === "live" && scenario.locked_first && n === 0) { console.error("refused: ledger locked by another launch"); process.exit(1); }
const step = scenario[mode] ?? { exit: 0, out: { ok: true } };
// A slow step, so a test can cancel while it runs (QA-31, QA-32).
if (step.sleep_ms) await new Promise((r) => setTimeout(r, step.sleep_ms));
let out = step.out ?? {};
if (step.record) {
  mkdirSync(join(VAR, "fake-runs"), { recursive: true });
  const file = join(VAR, "fake-runs", `${job}-${mode}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(step.record));
  out = { ...out, run_file: file };
}
if (step.err) console.error(step.err);
if (Object.keys(out).length) console.log(JSON.stringify(out));
process.exit(step.exit ?? 0);
