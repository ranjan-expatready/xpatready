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
  ok("QA-206 fail: every IMM 5257 section is named from its printed heading, none after an internal part (Page wrapper, Background info2, Us card, Contacts row2 …)", vv.length > 0 && vv.every((s) => fromPrint(s) && !INTERNAL.includes(s.label!.toLowerCase())), vv.map((s) => [s.label, s.quote]));
  ok("QA-206 pass: each named section rests on its printed heading as the quote (\"DETAILS OF VISIT TO CANADA\")", vv.find((s) => s.label === "Details of visit to Canada")?.quote === "DETAILS OF VISIT TO CANADA", vv.map((s) => s.quote));
  ok("QA-206 pass: the parts under one printed heading are one section (IMM 5257's four background parts)", vv.filter((s) => s.label === "Background information").length === 1 && (vv.find((s) => s.label === "Background information")?.fieldKeys.length ?? 0) > 10);
  const mrd = drafted("imm5475e");
  ok("QA-206 pass: IMM 5475's part \"Seven\" is proposed under its printed heading \"Your declaration\"", mrd.some((s) => s.label === "Your declaration" && s.part === "Seven" && s.quote === "7. Your declaration"), mrd.map((s) => [s.part, s.label]));
  ok("QA-206 fail: IMM 5475's parts with no printed heading of their own (AppDetails, Five) are held unnamed, never \"Five\"", mrd.filter((s) => s.unnamed).map((s) => s.part).sort().join() === "AppDetails,Five" && mrd.every((s) => !s.label || fromPrint(s)), mrd.map((s) => [s.part, s.label]));
  ok("QA-206 fail: a headings file read from another file (checksum differs) is not used: every section is held unnamed", Object.keys(headingsFor("prototype/p1/inventory/imm5257e.inventory.json", "0".repeat(64))).length === 0 && Object.keys(headingsFor("prototype/p1/inventory/imm5257e.inventory.json", JSON.parse(readFileSync(join(SOLUTION, "prototype/p1/inventory/imm5257e.inventory.json"), "utf8")).summary.sha256)).length > 5);
  const none = draftFromInventory([{ data_path: "z1", section: "Page1.PageWrapper.A", caption: "Family name" }]);
  ok("QA-206 fail: with no headings at all, a part is held unnamed (no internal name as its label)", none.sections.length === 1 && none.sections[0].unnamed && none.sections[0].label === null, none.sections);

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
  ok("QA-206 fail: To review shows no IMM 5257 section under an internal part name", s5257.length > 0 && t5257.every((t: string) => !INTERNAL.includes(t.toLowerCase()) && vvNames.includes(t)), t5257);
  const unnamed = s5475.filter((x: any) => /^Unnamed section \d+ of IMM 5475$/.test(String(x.title)));
  ok("QA-206 pass: To review shows IMM 5475's \"Your declaration\" and two sections that say they must be named", s5475.some((x: any) => x.title === "Your declaration") && unnamed.length === 2, s5475.map((x: any) => x.title));
  ok("QA-206 pass: an unnamed section says in plain words that it must be named before Accept", unnamed.every((x: any) => String(x.reason ?? "").includes(UNNAMED_WHY)), unnamed.map((x: any) => x.reason));

  const waiting = () => Number(sql(`select count(*) from library_change where status='WAITING' and kind='section'`));
  const w0 = waiting(), u = unnamed[0], payload = u?.readings?.draft?.payload;
  let r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "accept" }, AUTHOR);
  ok("QA-206 fail: Accept of an unnamed section is refused (409) in plain words, and nothing lands", !!u && r.status === 409 && words(r).includes(UNNAMED_WHY) && waiting() === w0, words(r));
  const named = s5475.find((x: any) => x.title === "Your declaration");
  r = await call("POST", "/review/proposals/decide", { ids: [named?.id ?? NONE, u?.id ?? NONE], action: "accept" }, AUTHOR);
  ok("QA-206 fail: an unnamed section accepted with others is refused too, and nothing lands", r.status === 409 && waiting() === w0, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "edit", payload: { ...payload, label: ` ${String(payload?.label ?? "").toUpperCase()} ` } }, AUTHOR);
  ok("QA-206 fail: an edit that keeps the placeholder name is refused (409)", r.status === 409 && words(r).includes(UNNAMED_WHY) && waiting() === w0, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "edit", payload: { ...payload, label: "Unnamed section of mine" } }, AUTHOR);
  ok("QA-206 fail: an edit to another \"Unnamed section …\" name is refused (409)", r.status === 409 && waiting() === w0, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [u?.id ?? NONE], action: "edit", payload: { ...payload, label: "Applicant and application details" } }, AUTHOR);
  const title = sql(`select title from logical_section where title='Applicant and application details' and status='DRAFT' limit 1`);
  ok("QA-206 pass: once a person names it, the section is accepted under that name and waits for a second person", r.status < 300 && title === "Applicant and application details" && waiting() === w0 + 1, r.status >= 300 ? words(r) : title);
  r = await call("POST", "/review/proposals/decide", { ids: [named?.id ?? NONE], action: "accept" }, AUTHOR);
  ok("QA-206 pass: a section named from its printed heading is accepted as it is", !!named && r.status < 300 && waiting() === w0 + 2, r.status >= 300 ? words(r) : undefined);
  const rej = unnamed[1];
  r = await call("POST", "/review/proposals/decide", { ids: [rej?.id ?? NONE], action: "reject", reason: "Not a section of its own" }, AUTHOR);
  ok("QA-206 pass: an unnamed section can still be rejected", !!rej && r.status < 300, r.status >= 300 ? words(r) : undefined);
  ok("QA-206 pass: the whole check spent US$0", T.spent() === before);
  T.done();
});
