// C3.11 acceptance (P-220 pack 2; P-62 §3, P-143): a form line filed as PDF upload, signed by hand and scanned, adds its
// signed-scan document line to the checklist of each person who signs it, on Visitor visa (vv.single) first. Worked out
// from the form line, never stored; it follows the line (cannot be moved or removed alone) and goes when the line's
// signature changes. IRCC: IMM 5484 (05-2026) "The following IRCC forms must be completed, signed and dated" (trace
// IRCC-P2-01). The fuller suite is on PR #113 (tests/check_c3_11_signed_scan.ts, on wp.family); this one fails on main
// until #113 or its successor lands, and is the Visitor visa proof. Rules only, no AI (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C3.11.test.ts 4440 xr_studio_accept
import { pack2, run } from "./lib/pack2.ts";

const T = pack2("C3.11");
const { call, sql, ok, words } = T;
const scans = (v: any) => (v?.roles ?? []).flatMap((r: any) => (r.lines ?? []).filter((l: any) => l.automatic).map((l: any) => ({ role: r.role, ...l })));

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  // Setup through the screens' own routes: Who can be (principal, spouse or partner, child, representative), then the IMM 5257 line.
  let r = await T.people(vv);
  ok("setup: Visitor visa's Who can be is principal, spouse or partner, child and representative (Sample counts)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  if (sql(`select count(*) from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='IMM 5257'`) === "0") await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5257" });
  const line = sql(`select cf.lineage_key from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='IMM 5257' order by cf.version desc limit 1`);
  ok("setup: Visitor visa has an IMM 5257 form line", !!line);
  const list = async () => (await call("GET", `/combinations/${vv}/checklist`)).body;
  ok("C3.11 fail-guard: a plain PDF upload line adds no signed-scan line", scans(await list()).length === 0);

  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line)}/channel`, { channel: "PDF_UPLOAD", signature: "HAND_SCANNED", from: "PDF_UPLOAD", fromSignature: "NONE" });
  ok("setup: IMM 5257 is set to PDF upload, signed by hand and scanned (Forms tab route)", r.status === 200, r.status >= 300 ? words(r) : undefined);
  let V = await list();
  const mine = scans(V).filter((x: any) => x.automatic?.form === "IMM 5257");
  ok("C3.11 pass: each person applying has their own 'IMM 5257 signed by hand and scanned' (principal, spouse or partner, child)", ["principal", "spouse_or_partner", "child"].every((role) => mine.some((x: any) => x.role === role && x.document?.name === "IMM 5257 signed by hand and scanned")), scans(V).map((x: any) => `${x.role}:${x.document?.name}`));
  ok("C3.11 pass: the line says why (the form and how it is filed) and supplies no facts", mine.length > 0 && mine.every((x: any) => /IMM 5257 is filed as PDF upload, signed by hand and scanned/.test(x.automatic.reason ?? "") && !(x.supplies ?? []).length));
  ok("C3.11 fail: the representative gets no signed scan of a form that is not about them", mine.length > 0 && !scans(V).some((x: any) => x.role === "representative"));
  ok("C3.11 data: nothing is stored for a signed scan (no document requirement row)", mine.length > 0 && sql(`select count(*) from document_requirement where combination_id='${vv}' and lineage_key like 'signed_scan:%'`) === "0");
  // G5256 (IRCC-P2-06, P2-07): a minor's form is still signed — by a parent or legal guardian — and an unsigned form is
  // returned, so the child's signed scan is still asked for; it says who signs it. Under 18 is decided by the person's age
  // (Sample), whatever the line's "Signed by".
  const child = mine.find((x: any) => x.role === "child") ?? scans(V).find((x: any) => /child/i.test(`${x.automatic?.reason ?? ""} ${x.lineage ?? ""}`));
  ok("C3.11 pass: the child's IMM 5257 scan is still asked for, and says a parent or legal guardian signs it (under 18)", !!child && /parent|legal guardian/i.test(`${child.automatic?.reason ?? ""} ${child.when ?? ""} ${child.document?.name ?? ""}`), child && { role: child.role, reason: child.automatic?.reason });

  const scan = scans(await list())[0];
  r = await call("POST", `/combinations/${vv}/checklist/move`, { lineage: scan?.lineage ?? "none", role: scan?.role ?? "principal", direction: "up" });
  ok("C3.11 fail: a signed scan cannot be moved on its own (409, names the Forms tab)", r.status === 409 && /Forms tab/.test(words(r)), words(r));

  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line)}/channel`, { channel: "PDF_UPLOAD", signature: "NONE", from: "PDF_UPLOAD", fromSignature: "HAND_SCANNED" });
  V = await list();
  ok("C3.11 pass: back to PDF upload with no signature, every IMM 5257 signed scan is gone", mine.length > 0 && r.status === 200 && scans(V).filter((x: any) => x.automatic?.form === "IMM 5257").length === 0);
  T.done();
});
