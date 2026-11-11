// BK-10 (Lead 11 on #1518, option (a)): applying a field-map draft takes the form's title from its own record in the Form
// library (displayName), never from a list in code (api/src/sources.ts had TITLES, gone with B164's 8 entries). A form
// new to the library takes the title a person gives; with none, applying is refused with words and nothing is written.
// Through the API on an isolated copy, sample inputs, saved AI answers replayed (no model call, US$0). The sample holds
// no draft whose form is new to the library, so one form's library record is renamed in the database to make it new
// (test scaffolding, P-33).
//   zsh studio/tools/isolated.sh bk10_titles 4482 start && tsx studio/tests/check_bk10_form_titles.ts 4482 xr_studio_bk10_titles
import { execFileSync } from "node:child_process";
import { acceptCleanOneByOne } from "./lib/accept-draft.ts";

const PORT = Number(process.argv[2] ?? 4482), DB = process.argv[3] ?? "xr_studio_bk10_titles";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  BK-10: ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const until = async (fn: () => Promise<boolean>, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 400)); } throw new Error(`timed out after ${ms} ms`); };
const titleOf = (formKey: string) => sql(`select coalesce((select display_name from gov_form_def where form_key='${formKey}'), '(none)')`);

/** The Super visa's saved IMM 5257 answer (the sample's one draft whose form has no field map in the library yet),
 *  replayed on fresh sample inputs and decided as the AI recommends, ready to apply. */
async function decidedDraft(): Promise<string> {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load")).status !== 201) throw new Error("the sample inputs did not load");
  const cid = sql("select id from combination where combination_key='sv.super_visa' limit 1");
  const att = ((await call("GET", `/combinations/${cid}/attachments`)).body as { id: string; edition?: string }[]).find((a) => /^IMM 5257 \(/.test(a.edition ?? ""));
  if (!att) throw new Error("no IMM 5257 on the Super visa");
  const r = await call("POST", `/attachments/${att.id}/draft`, { mode: "replay" });
  const jobId = r.body?.id;
  if (!jobId) throw new Error(`the saved answer was not replayed: ${JSON.stringify(r.body).slice(0, 200)}`);
  await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED");
  await acceptCleanOneByOne(call, jobId, ["REUSE", "NEW"]);
  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING"))
    await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: "Test: accepted as proposed.", reason: "Test: a different meaning from the library field that could fit." });
  return jobId;
}
const defs = () => Number(sql("select count(*) from gov_form_def"));
const said = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");

(async () => {
  // Pass: a form the library holds keeps the title on its record, with no title given and with one given.
  let job = await decidedDraft();
  const stored = titleOf("IMM 5257");
  let r = await call("POST", `/jobs/${job}/apply`, {});
  ok("pass: a form the library holds applies with no title given, and keeps the title on its record", r.status === 201 && stored !== "(none)" && titleOf("IMM 5257") === stored, { status: r.status, said: said(r), stored });
  job = await decidedDraft();
  r = await call("POST", `/jobs/${job}/apply`, { title: "Another title (test)" });
  ok("pass: a title given for a form the library holds does not replace the title on its record", r.status === 201 && titleOf("IMM 5257") === stored, { status: r.status, said: said(r), now: titleOf("IMM 5257") });

  // A form new to the library: IMM 5257's record is renamed, so the draft applies a form the library lacks.
  job = await decidedDraft();
  sql("update gov_form_def set form_key='IMM 5257 (moved aside by the BK-10 test)' where form_key='IMM 5257'");
  const before = defs();
  r = await call("POST", `/jobs/${job}/apply`, {});
  ok("fail: a form new to the library with no title is refused (422), in words that ask for the title", r.status === 422 && /IMM 5257 is not in the Form library yet/.test(said(r)) && /Give the form's title/.test(said(r)), r.body);
  ok("fail: the refusal writes nothing: no library form is made and the draft still waits to be applied", defs() === before && titleOf("IMM 5257") === "(none)" && (await call("GET", `/jobs/${job}`)).body?.status === "COMPLETED");
  r = await call("POST", `/jobs/${job}/apply`, { title: "   " });
  ok("fail: a blank title is no title (422)", r.status === 422 && titleOf("IMM 5257") === "(none)", r.body);

  // Pass: with a title, the new library form takes it.
  r = await call("POST", `/jobs/${job}/apply`, { title: "  Application for Visitor Visa (title given by a person, test)  " });
  ok("pass: a form new to the library takes the title the person gives (trimmed)", r.status === 201 && titleOf("IMM 5257") === "Application for Visitor Visa (title given by a person, test)" && defs() === before + 1, { status: r.status, said: said(r), title: titleOf("IMM 5257") });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`\n${pass} passed, ${fail + 1} failed`); process.exit(1); });
