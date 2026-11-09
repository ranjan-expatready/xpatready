// Setup for qa's gate A walks (not under test): one Visitor visa family case on the configured checkpoint. US$0.
const L = await import(process.env.LIB!);
await L.main("walk case (qa)", "one family case", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, L.FAMILY);
  if (process.env.FILL) console.log("filled", await L.fillEverything(c.id));
  console.log("CASE", c.id, "officer", c.officer, JSON.stringify(c.subjects));
});
