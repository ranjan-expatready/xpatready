// qa: setup for a screen walk (not under test): a Visitor visa family case, every fact answered and confirmed by the pack helper.
const L = await import(process.env.LIB!);
await L.main("walk setup", "family case, filled", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, L.FAMILY);
  const filled = await L.fillEverything(c.id);
  const p = (await L.prepare(c.id, c.officer || L.OFFICER)).p;
  console.log("CASE " + JSON.stringify({ id: c.id, filled, subjects: c.subjects }));
  const P = c.subjects["Sample Client A"]; const r = L.readinessOf(p, L.filingOf(p, P)?.id);
  console.log("READINESS " + JSON.stringify({ ready: r?.ready, blocks: r?.blocks?.map((b: any) => b.code + ":" + (b.words ?? "").slice(0, 80)), warns: r?.warns?.filter((w: any) => w.severity === "critical").map((w: any) => w.code + ":" + (w.words ?? "").slice(0, 90)) }).slice(0, 2500));
  L.ok("case opened and filled", !!c.id, null);
});
