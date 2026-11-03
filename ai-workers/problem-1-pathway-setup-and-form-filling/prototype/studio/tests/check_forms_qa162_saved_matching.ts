// QA-162 (C4.7, C4.11 step 5; P-227 a paid result is usable as Saved, P-76): the saved real AI answers of #530 (PQR picks,
// 13 + 10 picks) and #531 (conditional questions, 11 + 11) replayed at US$0 on Visitor visa, configured the way the
// runtime lane configures it (tests/runtime/setup_visitor_visa.ts: IMM 5257 by replay, its questions placed). Reports how
// many picks and conditions land vs are left out, before (the exact-words matcher) and now (engine/fact-words.ts), and
// checks the rules a tolerant match must keep: every left-out one has its reason, none lands on a question it does not
// name, a match in other words is never Ready. Reads the copy's database; sends nothing; NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_qa162 4452 start && tsx studio/tests/check_forms_qa162_saved_matching.ts 4452 xr_studio_forms_qa162
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { buildSnapshot } from "../engine/snapshot.ts";
import { factSources } from "../engine/sources.ts";
import { pqrPicksFromRounds, type PqrAnswer, type Round } from "../engine/pqr-picks.ts";
import { conditionsFromRounds, type CondAnswer, type CondRound } from "../engine/qd-conditions.ts";
import { namesOf } from "../engine/fact-words.ts";
import { questionList } from "../api/src/pqr-drafts.ts";
import { admitInput } from "../../p2/guard.ts";
import { buildRequest } from "../../p2/prompt.ts";

const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_qa162";
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), SOLUTION = join(PROTOTYPE, "..");
const RUNS = join(PROTOTYPE, "p2", "runs");
/** The saved real runs (#530, #531; Visitor visa, Guide 5256), by name: this check is about these results. */
const SAVED = {
  pqr: { draft: "studio-pqr-picks-temporary-residence-visitors-visitor-vis-477759eb-live-20261102t130120961z-f7bbaa.json", check: "studio-pqr-picks-check-temporary-residence-visitors-visitor-vis-477759eb-live-20261102t130134336z-f5e99a.json" },
  cond: { draft: "studio-qd-conditions-temporary-residence-visitors-visitor-vis-477759eb-live-20261102t130144620z-2e8c49.json", check: "studio-qd-conditions-check-temporary-residence-visitors-visitor-vis-477759eb-live-20261102t130158741z-1b68c1.json" },
};
const GUIDE = "prototype/p1/inventory/guide-5256.text.inventory.json";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const saved = <T>(f: string) => ({ output: JSON.parse(String(JSON.parse(readFileSync(join(RUNS, f), "utf8")).raw_output)) as T, from: "replay" as const, runFile: `prototype/p2/runs/${f}`, costUsd: 0 });

