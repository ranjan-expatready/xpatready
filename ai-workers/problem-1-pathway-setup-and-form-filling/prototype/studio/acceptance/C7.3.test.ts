// C7.3 Portal sheet: answers in the portal's order with copy buttons (M3-E; r5c BR-8; P-62 §6, P-152 (3)). Visitor
// visa part: IMM 5707 is an Online line (Sample, FQ-2). Until the W6 extension the answer sheet follows the sections of
// the PDF twin (contracts/pdf-sections.json: Section A, B, C), from every declared or confirmed answer (P-242, P-411, row
// B150; was confirmed only, P-72), each answer with its source, its mark, whether it is still to confirm, and the text to
// copy; "Entered in the portal" per section freezes that section's answers. A changed fact after "Entered"
// marks the section out of date (C9.2-5).
// Breadth, after Visitor visa: the live portal screen order (W6, parked), online-only forms ordered by the drafted form.
// Built (runtime lane, C7.3 PR): a tick sends the section's `version` from the sheet it read (M3-CONTRACT: "every write
// carries a version (409 → Reload)"), so it freezes what the officer saw; the rules are unchanged.
//   tsx studio/acceptance/C7.3.test.ts 4440 xr_studio_accept
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLIENT, OFFICER, call, fillEverything, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo, answer, confirmAll } from "./lib/m3.ts";

type Sheet = { order_basis: string; sections: { key: string; title: string; entered: { at: string; by: string } | null; out_of_date?: boolean; answers: { label: string; fact: string; value: unknown; copy_text: string; source: string; subject?: string }[]; waiting?: { fact: string }[] }[] };
const TWIN = JSON.parse(readFileSync(join(import.meta.dirname, "..", "contracts", "pdf-sections.json"), "utf8"))["IMM 5707"] as Record<string, string>;

await main("C7.3", "Answer sheet for an Online line (IMM 5707)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
  const P = c.subjects["Sample Client A"];
  let p = (await prepare(c.id)).p;
  const item = itemsOf(p, P, "IMM 5707")[0];
  const sheet = async (actor = OFFICER) => { const r = await call("GET", `/runtime/items/${item?.id}/answer-sheet`, undefined, actor); return { r, s: r.status === 200 ? r.body as Sheet : null }; };
  let { r, s } = await sheet();
  ok("C7.3-1 pass: an Online form item has an answer sheet for the officer", r.status === 200 && item?.channel === "ONLINE", r.status);
  ok("C7.3-2 fail: a client cannot read the answer sheet (403)", (await sheet(CLIENT)).r.status === 403);
  ok("C7.3-3 pass: the sheet follows the PDF twin's sections in order (Section A, B, C) until W6", s?.order_basis === "pdf_twin" && JSON.stringify(s?.sections.map((x) => x.title)) === JSON.stringify(Object.values(TWIN)), s?.sections.map((x) => x.title));
  // P-411 (B150 review M2): the officer typed both dates of birth (openCase), not confirmed yet: they are on the sheet at once,
  // marked entered by staff and to confirm; what nobody answered yet is what the sheet waits for.
  const typed = (s?.sections ?? []).flatMap((x) => x.answers as { fact: string; subject?: string; mark?: string | null; to_confirm?: boolean }[]).filter((x) => x.fact === "person.date_of_birth");
  ok("C7.3-4 pass (P-411 (2), B150): before confirmation the sheet already shows the officer-typed dates of birth, each marked \"entered by staff\" and to confirm", typed.length >= 2 && typed.every((x) => x.mark === "by_staff" && x.to_confirm === true), typed);
  ok("C7.3-4b fail: an unanswered fact is never shown as a value, only waited for", (s?.sections ?? []).some((x) => (x.waiting ?? []).length > 0) && !(s?.sections ?? []).some((x) => x.answers.some((y) => y.fact === "person.family_name")));

  await fillEverything(c.id);
  ({ s } = await sheet());
  const a = s?.sections[0]?.answers ?? [];
  const name = a.find((x) => x.fact === "person.family_name" && x.subject === P);
  ok("C7.3-5 pass: Section A lists the applicant's confirmed answers with their source and the text to copy, no longer to confirm", !!name && name.copy_text === String(name.value) && ["Document", "Client", "Case officer"].includes(name.source) && (name as { to_confirm?: boolean }).to_confirm === false, name);
  ok("C7.3-6 pass: Section A also carries the spouse's answers (IMM 5707 includes the spouse, VV-R07), labelled by person", a.some((x) => x.subject === c.subjects["Sample Spouse A"]));
  ok("C7.3-7 pass: a date is offered to copy as the portal takes it (YYYY-MM-DD)", a.filter((x) => /date/.test(x.fact)).length > 0 && a.filter((x) => /date/.test(x.fact)).every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.copy_text)));

  const sec = s?.sections[0]?.key;
  r = await call("POST", `/runtime/items/${item?.id}/screens/${sec}/entered`, {}, CLIENT);
  ok("C7.3-8 fail: a client cannot tick \"Entered in the portal\" (403)", r.status === 403, r.status);
  const ver = (s?.sections[0] as { version?: string } | undefined)?.version;
  r = await call("POST", `/runtime/items/${item?.id}/screens/${sec}/entered`, { version: ver }, OFFICER);
  ({ s } = await sheet());
  ok("C7.3-9 pass: \"Entered in the portal\" ticks Section A with who and when", r.status === 201 && s?.sections[0]?.entered?.by === OFFICER, r.body);
  ok("C7.3-10 pass (data): the tick freezes the answers it showed (an answer snapshot)", !!sql(`select facts_json from answer_snapshot where id=(select snapshot_id from entered_section where item_id='${item?.id}' and section_key='${sec}')`));
  r = await call("POST", `/runtime/items/${item?.id}/screens/${sec}/entered`, { version: ver }, OFFICER);
  ok("C7.3-11 pass: ticking again changes nothing (one tick, 200 not 201)", r.status === 200 && sql(`select count(*) from entered_section where item_id='${item?.id}' and section_key='${sec}'`) === "1");
  await answer(c.id, P, "person.family_name", "SAMPLEDX"); await confirmAll(c.id, P);
  ({ s } = await sheet());
  ok("C7.3-12 pass (P-65): a changed fact marks the entered section out of date, the frozen answers unchanged, the new value shown", s?.sections[0]?.out_of_date === true && s.sections[0].answers.some((x) => x.fact === "person.family_name" && x.value === "SAMPLEDX"));
  p = (await prepare(c.id)).p;
  ok("C7.3-13 pass: the IMM 5707 item reads Out of date; it warns only (an entered Online section, BR-9 and P-168; P-136 also said \"entered\": FQ-6)", itemsOf(p, P, "IMM 5707")[0]?.state === "out_of_date" && !(p?.readiness ?? []).some((x) => x.blocks.some((b) => /IMM 5707/.test(b.words) && b.code === "out_of_date")));
});
