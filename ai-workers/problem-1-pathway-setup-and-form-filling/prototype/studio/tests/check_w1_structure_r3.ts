// W1-visual-system round 3 (P-128; challenge Majors 1–3, Lead 28 Oct): the row's one lifecycle action, against the
// server and the database. Every row's action (GET /structure) agrees with its "where used" (the same rule, nodeCan);
// a branch delete lists every name, deletes exactly those (leaves first, all or nothing) and is refused when the branch
// holds a setup, when a name was added under it after proposing, or when the database refuses one name midway; a
// combination row's Retire and Restore take its combination with it, in one approval and one release; a parent is
// not retired while a name under it is active; the word is Delete on To review. Sample inputs; no model call (US$0).
//   zsh studio/tools/isolated.sh screens_r3 4438 start && tsx studio/tests/check_w1_structure_r3.ts 4438 xr_studio_screens_r3
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4438), DB = process.argv[3] ?? "xr_studio_screens_r3";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const nodes = async (t = "INDIVIDUAL") => (await call("GET", `/structure?pathwayType=${t}&retired=1`)).body.nodes as any[];
const approve = (id: string) => call("POST", `/library/changes/${id}/approve`, {}, "user-B");
const releaseAll = async () => { const d = (await call("GET", "/draft", undefined, "user-B")).body; return call("POST", "/pack/release", { expectedChanges: d.changes }, "user-B"); };
const exists = (k: string) => sql(`select count(*) from program_def where program_node_key='${k}'`) === "1";

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("setup: sample inputs loaded", (await call("POST", "/demo/load")).status === 201);

  // ---------------------------------------------------------------- R3-2: one rule for the row and the proposal
  let all = await nodes();
  const disagree: string[] = [];
  for (const n of all) {
    const u = (await call("GET", `/structure/nodes/${encodeURIComponent(n.key)}/uses`)).body;
    const want = n.action.kind === "DELETE" ? u.can.delete : n.action.kind === "RETIRE" ? u.can.retire : n.action.kind === "RESTORE" ? u.can.restore : null;
    if ((want ?? null) !== (n.action.why ?? null)) disagree.push(`${n.label}: row ${n.action.kind} "${n.action.why}" vs uses "${want}"`);
  }
  ok("C11.9 R3-2: every row's action and reason agree with its 'where used' (one rule, nodeCan)", disagree.length === 0, disagree.slice(0, 3));
  const row = (label: string) => all.find((n) => n.label === label);
  ok("C11.9 R3-2 pass: an unused Program offers Delete with the names that go with it", row("Permanent resident documents")?.action.kind === "DELETE" && !row("Permanent resident documents")?.action.why && row("Permanent resident documents")?.action.below.length === 2, row("Permanent resident documents")?.action);
  ok("C11.9 R3-2 fail: a Program with a setup draft under it offers Delete greyed, naming the name", row("Visitors")?.action.kind === "DELETE" && /under it has a setup draft/.test(row("Visitors")?.action.why ?? ""), row("Visitors")?.action.why);
  ok("C11.9 R3-2 fail: a combination row with a setup draft: Delete greyed ('Its setup draft uses it')", row("Visitor visa")?.action.why === "Its setup draft uses it.", row("Visitor visa")?.action);
  ok("C11.9 Lead 28 Oct (1) pass: a Live combination row offers Retire, its combination going with it", row("With an LMIA")?.action.kind === "RETIRE" && !row("With an LMIA")?.action.why && row("With an LMIA")?.action.withCombination === true, row("With an LMIA")?.action);
  ok("C11.9 L3 fail: the category above a Live line offers Retire greyed while that line is active", row("Employer-specific work permit")?.action.kind === "RETIRE" && /Still used/.test(row("Employer-specific work permit")?.action.why ?? ""), row("Employer-specific work permit")?.action.why);

  // ---------------------------------------------------------------- R3-4: branch delete, exact and all or nothing
  const prd = row("Permanent resident documents")!.key, card = row("PR card renewal")!.key, travel = row("Travel document")!.key;
  let r = await call("DELETE", `/structure/nodes/${prd}`, { reason: "Not offered (Sample)" });
  const del = r.body;
  ok("C11.9 R3-4: deleting an unused Program is one proposal that lists its branch (3 names), nothing deleted yet", r.status === 200 && del.status === "WAITING" && sql(`select matches::text from library_change where id='${del.id}'`).includes(card) && exists(prd) && exists(card), sql(`select matches::text from library_change where id='${del.id}'`));
  const detail = (await call("GET", `/library/changes/${del.id}`, undefined, "user-B")).body;
  ok("C11.9 R3-4: the approver sees what goes with it, and the word is Delete", detail.action_word === "Delete" && detail.goes_with?.join("|") === "PR card renewal|Travel document", { word: detail.action_word, goes: detail.goes_with });
  const queue = (await call("GET", "/review-queue?filter=needs", undefined, "user-B")).body;
  ok("C11.9 QA-46 words: To review says 'Delete the structure name'", JSON.stringify(queue).includes("Delete the structure name"), JSON.stringify(queue).match(/"what":"[^"]*structure name[^"]*"/)?.[0]);
  all = await nodes();
  ok("C11.9 R3-2: while it waits, the row offers Withdraw", all.find((n) => n.key === prd)?.action.kind === "WITHDRAW", all.find((n) => n.key === prd)?.action);
  r = await approve(del.id);
  ok("C11.9 R3-4 pass: approved, the Program and both categories are deleted at once; Activity names the count", r.status === 201 && !exists(prd) && !exists(card) && !exists(travel) && sql(`select count(*) from audit_event where summary like '%approved deleting%and the 2 names under it%'`) === "1", r.body?.status);

  const eco = row("Economic immigration")!.key;
  r = await call("DELETE", `/structure/nodes/${eco}`, { reason: "Not offered (Sample)" });
  const late = r.body;
  await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: row("Permanent residence")!.key }, program: { key: eco }, category: { label: "Start-up visa" }, subCategory: null });
  r = await approve(late.id);
  ok("C11.9 R3-4 fail: a name added under the branch after proposing makes approval refuse; nothing is deleted", r.status === 409 && /Changed since it was proposed: "Start-up visa"/.test(r.body.detail) && exists(eco), r.body.detail);
  await call("POST", `/library/changes/${late.id}/withdraw`, { note: "Start-up visa was added." });

  const fam = row("Family sponsorship")!.key, child = row("Dependent child")!.key;
  r = await call("DELETE", `/structure/nodes/${fam}`, { reason: "Not offered (Sample)" });
  ok("C11.9 R3-4 fail: a branch with a setup draft (Applicant outside Canada) is refused at proposal", r.status === 409 && /under it has a setup draft/.test(r.body.detail) && exists(fam), r.body.detail);
  r = await call("DELETE", `/structure/nodes/${child}`, { reason: "Not offered (Sample)" });
  const one = r.body;
  sql("create or replace function xr_test_refuse_delete() returns trigger as $f$ begin if old.label = 'Dependent child' then raise exception 'test trigger: refused'; end if; return old; end $f$ language plpgsql");
  sql("create trigger xr_test_refuse_delete before delete on program_def for each row execute function xr_test_refuse_delete()");
  r = await approve(one.id);
  const stillWaiting = sql(`select status from library_change where id='${one.id}'`);
  sql("drop trigger xr_test_refuse_delete on program_def"); sql("drop function xr_test_refuse_delete()");
  ok("C11.9 R3-4 fail (all or nothing): the database refuses the delete midway; the name stays and the change waits again (409, plain words)", r.status === 409 && /Nothing was deleted/.test(r.body?.detail ?? r.body?.message ?? "") && exists(child) && stillWaiting === "WAITING", { status: r.status, change: stillWaiting });

  // ---------------------------------------------------------------- Lead 28 Oct (1): a combination row's Retire and Restore
  const lmia = row("With an LMIA")!, esw = row("Employer-specific work permit")!;
  r = await call("POST", `/structure/nodes/${esw.key}/retire`, { reason: "Not offered (Sample)" });
  ok("C11.9 L3 fail: the category is refused while With an LMIA under it is active", r.status === 409 && /Still used/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/structure/nodes/${lmia.key}/retire`, { reason: "No longer offered (Sample)" });
  const ret = r.body;
  const retDetail = (await call("GET", `/library/changes/${ret.id}`, undefined, "user-B")).body;
  ok("C11.9 Lead (1): retiring a Live row is one proposal that names its combination; the approver is told", r.status === 201 && retDetail.with_combination === true, retDetail.with_combination);
  await approve(ret.id);
  ok("C11.9 Lead (1): approved, nothing is retired before the release", sql(`select retired_at is null from program_def where program_node_key='${lmia.key}'`) === "t" && sql(`select retired_at is null from combination where id='${lmia.combination.id}'`) === "t");
  r = await releaseAll();
  ok("C11.9 Lead (1) pass: the release retires the name and its combination together", r.status === 201 && sql(`select retired_at is not null from program_def where program_node_key='${lmia.key}'`) === "t" && sql(`select retired_at is not null from combination where id='${lmia.combination.id}'`) === "t", r.status);
  all = await nodes();
  ok("C11.9 Lead (1): the retired row offers Restore, its combination going with it", all.find((n) => n.key === lmia.key)?.action.kind === "RESTORE" && all.find((n) => n.key === lmia.key)?.action.withCombination === true, all.find((n) => n.key === lmia.key)?.action);
  r = await call("POST", `/structure/nodes/${lmia.key}/restore`, { reason: "Offered again (Sample)" });
  await approve(r.body.id); await releaseAll();
  ok("C11.9 Lead (1) pass: Restore brings both back with the next release", sql(`select retired_at is null from program_def where program_node_key='${lmia.key}'`) === "t" && sql(`select retired_at is null from combination where id='${lmia.combination.id}'`) === "t");

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
