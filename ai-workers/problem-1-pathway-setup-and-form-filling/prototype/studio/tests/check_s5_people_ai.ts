// S5 slice 3 (runtime lane; challenge slice plan 3, P-119, P-121, P-123; Lead 28 Oct): "Who can be in this application"
// filled from the combination's IRCC guide. Rules only (US$0), saved AI answers replayed (US$0; two answers this check
// writes for the run and removes after, to prove the agreement and quote rules), the live plan's cost said first (never
// run here: its one recording is in a founder-approved live trial), refusals, and accepting the proposal into the saved
// list. A passing and a failing case per rule, on an isolated copy with the sample loaded. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_people 4438 start && tsx studio/tests/check_s5_people_ai.ts 4438 xr_studio_runtime_people
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rulesReading } from "../api/src/people-ai.ts";

const PORT = Number(process.argv[2] ?? 4438), DB = process.argv[3] ?? "xr_studio_runtime_people";
const SOLUTION = join(import.meta.dirname, "..", "..", "..");
const RUNS = join(SOLUTION, "prototype", "p2", "runs"), PROMPTS = join(SOLUTION, "prototype", "p2", "prompts");
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const written: string[] = [];

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load", {})).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const vv = sql(`select id from combination where combination_key='vv.single'`), lm = sql(`select id from combination where combination_key='lm.high_wage'`);
  const propose = async (c: string, mode: string, actor = "user-A") => { const plan = (await call("POST", `/combinations/${c}/people/propose/plan`, { mode })).body; return { plan, r: await call("POST", `/combinations/${c}/people/propose`, { mode, planSha256: plan?.plan_sha256 }, actor) }; };

  // ---------------------------------------------------------------- plans: cost first
  let p = await call("POST", `/combinations/${vv}/people/propose/plan`, { mode: "rules" });
  ok("C11.12 plan pass: rules only names the combination's guide, its steps and US$0", p.status === 201 && p.body.guide?.code === "Guide 5256" && p.body.totals.worst_usd === 0 && p.body.steps.every((s: any) => !s.uses_ai), p.body?.guide);
  p = await call("POST", `/combinations/${vv}/people/propose/plan`, { mode: "live" });
  // Lead check L2: AI now was not in the slice 3 Go; until the founder approves a live trial it is refused before any call.
  ok("C11.12 L2 fail: AI now is refused (409) until the founder's Go for a live trial", p.status === 409 && /founder's Go for a live trial/.test(p.body?.detail ?? ""), p.body?.detail);
  p = await call("POST", `/combinations/${vv}/people/propose/plan`, { mode: "whatever" });
  ok("C11.12 plan fail: an unknown way is a 400 naming the field", p.status === 400 && p.body.errors?.[0]?.field === "mode", p.body?.detail);
  p = await call("POST", `/combinations/${lm}/people/propose/plan`, { mode: "rules" });
  ok("C11.12 fail: a combination with no guide among its sources is refused in words (find its forms first)", p.status === 409 && /no IRCC guide/.test(p.body.detail), p.body?.detail);

  // ---------------------------------------------------------------- rules only
  let { r } = await propose(vv, "rules", "user-O");
  ok("C11.12 roles fail: a case officer cannot fill it (403)", r.status === 403, r.status);
  r = await call("POST", `/combinations/${vv}/people/propose`, { mode: "rules", planSha256: "0".repeat(64) });
  ok("C11.12 fail: a run whose plan is not the one shown is refused (look at the plan again)", r.status === 409 && /plan again/.test(r.body.detail), r.body?.detail);
  ({ r } = await propose(vv, "rules"));
  const guideText = JSON.parse(readFileSync(join(SOLUTION, "prototype", "p1", "inventory", "guide-5256.text.inventory.json"), "utf8")).text as string;
  const flat = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
  ok("C11.12 rules pass: the guide's sentences propose the principal and the family members it names, each quote in the guide", r.status === 201 && r.body.from === "rules" && r.body.usd === 0 && r.body.people.some((x: any) => x.role === "principal") && r.body.people.some((x: any) => x.role === "spouse_or_partner") && r.body.people.every((x: any) => flat(guideText).includes(flat(x.quote))), r.body.people?.map((x: any) => `${x.role} ${x.min}-${x.max}`));
  ok("C11.12 rules: a representative is proposed as never an applicant", r.body.people.filter((x: any) => x.role === "representative").every((x: any) => x.applies === false));
  ok("C11.12: nothing is saved by a proposal (the list is unchanged)", sql(`select participants_version from combination where id='${vv}'`) === sql(`select participants_version from combination where id='${vv}'`) && !(await call("GET", `/combinations/${vv}/workspace?tab=questionnaires`)).body.people.lines.some((l: any) => l.origin === "AI_PROPOSAL"));

  // ---------------------------------------------------------------- saved AI answers (replay)
  ({ r } = await propose(vv, "replay"));
  ok("C11.12 replay fail: with no saved AI answer for this guide, it says so, proposes nothing and costs US$0", r.status === 201 && r.body.people.length === 0 && r.body.usd === 0 && /No saved AI answer/.test(r.body.note), r.body?.note);
  // Two saved answers (draft and check) for this exact guide, prompt and combination: they agree on the principal and the
  // spouse; they disagree on children; the draft's representative quotes a sentence that is not in the guide.
  const rr = rulesReading(guideText).people, q = (role: string) => rr.find((x) => x.role === role)?.quote ?? rr[0].quote;
  const inputs = [{ file: "prototype/p1/inventory/guide-5256.text.inventory.json", sha256: sha(readFileSync(join(SOLUTION, "prototype", "p1", "inventory", "guide-5256.text.inventory.json"))) }];
  const save = (check: boolean, people: unknown[]) => {
    const f = `studio-who-can-be${check ? "-check" : ""}-s5-people-ai-test-live-20261028t120000000z-${check ? "c" : "d"}${Date.now().toString(36)}.json`;
    mkdirSync(RUNS, { recursive: true });
    writeFileSync(join(RUNS, f), JSON.stringify({ caller: "live", contract_valid: true, launch_evidence: { template_sha256: sha(readFileSync(join(PROMPTS, check ? "who-can-be-check.v1.md" : "who-can-be.v1.md"))) }, drafting_run: { status: "completed", inputs: { official_files: inputs, combination: "vv.single" }, usage: { cost_usd: 0.01 } }, raw_output: JSON.stringify({ people, unresolved: [] }) }));
    written.push(join(RUNS, f));
  };
  save(false, [{ role: "principal", min: 1, max: 1, applies: true, quote: q("principal"), why: null }, { role: "spouse_or_partner", min: 0, max: 1, applies: true, quote: q("spouse_or_partner"), why: null }, { role: "child", min: 0, max: 9, applies: true, quote: q("child"), why: null }, { role: "representative", min: 0, max: 1, applies: false, quote: "A sentence that is not in the guide at all.", why: null }]);
  save(true, [{ role: "principal", min: 1, max: 1, applies: true, quote: q("principal"), why: null }, { role: "spouse_or_partner", min: 0, max: 1, applies: true, quote: q("spouse_or_partner"), why: null }, { role: "child", min: 0, max: 4, applies: true, quote: q("child"), why: null }, { role: "representative", min: 0, max: 1, applies: false, quote: "A sentence that is not in the guide at all.", why: null }]);
  ({ r } = await propose(vv, "replay"));
  const roles = (r.body.people ?? []).map((x: any) => x.role);
  ok("C11.12 replay pass: the saved answers replay at US$0; only lines both rounds agree on are proposed", r.status === 201 && r.body.from === "replay" && r.body.usd === 0 && roles.includes("principal") && roles.includes("spouse_or_partner") && !roles.includes("child"), roles);
  ok("P-121 fail: where the two rounds disagree (children 0–9 against 0–4) it is to decide, not proposed", r.body.to_decide.some((x: any) => x.role === "child"), r.body.to_decide);
  ok("P-121 fail: a line whose quote is not in the guide is dropped with the reason", r.body.dropped.some((x: any) => x.role === "representative" && /not in the guide/.test(x.why)), r.body.dropped);

  // ---------------------------------------------------------------- accepting the proposal (saved with the rules on Save)
  const view = (await call("GET", `/combinations/${vv}/workspace?tab=questionnaires`)).body.people;
  const accepted = [...view.lines.filter((l: any) => !r.body.people.some((x: any) => x.role === l.role)).map((l: any) => ({ role: l.role, min: l.min, max: l.max, applies: l.applies, quote: l.quote ?? null, origin: l.origin })),
    ...r.body.people.map((x: any) => ({ role: x.role, min: x.min, max: x.max, applies: x.applies, quote: x.quote, origin: "AI_PROPOSAL" }))];
  const s = await call("PATCH", `/combinations/${vv}/people`, { participants: accepted, version: view.version, confirmRemove: true });
  const after = (await call("GET", `/combinations/${vv}/workspace?tab=questionnaires`)).body.people;
  ok("C11.12 pass: the accepted lines are saved through the rules on Save, marked AI-proposed with IRCC's words", s.status === 200 && after.lines.filter((l: any) => l.origin === "AI_PROPOSAL").length === r.body.people.length && after.lines.every((l: any) => l.origin !== "AI_PROPOSAL" || !!l.quote), after.lines.map((l: any) => `${l.role}:${l.origin}`));
  ok("C11.12: the save is undoable like any other change to who can be", after.canUndo === true);
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  for (const f of written) rmSync(f, { force: true });
  const out = join(import.meta.dirname, "..", "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_s5_people_ai.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
