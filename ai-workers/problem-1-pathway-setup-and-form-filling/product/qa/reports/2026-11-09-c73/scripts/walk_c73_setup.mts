// Setup for qa's C7.3 gate A walk (not under test; the steps of c78's walk_c78_setup.mts plus C7.3's own lib/c73.ts
// set-up): one principal on Visitor visa; the application form filed Online on the case (C11.6) when the release has no
// Online line; every fact answered and confirmed; other forms signed or validated; reviewed; every warning passed. No
// section of the answer sheet is ticked here: the ticks are the walk's. US$0, no AI.
//   LIB=<studio>/acceptance/lib/m3.ts tsx walk_c73_setup.mts <port> <db>
const L = await import(process.env.LIB!);
const { call, main, firms, yearsAgo } = L;
await main("walk C7.3 (qa setup)", "one filing, IMM 5257 Online, every warning passed", async () => {
  const vv = L.needVisitorVisa(); const f = await firms(); const officer = f.officer ?? "user-O";
  const name = "Sample Client W";
  const c = await L.openCase(vv, [{ role: "principal", name, dob: yearsAgo(36) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects[name];
  let p = (await L.prepare(c.id, officer)).p;
  const mine = (await L.expectedFor(c.id))?.[name];
  const online = mine?.forms.find((l: { online?: boolean }) => l.online), app = mine?.forms.find((l: { barcode?: boolean }) => l.barcode)?.form;
  let moved = "release line";
  if (!online) {
    const it = L.itemsOf(p, P, app)[0];
    const r = await call("PATCH", `/runtime/items/${it?.id}/channel`, { channel: "ONLINE", version: p?.version }, officer);
    moved = `moved ${app} to ONLINE: ${r.status}`;
  }
  const form = online?.form ?? app;
  await L.fillEverything(c.id);
  const view = async () => (await L.prepare(c.id, officer)).p;
  const v = await view(); const fid = v?.filings[0]?.id ?? "";
  for (const i of (v?.items ?? []).filter((x: { kind: string; state: string }) => x.kind === "form" && !["ready", "done"].includes(x.state))) {
    if (i.channel === "PDF_UPLOAD" && mine?.forms.some((l: { form: string; barcode?: boolean }) => l.form === i.form && l.barcode)) await L.validateRoundTrip(c.id, i.form!, i.subject);
    if (i.signature === "HAND_SCANNED") await L.signByHand(c.id, i.id, i.form!, i.subject);
  }
  await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed (Sample)", facts_hash: L.readinessOf(await view(), fid)?.facts_hash }, f.rep ?? "");
  const warns = L.readinessOf(await view(), fid)?.warns ?? [];
  for (const l of warns) await call("POST", `/runtime/filings/${fid}/warnings/${l.code}/pass`, { reason: "Passed for the walk (Sample)", key: l.key }, officer);
  const fin = await view(); const after = L.readinessOf(fin, fid);
  const item = L.itemsOf(fin, P, form)[0];
  console.log(`CASE ${c.id} FILING ${fid} ITEM ${item?.id} FORM ${form} SUBJECT ${P} OFFICER ${officer} REP ${f.rep} (${moved}) item_state ${item?.state} warnings_before ${warns.length} open_after ${(after?.warns ?? []).length} blocks_after ${(after?.blocks ?? []).length}`);
});
