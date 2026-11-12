// C7.3 Portal sheet: answers in the portal's order with copy buttons (M3-E; r5c BR-8; P-62 §6, P-152 (3)). Visitor
// visa part: IMM 5707 is an Online line (Sample, FQ-2). Until the W6 extension the answer sheet follows the sections of
// the PDF twin (contracts/pdf-sections.json: Section A, B, C), from every declared or confirmed answer (P-411, B150), each answer with its source, its mark and
// the text to copy; "Entered in the portal" per section freezes that section's answers. A changed fact after "Entered"
// marks the section out of date (C9.2-5).
// Breadth, after Visitor visa: the live portal screen order (W6, parked), online-only forms ordered by the drafted form.
// Built (runtime lane, C7.3 PR): a tick sends the section's `version` from the sheet it read (M3-CONTRACT: "every write
// carries a version (409 → Reload)"), so it freezes what the officer saw; the rules are unchanged.
// On the configured checkpoint (P-322; runtime lane, 5 Nov, #1075): the pack follows the case's Online form line, not
// a form number. A release with no Online line (the checkpoint's release 1, every line a PDF upload) has the officer
// file the visitor visa application Online on the case, inside what IRCC accepts (C11.6; VV-R02 "You must apply
// online"), until release 2's channels land (DEMO.md row 9). The sheet's sections are then the form's own parts as the
// release's configuration names them (order_basis "form_parts"), else the twin's (fixture). The 13 rules are unchanged.
// Row C2 (M3 sprint plan): which form is the Online line, and which is the application filed Online when there is none,
// come from row C1's expectedFor (the case's pinned release as configured and the pack's own people), never from
// /prepare's answer; /prepare must then hold that very item.
//   tsx studio/acceptance/C7.3.test.ts 4440 xr_studio_accept
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { proseRecorded, recordedDerivation } from "../../p5/transforms.ts";
import { CLIENT, OFFICER, call, expectedFor, fillEverything, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo, answer, confirmAll, generateCopy, agent, copyBytes } from "./lib/m3.ts";

type Sheet = { order_basis: string; form?: string; sections: { key: string; title: string; entered: { at: string; by: string } | null; out_of_date?: boolean; answers: { label: string; fact: string; value: unknown; copy_text: string; source: string; subject?: string }[]; waiting?: { fact: string }[] }[] };
/** QA-396: what a PDF copy itself writes (its XFA data leaves, data path → text), read by p1/e5_roundtrip.py as the
 *  QA-165 checks read it; null when the reader is not on this machine (the step then says so, never a pass). */
