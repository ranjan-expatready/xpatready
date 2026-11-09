// qa: setup for the C7.7 screen walk (not under test): one family case with no answers, one with every fact answered and confirmed by the pack helper.
const L = await import(process.env.LIB!);
await L.main("walk setup", "two family cases", async () => {
  const vv = L.needVisitorVisa();
  const a = await L.openCase(vv, L.FAMILY);
  const b = await L.openCase(vv, L.FAMILY);
  const filled = await L.fillEverything(b.id);
  console.log("CASE-FRESH " + JSON.stringify({ id: a.id, officer: a.officer, subjects: a.subjects }));
  console.log("CASE-FILLED " + JSON.stringify({ id: b.id, officer: b.officer, filled, subjects: b.subjects }));
  L.ok("two cases", !!a.id && !!b.id, null);
});
