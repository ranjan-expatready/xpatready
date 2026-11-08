// B155 (QA-153, Section C; C7.7; Lead 31's plan (A) on #1256, Lead 35 8 Nov): IRCC's IMM 5645 (01-2021) p. 1 says "Include
// ALL family members even if they are not accompanying you." and its Section C holds the applicant's brothers and sisters,
// seven rows. Release 2's own map puts those boxes on `subject_sibling` by row (resolver R4: `<person>/sibling`, row n is
// entry n + 1), and before B155 nobody was asked for them: the boxes stayed empty and said "Your parent 1 (mother or
// father)". Now a case asks them as one repeating group on the sibling key, with "none apply", kept on one answer subject
// per person (each brother or sister is a row on it), waits for them, writes them, and says whose entry an empty box waits
// for. QA-153 probe 2 (8 Nov) also found the second child's Section B address and Yes/No never written: a child's box reads
// the child its row picks, with no row of its own (render.ts). Each rule with a passing and a failing case; the copy is
// read back from its own PDF. Nothing names a form number in a rule (P-319): the form is chosen here only as the test's
// subject. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh forms_b155 4461 start && tsx studio/tests/check_b155_siblings.ts 4461 xr_studio_forms_b155
// It resets its copy and loads the configured checkpoint itself (as check_c73_parts_checkpoint.ts does), so the suite
// runner (run-suites.sh) runs it on its own copy.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isListRelative, listBoxWords, relativeLabel, relativeOf } from "../engine/runtime/relatives.ts";
import { groupLabel } from "../contracts/runtime.ts";
import { AUTHOR, CLIENT, FAMILY, PORT, agent, call, confirmAll, copyBytes, fillEverything, firms, generateCopy, main, needVisitorVisa, ok, openCase, sql } from "../acceptance/lib/m3.ts";

const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
/** Every value a filled PDF holds, by its form field's data path (the proven E5 reader, as check_b128_parents.ts). */
function pdfValues(pdf: Buffer): Record<string, string> {
  if (!pdf.length) return {};
  const dir = mkdtempSync(join(tmpdir(), "b155-")), file = join(dir, "copy.pdf");
  try {
    writeFileSync(file, pdf);
    const code = "import sys, json; sys.path.insert(0, sys.argv[1]); import e5_roundtrip as E, xml.etree.ElementTree as ET\n"
      + "r = E.open_reader(open(sys.argv[2], 'rb').read()); d = E.data_root(ET.fromstring(E.xfa_streams(r)['datasets'].get_object().get_data()))\n"
      + "print(json.dumps({p: v for p, v in E.leaves(d) if v}))";
    return JSON.parse(execFileSync(PY, ["-I", "-c", code, join(STUDIO, "..", "p1"), file], { encoding: "utf8" }).trim().split("\n").pop()!);
  } catch { return {}; } finally { rmSync(dir, { recursive: true, force: true }); }
}
type A = { id: string; value: unknown; confirmed: boolean; fills?: boolean } | null;
type Q = { subjectId: string; fact: string; label: string; required: boolean; hidden: boolean; group: string | null; capacity: number | null; fills: { form: string; subject: string }[]; answer: A; rows: { row: string; index: number; fits: boolean; answer: A }[] };
type S = { subjectId: string; section: string; title: string; about_label: string; missing: string[]; group: { required: boolean; rows: number; none_apply: { id: string; value: boolean; confirmed: boolean } | null } | null; questions: Q[] };
type Box = { box: string; fact: string | null; about?: string | null; result: string; why?: string | null; written?: string };
const FORM = "IMM 5645";
const sectionsOf = async (caseId: string) => ((await agent(caseId))?.sections ?? []) as S[];
const formsOf = async (caseId: string, officer: string) => ((await call("GET", `/runtime/cases/${caseId}/forms`, undefined, officer)).body?.forms ?? []) as { form: string; subject_id?: string; readiness: { ready: boolean; missing: { fact: string; label: string; about: string; reason: string }[] } }[];
const boxesOf = (copy: string | null) => (JSON.parse(sql(`select coalesce(result_json->'boxes', '[]'::jsonb)::text from form_instance where id = '${copy}'`) ?? "[]") as Box[]);

