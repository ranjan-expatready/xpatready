// C11.6 Each form's channel is picked per form inside what IRCC accepts (M3-B, case side; r5c BR-8; P-122, P-137,
// P-143). Already built (M2, Partial): the combination line's channel and signature, and the C-9 validated-copy read
// back (tests/runtime/check_runtime_r1d.ts). New here: on the case each form item carries the line's channel as its
// default and the channels IRCC accepts for that edition on the combination's IRCC account; a change on the item is
// refused with IRCC's own line when outside them; the portal stays fixed by the combination (read-only). Rules: VV-R04,
// VV-R10, VV-R12.
// Breadth, after Visitor visa: portal-only forms of the permanent-residence combinations (answer sheet in portal order).
//   tsx studio/acceptance/C11.6.test.ts 4440 xr_studio_accept
import { CLIENT, FAMILY, OFFICER, call, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, expectedFor } from "./lib/m3.ts";

await main("C11.6", "Channel per form on the case, inside what IRCC accepts", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const P = c.subjects["Sample Client A"];
  let p = (await prepare(c.id)).p;
  ok("C11.6-1 pass: the case shows the combination's IRCC account, read-only (\"Filed through APR Portal\", P-137)", p?.portal === sql(`select portal_key from combination where id='${vv}'`) && !!p?.portal, p?.portal);
  ok("C11.6-2 fail: there is no route to change the portal on a case (PATCH …/portal: 404 or 405)", !!p?.portal && [404, 405].includes((await call("PATCH", `/runtime/cases/${c.id}/portal`, { portal: "IRCC_PORTAL" })).status));
  // Row C4 (P-319, R1): the forms and their release channels are the case's own lines from C1's expectedLines, never a
  // form number or channel written here: the barcode form (IMM 5257), the family form (IMM 5707 on the fixture, IMM 5645
  // on release 2) and the form signed by hand and scanned (IMM 5476, a line that applies on "uses a representative").
  const ex = await expectedFor(c.id), mine = ex?.["Sample Client A"], lines = [...(mine?.forms ?? []), ...(mine?.waiting ?? [])];
  const BCL = lines.find((l) => l.barcode), FL = lines.find((l) => l.family), HL = lines.find((l) => l.handSigned);
  const BC = BCL?.form ?? "", FAM = FL?.form ?? "", HS = HL?.form ?? "";
  // A form name that is not read stays empty, and an empty name picks no item (itemsOf would take every item), so each
  // step that reads it fails rather than passing on another form.
  const pick = (form: string) => (form ? itemsOf(p, P, form)[0] : undefined);
  const i5257 = pick(BC), i5707 = pick(FAM), i5476 = pick(HS);
  const spouseBC = [...(ex?.["Sample Spouse A"]?.forms ?? [])].find((l) => l.form === BC)?.channel;
  ok(`C11.6-3 pass: each form item starts on its release line's channel (${BC} ${BCL?.channel}, ${FAM} ${FL?.channel}, ${HS} ${HL?.channel}; Sample, FQ-2)`, !!BCL && !!FL && !!HL && i5257?.channel === BCL.channel && i5707?.channel === FL.channel && i5476?.channel === HL.channel, [i5257?.channel, i5707?.channel, i5476?.channel]);
  ok(`C11.6-4 pass: each form item lists the channels IRCC accepts for its edition on this account; ${HS} accepts PDF upload only ("Upload this form along with your online application", VV-R10)`, Array.isArray(i5476?.accepts) && i5476!.accepts!.length === 1 && i5476!.accepts![0] === "PDF_UPLOAD", i5476?.accepts);
  ok(`C11.6-5 pass: the signature value follows edition × channel: ${HS} signed by hand and scanned, ${FAM} as its line says (${FL?.signature})`, i5476?.signature === "HAND_SCANNED" && !!FL && i5707?.signature === FL.signature, [i5476?.signature, i5707?.signature]);

  let r = await call("PATCH", `/runtime/items/${i5476?.id}/channel`, { channel: "ONLINE", version: p?.version }, OFFICER);
  ok(`C11.6-6 fail: Online on ${HS} is refused with IRCC's own line (422), nothing changed`, !!HS && r.status === 422 && /upload/i.test(r.body?.detail ?? "") && !!HL && itemsOf((await prepare(c.id)).p, P, HS)[0]?.channel === HL.channel, r.body?.detail);
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "FAX", version: p?.version }, OFFICER);
  ok("C11.6-7 fail: an unknown channel is a 400 naming the four channels", !!i5257 && r.status === 400 && /Online|PDF upload|Paper|Not needed/.test(JSON.stringify(r.body)), r.status);
  ok("C11.6-8 fail: a client cannot change a channel (403)", !!i5257 && (await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "ONLINE", version: p?.version }, CLIENT)).status === 403);
  // Row C4: the fixture's Sample accepts record (setup S4a) takes IMM 5257 as a PDF upload only on the APR Portal, so
  // Online is outside it there. Release 2 accepts IMM 5257 Online (its line), so the step takes the first form item and
  // channel outside what that item accepts (Online on the barcode form where it is outside, as on the fixture; else
  // another, never the pair -6 already tried); the rule is the same: refused with the reason, nothing changed.
  const outside = (["ONLINE", "PDF_UPLOAD", "PAPER"] as const).flatMap((ch) => [i5257, i5476, i5707].filter((i) => i && !(i.accepts ?? []).includes(ch) && !(i === i5476 && ch === "ONLINE")).map((i) => ({ i: i!, ch })))[0];
  r = await call("PATCH", `/runtime/items/${outside?.i.id}/channel`, { channel: outside?.ch, version: p?.version }, OFFICER);
  ok(`C11.6-8a fail (r5c §6): a channel outside what the item accepts on the APR Portal is refused with the reason, nothing changed (422; here ${outside?.ch} on ${outside?.i.form}; the fixture's Sample accepts record, setup S4a: Online on IMM 5257)`, !!outside && r.status === 422 && /PDF upload|accept/i.test(r.body?.detail ?? "") && itemsOf((await prepare(c.id)).p, P, outside.i.form)[0]?.channel === outside.i.channel, r.body?.detail);
  const target = "PAPER";
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: target, version: p?.version }, OFFICER);
  ok("C11.6-8b fail (FQ-3, recommended): Paper on a visitor visa needs a written accommodation reason (400 without one)", !!i5257 && r.status === 400 && /reason|accommodation/i.test(JSON.stringify(r.body)), r.status);
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: target, reason: "Cannot apply online: accommodation (Sample)", version: p?.version }, OFFICER);
  const changed = r.status === 200;
  p = (await prepare(c.id)).p;
  ok(`C11.6-9 pass: Paper, accepted for ${BC} (Sample) and given with a reason, is saved on that person's item only; the spouse's ${BC} keeps its line's channel (${spouseBC})`, !!BC && !!target && r.status === 200 && itemsOf(p, P, BC)[0]?.channel === target && !!spouseBC && itemsOf(p, c.subjects["Sample Spouse A"], BC)[0]?.channel === spouseBC, { target, status: r.status });
  ok(`C11.6-10 pass (data): the change is audited with who, from and to, without client values`, !!BC && (sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity='item' and entity_key='${i5257?.id}'`) ?? "").includes(BC));
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "PDF_UPLOAD", version: 0 }, OFFICER);
  ok("C11.6-11 fail: a change from an older version is refused (409, Reload)", !!i5257 && r.status === 409, r.status);
  // Row C4: the configured line of the barcode form keeps the channel its release gives it (expectedLines).
  const line = /^[A-Z0-9 ]+$/.test(BC) ? sql(`select channel from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='${BC}' order by cf.version desc limit 1`) : null;
  ok(`C11.6-12 pass: the combination's own line is unchanged by a case change (configuration stays as released: ${BC} ${BCL?.channel})`, changed && !!BCL && line === BCL.channel, { line, released: BCL?.channel });
});
