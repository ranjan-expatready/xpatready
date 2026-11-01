// C7.7 Prepare application lists each filing's items as a two-stage deliverables list (M3-E; r5c BR-8; P-62 §6,
// P-122, P-137, P-145). Visitor visa part: stage 1 the facts to confirm, stage 2 the items of three kinds (form,
// document, IRCC step) per person, each with one state; forms per person follow the line's "who" and minimum age
// (VV-R07, VV-R09, VV-R10); biometrics is an IRCC step for each person 14–79 (VV-R15), after filing (VV-R17); an Online
// line offers "Download PDF copy", IRCC's PDF filled from the same confirmed facts, marked "Copy, not for filing" and
// never counted. The portal is read-only (C11.6-1).
// Breadth, after Visitor visa: Paper lines with the barcode page, waiting filings ("Cannot start yet"), our-format copy
// for an online-only form with no IRCC PDF.
//   tsx studio/acceptance/C7.7.test.ts 4440 xr_studio_accept
import { FAMILY, OFFICER, call, filingOf, fillEverything, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, until } from "./lib/m3.ts";

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
});
