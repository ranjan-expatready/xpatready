// C3.13 (screens lane, swarm builder J5; Screen 04 BR-4, P-37): with a combination chosen, each library item it uses is
// "Reused" (another combination brought it into the library first) or "New here", with the totals; the combinations
// to choose from carry how many items each uses. A passing and a failing case per rule, through the API on an isolated
// copy with the sample inputs loaded (the demo is never touched). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh screens_reuse 4447 start && tsx studio/tests/check_c313_reuse.ts 4447 xr_studio_screens_reuse
const PORT = Number(process.argv[2] ?? 4447);
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
type Item = { in_combination: "REUSED" | "NEW"; brought_in_by: string };

(async () => {
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);

  // ─────────────────── The combinations to choose from
  let r = await call("GET", "/library/reuse/sections");
  const lmia = r.body.combinations?.find((c: { key: string }) => c.key === "wp.family"), vv = r.body.combinations?.find((c: { key: string }) => c.key === "vv.single");
  const sections = (await call("GET", "/library/sections")).body as { key: string; title: string; used_in: string[] }[];
  ok("C3.13 pass: without a combination, every combination is offered with how many items it uses (no reuse figures yet)", r.status === 200 && r.body.combination === null && r.body.combinations.length >= 6 && lmia?.uses === sections.filter((s) => s.used_in.includes(lmia.label)).length && lmia.uses > 0 && r.body.total === undefined, r.body.combinations);
  ok("C3.13 fail: a combination that uses nothing yet says 0, and is still offered", vv?.uses === 0, vv);

  // ─────────────────── BR-4: reused vs new, with totals
  r = await call("GET", "/library/reuse/sections?combination=wp.family");
  const items = r.body.items as Record<string, Item>;
  ok("C3.13 BR-4 pass: with a combination chosen, the totals add up (total = reused + new) and match where used", r.status === 200 && r.body.combination?.key === "wp.family" && r.body.total === r.body.reused + r.body.new && r.body.total === sections.filter((s) => s.used_in.includes("With an LMIA")).length, [r.body.total, r.body.reused, r.body.new]);
  ok("C3.13 BR-4 pass: the only combination set up brought every item it uses into the library (all New here)", r.body.new === r.body.total && Object.values(items).every((x) => x.in_combination === "NEW" && x.brought_in_by === "With an LMIA"), r.body);
  ok("C3.13 BR-4 fail: an item the combination does not use is not counted or marked", sections.filter((s) => !s.used_in.includes("With an LMIA")).every((s) => !(s.key in items)));
  const byId = await call("GET", `/library/reuse/sections?combination=${lmia.id}`);
  ok("C3.13 pass: the combination may be named by its id or its key (same answer)", byId.status === 200 && byId.body.total === r.body.total);

  // A second combination picks one of those sections: there it is Reused (brought in by the first), the first keeps it New.
  const s0 = sections.find((s) => s.used_in.includes("With an LMIA"))!;
  const picked = await call("POST", `/combinations/${vv.id}/sections/${s0.key}`, {});
  ok("setup: Visitor visa picks one section the LMIA combination already uses", picked.status === 201, picked.body);
  const vvR = await call("GET", "/library/reuse/sections?combination=vv.single");
  ok("C3.13 BR-4 pass: in the second combination that section is Reused, brought in by the first (created later, set up first)", vvR.body.total === 1 && vvR.body.reused === 1 && vvR.body.new === 0 && vvR.body.items[s0.key]?.in_combination === "REUSED" && vvR.body.items[s0.key]?.brought_in_by === "With an LMIA", vvR.body);
  const again = await call("GET", "/library/reuse/sections?combination=wp.family");
  ok("C3.13 BR-4 fail: the first combination does not become 'Reused' because another one picked the item later", again.body.items[s0.key]?.in_combination === "NEW" && again.body.new === r.body.new, again.body.items[s0.key]);
  const vvFields = await call("GET", "/library/reuse/fields?combination=vv.single");
  ok("C3.13 BR-4 pass: the fields that section asks are Reused in the second combination too (fields list)", vvFields.status === 200 && vvFields.body.total > 0 && vvFields.body.reused === vvFields.body.total, [vvFields.body.total, vvFields.body.reused]);
  const docs = await call("GET", "/library/reuse/document-types?combination=wp.family");
  ok("C3.13 pass: document types have the same totals (the combination's checklist types, all New here)", docs.status === 200 && docs.body.total > 0 && docs.body.total === docs.body.new, [docs.body.total, docs.body.new]);
  await call("DELETE", `/combinations/${vv.id}/sections/${s0.key}`);
  const gone = await call("GET", "/library/reuse/sections?combination=vv.single");
  ok("C3.13 fail: once the section is taken off again, the second combination uses nothing (0 · 0 reused · 0 new)", gone.body.total === 0 && gone.body.reused === 0 && gone.body.new === 0, gone.body);

  // ─────────────────── Refusals, in words
  const [unknown, kind, nobody] = await Promise.all([call("GET", "/library/reuse/fields?combination=no.such"), call("GET", "/library/reuse/forms?combination=wp.family"), call("GET", "/library/reuse/fields", undefined, null)]);
  ok("C3.13 fail: an unknown combination is 404 in words; an unknown list is 404 naming the lists", unknown.status === 404 && /not in this workspace/.test(unknown.body.detail) && kind.status === 404 && /fields, sections, document-types/.test(kind.body.detail), [unknown.body.detail, kind.body.detail]);
  ok("C3.13 fail: a request naming no person is 401 (QA-65)", nobody.status === 401, nobody.status);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
