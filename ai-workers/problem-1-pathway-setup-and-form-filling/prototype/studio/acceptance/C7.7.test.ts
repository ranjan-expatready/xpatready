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
//   tsx studio/acceptance/C7.7.test.ts 4440 xr_studio_accept
import { FAMILY, OFFICER, answer, call, copyBytes, filingOf, fillEverything, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sendFile, sql, until, validateRoundTrip } from "./lib/m3.ts";

const STATES = ["cannot_start", "to_do", "in_progress", "ready", "out_of_date", "done", "not_needed"];

await main("C7.7", "Deliverables list per filing (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const [P, S, K10, K15] = ["Sample Client A", "Sample Spouse A", "Sample Child A1", "Sample Child A2"].map((n) => c.subjects[n]);
  let { p } = await prepare(c.id);
  const forms = (s: string) => itemsOf(p, s).filter((i) => i.kind === "form").map((i) => i.form).sort();
  ok("C7.7-1 pass: adults get IMM 5257, IMM 5476 and IMM 5707 (VV-R07, VV-R09, VV-R10)", JSON.stringify(forms(P)) === JSON.stringify(["IMM 5257", "IMM 5476", "IMM 5707"]) && JSON.stringify(forms(S)) === JSON.stringify(["IMM 5257", "IMM 5476", "IMM 5707"]), [forms(P), forms(S)]);
  ok("C7.7-2 pass: children under 18 get only their own IMM 5257 (IMM 5707 and IMM 5476 are 18 or older)", JSON.stringify(forms(K10)) === JSON.stringify(["IMM 5257"]) && JSON.stringify(forms(K15)) === JSON.stringify(["IMM 5257"]), [forms(K10), forms(K15)]);
  const bio = (s: string) => itemsOf(p, s).filter((i) => i.kind === "step" && /biometric/i.test(i.step ?? ""));
  ok("C7.7-3 pass: biometrics is an IRCC step for the principal, the spouse and the child of 15, none for the child of 10 (VV-R15)", bio(P).length === 1 && bio(S).length === 1 && bio(K15).length === 1 && bio(K10).length === 0);
  ok("C7.7-4 pass: the biometrics step is tagged \"needed after filing\" (IRCC's instruction letter comes after you apply, VV-R17)", [P, S, K15].every((s) => bio(s)[0]?.neededBefore === "after_filing"));
  ok("C7.7-5 pass: document items come from the checklist (each person's passport; the principal's proof of financial support)", itemsOf(p, P).some((i) => i.kind === "document" && /passport/i.test(i.document_type ?? "")) && itemsOf(p, P).some((i) => i.kind === "document" && /financial/i.test(i.document_type ?? "")) && itemsOf(p, K10).some((i) => i.kind === "document" && /passport/i.test(i.document_type ?? "")));
  ok("C7.7-6 pass: every item has exactly one state from the row words, and every item belongs to a filing of this case", (p?.items ?? []).length > 0 && p!.items.every((i) => STATES.includes(i.state) && p!.filings.some((f) => f.id === i.filing)));
  const stage1 = (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, OFFICER)).body?.stage1 as { filing: string; to_confirm: number; confirmed: number }[] | undefined;
  ok("C7.7-7 pass: stage 1 counts the facts to confirm per filing, before any item", (stage1 ?? []).length === 4 && stage1!.every((x) => x.to_confirm > 0), stage1);
  ok("C7.7-8 pass: before facts are confirmed, PDF form items say what they wait for (\"Waiting for N facts\") and are To do, never Ready", itemsOf(p, P, "IMM 5257").length === 1 && itemsOf(p, P, "IMM 5257").every((i) => i.state === "to_do" && /fact/i.test(i.reason ?? "")));

  const ready = await fillEverything(c.id);
  p = (await prepare(c.id)).p;
  const s1 = (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, OFFICER)).body?.stage1 as { to_confirm: number }[] | undefined;
  ok("C7.7-9 pass: with every fact confirmed, stage 1 shows nothing left to confirm", ready && (s1 ?? []).length === 4 && s1!.every((x) => x.to_confirm === 0), s1);

  // P-145: an Online line offers a PDF copy, not for filing.
  const i5707 = itemsOf(p, P, "IMM 5707")[0];
  const before = (p?.items ?? []).length, readyBefore = JSON.stringify(p?.readiness);
  let r = await call("POST", `/runtime/items/${i5707?.id}/pdf-copy`, {}, OFFICER);
  ok("C7.7-10 pass: \"Download PDF copy\" on the Online IMM 5707 is a job (202)", r.status === 202, r.status);
  const copyId = r.body?.id;
  await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body?.status), 60_000);
  const copy = (await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body;
  ok("C7.7-11 pass: the copy is IRCC's own IMM 5707 PDF filled from the same confirmed facts, marked \"Copy, not for filing\"", copy?.status === "GENERATED" && copy?.copy_not_for_filing === true && copy?.source === "ircc_pdf" && copy?.intact === true, copy);
  p = (await prepare(c.id)).p;
  ok("C7.7-12 pass: the copy is never counted: no new item, readiness unchanged", before > 0 && !!copyId && (p?.items ?? []).length === before && JSON.stringify(p?.readiness) === readyBefore);
  r = await call("POST", `/runtime/form-copies/${copyId}/lock`, { kind: "filed" }, OFFICER);
  ok("C7.7-13 fail: a \"Copy, not for filing\" cannot be locked as filed or uploaded (409, in words)", r.status === 409 && /not for filing/i.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/items/${itemsOf(p, P, "IMM 5257")[0]?.id}/pdf-copy`, {}, OFFICER);
  ok("C7.7-14 fail: a PDF upload line has no separate \"PDF copy\" (its own PDF is the deliverable): 409 or 422", [409, 422].includes(r.status), r.status);
  ok("C7.7-15 pass (data): one filing per person, items keyed by filing × person × form", filingOf(p, P)?.id !== filingOf(p, S)?.id && Number(sql(`select count(*) from filing_item where case_id='${c.id}' and kind='form'`) ?? 0) === 8);
  // G24, G25 (QA-139): a copy ready to file never asks to write by hand a fact the case holds, and never shows engine
  // words. IMM 5707 for the principal: the case has children, so "has any children" is written, not left by hand.
  const c5707 = await generateCopy(c.id, "IMM 5707", P);
  const hand = JSON.parse(sql(`select coalesce(json_agg(b), '[]') from form_instance f, jsonb_array_elements(f.result_json->'boxes') b where f.id='${c5707}' and b->>'result' = 'by hand'`) ?? "null") as { fact: string | null; why?: string }[] | null;
  const held = new Set((sql(`select distinct canonical_field_key from client_canonical_answer where subject_id='${P}' and superseded_by_id is null`) ?? "").split("\n").filter(Boolean));
  ok("C7.7-16 pass (G25): the principal's IMM 5707 copy leaves nothing by hand that the case holds (\"has any children\" is written from the children on the case)", !!c5707 && Array.isArray(hand) && !hand.some((b) => !!b.fact && held.has(b.fact)) && !hand.some((b) => /child/i.test(b.fact ?? "")), hand?.filter((b) => b.fact && held.has(b.fact)));
  const shown = (await call("GET", `/runtime/form-copies/${c5707}`, undefined, OFFICER)).body?.by_hand as { label: string; why: string }[] | undefined;
  ok("C7.7-17 pass (G24, QA-139): every \"To write by hand\" line is in plain words: no engine step names", Array.isArray(shown) && !shown.some((x) => /derived:|phone_part:|derive_inverse:|executable set|[a-z]+\.[a-z_]+\(/.test(`${x.label} ${x.why}`)), shown);
  const rd = readinessOf((await prepare(c.id)).p, filingOf((await prepare(c.id)).p, P)?.id);
  ok("C7.7-18 pass: any line still to write by hand shows on the filing as a warning naming the form and the line (BR-9: everything else warns)", !!rd && ((shown ?? []).length === 0 || (rd.warns ?? []).some((w) => w.code === "hand_write" && /IMM 5707/.test(w.words))), rd?.warns);

  // Part 2 (r5c BR-8, P-144): a Paper line with its barcode page. The principal's IMM 5257 moves to Paper (an
  // accommodation, VV-R02; C11.6's built route); the spouse's stays a PDF upload.
  const toPaper = async (form: string) => { const q = (await prepare(c.id)).p; return call("PATCH", `/runtime/items/${itemsOf(q, P, form)[0]?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, OFFICER); };
  const line = async (form: string, who = P) => itemsOf((await prepare(c.id)).p, who, form)[0];
  r = await toPaper("IMM 5257");
  let pl = await line("IMM 5257");
  const keys = (x: typeof pl) => (x?.steps ?? []).map((s) => s.key).join(",");
  ok("C7.7-19 pass: the principal's IMM 5257 on Paper lists its barcode page and its steps in order: Validate in Adobe (adds the barcode page), print with the barcode page on top, signed in pen, mailed after Ready to file",
    r.status === 200 && pl?.channel === "PAPER" && pl?.signature === "PEN" && pl?.barcode_page === true && keys(pl) === "validate,print,sign_in_pen,mail" && /barcode page on top/.test(pl?.steps?.[1]?.words ?? "") && pl?.steps?.[3]?.neededBefore === "after_ready", { status: r.status, line: pl });
  ok("C7.7-20 pass: before its validated copy is read back the Paper line is To do and says to Validate in Adobe and read it back", pl?.state === "to_do" && /Validate in Adobe/.test(pl?.reason ?? "") && pl?.validated === null, pl?.reason);
  const sp = await line("IMM 5257", S);
  ok("C7.7-21 fail: the spouse's IMM 5257, still a PDF upload, carries no Paper steps or barcode page line", sp?.channel === "PDF_UPLOAD" && sp?.steps === undefined && sp?.barcode_page === undefined, sp);
  const raw = await generateCopy(c.id, "IMM 5257", P);
  const back = await sendFile(`/runtime/form-copies/${raw}/validated`, await copyBytes(raw!), "IMM5257.pdf");
  pl = await line("IMM 5257");
  ok("C7.7-22 fail: the copy sent back unchanged (Validate never pressed, so no barcode page) is refused (422) and the line stays To do with no validated copy", back.status === 422 && pl?.state === "to_do" && pl?.validated === null, { status: back.status, state: pl?.state });
  const vid = await validateRoundTrip(c.id, "IMM 5257", P);
  pl = await line("IMM 5257");
  ok("C7.7-23 pass: once its validated copy is read back for today's facts the line is In progress, its Validate step done, naming that copy", !!vid && pl?.state === "in_progress" && pl?.steps?.[0]?.done === true && pl?.validated?.copy === vid && pl?.validated?.current === true, pl);
  ok("C7.7-24 fail: a Paper line is never Ready before it is printed and signed in pen (those steps are not recorded yet: C8.1)", pl?.state !== "ready" && (pl?.steps ?? []).slice(1).every((s) => s.done === null));
  r = await toPaper("IMM 5476");
  const p5476 = await line("IMM 5476");
  // A form that makes no barcode page has no barcode page line (engine: tests/check_vv_prepare_store.ts "C7.7 Paper"); on the
  // APR Portal no such Visitor visa form may go on Paper: IMM 5476 is accepted only as a PDF upload (its sourced record).
  ok("C7.7-25 fail: IMM 5476 cannot go on Paper here (IRCC accepts it only as a PDF upload): refused (422) with IRCC's line, and its line carries no Paper steps", r.status === 422 && /PDF upload/.test(r.body?.detail ?? "") && p5476?.channel === "PDF_UPLOAD" && p5476?.steps === undefined && p5476?.barcode_page === undefined, { status: r.status, detail: r.body?.detail, channel: p5476?.channel });
  const put = await answer(c.id, P, "person.family_name", "SAMPLE-CHANGED");
  pl = await line("IMM 5257");
  ok("C7.7-26 pass (P-171 (1)): a fact on IMM 5257 changed after the read-back makes the Paper line Out of date, asking for Validate again", put.status === 200 && pl?.state === "out_of_date" && /Validate again/.test(pl?.reason ?? "") && pl?.validated?.current === false, { put: put.status, line: pl?.state, reason: pl?.reason });
});
