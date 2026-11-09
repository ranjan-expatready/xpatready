// Setup for qa's C9.2 gate A walk (not under test): a filled family case, IMM 5476 signed by hand and scanned for each adult. US$0.
const L = await import(process.env.LIB!);
const { main, OFFICER } = L;
await main("walk C9.2 (qa)", "signed items", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, L.FAMILY); await L.fillEverything(c.id);
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
  const p = (await L.prepare(c.id, c.officer ?? OFFICER)).p;
  for (const [n, who] of [["A", P], ["S", S]] as const) {
    const i = L.itemsOf(p, who, "IMM 5476")[0];
    console.log("SIGN", n, await L.signByHand(c.id, i?.id, "IMM 5476", who));
  }
  const q = (await L.prepare(c.id, c.officer ?? OFFICER)).p;
  console.log("STATES", JSON.stringify([P, S].map((w) => L.itemsOf(q, w, "IMM 5476")[0]?.state)));
  console.log("CASE", c.id, JSON.stringify(c.subjects).slice(0, 120));
});
