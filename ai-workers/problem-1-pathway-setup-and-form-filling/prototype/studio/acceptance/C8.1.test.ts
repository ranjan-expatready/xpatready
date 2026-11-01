// C8.1 Signed-PDF states, upload of signed scans, per-screen "entered" ticks (M3-F; r5c BR-8, BR-10, BR-21; P-65,
// P-136, P-143). Visitor visa part: IMM 5476 is signed by the applicant and the representative (VV-R10), by hand and
// scanned (Sample channel, FQ-2): print → signed → scan received, in that order; "Uploaded to IRCC" only after "Ready
// to file"; IMM 5257 for a child under 18 is signed by a parent (VV-R09); there is no "sign for the client" action. The
// per-section "Entered in the portal" tick is C7.3-9.
// Breadth, after Visitor visa: Paper lines signed in pen with the barcode page on top; client e-sign in the PR Portal.
//   tsx studio/acceptance/C8.1.test.ts 4440 xr_studio_accept
import { CLIENT, FAMILY, fillEverything, OFFICER, call, firms, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readyToFile, sendFile, signedScan, sql, yearsAgo, filingOf } from "./lib/m3.ts";

await main("C8.1", "Signed PDFs: steps, signed scans and who signs (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const fam = await openCase(vv, FAMILY);
  let p = (await prepare(fam.id)).p;
  const K10 = fam.subjects["Sample Child A1"], P0 = fam.subjects["Sample Client A"];
  ok("C8.1-1 pass (VV-R09): a child's IMM 5257 is signed by a parent; an adult's by the person", JSON.stringify(itemsOf(p, K10, "IMM 5257")[0]?.signers) === JSON.stringify(["parent"]) && JSON.stringify(itemsOf(p, P0, "IMM 5257")[0]?.signers) === JSON.stringify(["person"]), [itemsOf(p, K10, "IMM 5257")[0]?.signers, itemsOf(p, P0, "IMM 5257")[0]?.signers]);
  ok("C8.1-2 pass (VV-R10): IMM 5476 is signed by the person and the representative", JSON.stringify(itemsOf(p, P0, "IMM 5476")[0]?.signers) === JSON.stringify(["person", "representative"]));

  const f = await firms();
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] });
  const P = c.subjects["Sample Client A"];
  await fillEverything(c.id); // a form is signed only once its facts are confirmed (P-71)
  p = (await prepare(c.id)).p;
  const it = itemsOf(p, P, "IMM 5476")[0];
  const steps = async () => ((await call("GET", `/runtime/items/${it?.id}`, undefined, OFFICER)).body?.sign_steps ?? []) as { key: string; done: { at: string; by: string } | null }[];
  ok("C8.1-3 pass: a \"signed by hand and scanned\" line has the steps print → signed → scan received → uploaded to IRCC", JSON.stringify((await steps()).map((s) => s.key)) === JSON.stringify(["print", "signed", "scan_received", "uploaded_to_ircc"]));
  let r = await call("POST", `/runtime/items/${it?.id}/sign-steps/signed`, {}, OFFICER);
  ok("C8.1-4 fail: \"signed\" before \"print\" is refused in words (409)", r.status === 409 && /print/i.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/items/${it?.id}/sign-steps/print`, {}, OFFICER);
  ok("C8.1-5 fail: printing needs a generated copy of IMM 5476 first (409)", r.status === 409, r.status);
  const copy = await generateCopy(c.id, "IMM 5476", P);
  r = await call("POST", `/runtime/items/${it?.id}/sign-steps/print`, { copy }, OFFICER);
  ok("C8.1-6 pass: printed, with who and when, naming the copy printed", r.status === 200 && (await steps())[0]?.done?.by === OFFICER);
  r = await call("POST", `/runtime/items/${it?.id}/sign-steps/signed`, {}, OFFICER);
  ok("C8.1-7 pass: marked signed by hand", r.status === 200);
  r = await sendFile(`/runtime/items/${it?.id}/signed-scan`, Buffer.from("not a pdf"), "scan.txt");
  ok("C8.1-8 fail: a scan that is not a PDF or image is refused (422), nothing recorded", r.status === 422 && sql(`select count(*) from signed_scan where item_id='${it?.id}'`) === "0", r.status);
  r = await sendFile(`/runtime/items/${it?.id}/signed-scan`, signedScan("IMM 5476"), "imm5476-signed.pdf", CLIENT);
  ok("C8.1-9 fail: a client cannot upload the signed scan here (403; the client's own upload is the client portal, after M3)", r.status === 403, r.status);
  r = await sendFile(`/runtime/items/${it?.id}/signed-scan`, signedScan("IMM 5476"), "imm5476-signed.pdf");
  ok("C8.1-10 pass: the signed scan is stored with its checksum; step \"scan received\" done; the item is Ready", r.status === 201 && !!sql(`select sha256 from signed_scan where item_id='${it?.id}'`) && (await steps())[2]?.done !== null && itemsOf((await prepare(c.id)).p, P, "IMM 5476")[0]?.state === "ready", r.body);
  r = await call("POST", `/runtime/items/${it?.id}/sign-steps/uploaded_to_ircc`, {}, OFFICER);
  ok("C8.1-11 fail (BR-21): \"Uploaded to IRCC\" before the filing is Ready to file is refused (409)", r.status === 409 && /ready to file/i.test(r.body?.detail ?? ""), r.body?.detail);
  ok("C8.1-12 fail: there is no \"sign for the client\" action (404 or 405)", !!it?.id && [404, 405].includes((await call("POST", `/runtime/items/${it?.id}/sign-for-client`, {}, OFFICER)).status));

  const ready = await readyToFile(c.id, f.rep);
  r = await call("POST", `/runtime/items/${it?.id}/sign-steps/uploaded_to_ircc`, {}, OFFICER);
  ok("C8.1-13 pass: after Ready to file, \"Uploaded to IRCC\" is ticked; the item is Done", ready.includes(filingOf(p, P)?.id ?? "") && r.status === 200 && itemsOf((await prepare(c.id)).p, P, "IMM 5476")[0]?.state === "done", { ready, status: r.status });
  ok("C8.1-14 pass (data): the scan is never changed in place (append-only signed_scan)", Number(sql(`select count(*) from signed_scan where item_id='${it?.id}'`) ?? 0) >= 1 && sql(`update signed_scan set sha256='x' where item_id='${it?.id}' returning 1`) === null);
});
