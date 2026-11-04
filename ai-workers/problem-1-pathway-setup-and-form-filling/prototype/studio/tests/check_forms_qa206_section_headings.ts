// QA-206 (C3.4, C4.1; P-158 sections from sources, P-319 no form number in code, PRODUCT §4 plain words): the C3.4 rules
// pass (no AI, US$0) names each proposed section after the heading printed on the form above its boxes, read from the
// form's own text (prototype/p1/xfa_headings.py → <form>.headings.json), never after the PDF's internal part name
// ("Table1", "Page wrapper", IMM 5475's "Five", "Seven"). Where no printed heading is found, the proposal says the name
// must be changed, and Accept refuses it until a person renames it. A passing and a failing check per rule. On an
// isolated copy with the six loaded (Demo load). No browser, no model call.
//   zsh studio/tools/isolated.sh forms_qa206 4437 start && tsx studio/tests/check_forms_qa206_section_headings.ts 4437 xr_studio_forms_qa206
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR, pack2, run } from "../acceptance/lib/pack2.ts";
import { draftFromInventory, headingsFor, words as partWords } from "../api/src/form-masters.ts";
import { UNNAMED_WHY } from "../api/src/proposals.ts";

const SOLUTION = join(import.meta.dirname, "..", "..", "..");
const T = pack2("QA-206");
const { call, ok, words, sql } = T;
const NONE = "00000000-0000-4000-8000-000000000000";

/** The rules pass over a committed form inventory, with the headings file beside it. */
function drafted(form: string) {
  const rel = `prototype/p1/inventory/${form}.inventory.json`;
  const inv = JSON.parse(readFileSync(join(SOLUTION, rel), "utf8"));
  return draftFromInventory(inv.fields, headingsFor(rel, inv.summary.sha256)).sections;
}
/** A label read from the printed words: the printed heading in sentence case, its number left out. */
const fromPrint = (s: { label: string | null; quote: string }) => !!s.label && s.label.toLowerCase() === s.quote.replace(/^\s*\d{1,2}\s*[.)]\s+/, "").replace(/\s*\(continued\)\s*$/i, "").toLowerCase();
/** The internal part names the rules pass used to show (QA-206's evidence), in the words it made of them. */
const INTERNAL = ["Table1", "PageWrapper", "Five", "Seven", "BackgroundInfo2", "natID", "USCard", "Contacts_Row2", "AppDetails", "MaritalStatus", "DetailsOfVisit", "Occupation", "BackgroundInfo"].map((p) => partWords(p).toLowerCase());

