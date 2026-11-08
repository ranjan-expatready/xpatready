// qa: open a Visitor visa family case with the pack helper (setup, not under test) and print its id, for a screen read of C6.12-25.
const L = await import(process.env.LIB!);
await L.main("C6.12-25 setup", "open a family case", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, L.FAMILY);
  console.log("CASE " + JSON.stringify({ id: c?.id ?? c?.case?.id ?? c, keys: c && typeof c === "object" ? Object.keys(c) : null }));
  L.ok("case opened", !!c, null);
});
