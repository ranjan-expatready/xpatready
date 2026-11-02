// F6 / C4.1 (runtime lane; P-216 answer 1, concept #195 rules R1–R5): a combination's section order is changed with Move up
// and Move down, one move is one draft change of this combination, named on Review, and goes out only in its one release
// (C4.8). The order is the same for every person, never changes another combination or the library, and a move from an
// older order is refused. A pass and a fail per rule, on an isolated copy with the sample loaded. Rules only: no AI (US$0).
//   zsh studio/tools/isolated.sh runtime_c41 4432 start && tsx studio/tests/check_c41_section_order.ts 4432 xr_studio_runtime_c41
import { execFileSync } from "node:child_process";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (C5.4): a release needs every number sourced

const PORT = Number(process.argv[2] ?? 4432), DB = process.argv[3] ?? "xr_studio_runtime_c41";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const KEYS = /\b[a-z]+_[a-z_]+\b/;
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const vv = sql(`select id from combination where combination_key='vv.single'`);
  const order = async (id = wp) => ((await call("GET", `/combinations/${id}/section-order`)).body.order as { key: string; title: string }[]).map((x) => x.key);
  const released = async () => ((await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot.sections as { id: string }[]).map((x) => x.id);
  const draft = async () => (await call("GET", `/combinations/${wp}`)).body.draft;
  const libTitles = () => sql(`select string_agg(section_key || '=' || title, ',' order by section_key) from logical_section`);
  // Visitor visa chooses no section in the sample: give it two, so "another combination is unchanged" proves something.
  const [va, vb] = sql(`select string_agg(section_key, ',') from (select distinct section_key from sqr_section_selection where combination_id='${wp}' order by section_key limit 2) x`).split(",");
  for (const k of [va, vb]) await call("POST", `/combinations/${vv}/sections/${k}`, {});
  const o0 = await order(), vv0 = await order(vv), lib0 = libTitles(), rel0 = await released();
  ok("setup: Visitor visa now chooses two sections of its own", vv0.length === 2, vv0);
  ok("setup: the sample's work permit chose at least three sections and its release asks them in that order", o0.length >= 3 && rel0.join() === o0.join(), o0);
  const [first, second, third] = o0, last = o0[o0.length - 1];

  // ---------------------------------------------------------------- R1 only an author moves a section; it is a draft
  let r = await call("POST", `/combinations/${wp}/sections/${second}/move`, { direction: "up", seen: o0 }, "user-B");
  ok("C4.1 R1 fail: the Approver cannot move a section (403, in words); the order is unchanged", r.status === 403 && !!words(r) && (await order()).join() === o0.join(), `${r.status} ${words(r)}`);
  r = await call("POST", `/combinations/${wp}/sections/${second}/move`, { direction: "up", seen: o0 }, "user-C");
  ok("C4.1 R1 fail: the content reviewer cannot move a section either (403)", r.status === 403, r.status);
  r = await call("POST", `/combinations/${wp}/sections/${second}/move`, { direction: "up", seen: o0 });
  const o1 = await order();
  ok("C4.1 R1 pass: the author's Move up swaps the section with the one above and says its new place", (r.status === 200 || r.status === 201) && o1[0] === second && o1[1] === first && r.body.position === 1 && r.body.of === o0.length, { status: r.status, body: r.body?.position, o1 });
  let d = await draft();
  const line = (d.changes as any[]).find((x) => x.kind === "Section order");
  const title2 = sql(`select title from logical_section where section_key='${second}' order by version desc limit 1`);
  ok("C4.1 R1 pass: the move is one named change of the draft (\"Sections reordered: … now 1st\")", !!line && line.change === "changed" && line.label.includes(`"${title2}" now 1st`) && d.matches_release === false, line ?? d.changes);
  ok("C4.1 R1 fail-guard: the Review line is in words, never a system name", !!line && !KEYS.test(line.label), line?.label);
  const audit = sql(`select summary from audit_event where combination_id='${wp}' and entity='section selection' order by at desc limit 1`);
  ok("C4.1 R1: the history line names the section by its title and its new place", audit.includes(`"${title2}"`) && audit.includes("now 1st of") && !audit.includes(second), audit);

  // ---------------------------------------------------------------- R2 a move is checked against the order read
  r = await call("POST", `/combinations/${wp}/sections/${third}/move`, { direction: "up", seen: o0 });
  ok("C4.1 R2 fail: a move from an older order is refused (409, \"reordered since\"); nothing moves", r.status === 409 && /reordered since/.test(words(r)) && (await order()).join() === o1.join(), `${r.status} ${words(r)}`);
  r = await call("POST", `/combinations/${wp}/sections/${third}/move`, { direction: "up" });
  ok("C4.1 R2 fail: a move without the order read is refused (400, in words)", r.status === 400 && /order you were looking at/.test(words(r)), `${r.status} ${words(r)}`);
  r = await call("POST", `/combinations/${wp}/sections/${third}/move`, { direction: "sideways", seen: o1 });
  ok("C4.1 R2 fail: a direction other than up or down is refused (400, in words)", r.status === 400 && /"up" or "down"/.test(words(r)), `${r.status} ${words(r)}`);
  // A list that also names sections not chosen (the screen shows every section a person is asked in) still matches.
  r = await call("POST", `/combinations/${wp}/sections/${third}/move`, { direction: "up", seen: [...o1, "not_chosen_here"] });
  const o2 = await order();
  ok("C4.1 R2 pass: a move from the current order saves", (r.status === 200 || r.status === 201) && o2[1] === third && o2[2] === first, o2);

  // ---------------------------------------------------------------- R3 the ends do not move past themselves
  r = await call("POST", `/combinations/${wp}/sections/${o2[0]}/move`, { direction: "up", seen: o2 });
  ok("C4.1 R3 fail: the first section cannot move up (409, \"already the first\")", r.status === 409 && /already the first section/.test(words(r)) && (await order()).join() === o2.join(), `${r.status} ${words(r)}`);
  r = await call("POST", `/combinations/${wp}/sections/${last}/move`, { direction: "down", seen: o2 });
  ok("C4.1 R3 fail: the last section cannot move down (409, \"already the last\")", r.status === 409 && /already the last section/.test(words(r)), `${r.status} ${words(r)}`);
  const notChosen = sql(`select section_key from logical_section where section_key not in (select section_key from sqr_section_selection where combination_id='${wp}') limit 1`);
  if (notChosen) {
    r = await call("POST", `/combinations/${wp}/sections/${notChosen}/move`, { direction: "up", seen: o2 });
    ok("C4.1 R3 fail: a section this combination did not choose has no place to move (409, in words)", r.status === 409 && /not one this combination chose/.test(words(r)), `${r.status} ${words(r)}`);
  }
  r = await call("POST", `/combinations/${wp}/sections/${o2[o2.length - 2]}/move`, { direction: "down", seen: o2 });
  const o3 = await order();
  ok("C4.1 R3 pass: the section before the last moves down to the end", (r.status === 200 || r.status === 201) && o3[o3.length - 1] === o2[o2.length - 2], o3);

  // ---------------------------------------------------------------- R4 nothing else changes
  ok("C4.1 R4 fail-guard: another combination's order is unchanged (P-132)", (await order(vv)).join() === vv0.join(), await order(vv));
  ok("C4.1 R4 fail-guard: the shared library's sections and titles are unchanged (one title everywhere, P-216 answer 2)", libTitles() === lib0);
  const pv = (await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body;
  const shown = ((pv.questionnaire?.sections ?? []) as { id: string }[]).map((x) => x.id).filter((k) => o3.includes(k));
  ok("C4.1 R4 pass: the questionnaire shows the sections in the new order (the same for every person)", shown.join() === o3.filter((k) => shown.includes(k)).join() && shown.length > 0, shown);
  for (const role of (pv.questionnaire?.roles ?? []).map((x: any) => x.role).slice(1)) {
    const o = (((await call("GET", `/combinations/${wp}/workspace?tab=questionnaires&role=${role}`)).body.questionnaire?.sections ?? []) as { id: string }[]).map((x) => x.id).filter((k) => o3.includes(k));
    ok(`C4.1 R4 pass: ${role} sees the same order`, o.join() === o3.filter((k) => o.includes(k)).join(), o);
  }

  // ---------------------------------------------------------------- R5 the order goes out only in the one release
  ok("C4.1 R5 fail: the released questionnaire keeps the old order until the next release", (await released()).join() === rel0.join(), await released());
  r = await call("POST", `/combinations/${wp}/sections/order/approve`, {}, "user-B");
  ok("C4.1 R5 fail: there is no separate approval for the order (no route)", r.status === 404 || r.status === 400, r.status);
  await sourceEveryNumber(PORT, wp); // G1 (C5.4): the release's numbers need a source before it is submitted
  r = await call("POST", `/combinations/${wp}/submit`, {});
  ok("C4.1 R5 pass: the combination is submitted with its order change", r.status === 201 || r.status === 200, words(r) || r.status);
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const summary = ((review.submission?.changeSummary ?? []) as any[]);
  ok("C4.1 R5: the submitted summary carries the order line", summary.some((x) => x.kind === "Section order"), summary.map((x) => x.kind));
  const sme = summary.filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("C4.1 R5 pass: one release publishes the new order with everything else", r.status === 201 && (await released()).join() === o3.join(), `${r.status} ${words(r)}`);
  d = await draft();
  ok("C4.1 R5 pass: after the release the draft equals it and no order line remains", d.matches_release === true && !(d.changes as any[]).some((x) => x.kind === "Section order"), d.changes);

  // ---------------------------------------------------------------- the same locks as every draft change
  sql(`update combination set retired_at = now() where id='${vv}'`);
  const vvo = await order(vv);
  r = await call("POST", `/combinations/${vv}/sections/${vvo[1]}/move`, { direction: "up", seen: vvo });
  ok("C4.1 fail: a retired combination's sections do not move (409, in words)", r.status === 409 && /is retired/.test(words(r)) && (await order(vv)).join() === vvo.join(), `${r.status} ${words(r)}`);
  sql(`update combination set retired_at = null where id='${vv}'`);
  r = await call("POST", `/combinations/00000000-0000-0000-0000-000000000000/sections/${first}/move`, { direction: "up", seen: [] });
  ok("C4.1 fail: an unknown combination is 404 in words (never a 500)", r.status === 404, `${r.status} ${words(r)}`);
  const anon = await fetch(`http://localhost:${PORT}/api/combinations/${wp}/section-order`).then((x) => x.status);
  ok("C4.1 fail: reading the order needs a configuration person (401 without one)", anon === 401 || anon === 403, anon);

  // ---------------------------------------------------------------- review m1: a section added back takes a place of its own
  const oa = await order(), lastKey = oa[oa.length - 1];
  await call("DELETE", `/combinations/${wp}/sections/${oa[0]}`);
  await call("POST", `/combinations/${wp}/sections/${oa[0]}`, {});
  const places = sql(`select count(*) || '/' || count(distinct section_order) from sqr_section_selection where combination_id='${wp}'`);
  const ob = await order();
  ok("C4.1 m1 pass: a section removed and added back goes last, with a place no other section has", ob[ob.length - 1] === oa[0] && ob[ob.length - 2] === lastKey && places.split("/")[0] === places.split("/")[1], { places, tail: ob.slice(-2) });
  // A tie stored by an older build reads the same in the order, the draft and the screen (key order breaks it).
  sql(`update sqr_section_selection set section_order = 0 where combination_id='${wp}' and section_key in ('${ob[0]}','${ob[1]}')`);
  const tie = await order();
  const shownTie = (((await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body.questionnaire?.sections ?? []) as { id: string }[]).map((x) => x.id).filter((k) => tie.includes(k));
  ok("C4.1 m1 fail-guard: two sections with one place show in the same order on the tab as the move buttons read", shownTie.join() === tie.filter((k) => shownTie.includes(k)).join(), { tie: tie.slice(0, 2), shown: shownTie.slice(0, 2) });

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
