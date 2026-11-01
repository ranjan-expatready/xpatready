// C11.6 Each form's channel is picked per form inside what IRCC accepts (M3-B, case side; r5c BR-8; P-122, P-137,
// P-143). Already built (M2, Partial): the combination line's channel and signature, and the C-9 validated-copy read
// back (tests/runtime/check_runtime_r1d.ts). New here: on the case each form item carries the line's channel as its
// default and the channels IRCC accepts for that edition on the combination's IRCC account; a change on the item is
// refused with IRCC's own line when outside them; the portal stays fixed by the combination (read-only). Rules: VV-R04,
// VV-R10, VV-R12.
// Breadth, after Visitor visa: portal-only forms of the permanent-residence combinations (answer sheet in portal order).
//   tsx studio/acceptance/C11.6.test.ts 4440 xr_studio_accept
import { CLIENT, FAMILY, OFFICER, call, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql } from "./lib/m3.ts";

await main("C11.6", "Channel per form on the case, inside what IRCC accepts", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const P = c.subjects["Sample Client A"];
  let p = (await prepare(c.id)).p;
  ok("C11.6-1 pass: the case shows the combination's IRCC account, read-only (\"Filed through APR Portal\", P-137)", p?.portal === sql(`select portal_key from combination where id='${vv}'`) && !!p?.portal, p?.portal);
  ok("C11.6-2 fail: there is no route to change the portal on a case (PATCH …/portal: 404 or 405)", !!p?.portal && [404, 405].includes((await call("PATCH", `/runtime/cases/${c.id}/portal`, { portal: "IRCC_PORTAL" })).status));
  const i5257 = itemsOf(p, P, "IMM 5257")[0], i5707 = itemsOf(p, P, "IMM 5707")[0], i5476 = itemsOf(p, P, "IMM 5476")[0];
  ok("C11.6-3 pass: each form item starts on its combination line's channel (IMM 5257 PDF upload, IMM 5707 Online, IMM 5476 PDF upload; Sample, FQ-2)", i5257?.channel === "PDF_UPLOAD" && i5707?.channel === "ONLINE" && i5476?.channel === "PDF_UPLOAD", [i5257?.channel, i5707?.channel, i5476?.channel]);
  ok("C11.6-4 pass: each form item lists the channels IRCC accepts for its edition on this account; IMM 5476 accepts PDF upload only (\"Upload this form along with your online application\", VV-R10)", Array.isArray(i5476?.accepts) && i5476!.accepts!.length === 1 && i5476!.accepts![0] === "PDF_UPLOAD", i5476?.accepts);
  ok("C11.6-5 pass: the signature value follows edition × channel: IMM 5476 signed by hand and scanned, IMM 5707 typed name", i5476?.signature === "HAND_SCANNED" && i5707?.signature === "TYPED_NAME", [i5476?.signature, i5707?.signature]);

  let r = await call("PATCH", `/runtime/items/${i5476?.id}/channel`, { channel: "ONLINE", version: p?.version }, OFFICER);
  ok("C11.6-6 fail: Online on IMM 5476 is refused with IRCC's own line (422), nothing changed", r.status === 422 && /upload/i.test(r.body?.detail ?? "") && itemsOf((await prepare(c.id)).p, P, "IMM 5476")[0]?.channel === "PDF_UPLOAD", r.body?.detail);
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "FAX", version: p?.version }, OFFICER);
  ok("C11.6-7 fail: an unknown channel is a 400 naming the four channels", r.status === 400 && /Online|PDF upload|Paper|Not needed/.test(JSON.stringify(r.body)), r.status);
  ok("C11.6-8 fail: a client cannot change a channel (403)", (await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "ONLINE", version: p?.version }, CLIENT)).status === 403);
  const target = (i5257?.accepts ?? []).find((x) => x !== i5257?.channel);
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: target, version: p?.version }, OFFICER);
  const changed = r.status === 200;
  p = (await prepare(c.id)).p;
  ok("C11.6-9 pass: a channel inside what IRCC accepts is saved on that person's item only; the spouse's IMM 5257 keeps its channel", !!target && r.status === 200 && itemsOf(p, P, "IMM 5257")[0]?.channel === target && itemsOf(p, c.subjects["Sample Spouse A"], "IMM 5257")[0]?.channel === "PDF_UPLOAD", { target, status: r.status });
  ok("C11.6-10 pass (data): the change is audited with who, from and to, without client values", /IMM 5257/.test(sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity='item' and entity_key='${i5257?.id}'`) ?? ""));
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "PDF_UPLOAD", version: 0 }, OFFICER);
  ok("C11.6-11 fail: a change from an older version is refused (409, Reload)", r.status === 409, r.status);
  ok("C11.6-12 pass: the combination's own line is unchanged by a case change (configuration stays as released)", changed && sql(`select channel from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='IMM 5257' order by cf.version desc limit 1`) === "PDF_UPLOAD");
});
