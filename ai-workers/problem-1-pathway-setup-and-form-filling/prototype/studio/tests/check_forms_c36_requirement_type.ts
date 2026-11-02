// C3.6, the part not held (P-149, P-158; finish plan 2 Nov, P-265: the guarded Add itself is held): a document type named
// while adding a requirement is never written by hand. A new name waits as one library proposal on To review ›
// Proposals (202, its id); a second person accepts it (the queue's lander writes the type and its ADD), then the line is
// added with it. A name the library has is reused; a retired one is refused. A passing and a failing case per rule, on an
// isolated copy with Load sample's six. No AI (US$0).
//   zsh studio/tools/isolated.sh forms_c36t 4458 start && tsx studio/tests/check_forms_c36_requirement_type.ts 4458 xr_studio_forms_c36t
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4458), DB = process.argv[3] ?? "xr_studio_forms_c36t";
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${!cond && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? r.body?.title ?? "");

(async () => {
  const load = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }); // Demo › Reset to the six: empty, then Load sample's six
  if (load.status >= 300) throw new Error(`reset to the six: ${JSON.stringify(load.body).slice(0, 200)}`);
  const wp = sql("select id from combination where combination_key like 'wp.%' order by combination_key limit 1");
  const name = "Proof of hotel booking (Sample)";
  const line = { appliesToRoles: "each_applicant", attachMode: "COMBINATION_MANDATORY" };
  const types0 = sql("select count(*) from document_type"), lines0 = sql(`select count(*) from document_requirement where combination_id = '${wp}'`);

  let r = await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeName: name });
  const pid = r.body?.proposalId;
  ok("C3.6 pass: a new document type named while adding a requirement waits as one library proposal (202, its id, in words)", r.status === 202 && !!pid && /waits for a second person/.test(r.body?.message ?? "") && sql(`select count(*) from proposal_item where kind = 'document_type' and status = 'waiting' and payload->>'name' = '${name}'`) === "1", r);
  ok("C3.6 fail: no document type row and no requirement line are written by hand", sql("select count(*) from document_type") === types0 && sql(`select count(*) from document_requirement where combination_id = '${wp}'`) === lines0 && sql("select count(*) from library_change where kind = 'document_type' and label = '" + name + "'") === "0");
  ok("C3.6 pass: the proposal is a rules item on the combination for a second person to check (Check, not Ready), US$0", sql(`select origin || '|' || confidence || '|' || step || '|' || coalesce(combination_id::text, '') from proposal_item where id = '${pid}'`) === `rules|check|requirement_type|${wp}` && sql(`select cost_usd from drafting_job where id = (select run_id from proposal_item where id = '${pid}')`) === "0", sql(`select origin || '|' || confidence || '|' || step from proposal_item where id = '${pid}'`));
  r = await call("POST", `/combinations/${wp}/requirements`, { ...line, newTypeName: name });
  ok("C3.6 fail: the same name again (also by the older newTypeName) is refused while it waits (409), still one proposal", r.status === 409 && /already waiting/.test(words(r)) && sql(`select count(*) from proposal_item where kind = 'document_type' and payload->>'name' = '${name}'`) === "1", [r.status, words(r)]);
  r = await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeName: "Proof of a second thing (Sample)" }, "user-C");
  ok("C3.6 fail: a person without the author duty cannot name one (403), nothing proposed", r.status === 403 && sql("select count(*) from proposal_item where payload->>'name' = 'Proof of a second thing (Sample)'") === "0", [r.status, words(r)]);

  // The second person accepts it on the queue: the type and its ADD are written there; then the line goes in with it.
  r = await call("POST", "/review/proposals/decide", { ids: [pid], action: "accept" }, "user-B");
  const key = r.body?.items?.[0]?.landedAs;
  ok("C3.6 pass: accepted on To review, the type is a draft library item with its ADD waiting, credited to this combination", r.status === 201 && !!key && sql(`select status from document_type where document_type_key = '${key}'`) === "DRAFT" && sql(`select status || '|' || coalesce(combination_id::text, '') from library_change where kind = 'document_type' and key = '${key}'`) === `WAITING|${wp}`, [r.status, words(r), key]);
  r = await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeKey: key });
  ok("C3.6 pass: the line is then added with it (201)", r.status === 201 && sql(`select count(*) from document_requirement where combination_id = '${wp}' and document_type_key = '${key}'`) === "1", [r.status, words(r)]);

  // A name the library has is that type (reused, as before: no proposal); a retired one is refused.
  const p0 = sql("select count(*) from proposal_item where kind = 'document_type'");
  r = await call("POST", `/combinations/${wp}/requirements`, { ...line, appliesToRoles: "principal_applicant", documentTypeName: name });
  ok("C3.6 pass: a name the library has is that type: the line is added at once (201), nothing proposed", r.status === 201 && !!r.body?.lineageKey && sql("select count(*) from proposal_item where kind = 'document_type'") === p0, [r.status, words(r)]);
  const spareName = "Proof of a spare thing (Sample)";
  const spareId = (await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeName: spareName })).body?.proposalId;
  const spareKey = (await call("POST", "/review/proposals/decide", { ids: [spareId], action: "accept" }, "user-B")).body?.items?.[0]?.landedAs;
  sql(`update document_type set status = 'RETIRED' where document_type_key = '${spareKey}'`);
  const p1 = sql("select count(*) from proposal_item where kind = 'document_type'");
  r = await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeName: spareName });
  ok("C3.6 fail: a name that is a retired type is refused (409, in words), nothing proposed", !!spareKey && r.status === 409 && /is retired/.test(words(r)) && sql("select count(*) from proposal_item where kind = 'document_type'") === p1, [r.status, words(r), spareKey]);
  r = await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeKey: "proof_of_nothing_sample" });
  ok("C3.6 fail: a type key the library lacks is still refused (400, in words)", r.status === 400 && /Choose a document type, or name a new one/.test(words(r)), [r.status, words(r)]);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