await main("B155", "IMM 5645's brothers and sisters are asked as a list, stored on their own, waited for and written", async () => {
  // ---- The rule, pure: a sibling is a list relative; a parent is not. ----
  ok("B155-1 pass: `<person>/sibling` names the person and the list relation; it reads \"…'s brothers and sisters\", an empty box \"…, entry 3\"", JSON.stringify(relativeOf("p1/sibling")) === JSON.stringify({ owner: "p1", relation: "sibling" }) && isListRelative("p1/sibling") && relativeLabel("Sample Client A", "sibling", ["x.SectionC[0].Child[0].ChildName[0]"]) === "Sample Client A's brothers and sisters" && listBoxWords("Sample Client A", "sibling", 2) === "Sample Client A's brothers and sisters, entry 3");
  ok("B155-2 fail: a parent, a person, a third part or another relation is no list relative (box names saying Child never name a sibling a child)", !["p1/parent_1", "p1/parent_2", "p1", "case", "p1/sibling/x", "/sibling", "p1/cousin"].some(isListRelative) && relativeLabel("Sample Client A", "sibling", ["x.Child[0].ChildName[0]"]) !== "Sample Client A's child");

  // ---- The checkpoint's Visitor visa, release 2: the pack's family (an adult principal and spouse, children of 10 and 15). ----
  if (PORT === 4400) { console.log("STOP  never the demo (:4400): this check resets its copy"); process.exit(2); }
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR), load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
  if (reset.status >= 300 || load.status >= 300) { console.log(`STOP  the configured checkpoint did not load: reset ${reset.status}, load ${load.status} ${JSON.stringify(load.body?.detail ?? "").slice(0, 300)}`); process.exit(2); }
  const vv = needVisitorVisa(), f = await firms(), officer = f.officer!;
  const c = await openCase(vv, FAMILY, { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client A"], SP = c.subjects["Sample Spouse A"], K1 = c.subjects["Sample Child A1"], K2 = c.subjects["Sample Child A2"], SIB = `${P}/sibling`;
  // What the case's own pinned release maps about a sibling on IMM 5645 (its snapshot), never a list typed here.
  const mapped = (q: string) => sql(`select ${q} from config_release r join pack_work_pin w on w.config_release_id = r.id, jsonb_array_elements(r.snapshot->'field_maps') m, jsonb_array_elements(m->'entries') e where w.case_id = '${c.id}' and m->>'form_number' = '${FORM}' and m->>'channel' is distinct from 'ONLINE' and e->>'person' = 'subject_sibling' and e->>'outcome' = 'mapped'`) ?? "";
  const facts = mapped("string_agg(distinct e->>'fact', ',' order by e->>'fact')").split(",").filter(Boolean), rows = Number(mapped("max((e->>'row')::int) + 1"));
  const rowsOf = (fact: string) => mapped(`string_agg(distinct e->>'row', ',' order by e->>'row') filter (where e->>'fact' = '${fact}')`).split(",").filter(Boolean).map(Number);
  const mapOrder = mapped("string_agg(e->>'fact', ',')").split(",").filter(Boolean);
  let secs = await sectionsOf(c.id);
  const sib = () => secs.find((s) => s.subjectId === SIB);
  const s0 = sib();
  ok("B155-3 pass: the adult principal is asked their brothers and sisters as one group on their own key: every fact IMM 5645's map reads about a sibling, in one section, named for them, holding the form's rows", !!s0 && facts.length >= 7 && JSON.stringify([...new Set(s0.questions.map((q) => q.fact))].sort()) === JSON.stringify(facts) && s0.section === "sibling" && s0.title === "Brothers and sisters" && s0.about_label === "Sample Client A's brothers and sisters" && s0.questions.every((q) => q.group === "sibling" && q.capacity === rows && q.fills.some((x) => x.form === FORM && x.subject === P)) && secs.filter((s) => s.subjectId === SIB).length === 1,
    { facts, rows, section: s0 && { section: s0.section, title: s0.title, about: s0.about_label, qs: s0.questions.map((q) => [q.fact, q.group, q.capacity]) } });
  ok("B155-3a pass: its questions follow the release's field map (its first sibling box first), and the group is required with \"none apply\" not answered", s0?.questions[0]?.fact === mapOrder[0] && JSON.stringify(s0.questions.map((q) => q.fact)) === JSON.stringify([...new Set(mapOrder)]) && !!s0?.group?.required && s0.group.rows === 0 && !s0.group.none_apply && s0.missing.includes(groupLabel("Brothers and sisters")), s0 && { order: s0.questions.map((q) => q.fact), map: [...new Set(mapOrder)], group: s0.group, missing: s0.missing });
  ok("B155-3b fail: no brothers and sisters are asked for a child (IMM 5645 is not theirs on this release) nor for the application", !secs.some((s) => [`${K1}/sibling`, `${K2}/sibling`, `${c.caseSubject}/sibling`].includes(s.subjectId)), [...new Set(secs.map((s) => s.subjectId))].filter((x) => x.includes("/")));

  // ---- IMM 5645 waits for them. ----
  let mine = (await formsOf(c.id, officer)).find((x) => x.form === FORM && x.subject_id === P);
  ok("B155-4 pass: IMM 5645 waits for the brothers and sisters: a readiness line \"Brothers and sisters\" for Sample Client A's brothers and sisters, not answered", !!mine?.readiness.missing.some((m) => m.fact === "group:sibling" && m.label === groupLabel("Brothers and sisters") && m.about === "Sample Client A's brothers and sisters" && m.reason === "not answered"), mine?.readiness.missing.filter((m) => /sibling|brother/i.test(`${m.fact} ${m.about}`)));

  // ---- Two entries, answered on the sibling's key by the client (their own facts' questions). ----
  const add = await call("POST", `/runtime/cases/${c.id}/groups/${P}/sibling/rows`, { group: "sibling" }, CLIENT);
  const add2 = await call("POST", `/runtime/cases/${c.id}/groups/${P}/sibling/rows`, { group: "sibling" }, officer);
  ok("B155-5 pass: the client and the officer each add an entry (201, a row id)", add.status === 201 && add2.status === 201 && !!add.body?.row && !!add2.body?.row, [add.status, add.body, add2.status, add2.body]);
  const [E1, E2] = [add.body?.row as string, add2.body?.row as string];
  const put = (fact: string, row: string | null, value: unknown, actor = CLIENT, expectedId: string | null = null) => call("PUT", `/runtime/cases/${c.id}/answers/${P}/sibling/${fact}`, { value, expectedId, ...(row ? { row } : {}) }, actor);
  const n1 = await put("person.full_name", E1, "Sample Brother A"), n2 = await put("person.full_name", E2, "Sample Sister A");
  const d1 = await put("person.date_of_birth", E1, "1988-02-03");
  ok("B155-5a pass: answers are saved in each entry (200) and say they fill IMM 5645", [n1, n2, d1].every((r) => r.status === 200 && (r.body?.fills ?? []).some((x: { form: string }) => x.form === FORM)), [n1, n2, d1].map((r) => [r.status, r.body?.message ?? r.body?.detail]));
  const kept = sql(`select count(*) || '|' || string_agg(distinct s.subject_kind, ',') || '|' || bool_and(s.party_id = (select party_id from answer_subject where id = '${P}')) from client_canonical_answer a join answer_subject s on s.id = a.subject_id where a.canonical_field_key = 'person.full_name' and a.value_json::text in ('"Sample Brother A"', '"Sample Sister A"') and a.superseded_by_id is null`);
  ok("B155-5b pass: both are kept on one answer subject of kind \"sibling\" on Sample Client A's party, each in its own row; nothing on Sample Client A", kept === "2|sibling|true" && sql(`select count(*) from client_canonical_answer where subject_id = '${P}' and value_json::text in ('"Sample Brother A"', '"Sample Sister A"')`) === "0", kept);
  const noRow = await put("person.full_name", null, "Sample Third A"), noFact = await put("person.passport_number", E1, "X1"), caseSib = await call("PUT", `/runtime/cases/${c.id}/answers/${c.caseSubject}/sibling/person.full_name`, { value: "X", expectedId: null, row: E1 }, officer);
  const other = await openCase(vv, [{ role: "principal", name: "Sample Client B", dob: "1980-01-01" }], { representative: f.rep, caseOfficers: [officer] });
  const elsewhere = await call("POST", `/runtime/cases/${other.id}/groups/${P}/sibling/rows`, { group: "sibling" }, officer);
  const wrongGroup = await call("POST", `/runtime/cases/${c.id}/groups/${P}/sibling/rows`, { group: "personal_details" }, officer), cousin = await call("POST", `/runtime/cases/${c.id}/groups/${P}/parent_1/rows`, { group: "parent_1" }, officer);
  ok("B155-5c fail: an answer with no entry (422), a fact no form reads about a sibling (404), the application's sibling (404), another case's person (404), another group or a parent as a list (404) are refused, in words", noRow.status === 422 && noFact.status === 404 && caseSib.status === 404 && elsewhere.status === 404 && wrongGroup.status === 404 && cousin.status === 404 && /entry|row/i.test(noRow.body?.detail ?? "") && /brother or sister/.test(noFact.body?.detail ?? ""),
    [noRow, noFact, caseSib, elsewhere, wrongGroup, cousin].map((r) => [r.status, r.body?.detail]));

  // ---- What a row asks: only what the form has a box for in that row. ----
  secs = await sectionsOf(c.id);
  const accompanies = sib()?.questions.find((q) => rowsOf(q.fact).length < rows);
  const nameQ = sib()?.questions.find((q) => q.fact === "person.full_name");
  ok("B155-6 pass: each entry's name fits (the form has seven name rows); a fact the form holds for fewer rows (IMM 5645 maps \"accompanies\" on the seventh only) does not fit entries 1 and 2", !!nameQ && nameQ.rows.length === 2 && nameQ.rows.every((r) => r.fits) && nameQ.rows.map((r) => r.answer?.value).join("|") === "Sample Brother A|Sample Sister A" && (!accompanies || accompanies.rows.every((r) => !r.fits)),
    { name: nameQ?.rows.map((r) => [r.index, r.fits, r.answer?.value]), accompanies: accompanies && [accompanies.fact, rowsOf(accompanies.fact), accompanies.rows.map((r) => r.fits)] });
  mine = (await formsOf(c.id, officer)).find((x) => x.form === FORM && x.subject_id === P);
  const sibLines = mine?.readiness.missing.filter((m) => m.about === "Sample Client A's brothers and sisters") ?? [];
  ok("B155-6a pass: IMM 5645 now waits for the entries' unanswered facts (not \"none apply\"), never for a fact that does not fit their rows", sibLines.length > 0 && !sibLines.some((m) => m.fact === "group:sibling") && (!accompanies || !sibLines.some((m) => m.fact === accompanies.fact)) && sibLines.find((m) => m.fact === "person.full_name")?.reason === "not confirmed" && sibLines.find((m) => m.fact === "person.present_address")?.reason === "not answered", sibLines.map((m) => `${m.fact}:${m.reason}`));

  // ---- "None apply" never beside entries; removing an entry leaves the other first. ----
  const naNow = await call("PUT", `/runtime/cases/${c.id}/groups/${P}/sibling/sibling/none-apply`, { noneApply: true, expectedId: null }, officer);
  ok("B155-7 fail: \"none apply\" is refused while entries exist (409, in words)", naNow.status === 409 && /entr/.test(naNow.body?.detail ?? ""), [naNow.status, naNow.body?.detail]);
  const E3 = (await call("POST", `/runtime/cases/${c.id}/groups/${P}/sibling/rows`, { group: "sibling" }, officer)).body?.row as string;
  await put("person.full_name", E3, "Sample Removed A", officer);
  const rm = await call("DELETE", `/runtime/cases/${c.id}/groups/${P}/sibling/rows/${E3}`, undefined, officer), rmAgain = await call("DELETE", `/runtime/cases/${c.id}/groups/${P}/sibling/rows/${E3}`, undefined, officer);
  secs = await sectionsOf(c.id);
  ok("B155-7a pass: an entry is removed (200) and its answers are no longer read; removing it again is refused (404)", rm.status === 200 && rmAgain.status === 404 && sib()?.group?.rows === 2 && !sib()?.questions.some((q) => q.rows.some((r) => r.answer?.value === "Sample Removed A")), [rm.status, rmAgain.status, sib()?.group?.rows]);

  // ---- Written: the officer confirms the entries, then the pack's helper answers and confirms the rest. ----
  await confirmAll(c.id, SIB);
  await fillEverything(c.id);
  secs = await sectionsOf(c.id);
  const unconfirmed = sib()?.questions.flatMap((q) => q.rows.filter((r) => r.fits && r.answer && !r.answer.confirmed)) ?? [];
  ok("B155-8 pass: Confirm section on the brothers and sisters' key confirms their entries (the pack's helper, the officer's route)", unconfirmed.length === 0 && !!sib()?.questions.find((q) => q.fact === "person.full_name")?.rows.every((r) => r.answer?.confirmed), unconfirmed.length);
  const copy = await generateCopy(c.id, FORM, P), boxes = boxesOf(copy), pdf = pdfValues(copy ? await copyBytes(copy) : Buffer.alloc(0));
  const at = (row: number, leaf: string) => Object.entries(pdf).find(([k]) => k.includes(`SectionC[0].Child[${row}].${leaf}`))?.[1];
  ok("B155-9 pass: the copy's own PDF holds entry 1 in Section C's first row and entry 2 in its second (names and the date of birth typed)", at(0, "ChildName") === "Sample Brother A" && at(1, "ChildName") === "Sample Sister A" && /1988/.test(at(0, "ChildDOB") ?? ""), { row0: at(0, "ChildName"), row1: at(1, "ChildName"), dob0: at(0, "ChildDOB"), copy });
  const third = boxes.filter((b) => b.box.includes("SectionC[0].Child[2]") && b.fact);
  ok("B155-9a pass: an empty row's boxes say whose entry they wait for (\"Sample Client A's brothers and sisters, entry 3\"), never \"Your parent 1\"", third.length > 0 && third.every((b) => b.result !== "written" && /Sample Client A's brothers and sisters, entry 3/.test(b.why ?? "")), third.slice(0, 3).map((b) => [b.box.split(".").pop(), b.result, b.why]));
  const anyParent = boxes.filter((b) => b.box.includes("SectionC") && /Your parent 1/.test(b.why ?? ""));
  ok("B155-9b fail: no Section C box gives \"Your parent 1\" as its reason", anyParent.length === 0, anyParent.slice(0, 3).map((b) => [b.box, b.why]));

  // ---- QA-153 probe 2: the second child's Section B address and Yes/No are written from that child's own answers. ----
  const kid = (row: number) => boxes.filter((b) => b.box.includes(`SectionB[0].Child[${row}]`) && b.fact);
  const k1 = kid(1), k1Written = k1.filter((b) => b.result === "written");
  ok("B155-10 pass: Section B's second row (Sample Child A2) is written from that child's own answers: address and the Yes/No included", k1.length > 0 && k1.every((b) => b.result === "written" || b.result === "by hand") && k1Written.some((b) => /Address/.test(b.box)) && k1Written.some((b) => /Child\[1\]\.Child(Yes|No)/.test(b.box)), k1.map((b) => [b.box.split(".").pop(), b.result, b.why]));
  const k1Addr = Object.entries(pdf).find(([k]) => k.includes("SectionB[0].Child[1].ChildAddress"))?.[1], k0Addr = Object.entries(pdf).find(([k]) => k.includes("SectionB[0].Child[0].ChildAddress"))?.[1];
  ok("B155-10a pass: the PDF holds both children's addresses (rows 1 and 2 of Section B)", !!k1Addr && !!k0Addr, { k0Addr, k1Addr });

  // ---- "None apply" on another adult: confirmed, IMM 5645 no longer waits; the empty boxes say why. ----
  secs = await sectionsOf(c.id);
  const spouse = secs.find((s) => s.subjectId === `${SP}/sibling`);
  ok("B155-11 pass: the spouse's \"none apply\" (the pack's helper) is recorded and confirmed on the spouse's brothers and sisters", !!spouse?.group?.none_apply?.value && spouse.group.none_apply.confirmed && spouse.group.rows === 0, spouse?.group);
  const spForm = (await formsOf(c.id, officer)).find((x) => x.form === FORM && x.subject_id === SP);
  ok("B155-11a fail: with \"none apply\" confirmed, IMM 5645 has no brothers-and-sisters line left for the spouse", !!spForm && !spForm.readiness.missing.some((m) => /brothers and sisters/.test(`${m.label} ${m.about}`)), spForm?.readiness.missing.map((m) => `${m.fact}:${m.reason}`));

  // ---- P-411 (B150's rule, unchanged): a declared answer fills at once, before the officer confirms it. ----
  const nameNow = (await sectionsOf(c.id)).find((s) => s.subjectId === SIB)?.questions.find((q) => q.fact === "person.full_name")?.rows[1];
  const changed = await put("person.full_name", nameNow?.row ?? E2, "Sample Sister B", CLIENT, nameNow?.answer?.id ?? null);
  const copy2 = await generateCopy(c.id, FORM, P), pdf2 = pdfValues(copy2 ? await copyBytes(copy2) : Buffer.alloc(0));
  const row1 = Object.entries(pdf2).find(([k]) => k.includes("SectionC[0].Child[1].ChildName"))?.[1];
  ok("B155-12 pass (P-411): a sibling's new answer, declared and not confirmed yet, is written at once", changed.status === 200 && row1 === "Sample Sister B", [changed.status, changed.body?.detail, row1]);
  mine = (await formsOf(c.id, officer)).find((x) => x.form === FORM && x.subject_id === P);
  ok("B155-12a fail: until the officer confirms it, IMM 5645 waits for it (\"not confirmed\", Sample Client A's brothers and sisters)", !!mine?.readiness.missing.some((m) => m.fact === "person.full_name" && m.about === "Sample Client A's brothers and sisters" && m.reason === "not confirmed"), mine?.readiness.missing.filter((m) => /brothers/.test(m.about)));
  await confirmAll(c.id, SIB);
  mine = (await formsOf(c.id, officer)).find((x) => x.form === FORM && x.subject_id === P);
  ok("B155-12b pass: Confirm section on the brothers and sisters' section clears it", !mine?.readiness.missing.some((m) => /brothers/.test(m.about)), mine?.readiness.missing.filter((m) => /brothers/.test(m.about)));
});
