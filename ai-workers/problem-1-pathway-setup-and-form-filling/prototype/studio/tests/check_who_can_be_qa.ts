// Who can be › AI now, qa findings QA-84, QA-85 and the failure words (QA-88's runtime part) (runtime lane, 29 Oct).
// No server, no network, no key: the schema as the provider judges it, the count limits enforced after reading, and the
// real stub pass through p2/launch.ts with the stub answer. US$0.
//   tsx studio/tests/check_who_can_be_qa.ts        (from prototype/)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AI_FAILED, checkCounts, COUNT_LIMIT } from "../engine/people.ts";

const PROTO = join(import.meta.dirname, "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };

// ---- QA-84: no numeric limits in the schema; the limits hold in code
const schemaText = readFileSync(join(PROTO, "p2", "prompts", "who-can-be-output.v1.schema.json"), "utf8");
const NUMERIC = /"(minimum|maximum|exclusiveMinimum|exclusiveMaximum|multipleOf)"/;
ok("C11.12 QA-84 pass: who-can-be-output.v1.schema.json has no numeric limit the provider refuses", !NUMERIC.test(schemaText), (schemaText.match(NUMERIC) ?? [""])[0]);
const line = (role: string, min: number, max: number) => ({ role, min, max, applies: true, quote: "q", why: null });
const good = checkCounts({ people: [line("principal", 1, 1), line("child", 0, COUNT_LIMIT), line("spouse_or_partner", 0, 0)], unresolved: [] });
ok("C11.12 QA-84 pass: counts 0 to 9 with the least no more than the most are kept", good.kept.length === 3 && !good.dropped.length, good);
const bad = checkCounts({ people: [line("child", 0, 10), line("sponsor", -1, 1), line("spouse_or_partner", 2, 1), line("parent", 0.5, 2)], unresolved: [] });
ok("C11.12 QA-84 fail: 10, a negative, a least above the most and a fraction are dropped, never clamped", !bad.kept.length && bad.dropped.length === 4, bad.dropped.map((d) => d.role));
ok("C11.12 QA-84 fail: each dropped line says why in words (0 to 9)", bad.dropped.every((d) => /whole number from 0 to 9/.test(d.why)), bad.dropped[0]?.why);

// ---- QA-85: the stub answer exists, has the agreed shape, and the real stub pass runs
const stubFile = join(PROTO, "p2", "stubs", "who_can_be.json");
const stub = existsSync(stubFile) ? JSON.parse(readFileSync(stubFile, "utf8")) : null;
ok("C11.12 QA-85 pass: p2/stubs/who_can_be.json exists with people and unresolved lists", !!stub && Array.isArray(stub.people) && Array.isArray(stub.unresolved), stub);
const jobId = `studio-who-can-be-qa85-${Date.now().toString(36)}`;
const jobFile = join(PROTO, "p2", "jobs", `${jobId}.json`);
const job = { job_id: jobId, kind: "who_can_be", combination: "wp.family", configuration_version: "s5-who-can-be", template: "who-can-be.v1.md", output_schema: "who-can-be-output.v1.schema.json",
  inputs: [{ file: "prototype/p1/inventory/application-forms-guides.text.inventory.json", sha256: "5da676b8acbd2c42890e47be77c4006800ff6ba0656ff201d59736700789f124" }],
  settings: { provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: "claude-opus-5-5", effort: "low", timeout_ms: 300000, max_attempts: 2, budget_usd: 1, max_output_tokens: 3000 }, known: { combination_trail: "Work permit › Family" } };
const before = new Set(existsSync(join(PROTO, "p2", "runs")) ? readdirSync(join(PROTO, "p2", "runs")) : []);
writeFileSync(jobFile, JSON.stringify(job, null, 1) + "\n");
let out = "", code = 0;
// As the Studio's launchOnce does: another suite's launch may hold the experiment ledger, so a locked ledger waits.
try {
  for (let n = 0; n < 60; n++) {
    code = 0;
    try { out = execFileSync(process.execPath, [join(PROTO, "p2", "launch.ts"), "--job", jobId, "--stub"], { cwd: PROTO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 }); }
    catch (e: any) { code = e.status ?? 1; out = `${e.stdout ?? ""}${e.stderr ?? ""}`; }
    if (!code || !/ledger locked/i.test(out)) break;
    execFileSync("sleep", ["2"]);
  }
} finally { rmSync(jobFile, { force: true }); }
const lastLine = (() => { try { const j = JSON.parse(out.trim().split("\n").slice(-1)[0]); return { exit: j.exit, refused: j.refused, error: j.error, status: j.status }; } catch { return out.trim().slice(-300); } })();
ok("C11.12 QA-85 pass: the stub pass of a who_can_be job runs through p2/launch.ts (exit 0, no ENOENT)", code === 0 && !/ENOENT/.test(out), code ? lastLine : "");
for (const f of readdirSync(join(PROTO, "p2", "runs"))) if (!before.has(f) && f.includes(jobId)) rmSync(join(PROTO, "p2", "runs", f), { force: true });

// ---- QA-88 (runtime part): failure words are plain
const words = Object.values(AI_FAILED).join(" ");
ok("C11.8 QA-88 pass: Who can be's failure words are plain sentences", Object.values(AI_FAILED).every((w) => /^[A-Z].*\.$/.test(w)), AI_FAILED);
ok("C11.8 QA-88 fail-guard: no provider JSON, status code, error type or server path in them", !/\{|"type"|invalid_request|overloaded|ENOENT|\/Users\/|\b[45]\d\d\b/.test(words), words);
const src = readFileSync(join(import.meta.dirname, "..", "api", "src", "people-ai.ts"), "utf8");
ok("C11.8 QA-88 fail-guard: the launcher's own text never goes into a reason (it goes to the server log)", !/reason: `[^`]*\$\{String\(last\(/.test(src), "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
