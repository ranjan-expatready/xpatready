// C6.16 gate A, setup (not under test; the same steps as tests/check_c616_privacy_browser.cjs): on the checkpoint, a fresh
// Visitor visa case for Client A (user-P) with Partner (38), a child of 19 and a child of 10, dates of birth answered.
//   node walk_c616_setup.mjs <port>   → prints the case id and subject ids as JSON
const port = process.argv[2]; const BASE = `http://127.0.0.1:${port}/api`;
const call = async (m, p, b, actor = "user-O") => { const r = await fetch(BASE + p, { method: m, headers: { "x-actor": actor, "content-type": "application/json" }, body: b === undefined ? undefined : JSON.stringify(b) }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, body: j }; };
const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };
const vv = ((await call("GET", "/runtime/openable")).body ?? []).find((r) => /Visitor visa/.test(r.combination) && r.startable);
if (!vv) { console.error("no Visitor visa release"); process.exit(2); }
const run = Date.now().toString(36);
const c = await call("POST", "/runtime/cases", { combinationId: vv.combination_id, reference: `QA-C616-${run}`, clientActor: "user-P", principal: { displayName: "Sample Client A" } });
const id = c.body?.id;
const add = async (role, displayName) => (await call("POST", `/runtime/cases/${id}/people`, { role, displayName })).body?.subject_id;
const S = await add("spouse_or_partner", "Sample Partner"), C19 = await add("child", "Sample Child 19"), C10 = await add("child", "Sample Child 10");
const P = c.body?.people?.find((x) => x.role === "principal")?.subject_id;
for (const [s, d] of [[P, yearsAgo(40)], [S, yearsAgo(38)], [C19, yearsAgo(19)], [C10, yearsAgo(10)]]) await call("PUT", `/runtime/cases/${id}/answers/${s}/person.date_of_birth`, { value: d, expectedId: null });
console.log(JSON.stringify({ release: vv.combination, case: id, status: c.status, P, S, C19, C10, run }));
