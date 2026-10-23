// QA-2 (Major, C3.3): the AI drafting suite must pass on main however many saved IMM 1344 answers exist.
// Replays the builders' suite unchanged (no database, no server, no model call) and reads its result.
// FAILS today (main d75602b2: it expects exactly four saved real IMM 1344 answers; six are on file, so it reports FAIL and
// crashes); PASSES once the suite picks its four refused runs by name (Lead check 23 Oct, finding 2).
//   tsx studio/tests/qa/check_qa2_ai_drafting.ts
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, "..", "..");
const saved = readdirSync(join(STUDIO, "..", "p2", "runs")).filter((f) => /^studio-fieldmap-imm1344e-live-.*z\.json$/.test(f));
const r = spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), [join(STUDIO, "tests", "check_ai_drafting.ts")], { cwd: STUDIO, encoding: "utf8", env: { ...process.env, ANTHROPIC_BASE_URL: "http://127.0.0.1:9/qa-no-paid-ai" } });
const out = `${r.stdout}\n${r.stderr}`;
const fails = out.split("\n").filter((l) => l.startsWith("FAIL"));
const passes = out.split("\n").filter((l) => l.startsWith("PASS")).length;
const crashed = r.status !== 0 && /Error|at /.test(r.stderr);
console.log(`saved real IMM 1344 answers on file: ${saved.length}`);
console.log(`${fails.length ? "FAIL" : "PASS"}  QA-2: check_ai_drafting.ts passes with no FAIL line — ${passes} pass, ${fails.length} fail${fails.length ? `: ${fails.map((l) => l.slice(6, 90)).join(" | ")}` : ""}`);
console.log(`${crashed || r.status !== 0 ? "FAIL" : "PASS"}  QA-2: check_ai_drafting.ts runs to the end (exit ${r.status})${crashed ? ` — ${r.stderr.split("\n").find((l) => /Error/.test(l))?.slice(0, 160)}` : ""}`);
process.exit(fails.length || r.status !== 0 ? 1 : 0);
