// M3-S5 (P-113, P-171 (3), P-425; C7.3, C11.6): an online-only form outside the Visitor visa produces a checked answer
// sheet, and whether it also gets a PDF copy is the Form library's data, never code. On the configured checkpoint
// (P-322), a case on Provincial nominees › Express Entry stream (its release has no IRCC account set) with one principal:
//   R1 its Online form item has an answer sheet in the form's own parts, in the form's own field order (C7.3's rule; the
//      portal's screens are parked, W6); a PDF line has none (fail);
//   R2 the sheet is checked: a confirmed answer is there to copy, an answer not given yet only waits (fail), and a section
//      is ticked "Entered in the portal" with who;
//   R3 until the library records that IRCC accepts the form only Online, it gets a "Copy, not for filing" (P-145; fail);
//      once a person sets that record and a second person approves it (C11.18's own route), the same release's form is
//      answer-sheet only: no copy listed, the reason in words with no program named, generate and "Download PDF copy"
//      refused (422); another Online form of the release keeps its copy (fail). Data alone: no code, no new release.
//      Review M1: a copy made before the record stays listed, and the line says so (never "no PDF copy" while one exists);
//      review m4: an Online line moved to PDF upload before the record is told it is filed outside what IRCC accepts (422).
//   R4 (review m1, m2) a PDF line whose record says Online only: while filed as a PDF upload its PDF is still made (the
//      release decides its deliverable); moved Online by the officer, it offers no copy (no Generate entry, no pill) and
//      generate is refused.
// Which form is Online comes from the case's own Prepare view, never a form number written here. Synthetic data; US$0.
//   zsh studio/tools/isolated.sh forms_s5 4451 start && tsx studio/tests/check_m3s5_online_only_api.ts 4451 xr_studio_forms_s5
import { APPROVER, AUTHOR, FIXED, answer, call, confirmAll, main, ok, openCase, prepare, sql, until } from "../acceptance/lib/m3.ts";

type Section = { key: string; title: string; version: string; entered: { by: string } | null; answers: { fact: string; subject: string; copy_text: string; to_confirm: boolean }[]; waiting: { fact: string }[] };
type Sheet = { order_basis: string; sections: Section[] };
type Online = { form: string; pdf_copy: boolean; why_no_copy: string | null };
const COMBO = "pnp.express_entry";

