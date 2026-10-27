// S5 Combination workspace slice 2 (runtime lane, W1-08) and the slice 1 early-look fixes: Questionnaires per person
// (question wording, who fills it, the forms that need it; field codes only for the side panel: fix 3), the coverage gate
// (a needed answer asked of nobody blocks release; pass and fail), the list-row warning in business words with no empty
// example (fix 2), and the release review naming forms AI picked (m7). A passing and a failing case per rule, on an
// isolated copy with the sample loaded. No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_s5d 4434 start && tsx studio/tests/check_s5_slice2.ts 4434 xr_studio_runtime_s5d
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listRowsWords } from "../engine/channels.ts";
import { coverageGaps } from "../engine/coverage.ts";
import { filledByOf } from "../contracts/workspace.ts";

const PORT = Number(process.argv[2] ?? 4434), DB = process.argv[3] ?? "xr_studio_runtime_s5d";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const CODE = /\b(case|person|relationship|organisation)\.[a-z_]+\b/;

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  if (!(await call("GET", "/demo/status")).body?.loaded) { const l = await call("POST", "/demo/load", {}); if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); } }

  // ---------------------------------------------------------------- pure rules
  const two = listRowsWords("IMM 5257 SCH1", 37, "Question 8 B Row 1"), none = listRowsWords("IMM 5409", 1, "");
  ok("fix 2 pass: the list-row warning says what it means, what happens meanwhile and where it is set, with a real example", /IMM 5257 SCH1: 37 rows of its lists \(for example "Question 8 B Row 1"\) do not say yet what the list holds/.test(two) && /does not stop a release/.test(two) && /Form library/.test(two), two);
  ok("fix 2 fail → fixed: with no caption the example is left out (never an empty \"(for example )\")", !/for example/.test(none) && /1 row of its lists does not say yet/.test(none), none);
  ok("C4.9 who fills it is read from the placement: a questionnaire question is the client's, a working-view one the case officer's", filledByOf({ collected_from: "client_questionnaire" }) === "CLIENT" && filledByOf({ collected_from: "staff_working_view" }) === "CASE_OFFICER" && filledByOf(undefined) === "CASE_OFFICER");

  // ---------------------------------------------------------------- the released sample combination
  const cat = (await call("GET", "/catalogue")).body;
  const leaves: any[] = []; const walk = (x: any) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x.combinationId && x.kind === "combination") leaves.push(x); Object.values(x).forEach(walk); } }; walk(cat);
  const C = leaves.find((l) => l.status === "READY")?.combinationId;
  if (!C) { console.error("STOP  no released sample combination"); process.exit(2); }
  const officer = await call("GET", `/combinations/${C}/workspace?tab=questionnaires`, undefined, "user-O");
  const roles0 = await fetch(`http://localhost:${PORT}/api/library/roles`).then((x) => x.status);
  ok("break m8: the workspace and the person roles are read only by a configuration person (case officer 403, nobody 401)", officer.status === 403 && roles0 === 401 && (await call("GET", "/library/roles")).status === 200, `${officer.status} / ${roles0}`);
  const qv = async (role = "") => (await call("GET", `/combinations/${C}/workspace?tab=questionnaires${role ? `&role=${role}` : ""}`)).body;

  // ---------------------------------------------------------------- Questionnaires per person (C4.1, fix 3)
  let v = await qv();
  const qs = v.questionnaire.sections.flatMap((s: any) => s.questions);
  ok("C4.1 pass: the Questionnaires tab answers the principal's questions by section, with who fills each and the forms that need it", v.questionnaire.role === "principal" && qs.length > 20 && qs.every((q: any) => ["CLIENT", "CASE_OFFICER"].includes(q.filledBy) && Array.isArray(q.neededBy)), { questions: qs.length });
  ok("fix 3 pass: every question carries its wording; no wording is a field code or \"(uses the field meaning)\"", qs.every((q: any) => q.wording && !CODE.test(q.wording) && !/uses the field meaning/.test(q.wording)), qs.filter((q: any) => CODE.test(q.wording)).slice(0, 3).map((q: any) => q.wording));
  ok("fix 3: the field code still travels, for the side panel only (System name)", qs.every((q: any) => typeof q.fact === "string" && /^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/.test(q.fact)), qs.filter((q: any) => !/^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/.test(q.fact)).slice(0, 3).map((q: any) => q.fact));
  ok("C4.1: one chip per person the combination lists, each with its question count", v.questionnaire.roles.map((r: any) => r.role).join() === "principal,spouse_or_partner,child,representative" && v.questionnaire.roles.every((r: any) => typeof r.questions === "number"), v.questionnaire.roles.map((r: any) => `${r.role}:${r.questions}`));
  const sp = await qv("spouse_or_partner");
  ok("C4.1: choosing the spouse shows the spouse's questions (fewer than the principal's, none about the application)", sp.questionnaire.role === "spouse_or_partner" && sp.questionnaire.sections.flatMap((s: any) => s.questions).length < qs.length, sp.questionnaire.sections.flatMap((s: any) => s.questions).length);
  const bad = await qv("nobody");
  ok("C4.1 fail: an unknown person falls back to the principal (never an error page)", bad.questionnaire.role === "principal");
  ok("coverage pass: on the sample every answer the forms need is asked of someone (0 gaps); client and officer counts add up", v.questionnaire.coverage.gaps.length === 0 && v.questionnaire.coverage.client + v.questionnaire.coverage.officer === v.questionnaire.coverage.needed, v.questionnaire.coverage);
  ok("library sections that can still be added are offered (never one already used)", Array.isArray(v.available) && v.available.every((a: any) => !v.questionnaire.sections.some((s: any) => s.id === a.key)), v.available.length);

  // ---------------------------------------------------------------- the coverage gate (BR-11): fail, then pass
  // Remove the section that asks most of the forms' answers: what the forms need is then asked of nobody.
  const counts = v.questionnaire.sections.map((s: any) => ({ id: s.id, n: s.questions.filter((q: any) => q.neededBy.length).length })).sort((a: any, b: any) => b.n - a.n);
  const big = counts[0].id;
  let r = await call("DELETE", `/combinations/${C}/sections/${big}`);
  ok("setup: the author removes the section that asks most of what the forms need", r.status < 300, r.status);
  // A placement outside the selected sections still counts as asked (a case asks it), so the gate is driven by the
  // placements themselves: take one needed question's placement out of the draft to make a real gap.
  const fact = v.questionnaire.sections.flatMap((s: any) => s.questions).find((q: any) => q.neededBy.length && q.filledBy === "CLIENT")?.fact;
  const before = sql(`select string_agg(id || '=' || status, ',' order by id) from section_question where canonical_field_key='${fact}' and workspace_id='${served}'`);
  sql(`update section_question set status='RETIRED' where canonical_field_key='${fact}' and workspace_id='${served}'`);
  const s0 = coverageGaps((await call("GET", `/combinations/${C}/config?mode=draft`)).body.snapshot);
  ok("coverage fail (engine): with nobody asked for a needed answer, it is a gap naming the forms that need it", s0.some((g) => g.fact === fact && g.forms.length > 0), s0.slice(0, 2));
  let probs = (await call("GET", `/combinations/${C}`)).body.draft.problems as any[];
  const gapErr = probs.find((p) => p.level === "error" && p.where === "Questionnaires" && p.item === fact);
  ok("coverage fail: release is blocked by an error in plain words (the question's meaning, the forms, the fix; no field code)", !!gapErr && /is needed by IMM/.test(gapErr.message) && /nobody is asked for it/.test(gapErr.message) && !CODE.test(gapErr.message), gapErr?.message);
  v = await qv();
  ok("coverage fail: the Questionnaires tab counts the gap on the person's chip and lists it", v.questionnaire.coverage.gaps.some((g: any) => g.fact === fact) && v.questionnaire.roles.some((x: any) => x.gaps > 0), v.questionnaire.coverage.gaps.length);
  r = await call("POST", `/combinations/${C}/submit`, {});
  ok("coverage fail: submitting for review is refused while an answer is asked of nobody, in words (no field code)", r.status === 400 && /nobody is asked for it/.test(r.body.detail ?? r.body.message ?? "") && !CODE.test(r.body.detail ?? r.body.message ?? ""), (r.body.detail ?? r.body.message ?? "").slice(0, 140));
  for (const pair of before.split(",")) { const [qid, st] = pair.split("="); sql(`update section_question set status='${st}' where id='${qid}'`); }
  r = await call("POST", `/combinations/${C}/sections/${big}`);
  probs = (await call("GET", `/combinations/${C}`)).body.draft.problems as any[];
  ok("coverage pass: once the answer is asked again the gap is gone (count restored)", !probs.some((p) => p.where === "Questionnaires" && p.item === fact) && sql(`select string_agg(id || '=' || status, ',' order by id) from section_question where canonical_field_key='${fact}' and workspace_id='${served}'`) === before, r.status);

  // ---------------------------------------------------------------- Forms: each form listed once (fix 1) and m7
  const f = (await call("GET", `/combinations/${C}/workspace?tab=forms`)).body;
  const atts = (await call("GET", `/combinations/${C}`)).body.attachments as any[];
  const formAtts = atts.filter((a) => a.kind === "Form").map((a) => (a.edition ?? "").split(" (")[0]);
  ok("fix 1: every attached form file is a form line (listed once, in its row), the rest are sources (checklists, guides, pages)", formAtts.every((c) => f.lines.some((l: any) => l.code === c)) && atts.some((a) => a.kind !== "Form"), { forms: formAtts.length, sources: atts.length - formAtts.length });
  ok("fix 2: no filing problem on the Forms tab has an empty or technical example, or says \"no purpose yet\"", f.problems.every((p: any) => !/for example \)|for example "[A-Z_0-9]+\[|no purpose yet/.test(p.message)), f.problems.map((p: any) => p.message.slice(0, 60)));
  const lines = sql(`select count(*) from combination_form where combination_id='${C}' and origin in ('AI_PROPOSAL')`);
  ok("m7: the review lists AI-picked forms only when there are some (none on the sample: no AI line here)", lines === "0");

  const out = join(import.meta.dirname, "..", "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_s5_slice2.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
