// B128 (QA-153, Major; C7.7, C10.2; P-401): IRCC's IMM 5645 (01-2021) p. 1 says "Include ALL family members even if they
// are not accompanying you." and has boxes for the applicant's mother and father (Section A). Release 2's own field map
// puts them on `subject_parent_1` and `subject_parent_2` (resolver R4: `<person>/parent_1`, a relative the form describes,
// never a person on the case), and release 2 already places a question for every fact those boxes read. Before B128 the
// case dropped every relative's question (engine/runtime/case.ts), so IMM 5645 read "Every fact it reads is confirmed"
// with both parents empty. Now a case asks each parent's facts on the parent's own key, stores them on the parent's own
// answer subject, waits for them, and writes them. Siblings (a list) are not asked yet: the PR's question for the tech
// lead. Each rule with a passing and a failing case; read in a filled copy: the PDF's own values. Nothing names a form
// number in a rule (P-319): the form is chosen here only as the test's subject. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh b128 4450 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/runtime/check_b128_parents.ts 4450 xr_studio_b128
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { relativeOf } from "../../engine/runtime/relatives.ts";
import { runTransform } from "../../../p5/transforms.ts";
import { agent, answer, call, CLIENT, copyBytes, fillEverything, firms, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo } from "../../acceptance/lib/m3.ts";

