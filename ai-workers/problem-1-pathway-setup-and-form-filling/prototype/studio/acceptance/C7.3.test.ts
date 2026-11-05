// C7.3 Portal sheet: answers in the portal's order with copy buttons (M3-E; r5c BR-8; P-62 §6, P-152 (3)). Visitor
// visa part: IMM 5707 is an Online line (Sample, FQ-2). Until the W6 extension the answer sheet follows the sections of
// the PDF twin (contracts/pdf-sections.json: Section A, B, C), from confirmed facts only, each answer with its source and
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
//   tsx studio/acceptance/C7.3.test.ts 4440 xr_studio_accept
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLIENT, OFFICER, call, fillEverything, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo, answer, confirmAll } from "./lib/m3.ts";

type Sheet = { order_basis: string; form?: string; sections: { key: string; title: string; entered: { at: string; by: string } | null; out_of_date?: boolean; answers: { label: string; fact: string; value: unknown; copy_text: string; source: string; subject?: string }[]; waiting?: { fact: string }[] }[] };
const TWINS = JSON.parse(readFileSync(join(import.meta.dirname, "..", "contracts", "pdf-sections.json"), "utf8")) as Record<string, Record<string, string>>;
/** The application form a visitor visa case files Online when its release has no Online line (VV-R02). */
const APPLICATION = "IMM 5257";
/** The form's own parts as the database holds them for the release's edition, in the form's order (independent of the
 *  route: titles from the section proposals and the library sections they became; order by the first form field in the
 *  release's field map). */
function ownParts(caseId: string, form: string): string[] {
  const snap = JSON.parse(sql(`select r.snapshot::text from config_release r join pack_work_pin w on w.config_release_id = r.id where w.case_id = '${caseId}'`) ?? "{}") as { field_maps?: { form_number: string; form_edition?: string; entries?: { data_path: string }[] }[] };
  const m = snap.field_maps?.find((x) => x.form_number === form);
  if (!m?.form_edition) return [];
  const order = new Map((m.entries ?? []).map((e, i) => [e.data_path, i] as const));
  const rows = (sql(`select coalesce((select l.title from logical_section l where l.workspace_id = p.workspace_id and l.section_key = p.decided_key and p.status = 'accepted' order by l.version desc limit 1), p.payload->>'label') || chr(9) || (p.payload->'fieldKeys')::text from proposal_item p where p.kind = 'section' and p.status in ('accepted', 'waiting') and p.form_edition = '${m.form_edition.replace(/'/g, "''")}' order by p.created_at, p.id`) ?? "").split("\n").filter(Boolean);
  const parts = rows.map((r) => { const [title, keys] = r.split("\t"); const ks = JSON.parse(keys) as string[]; return { title, first: Math.min(...ks.map((k) => order.get(k) ?? Number.MAX_SAFE_INTEGER)) }; });
  return [...new Set(parts.sort((a, b) => a.first - b.first).map((x) => x.title))];
}

await main("C7.3", "Answer sheet for an Online line", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
  const P = c.subjects["Sample Client A"];
  let p = (await prepare(c.id)).p;
  // The case's Online form line for the principal; none on the release: the officer files the application Online (C11.6).
  let item = itemsOf(p, P).find((i) => (i as { channel?: string }).channel === "ONLINE");
  if (!item) {
    const app = itemsOf(p, P, APPLICATION)[0];
    const moved = await call("PATCH", `/runtime/items/${app?.id}/channel`, { channel: "ONLINE", version: (p as { version?: string } | null)?.version }, OFFICER);
    // Challenge m9: the setup step is asserted, never only logged: a refused change stops the pack (not a C7.3 result).
    if (moved.status !== 200) { console.log(`STOP  setup: the officer could not file ${APPLICATION} Online on the case (C11.6): ${moved.status} ${JSON.stringify(moved.body).slice(0, 200)}`); process.exit(2); }
    console.log(`      setup: no Online line on this release, so the officer filed ${APPLICATION} Online on the case (C11.6, 200)`);
    p = (await prepare(c.id)).p;
    item = itemsOf(p, P, APPLICATION)[0];
  }
  const FORM = item?.form ?? "";
  const sheet = async (actor = OFFICER) => { const r = await call("GET", `/runtime/items/${item?.id}/answer-sheet`, undefined, actor); return { r, s: r.status === 200 ? r.body as Sheet : null }; };
  let { r, s } = await sheet();
  ok("C7.3-1 pass: an Online form item has an answer sheet for the officer", r.status === 200 && item?.channel === "ONLINE", r.status);
  ok("C7.3-2 fail: a client cannot read the answer sheet (403)", (await sheet(CLIENT)).r.status === 403);
  // Until W6: the form's own parts as the release's configuration names them, in the form's order; else the twin's.
  const want = s?.order_basis === "form_parts" ? ownParts(c.id, FORM) : Object.values(TWINS[FORM] ?? {});
  const shown = s?.sections.map((x) => x.title) ?? [];
  ok("C7.3-3 pass: the sheet follows the form's own sections in order (the release's parts, else the PDF twin's) until W6", shown.length > 0 && (s?.order_basis === "form_parts" ? shown.every((t) => want.includes(t)) && JSON.stringify(shown) === JSON.stringify(want.filter((t) => shown.includes(t))) : s?.order_basis === "pdf_twin" && JSON.stringify(shown) === JSON.stringify(want)), { basis: s?.order_basis, shown, want });
  ok("C7.3-4 pass: before confirmation the sheet shows no values, only what it waits for (only confirmed facts fill, P-72)", (s?.sections ?? []).every((x) => x.answers.length === 0) && (s?.sections ?? []).some((x) => (x.waiting ?? []).length > 0));

  await fillEverything(c.id);
  ({ s } = await sheet());
  const a = s?.sections[0]?.answers ?? [];
  const name = a.find((x) => x.fact === "person.family_name" && x.subject === P);
  ok("C7.3-5 pass: the first section (Section A on the twin) lists the applicant's confirmed answers with their source and the text to copy", !!name && name.copy_text === String(name.value) && ["Document", "Client", "Case officer"].includes(name.source), name);
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
});
