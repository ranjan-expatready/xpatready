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
import { join } from "node:path";
import { CLIENT, OFFICER, call, expectedFor, fillEverything, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo, answer, confirmAll } from "./lib/m3.ts";

type Sheet = { order_basis: string; form?: string; sections: { key: string; title: string; entered: { at: string; by: string } | null; out_of_date?: boolean; answers: { label: string; fact: string; value: unknown; copy_text: string; source: string; subject?: string }[]; waiting?: { fact: string }[] }[] };
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
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
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
  // P-411 (B150 review M2): the officer typed both dates of birth (openCase), not confirmed yet: they are on the sheet at once,
  // marked entered by staff and to confirm; what nobody answered yet is what the sheet waits for.
  const typed = (s?.sections ?? []).flatMap((x) => x.answers as { fact: string; subject?: string; mark?: string | null; to_confirm?: boolean }[]).filter((x) => x.fact === "person.date_of_birth");
  ok("C7.3-4 pass (P-411 (2), B150): before confirmation the sheet already shows the officer-typed dates of birth, each marked \"entered by staff\" and to confirm", typed.length >= 2 && typed.every((x) => x.mark === "by_staff" && x.to_confirm === true), typed);
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
});