const STUDIO = join(import.meta.dirname, "..", ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
/** Every value a filled PDF holds, by its form field's data path (the proven E5 reader, as check_qa296_imm5475.ts). */
function pdfValues(pdf: Buffer): Record<string, string> {
  if (!pdf.length) return {};
  const dir = mkdtempSync(join(tmpdir(), "b128-")), file = join(dir, "copy.pdf");
  try {
    writeFileSync(file, pdf);
    const code = "import sys, json; sys.path.insert(0, sys.argv[1]); import e5_roundtrip as E, xml.etree.ElementTree as ET\n"
      + "r = E.open_reader(open(sys.argv[2], 'rb').read()); d = E.data_root(ET.fromstring(E.xfa_streams(r)['datasets'].get_object().get_data()))\n"
      + "print(json.dumps({p: v for p, v in E.leaves(d) if v}))";
    return JSON.parse(execFileSync(PY, ["-I", "-c", code, join(STUDIO, "..", "p1"), file], { encoding: "utf8" }).trim().split("\n").pop()!);
  } catch { return {}; } finally { rmSync(dir, { recursive: true, force: true }); }
}
type Q = { subjectId: string; fact: string; about_label: string; required: boolean; hidden: boolean; fills: { form: string; subject: string }[]; answer: { id: string; value: unknown; confirmed: boolean } | null };
type S = { subjectId: string; section: string; questions: Q[] };
const sectionsOf = async (caseId: string) => ((await agent(caseId))?.sections ?? []) as S[];
const FORM = "IMM 5645";

await main("B128", "IMM 5645's parents are asked, stored on their own, waited for and written", async () => {
  // ---- The rule, pure: which relatives a case asks one by one. ----
  ok("B128-1 pass: a parent's key names the person and the relation (`<person>/parent_1`, `/parent_2`)", JSON.stringify([relativeOf("p1/parent_1"), relativeOf("p1/parent_2")]) === JSON.stringify([{ owner: "p1", relation: "parent_1" }, { owner: "p1", relation: "parent_2" }]));
  ok("B128-2 fail: a person, the application, the representative, a sibling (a list), a third part or an empty person are not a relative asked one by one", ["p1", "case", "representative", "p1/sibling", "p1/parent_1/x", "/parent_1", "p1/parent_3"].every((k) => relativeOf(k) === null));
  // The filler, pure: the map's spelling of a Yes and a No tick box, and of a one-line address.
  const run = (t: string, v: unknown) => { const o = runTransform(t, v, {}); return o.ok ? o.value : "hand" in o ? "by hand" : "blank"; };
  ok("B128-2a pass: \"checked_if_true\" ticks on Yes, \"checked_if_false\" on No; a one-line address is written", [run("derived:checked_if_true:1/0", true), run("derived:checked_if_true:1/0", false), run("derived:checked_if_false:1/0", false), run("derived:checked_if_false:1/0", true), run("address_single_line_text", { street_name: "Sample Road", city: "Sample City", country: "Canada" })].join("|") === "1|0|1|0|Sample Road, Sample City, Canada",
    [run("derived:checked_if_true:1/0", true), run("derived:checked_if_false:1/0", false), run("address_single_line_text", { street_name: "Sample Road", city: "Sample City", country: "Canada" })]);
  ok("B128-2b fail: a tick box on anything but Yes or No, and an address that is not one, go to the person by hand (never guessed)", run("derived:checked_if_true:1/0", "maybe") === "by hand" && run("derived:checked_if_false:1/0", "Y") === "by hand" && run("address_single_line_text", 42) === "by hand" && run("derived:checked_if_maybe:1/0", true) === "by hand");

  // ---- The checkpoint's Visitor visa, release 2: an adult principal. ----
  const vv = needVisitorVisa(), f = await firms(), officer = f.officer!;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client F", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client F"], M = `${P}/parent_1`, D = `${P}/parent_2`;
  const p0 = (await prepare(c.id, officer)).p;
  ok("B128-3 setup: on the checkpoint the adult principal has IMM 5645", itemsOf(p0, P, FORM).length === 1, itemsOf(p0, P).map((i) => i.form));
  // What the case's own pinned release maps about each parent on IMM 5645 (its snapshot), never a list typed here.
  const mapped = (rel: string) => (sql(`select string_agg(distinct e->>'fact', ',' order by e->>'fact') from config_release r join pack_work_pin w on w.config_release_id = r.id, jsonb_array_elements(r.snapshot->'field_maps') m, jsonb_array_elements(m->'entries') e where w.case_id = '${c.id}' and m->>'form_number' = '${FORM}' and m->>'channel' is distinct from 'ONLINE' and e->>'person' = 'subject_${rel}' and e->>'outcome' = 'mapped'`) ?? "").split(",").filter(Boolean);
  const want = mapped("parent_1");
  let secs = await sectionsOf(c.id);
  const asked = (key: string) => [...new Set(secs.filter((s) => s.subjectId === key).flatMap((s) => s.questions).filter((q) => q.fills.some((x) => x.form === FORM && x.subject === P)).map((q) => q.fact))].sort();
  ok("B128-4 pass: every fact IMM 5645's map reads about each parent is a question on that parent's own key, filling the principal's IMM 5645", want.length >= 7 && JSON.stringify(asked(M)) === JSON.stringify(want) && JSON.stringify(asked(D)) === JSON.stringify(mapped("parent_2")), { want, parent_1: asked(M), parent_2: asked(D) });
  ok("B128-5 fail: no sibling question (a list, not asked yet) and no relative's question on the application", !secs.some((s) => s.subjectId.endsWith("/sibling") || s.subjectId.startsWith(`${c.caseSubject}/`)), [...new Set(secs.map((s) => s.subjectId))]);

  const forms = async () => ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms ?? []) as { form: string; subject?: string; readiness: { ready: boolean; missing: { fact: string; about: string }[] } }[];
  await fillEverything(c.id); // the pack's helper: answers and confirms everything else, parents included (never a date of birth)

  // Only for a form that applies to the person: a spouse whose date of birth is not known yet (the family form "may be
  // needed") and a child of 10 (under its minimum age) are asked no parents.
  const fam = await openCase(vv, [{ role: "principal", name: "Sample Client G", dob: yearsAgo(41) }, { role: "spouse_or_partner", name: "Sample Spouse G", dob: null }, { role: "child", name: "Sample Child G", dob: yearsAgo(10) }], { representative: f.rep, caseOfficers: [officer] });
  const famKeys = new Set((await sectionsOf(fam.id)).map((x) => x.subjectId)), [PG, SG, KG] = ["Sample Client G", "Sample Spouse G", "Sample Child G"].map((n) => fam.subjects[n]);
  ok("B128-5a pass: on a family case the adult principal's parents are asked", famKeys.has(`${PG}/parent_1`) && famKeys.has(`${PG}/parent_2`), [...famKeys]);
  ok("B128-5b fail: no parent is asked for the spouse whose date of birth is unknown, nor for the child of 10", ![`${SG}/parent_1`, `${SG}/parent_2`, `${KG}/parent_1`, `${KG}/parent_2`].some((k) => famKeys.has(k)), [...famKeys]);

  // ---- Answered on the parent's own key: two path parts, or the key written as one (%2F). ----
  const before = sql(`select value_json::text from client_canonical_answer where subject_id = '${P}' and canonical_field_key = 'person.date_of_birth' and superseded_by_id is null`);
  const r1 = await answer(c.id, M, "person.full_name", "Sample Mother F", CLIENT);
  const seenD = (await sectionsOf(c.id)).filter((x) => x.subjectId === D).flatMap((x) => x.questions).find((q) => q.fact === "person.full_name")?.answer?.id ?? null;
  const r2 = await call("PUT", `/runtime/cases/${c.id}/answers/${encodeURIComponent(D)}/person.full_name`, { value: "Sample Father F", expectedId: seenD }, CLIENT);
  const r3 = await answer(c.id, M, "person.date_of_birth", yearsAgo(66), officer), r4 = await answer(c.id, D, "person.date_of_birth", yearsAgo(69), officer);
  const kept = sql(`select count(distinct a.subject_id) from client_canonical_answer a join answer_subject s on s.id = a.subject_id where s.subject_kind in ('parent_1','parent_2') and a.subject_id <> '${P}' and a.party_id = (select party_id from answer_subject where id = '${P}')`);
  ok("B128-6 pass: a parent's answers save (as two path parts and as one encoded key) and each parent is kept on a subject of its own", [r1, r2, r3, r4].every((r) => r.status === 200) && kept === "2", { status: [r1, r2, r3, r4].map((r) => r.status), kept, detail: [r1, r2].map((r) => r.body?.detail) });
  ok("B128-7 fail: a parent's date of birth never changes the principal's own", sql(`select value_json::text from client_canonical_answer where subject_id = '${P}' and canonical_field_key = 'person.date_of_birth' and superseded_by_id is null`) === before, before);

  // ---- Refused in words: a relative of the application, a sibling (no form describes one asked singly), another case's
  // person, and a confirm for a relation that is not asked. ----
  const no1 = await answer(c.id, `${c.caseSubject}/parent_1`, "person.full_name", "X", officer);
  const no2 = await call("PUT", `/runtime/cases/${c.id}/answers/${P}/sibling/person.full_name`, { value: "X", expectedId: null }, officer);
  const no3 = await call("PUT", `/runtime/cases/${c.id}/answers/00000000-0000-4000-8000-000000000000/parent_1/person.full_name`, { value: "X", expectedId: null }, officer);
  const no4 = await call("POST", `/runtime/cases/${c.id}/sections/personal_details/confirm`, { subjectId: `${P}/sibling`, seen: [] }, officer);
  ok("B128-8 fail: the application's parent, a sibling and a person not on the case are refused (404, in words); a confirm for a sibling is a field error (400)", no1.status === 404 && no2.status === 404 && no3.status === 404 && no4.status === 400 && [no1, no2, no3].every((r) => /not on this case|No such/.test(r.body?.detail ?? "")), [no1, no2, no3, no4].map((r) => [r.status, r.body?.detail]));

  // ---- Waited for: while a parent fact is new and not confirmed, IMM 5645 is not ready and never says every fact is confirmed. ----
  let rd = (await forms()).find((x) => x.form === FORM)?.readiness;
  const item = itemsOf((await prepare(c.id, officer)).p, P, FORM)[0];
  secs = await sectionsOf(c.id);
  const unconfirmed = secs.filter((s) => s.subjectId === M || s.subjectId === D).flatMap((s) => s.questions).filter((q) => !q.answer?.confirmed).map((q) => `${q.about_label}: ${q.fact}`);
  ok("B128-9 pass: IMM 5645 waits for the parents' facts still to confirm (named by parent), not \"Every fact it reads is confirmed\"", rd?.ready === false && unconfirmed.length === 4 && (rd?.missing ?? []).every((m) => /parent [12]/.test(m.about)) && (rd?.missing ?? []).length === unconfirmed.length && !/every fact it reads is confirmed/i.test(item?.reason ?? ""), { missing: rd?.missing, unconfirmed, reason: item?.reason });

  // ---- Confirm section on a parent's key: an unseen answer is refused, a seen one is confirmed. ----
  const parentSecs = secs.filter((s) => s.subjectId === M || s.subjectId === D);
  const sec = parentSecs.find((s) => s.questions.some((q) => q.answer && !q.answer.confirmed))!;
  const unseen = await call("POST", `/runtime/cases/${c.id}/sections/${sec?.section}/confirm`, { subjectId: sec?.subjectId, seen: [] }, officer);
  ok("B128-10 fail: Confirm section on a parent's section with an answer not seen is refused (409), nothing confirmed", unseen.status === 409, [unseen.status, unseen.body?.detail]);
  for (const s of parentSecs) {
    const seen = s.questions.map((q) => q.answer?.id).filter(Boolean);
    if (seen.length) await call("POST", `/runtime/cases/${c.id}/sections/${s.section}/confirm`, { subjectId: s.subjectId, seen }, officer);
  }
  rd = (await forms()).find((x) => x.form === FORM)?.readiness;
  ok("B128-11 pass: with every parent fact answered and confirmed, IMM 5645 waits for nothing", rd?.ready === true && !(rd?.missing ?? []).length, rd);

  // ---- Written: the copy's own PDF holds the mother's and the father's facts, each in its own boxes. ----
  const copy = await generateCopy(c.id, FORM, P);
  const v = pdfValues(await copyBytes(copy ?? "", officer));
  const at = (part: string) => Object.entries(v).filter(([k]) => k.includes(part)).map(([, x]) => x);
  const written = Number(sql(`select count(*) from form_instance i, jsonb_array_elements(i.result_json->'boxes') b where i.id = '${copy}' and (b->>'box' like '%Mother%' or b->>'box' like '%Father%') and b->>'result' = 'written'`) ?? -1);
  ok("B128-12 pass: the filled IMM 5645 shows the mother's name in the mother's box and the father's in the father's, with their dates of birth", at("MotherName").includes("Sample Mother F") && at("FatherName").includes("Sample Father F") && at("MotherDOB").includes(yearsAgo(66)) && at("FatherDOB").includes(yearsAgo(69)), { mother: Object.fromEntries(Object.entries(v).filter(([k]) => /Mother/.test(k))), father: Object.fromEntries(Object.entries(v).filter(([k]) => /Father/.test(k))) });
  ok("B128-13 pass: every one of the parents' boxes on the copy is written (16 of 16): the address in one line, and \"not accompanying\" ticked No, not Yes (as answered)", written === 16 && at("MotherAddress").some((x) => /Sample City/.test(x)) && at("FatherAddress").some((x) => /Sample City/.test(x)) && at("MotherNo").includes("1") && !at("MotherYes").includes("1") && at("FatherNo").includes("1") && !at("FatherYes").includes("1"), { written, address: [at("MotherAddress"), at("FatherAddress")], ticks: [at("MotherYes"), at("MotherNo"), at("FatherYes"), at("FatherNo")] });
  ok("B128-14 fail: no parent's name is written outside that parent's own boxes", Object.entries(v).filter(([k, x]) => (x === "Sample Mother F" && !/Mother/.test(k)) || (x === "Sample Father F" && !/Father/.test(k))).length === 0, Object.entries(v).filter(([, x]) => /Sample (Mother|Father) F/.test(x)));
});
