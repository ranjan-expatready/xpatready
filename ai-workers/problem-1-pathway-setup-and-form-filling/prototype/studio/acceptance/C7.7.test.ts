// C7.7 Prepare application lists each filing's items as a two-stage deliverables list (M3-E; r5c BR-8; P-62 §6,
// P-122, P-137, P-145). Visitor visa part: stage 1 the facts to confirm, stage 2 the items of three kinds (form,
// document, IRCC step) per person, each with one state; forms per person follow the line's "who" and minimum age
// (VV-R07, VV-R09, VV-R10); biometrics is an IRCC step for each person 14–79 (VV-R15), after filing (VV-R17); an Online
// line offers "Download PDF copy", IRCC's PDF filled from the same confirmed facts, marked "Copy, not for filing" and
// never counted. The portal is read-only (C11.6-1).
// Paper lines (part 2; r5c BR-8, P-143, P-144, P-171 (1); SA-1B-31): a Paper line lists its barcode page (a barcode form
// only: Validate in Adobe adds it), then print with the barcode page on top, signed in pen, mailed once the filing is Ready
// to file; To do until its validated copy is read back, In progress after, Out of date when a fact changes after it.
// Breadth still to come: waiting filings ("Cannot start yet"), our-format copy for an online-only form with no IRCC PDF.
// Schedules and dependants' forms (QA-235, B84): a case's fill accepts exactly the form numbers its release writes
// ("IMM 5257 SCH1", "IMM 0008 DEP"), and anything else is "No such form." with nothing echoed.
//   tsx studio/acceptance/C7.7.test.ts 4440 xr_studio_accept
import { snapshotHash } from "../engine/snapshot.ts";
import { FAMILY, OFFICER, answer, call, copyBytes, expectedFor, filingOf, fillEverything, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, run, sendFile, sql, until, validateRoundTrip, type ExpectedLine } from "./lib/m3.ts";

const STATES = ["cannot_start", "to_do", "in_progress", "ready", "out_of_date", "done", "not_needed"];

