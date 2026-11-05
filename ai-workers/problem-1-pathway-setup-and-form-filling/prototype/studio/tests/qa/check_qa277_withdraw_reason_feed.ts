// QA-277 (C4.5, C11.9; P-335): withdrawing a lifecycle change or an approved document-supplies change must not put the
// author's typed reason in another firm's activity feed. The reason stays on the configuration change. Live AI off, US$0.
//   zsh studio/tools/isolated.sh qa_reason_feed 4471 start && tsx studio/tests/qa/check_qa277_withdraw_reason_feed.ts 4471 xr_studio_qa_reason_feed
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database>"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 800)}` : ""}`); };
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "content-type": "application/json", "x-actor": actor }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let parsed: unknown = text; try { parsed = JSON.parse(text); } catch { /* plain words */ }
  return { status: r.status, body: parsed };
};
const idOf = (r: { body: unknown }) => (r.body as { id?: string; change?: { id?: string } })?.id ?? (r.body as { change?: { id?: string } })?.change?.id;
const feedHas = (r: { status: number; body: unknown }, marker: string) => r.status === 200 && JSON.stringify(r.body).includes(marker);
const checkFeed = async (label: string, marker: string) => {
  const own = await call("GET", "/activity", undefined, "user-O");
  const other = await call("GET", "/activity", undefined, "user-S");
  const client = await call("GET", "/activity", undefined, "user-P");
  ok(`QA-277 setup: ${label}'s withdrawal is recorded for the configuration firm`, feedHas(own, marker), { status: own.status });
  ok(`QA-277 fail (P-335): ${label}'s typed withdrawal reason is absent from another firm's activity feed`, other.status === 200 && !feedHas(other, marker), { status: other.status, exposed: feedHas(other, marker) });
  ok(`QA-277 fail: a client remains refused the activity feed`, client.status === 403, client.status);
};

const load = await call("POST", "/demo/load");
if (load.status >= 300) { console.error("STOP  the Sample fixture did not load", load.body); process.exit(2); }

// lifecycle.ts:withdrawLifecycle — a form's waiting Retire is withdrawn by its author.
const lifecycleMarker = "QA277-LIFECYCLE-CLIENT-REFERENCE";
const form = sql("select form_key from gov_form_def where retired_at is null and not exists (select 1 from library_change c where c.kind='library_form' and c.key=gov_form_def.form_key and c.status in ('WAITING','RETURNED','APPROVED')) order by form_key limit 1");
if (!form) { console.error("STOP  no library form can start Retire on this fixture"); process.exit(2); }
const retired = await call("POST", `/library/forms/${encodeURIComponent(form)}/retire`, { reason: "QA-277 lifecycle setup" });
const lifecycleId = idOf(retired);
ok("QA-277 setup: a form Retire change waits for a second person", retired.status < 300 && !!lifecycleId, { status: retired.status, body: retired.body });
if (!lifecycleId) process.exit(2);
const lifecycleWithdraw = await call("POST", `/library/changes/${lifecycleId}/withdraw`, { note: lifecycleMarker });
ok("QA-277 setup: the author withdraws that lifecycle change", lifecycleWithdraw.status < 300, { status: lifecycleWithdraw.status, body: lifecycleWithdraw.body });
await checkFeed("lifecycle.ts", lifecycleMarker);

// document-supplies.ts:withdrawApprovedSupplies — an approved facts change is withdrawn before any release carries it.
const documentType = sql("select document_type_key from document_type where status='PUBLISHED' and coalesce(array_length(supplies_facts,1),0) > 0 order by document_type_key limit 1");
if (!documentType) { console.error("STOP  no published document type supplies a fact on this fixture"); process.exit(2); }
const proposed = await call("POST", `/library/document-types/${encodeURIComponent(documentType)}/supplies`, { facts: [], reason: "QA-277 approved supplies withdrawal setup" });
const suppliesId = idOf(proposed);
ok("QA-277 setup: a document-supplies change waits for a second person", proposed.status < 300 && !!suppliesId, { status: proposed.status, body: proposed.body });
if (!suppliesId) process.exit(2);
const approved = await call("POST", `/library/changes/${suppliesId}/approve`, { note: "QA-277 second-person approval" }, "user-B");
ok("QA-277 setup: the second person approves the supplies change", approved.status < 300, { status: approved.status, body: approved.body });
const suppliesMarker = "QA277-SUPPLIES-CLIENT-REFERENCE";
const suppliesWithdraw = await call("POST", `/library/changes/${suppliesId}/withdraw`, { note: suppliesMarker });
ok("QA-277 setup: the author withdraws the approved supplies change", suppliesWithdraw.status < 300, { status: suppliesWithdraw.status, body: suppliesWithdraw.body });
await checkFeed("document-supplies.ts", suppliesMarker);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
