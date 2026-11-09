// qa probe (QA-309 retest, 8 Nov): a family case on release 2, not the single principal the builder's check uses. For every
// person with an Online IMM 5257 item: after fillEverything, what waits, the reason, then every section ticked: is it Done?
// US$0, no model call. Args: <port> <db>
const L = await import(process.env.LIB!);
const { call, ok, main, OFFICER } = L;
await main("QA-309 family probe", "every person's Online IMM 5257: every section ticked, is the item done?", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, L.FAMILY);
  const officer = c.officer || OFFICER;
  const filled = await L.fillEverything(c.id);
  console.log("FILLED " + JSON.stringify(filled).slice(0, 300));
  let p = (await L.prepare(c.id, officer)).p;
  for (const [name, sid] of Object.entries(c.subjects) as [string, string][]) {
    const it = (L.itemsOf(p, sid, "IMM 5257") as { id: string; channel: string; state: string; reason?: string }[])[0];
    console.log("BEFORE " + JSON.stringify({ name, channel: it?.channel, state: it?.state, reason: it?.reason }).slice(0, 700));
    if (it?.channel !== "ONLINE") continue;
    const sheet = (await call("GET", `/runtime/items/${it.id}/answer-sheet`, undefined, officer)).body;
    const secs = (sheet?.sections ?? []) as { key: string; version: string; title: string; waiting: { fact: string; subject: string }[]; answers: unknown[] }[];
    console.log("SECTIONS " + JSON.stringify({ name, n: secs.length, waiting: secs.filter((s) => s.waiting.length).map((s) => ({ s: s.title, n: s.waiting.length, facts: s.waiting.map((w) => w.fact).slice(0, 8) })), answers: secs.map((s) => `${s.title}:${s.answers.length}`) }).slice(0, 1500));
    ok(`${name}: nothing waits once every fact is answered and confirmed`, secs.length > 0 && secs.every((s) => !s.waiting.length));
    const st: number[] = [];
    for (const s of secs) st.push((await call("POST", `/runtime/items/${it.id}/screens/${s.key}/entered`, { version: s.version }, officer)).status);
    ok(`${name}: every section ticked (201)`, st.length > 0 && st.every((x) => x < 300), st);
    p = (await L.prepare(c.id, officer)).p;
    const after = (L.itemsOf(p, sid, "IMM 5257") as { state: string; reason?: string }[])[0];
    console.log("AFTER " + JSON.stringify({ name, state: after?.state, reason: after?.reason }).slice(0, 700));
    ok(`${name}: the item reads Done`, after?.state === "done", after);
  }
});
