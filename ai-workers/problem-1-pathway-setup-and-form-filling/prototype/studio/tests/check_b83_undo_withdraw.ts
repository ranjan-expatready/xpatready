// B83 (QA-234; C4.11): undo and withdraw of "Ask as its own question", on the configured checkpoint, by the breaker's and the
// reviewer's findings (screens/B83-own-question-screen/break-report.md, review.md): a released row is frozen (B1); every
// reader of a field keeps it (M1); the check and the withdrawal are one step (M2); a no-op draft goes (M3); a reader left by
// To review's withdraw is named, and holds Submit by name until resolved (tech lead's ruling on M5); when it holds release
// (BR-8, F4); what undo says (F3, m1, m2, m8); no key in a refusal. US$0, live AI off. It writes SQL on its own copy, to hold a
// row as a release does and to build a reader no saved run offers; the attack itself goes through the routes.
//   zsh studio/tools/isolated.sh b83api 4441 start && tsx studio/tests/check_b83_undo_withdraw.ts 4441 xr_studio_b83api
// A 4th argument "loaded" skips the 4.5-minute load, for a copy that holds a fresh checkpoint.
import { execFileSync, spawn } from "node:child_process";
import { request } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.argv[2] ?? 4441), DB = process.argv[3] ?? "xr_studio_b83api", LOADED = process.argv[4] === "loaded";
const PSQL = "/opt/homebrew/opt/postgresql@18/bin/psql", URL_DB = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
const AUTHOR = "user-A", APPROVER = "user-B";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C4.11 ${name}${detail !== undefined && !c ? ` — ${JSON.stringify(detail).slice(0, 600)}` : ""}`); };
const sql = (q: string) => execFileSync(PSQL, [URL_DB, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const call = (method: string, path: string, body?: unknown, actor: string | null = AUTHOR) => new Promise<{ status: number; body: any }>((done, failed) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "localhost", port: PORT, path: `/api${path}`, method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b: any = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", failed); if (data) rq.write(data); rq.end();
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const KEY = /\b(person|case)\.[a-z0-9_]+|form1\[/;
const noKey = (s: string) => !KEY.test(s);
/** Holds one row as a release's transaction does: published, not committed yet, for `ms`. */
const holdAsARelease = (sets: string, ms: number) => new Promise<() => Promise<void>>((ready) => {
  const p = spawn(PSQL, [URL_DB, "-Atc", `begin; ${sets}; select pg_sleep(${ms / 1000}); commit;`], { stdio: "ignore" });
  const done = new Promise<void>((r) => p.on("exit", () => r()));
  setTimeout(() => ready(() => done), 400);
});

const ALIAS = "form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0]", NATID = "form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]", USCARD = "form1[0].Page2[0].USCard[0].q1[0].usCardIndicator[0]";
const WHY = "The form asks this Yes/No itself (B83 check)", MEANS = (n: string) => `Whether ${n}: a B83 check, Sample.`;

(async () => {
  if (!LOADED) {
    await call("POST", "/demo/reset", { confirm: "RESET" });
    const l = await call("POST", "/demo/load", { sample: "configured" });
    if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  }
  const vv = sql("select id from combination where combination_key = 'vv.single'");
  const ed = sql("select e.id from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = 'IMM 5257' and e.channel = 'PDF' order by e.edition_label desc limit 1");
  const ws = sql(`select workspace_id from combination where id = '${vv}'`);
  const list = async () => (await call("GET", `/editions/${ed}/form-fields/own-questions`)).body as { fields: { dataPath: string; asked: boolean; can_ask: boolean; page: string | null; asked_as: { change_id: string | null } | null }[]; yes_no_fields: { key: string; name: string }[] };
  const ask = (dataPath: string, b: Record<string, unknown>, actor: string | null = AUTHOR) => call("POST", `/editions/${ed}/form-fields/own-question`, { dataPath, reason: WHY, ...b }, actor);
  const askNew = (dataPath: string, label: string, extra: Record<string, unknown> = {}) => ask(dataPath, { label, meaning: MEANS(label), nearReason: "It is the form's Yes/No, not a detail (B83 check).", ...extra });
  const undo = (dataPath: string, actor: string | null = AUTHOR) => call("POST", `/editions/${ed}/form-fields/own-question/undo`, { dataPath }, actor);
  const rowsOf = (p: string) => sql(`select version || ':' || status || ':' || coalesce(canonical_field_key, '') from form_field_map where form_edition_id = '${ed}' and data_path = ${lit(p)} order by version`).split("\n");
  const newest = (p: string) => rowsOf(p).at(-1)!;
  const keyOf = (label: string) => sql(`select canonical_field_key from canonical_field where label = ${lit(label)} limit 1`);
  const changeOf = (key: string) => sql(`select id from library_change where kind = 'field' and action = 'ADD' and key = ${lit(key)} and status in ('WAITING','RETURNED') limit 1`);
  const withdraw = (id: string, actor: string = AUTHOR) => call("POST", `/library/changes/${id}/withdraw`, { note: "Withdrawn on To review (B83 check)." }, actor);
  const problems = async () => (await call("GET", `/combinations/${vv}`)).body.draft.problems as { level: string; where: string; item: string; label: string | null; message: string }[];
  const errors = async () => (await problems()).filter((p) => p.level === "error");
  const said = (p: { label: string | null; item: string; message: string }) => `${p.label ?? p.item}: ${p.message}`;
  /** Whatever a round left: no asked row, no waiting new field of these checks. */
  const plain = async (...paths: string[]) => { for (const p of paths) { const u = await undo(p); if (u.status >= 500) throw new Error(`undo ${u.status}`); } for (const id of sql(`select id from library_change where kind = 'field' and action = 'ADD' and status in ('WAITING','RETURNED') and label like 'B83 %'`).split("\n").filter(Boolean)) await withdraw(id); };
  /** The content reviewer signs what needs signing (the release's own rule, not this row's). */
  const sign = async () => { const items = (((await call("GET", `/combinations/${vv}/review`)).body.submission?.changeSummary ?? []) as { kind: string; key: string; needs_sme?: boolean }[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`); if (items.length) await call("POST", `/combinations/${vv}/signoff`, { items, action: "signed" }, "user-C"); };
  const submit = async (note = "B83 check") => { const s = await call("POST", `/combinations/${vv}/submit`, { note }); if (s.status < 300) await sign(); return s; };
  const release = async () => { const s = await submit(); if (s.status >= 300) return s; return call("POST", `/combinations/${vv}/approve`, {}, APPROVER); };

  // ------------------------------------------------------------ the row's first state: a released row under a draft
  let u = await undo(USCARD);
  ok("setup: undo over a released row makes a new draft, the released row untouched", u.status < 300 && newest(USCARD).includes(":DRAFT:person.us_green_card_number") && rowsOf(USCARD)[0].startsWith("1:PUBLISHED:"), rowsOf(USCARD));
  u = await release();
  ok("setup: the worked-out row is released (a real release: the checkpoint has no errors)", u.status < 300, u);
  ok("setup: now the newest row is published and worked out", /:PUBLISHED:person\.us_green_card_number$/.test(newest(USCARD)), rowsOf(USCARD));

  // ------------------------------------------------------------ M3 and m8: withdraw over a released row leaves no draft
  u = await askNew(USCARD, "B83 no-op draft");
  const noopKey = keyOf("B83 no-op draft");
  ok("setup: asked as a new field: a draft over the released row", u.status < 300 && newest(USCARD).endsWith(`:DRAFT:${noopKey}`), rowsOf(USCARD));
  u = await withdraw(changeOf(noopKey));
  ok("M3 fail test: To review's withdraw over a released row deletes the draft: no change left for a release", u.status < 300 && /:PUBLISHED:person\.us_green_card_number$/.test(newest(USCARD)), rowsOf(USCARD));
  ok("m7: its answer counts the form field put back to worked out, and none to no decision", u.body?.form_fields_restored === 1 && u.body?.form_fields_reopened === 0, u.body);
  ok("m8: the withdraw is in the history, in words, with what it did to form fields", /withdrew the new field "B83 no-op draft".*1 form field back to worked out/.test(sql(`select summary from audit_event where entity = 'shared field' and entity_key = ${lit(noopKey)} order by at desc limit 1`)));

  // ------------------------------------------------------------ B1: undo and ask against a release, deterministic
  u = await askNew(USCARD, "B83 race delete");
  const del = sql(`select id from form_field_map where form_edition_id = '${ed}' and data_path = ${lit(USCARD)} order by version desc limit 1`);
  const delUnder = sql(`select supersedes_id from form_field_map where id = '${del}'`);
  const delKey = keyOf("B83 race delete");
  let waited = await holdAsARelease(`update form_field_map set status = 'SUPERSEDED' where id = '${delUnder}'; update form_field_map set status = 'PUBLISHED' where id = '${del}'`, 2500);
  u = await undo(USCARD);
  await waited();
  // The undo's new-field path did not run either: the field stays for the row that now holds it.
  ok("B1 fail test (delete path): undo refuses a row released under it, in words (409)", u.status === 409 && /released just now/.test(words(u)) && noKey(words(u)), u);
  ok("B1 fail test (delete path): the published row is still there, unchanged", newest(USCARD).endsWith(`:PUBLISHED:${delKey}`), rowsOf(USCARD));
  sql(`update form_field_map set status = 'DRAFT' where id = '${del}'; update form_field_map set status = 'PUBLISHED' where id = '${delUnder}'`);
  await plain(USCARD);

  u = await undo(NATID); // v2, a draft over the released row, reading another fact: the rewrite path
  u = await askNew(NATID, "B83 race rewrite");
  const rew = sql(`select id from form_field_map where form_edition_id = '${ed}' and data_path = ${lit(NATID)} order by version desc limit 1`);
  const rewKey = keyOf("B83 race rewrite");
  waited = await holdAsARelease(`update form_field_map set status = 'PUBLISHED' where id = '${rew}'`, 2500);
  u = await undo(NATID);
  await waited();
  ok("B1 fail test (rewrite path): undo refuses, and the published row keeps its fact", u.status === 409 && /released just now/.test(words(u)) && newest(NATID).endsWith(`:PUBLISHED:${rewKey}`), { u, rows: rowsOf(NATID) });
  sql(`update form_field_map set status = 'DRAFT' where id = '${rew}'`);
  u = await undo(NATID);
  waited = await holdAsARelease(`update form_field_map set status = 'PUBLISHED' where id = '${rew}'`, 2500);
  const askBack = rowsOf(NATID).at(-1)!;
  u = await askNew(NATID, "B83 race ask");
  await waited();
  ok("B1 fail test (ask): an ask refuses a row released under it, and the published row keeps its fact", u.status === 409 && /released just now/.test(words(u)) && newest(NATID) === askBack.replace(":DRAFT:", ":PUBLISHED:"), { u, rows: rowsOf(NATID) });
  sql(`update form_field_map set status = 'DRAFT' where id = '${rew}'`);
  await plain(USCARD, NATID);

  // ------------------------------------------------------------ B1: the real release, at once, three delays
  const lib = (await list()).yes_no_fields.find((f) => f.key === "person.us_permanent_resident")!;
  for (const [i, delay] of [1200, 1400, 1600, 1800, 2000].entries()) {
    await plain(USCARD);
    u = await ask(USCARD, { field: lib.key });
    let s = await submit(`B83 race ${i}`);
    if (/Nothing has changed/.test(words(s))) { await plain(USCARD); await release(); await ask(USCARD, { field: lib.key }); s = await submit(`B83 race ${i}`); }
    if (s.status >= 300) { ok(`B1 race ${delay} ms: Submit`, false, s); continue; }
    const [a, b] = await Promise.all([call("POST", `/combinations/${vv}/approve`, {}, APPROVER), sleep(delay).then(() => undo(USCARD))]);
    const live = rowsOf(USCARD).filter((r) => /:(PUBLISHED|DRAFT):/.test(r));
    const published = live.filter((r) => r.includes(":PUBLISHED:"));
    const frozen = sql(`select e->>'fact' from config_release r, jsonb_array_elements(r.snapshot->'field_maps') m, jsonb_array_elements(m->'entries') e where r.combination_id = '${vv}' and r.status = 'RELEASED' and m->>'form_number' = 'IMM 5257' and e->>'data_path' = ${lit(USCARD)} order by r.version desc limit 1`);
    ok(`B1 race ${delay} ms: approve ${a.status}, undo ${b.status}: exactly one live published row, and it equals the frozen release`, published.length === 1 && published[0].endsWith(`:${frozen}`), { live, frozen, a: a.status, b: b.status });
  }
  await plain(USCARD);

  // ------------------------------------------------------------ M1: every reader keeps the field; each is named; M5: Submit names it
  const one = (q: string) => sql(`${q} limit 1`);
  const newestWhere = (table: string, lineage: string, where: string) => one(`select id from ${table} p where ${where} and status in ('DRAFT','PUBLISHED') and not exists (select 1 from ${table} q where q.${lineage} = p.${lineage} and q.version > p.version ${table === "section_question" ? "" : "and q.combination_id = p.combination_id"})`);
  const cond = (k: string) => lit(JSON.stringify({ op: "eq", field: k, value: true, subjectKind: "person" }));
  const setJson = (table: string, id: string, k: string) => { const was = sql(`select predicate_json::text from ${table} where id = '${id}'`); sql(`update ${table} set predicate_json = ${cond(k)}::jsonb where id = '${id}'`); return () => { sql(`update ${table} set predicate_json = ${was ? `${lit(was)}::jsonb` : "null"} where id = '${id}'`); }; };
  const drop = (table: string, id: string) => () => { sql(`delete from ${table} where id = '${id}'`); };
  const insert = (table: string, cols: Record<string, string>) => { const id = randomUUID(); sql(`insert into ${table} (id, ${Object.keys(cols).join(", ")}) values ('${id}', ${Object.values(cols).join(", ")})`); return id; };
  const rowCols = { workspace_id: lit(ws), combination_id: lit(vv), version: "1", status: "'DRAFT'", origin: "'HUMAN'", updated_by: lit(AUTHOR), updated_at: "now()" };
  const form = newestWhere("combination_form", "lineage_key", `combination_id = '${vv}'`), docLine = newestWhere("document_requirement", "lineage_key", `combination_id = '${vv}'`);
  const question = newestWhere("section_question", "lineage_key", `workspace_id = '${ws}' and predicate_json = 'null'::jsonb and section_key in (select section_key from sqr_section_selection where combination_id = '${vv}')`);
  const docType = one(`select id from document_type where status = 'PUBLISHED' and document_type_key in (select document_type_key from document_requirement where id = '${docLine}')`);
  const otherRow = one(`select id from form_field_map where form_edition_id = '${ed}' and status = 'PUBLISHED' and outcome = 'mapped' and data_path not in (${[ALIAS, NATID, USCARD].map(lit).join(", ")}) and transform not like 'derived:%'`);
  const draftItem = one(`select id from proposal_item where kind = 'requirement_line' and status = 'rejected'`);
  const change = (kind: string, action: string, after: string) => insert("library_change", { workspace_id: lit(ws), kind: lit(kind), key: lit(`b83.${randomUUID().slice(0, 8)}`), label: lit(`B83 waiting ${kind}`), action: lit(action), status: "'WAITING'", proposed_by: lit(APPROVER), matches: `${lit(JSON.stringify({ after: JSON.parse(after) }))}::jsonb` });
  type Reader = { id: string; on: (k: string) => () => void; named: RegExp; submit?: RegExp };
  const READERS: Reader[] = [
    { id: "a rule", on: (k) => drop("predicate", insert("predicate", { ...rowCols, predicate_key: lit(`b83_rule_${randomUUID().slice(0, 6)}`), predicate_json: `${cond(k)}::jsonb`, then_plain: "'B83 rule words'", for_whom: "'applicant'" })), named: /the rule "B83 rule words" on /, submit: /B83 rule words/ },
    { id: "a section check", on: (k) => drop("check_def", insert("check_def", { ...rowCols, check_key: lit(`b83_check_${randomUUID().slice(0, 6)}`), check_group: "'cross_form'", predicate_json: `${cond(k)}::jsonb`, severity: "'warning'", message: "'B83 check words'" })), named: /the check "B83 check words" on /, submit: /B83 check words/ },
    { id: "a form's condition", on: (k) => setJson("combination_form", form, k), named: /the condition of IMM [0-9]+ on /, submit: /The condition of IMM [0-9]+/ },
    { id: "a document line's condition", on: (k) => setJson("document_requirement", docLine, k), named: /the condition of the document line "/, submit: /The condition of the document line "/ },
    { id: "a question's condition", on: (k) => setJson("section_question", question, k), named: /the condition of the question "/, submit: /The condition of the question "/ },
    { id: "a fact source", on: (k) => drop("fact_source", insert("fact_source", { ...rowCols, lineage_key: lit(`applicant|${k}`), role: "'applicant'", canonical_field_key: lit(k), prequalification: "true" })), named: /where this answer comes from on /, submit: /Where this answer comes from/ },
    { id: "a document type that supplies it", on: (k) => { sql(`update document_type set supplies_facts = array_append(supplies_facts, ${lit(k)}) where id = '${docType}'`); return () => { sql(`update document_type set supplies_facts = array_remove(supplies_facts, ${lit(k)}) where id = '${docType}'`); }; }, named: /the document type ".*", which supplies it/, submit: /The document type "/ },
    { id: "another form field's step", on: (k) => { const was = sql(`select transform from form_field_map where id = '${otherRow}'`); sql(`update form_field_map set transform = ${lit(`derived:${k} recorded -> yes_no_code`)} where id = '${otherRow}'`); return () => { sql(`update form_field_map set transform = ${lit(was)} where id = '${otherRow}'`); }; }, named: /IMM 5257 .*'s form field "/, submit: /'s form field "/ },
    { id: "a worked-out value", on: (k) => { const key = `b83_derived_${randomUUID().slice(0, 6)}`; sql(`insert into derived_field (id, workspace_id, derived_key, calculation, inputs, reference, plain, executable) values ('${randomUUID()}', '${ws}', '${key}', 'none', array[${lit(k)}], 'B83', 'B83 derived words', false)`); return () => { sql(`delete from derived_field where derived_key = '${key}'`); }; }, named: /the worked-out value "B83 derived words"/ },
    { id: "a waiting condition change", on: (k) => drop("library_change", change("placement_condition", "SET_CONDITION", JSON.stringify({ op: "eq", field: k, value: true }))), named: /the change on To review "B83 waiting placement_condition"/ },
    { id: "a waiting document-supplies change", on: (k) => drop("library_change", change("document_supplies", "SET_SUPPLIES", JSON.stringify([k]))), named: /the change on To review "B83 waiting document_supplies"/ },
    ...["requirement_line", "form_check", "cross_check", "comes_from", "condition", "pqr_pick"].map((kind): Reader => ({ id: `a waiting draft (${kind})`, on: (k) => { const was = sql(`select kind || '|' || status || '|' || payload::text from proposal_item where id = '${draftItem}'`).split("|"); sql(`update proposal_item set kind = ${lit(kind)}, status = 'waiting', payload = ${lit(JSON.stringify({ label: "B83 draft words", reads: k }))}::jsonb where id = '${draftItem}'`); return () => { sql(`update proposal_item set kind = ${lit(was[0])}, status = ${lit(was[1])}, payload = ${lit(was.slice(2).join("|"))}::jsonb where id = '${draftItem}'`); }; }, named: /waiting on To review \("B83 draft words"\)/ })),
  ];
  ok("setup: the rows the readers are built on exist", [form, docLine, question, docType, otherRow, draftItem].every(Boolean), { form, docLine, question, docType, otherRow, draftItem });
  for (const r of READERS) {
    const label = `B83 reader ${r.id.replace(/[^a-zA-Z ]/g, "")}`;
    u = await askNew(USCARD, label);
    const k = keyOf(label), id = changeOf(k);
    if (u.status >= 300 || !k || !id) { ok(`M1 ${r.id}: asked`, false, u); continue; }
    const off = r.on(k);
    u = await undo(USCARD);
    ok(`M1 fail test: ${r.id} reads the field, so undo keeps it waiting and names it, no key`, u.status < 300 && u.body?.withdrew === false && r.named.test(u.body?.kept ?? "") && noKey(u.body?.kept ?? "") && sql(`select count(*) from canonical_field where canonical_field_key = ${lit(k)}`) === "1", u.body);
    const rd = await call("GET", `/library/changes/${id}/readers`);
    ok(`M5 words before the press: To review names ${r.id}`, rd.body?.readers?.some((x: string) => r.named.test(x)) && noKey(JSON.stringify(rd.body?.readers)), rd.body);
    if (r.submit) {
      const w = await withdraw(id);
      ok(`M5 no refusal: To review's withdraw goes ahead with ${r.id}, and its answer names it`, w.status < 300 && w.body?.readers?.some((x: string) => r.named.test(x)) && noKey(JSON.stringify(w.body?.readers)), w);
      const s = await call("POST", `/combinations/${vv}/submit`, { note: "B83 reader" });
      const lines = (s.body?.errors ?? []).map((e: { message: string }) => e.message).join(" · ");
      ok(`M5 Submit refuses by name while ${r.id} reads the withdrawn field, its name beside it, no key`, s.status >= 400 && r.submit.test(lines) && lines.includes(`"${label}"`) && noKey(words(s)) && noKey(lines), { status: s.status, words: words(s), lines });
      off();
      const after = await errors();
      ok(`M5 resolved: with ${r.id} changed, nothing names the withdrawn field`, !after.some((p) => said(p).includes(label)), after.map(said));
    } else {
      off();
      u = await withdraw(id);
      ok(`M1 pass: with ${r.id} gone, To review's withdraw has no reader to name`, u.status < 300 && (u.body?.readers ?? []).length === 0, u.body);
    }
    await plain(USCARD);
  }
  // Another form field reading it, the first reader there is.
  u = await askNew(USCARD, "B83 second row");
  const second = keyOf("B83 second row");
  await undo(NATID);
  u = await ask(NATID, { field: second });
  u = await undo(USCARD);
  ok("M1 fail test: another form field asked as it keeps the field waiting, named", u.status < 300 && u.body?.withdrew === false && /IMM 5257 .*'s form field "/.test(u.body?.kept ?? ""), u.body);
  u = await call("GET", `/library/changes/${changeOf(second)}/readers`);
  ok("M5: a form field is not named before a withdraw: the withdraw itself puts it right", (u.body?.readers ?? []).length === 0, u.body);
  u = await withdraw(changeOf(second));
  ok("BR-10: withdrawing puts that other form field back to worked out", u.status < 300 && u.body?.form_fields_restored === 1 && !newest(NATID).endsWith(`:${second}`), { u: u.body, rows: rowsOf(NATID) });

  // ------------------------------------------------------------ M2: never a form field reading a deleted field
  const dangling = () => Number(sql(`select count(*) from form_field_map m where m.form_edition_id = '${ed}' and m.status in ('DRAFT','PUBLISHED') and m.canonical_field_key is not null and not exists (select 1 from canonical_field f where f.workspace_id = m.workspace_id and f.canonical_field_key = m.canonical_field_key and f.status in ('DRAFT','PUBLISHED')) and m.version = (select max(version) from form_field_map x where x.form_edition_id = m.form_edition_id and x.data_path = m.data_path)`));
  let left = 0;
  for (let i = 0; i < 6; i++) {
    await plain(USCARD, NATID);
    const label = `B83 race two ${i}`;
    await askNew(USCARD, label);
    const k = keyOf(label);
    await Promise.all([undo(USCARD), sleep(i * 8).then(() => ask(NATID, { field: k }))]);
    left += dangling();
  }
  ok("M2 fail test: undo against an ask on another row, 6 rounds: no form field reads a deleted field", left === 0, left);
  left = 0;
  for (let i = 0; i < 6; i++) {
    await plain(USCARD, NATID);
    const label = `B83 race three ${i}`;
    await askNew(USCARD, label);
    const k = keyOf(label), id = changeOf(k);
    await Promise.all([withdraw(id), sleep(i * 8).then(() => ask(NATID, { field: k }))]);
    left += dangling();
  }
  ok("M2 fail test: To review's withdraw against an ask on another row, 6 rounds: no form field reads a deleted field", left === 0, left);
  await plain(USCARD, NATID);

  // ------------------------------------------------------------ m1, m2, F3, F6, F8, words
  const fact = "person.us_green_card_number";
  await ask(USCARD, { field: lib.key });
  sql(`update canonical_field set status = 'RETIRED' where canonical_field_key = '${fact}' and status = 'PUBLISHED'`);
  u = await undo(USCARD);
  ok("m1 fail test: undo onto a retired fact is refused in words, no key, and the row stays asked", u.status === 409 && /is retired/.test(words(u)) && noKey(words(u)) && newest(USCARD).endsWith(`:${lib.key}`), u);
  sql(`update canonical_field set status = 'PUBLISHED' where canonical_field_key = '${fact}' and status = 'RETIRED'`);
  await plain(USCARD);
  let falseWords = 0;
  for (let i = 0; i < 4; i++) {
    const label = `B83 kept ${i}`;
    await askNew(USCARD, label);
    const id = changeOf(keyOf(label));
    const [, b] = await Promise.all([call("POST", `/library/changes/${id}/approve`, { note: "B83 check" }, APPROVER), sleep(i * 10).then(() => undo(USCARD))]);
    const now = sql(`select status from library_change where id = '${id}'`);
    if (b.body?.kept && /stays waiting/.test(b.body.kept) && now !== "WAITING") falseWords++;
    await plain(USCARD);
  }
  ok("m2 fail test: undo against an approval never says \"stays waiting\" of an approved field", falseWords === 0, falseWords);

  const placed = await ask(USCARD, { field: lib.key });
  await call("POST", `/combinations/${vv}/place-from-form-parts`, {});
  u = await undo(USCARD);
  ok("F3 fail test: undo after placement says the question is still asked, names its section and where to remove it", placed.status < 300 && u.status < 300 && /still asked in "/.test(u.body?.still_asked ?? "") && /Smart questionnaire tab/.test(u.body?.still_asked ?? "") && noKey(u.body?.still_asked ?? ""), u.body);
  const newPlaced = await askNew(USCARD, "B83 placed new");
  await call("POST", `/combinations/${vv}/place-from-form-parts`, {});
  const newPlacedKey = keyOf("B83 placed new");
  u = await undo(USCARD);
  ok("F3 pass: a new field withdrawn takes its question with it: nothing is said to remain", newPlaced.status < 300 && u.body?.withdrew === true && u.body?.still_asked === null && sql(`select count(*) from section_question where canonical_field_key = ${lit(newPlacedKey)}`) === "0", u.body);

  const other = sql("select label from canonical_field where group_key = 'person' and status = 'PUBLISHED' and value_type not in ('yes_no','boolean') and label is not null and merged_into_key is null order by label limit 1");
  u = await ask(USCARD, { label: other, meaning: MEANS(other) });
  ok(`F6 fail test: a name the library holds on a field that is not Yes/No ("${other}") is refused with words that fit: not "choose it"`, u.status === 409 && /not Yes or No/.test(words(u)) && !/choose it/.test(words(u)) && noKey(words(u)), u);
  const before = (await list()).fields;
  ok("F8: the rows are in the form's order, page then data path", before.every((r, i) => !i || Number(before[i - 1].page ?? 999) <= Number(r.page ?? 999)), before.map((r) => r.page));
  await ask(USCARD, { field: lib.key });
  const afterAsk = (await list()).fields;
  ok("F8: a save does not reorder them", JSON.stringify(afterAsk.map((r) => r.dataPath)) === JSON.stringify(before.map((r) => r.dataPath)));
  await plain(USCARD);

  // ------------------------------------------------------------ the tech lead's done-when: no key in any refusal
  const notYesNo = sql("select canonical_field_key from canonical_field where group_key = 'person' and status = 'PUBLISHED' and value_type not in ('yes_no','boolean') limit 1");
  const q8a = (await list()).fields.find((f) => /PCRIndicator/.test(f.dataPath))!;
  const caseField = sql("select canonical_field_key from canonical_field where group_key = 'case' and status = 'PUBLISHED' and value_type in ('yes_no','boolean') limit 1");
  await ask(ALIAS, { field: "person.has_used_other_name" });
  const refusals: [string, { status: number; body: any }][] = [
    ["not the author", await ask(USCARD, { field: lib.key }, APPROVER)],
    ["no person", await ask(USCARD, { field: lib.key }, null)],
    ["undo, not the author", await undo(USCARD, APPROVER)],
    ["undo, not asked", await undo(USCARD)],
    ["undo, no such form field", await undo("form1[0].Nothing[0]")],
    ["both a field and a name", await ask(USCARD, { field: lib.key, label: "Both", meaning: "Whether both are named." })],
    ["neither", await ask(USCARD, {})],
    ["no such form field", await ask("form1[0].Nothing[0]", { field: lib.key })],
    ["a step with no facts", await ask(q8a.dataPath, { field: lib.key })],
    ["a form field that is not worked out", await ask(sql(`select data_path from form_field_map where id = '${otherRow}'`), { field: lib.key })],
    ["not a library field", await ask(USCARD, { field: "person.nothing_here" })],
    ["not Yes/No", await ask(USCARD, { field: notYesNo })],
    ["about the wrong subject", await ask(USCARD, { field: caseField })],
    ["a short reason", await ask(USCARD, { field: lib.key, reason: "short" })],
    ["a short meaning", await ask(USCARD, { label: "B83 short", meaning: "short" })],
    ["a name the library holds", await ask(USCARD, { label: "Has used other name", meaning: MEANS("x") })],
    ["a near name with no reason", await ask(USCARD, { label: "Has used other name B83", meaning: MEANS("x") })],
    ["already asked", await ask(ALIAS, { field: lib.key })],
  ];
  for (const [name, r] of refusals) ok(`no key in a refusal (${name}): ${r.status}`, r.status >= 400 && !!words(r) && noKey(words(r)), r);

  // ------------------------------------------------------------ F4, BR-8: when it holds release
  await plain(USCARD);
  const held = () => errors().then((e) => e.map(said));
  ok("BR-8 pass: a form field never asked holds nothing (no error on the combination)", (await held()).length === 0, await held());
  u = await askNew(USCARD, "B83 holds release");
  const heldKey = keyOf("B83 holds release");
  ok("BR-8 fail test: a new field not placed holds release: nobody is asked for it", u.status < 300 && (await held()).some((l) => /nobody is asked/.test(l) && /B83 holds release|Whether B83 holds release/.test(l)), await held());
  u = await call("POST", `/combinations/${vv}/place-from-form-parts`, {});
  ok("BR-8 pass: pressing the placement step clears that", u.status < 300 && !(await held()).some((l) => /nobody is asked/.test(l)), await held());
  u = await release();
  ok("BR-8 fail test: a new field still waiting holds release, by its name, no key", u.status === 409 && /Release refused/.test(words(u)) && /B83 holds release/.test(words(u)) && noKey(words(u)), u);
  u = await call("POST", `/library/changes/${changeOf(heldKey)}/approve`, { note: "B83 check" }, APPROVER);
  ok("BR-8: a second person approves it", u.status < 300, u);
  u = await release();
  ok("BR-8 pass: approved and placed, it releases", u.status < 300, u);
  const relKey = heldKey;
  await undo(NATID);
  u = await ask(NATID, { field: relKey });
  const placedAfter = await held();
  ok("BR-8: asking an approved, placed field needs no second person and no second press", u.status < 300 && placedAfter.length === 0, placedAfter);

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