await main("C7.7", "Deliverables list per filing (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const [P, S, K10, K15] = ["Sample Client A", "Sample Spouse A", "Sample Child A1", "Sample Child A2"].map((n) => c.subjects[n]);
  let { p } = await prepare(c.id);
  const forms = (s: string) => itemsOf(p, s).filter((i) => i.kind === "form").map((i) => i.form).sort();
  // Row C4 (P-319, R1): what each person is expected to file is the case's own release lines from C1's expectedLines,
  // never a form number written here: the lines that always apply, plus those that wait only on "uses a representative",
  // which the case team answers Yes (A2; IMM 5476 on release 2, where it is a line that waits on that answer). The fixture:
  // adults IMM 5257, IMM 5476, IMM 5707; release 2 of the configured checkpoint: adults IMM 5257, IMM 5257 SCH1, IMM 5476,
  // IMM 5645; children IMM 5257 on both.
  const ex = await expectedFor(c.id);
  const REP = "case.uses_representative";
  const linesFor = (name: string): ExpectedLine[] => [...(ex?.[name]?.forms ?? []), ...(ex?.[name]?.waiting ?? []).filter((l) => (l.waitsOn ?? []).length > 0 && l.waitsOn!.every((f) => f === REP))];
  const want = (name: string) => linesFor(name).map((l) => l.form).sort();
  const same = (a: string[], b: string[]) => a.length > 0 && JSON.stringify(a) === JSON.stringify(b);
  const PL = linesFor("Sample Client A");
  // The four kinds the steps below read, by meaning: the barcode form, the Online line (P-145's PDF copy), a PDF upload
  // line (its own PDF is the deliverable), the family form and the form signed by hand. An unread name stays empty, and
  // an empty name picks no item (itemsOf would take every item), so a step that reads it fails rather than passing on
  // another form.
  const BC = PL.find((l) => l.barcode)?.form ?? "", ONL = PL.find((l) => l.online)?.form ?? "", FAM = PL.find((l) => l.family)?.form ?? "", HS = PL.find((l) => l.handSigned)?.form ?? "";
  const PDF = PL.find((l) => l.channel === "PDF_UPLOAD" && !l.handSigned)?.form ?? "";
  const one = (q: typeof p, who: string, form: string) => (form ? itemsOf(q, who, form)[0] : undefined);
  ok(`C7.7-1 pass: adults get their release's lines: ${want("Sample Client A").join(", ") || "(none read)"} (VV-R07, VV-R09, VV-R10)`, same(forms(P), want("Sample Client A")) && same(forms(S), want("Sample Spouse A")), [forms(P), forms(S)]);
  ok(`C7.7-2 pass: children under 18 get only their own release lines (${want("Sample Child A1").join(", ") || "(none read)"}; the family form and ${HS || "the hand-signed form"} are 18 or older)`, same(forms(K10), want("Sample Child A1")) && same(forms(K15), want("Sample Child A2")) && !!FAM && !!HS && [want("Sample Child A1"), want("Sample Child A2")].every((w) => !w.includes(FAM) && !w.includes(HS)), [forms(K10), forms(K15)]);
  const bio = (s: string) => itemsOf(p, s).filter((i) => i.kind === "step" && /biometric/i.test(i.step ?? ""));
  ok("C7.7-3 pass: biometrics is an IRCC step for the principal, the spouse and the child of 15, none for the child of 10 (VV-R15)", bio(P).length === 1 && bio(S).length === 1 && bio(K15).length === 1 && bio(K10).length === 0);
  ok("C7.7-4 pass: the biometrics step is tagged \"needed after filing\" (IRCC's instruction letter comes after you apply, VV-R17)", [P, S, K15].every((s) => bio(s)[0]?.neededBefore === "after_filing"));
  ok("C7.7-5 pass: document items come from the checklist (each person's passport; the principal's proof of financial support)", itemsOf(p, P).some((i) => i.kind === "document" && /passport/i.test(i.document_type ?? "")) && itemsOf(p, P).some((i) => i.kind === "document" && /financial/i.test(i.document_type ?? "")) && itemsOf(p, K10).some((i) => i.kind === "document" && /passport/i.test(i.document_type ?? "")));
  ok("C7.7-6 pass: every item has exactly one state from the row words, and every item belongs to a filing of this case", (p?.items ?? []).length > 0 && p!.items.every((i) => STATES.includes(i.state) && p!.filings.some((f) => f.id === i.filing)));
  const stage1 = (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, OFFICER)).body?.stage1 as { filing: string; to_confirm: number; confirmed: number }[] | undefined;
  ok("C7.7-7 pass: stage 1 counts the facts to confirm per filing, before any item", (stage1 ?? []).length === 4 && stage1!.every((x) => x.to_confirm > 0), stage1);
  ok(`C7.7-8 pass: before facts are confirmed, PDF form items say what they wait for ("Waiting for N facts") and are To do, never Ready (${PDF})`, !!PDF && itemsOf(p, P, PDF).length === 1 && itemsOf(p, P, PDF).every((i) => i.state === "to_do" && /fact/i.test(i.reason ?? "")));

  const ready = await fillEverything(c.id);
  p = (await prepare(c.id)).p;
  const s1 = (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, OFFICER)).body?.stage1 as { to_confirm: number }[] | undefined;
  ok("C7.7-9 pass: with every fact confirmed, stage 1 shows nothing left to confirm", ready && (s1 ?? []).length === 4 && s1!.every((x) => x.to_confirm === 0), s1);

  // P-145: an Online line offers a PDF copy, not for filing.
  // Row C4: the Online line is the release's own (IMM 5707 on the fixture, IMM 5257 on release 2).
  const iOnl = one(p, P, ONL);
  const before = (p?.items ?? []).length, readyBefore = JSON.stringify(p?.readiness);
  let r = await call("POST", `/runtime/items/${iOnl?.id}/pdf-copy`, {}, OFFICER);
  ok(`C7.7-10 pass: "Download PDF copy" on the Online ${ONL || "line (none read)"} is a job (202)`, !!iOnl && r.status === 202, r.status);
  const copyId = r.body?.id;
  await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body?.status), 60_000);
  const copy = (await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body;
  ok(`C7.7-11 pass: the copy is IRCC's own ${ONL} PDF filled from the same confirmed facts, marked "Copy, not for filing"`, copy?.status === "GENERATED" && copy?.copy_not_for_filing === true && copy?.source === "ircc_pdf" && copy?.intact === true, copy);
  p = (await prepare(c.id)).p;
  ok("C7.7-12 pass: the copy is never counted: no new item, readiness unchanged", before > 0 && !!copyId && (p?.items ?? []).length === before && JSON.stringify(p?.readiness) === readyBefore);
  r = await call("POST", `/runtime/form-copies/${copyId}/lock`, { kind: "filed" }, OFFICER);
  ok("C7.7-13 fail: a \"Copy, not for filing\" cannot be locked as filed or uploaded (409, in words)", r.status === 409 && /not for filing/i.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/items/${one(p, P, PDF)?.id}/pdf-copy`, {}, OFFICER);
  ok(`C7.7-14 fail: a PDF upload line has no separate "PDF copy" (its own PDF is the deliverable): 409 or 422 (${PDF})`, !!one(p, P, PDF) && [409, 422].includes(r.status), r.status);
  // Row C4: the count is every release line that reaches each of the four people, those that wait on an answer included
  // (each is an item, Not needed until its answer says so): 8 on the fixture (3 + 3 + 1 + 1, nothing waits); 22 on
  // release 2 (adults 3 to fill and 4 that wait: IMM 5409, IMM 5475, IMM 5476, IRM 0002; children 1 and 3).
  const formCount = ["Sample Client A", "Sample Spouse A", "Sample Child A1", "Sample Child A2"].reduce((n, x) => n + (ex?.[x]?.forms.length ?? 0) + (ex?.[x]?.waiting.length ?? 0), 0);
  const inDb = Number(sql(`select count(*) from filing_item where case_id='${c.id}' and kind='form'`) ?? 0);
  ok(`C7.7-15 pass (data): one filing per person, items keyed by filing × person × form (${formCount} form items: every release line that reaches each person)`, filingOf(p, P)?.id !== filingOf(p, S)?.id && formCount > 0 && inDb === formCount, { inDb, formCount });
  // G24, G25 (QA-139): a copy ready to file never asks to write by hand a fact the case holds, and never shows engine
  // words. The family form for the principal (IMM 5707 on the fixture, IMM 5645 on release 2): the case has children, so
  // a fact about children is written, not left by hand.
  const c5707 = FAM ? await generateCopy(c.id, FAM, P) : undefined;
  const hand = JSON.parse(sql(`select coalesce(json_agg(b), '[]') from form_instance f, jsonb_array_elements(f.result_json->'boxes') b where f.id='${c5707}' and b->>'result' = 'by hand'`) ?? "null") as { fact: string | null; why?: string }[] | null;
  const held = new Set((sql(`select distinct canonical_field_key from client_canonical_answer where subject_id='${P}' and superseded_by_id is null`) ?? "").split("\n").filter(Boolean));
  ok(`C7.7-16 pass (G25): the principal's ${FAM || "family form (none read)"} copy leaves nothing by hand that the case holds (a fact about children is written from the children on the case)`, !!c5707 && Array.isArray(hand) && !hand.some((b) => !!b.fact && held.has(b.fact)) && !hand.some((b) => /child/i.test(b.fact ?? "")), hand?.filter((b) => b.fact && held.has(b.fact)));
  const shown = (await call("GET", `/runtime/form-copies/${c5707}`, undefined, OFFICER)).body?.by_hand as { label: string; why: string }[] | undefined;
  ok("C7.7-17 pass (G24, QA-139): every \"To write by hand\" line is in plain words: no engine step names", Array.isArray(shown) && !shown.some((x) => /derived:|phone_part:|derive_inverse:|executable set|[a-z]+\.[a-z_]+\(/.test(`${x.label} ${x.why}`)), shown);
  const rd = readinessOf((await prepare(c.id)).p, filingOf((await prepare(c.id)).p, P)?.id);
  ok("C7.7-18 pass: any line still to write by hand shows on the filing as a warning naming the form and the line (BR-9: everything else warns)", !!rd && !!c5707 && Array.isArray(shown) && (shown.length === 0 || (rd.warns ?? []).some((w) => w.code === "hand_write" && !!FAM && w.words.includes(FAM))), rd?.warns);

  // Part 2 (r5c BR-8, P-144): a Paper line with its barcode page. The principal's barcode form (IMM 5257 on both data
  // sets, read from the lines) moves to Paper (an accommodation, VV-R02; C11.6's built route); the spouse's keeps its own
  // line's channel (a PDF upload on the fixture, Online on release 2).
  // Review m1: both read through one(), so a form name that was not read picks no item.
  const toPaper = async (form: string) => { const q = (await prepare(c.id)).p; return call("PATCH", `/runtime/items/${one(q, P, form)?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, OFFICER); };
  const line = async (form: string, who = P) => one((await prepare(c.id)).p, who, form);
  r = await toPaper(BC);
  let pl = await line(BC);
  const keys = (x: typeof pl) => (x?.steps ?? []).map((s) => s.key).join(",");
  ok(`C7.7-19 pass: the principal's ${BC || "barcode form (none read)"} on Paper lists its barcode page and its steps in order: Validate in Adobe (adds the barcode page), print with the barcode page on top, signed in pen, mailed after Ready to file`,
    !!BC && r.status === 200 && pl?.channel === "PAPER" && pl?.signature === "PEN" && pl?.barcode_page === true && keys(pl) === "validate,print,sign_in_pen,mail" && /barcode page on top/.test(pl?.steps?.[1]?.words ?? "") && pl?.steps?.[3]?.neededBefore === "after_ready", { status: r.status, line: pl });
  ok("C7.7-20 pass: before its validated copy is read back the Paper line is To do and says to Validate in Adobe and read it back", pl?.state === "to_do" && /Validate in Adobe/.test(pl?.reason ?? "") && pl?.validated === null, pl?.reason);
  const spCh = (ex?.["Sample Spouse A"]?.forms ?? []).find((l) => l.form === BC)?.channel;
  const sp = BC ? await line(BC, S) : undefined;
  ok(`C7.7-21 fail: the spouse's ${BC}, still on its own line's channel (${spCh}), carries no Paper steps or barcode page line`, !!spCh && spCh !== "PAPER" && sp?.channel === spCh && sp?.steps === undefined && sp?.barcode_page === undefined, sp);
  const raw = await generateCopy(c.id, BC, P);
  const back = await sendFile(`/runtime/form-copies/${raw}/validated`, await copyBytes(raw!), `${BC.replace(/\s+/g, "")}.pdf`);
  pl = await line(BC);
  ok("C7.7-22 fail: the copy sent back unchanged (Validate never pressed, so no barcode page) is refused (422) and the line stays To do with no validated copy", back.status === 422 && pl?.state === "to_do" && pl?.validated === null, { status: back.status, state: pl?.state });
  const vid = await validateRoundTrip(c.id, BC, P);
  pl = await line(BC);
  ok("C7.7-23 pass: once its validated copy is read back for today's facts the line is In progress, its Validate step done, naming that copy", !!vid && pl?.state === "in_progress" && pl?.steps?.[0]?.done === true && pl?.validated?.copy === vid && pl?.validated?.current === true, pl);
  // B132: Printed and Signed in pen are recorded steps now (sign-steps.ts): not done until recorded (false); Mail is not recorded yet (null).
  ok("C7.7-24 fail: a Paper line is never Ready before it is printed and signed in pen (B132: Printed and Signed in pen not done yet; Mail not recorded)", !!pl && pl.state !== "ready" && (pl?.steps ?? []).filter((s) => s.key === "print" || s.key === "sign_in_pen").every((s) => s.done === false) && (pl?.steps ?? []).filter((s) => s.key === "mail").every((s) => s.done === null), pl?.steps);
  r = await toPaper(HS);
  const p5476 = HS ? await line(HS) : undefined;
  // A form that makes no barcode page has no barcode page line (engine: tests/check_vv_prepare_store.ts "C7.7 Paper"); on the
  // APR Portal no such Visitor visa form may go on Paper: IMM 5476 is accepted only as a PDF upload (its sourced record).
  ok(`C7.7-25 fail: ${HS || "the hand-signed form (none read)"} cannot go on Paper here (IRCC accepts it only as a PDF upload): refused (422) with IRCC's line, and its line carries no Paper steps`, !!HS && r.status === 422 && /PDF upload/.test(r.body?.detail ?? "") && p5476?.channel === "PDF_UPLOAD" && p5476?.steps === undefined && p5476?.barcode_page === undefined, { status: r.status, detail: r.body?.detail, channel: p5476?.channel });
  const put = await answer(c.id, P, "person.family_name", "SAMPLE-CHANGED");
  pl = await line(BC);
  ok(`C7.7-26 pass (P-171 (1)): a fact on ${BC} changed after the read-back makes the Paper line Out of date, asking for Validate again`, put.status === 200 && pl?.state === "out_of_date" && /Validate again/.test(pl?.reason ?? "") && pl?.validated?.current === false, { put: put.status, line: pl?.state, reason: pl?.reason });

  // Part 3 (QA-235, B84): schedules and dependants' forms, and a form line with no field map. The fixture's Visitor visa
  // release holds none of IMM 5257 SCH1, IMM 0008 DEP or IMM 5409; release 2 of the configured checkpoint holds SCH1 and
  // IMM 5409, each with its own field map (row C4); no sample release holds DEP. Test scaffolding only, on this isolated
  // copy: the case's release gets the lines it lacks, each with a field map from the official PDFs
  // (official-sources/ircc/forms/imm5257_1e.pdf, imm0008depe.pdf) and their form field lists (p1/inventory), and IMM 5409
  // becomes a line with no field map (added where the release lacks it; its own map set aside where it has one); its
  // fingerprint is refitted with it (the pin is frozen by a trigger, lifted for one statement as
  // tests/check_vv_prepare_store_api.ts does), and all is put back in `finally`. Who and minimum age are Sample (SCH1's
  // are the checkpoint's, api/src/form-setup.ts VV_FORM_RULES; DEP's "each dependent child"). A line the release already
  // writes is its own and is not replaced. The copies the steps make stay on the case (a copy is never deleted); only the
  // release and its pins are put back.
  const rel = sql(`select config_release_id from pack_work_pin where case_id='${c.id}' order by revision desc limit 1`);
  // Row C4: the release is put back from an exact copy kept in a table of this isolated copy for the run (a whole
  // snapshot is too long for one psql argument), never by removing lines by form number, which took release 2's own SCH1
  // and IMM 5409 away with the scaffolding. Which of the scaffolding's forms the release already writes is read per array
  // (each in brackets: `->` and `||` bind alike in PostgreSQL, so an unbracketed `a->'x' || a->'y'` read nothing).
  const ADDED = ["IMM 5257 SCH1", "IMM 0008 DEP", "IMM 5409"], inList = ADDED.map((f) => `'${f}'`).join(","), NOMAP = "IMM 5409";
  const writes = (k: string) => (rel ? sql(`select coalesce(string_agg(distinct x->>'form_number', ','), '') from config_release, jsonb_array_elements(snapshot->'${k}') x where id='${rel}' and x->>'form_number' in (${inList})`) ?? "" : "").split(",").filter(Boolean);
  const hasLine = writes("forms"), hasMap = writes("field_maps"), wasHash = rel ? sql(`select sha256 from config_release where id='${rel}'`) : null;
  const KEPT = `c77_scaffold_${run}`;
  const kept = !!rel && !!wasHash && sql(`create table ${KEPT} as select id, snapshot, sha256 from config_release where id='${rel}'`) !== null && sql(`select count(*) from ${KEPT}`) === "1";
  const esc = (x: string) => x.replace(/'/g, "''");
  // Review m3: each pin of this release keeps its own value, saved here and put back one by one.
  const pinsOf = () => sql(`select coalesce(string_agg(id || '=' || content_hash, ',' order by id), '') from pack_work_pin where config_release_id='${rel}'`) ?? "";
  const pinsBefore = rel ? pinsOf() : "";
  const frozen = (set: string) => sql(`alter table pack_work_pin disable trigger trg_pack_work_pin_frozen; ${set}; alter table pack_work_pin enable trigger trg_pack_work_pin_frozen`);
  const pinHash = (h: string) => frozen(`update pack_work_pin set content_hash='${h}' where config_release_id='${rel}'`);
  ok(`C7.7-27a (setup): the case's release, its fingerprint and its pins are read, and an exact copy of the release is kept to put back (it already writes: ${hasLine.join(", ") || "none of the scaffolding's forms"})`, !!rel && kept && !!wasHash && !!pinsBefore, { rel, lines: hasLine, maps: hasMap });
  const formLine = (form: string, title: string, who: string, extra = {}) => ({ form_number: form, title, who, origin: "HUMAN", status: "always", condition: null, condition_plain: null, form_kind: "data_form", item_version: 1, source_quote: `${form}: test scaffolding (Sample)`, ...extra });
  const entry = (data_path: string, fact: string) => ({ data_path, fact, person: "form_subject", outcome: "mapped", status: "PUBLISHED", origin: "HUMAN", transform: "as_is (max 100 chars)", caption: "", heading: null, condition: null, row: null, item_version: 1 });
  const map = (form: string, edition: string, file: string, sha: string, entries: object[]) => ({ form_number: form, form_edition: edition, official_file: file, form_sha256: sha, inventory_file: `prototype/p1/inventory/${file.replace(/\.pdf$/, "")}.inventory.json`, entries });
  const lines = [formLine("IMM 5257 SCH1", "Schedule 1 - Application for temporary residence", "principal_partner_adult_children", { min_age: 18 }), formLine("IMM 0008 DEP", "Additional dependants/declaration", "each_dependent_child"), formLine("IMM 5409", "Statutory declaration of common-law union", "each_applicant")];
  const maps = [
    map("IMM 5257 SCH1", "IMM 5257 SCH1 (09-2023)", "imm5257_1e.pdf", "12486ea3d55d7cfa7ab88a915389c506dd76204b453d04c26cec0bf9ded75f93", [entry("Schedule1[0].FamilyName[0]", "person.family_name"), entry("Schedule1[0].GivenName[0]", "person.given_names")]),
    map("IMM 0008 DEP", "IMM 0008 DEP (10-2024)", "imm0008depe.pdf", "76c6643a7704e221d4bce4e4cb19936f016fb2bebdb681463b1fd744fe7fe57b", [entry("form1[0].Page1[0].AddDependant[0].q1[0].FamilyName[0]", "person.family_name"), entry("form1[0].Page1[0].AddDependant[0].q1[0].GivenName[0]", "person.given_names")]),
  ];
  const gen = (form: string, who: string) => call("POST", `/runtime/cases/${c.id}/forms/${encodeURIComponent(form)}/${who}/generate`, { idempotencyKey: `b84-${run}-${Math.random().toString(36).slice(2, 8)}` }, OFFICER);
  const done = async (id: string | undefined) => { if (!id) return null; await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${id}`, undefined, OFFICER)).body?.status), 90_000); return (await call("GET", `/runtime/form-copies/${id}`, undefined, OFFICER)).body; };
  const addLines = lines.filter((l) => !hasLine.includes(l.form_number)), addMaps = maps.filter((m) => !hasMap.includes(m.form_number));
  const mapsWithout = `(select coalesce(jsonb_agg(x order by i), '[]') from jsonb_array_elements(snapshot->'field_maps') with ordinality t(x, i) where coalesce(x->>'form_number', '') <> '${NOMAP}')`;
  const go = !!rel && kept && !!wasHash && !!pinsBefore;
  if (!go && rel) sql(`drop table if exists ${KEPT}`); // nothing was changed; the copy (if made) is not left behind
  if (go) try {
    sql(`update config_release set snapshot = jsonb_set(jsonb_set(snapshot, '{forms}', (snapshot->'forms') || '${esc(JSON.stringify(addLines))}'::jsonb), '{field_maps}', ${mapsWithout} || '${esc(JSON.stringify(addMaps))}'::jsonb) where id='${rel}'`);
    const h = snapshotHash(JSON.parse(sql(`select snapshot::text from config_release where id='${rel}'`) ?? "null")); sql(`update config_release set sha256='${h}' where id='${rel}'`); pinHash(h);
    const listed = ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, OFFICER)).body?.forms ?? []) as { form: string; subject_id: string; applies: boolean }[];
    const applies = (form: string, who: string) => listed.find((f) => f.form === form && f.subject_id === who)?.applies;
    r = await gen("IMM 5257 SCH1", P);
    const sch = await done(r.body?.id);
    ok("C7.7-27 pass (QA-235): IMM 5257 SCH1, a schedule the case's release writes, is generated for the principal (202, then a copy of IRCC's own PDF, intact)", applies("IMM 5257 SCH1", P) === true && r.status === 202 && sch?.status === "GENERATED" && sch?.source === "ircc_pdf" && sch?.intact === true, { listed: applies("IMM 5257 SCH1", P), status: r.status, copy: sch && { status: sch.status, source: sch.source, intact: sch.intact, error: sch.error } });
    r = await gen("IMM 0008 DEP", K15);
    const dep = await done(r.body?.id);
    ok("C7.7-28 pass (QA-235): IMM 0008 DEP, a dependant's form the case's release writes, is generated for the child (202, then a copy of IRCC's own PDF, intact)", applies("IMM 0008 DEP", K15) === true && r.status === 202 && dep?.status === "GENERATED" && dep?.source === "ircc_pdf" && dep?.intact === true, { listed: applies("IMM 0008 DEP", K15), status: r.status, copy: dep && { status: dep.status, source: dep.source, intact: dep.intact, error: dep.error } });
    const [schK, depP] = [await gen("IMM 5257 SCH1", K15), await gen("IMM 0008 DEP", P)];
    ok("C7.7-29 fail: each form only for the people its line names: SCH1 for the child of 15 (dependent children from 18) and DEP for the principal are refused (422, in words)", schK.status === 422 && depP.status === 422 && /does not apply/.test(`${schK.body?.detail} ${depP.body?.detail}`), { sch1: [schK.status, schK.body?.detail], dep: [depP.status, depP.body?.detail] });
    const copiesBefore = sql(`select count(*) from form_instance where case_id='${c.id}'`);
    const bad = ["IMM 9999", "IMM 5257 SCH9", "imm 5257 sch1", "IMM 5257 SCH1 ", "IMM5257SCH1", "IMM <b>x</b>"];
    const said = await Promise.all(bad.map(async (f) => { const x = await gen(f, P); return { f, status: x.status, detail: x.body?.detail, echoed: JSON.stringify(x.body ?? "").includes(f.trim()) }; }));
    ok("C7.7-30 fail (QA-235, break m6): a form number the release does not write (well-shaped or not, other case or spacing, markup) answers 404 \"No such form.\", never echoes it, and makes no copy", said.every((x) => x.status === 404 && x.detail === "No such form." && !x.echoed) && sql(`select count(*) from form_instance where case_id='${c.id}'`) === copiesBefore, said.filter((x) => x.status !== 404 || x.detail !== "No such form." || x.echoed));
    r = await gen("IMM 5409", P);
    ok("C7.7-31 fail: a form line the release lists with no PDF field map keeps its own words (404, \"has no PDF to fill\")", r.status === 404 && r.body?.detail === "IMM 5409 has no PDF to fill in this case's release.", { status: r.status, detail: r.body?.detail });
  } finally {
    // One statement string, so the copy is dropped only once the release is back.
    sql(`update config_release r set snapshot = b.snapshot, sha256 = b.sha256 from ${KEPT} b where r.id = b.id; drop table ${KEPT}`);
    frozen(pinsBefore.split(",").map((x) => { const [id, h] = x.split("="); return `update pack_work_pin set content_hash='${h}' where id='${id}'`; }).join("; "));
    // Asserted here, so a crash in steps 27–31 still says whether the release was put back (review m3).
    ok("C7.7-32 pass (scaffolding put back): the case's release is again exactly as released (its fingerprint matches) and each of its pins holds its own value again, and the copy of it kept for the run is gone; the copies made stay on the case", sql(`select coalesce(to_regclass('${KEPT}')::text, '')`) === "" && sql(`select sha256 from config_release where id='${rel}'`) === wasHash && snapshotHash(JSON.parse(sql(`select snapshot::text from config_release where id='${rel}'`) ?? "null")) === wasHash && pinsOf() === pinsBefore, { pins: pinsOf() === pinsBefore });
  }
});
