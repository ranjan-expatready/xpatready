// qa probe (Lead 34, 8 Nov): C6.9-18 as the pack runs it (officer answers, Confirm every section), then the client
// re-confirms the officer-recorded background answer (C6.18, P-244): does the "rests on unconfirmed" line go? US$0.
// Args: <port> <db>; env LIB, RESTING (path to web/src/runtime/eligibility-unconfirmed.ts).
const L = await import(process.env.LIB!);
const { restingOn } = await import(process.env.RESTING!);
const { call, ok, main, OFFICER, CLIENT, yearsAgo, openCase, answer, agent, confirmAll } = L;
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
await main("C6.9-18 re-confirm probe", "officer answers + Confirm section, then the client re-confirms", async () => {
  const vv = L.needVisitorVisa();
  const c2 = await openCase(vv, [{ role: "principal", name: "Sample Client B124", dob: yearsAgo(40) }]);
  const P2 = c2.subjects["Sample Client B124"];
  for (const [f, val] of [["person.passport_number", "SAMPLEP24"], ["person.passport_expiry_date", inDays(3 * 365)], ["person.criminal_history", false]] as const) await answer(c2.id, P2, f, val);
  await call("POST", `/runtime/cases/${c2.id}/assessments`, { person: P2 }, OFFICER);
  const vvResult = (a: { results?: { programKey: string }[] } | undefined) => a?.results?.find((x) => x.programKey === "vv.single") ?? (a as unknown as { result?: unknown })?.result;
  const now2 = async () => { const a = ((await call("GET", `/runtime/cases/${c2.id}/assessments?person=${P2}`, undefined, OFFICER)).body?.assessments ?? [])[0]; return (L.vvResult ?? vvResult)(a); };
  let r2 = await now2();
  console.log("BEFORE " + JSON.stringify({ outcome: r2?.outcome, resting: restingOn(r2) }));
  await confirmAll(c2.id, P2);
  r2 = await now2();
  console.log("AFTER-CONFIRM-ALL " + JSON.stringify({ outcome: r2?.outcome, resting: restingOn(r2) }));
  ok("as the pack: after Confirm section on every section, criminal_history still rests (it waits for the client, P-244)", restingOn(r2).length === 1 && restingOn(r2)[0] === "person.criminal_history", restingOn(r2));
  const q = (await agent(c2.id))?.sections?.flatMap((s: { questions: { fact: string; subjectId: string; answer?: { id: string; awaits_client?: boolean } | null }[] }) => s.questions).find((x: { fact: string; subjectId: string }) => x.fact === "person.criminal_history" && x.subjectId === P2);
  const rc = await call("POST", `/runtime/cases/${c2.id}/answers/${q?.answer?.id}/reconfirm`, {}, CLIENT);
  console.log("RECONFIRM " + JSON.stringify({ awaits_client: q?.answer?.awaits_client, status: rc.status, body: rc.body }).slice(0, 600));
  r2 = await now2();
  console.log("AFTER-RECONFIRM " + JSON.stringify({ outcome: r2?.outcome, resting: restingOn(r2) }));
  ok("after the client re-confirms it, nothing rests on an unconfirmed answer (-18's own pass, reached the P-244 way)", rc.status < 300 && r2?.outcome === "LIKELY_ELIGIBLE" && restingOn(r2).length === 0, { status: rc.status, outcome: r2?.outcome, resting: restingOn(r2) });
});
