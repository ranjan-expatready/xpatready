// qa probe (Lead 34, 8 Nov): C6.9-18 red on main f18fb0e66 — after confirmAll, person.criminal_history still "unconfirmed".
// Replays -16..-18's setup and prints each section's Confirm response and the criminal_history question. US$0. Args: <port> <db>
const L = await import(process.env.LIB!);
const { call, ok, main, OFFICER, yearsAgo, openCase, answer, agent } = L;
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
await main("C6.9-18 probe", "which section keeps criminal_history unconfirmed", async () => {
  const vv = L.needVisitorVisa();
  const c2 = await openCase(vv, [{ role: "principal", name: "Sample Client B124", dob: yearsAgo(40) }]);
  const P2 = c2.subjects["Sample Client B124"];
  for (const [f, val] of [["person.passport_number", "SAMPLEP24"], ["person.passport_expiry_date", inDays(3 * 365)], ["person.criminal_history", false]] as const) {
    const r = await answer(c2.id, P2, f, val); console.log("ANSWER " + f + " " + r.status + " " + JSON.stringify(r.body).slice(0, 300));
  }
  const v = await agent(c2.id);
  type Q = { fact: string; answer?: { id: string; value: unknown; channel?: string; status?: string; confirmation?: unknown } | null; rows: { answer?: { id: string } | null }[]; required?: boolean; visible?: boolean };
  type S = { subjectId: string; section: string; title?: string; group?: { none_apply?: { id: string } | null } | null; questions: Q[]; problems?: unknown; confirmed?: unknown };
  for (const s of ((v?.sections ?? []) as S[]).filter((x) => x.subjectId === P2)) {
    const ch = s.questions.find((q) => q.fact === "person.criminal_history");
    const seen = [...s.questions.flatMap((q) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter(Boolean);
    if (ch) console.log("CH-SECTION-BEFORE " + JSON.stringify({ section: s.section, title: s.title, nq: s.questions.length, seen: seen.length, ch }).slice(0, 1500));
    if (seen.length) {
      const r = await call("POST", `/runtime/cases/${c2.id}/sections/${s.section}/confirm`, { subjectId: P2, seen }, OFFICER);
      console.log("CONFIRM " + JSON.stringify({ section: s.section, title: s.title, seen: seen.length, status: r.status, body: r.body }).slice(0, 800));
    } else console.log("SKIP (nothing seen) " + s.section + (ch ? " <- holds criminal_history" : ""));
  }
  const v2 = await agent(c2.id);
  for (const s of ((v2?.sections ?? []) as S[]).filter((x) => x.subjectId === P2)) {
    const ch = s.questions.find((q) => q.fact === "person.criminal_history");
    if (ch) console.log("CH-SECTION-AFTER " + JSON.stringify({ section: s.section, ch }).slice(0, 1500));
  }
  const as = (await call("GET", `/runtime/cases/${c2.id}/assessments?person=${P2}`, undefined, OFFICER)).body;
  console.log("ASSESS " + JSON.stringify(as).slice(0, 2500));
  ok("probe ran", true);
});
