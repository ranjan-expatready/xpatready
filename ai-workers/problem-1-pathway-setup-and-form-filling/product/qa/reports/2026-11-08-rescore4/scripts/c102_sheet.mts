// qa probe (Lead 34, item 1 from #1330): on release 2 the principal's IMM 5257 is filed Online; after fillEverything and
// every answer-sheet section ticked "entered", is the item Done? If not, which lines keep it open. US$0. Args: <port> <db>
const L = await import(process.env.LIB!);
const { call, ok, main, OFFICER, yearsAgo } = L;
await main("C10.2 / C7.3 sheet probe", "Online IMM 5257: every section ticked, is the item done?", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client A"], officer = c.officer || OFFICER;
  const filled = await L.fillEverything(c.id);
  let p = (await L.prepare(c.id, officer)).p;
  const it = (L.itemsOf(p, P, "IMM 5257") as { id: string; channel: string; state: string; reason?: string }[])[0];
  console.log("ITEM " + JSON.stringify({ filled, channel: it?.channel, state: it?.state, reason: it?.reason }));
  ok("setup: the principal's IMM 5257 is an Online item", it?.channel === "ONLINE", it);
  let sheet = (await call("GET", `/runtime/items/${it?.id}/answer-sheet`, undefined, officer)).body;
  const secs = (sheet?.sections ?? []) as { key: string; version: number; title?: string; entered?: boolean; lines?: { label?: string; value?: unknown; state?: string; fact?: string; why?: string }[] }[];
  console.log("SECTIONS " + secs.length + " " + JSON.stringify(secs.map((s) => s.title ?? s.key)));
  const statuses: number[] = [];
  for (const s of secs) {
    const r = await call("POST", `/runtime/items/${it?.id}/screens/${s.key}/entered`, { version: s.version }, officer);
    statuses.push(r.status); if (r.status >= 300) console.log("TICK-REFUSED " + JSON.stringify({ section: s.title ?? s.key, status: r.status, body: r.body }).slice(0, 600));
  }
  ok("every section is ticked entered (2xx each)", statuses.length > 0 && statuses.every((x) => x < 300), statuses);
  p = (await L.prepare(c.id, officer)).p;
  const after = (L.itemsOf(p, P, "IMM 5257") as { id: string; state: string; reason?: string }[])[0];
  sheet = (await call("GET", `/runtime/items/${it?.id}/answer-sheet`, undefined, officer)).body;
  console.log("AFTER " + JSON.stringify({ state: after?.state, reason: after?.reason, sheetKeys: Object.keys(sheet ?? {}) }).slice(0, 900));
  const open = ((sheet?.sections ?? []) as typeof secs).flatMap((s) => (s.lines ?? []).filter((l) => !(l.value !== undefined && l.value !== null && l.value !== "") || (l.state && !/done|entered|ok|ready|written/i.test(l.state))).map((l) => ({ section: s.title ?? s.key, label: l.label, fact: l.fact, state: l.state, why: l.why })));
  console.log("OPEN-LINES " + open.length + " " + JSON.stringify(open).slice(0, 3000));
  console.log("WAITING " + JSON.stringify(((sheet?.sections ?? []) as { title?: string; key: string; waiting?: unknown[]; entered?: unknown; out_of_date?: boolean }[]).map((s) => ({ section: s.title ?? s.key, entered: !!s.entered, out_of_date: s.out_of_date, waiting: s.waiting }))).slice(0, 4000));
  ok("the item is Done once every section is ticked", /done|entered|ready/i.test(after?.state ?? ""), after);
});
