// QA-318 (C7.2; P-46, P-171): IMM 5257 SCH1 (09-2023) kept 5 mandatory Yes/No form fields empty under "Facts confirmed" on a
// fully answered family case. Causes and fixes:
//   Questions 4 and 7 (military service, government positions): the release's map reads the person's own Yes/No answer
//     through a drafted prose step, "derive: true if any … is recorded for the subject, else false", which the filler did not
//     run ("not in the executable set"). The filler now runs it (p5/transforms.ts PROSE_RECORDED): a Yes/No answer is written
//     as given; a confirmed "none apply" writes No; a recorded entry writes Yes, unless the form counts only some entries.
//   Question 8 (previous travel): the same prose, with the form's own limits (trips since 18 or in the past five years, to
//     other countries): "none apply" writes No; recorded trips are decided by a person, in those words (never a guess).
//   Questions 5 and 6 (ill treatment; violent or criminal organizations): no question asked them. They are asked as their
//     own Yes/No questions in the form's words (samples/own-yes-no.json, the configured checkpoint only, B116's door).
//   And a mandatory form field that still needs an answer is a fact to answer ("not answered"), never "left empty" under
//     "Facts confirmed" (engine/runtime/forms.ts formHoldsBack).
// Part A: the filler's step, a pass and a fail per rule (no server). Part B: the Sample family's Visitor visa case on the
// configured checkpoint (load it first), through the API. Sample people and values; Unconfirmed: expert. US$0, no AI.
//   zsh studio/tools/isolated.sh rt_qa318 4436 start && curl -s -X POST -H content-type:application/json -H x-actor:user-A -d '{"sample":"configured"}' localhost:4436/api/demo/load && tsx studio/tests/check_qa318_sch1.ts 4436 xr_studio_rt_qa318
import * as T from "../../p5/transforms.ts"; // a namespace, so the suite also runs (and fails) on code before QA-318
const { runTransform } = T;
const proseRecorded = (t: string) => !!(T as { proseRecorded?: (x: string) => boolean }).proseRecorded?.(t);
import { agent, call, FAMILY, fillEverything, firms, generateCopy, main, ok, openCase, OFFICER, sql } from "../acceptance/lib/m3.ts";

const SERVED = "derive: true if any military/militia/civil defence/security/police service period is recorded for the subject, else false -> yes_no_code:true/false";
const TRAVEL = "derive: true if any recorded trip, starting after the later of the subject's 18th birthday or five years before the application date, went to a country other than the subject's countries of citizenship and current country of residence, else false -> yes_no_code:true/false";
const box = { data_path: "Schedule1[0].MilitaryServiceInfo[0].ServedInMilitary[0]", options: [["*Yes", "true"], ["*No", "false"]] } as never;
const val = (o: ReturnType<typeof runTransform>) => (o.ok ? o.value : "hand" in o && o.hand ? `hand: ${o.reason}` : `blank: ${o.reason}`);
const BOXES = { served: "MilitaryServiceInfo[0].ServedInMilitary[0]", ill: "WarHumanityCrimesInfo[0].HaveWitnessedParticipated[0]", org: "MembershipAssociationInfo[0].BeenMemberAssociated[0]", gov: "GovernmentPositionsInfo[0].HeldGovernmentPositions[0]", travel: "PreviousTravelInfo[0].TraveledOtherCountry[0]" } as const;

