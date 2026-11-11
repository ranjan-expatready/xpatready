// qa (11 Nov, Lead 17's ask; master analysis #1532, design/master-plan-2026-11-11/07b-contract-S3-filing-values.md):
// C7.3: for an Online form, the answer sheet (what the case officer types into the IRCC account) and the PDF copy of the
// same form (the "copy, not for filing" a client may be sent) must show the same value for the same form field.
// Suspects: (1) "nothing recorded" Yes/No boxes are marked only on the PDF path (api/src/fill-case.ts:322
// markNothingRecorded vs api/src/case-prepare.ts:887 raw cov.boxes); (2) the sheet's layout takes the first field map for a
// form whatever its edition (case-prepare.ts:894 fieldMapOf); (3) an oath or signature box mapped to a fact could reach
// the sheet (P-245; form-values.ts writes neither). On the finished story's data (Visitor visa release 2 files IMM 5257
// Online): a family case filled by the pack helper, then IMM 5257's answer sheet against its PDF copy, field by field.
// US$0, live AI off.
//   zsh tools/isolated.sh qa_c73 4473 start && <Demo › Load the finished story> && tsx tests/qa/check_c73_pdf_vs_sheet.ts 4473 xr_studio_qa_c73 [dump]
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { FAMILY, agent, call, copyBytes, fillEverything, generateCopy, main, needVisitorVisa, ok, openCase, prepare, sql } from "../../acceptance/lib/m3.ts";
const STUDIO = join(import.meta.dirname, "..", ".."), SOL = join(STUDIO, "..", ".."), PY = join(SOL, "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
/** What the PDF copy itself writes: its XFA data leaves (data path → text), read by p1/e5_roundtrip.py as other checks do. */
function written(pdf: Buffer): Record<string, string> {
  const code = `
import sys, json, xml.etree.ElementTree as ET
sys.path.insert(0, ${JSON.stringify(join(SOL, "prototype", "p1"))})
import e5_roundtrip as E
b = sys.stdin.buffer.read(); parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(b)).items()}
print(json.dumps({p: v for p, v in E.leaves(E.data_root(ET.fromstring(parts["datasets"]))) if v.strip()}))`;
  const r = spawnSync(PY, ["-I", "-c", code], { input: pdf, encoding: "buffer", timeout: 120_000, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(String(r.stderr).slice(-400));
  return JSON.parse(String(r.stdout));
}
type Box = { box: string; fact: string; about: string; about_label?: string; value?: unknown; detail?: string };
type Line = { label?: string; fact: string; subject: string; person: string; value: unknown; copy_text: string };
await main("QA-392", "C7.3: the answer sheet and the PDF copy of the same form agree, box by box", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY.slice(0, 2));
  ok("QA-392 setup: every fact answered and confirmed by the pack helper", await fillEverything(c.id));
  const P = c.subjects[FAMILY[0].name];
  const item = (((await prepare(c.id)).p as any)?.items ?? []).find((i: any) => i.subject === P && i.form === "IMM 5257" && i.channel === "ONLINE");
  ok("QA-392 setup: the case's release files IMM 5257 Online (the finished story's release 2)", !!item, item ?? "no Online IMM 5257 item");
  const sheet = (await call("GET", `/runtime/items/${item?.id}/answer-sheet`)).body as { sections: { key: string; answers: Line[] }[] };
  const copyId = await generateCopy(c.id, "IMM 5257", P);
  // What the PDF copy wrote: the boxes fill-case.ts stored with the copy (after markNothingRecorded), as form-values.ts writes them.
  const boxes = JSON.parse(sql(`select s.facts_json->'boxes' from form_instance f join answer_snapshot s on s.id = f.snapshot_id where f.id = '${copyId}'`) ?? "[]") as Box[];
  const lines = (sheet?.sections ?? []).flatMap((x) => x.answers), has = new Set(lines.map((l) => `${l.subject}|${l.fact}`));
  const nothing = boxes.filter((b) => /^nothing recorded/.test(b.detail ?? ""));
  ok("QA-392 setup: the PDF copy writes at least one \"nothing recorded\" Yes/No box as No (a list answered \"none apply\")", nothing.length > 0, boxes.length);
  ok("QA-392a fail today (suspect 1): each \"nothing recorded\" box the PDF writes as No has its line on the answer sheet, for that person", nothing.every((b) => has.has(`${b.about}|${b.fact}`)), nothing.filter((b) => !has.has(`${b.about}|${b.fact}`)).map((b) => `${b.about_label}: ${b.box.split(".").slice(-2).join(".")} (${b.detail})`));
  const valued = boxes.filter((b) => b.value !== undefined && b.value !== null && b.value !== "");
  ok("QA-396 pass: every box the PDF writes from an answer has its line on the sheet", valued.length > 0 && valued.every((b) => has.has(`${b.about}|${b.fact}`)), valued.filter((b) => !has.has(`${b.about}|${b.fact}`)).map((b) => b.box));
  const stored = new Set(boxes.map((b) => `${b.about}|${b.fact}`));
  ok("QA-392c pass (suspect 3, P-245): every sheet line is a box the PDF copy carries (no signature, oath or other value the PDF never prints)", lines.every((l) => stored.has(`${l.subject}|${l.fact}`)), lines.filter((l) => !stored.has(`${l.subject}|${l.fact}`)).map((l) => l.fact));
  // Suspect 2: the sheet's layout reads the first field map of the form (case-prepare.ts:894); the PDF the newest (P-32).
  const maps = JSON.parse(sql(`select coalesce(json_agg(m->>'form_edition'), '[]')::text from form_instance f join pack_work_pin w on w.case_id = f.case_id join config_release r on r.id = w.config_release_id, jsonb_array_elements(r.snapshot->'field_maps') m where f.id = '${copyId}' and m->>'form_number' = 'IMM 5257'`) ?? "[]") as string[];
  console.log(`NOTE  QA-392 suspect 2: the case's release maps IMM 5257 in ${maps.length} edition(s): ${maps.join(", ")}; with one, the sheet's first map is the PDF's edition`);
  ok("QA-392d pass (suspect 2, on this data): the release maps one edition of IMM 5257, so the sheet and the PDF read the same edition", maps.length === 1, maps);
});

// QA-396 (11 Nov; #1553's reviewer, relayed by Lead 17): the Yes side. With an entry in Education and in Previous
// residence, the PDF writes EducationIndicator = Y and PCRIndicator = Y; the sheet must say Yes to those questions too.
await main("QA-396", "C7.3: with an entry, the sheet says Yes where the PDF copy writes Y", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY.slice(0, 1));
  await fillEverything(c.id);
  const P = c.subjects[FAMILY[0].name];
  type Sec = { subjectId: string; section: string; title: string; group: { rows: number; none_apply?: { id: string; value: boolean } | null } | null; questions: { fact: string }[] };
  const facts = ["person.education_school_name", "person.previous_residence_country"];
  for (const fact of facts) {
    const sec = (((await agent(c.id))?.sections ?? []) as Sec[]).find((x) => x.subjectId === P && x.group && x.questions.some((q) => q.fact === fact));
    if (!sec) { console.log(`NOTE  QA-396: no group asks ${fact} for the principal`); continue; }
    if (sec.group?.none_apply?.value) await call("PUT", `/runtime/cases/${c.id}/groups/${P}/${sec.section}/none-apply`, { noneApply: false, expectedId: sec.group.none_apply.id });
    const add = await call("POST", `/runtime/cases/${c.id}/groups/${P}/rows`, { group: sec.section });
    console.log(`NOTE  QA-396: ${sec.title}: "none apply" taken back, one entry added (${add.status})`);
  }
  // The pack helper answers and confirms the new rows like every other required answer (Sample values).
  await fillEverything(c.id); await fillEverything(c.id);
  const item = (((await prepare(c.id)).p as any)?.items ?? []).find((i: any) => i.subject === P && i.form === "IMM 5257" && i.channel === "ONLINE");
  const sheet = (await call("GET", `/runtime/items/${item?.id}/answer-sheet`)).body as { sections: { key: string; answers: Line[] }[] };
  const copyId = await generateCopy(c.id, "IMM 5257", P);
  const pdf = written(await copyBytes(copyId ?? ""));
  const boxes = JSON.parse(sql(`select s.facts_json->'boxes' from form_instance f join answer_snapshot s on s.id = f.snapshot_id where f.id = '${copyId}'`) ?? "[]") as (Box & { transform?: string })[];
  const lines = (sheet?.sections ?? []).flatMap((x) => x.answers);
  for (const end of ["EducationIndicator[0]", "PCRIndicator[0]"]) {
    const b = boxes.find((x) => x.box.endsWith(end) && x.about === P), w = b ? pdf[b.box] : undefined;
    const said = lines.filter((l) => l.subject === P && l.fact === b?.fact).map((l) => `${l.label}: ${l.copy_text}`);
    console.log(`NOTE  QA-396 ${end}: the PDF writes ${JSON.stringify(w)}; the sheet's lines for ${b?.fact}: ${JSON.stringify(said)}`);
    ok(`QA-396 setup: the PDF copy writes ${end} = Y once the principal has an entry`, w === "Y", { box: b?.box, written: w, value: b?.value, detail: b?.detail });
    ok(`QA-396 fail today: the answer sheet says Yes to the question ${end} asks (the PDF writes Y)`, lines.some((l) => l.subject === P && l.fact === b?.fact && /^Yes$/i.test(String(l.copy_text))), said);
  }
});