await main("M3-S5", "answer sheet for online-only forms outside the Visitor visa; no PDF copy decided by the library's data (API; US$0)", async () => {
  const released = () => sql(`select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='${COMBO}'`) !== "0";
  if (!released()) {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    ok("setup: Demo › Load the configured checkpoint", l.status === 201 || l.status === 200, l.status);
  }
  const combo = sql(`select id from combination where combination_key='${COMBO}'`);
  ok("setup: Provincial nominees › Express Entry stream is released on the checkpoint", released() && !!combo);
  if (!combo) process.exit(2);
  const c = await openCase(combo, [{ role: "principal", name: "Sample Client S5", dob: FIXED.dob }]);
  const P = c.subjects["Sample Client S5"];
  let { p } = await prepare(c.id);
  const mine = (p?.items ?? []).filter((i) => i.kind === "form" && i.subject === P);
  const online = mine.filter((i) => i.channel === "ONLINE"), pdfLines = mine.filter((i) => i.channel === "PDF_UPLOAD"), pdfLine = pdfLines[0];
  ok("setup: the principal has two Online form items and two PDF form items on this release", online.length >= 2 && pdfLines.length >= 2, mine.map((i) => `${i.form}:${i.channel}`));
  // C7.3's layout: each Online form in its edition's own parts as this release's configuration names them (the C3.4
  // rules pass's printed headings), in the order its fields run. Which form is which is read from the sheets: the order
  // check runs on the form whose parts name the applicant's parents; no form number is written here.
  const sheetOf = async (id: string) => { const r = await call("GET", `/runtime/items/${id}/answer-sheet`, undefined, c.officer); return { r, s: r.status === 200 ? (r.body as Sheet) : null }; };
  const sheets = await Promise.all(online.map(async (i) => ({ i, ...(await sheetOf(i.id)) })));
  ok("M3-S5 R1 pass: every Online form of the principal has its answer sheet, laid out in the form's own parts (not the PDF twin's fallback)", sheets.every((x) => x.r.status === 200 && x.s?.order_basis === "form_parts" && x.s.sections.length > 0), sheets.map((x) => `${x.i.form}:${x.s?.order_basis ?? x.r.status}:${x.s?.sections.map((y) => y.title).join("|")}`));
  const withParents = sheets.find((x) => (x.s?.sections ?? []).some((y) => /father/i.test(y.title))), rest = sheets.find((x) => x !== withParents);
  if (!withParents || !rest) { ok("setup: one Online form's parts name the applicant's parents", false); process.exit(2); }
  const item = withParents.i, other = rest.i, F = item.form!;
  console.log(`      set-up: ${F} and ${other.form} are Online for the principal`);
  const sheet = () => sheetOf(item.id);
  let { r, s } = await sheet();
  const titles = (s?.sections ?? []).map((x) => x.title);
  const at = (re: RegExp) => titles.findIndex((t) => re.test(t));
  ok(`M3-S5 R1 pass: ${F}'s parts follow the order the form runs: the applicant's full name first, the father before the mother, addresses after both`, at(/full name/i) === 0 && at(/father/i) > 0 && at(/father/i) < at(/mother/i) && at(/mother/i) < at(/address/i), titles);
  r = await call("GET", `/runtime/items/${pdfLine!.id}/answer-sheet`, undefined, c.officer);
  ok(`M3-S5 R1 fail: a PDF line (${pdfLine!.form}) has no answer sheet (refused in words, never an empty sheet)`, r.status >= 400 && r.status < 500 && typeof r.body?.detail === "string", { status: r.status, detail: r.body?.detail });

  // R2: checked: a confirmed answer to copy, a missing one waits, a section ticked
  const want = s?.sections[0]?.waiting.find((w) => w.fact === "person.family_name")?.fact ?? s?.sections[0]?.waiting[0]?.fact;
  ok(`M3-S5 R2 fail: before it is answered, ${want ?? "the first part's fact"} is only waited for, never shown as a value`, !!want && !(s?.sections[0]?.answers ?? []).some((x) => x.fact === want && x.subject === P));
  const a = want ? await answer(c.id, P, want, "SAMPLES") : null;
  await confirmAll(c.id, P);
  ({ s } = await sheet());
  const shown = s?.sections[0]?.answers.find((x) => x.fact === want && x.subject === P);
  ok(`M3-S5 R2 pass: the confirmed answer (${want}) is on the first part, to copy as given, not still to confirm`, !!a && a.status < 300 && shown?.copy_text === "SAMPLES" && shown.to_confirm === false, { answer: a?.status, shown });
  const first = s?.sections[0];
  r = await call("POST", `/runtime/items/${item.id}/screens/${first?.key}/entered`, { version: first?.version }, c.officer);
  ({ s } = await sheet());
  ok("M3-S5 R2 pass: \"Entered in the portal\" ticks that part, with who", r.status === 201 && s?.sections[0]?.entered?.by === c.officer, { status: r.status, body: r.body?.detail });

  // R3: the PDF copy, by the library's record alone
  /** A person proposes "IRCC accepts <form> only Online, for every account" and a second person approves it (C11.18). */
  const onlineOnly = async (form: string) => {
    const a = await call("POST", `/library/forms/${encodeURIComponent(form)}/accepts`, { account: "ANY", channels: ["ONLINE"], reason: "M3-S5 check: filed in the IRCC account only (Sample)" }, AUTHOR);
    const b = await call("POST", `/library/changes/${a.body?.id}/approve`, { note: "Matches the form's channel" }, APPROVER);
    return a.status < 300 && a.body?.status === "WAITING" && b.status < 300;
  };
  const gen = (form: string) => call("POST", `/runtime/cases/${c.id}/forms/${encodeURIComponent(form)}/${P}/generate`, { idempotencyKey: `m3s5-${form.replace(/\W+/g, "")}-${Math.random().toString(36).slice(2, 8)}` }, c.officer);
  const made = async (id: string | undefined) => !!id && until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${id}`, undefined, c.officer)).body?.status), 120_000);
  const caseForms = async () => ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, c.officer)).body?.forms ?? []) as { form: string; subject_id: string; copies: { id: string; copy_not_for_filing: boolean }[] }[];
  const onlineForms = async () => ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, c.officer)).body?.online ?? []) as Online[];
  let list = await onlineForms();
  ok(`M3-S5 R3 fail: with no record that IRCC accepts ${F} only Online (this release has no IRCC account), it gets a "Copy, not for filing" (P-145)`, list.find((f) => f.form === F)?.pdf_copy === true, list);
  const was = sql(`select count(*) from form_edition_accept a join form_edition e on e.id=a.form_edition_id join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${F}' and a.account='ANY'`);
  r = await call("POST", `/library/forms/${encodeURIComponent(F)}/accepts`, { account: "ANY", channels: ["ONLINE"], reason: "M3-S5 check: filed in the IRCC account only (Sample)" }, AUTHOR);
  const change = r.body?.id;
  ok(`M3-S5 R3 setup: a person proposes that IRCC accepts ${F} only Online, for every account; it waits for a second person`, r.status < 300 && r.body?.status === "WAITING" && was === "0", { status: r.status, detail: r.body?.detail, was });
  r = await call("POST", `/library/changes/${change}/approve`, { note: "Matches the form's channel" }, APPROVER);
  ok("M3-S5 R3 setup: a second person approves it (the library's own route, C11.18)", r.status < 300, { status: r.status, detail: r.body?.detail });
  list = await onlineForms();
  const now = list.find((f) => f.form === F);
  ok(`M3-S5 R3 pass: ${F} is now answer-sheet only: no PDF copy, and the reason says the library records IRCC accepts it only Online, naming no program`, now?.pdf_copy === false && /records that IRCC accepts .* only Online: its answers go on the answer sheet only, with no PDF copy/.test(now?.why_no_copy ?? "") && !/Express Entry|Visitor|made before/.test(now?.why_no_copy ?? ""), now);
  ok(`M3-S5 R3 fail: ${other.form}, Online on the same release with no such record, keeps its "Copy, not for filing"`, list.find((f) => f.form === other.form)?.pdf_copy === true, list);
  r = await gen(F);
  ok(`M3-S5 R3 pass: making a PDF of ${F} is refused (422) with the same reason`, r.status === 422 && /only Online: its answers go on the answer sheet only/.test(r.body?.detail ?? ""), { status: r.status, detail: r.body?.detail });
  r = await call("POST", `/runtime/items/${item.id}/pdf-copy`, {}, c.officer);
  ok("M3-S5 R3 pass: the Prepare tab's \"Download PDF copy\" is refused the same way (422)", r.status === 422 && /answer sheet only/.test(r.body?.detail ?? ""), { status: r.status, detail: r.body?.detail });
  ok("M3-S5 R3: nothing was made for it (no copy of the form on the case)", sql(`select count(*) from form_instance where case_id='${c.id}' and form_number='${F}'`) === "0");
  ({ r, s } = await sheet());
  ({ p } = await prepare(c.id));
  ok("M3-S5 R3 pass: the answer sheet is unchanged by it: still served, its tick kept, the item still Online", r.status === 200 && s?.sections[0]?.entered?.by === c.officer && (p?.items ?? []).find((i) => i.id === item.id)?.channel === "ONLINE");

  // R3 (review M1, m4) on the other Online form: a copy made before its record stays in view; a second case whose officer
  // moved it to PDF upload before the record is told it is filed outside what IRCC accepts.
  const c2 = await openCase(combo, [{ role: "principal", name: "Sample Client S6", dob: FIXED.dob }]);
  const P2 = c2.subjects["Sample Client S6"];
  let p2 = (await prepare(c2.id)).p;
  const other2 = (p2?.items ?? []).find((i) => i.kind === "form" && i.subject === P2 && i.form === other.form);
  r = await call("PATCH", `/runtime/items/${other2?.id}/channel`, { channel: "PDF_UPLOAD", version: (p2 as { version?: string } | null)?.version }, c2.officer);
  ok(`M3-S5 R3 setup: on a second case the officer files ${other.form} as a PDF upload (inside what IRCC accepts then, C11.6)`, r.status === 200, { status: r.status, detail: r.body?.detail });
  r = await gen(other.form!);
  const before = r.body?.id as string | undefined;
  ok(`M3-S5 R3 setup: before any record, a "Copy, not for filing" of ${other.form} is made (P-145)`, r.status < 300 && await made(before) && sql(`select status from form_instance where id='${before}'`) === "GENERATED", { status: r.status, detail: r.body?.detail, copy: sql(`select status || ' ' || coalesce(error, '') from form_instance where id='${before}'`) });
  ok(`M3-S5 R3 setup: the library records ${other.form} as accepted only Online`, await onlineOnly(other.form!));
  const gone = (await onlineForms()).find((f) => f.form === other.form);
  const kept = (await caseForms()).find((f) => f.form === other.form && f.subject_id === P);
  ok(`M3-S5 R3 (review M1) pass: the copy of ${other.form} made before the record is still listed on the case, not for filing, and the line says it is kept (no new copy offered)`, !!kept && kept.copies.some((x) => x.id === before && x.copy_not_for_filing) && gone?.pdf_copy === false && /A copy made before that record is kept with the forms above, not for filing/.test(gone?.why_no_copy ?? ""), { kept: kept?.copies, line: gone });
  r = await gen(other.form!);
  ok(`M3-S5 R3 (review M1) pass: a new copy of ${other.form} is refused (422); the one made before stays the only one`, r.status === 422 && sql(`select count(*) from form_instance where case_id='${c.id}' and form_number='${other.form}'`) === "1", { status: r.status, detail: r.body?.detail });
  r = await call("POST", `/runtime/cases/${c2.id}/forms/${encodeURIComponent(other.form!)}/${P2}/generate`, { idempotencyKey: `m3s5-c2-${Math.random().toString(36).slice(2, 8)}` }, c2.officer);
  ok(`M3-S5 R3 (review m4) pass: on the second case, ${other.form} filed as a PDF upload is refused (422) as filed outside what IRCC accepts, never "no PDF in the release"`, r.status === 422 && /is filed as PDF upload, but the Form library records that IRCC accepts it only as Online/.test(r.body?.detail ?? ""), { status: r.status, detail: r.body?.detail });

  // R4: PDF lines whose record says Online only (review m1, m2)
  const [stay, move] = pdfLines;
  ok(`M3-S5 R4 setup: the library records ${stay.form} and ${move.form} (PDF lines on this release) as accepted only Online`, await onlineOnly(stay.form!) && await onlineOnly(move.form!));
  r = await gen(stay.form!);
  ok(`M3-S5 R4 (review m2) fail: ${stay.form}, still filed as a PDF upload on this case, is not refused: its PDF is made (the release decides its deliverable; only an Online item is refused)`, r.status === 202 && await made(r.body?.id), { status: r.status, detail: r.body?.detail });
  ({ p } = await prepare(c.id));
  r = await call("PATCH", `/runtime/items/${move.id}/channel`, { channel: "ONLINE", version: (p as { version?: string } | null)?.version }, c.officer);
  ok(`M3-S5 R4 setup: the officer files ${move.form} Online on the case (inside what the record accepts, C11.6)`, r.status === 200, { status: r.status, detail: r.body?.detail });
  const moved = (await onlineForms()).find((f) => f.form === move.form);
  ok(`M3-S5 R4 (review m1) pass: moved Online, ${move.form} offers no PDF copy: no pill, the reason in words, and no "Generate a copy" entry for the principal`, moved?.pdf_copy === false && /only Online: its answers go on the answer sheet only/.test(moved?.why_no_copy ?? "") && !(await caseForms()).some((f) => f.form === move.form && f.subject_id === P), moved);
  r = await gen(move.form!);
  ok(`M3-S5 R4 (review m1) pass: making a PDF of ${move.form} is refused (422) with the same reason`, r.status === 422 && /answer sheet only/.test(r.body?.detail ?? ""), { status: r.status, detail: r.body?.detail });
});
