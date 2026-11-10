// Setup for qa's gate A walk (not under test): the release that carries the flag qa set by screens, then two cases.
// A = every fact answered and confirmed; B = one person, the client typed the passport number, no staff check. US$0.
const L = await import(process.env.LIB!);
const { call, main, sql, AUTHOR, REVIEWER, APPROVER, CLIENT, FAMILY, yearsAgo } = L;
await main("walk setup (qa)", "release, then two cases", async () => {
  const vv = L.needVisitorVisa();
  const s = await call("POST", `/combinations/${vv}/submit`, { note: "qa walk: must verify" }, AUTHOR);
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
  const a = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  console.log("RELEASE", s.status, a.status, JSON.stringify(a.body?.version ?? a.body).slice(0, 300));
  const A = await L.openCase(vv, FAMILY); const filled = await L.fillEverything(A.id);
  console.log("CASE A", A.id, "filled", filled, "officer", A.officer);
  const B = await L.openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
  const P = B.subjects["Sample Client A"];
  const r = await call("PUT", `/runtime/cases/${B.id}/answers/${P}/person.passport_number`, { value: "AB1234567", expectedId: null }, CLIENT);
  console.log("CASE B", B.id, "client answer", r.status, "officer", B.officer);
});
