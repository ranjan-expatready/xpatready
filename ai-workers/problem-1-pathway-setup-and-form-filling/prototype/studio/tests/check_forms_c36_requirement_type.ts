// C3.6, the part not held (P-149, P-158; finish plan 2 Nov, P-265: the guarded Add itself is held): a document type named
// while adding a requirement is never written by hand. A new name waits as one library proposal on To review ›
// Proposals (202, its id); a second person accepts it (the queue's lander writes the type and its ADD), then the line is
// added with it. A name the library has is reused; a retired one is refused. A passing and a failing case per rule, on an
// isolated copy with Load sample's six. No AI (US$0).
//   zsh studio/tools/isolated.sh forms_c36t 4458 start && tsx studio/tests/check_forms_c36_requirement_type.ts 4458 xr_studio_forms_c36t
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = Number(process.argv[2] ?? 4458), DB = process.argv[3] ?? "xr_studio_forms_c36t";
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql"].find((p) => existsSync(p)) ?? "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
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

  // ─────────── Review of #523 (M1): one name is one type, matched as the lander keys it and by its normalised name
  const sp = sql("select id from combination where combination_key like 'sp.%' order by combination_key limit 1");
  const nameAndAccept = async (combo: string, n: string, extra: Record<string, unknown> = {}) => {
    const named = await call("POST", `/combinations/${combo}/requirements`, { ...line, ...extra, documentTypeName: n });
    const acc = named.status === 202 ? await call("POST", "/review/proposals/decide", { ids: [named.body.proposalId], action: "accept" }, "user-B") : null;
    return { named, key: acc?.body?.items?.[0]?.landedAs as string | undefined, acc };
  };
  const proposals = () => sql("select count(*) from proposal_item where kind = 'document_type'");
  for (const [label, n] of [["an accented", "Relevé bancaire (Sample)"], ["a non-Latin", "银行对账单"], ["a long (61 to 120 characters)", "Proof of a very long named supporting document for the sample check of the queue (Sample)"]] as const) {
    const first = await nameAndAccept(wp, n);
    const p2 = proposals();
    r = await call("POST", `/combinations/${sp}/requirements`, { ...line, documentTypeName: n });
    const types = sql(`select count(distinct document_type_key) from document_type where name = '${n}'`);
    ok(`C3.6 pass (#523 M1): ${label} name accepted on one combination is that type on another (201, the same key, nothing proposed, one type)`, first.named.status === 202 && !!first.key && r.status === 201 && r.body?.documentTypeKey === first.key && proposals() === p2 && types === "1", [first.named.status, first.key, r.status, r.body?.documentTypeKey, words(r), types]);
  }
  r = await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeName: "Hotel voucher (Sample)" });
  const p3 = proposals();
  const twin = await call("POST", `/combinations/${sp}/requirements`, { ...line, documentTypeName: "hotel  VOUCHER (sample)" });
  ok("C3.6 fail (#523 M1): a letter-case and spacing twin from another combination is refused while the first waits (409, in words naming it), one proposal", r.status === 202 && twin.status === 409 && /"Hotel voucher \(Sample\)" is already waiting/.test(words(twin)) && proposals() === p3, [r.status, twin.status, words(twin)]);
  const proves = sql(`select payload->>'proves' from proposal_item where id = '${r.body?.proposalId}'`);
  const comboLabel = sql(`select label from combination where id = '${wp}'`);
  ok("C3.6 pass (#523 M1): what it proves names no combination, so the same name is one identity everywhere", !!proves && !proves.includes(comboLabel), proves);

  // Review m1: an edit with a new name is refused in words; the line keeps its type; nothing is proposed.
  const lineKey = sql(`select lineage_key from document_requirement where combination_id = '${wp}' and document_type_key = '${key}' limit 1`);
  const p4 = proposals();
  r = await call("PATCH", `/combinations/${wp}/requirements/${encodeURIComponent(lineKey)}`, { ...line, documentTypeName: "Proof of an edited thing (Sample)" });
  ok("C3.6 fail (#523 m1): editing a line to a new name is refused (409, in words), the line keeps its type, nothing proposed", r.status === 409 && /add a new line with that name/.test(words(r)) && proposals() === p4 && sql(`select document_type_key from document_requirement where combination_id = '${wp}' and lineage_key = '${lineKey}' order by version desc limit 1`) === key, [r.status, words(r)]);

  // Review m2: the line's own checks run before a name is proposed; nothing unchecked waits.
  for (const [label, body] of [["an unknown requirement mode", { ...line, attachMode: "BOGUS" }], ["a conditional line without its condition", { ...line, attachMode: "ANSWER_CONDITIONAL" }], ["an unknown person", { ...line, appliesToRoles: "nobody" }]] as const) {
    r = await call("POST", `/combinations/${wp}/requirements`, { ...body, documentTypeName: "Proof of an unchecked thing (Sample)" });
    ok(`C3.6 fail (#523 m2): ${label} is refused before anything is proposed (400, in words)`, r.status === 400 && !!words(r) && sql("select count(*) from proposal_item where payload->>'name' = 'Proof of an unchecked thing (Sample)'") === "0", [r.status, words(r)]);
  }
  r = await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeName: " -- !! " });
  ok("C3.6 fail: a name with no letters or numbers is refused (400, in words), nothing proposed", r.status === 400 && /letters or numbers/.test(words(r)) && proposals() === p4, [r.status, words(r)]);

  // #523 Question 1: the person who named it stays its proposer, so the ADD's second person is someone else and the
  // namer keeps "Delete your own unapproved type" (C11.9); the author's source quote reaches the second person.
  const quoted = await nameAndAccept(wp, "Proof of a quoted thing (Sample)", { sourceQuote: "Sample quote typed by the author" });
  ok("C3.6 pass (#523 Q1): accepted by user-B, the type's ADD still names user-A (who named it) as its proposer", !!quoted.key && sql(`select proposed_by from library_change where kind = 'document_type' and key = '${quoted.key}'`) === "user-A", [quoted.named.status, quoted.key]);
  ok("C3.6 pass: the second person reads the author's source quote in the proposal's reason", /Sample quote typed by the author/.test(sql(`select reason from proposal_item where id = '${quoted.named.body?.proposalId}'`)));
  const other = await call("POST", `/combinations/${wp}/requirements`, { ...line, documentTypeName: "Proof of a plain thing (Sample)" });
  r = await call("POST", "/review/proposals/decide", { ids: [other.body?.proposalId], action: "accept" }, "user-B");
  const ruleFact = sql("select proposed_by from library_change where kind = 'document_type' and label = 'Proof of a plain thing (Sample)'");
  ok("C3.6 pass: the namer is read from the server's own run, not from the request", ruleFact === "user-A", ruleFact);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