run(async () => {
  // ─────────────────── the pure rules, on the real forms
  const vv = drafted("imm5257e");
  const vvNames = vv.map((s) => s.label);
  ok("QA-206 pass: IMM 5257's sections are its printed headings (Personal details, Details of visit to Canada, Background information …)", ["Personal details", "Contact information", "Details of visit to Canada", "Education", "Employment", "Background information"].every((n) => vvNames.includes(n)), vvNames);
  ok("QA-206 fail: every IMM 5257 section is named from its printed heading, none after an internal part (Page wrapper, Background info2, Us card, Contacts row2 …)", vv.length > 0 && vv.every((s) => (s.unnamed && s.label === null) || (fromPrint(s) && !INTERNAL.includes(s.label!.toLowerCase()))), vv.map((s) => [s.label, s.quote]));
  ok("QA-206 pass: each named section rests on its printed heading as the quote (\"DETAILS OF VISIT TO CANADA\")", vv.find((s) => s.label === "Details of visit to Canada")?.quote === "DETAILS OF VISIT TO CANADA", vv.map((s) => s.quote));
  ok("QA-206 pass: the parts whose questions go on under one printed banner are one section (IMM 5257's background questions 1 to 6)", vv.filter((s) => s.label === "Background information").length === 1 && (vv.find((s) => s.label === "Background information")?.fieldKeys.length ?? 0) > 10);
  // Review M2: the consent and signature part prints no question of its own, so the banner above it is not carried to it.
  ok("QA-206 fail (review M2): IMM 5257's consent and signature part is not put under \"Background information\": it is held unnamed", vv.some((s) => s.part === "Consent1" && s.unnamed) && !vv.some((s) => s.label === "Background information" && s.fieldKeys.some((k) => /Consent1/.test(k))), vv.map((s) => [s.part, s.label]));
  ok("QA-206 pass: \"PERSONAL DETAILS (CONTINUED)\" on page 2 is one section with page 1's Personal details", vv.filter((s) => s.label === "Personal details").length === 1 && (vv.find((s) => s.label === "Personal details")?.fieldKeys ?? []).some((k) => /Page2\[0\]\.MaritalStatus/.test(k)));
  // Review M1: the heading is the first text printed above the boxes, its note in brackets left out; a banner printed
  // lower in the part (IMM 5645 prints "SECTION D - CERTIFICATION" at the foot of Section C), or a box's caption
  // (IMM 5646's "OFFICIAL SEAL OF NOTARY PUBLIC"), never names it.
  const fam = drafted("imm5645e");
  ok("QA-206 fail→pass (review M1): IMM 5645's Section C is \"Section C - brothers and sisters\", Section B \"Section B - children\", never \"Section D - certification\"", fam.some((s) => s.part === "SectionC" && s.label === "Section C - brothers and sisters") && fam.some((s) => s.part === "SectionB" && s.label === "Section B - children") && !fam.some((s) => /Section D/.test(s.label ?? "")), fam.map((s) => [s.part, s.label]));
  const cust = drafted("imm5646e");
  ok("QA-206 fail (review M1): IMM 5646's custodian declaration is held unnamed, never \"Official seal of notary public\"", cust.some((s) => s.part === "subDeclaration" && s.unnamed) && !cust.some((s) => /seal/i.test(s.label ?? "")), cust.map((s) => [s.part, s.label]));
  // Review M3: two different parts are never merged because they print the same words; the same part on two pages is.
  const gen = drafted("imm0008e");
  const applicant = gen.find((s) => s.label === "Personal details");
  ok("QA-206 fail (review M3): IMM 0008's applicant \"Personal details\" holds no dependant's boxes (they are under \"Dependant(s)\")", !!applicant && applicant.fieldKeys.every((k) => !/dep/i.test(k)) && gen.some((s) => s.label === "Dependant(s)" && s.fieldKeys.some((k) => /dependants/i.test(k))), gen.map((s) => [s.label, s.fieldKeys.length]));
  ok("QA-206 pass: IMM 5646's two pages give one \"Student information\" section, not two", cust.filter((s) => s.label === "Student information").length === 1);
  // Review r2 M4: a part name reused on another page ("PageWrapper") is not the same part, so it never takes that page's
  // heading; and a child part that prints its own banner (IMM 1295's "EMPLOYMENT" inside the wrapper that starts with
  // "EDUCATION") is a section of its own.
  const wp = drafted("imm1295e");
  const edu = wp.find((s) => s.label === "Education"), emp = wp.find((s) => s.label === "Employment");
  ok("QA-206 fail (review r2 M4): IMM 1295's \"Education\" holds no page 4 background question and no employment box", !!edu && edu.fieldKeys.every((k) => !/Page4\[0\]/.test(k) && !/Occupation/.test(k)), edu?.fieldKeys.filter((k) => /Page4\[0\]|Occupation/.test(k)).slice(0, 5));
  ok("QA-206 pass (review r2 M4): IMM 1295's employment boxes are under its printed \"EMPLOYMENT\"", !!emp && emp.quote === "EMPLOYMENT" && emp.fieldKeys.length > 10 && emp.fieldKeys.every((k) => /Occupation/.test(k)), emp?.fieldKeys.slice(0, 3));
  const fam6 = drafted("imm5406e");
  ok("QA-206 fail (review r3 M5): no IMM 5406 section named \"Applicant\" holds the spouse's or a parent's boxes", fam6.every((s) => s.label !== "Applicant" || s.fieldKeys.every((k) => !/Spouse|Parent/.test(k))) && fam6.some((s) => s.fieldKeys.some((k) => /Spouse/.test(k))), fam6.map((s) => [s.label, s.fieldKeys.length]));
  ok("QA-206 fail (review r2 M4): IMM 1295's page 4 wrapper with background questions 3 to 6 is held unnamed, not put under page 3's heading", wp.some((s) => s.part === "PageWrapper" && s.unnamed && s.fieldKeys.some((k) => /Page4\[0\]/.test(k))), wp.map((s) => [s.part, s.label]));
  const twice = draftFromInventory([{ data_path: "a", section: "Page1.Applicant.A", caption: "Name" }, { data_path: "b", section: "Page1.Spouse.A", caption: "Name" }], { "Page1.Applicant": { heading: "Personal details", printed: "PERSONAL DETAILS", how: "banner" }, "Page1.Spouse": { heading: "Personal details", printed: "PERSONAL DETAILS", how: "banner" } });
  ok("QA-206 fail (review M3): a second part printing the same heading is held unnamed, saying the form prints that heading over another part too", twice.sections.length === 2 && twice.sections.filter((s) => s.label === "Personal details").length === 1 && twice.sections.some((s) => s.unnamed && /prints "PERSONAL DETAILS" over another part too/.test(s.why ?? "")), twice.sections);
  const mrd = drafted("imm5475e");
  ok("QA-206 pass: IMM 5475's part \"Seven\" is proposed under its printed heading \"Your declaration\"", mrd.some((s) => s.label === "Your declaration" && s.part === "Seven" && s.quote === "7. Your declaration"), mrd.map((s) => [s.part, s.label]));
  ok("QA-206 fail: IMM 5475's parts with no printed heading of their own (AppDetails, Five) are held unnamed, never \"Five\"", mrd.filter((s) => s.unnamed).map((s) => s.part).sort().join() === "AppDetails,Five" && mrd.every((s) => !s.label || fromPrint(s)), mrd.map((s) => [s.part, s.label]));
  ok("QA-206 fail: a headings file read from another file (checksum differs) is not used: every section is held unnamed", headingsFor("prototype/p1/inventory/imm5257e.inventory.json", "0".repeat(64)) === null && Object.keys(headingsFor("prototype/p1/inventory/imm5257e.inventory.json", JSON.parse(readFileSync(join(SOLUTION, "prototype/p1/inventory/imm5257e.inventory.json"), "utf8")).summary.sha256) ?? {}).length > 5);
  const none = draftFromInventory([{ data_path: "z1", section: "Page1.PageWrapper.A", caption: "Family name" }]);
  ok("QA-206 fail (review m1): with no headings read, a part is held unnamed and says its headings were not read (not that the form has none)", none.sections.length === 1 && none.sections[0].unnamed && none.sections[0].label === null && /have not been read/.test(none.sections[0].why ?? ""), none.sections);
  ok("QA-206 pass (review m4): IMM 5475's two unnamed parts can be told apart by their first boxes", new Set(mrd.filter((s) => s.unnamed).map((s) => s.captions.join("; "))).size === 2, mrd.map((s) => s.captions));

  // ─────────────────── on the copy: To review and Accept
  await T.ready();
  const combo = T.combo("vv.single");
  const before = T.spent();
  // The queue group each draft names (IMM 5475 has two edition labels, QA-205: the draft's own group is the one meant).
  const groups: Record<string, string> = {};
  for (const [file, form] of [["imm5257e.pdf", "IMM 5257"], ["imm5475e.pdf", "IMM 5475"]] as const) {
    const att = T.attachment(combo, file);
    const r = await call("POST", `/attachments/${att}/draft-masters`, { mode: "rules" }, AUTHOR);
    groups[form] = String(r.body?.group ?? "");
    ok(`setup: ${form}'s rules pass drafts its sections (201)`, !!att && r.status === 201 && groups[form].startsWith(`edition:${form} (`), r.status >= 300 ? words(r) : r.body);
  }
  const sectionsOf = async (form: string) => {
    const b = groups[form] ? (await call("GET", `/review/proposals?group=${encodeURIComponent(groups[form])}`)).body?.group?.bands ?? {} : {};
    return [...(b.ready ?? []), ...(b.check ?? []), ...(b.decide ?? [])].filter((x: any) => x.step === "masters_edition" && x.kind === "section");
  };
  const s5257 = await sectionsOf("IMM 5257"), s5475 = await sectionsOf("IMM 5475");
  const t5257 = s5257.map((x: any) => String(x.title));
  ok("QA-206 pass: To review shows IMM 5257's sections under their printed headings", t5257.includes("Personal details") && t5257.includes("Details of visit to Canada") && t5257.includes("Background information"), t5257);
  ok("QA-206 fail: To review shows no IMM 5257 section under an internal part name", s5257.length > 0 && t5257.every((t: string) => !INTERNAL.includes(t.toLowerCase()) && (vvNames.includes(t) || /^Unnamed section \d+ of IMM 5257$/.test(t))), t5257);
  const unnamed = s5475.filter((x: any) => /^Unnamed section \d+ of IMM 5475$/.test(String(x.title)));
  ok("QA-206 pass: To review shows IMM 5475's \"Your declaration\" and two sections that say they must be named", s5475.some((x: any) => x.title === "Your declaration") && unnamed.length === 2, s5475.map((x: any) => x.title));
  ok("QA-206 pass: an unnamed section says in plain words that it must be named before Accept", unnamed.every((x: any) => String(x.reason ?? "").includes(UNNAMED_WHY)), unnamed.map((x: any) => x.reason));

  const waiting = () => Number(sql(`select count(*) from library_change where status='WAITING' and kind='section'`));
  const w0 = waiting(), u = unnamed[0], payload = u?.readings?.draft?.payload;
  let r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "accept" }, AUTHOR);
  ok("QA-206 fail: Accept of an unnamed section is refused (409) in plain words, and nothing lands", !!u && r.status === 409 && words(r).includes(UNNAMED_WHY) && waiting() === w0, words(r));
  const named = s5475.find((x: any) => x.title === "Your declaration");
  r = await call("POST", "/review/proposals/decide", { ids: [named?.id ?? NONE, u?.id ?? NONE], action: "accept" }, AUTHOR);
  // Review m5: rules items are never accepted together (bulkWhy, P-121), so this refusal comes from that rule first; the
  // guard's own bulk branch stays as a second lock.
  ok("QA-206 fail: an unnamed section accepted with others is refused too, and nothing lands", r.status === 409 && waiting() === w0, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "edit", payload: { ...payload, label: ` ${String(payload?.label ?? "").toUpperCase()} ` } }, AUTHOR);
  ok("QA-206 fail: an edit that keeps the placeholder name is refused (409)", r.status === 409 && words(r).includes(UNNAMED_WHY) && waiting() === w0, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "edit", payload: { ...payload, label: "Unnamed section of mine" } }, AUTHOR);
  ok("QA-206 fail: an edit to another \"Unnamed section …\" name is refused (409)", r.status === 409 && waiting() === w0, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "edit", payload: { ...payload, label: "unnamed  Section of mine" } }, AUTHOR);
  ok("QA-206 fail (review m2): spacing or case never gets a placeholder name past the check (409)", r.status === 409 && waiting() === w0, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "edit", payload: { ...payload, label: "Applicant and application details" } }, AUTHOR);
  const title = sql(`select title from logical_section where title='Applicant and application details' and status='DRAFT' limit 1`);
  ok("QA-206 pass: once a person names it, the section is accepted under that name and waits for a second person", r.status < 300 && title === "Applicant and application details" && waiting() === w0 + 1, r.status >= 300 ? words(r) : title);
  r = await call("POST", "/review/proposals/decide", { ids: [named?.id ?? NONE], action: "accept" }, AUTHOR);
  ok("QA-206 pass: a section named from its printed heading is accepted as it is", !!named && r.status < 300 && waiting() === w0 + 2, r.status >= 300 ? words(r) : undefined);
  const rej = unnamed[1];
  r = await call("POST", "/review/proposals/decide", { ids: [rej?.id ?? NONE], action: "reject", reason: "Not a section of its own" }, AUTHOR);
  ok("QA-206 pass: an unnamed section can still be rejected", !!rej && r.status < 300, r.status >= 300 ? words(r) : undefined);
  // Devin review on #883: a rules-pass section drafted before printed headings were read (no "printed_heading" result;
  // its edition's one draft is never redone, P-138) may carry the PDF's part name: Accept refuses it, an edit with a name a
  // person typed lands it, the same name included once typed.
  const old = s5257.find((x: any) => x.title === "Education");
  sql(`update proposal_item set payload = jsonb_set(payload, '{label}', '"Page wrapper"'), rules = '[{"rule":"from_form_part","passed":true,"why":null}]'::jsonb, work = '{}'::jsonb where id = '${old?.id ?? NONE}'`);
  const w2 = waiting();
  r = await call("POST", "/review/proposals/decide", { ids: [old?.id ?? NONE], action: "accept" }, AUTHOR);
  ok("QA-206 fail (Devin review): a section drafted before printed headings were read (\"Page wrapper\") is not accepted as it is (409), in words", !!old && r.status === 409 && /drafted before the form's printed headings were read/.test(words(r)) && waiting() === w2, words(r));
  const oldPayload = (await call("GET", `/review/proposals?group=${encodeURIComponent(groups["IMM 5257"])}`)).body?.group?.bands?.check?.find((x: any) => x.id === old?.id)?.readings?.draft?.payload;
  r = await call("POST", "/review/proposals/decide", { ids: [old?.id ?? NONE], action: "edit", payload: { ...(oldPayload ?? {}), label: "Unnamed  section" } }, AUTHOR);
  ok("QA-206 fail (Devin review): such a section is not landed under a placeholder name either (409)", r.status === 409 && waiting() === w2, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [old?.id ?? NONE], action: "edit", payload: { ...(oldPayload ?? {}), label: "Education and training" } }, AUTHOR);
  ok("QA-206 pass (Devin review): named by a person, it lands under that name", r.status < 300 && waiting() === w2 + 1 && sql("select count(*) from logical_section where title = 'Education and training'") === "1", r.status >= 300 ? words(r) : undefined);
  // Review r5 M6: an old-shape section that reuses a library section adds no name, so it accepts as a reuse, as before:
  // no new library row, no duplicate of the section it reuses.
  const reuser = s5257.find((x: any) => x.title === "Employment");
  const reusedKey = sql("select section_key from logical_section where title = 'Education and training' limit 1");
  sql(`update proposal_item set rules = '[{"rule":"from_form_part","passed":true,"why":null}]'::jsonb, work = '{}'::jsonb, reuse = '{"match":"reuse","existingKey":"${reusedKey}"}'::jsonb, payload = jsonb_set(payload, '{label}', '"Education and training"') where id = '${reuser?.id ?? NONE}'`);
  const sec0 = Number(sql("select count(*) from logical_section")), w3 = waiting();
  r = await call("POST", "/review/proposals/decide", { ids: [reuser?.id ?? NONE], action: "accept" }, AUTHOR);
  ok("QA-206 pass (review r5 M6): an old-shape section that reuses a library section is accepted as a reuse, adding no library row", !!reuser && r.status < 300 && Number(sql("select count(*) from logical_section")) === sec0 && waiting() === w3 && sql("select count(*) from logical_section where title = 'Education and training'") === "1", r.status >= 300 ? words(r) : r.body?.items);
  ok("QA-206 pass: the whole check spent US$0", T.spent() === before);
  T.done();
});
