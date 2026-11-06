// QA-263 (qa's gate A on #1068; tech lead's ruling, Lead 14, P-294): a typed withdraw reason never reaches another firm
// through GET /activity. The C4.11 stack writes two new configuration lines when a new shared field is withdrawn: the field's
// own ("shared field") and, when an open change of a document's facts named it, the document's ("document type"). A
// configuration line names no case, so every firm's staff read it (case-feed.ts firmMayRead): the person's own words stay
// on the change (its note, read on To review), and the lines say only what happened. Pass and fail by route, as that firm's
// staff, as another firm's staff and as a client. US$0, live AI off. It writes SQL on its own copy only to give the document
// facts a change can name (as check_b83_undo_withdraw does); the withdrawal and the reads go through the routes.
//   zsh studio/tools/isolated.sh forms_qa263 4456 start && tsx studio/tests/check_forms_b88_qa263.ts 4456 xr_studio_forms_qa263
// A 4th argument "loaded" skips the configured checkpoint's load, for a copy that holds a fresh one.
import { execFileSync } from "node:child_process";
import { request } from "node:http";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_qa263", LOADED = process.argv[4] === "loaded";
const PSQL = process.env.PSQL || "/opt/homebrew/opt/postgresql@18/bin/psql", URL_DB = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
const AUTHOR = "user-A", APPROVER = "user-B", FIRM = "user-R", OTHER_FIRM = "user-S", CLIENT = "user-P";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C4.11 QA-263 ${name}${detail !== undefined && !c ? ` — ${JSON.stringify(detail).slice(0, 600)}` : ""}`); };
const sql = (q: string) => execFileSync(PSQL, [URL_DB, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const call = (method: string, path: string, body?: unknown, actor: string | null = AUTHOR) => new Promise<{ status: number; body: any }>((done, failed) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "localhost", port: PORT, path: `/api${path}`, method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b: any = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", failed); if (data) rq.write(data); rq.end();
});

const USCARD = "form1[0].Page2[0].USCard[0].q1[0].usCardIndicator[0]", NATID = "form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]";
// A typed reason as qa's table had it: a client's name and a file reference (Sample words, no real person).
const MARK = "QA263-MARK", WHY = (n: number) => `Client A asked for it on file QA-FILL-${n} (${MARK}-${n}).`;

(async () => {
  if (!LOADED) {
    await call("POST", "/demo/reset", { confirm: "RESET" });
    const l = await call("POST", "/demo/load", { sample: "configured" });
    if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  }
  const ed = sql("select e.id from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = 'IMM 5257' and e.channel = 'PDF' order by e.edition_label desc limit 1");
  // The checkpoint asks these Yes/No as their own question already: undone first, as the screen asks.
  const askNew = async (dataPath: string, label: string) => (await call("POST", `/editions/${ed}/form-fields/own-question/undo`, { dataPath }), call("POST", `/editions/${ed}/form-fields/own-question`, { dataPath, reason: "The form asks this Yes/No itself (QA-263 check)", label, meaning: `Whether ${label}: a QA-263 check, Sample.`, nearReason: "It is the form's Yes/No, not a detail (QA-263 check)." }));
  const keyOf = (label: string) => sql(`select canonical_field_key from canonical_field where label = ${lit(label)} limit 1`);
  const changeOf = (key: string) => sql(`select id from library_change where kind = 'field' and action = 'ADD' and key = ${lit(key)} and status in ('WAITING','RETURNED') limit 1`);
  const withdraw = (id: string, note: string) => call("POST", `/library/changes/${id}/withdraw`, { note }, AUTHOR);
  const feed = async (actor: string) => { const r = await call("GET", "/activity", undefined, actor); return { status: r.status, lines: (Array.isArray(r.body) ? r.body : []) as { entity: string; entityKey: string | null; summary: string }[] }; };
  const marked = (lines: { entity: string; summary: string }[], n: number) => lines.filter((e) => e.summary.includes(`${MARK}-${n}`));

  // ---------------------------------------------------------------- 1. the shared field's own line
  let u = await askNew(USCARD, "QA263 withdrawn field");
  const key1 = keyOf("QA263 withdrawn field");
  ok("setup: a new shared field waits for a second person", u.status < 300 && !!changeOf(key1), u);
  const c1 = changeOf(key1);
  u = await withdraw(c1, WHY(1));
  ok("setup: the author withdraws it with a typed reason", u.status < 300, u);
  for (const [who, actor] of [["that firm's staff", FIRM], ["another firm's staff", OTHER_FIRM]] as const) {
    const f = await feed(actor);
    ok(`fail test: ${who} never read the typed reason in the activity feed (the "shared field" line)`, f.status === 200 && marked(f.lines, 1).length === 0, marked(f.lines, 1).map((e) => `${e.entity}: ${e.summary}`));
    ok(`pass: ${who} still read that the field was withdrawn, in words`, f.lines.some((e) => e.entity === "shared field" && e.entityKey === key1 && /withdrew the new field "QA263 withdrawn field"/.test(e.summary)), f.lines.filter((e) => e.entity === "shared field").slice(0, 3));
  }
  ok("pass: a client is refused the activity feed (403)", (await feed(CLIENT)).status === 403);
  ok("pass: the typed reason stays on the change, as its note", sql(`select coalesce(decision_note, '') from library_change where id = '${c1}'`) === WHY(1));
  const own = (await call("GET", "/library/changes?status=WITHDRAWN", undefined, AUTHOR)).body;
  ok("pass: the change, read on To review, still carries the reason", JSON.stringify(own ?? "").includes(`${MARK}-1`), own);

  // ---------------------------------------------------------------- 2. the document's line, when a change of its facts named the field
  const shared = sql(`select dr.document_type_key from document_requirement dr join combination c on c.id = dr.combination_id where c.combination_key = 'sp.outside' and dr.status = 'PUBLISHED' order by 1 limit 1`);
  const today = new Date().toISOString().slice(0, 10);
  const citeOf = (fact: string) => ({ fact, about: "holder", source: "Test words (fixture), page 1", quote: "Test: QA-263 check, Sample", readOn: today });
  const seeded = sql("select canonical_field_key from canonical_field where group_key = 'person' and status = 'PUBLISHED' and value_type not in ('yes_no','boolean') order by 1 limit 2").split("\n");
  sql(`update document_type set supplies_facts = array[${seeded.map(lit).join(", ")}] where document_type_key = ${lit(shared)} and status = 'PUBLISHED'`);
  u = await askNew(NATID, "QA263 supplied field");
  const key2 = keyOf("QA263 supplied field");
  const sup = await call("POST", `/library/document-types/${shared}/supplies`, { facts: [...seeded.map(citeOf), citeOf(key2)], reason: "A QA-263 check of a document's facts." });
  ok("setup: a change of a document's facts names the waiting field", !!shared && u.status < 300 && sup.status < 300, { shared, u: u.status, sup });
  u = await withdraw(changeOf(key2), WHY(2));
  ok("setup: the withdrawal takes the field out of the document's change", u.status < 300 && u.body?.taken_out_of?.length === 1, u.body);
  for (const [who, actor] of [["that firm's staff", FIRM], ["another firm's staff", OTHER_FIRM]] as const) {
    const f = await feed(actor);
    ok(`fail test: ${who} never read the typed reason in the activity feed (the "document type" line, nor the field's)`, f.status === 200 && marked(f.lines, 2).length === 0, marked(f.lines, 2).map((e) => `${e.entity}: ${e.summary}`));
    ok(`pass: ${who} still read that the field was taken out of the document's change`, f.lines.some((e) => e.entity === "document type" && e.entityKey === shared && /was withdrawn by .*It was taken out of/.test(e.summary)), f.lines.filter((e) => e.entity === "document type").slice(0, 3));
  }
  ok("pass: the typed reason stays on the document's change, as its note", sql(`select count(*) from library_change where id = '${sup.body?.id}' and decision_note like '%${MARK}-2%'`) === "1", sql(`select decision_note from library_change where id = '${sup.body?.id}'`));
  ok("pass: and on the field's own change", sql(`select count(*) from library_change where kind = 'field' and key = ${lit(key2)} and decision_note like '%${MARK}-2%'`) === "1");
  ok("pass: no activity line anywhere holds either typed reason (the audit rows, read underneath)", sql(`select count(*) from audit_event where summary like '%${MARK}-%'`) === "0", sql(`select entity || ': ' || summary from audit_event where summary like '%${MARK}-%'`));

  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
