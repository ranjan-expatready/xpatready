// Setup for qa's gate A walk (not under test; the same steps as C7.10-screen's own): one person, everything but one warning passed. US$0.
const L = await import(process.env.LIB!);
const { call, main, firms, yearsAgo } = L;
await main("walk ready (qa)", "one filing, one warning left", async () => {
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
  for (const l of warns.slice(1)) await call("POST", `/runtime/filings/${fid}/warnings/${l.code}/pass`, { reason: "Passed for the walk (Sample)", key: l.key }, officer);
  console.log("CASE W", c.id, "filing", fid, "warnings before", warns.length, "first left:", String(warns[0]?.words).slice(0, 140));
});