(async () => {
  // Setup: Visitor visa configured and released as the runtime lane does it (US$0), unless this copy has it already.
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://xr_studio@127.0.0.1:54329/${DB}` }) } as never);
  const vvId = () => { try { return sql(`select id from combination where combination_key='vv.single'`); } catch { return ""; } };
  const draftOf = async (id: string) => (await buildSnapshot(db as never, sql(`select workspace_id from combination where id='${id}'`), id, "draft")).snapshot;
  let vv = vvId(), s = vv ? await draftOf(vv) : null;
  if (!s || factSources(s).filter((f) => f.placed).length < 100) {
    try { execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), [join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 }); }
    catch { console.error("STOP  setup_visitor_visa.ts did not configure Visitor visa on this copy"); process.exit(2); }
    vv = vvId(); s = await draftOf(vv);
  }
  await db.$disconnect();
  const facts = factSources(s);
  ok("setup: Visitor visa asks its questions (placed facts)", facts.filter((f) => f.placed).length > 100, facts.filter((f) => f.placed).length);
  const text = String(JSON.parse(readFileSync(join(SOLUTION, GUIDE), "utf8")).text);
  const guide = { file: GUIDE, sha256: "0".repeat(64), text, code: "Guide 5256" };
  const at = { runId: "00000000-0000-4000-8000-000000000000", combinationId: vv };
  const names = namesOf(s.placements as { fact: string; question_text?: string | null }[]);

  // Before (the exact-words matcher, as on main before QA-162): a pick lands only when its words are exactly a question's
  // label, the last part of its key, or the key. Replicated here for the report only.
  const plain = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const exactOne = (role: string, asks: string, pool = facts) => pool.filter((f) => f.role === role && (plain(f.label) === plain(asks) || plain(f.fact.split(".").pop()!.replace(/_/g, " ")) === plain(asks) || f.fact === asks.trim())).length === 1;

  // ---- C4.7: the saved PQR picks
  const pd = saved<PqrAnswer>(SAVED.pqr.draft), pk = saved<PqrAnswer>(SAVED.pqr.check);
  const picks = pd.output.picks.length + pk.output.picks.length;
  const p = pqrPicksFromRounds(s, { draft: pd as Round, check: pk as Round }, guide, at, names);
  const pLanded = picks - p.dropped.length;
  const pBefore = [...pd.output.picks, ...pk.output.picks].filter((x) => exactOne(x.role, x.asks)).length;
  console.log(`\nC4.7 saved PQR picks (#530): ${picks} picks in two rounds → before ${pBefore} landed, ${picks - pBefore} left out; now ${pLanded} landed (${p.items.length} items: ${p.items.filter((x) => x.confidence === "ready").length} Ready, ${p.items.filter((x) => x.confidence === "check").length} Check, ${p.items.filter((x) => x.confidence === "decide").length} Decide), ${p.dropped.length} left out`);
  for (const x of p.items) console.log(`   lands  ${x.payload.kind === "pqr_pick" ? `${x.payload.role} ${x.payload.factKey}` : ""} · ${x.confidence}`);
  for (const x of p.dropped) console.log(`   out    ${x.role} "${x.asks}": ${x.why}`);
  // QA-194: 13 → 10, since "Purpose of visit" (×2) and "Criminal record" each fit two questions and are no longer guessed.
  ok("QA-162 pass: the saved PQR picks land well above the 2 of 23 before (at least 10 picks)", pLanded >= 10 && pLanded > pBefore, { before: pBefore, now: pLanded });
  const landsOn = (fact: string) => p.items.some((x) => x.payload.kind === "pqr_pick" && x.payload.factKey === fact);
  ok("C4.7 fail (QA-194): \"Purpose of visit\" fits the purpose and its 'other' details, so it is left out naming both, never guessed", !landsOn("case.visit_purpose_other") && p.dropped.filter((x) => x.asks === "Purpose of visit").length === 2 && p.dropped.filter((x) => x.asks === "Purpose of visit").every((x) => /could be 2 questions/.test(x.why) && /Purpose of the visit to Canada/.test(x.why) && /when it is 'other'/.test(x.why)), p.dropped.find((x) => x.asks === "Purpose of visit"));
  ok("QA-162 pass: \"Funds available for stay\" lands on the funds question", landsOn("case.funds_available_cad"));
  ok("C4.7 fail (QA-194): \"Criminal record\" fits criminal history and its details, so it is left out naming both; the details are never taken", !landsOn("person.criminal_history_details") && p.dropped.some((x) => x.asks === "Criminal record" && /could be 2 questions/.test(x.why) && /Details of criminal history/.test(x.why)), p.dropped.find((x) => x.asks === "Criminal record"));
  ok("QA-162 pass: \"Accompanying spouse or partner\" and \"Accompanying children\" land on each person's own question", p.items.some((x) => x.payload.kind === "pqr_pick" && x.payload.role === "spouse_or_partner" && x.payload.factKey === "relationship.accompanies_subject_to_canada") && p.items.some((x) => x.payload.kind === "pqr_pick" && x.payload.role === "child" && x.payload.factKey === "relationship.accompanies_subject_to_canada"));
  ok("QA-162 fail: \"Planned dates of stay\" names two questions (first and last day), so it is left out naming both, never guessed", p.dropped.some((x) => x.asks === "Planned dates of stay" && /could be 2 questions/.test(x.why) && /first day/.test(x.why) && /last day/.test(x.why)), p.dropped.find((x) => x.asks === "Planned dates of stay"));
  ok("QA-162 fail: a fact no question asks (\"Ever held Canadian PR\", \"Ties to home country\") is left out with its reason", ["Ever held Canadian PR", "Ties to home country", "Valid passport"].every((a) => p.dropped.some((x) => x.asks === a && /No question of this combination asks/.test(x.why))));
  ok("QA-162 pass: every pick left out has its reason in words, and every pick is either landed or left out", p.dropped.every((x) => x.why.length > 20) && pLanded + p.dropped.length === picks);
  const readings = p.items.reduce((n, x) => n + (x.rounds.draft ? 1 : 0) + (x.rounds.check ? 1 : 0), 0);
  ok("QA-162 pass (review m3): every landed pick is a reading of an item on To review (none vanishes between landed and proposed)", readings === pLanded, { readings, landed: pLanded });
  const twice = pqrPicksFromRounds(s, { draft: { ...pd, output: { ...pd.output, picks: [...pd.output.picks, pd.output.picks.find((x) => /^Funds/.test(x.asks))!] } } as Round, check: pk as Round }, guide, at, names);
  ok("QA-162 fail (review m3): the same question picked twice in one reading is listed as left out, with the reason, never dropped silently", twice.dropped.length === p.dropped.length + 1 && twice.dropped.some((x) => /^Funds/.test(x.asks) && /already picked once in this reading/.test(x.why)) && twice.items.length === p.items.length);
  ok("QA-162 pass: a pick named in other words than the question's own is never Ready, and says what the AI wrote", p.items.filter((x) => x.rules.some((r) => r.rule === "named_exactly" && !r.passed)).every((x) => x.confidence !== "ready" && /in the AI's own words: "|The AI wrote "/.test(x.reason ?? "") && x.rules.some((r) => r.rule === "named_exactly" && /taken as/.test(r.why ?? ""))));

  // ---- C4.11 step 5: the saved conditional questions
  const cd = saved<CondAnswer>(SAVED.cond.draft), ck = saved<CondAnswer>(SAVED.cond.check);
  const conds = cd.output.conditions.length + ck.output.conditions.length;
  const c = conditionsFromRounds(s, { draft: cd as CondRound, check: ck as CondRound }, guide, at, names);
  const cLanded = conds - c.dropped.length;
  const asked = facts.filter((f) => f.placed && f.forms.length > 0);
  const cBefore = [...cd.output.conditions, ...ck.output.conditions].filter((x) => exactOne(x.role, x.asks, asked) && exactOne(x.role, x.depends_on, asked)).length;
  console.log(`\nC4.11 step 5 saved conditions (#531): ${conds} conditions in two rounds → before ${cBefore} named both questions; now ${cLanded} landed (${c.items.length} items: ${c.items.filter((x) => x.confidence === "ready").length} Ready, ${c.items.filter((x) => x.confidence === "check").length} Check, ${c.items.filter((x) => x.confidence === "decide").length} Decide), ${c.dropped.length} left out`);
  for (const x of c.items) console.log(`   lands  ${x.payload.kind === "condition" ? x.payload.condition.sentence : ""} · ${x.confidence}`);
  for (const x of c.dropped) console.log(`   out    "${x.asks}": ${x.why}`);
  const tree = (target: string) => c.items.find((x) => x.payload.kind === "condition" && x.payload.target.key === target);
  ok("C4.11 fail (QA-194): \"Other purpose details\" is left out in both readings: its decider \"Purpose of visit\" fits the purpose and the details, both named, never guessed", !tree("case.visit_purpose_other") && c.dropped.filter((x) => /"Purpose of visit" \(what decides/.test(x.why)).length === 2 && c.dropped.filter((x) => /"Purpose of visit" \(what decides/.test(x.why)).every((x) => /could be 2 questions/.test(x.why) && /Purpose of the visit to Canada/.test(x.why)), c.dropped.find((x) => /"Purpose of visit"/.test(x.why)));
  ok("QA-162 pass: \"Military service dates and countries\" when the person served lands on military service details, decided by military service", (() => { const x = tree("person.military_service_details"); return !!x && x.payload.kind === "condition" && (x.payload.condition.tree as { field?: string }).field === "person.military_service"; })());
  ok("QA-162 fail: a deciding question no question asks (\"Ever used other name\") leaves its condition out with the reason", c.dropped.some((x) => /"Ever used other name"/.test(x.why) && /not a question this combination asks|could be \d+ questions/.test(x.why)) && !c.items.some((x) => x.payload.kind === "condition" && /other name/i.test(x.payload.condition.sentence)));
  ok("QA-162 fail: words that fit several questions (\"Other names used\") are left out naming them, never guessed", c.dropped.some((x) => x.asks === "Other names used" && /could be 2 questions/.test(x.why)), c.dropped.find((x) => x.asks === "Other names used"));
  ok("QA-162 pass: more saved conditions land than the 0 of 22 before", cLanded > cBefore && cLanded > 0, { before: cBefore, now: cLanded });
  ok("QA-162 pass: every condition left out has its reason, and every condition is landed or left out", c.dropped.every((x) => x.why.length > 20) && cLanded + c.dropped.length === conds);
  const cReadings = c.items.reduce((n, x) => n + (x.rounds.draft ? 1 : 0) + (x.rounds.check ? 1 : 0), 0);
  ok("QA-162 pass (review m3): every landed condition is a reading of an item on To review", cReadings === cLanded, { cReadings, landed: cLanded });
  ok("QA-162 pass: a condition named in other words is never Ready", c.items.filter((x) => x.rules.some((r) => r.rule === "named_exactly" && !r.passed)).every((x) => x.confidence !== "ready"));

  // ---- the question list a Live v2 round now sends (no call here): made from this draft, admitted by the launcher's guard
  const ql = questionList("vv.single", s);
  let sent = "";
  try { sent = ql ? buildRequest("system", {}, [admitInput(ql.file, ql.sha256)]).user : ""; } catch (e) { sent = `refused: ${(e as Error).message}`; }
  ok("QA-162 pass: Visitor visa's question list (for future Live rounds) is admitted by the launcher's guard and lists each question as role | key | label", sent.includes("case | case.visit_purpose | Purpose of the visit to Canada") && sent.includes("principal | person.criminal_history |"), sent.slice(0, 200));
  ok("QA-162 pass: it never lists the representative's (the firm's) questions", !!ql && !/^representative \|/m.test(sent));

  // Break M1: the plan's checksum covers the question list, so a list changed after the plan was looked at refuses the run.
  const planOf = async () => (await (await fetch(`http://localhost:${PORT}/api/combinations/${vv}/pqr-picks/plan`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify({ mode: "replay" }) })).json()) as { plan_sha256?: string; guide?: { questions?: string } };
  const p1 = await planOf();
  const fid = sql(`select id from canonical_field where canonical_field_key='case.visit_purpose' order by version desc limit 1`), was = sql(`select meaning from canonical_field where id='${fid}'`);
  sql(`update canonical_field set meaning = meaning || ' (edited)' where id='${fid}'`);
  const p2 = await planOf();
  sql(`update canonical_field set meaning = '${was.replace(/'/g, "''")}' where id='${fid}'`);
  ok("QA-162 fail (break M1): a question's label changed after the plan gives another question list and another plan checksum", !!p1.plan_sha256 && !!p2.plan_sha256 && p1.guide?.questions !== p2.guide?.questions && p1.plan_sha256 !== p2.plan_sha256, { a: p1.guide?.questions, b: p2.guide?.questions });

  console.log(`\nQA-162 counts — C4.7 picks: before ${pBefore}/${picks}, now ${pLanded}/${picks} · C4.11 step 5 conditions: before ${cBefore}/${conds}, now ${cLanded}/${conds} (port ${PORT})`);
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})();
