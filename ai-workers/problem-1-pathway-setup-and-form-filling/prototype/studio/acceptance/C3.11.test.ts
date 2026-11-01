// C3.11 acceptance (P-220 pack 2; P-62 §3, P-143): a form line filed as PDF upload, signed by hand and scanned, adds its
// signed-scan document line to the checklist of each person who signs it, on Visitor visa (vv.single) of the six. Worked
// out from the form line, never stored; it follows the line (cannot be moved or removed alone, the last own document
// cannot move below it) and goes when the line's signature changes. IRCC: IMM 5484 (05-2026) "The following IRCC forms
// must be completed, signed and dated" (trace IRCC-P2-01).
// C3.11 is Works on main (tests/check_c3_11_signed_scan.ts on the suites' fixture): this is its Visitor visa proof and
// should be green. Who signs a minor's form follows main's Sample rule ("a parent, for a minor" = the principal signs the
// child's form, engine/sources.ts); G5256 says a parent or legal guardian signs (IRCC-P2-06). Whether a minor's form is
// signed by the principal or by "a parent or legal guardian" is a question for the founder and the immigration expert,
// not settled here. Rules only, no AI (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C3.11.test.ts 4440 xr_studio_accept
import { pack2, run } from "./lib/pack2.ts";

const T = pack2("C3.11");
const { call, sql, ok, words } = T;
const scans = (v: any) => (v?.roles ?? []).flatMap((r: any) => (r.lines ?? []).filter((l: any) => l.automatic).map((l: any) => ({ role: r.role, ...l })));

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  let r = await T.people(vv);
  ok("setup: Visitor visa's Who can be is principal, spouse or partner, child and representative (Sample counts)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  if (sql(`select count(*) from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='IMM 5257'`) === "0") await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5257" });
  const line = sql(`select cf.lineage_key from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='IMM 5257' order by cf.version desc limit 1`);
  ok("setup: Visitor visa has an IMM 5257 form line", !!line);
  const list = async () => { const x = await call("GET", `/combinations/${vv}/checklist`); return x.status === 200 ? x.body : null; };
  let V = await list();
  ok("C3.11 fail-guard: the checklist answers (200), and a plain PDF upload line adds no signed-scan line", !!V && scans(V).length === 0);

  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line)}/channel`, { channel: "PDF_UPLOAD", signature: "HAND_SCANNED", from: "PDF_UPLOAD", fromSignature: "NONE" });
  ok("setup: IMM 5257 is set to PDF upload, signed by hand and scanned (Forms tab route)", r.status === 200, r.status >= 300 ? words(r) : undefined);
  V = await list();
  const mine = scans(V).filter((x: any) => x.automatic?.form === "IMM 5257");
  ok("C3.11 pass: each person applying gets 'IMM 5257 signed by hand and scanned' (not set = the person signs)", ["principal", "spouse_or_partner", "child"].every((role) => mine.some((x: any) => x.role === role && x.document?.name === "IMM 5257 signed by hand and scanned")), scans(V).map((x: any) => `${x.role}:${x.document?.name}`));
  ok("C3.11 pass: the line says why (the form and how it is filed), supplies no facts and is marked automatic ('Added by the form line' on screen)", mine.length > 0 && mine.every((x: any) => /IMM 5257 is filed as PDF upload, signed by hand and scanned/.test(x.automatic.reason ?? "") && !(x.supplies ?? []).length && x.status === "AUTOMATIC"));
  ok("C3.11 fail: the representative gets no signed scan of a form that is not about them", mine.length > 0 && !scans(V).some((x: any) => x.role === "representative"));
  ok("C3.11 data: nothing is stored for a signed scan (no document requirement row)", mine.length > 0 && sql(`select count(*) from document_requirement where combination_id='${vv}' and lineage_key like 'signed_scan:%'`) === "0");

  // ---------------------------------------------------------------- it follows its form line
  const pr = (V?.roles ?? []).find((x: any) => x.role === "principal");
  const scan = (pr?.lines ?? []).find((y: any) => y.automatic?.form === "IMM 5257");
  r = await call("POST", `/combinations/${vv}/checklist/move`, { lineage: scan?.lineage ?? "none", role: "principal", direction: "up" });
  ok("C3.11 fail: a signed scan cannot be moved on its own (409, names the Forms tab)", !!scan && r.status === 409 && /Forms tab/.test(words(r)), words(r));
  r = await call("PATCH", `/combinations/${vv}/requirements/${encodeURIComponent(scan?.lineage ?? "none")}`, { retire: true });
  ok("C3.11 fail: a signed scan cannot be removed on its own (refused, still on the checklist)", !!scan && r.status >= 400 && scans(await list()).some((x: any) => x.lineage === scan.lineage), r.status);
  const lastOwn = (pr?.lines ?? []).filter((y: any) => !y.automatic).at(-1);
  if (lastOwn) {
    r = await call("POST", `/combinations/${vv}/checklist/move`, { lineage: lastOwn.lineage, role: "principal", direction: "down" });
    ok("C3.11 fail: the last own document cannot move below the signed scans (409 'already last before the signed scans')", r.status === 409 && /already last before the signed scans/.test(words(r)), words(r));
  }

  // ---------------------------------------------------------------- who signs (main's Sample rule)
  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent("IMM 5257")}`, { signedBy: "parent_for_minor" });
  const minor = scans(await list()).filter((x: any) => x.automatic?.form === "IMM 5257");
  ok("C3.11 pass (Sample rule): 'a parent, for a minor' — the child's IMM 5257 scan is asked of the principal; adults still sign their own", r.status === 200 && !minor.some((x: any) => x.role === "child") && minor.some((x: any) => x.role === "principal") && minor.some((x: any) => x.role === "spouse_or_partner"), minor.map((x: any) => x.role));
  await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent("IMM 5257")}`, { signedBy: "person" });

  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line)}/channel`, { channel: "PDF_UPLOAD", signature: "NONE", from: "PDF_UPLOAD", fromSignature: "HAND_SCANNED" });
  V = await list();
  ok("C3.11 pass: back to PDF upload with no signature, every IMM 5257 signed scan is gone", mine.length > 0 && r.status === 200 && !!V && scans(V).filter((x: any) => x.automatic?.form === "IMM 5257").length === 0);
  T.done();
});
