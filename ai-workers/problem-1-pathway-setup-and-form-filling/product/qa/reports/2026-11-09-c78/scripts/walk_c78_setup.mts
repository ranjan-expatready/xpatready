// Setup for qa's C7.8 gate A walk (not under test; the same steps as walk_ready.mts of rescore10, with every warning passed):
// one person on Visitor visa, every fact answered, forms signed or validated, reviewed, every warning passed, so the filing
// starts at Ready · 100% before the case officer adds a form by screens. US$0, no AI.
//   LIB=<studio>/acceptance/lib/m3.ts tsx walk_c78_setup.mts <port> <db>
const L = await import(process.env.LIB!);
const { call, main, firms, yearsAgo } = L;
await main("walk C7.8 (qa setup)", "one filing, every warning passed", async () => {
  const vv = L.needVisitorVisa(); const f = await firms(); const officer = f.officer ?? "user-O";
  const c = await L.openCase(vv, [{ role: "principal", name: "Sample Client W", dob: yearsAgo(36) }], { representative: f.rep, caseOfficers: [officer] });
  await L.fillEverything(c.id);
  const view = async () => (await L.prepare(c.id, officer)).p;
  const v = await view(); const fid = v?.filings[0]?.id ?? "";
  const e = (await L.expectedFor(c.id))?.["Sample Client W"];
  for (const i of (v?.items ?? []).filter((x: { kind: string; state: string }) => x.kind === "form" && !["ready", "done"].includes(x.state))) {
    if (i.channel === "PDF_UPLOAD" && e?.forms.some((l: { form: string; barcode?: boolean }) => l.form === i.form && l.barcode)) await L.validateRoundTrip(c.id, i.form!, i.subject);
    if (i.signature === "HAND_SCANNED") await L.signByHand(c.id, i.id, i.form!, i.subject);
  }
  await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed (Sample)", facts_hash: L.readinessOf(await view(), fid)?.facts_hash }, f.rep ?? "");
  const warns = L.readinessOf(await view(), fid)?.warns ?? [];
  for (const l of warns) await call("POST", `/runtime/filings/${fid}/warnings/${l.code}/pass`, { reason: "Passed for the walk (Sample)", key: l.key }, officer);
  const after = L.readinessOf(await view(), fid);
  console.log(`CASE ${c.id} FILING ${fid} OFFICER ${officer} warnings_before ${warns.length} open_after ${(after?.warns ?? []).length} blocks_after ${(after?.blocks ?? []).length}`);
});