function writtenByPdf(pdf: Buffer): Record<string, string> | null {
  const SOL = join(import.meta.dirname, "..", "..", ".."), PY = join(SOL, "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
  const code = `
import sys, json, xml.etree.ElementTree as ET
sys.path.insert(0, ${JSON.stringify(join(SOL, "prototype", "p1"))})
import e5_roundtrip as E
b = sys.stdin.buffer.read(); parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(b)).items()}
print(json.dumps({p: v for p, v in E.leaves(E.data_root(ET.fromstring(parts["datasets"]))) if v.strip()}))`;
  const r = spawnSync(PY, ["-I", "-c", code], { input: pdf, encoding: "buffer", timeout: 120_000, maxBuffer: 1 << 26 });
  return r.status === 0 ? JSON.parse(String(r.stdout)) : null;
}

const TWINS = JSON.parse(readFileSync(join(import.meta.dirname, "..", "contracts", "pdf-sections.json"), "utf8")) as Record<string, Record<string, string>>;
/** The form's own parts as the database held them when the case's release was released, in the order the form's own
 *  field list prints them (review M4 on #1075: read apart from the route, from the field list, not the field map's
 *  order): each part's title is the release's own title for its library key, else its proposal's name; `facts` is
 *  whether any of its form fields carries a fact in the release's field map (a part with none is nothing to type). */
function ownParts(caseId: string, form: string): { title: string; facts: boolean }[] {
  const rel = JSON.parse(sql(`select json_build_object('snap', r.snapshot, 'at', r.released_at)::text from config_release r join pack_work_pin w on w.config_release_id = r.id where w.case_id = '${caseId}'`) ?? "{}") as { at?: string; snap?: { field_maps?: { form_number: string; form_edition?: string; inventory_file?: string; entries?: { data_path: string; fact?: string | null }[] }[]; sections?: { id: string; title: string }[]; section_titles?: { id: string; title: string }[] } };
  const m = rel.snap?.field_maps?.find((x) => x.form_number === form);
  if (!m?.form_edition || !rel.at) return [];
  const list = m.inventory_file ? (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", m.inventory_file), "utf8")) as { fields: { data_path?: string | null }[] }).fields.map((f) => f.data_path).filter((x): x is string => !!x) : [];
  const at = new Map(list.map((k, n) => [k, n] as const));
  const withFact = new Set((m.entries ?? []).filter((e) => e.fact).map((e) => e.data_path.slice(0, 120)));
  const titles = new Map([...(rel.snap?.section_titles ?? []), ...(rel.snap?.sections ?? [])].map((x) => [x.id, x.title] as const));
  const rows = (sql(`select (case when p.decided_at <= '${rel.at}'::timestamptz then p.status else 'waiting' end) || chr(9) || coalesce(p.decided_key, '') || chr(9) || coalesce(case when p.decided_at <= '${rel.at}'::timestamptz then null else p.work->'beforeEdit'->>'label' end, p.payload->>'label', '') || chr(9) || coalesce(case when p.decided_at <= '${rel.at}'::timestamptz then null else p.work->'beforeEdit'->'fieldKeys' end, p.payload->'fieldKeys')::text from proposal_item p where p.kind = 'section' and p.form_edition = '${m.form_edition.replace(/'/g, "''")}' and p.created_at <= '${rel.at}'::timestamptz order by p.created_at, p.id`) ?? "").split("\n").filter(Boolean);
  const parts = rows.map((r) => { const [status, key, label, keys] = r.split("\t"); const ks = JSON.parse(keys) as string[]; const named = (status === "accepted" || status === "edited") && !!key;
    return { status, title: (named ? titles.get(key) : null) ?? label, first: Math.min(...ks.map((k) => at.get(k) ?? [...at.keys()].findIndex((x) => x.startsWith(k)) ?? -1).map((n) => (n < 0 ? Number.MAX_SAFE_INTEGER : n))), facts: ks.some((k) => withFact.has(k.slice(0, 120))) }; })
    .filter((x) => x.status !== "rejected");
  const seen = new Set<string>();
  return parts.sort((a, b) => a.first - b.first).filter((x) => (seen.has(x.title) ? false : (seen.add(x.title), true)));
}

await main("C7.3", "Answer sheet for an Online line", async () => {
  const vv = needVisitorVisa();
  // QA-305 review m2: each date once, so a run across midnight never compares against another day's date.
  const DOB_P = yearsAgo(40), DOB_S = yearsAgo(38);
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: DOB_P }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: DOB_S }]);
  const P = c.subjects["Sample Client A"];
  let p = (await prepare(c.id)).p;
  // Row C2: the principal's expected lines from the case's own release (row C1). An unreadable release stops the pack:
  // it is not a C7.3 result, and no form number written here stands in for it.
  const mine = (await expectedFor(c.id))?.["Sample Client A"];
  if (!mine) { console.log("STOP  setup: the case's expected lines could not be read (expectedFor, row C1)"); process.exit(2); }
  // The release's Online form line for the principal; none on the release: the officer files the application, the
  // release's barcode form (VV-R04), Online on the case (C11.6; VV-R02).
  const online = mine.forms.find((l) => l.online), APPLICATION = mine.forms.find((l) => l.barcode)?.form;
  let item = online ? itemsOf(p, P, online.form)[0] : undefined;
  if (!online) {
    if (!APPLICATION) { console.log("STOP  setup: the release gives the principal neither an Online line nor an application form (expectedFor)"); process.exit(2); }
    const app = itemsOf(p, P, APPLICATION)[0];
    const moved = await call("PATCH", `/runtime/items/${app?.id}/channel`, { channel: "ONLINE", version: (p as { version?: string } | null)?.version }, OFFICER);
    // Challenge m9: the setup step is asserted, never only logged: a refused change stops the pack (not a C7.3 result).
    if (moved.status !== 200) { console.log(`STOP  setup: the officer could not file ${APPLICATION} Online on the case (C11.6): ${moved.status} ${JSON.stringify(moved.body).slice(0, 200)}`); process.exit(2); }
    console.log(`      setup: no Online line on this release, so the officer filed ${APPLICATION} Online on the case (C11.6, 200)`);
    p = (await prepare(c.id)).p;
    item = itemsOf(p, P, APPLICATION)[0];
  }
  console.log(`      expected (row C1): the principal's Online form is ${online?.form ?? `${APPLICATION}, filed Online on the case`}`);
  const FORM = item?.form ?? "";
  const sheet = async (actor = OFFICER) => { const r = await call("GET", `/runtime/items/${item?.id}/answer-sheet`, undefined, actor); return { r, s: r.status === 200 ? r.body as Sheet : null }; };
  let { r, s } = await sheet();
  ok("C7.3-1 pass: an Online form item has an answer sheet for the officer", r.status === 200 && item?.channel === "ONLINE" && item.form === (online?.form ?? APPLICATION), { status: r.status, form: item?.form, channel: item?.channel });
  ok("C7.3-2 fail: a client cannot read the answer sheet (403)", (await sheet(CLIENT)).r.status === 403);
  // Until W6: the form's own parts as the release held them, in the order the form's field list prints them (required
  // whenever the release holds parts for the form: review M4), else the twin's (the fixture).
  const own = ownParts(c.id, FORM), shown = s?.sections.map((x) => x.title) ?? [];
  const want = own.length ? own.filter((x) => x.facts).map((x) => x.title) : Object.values(TWINS[FORM] ?? {});
  ok("C7.3-3 pass: the sheet follows the form's own sections in order (the release's parts, else the PDF twin's) until W6", shown.length > 0 && (own.length ? s?.order_basis === "form_parts" : s?.order_basis === "pdf_twin") && JSON.stringify(shown.filter((t) => t !== "Other questions")) === JSON.stringify(want), { basis: s?.order_basis, shown, want });
  // P-411 (B150 review M2; QA-305): the officer typed each person's date of birth (openCase), not confirmed yet. Each
  // person's own sheet shows that person's own date of birth at once, marked entered by staff and to confirm (on the
  // checkpoint each adult has their own IMM 5257 sheet; on the fixture each their own IMM 5707 sheet). Where only the
  // principal's item of the form is Online, the spouse's date is read on the principal's sheet, if that form carries it.
  // And every date of birth a sheet read shows, whoever's, is marked entered by staff and to confirm (review m1).
  type SA = { fact: string; subject?: string; value?: unknown; copy_text?: string; source?: string; mark?: string | null; to_confirm?: boolean };
  const S = c.subjects["Sample Spouse A"];
  const dobs = (sh: Sheet | null) => (sh?.sections ?? []).flatMap((x) => x.answers as SA[]).filter((x) => x.fact === "person.date_of_birth");
  const dobOn = (sh: Sheet | null, subject: string) => dobs(sh).find((x) => x.subject === subject);
  const spouseItem = itemsOf(p, S, FORM).find((x) => x.channel === "ONLINE");
  const spouseRead = spouseItem ? await call("GET", `/runtime/items/${spouseItem.id}/answer-sheet`, undefined, OFFICER) : null;
  const spouseSheet = spouseRead ? (spouseRead.status === 200 ? spouseRead.body as Sheet : null) : s;
  const typed = [{ who: "Sample Client A", a: dobOn(s, P), dob: DOB_P }, { who: "Sample Spouse A", a: dobOn(spouseSheet, S), dob: DOB_S }];
  const every = [...dobs(s), ...(spouseRead ? dobs(spouseSheet) : [])];
  ok("C7.3-4 pass (P-411 (2), B150, QA-305): before confirmation each person's sheet already shows that person's own officer-typed date of birth, marked \"entered by staff\" and to confirm; every date of birth shown is so marked", typed.every((t) => t.a?.value === t.dob && t.a.mark === "by_staff" && t.a.to_confirm === true) && every.length >= 2 && every.every((x) => x.mark === "by_staff" && x.to_confirm === true), { spouse_sheet: spouseItem ? `own (${spouseRead?.status})` : "the principal's", typed, every: every.length });
  ok("C7.3-4b fail: an unanswered fact is never shown as a value, only waited for", (s?.sections ?? []).some((x) => (x.waiting ?? []).length > 0) && !(s?.sections ?? []).some((x) => x.answers.some((y) => y.fact === "person.family_name")));

  await fillEverything(c.id);
  ({ s } = await sheet());
  const a = s?.sections[0]?.answers ?? [];
  const name = a.find((x) => x.fact === "person.family_name" && x.subject === P);
  ok("C7.3-5 pass: the first section (Section A on the twin) lists the applicant's confirmed answers with their source and the text to copy, no longer to confirm", !!name && name.copy_text === String(name.value) && ["Document", "Client", "Case officer"].includes(name.source) && (name as { to_confirm?: boolean }).to_confirm === false, name);
  ok("C7.3-6 pass: the first section also carries the spouse's answers (the form includes the spouse, VV-R07), labelled by person", a.some((x) => x.subject === c.subjects["Sample Spouse A"]));
  ok("C7.3-7 pass: a date is offered to copy as the portal takes it (YYYY-MM-DD)", a.filter((x) => /date/.test(x.fact)).length > 0 && a.filter((x) => /date/.test(x.fact)).every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.copy_text)));

  const sec = s?.sections[0]?.key;
  r = await call("POST", `/runtime/items/${item?.id}/screens/${sec}/entered`, {}, CLIENT);
  ok("C7.3-8 fail: a client cannot tick \"Entered in the portal\" (403)", r.status === 403, r.status);
  const ver = (s?.sections[0] as { version?: string } | undefined)?.version;
  r = await call("POST", `/runtime/items/${item?.id}/screens/${sec}/entered`, { version: ver }, OFFICER);
  ({ s } = await sheet());
  ok("C7.3-9 pass: \"Entered in the portal\" ticks the first section with who and when", r.status === 201 && s?.sections[0]?.entered?.by === OFFICER, r.body);
  ok("C7.3-10 pass (data): the tick freezes the answers it showed (an answer snapshot)", !!sql(`select facts_json from answer_snapshot where id=(select snapshot_id from entered_section where item_id='${item?.id}' and section_key='${sec}')`));
  r = await call("POST", `/runtime/items/${item?.id}/screens/${sec}/entered`, { version: ver }, OFFICER);
  ok("C7.3-11 pass: ticking again changes nothing (one tick, 200 not 201)", r.status === 200 && sql(`select count(*) from entered_section where item_id='${item?.id}' and section_key='${sec}'`) === "1");
  await answer(c.id, P, "person.family_name", "SAMPLEDX"); await confirmAll(c.id, P);
  ({ s } = await sheet());
  ok("C7.3-12 pass (P-65): a changed fact marks the entered section out of date, the frozen answers unchanged, the new value shown", s?.sections[0]?.out_of_date === true && s.sections[0].answers.some((x) => x.fact === "person.family_name" && x.value === "SAMPLEDX"));
  p = (await prepare(c.id)).p;
  ok("C7.3-13 pass: the Online form item reads Out of date; it warns only (an entered Online section, BR-9 and P-168; P-136 also said \"entered\": FQ-6)", itemsOf(p, P, FORM)[0]?.state === "out_of_date" && !(p?.readiness ?? []).some((x) => x.blocks.some((b) => b.words.includes(FORM) && b.code === "out_of_date")));
  // QA-392 (qa lane, 11 Nov; master analysis #1532, 07b suspects (a) and (c); Lead 17's ask): the sheet and the PDF copy of
  // the same form agree box by box. What the PDF wrote is the boxes fill-case.ts stored with the copy (after
  // markNothingRecorded), as engine/form-values.ts writes them; a sheet line is the same person's same fact.
  const copyId = await generateCopy(c.id, FORM, P);
  ({ s } = await sheet());
  type Box = { box: string; fact: string; about: string; about_label?: string; value?: unknown; detail?: string; transform?: string | null };
  const boxes = JSON.parse(sql(`select s.facts_json->'boxes' from form_instance f join answer_snapshot s on s.id = f.snapshot_id where f.id = '${copyId}'`) ?? "[]") as Box[];
  const lines = (s?.sections ?? []).flatMap((x) => x.answers as SA[]), on = new Set(lines.map((l) => `${l.subject}|${l.fact}`));
  const nothing = boxes.filter((b) => /^nothing recorded/.test(b.detail ?? ""));
  // QA-392 (fixed by its forms PR): the sheet reads the same rule as the copy (engine/runtime/forms.ts markNothingRecorded),
  // so each such box has its line, for the same person and fact, and says the same No the PDF wrote.
  const lineOf = (b: Box) => lines.find((l) => l.subject === b.about && l.fact === b.fact);
  // Review m1 on #1553: its source and mark are those of the "none apply" that vouches for it (the questionnaire's own).
  const groups = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []) as { subjectId: string; questions: { fact: string }[]; group: { none_apply: { value: boolean; mark: string; channel: string; answered: { channel: string } | null } | null } | null }[];
  const vouch = (b: Box) => groups.find((x) => x.subjectId === b.about && x.group?.none_apply?.value && x.questions.some((q) => q.fact === b.fact))?.group?.none_apply;
  const sourceOf = (ch?: string) => (/document/.test(ch ?? "") ? "Document" : ch === "questionnaire" || ch === "own_link" ? "Client" : "Case officer");
  const missing14 = nothing.filter((b) => { const l = lineOf(b), v = vouch(b); return !l || l.value !== false || l.copy_text !== "No" || !v || l.source !== sourceOf(v.answered?.channel ?? v.channel) || l.mark !== v.mark; }).map((b) => `${b.about_label}: ${b.box.split(".").slice(-2).join(".")} (${lineOf(b)?.copy_text ?? "no line"}, ${lineOf(b)?.source}, ${lineOf(b)?.mark}; none apply ${vouch(b)?.mark ?? "none"})`);
  // Never vacuous: a release that maps a "recorded" Yes/No box (the checkpoint's IMM 5257: Question 8 A, Education
  // Question 1) must give at least one; only a release that maps none (pack 4's fixture) has nothing to compare.
  const recorded = boxes.filter((b) => b.about && b.about !== "case" && (recordedDerivation(b.transform) || proseRecorded(b.transform)));
  ok(`C7.3-14 fail (QA-392): each "nothing recorded" Yes/No box the PDF copy writes as No (a list answered "none apply") has its line on the answer sheet for that person, reading the same No, with the source and mark of that "none apply"${recorded.length ? "" : " (this release maps no such box)"}`, !!copyId && (nothing.length > 0 || !recorded.length) && missing14.length === 0, { copy: copyId, recorded: recorded.length, nothing: nothing.length, missing: missing14 });
  const valued = boxes.filter((b) => b.value !== undefined && b.value !== null && b.value !== "");
  ok("C7.3-15a pass: every box the PDF copy writes from an answer has a line on the answer sheet for the same person and fact", valued.length > 0 && valued.every((b) => on.has(`${b.about}|${b.fact}`)), valued.filter((b) => !on.has(`${b.about}|${b.fact}`)).map((b) => b.box));
  const carried = new Set(boxes.map((b) => `${b.about}|${b.fact}`));
  ok("C7.3-16 pass (P-245): every answer-sheet line is a box the PDF copy carries (never a signature, the oath or another value the PDF does not print)", lines.length > 0 && lines.every((l) => carried.has(`${l.subject}|${l.fact}`)), lines.filter((l) => !carried.has(`${l.subject}|${l.fact}`)).map((l) => l.fact));
  // QA-396 (11 Nov; #1553's reviewer, Lead 17): C7.3-15 matches each box to its sheet line by value too, on a copy made
  // after the principal has one Education and one Previous residence entry. A box that says whether anything is recorded
  // ("derived:any …") must read on the sheet as the Yes or No the PDF writes; every other box as the same answer (person,
  // fact, row, value). Held while QA-396 is open (P-284, as C10.1 R12c): HELD names it, fails nothing in the whole run, and is
  // never green for a PR that claims it. The PR that fixes QA-396 turns it into a plain ok().
  type Sec = { subjectId: string; section: string; group: { none_apply?: { id: string; value: boolean } | null } | null; questions: { fact: string }[] };
  for (const fact of ["person.education_school_name", "person.previous_residence_country"]) {
    const g = (((await agent(c.id))?.sections ?? []) as Sec[]).find((x) => x.subjectId === P && x.group && x.questions.some((q) => q.fact === fact));
    if (!g) continue;
    if (g.group?.none_apply?.value) await call("PUT", `/runtime/cases/${c.id}/groups/${P}/${g.section}/none-apply`, { noneApply: false, expectedId: g.group.none_apply.id }, OFFICER);
    await call("POST", `/runtime/cases/${c.id}/groups/${P}/rows`, { group: g.section }, OFFICER);
  }
  await fillEverything(c.id); await fillEverything(c.id);
  const copy2 = await generateCopy(c.id, FORM, P);
  ({ s } = await sheet());
  type Box2 = Box & { transform?: string | null; row?: number | null };
  type SL = SA & { row?: number | null; copy_text?: string };
  const boxes2 = JSON.parse(sql(`select s.facts_json->'boxes' from form_instance f join answer_snapshot s on s.id = f.snapshot_id where f.id = '${copy2}'`) ?? "[]") as Box2[];
  const pdf2 = copy2 ? writtenByPdf(await copyBytes(copy2)) : null;
  const lines2 = (s?.sections ?? []).flatMap((x) => x.answers as SL[]);
  const isRecorded15 = (b: Box2) => !!b.about && b.about !== "case" && (!!recordedDerivation(b.transform) || proseRecorded(b.transform));
  // Review of #1557 (Block c23689a31): only the "recorded?" boxes are held for QA-396; any other box that does not match
  // its sheet line by value is a plain FAIL (C7.3-15v), so a future regression there is never hidden by the hold.
  const offRec: string[] = [], offPlain: string[] = [];
  for (const b of boxes2) {
    const mine = lines2.filter((l) => l.subject === b.about && l.fact === b.fact);
    if (isRecorded15(b)) {
      const w = pdf2?.[b.box]; if (w !== "Y" && w !== "N") continue;
      if (!mine.some((l) => String(l.copy_text) === (w === "Y" ? "Yes" : "No"))) offRec.push(`${b.about_label}: ${b.box.split(".").slice(-2).join(".")} written ${w}, no "${w === "Y" ? "Yes" : "No"}" line (${mine.map((l) => l.copy_text).join(", ") || "none"})`);
    } else if (b.value !== undefined && b.value !== null && b.value !== "") {
      if (!mine.some((l) => (b.row == null || l.row == null || l.row === b.row) && JSON.stringify(l.value) === JSON.stringify(b.value))) offPlain.push(`${b.about_label}: ${b.box.split(".").slice(-2).join(".")} = ${JSON.stringify(b.value)}, sheet: ${mine.map((l) => JSON.stringify(l.value)).join(", ") || "no line"}`);
    }
  }
  ok("C7.3-15v pass: on the copy with entries, every box that is not a \"recorded?\" box has its sheet line by person, fact, row and value", !!copy2 && boxes2.length > 0 && offPlain.length === 0, offPlain.slice(0, 6));
  // As C7.3-14: a release that maps no "recorded?" box (pack 4's fixture) has nothing to hold; one that maps such a box must
  // show at least one written Y (the entries were added), else the step proves nothing about the Yes side and FAILs.
  const mapped15 = boxes2.some(isRecorded15), yes15 = boxes2.filter((b) => isRecorded15(b) && pdf2?.[b.box] === "Y").length;
  const ready15 = !!copy2 && (!mapped15 || (!!pdf2 && yes15 > 0));
  const label15 = `C7.3-15 fail (QA-396): with entries recorded, each "recorded?" box reads on the sheet as the Yes or No the PDF copy writes${mapped15 ? "" : " (this release maps no such box)"}`;
  // Plain step since QA-396's fix (#1563) and QA-395's (#1566) merged (qa re-score, 12 Nov; P-284: the hold ends with the fix).
  ok(label15, ready15 && !offRec.length, ready15 ? (offRec.length ? { off: offRec.slice(0, 6) } : { boxes: boxes2.length, written_yes: yes15 }) : { copy: copy2, pdf_read: !!pdf2, recorded_boxes: boxes2.filter(isRecorded15).length, written_yes: yes15 });
});