await main("QA-318", "IMM 5257 SCH1's five mandatory Yes/No form fields fill, or say honestly what they wait for", async () => {
  // ---------------------------------------------------------------- Part A: the filler's prose Yes/No step
  ok("QA-318 A1 pass: the drafted prose Yes/No is recognised (both shapes)", proseRecorded(SERVED) && proseRecorded(TRAVEL) && !proseRecorded("as_is") && !proseRecorded("derived:person.national_id_number recorded -> yes_no_code:Y/N"));
  ok("QA-318 A2 pass: the person's own Yes writes the form's Yes code", val(runTransform(SERVED, true, box)) === "true", val(runTransform(SERVED, true, box)));
  ok("QA-318 A3 pass: the person's own No writes the form's No code (never left empty)", val(runTransform(SERVED, false, box)) === "false", val(runTransform(SERVED, false, box)));
  ok("QA-318 A4 fail: no answer writes nothing (blank, never a guessed No)", /^blank/.test(val(runTransform(SERVED, undefined, box))) && /^blank/.test(val(runTransform(TRAVEL, [], box))), [val(runTransform(SERVED, undefined, box)), val(runTransform(TRAVEL, [], box))]);
  ok("QA-318 A5 pass: a confirmed \"none apply\" (the caller's nothingRecorded) writes No", val(runTransform(TRAVEL, null, box, { nothingRecorded: true })) === "false", val(runTransform(TRAVEL, null, box, { nothingRecorded: true })));
  ok("QA-318 A6 pass: an entry recorded writes Yes when the form counts every entry", val(runTransform(SERVED, ["CAN"], box)) === "true", val(runTransform(SERVED, ["CAN"], box)));
  ok("QA-318 A7 fail: recorded trips are never guessed Yes when the form counts only some of them: a person decides, in the form's words", /^hand: the form counts only some of them \(any recorded trip, starting after/.test(val(runTransform(TRAVEL, ["IND", "FRA"], box))), val(runTransform(TRAVEL, ["IND", "FRA"], box)));

  // ---------------------------------------------------------------- Part B: the family case on the configured checkpoint
  const vv = sql("select id from combination where combination_key='vv.single'");
  const sch1Asked = sql(`select count(*) from section_question q join form_field_map m on m.canonical_field_key=q.canonical_field_key join form_edition e on e.id=m.form_edition_id join gov_form_def g on g.id=e.gov_form_def_id where g.form_key='IMM 5257 SCH1' and m.data_path ~ '(HaveWitnessedParticipated|BeenMemberAssociated)\\[0\\]$' and m.status='PUBLISHED' and q.status='PUBLISHED'`);
  ok("QA-318 B0 setup: the configured checkpoint is loaded, and asks SCH1's Questions 5 and 6 as their own questions (released)", !!vv && sch1Asked === "2", { vv, sch1Asked });
  if (!vv) return;
  const words = sql(`select string_agg(m.evidence_quote, ' | ' order by m.data_path) from form_field_map m join form_edition e on e.id=m.form_edition_id join gov_form_def g on g.id=e.gov_form_def_id where g.form_key='IMM 5257 SCH1' and m.data_path ~ '(HaveWitnessedParticipated|BeenMemberAssociated)\\[0\\]$' and m.status='PUBLISHED'`) ?? "";
  ok("QA-318 B1 pass: their questions are the form's own official words (P-170)", words.includes("Are you, or have you ever been a member or associated with any political party") && words.includes("Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings?"), words);
  const f = await firms(); const officer = f.officer ?? OFFICER;
  const c = await openCase(vv, FAMILY, { representative: f.rep, caseOfficers: [officer] });
  const filled = await fillEverything(c.id);
  const forms = async () => ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms ?? []) as { form: string; person: string; subject_id: string; applies: boolean; readiness: { ready: boolean; missing: { fact: string; reason: string; why?: string; label: string }[] } }[];
  const sch1 = (await forms()).filter((x) => x.form === "IMM 5257 SCH1" && x.applies);
  ok("QA-318 B2 pass: with every fact answered and confirmed, each adult's IMM 5257 SCH1 has nothing missing and no mandatory form field left empty", filled && sch1.length >= 2 && sch1.every((x) => x.readiness.ready && x.readiness.missing.length === 0), sch1.map((x) => [x.person, x.readiness.missing.map((m) => `${m.reason}: ${m.label.slice(0, 40)}`)]));
  const p = sch1.find((x) => x.person === "Sample Client A")!;
  const id = p ? await generateCopy(c.id, "IMM 5257 SCH1", p.subject_id) : null;
  const res = id ? JSON.parse(sql(`select result_json::text from form_instance where id='${id}'`) ?? "{}") : {};
  const of = (k: keyof typeof BOXES) => (res.boxes ?? []).find((b: { box: string }) => b.box.endsWith(BOXES[k]));
  ok("QA-318 B3 pass: the copy writes all five Yes/No form fields, each read back equal (Questions 4 to 8)", (Object.keys(BOXES) as (keyof typeof BOXES)[]).every((k) => of(k)?.result === "written") && res.intact === true, (Object.keys(BOXES) as (keyof typeof BOXES)[]).map((k) => `${k}:${of(k)?.result ?? "none"}`));
  ok("QA-318 B4 pass: Question 8 is No because \"none apply\" was answered for Previous travel (said on the copy)", /nothing recorded: "none apply" answered in Previous travel/.test(of("travel")?.why ?? ""), of("travel")?.why);

  // Honest state: Previous travel taken back: the box waits for an answer, as a fact, never under "Facts confirmed".
  const v = await agent(c.id);
  const s = v.sections.find((x: { about_label: string; title: string; group: unknown }) => x.about_label === "Sample Client A" && /previous travel/i.test(x.title) && x.group);
  const back = await call("PUT", `/runtime/cases/${c.id}/groups/${s.subjectId}/${s.section}/none-apply`, { noneApply: false, expectedId: s.group.none_apply?.id ?? null }, officer);
  const after = (await forms()).find((x) => x.form === "IMM 5257 SCH1" && x.person === "Sample Client A")!;
  const travelLine = after.readiness.missing.find((m) => m.fact.endsWith(BOXES.travel));
  ok("QA-318 B5 fail: with Previous travel unanswered, SCH1 is not ready and its travel form field waits as a fact to answer (\"not answered\"), never \"left empty\"", back.status < 300 && !after.readiness.ready && travelLine?.reason === "not answered" && /needs an answer/.test(travelLine?.why ?? ""), after.readiness.missing.map((m) => `${m.reason}: ${m.label.slice(0, 50)}`));
  ok("QA-318 B6 fail: so no line under it is a mandatory form field \"left empty\" that an answer would fill", !after.readiness.missing.some((m) => m.reason === "left empty on the form" && /^needs an answer/.test(m.why ?? "")), after.readiness.missing.map((m) => `${m.reason}: ${m.why?.slice(0, 40)}`));
});
