// FO-6 part 1 (BACKLOG row FO-6; contracts §2.4, §7; P-563, P-564, P-600): the signing tables with their database rules,
// each with a passing and a failing case. Three scratch databases: "empty"
// gets every migration; "demo" gets every migration before FO-6's, then demo-shaped rows (a Sample case, an audit line,
// the Sample firms and staff), then FO-6's migration and any later one; "bare" stops before FO-6. The migration is
// measured right after itself (rows rev 16.7): it is never assumed to be the newest. No server, no browser, no network,
// no model call (US$0). Every value is Sample; no real person. All are dropped at the end.
//   tsx studio/tests/check_fo6_signing.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261119173000_fo6_signing_tables";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_fo6_empty_${process.pid}`, DEMO = `xr_studio_fo6_demo_${process.pid}`, BARE = `xr_studio_fo6_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `fo6-check-${process.pid}`);
const TABLES = ["fo_signature_request", "fo_signer", "fo_signing_evidence", "fo_signing_hook_receipt"];

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function fo6Diff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /fo_sign|FoSign/.test(l));
}

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
try {
  const before = all.filter((d) => d < NEW);
  ok(`FO-6: the migration has its own stamp, later than every one before it (newest before it: ${before.at(-1)}) and unique (P-600 (4))`,
    all.includes(NEW) && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));
  const text = readFileSync(join(MIG, NEW, "migration.sql"), "utf8"), code = text.replace(/^--.*$/gm, "");
  const created = [...code.matchAll(/CREATE (?:FUNCTION|TRIGGER) (\w+)/g)].map((m) => m[1]);
  ok("FO-6 (P-600 (3)): every function and trigger the migration creates carries the area prefix fo_signing_",
    created.length >= 10 && created.every((n) => n.startsWith("fo_signing_")), created.filter((n) => !n.startsWith("fo_signing_")));
  ok("FO-6 (P-600 (2)): the migration only adds — no ALTER, DROP or UPDATE of a table that is not its own (its triggers update only its own request row)",
    ![...code.matchAll(/(?:ALTER TABLE|UPDATE|INSERT INTO|DELETE FROM) "(\w+)"/g)].some((m) => !TABLES.includes(m[1])) && !/^\s*(DROP|DELETE|TRUNCATE)\b/im.test(code)
    && ![...code.matchAll(/^\s*UPDATE\s+"?(\w+)/gim)].some((m) => !TABLES.includes(m[1])));
  ok("FO-6 (P-564, brief): no column holds an email address, a code or a link token in clear (only their sha256)",
    !/"(email|code|link_token|token)"\s/i.test(code) && /"code_sha256"/.test(code) && /"link_token_sha256"/.test(code));

  for (const d of before) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-6 fail: before FO-6's migration there is no signing table and the schema differs (diff names fo_signature_request)",
    sql(BARE, `select count(*) from pg_tables where tablename = any('{${TABLES.join(",")}}')`) === "0" && fo6Diff(BARE).some((l) => /fo_signature_request/.test(l)));
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-6 pass: every migration applies to an empty database; the four tables exist",
    sql(EMPTY, `select count(*) from pg_tables where schemaname='public' and tablename = any('{${TABLES.join(",")}}')`) === "4");
  ok("FO-6 pass: migrate diff from the migrated empty database to the schema names no signing table or type", fo6Diff(EMPTY).length === 0, fo6Diff(EMPTY));
  ok("FO-6 fail: the migration does not apply twice", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  for (const d of before) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values ('${u(10)}', '${u(1)}', '${u(2)}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, actor_type, action, entity, summary) values (gen_random_uuid(), '${u(1)}', 'user-R', 'FIRM_STAFF', 'case.open', 'runtime_case', 'Sample');`);
  const pre = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(DEMO), options: "-c TimeZone=UTC" }) }); dbs.push(pre);
  await seedSampleFirms(pre);
  await pre.$disconnect();
  const demoRows = `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select count(*) from platform_firm) || ':' || (select string_agg(id::text, ',' order by id) from platform_staff)`;
  const was = sql(DEMO, demoRows);
  psql(DEMO, ["-f", join(MIG, NEW, "migration.sql")]);
  ok("FO-6 pass: right after its own migration, a demo-data copy (cases, audit, the Sample firms and staff) keeps its rows", sql(DEMO, demoRows) === was, was);
  for (const d of all.filter((x) => x > NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-6 pass: migrate diff after every migration on the demo-data copy names no signing table or type", fo6Diff(DEMO).length === 0, fo6Diff(DEMO));
  ok("FO-6 pass: firm_id is first in every index of the four tables but the provider's document id, unique across firms (contracts §0; review M4)", sql(DEMO, `select coalesce(string_agg(ic.relname, ','), '') from pg_index i join pg_class c on c.oid = i.indrelid join pg_class ic on ic.oid = i.indexrelid
    left join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0] where c.relname = any('{${TABLES.join(",")}}') and not i.indisprimary and coalesce(a.attname, '') <> 'firm_id'`) === "fo_signature_request_provider_provider_document_id_key");

  // -------------------------------------------------------------------------------------------------- the rules
  const [firmA, firmB] = sql(DEMO, `select string_agg(id::text, ',' order by key) from platform_firm`).split(",");
  const staffOf = (f: string) => sql(DEMO, `select id from platform_staff where firm_id = '${f}' order by id limit 1`);
  const repA = staffOf(firmA), repB = staffOf(firmB);
  let n = 100;
  const req = (o: { id?: string; firm?: string; doc?: string; ver?: string; by?: string; pdid?: string } = {}) => {
    const r = o.id ?? u(++n);
    return { id: r, q: `insert into fo_signature_request (id, firm_id, document_kind, document_id, document_version_id, document_version, provider, provider_document_id, sent_by, expires_at, updated_at)
      values ('${r}', '${o.firm ?? firmA}', 'RETAINER', '${o.doc ?? u(++n)}', '${o.ver ?? u(++n)}', 1, 'FAKE', '${o.pdid ?? `fake-${r}`}', '${o.by ?? repA}', now() + interval '14 days', now())` };
  };
  const signer = (r: string, role: "CLIENT" | "FIRM", o: { id?: string; firm?: string; person?: string; staff?: string; order?: number } = {}) => {
    const s = o.id ?? u(++n);
    return { id: s, q: `insert into fo_signer (id, firm_id, request_id, role, sign_order, person_id, staff_id, link_token_sha256) values ('${s}', '${o.firm ?? firmA}', '${r}', '${role}', ${o.order ?? (role === "CLIENT" ? 1 : 2)},
      ${role === "CLIENT" ? `'${o.person ?? u(++n)}'` : "null"}, ${role === "FIRM" ? `'${o.staff ?? repA}'` : "null"}, '${sha(s)}')` };
  };
  /** A request with two clients and the firm signer. */
  const envelope = () => { const r = req(); sql(DEMO, r.q); const c1 = signer(r.id, "CLIENT"), c2 = signer(r.id, "CLIENT"), f = signer(r.id, "FIRM"); for (const s of [c1, c2, f]) sql(DEMO, s.q); return { r: r.id, c1: c1.id, c2: c2.id, f: f.id }; };
  const sign = (s: string) => `update fo_signer set consent_text_version = 'esign-consent-v1', consented_at = now(), signed_at = now() where id = '${s}'`;
  const evidence = (r: string) => `insert into fo_signing_evidence (id, firm_id, request_id, sealed_file_key, sealed_sha256, audit_file_key, audit_sha256, consent_text_version)
    values (gen_random_uuid(), '${firmA}', '${r}', 'signing/${r}/sealed.pdf', '${sha("s" + r)}', 'signing/${r}/audit.pdf', '${sha("a" + r)}', 'esign-consent-v1')`;

  const e1 = envelope();
  ok("FO-6 pass: a request starts SENT with its signers (two clients in order 1, the firm in order 2)", sql(DEMO, `select status from fo_signature_request where id = '${e1.r}'`) === "SENT");
  ok("FO-6 fail: a request cannot start in another state", refused(DEMO, req().q.replace("updated_at)", "updated_at, status)").replace("now())", "now(), 'SIGNED')"), /starts SENT/));
  ok("FO-6 fail: the same version cannot be sent twice (a second send of one version is refused)", (() => { const v = u(++n); sql(DEMO, req({ ver: v }).q); return refused(DEMO, req({ ver: v }).q, /fo_signature_request_firm_id_document_kind_document_version_key/); })());
  ok("FO-6 fail: a second live request for one document is refused; after a cancel a new one is taken (Send updated version)", (() => {
    const d = u(++n), a = req({ doc: d }); sql(DEMO, a.q);
    const second = refused(DEMO, req({ doc: d }).q, /fo_signature_request_one_live/);
    sql(DEMO, `update fo_signature_request set status = 'CANCELLED', cancel_reason = 'UPDATED' where id = '${a.id}'`);
    sql(DEMO, req({ doc: d }).q);
    return second && sql(DEMO, `select count(*) from fo_signature_request where document_id = '${d}' and status in ('SENT','VIEWED','CLIENT_SIGNED')`) === "1";
  })());
  ok("FO-6 fail: a cancel needs its reason, and a reason only comes with a cancel", refused(DEMO, `update fo_signature_request set status = 'CANCELLED' where id = '${e1.r}'`, /cancel_reason_check/)
    && refused(DEMO, `update fo_signature_request set cancel_reason = 'WITHDRAWN' where id = '${e1.r}'`, /cancel_reason_check|no end/));
  ok("FO-6 fail: a request sent by another firm's staff member is refused (composite key)", refused(DEMO, req({ by: repB }).q, /fo_signature_request_firm_id_sent_by_fkey/));
  ok("FO-6 fail: a provider document id with a space or a slash is refused", refused(DEMO, req({ pdid: "bad id/x" }).q, /provider_document_id_check/));
  ok("FO-6 fail: a client with a staff id, a firm signer in order 1, or a second firm signer is refused",
    refused(DEMO, `insert into fo_signer (id, firm_id, request_id, role, sign_order, person_id, staff_id, link_token_sha256) values (gen_random_uuid(), '${firmA}', '${e1.r}', 'CLIENT', 1, gen_random_uuid(), '${repA}', '${sha("x")}')`, /party_check/)
    && refused(DEMO, signer(e1.r, "FIRM", { order: 1 }).q, /party_check/) && refused(DEMO, signer(e1.r, "FIRM").q, /fo_signer_one_firm_signer/));
  ok("FO-6 fail: a signer cannot be added to another firm's request (composite key)", refused(DEMO, signer(e1.r, "CLIENT", { firm: firmB }).q, /fo_signer_firm_id_request_id_fkey|added to a SENT request/));
  ok("FO-6 fail: no signature without consent", refused(DEMO, `update fo_signer set signed_at = now() where id = '${e1.c1}'`, /fo_signer_signed_check/));
  ok("FO-6 fail: the firm cannot sign before every client (an out-of-order webhook changes nothing)", (() => {
    sql(DEMO, sign(e1.c1));
    return refused(DEMO, sign(e1.f), /firm signs last/) && sql(DEMO, `select signed_at is null from fo_signer where id = '${e1.f}'`) === "t";
  })());
  ok("FO-6 fail: CLIENT_SIGNED and evidence wait for every client", refused(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${e1.r}'`, /every client/)
    && refused(DEMO, evidence(e1.r), /every signer of a live request/));
  ok("FO-6 fail: a request a client signed never expires (BR-16)", refused(DEMO, `update fo_signature_request set status = 'EXPIRED' where id = '${e1.r}'`, /never expires/));
  ok("FO-6 pass and fail: a request with no client signature expires on its day, never before it (review m5)", (() => { const e = envelope(); const early = refused(DEMO, `update fo_signature_request set status = 'EXPIRED' where id = '${e.r}'`, /fo_signature_request_expired_check/);
    sql(DEMO, `update fo_signature_request set status = 'EXPIRED', ended_at = expires_at where id = '${e.r}'`); return early && sql(DEMO, `select status || ':' || (ended_at is not null) from fo_signature_request where id = '${e.r}'`) === "EXPIRED:true"; })());
  ok("FO-6 fail: a signer who signed does not change, and consent is written once", refused(DEMO, `update fo_signer set declined_at = now() where id = '${e1.c1}'`, /signed or declined does not change|signed_check/)
    && (() => { const e = envelope(); sql(DEMO, `update fo_signer set consent_text_version = 'esign-consent-v1', consented_at = now() where id = '${e.c1}'`);
      return refused(DEMO, `update fo_signer set consent_text_version = 'esign-consent-v2' where id = '${e.c1}'`, /written once/); })());
  ok("FO-6 pass: every client, then the firm, then the evidence, then SIGNED", (() => {
    sql(DEMO, sign(e1.c2)); sql(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${e1.r}'`);
    const early = refused(DEMO, `update fo_signature_request set status = 'SIGNED' where id = '${e1.r}'`, /every signature and the stored evidence/);
    sql(DEMO, sign(e1.f)); sql(DEMO, evidence(e1.r)); sql(DEMO, `update fo_signature_request set status = 'SIGNED' where id = '${e1.r}'`);
    return early && sql(DEMO, `select status || ':' || (ended_at is not null) from fo_signature_request where id = '${e1.r}'`) === "SIGNED:true";
  })());
  ok("FO-6 fail: a SIGNED request is final: no cancel, no decline, no change to its signers or evidence", refused(DEMO, `update fo_signature_request set status = 'CANCELLED', cancel_reason = 'WITHDRAWN' where id = '${e1.r}'`, /is final/)
    && refused(DEMO, `update fo_signer set viewed_at = now() where id = '${e1.c1}'`, /final|does not change/) && refused(DEMO, `update fo_signing_evidence set audit_sha256 = '${sha("z")}' where request_id = '${e1.r}'`, /never changes/)
    && refused(DEMO, evidence(e1.r), /every signer of a live request|fo_signing_evidence_firm_id_request_id_key|is final/));
  ok("FO-6 fail: a status cannot move backward or skip (SENT → SIGNED)", (() => { const e = envelope(); return refused(DEMO, `update fo_signature_request set status = 'SIGNED' where id = '${e.r}'`, /not a signing move/)
    && (sql(DEMO, `update fo_signature_request set status = 'VIEWED' where id = '${e.r}'`), refused(DEMO, `update fo_signature_request set status = 'SENT' where id = '${e.r}'`, /not a signing move/)); })());
  ok("FO-6 fail: who signs, the document and the expiry never change", (() => { const e = envelope(); return refused(DEMO, `update fo_signature_request set expires_at = expires_at + interval '1 day' where id = '${e.r}'`, /only the status/) && refused(DEMO, `update fo_signature_request set document_id = gen_random_uuid() where id = '${e.r}'`, /only the status/) && refused(DEMO, `update fo_signer set person_id = gen_random_uuid() where id = '${e.c1}'`, /never change/); })());
  ok("FO-6 fail: a declined request ends for all: no signer changes after it", (() => { const e = envelope(); sql(DEMO, `update fo_signer set declined_at = now() where id = '${e.c1}'`); sql(DEMO, `update fo_signature_request set status = 'DECLINED' where id = '${e.r}'`);
    return refused(DEMO, sign(e.c2), /final/); })());
  ok("FO-6 fail: the email code's tries stop at 6, and a code needs its expiry", (() => { const e = envelope(); return refused(DEMO, `update fo_signer set code_failures = 7 where id = '${e.c1}'`, /code_check/) && refused(DEMO, `update fo_signer set code_sha256 = '${sha("1")}' where id = '${e.c1}'`, /code_check/)
    && sql(DEMO, `update fo_signer set code_sha256 = '${sha("123456")}', code_expires_at = now() + interval '10 minutes', code_failures = 6, locked_until = now() + interval '15 minutes' where id = '${e.c1}' returning 1`) === "1"; })());
  ok("FO-6 pass and fail: a receipt is stored once per event and only for its own request's document", (() => {
    const e = envelope(), pd = `fake-${e.r}`, other = envelope();
    const rc = (r: string, ev: string, p = pd) => `insert into fo_signing_hook_receipt (id, firm_id, request_id, provider, provider_document_id, event_id, event_type) values (gen_random_uuid(), '${firmA}', '${r}', 'FAKE', '${p}', '${ev}', 'signed')`;
    sql(DEMO, rc(e.r, `${pd}.1`));
    return refused(DEMO, rc(e.r, `${pd}.1`), /hook_receipt_firm_id_provider_provider_document__key/) && refused(DEMO, rc(other.r, `${pd}.2`), /another request's document/);
  })());
  ok("FO-6 fail: an evidence file key outside signing/ or with .. is refused", (() => { const e = envelope(); for (const s of [e.c1, e.c2, e.f]) sql(DEMO, sign(s)); sql(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${e.r}'`);
    return refused(DEMO, evidence(e.r).replace(`'signing/${e.r}/sealed.pdf'`, `'retainers/x.pdf'`), /files_check/) && refused(DEMO, evidence(e.r).replace(`'signing/${e.r}/audit.pdf'`, `'signing/../x.pdf'`), /files_check/); })());
  ok("FO-6 fail (review M1, R2-1): CLIENT_SIGNED needs a client; evidence and SIGNED need the firm signer: a request with no signers, or clients only, never reaches SIGNED and can still be cancelled", (() => {
    const bare = req(); sql(DEMO, bare.q);
    const noClient = refused(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${bare.id}'`, /every client/);
    const r = req(); sql(DEMO, r.q); const c = signer(r.id, "CLIENT"); sql(DEMO, c.q); sql(DEMO, sign(c.id)); sql(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${r.id}'`);
    // Review R2-1: evidence on a clients-only request is refused too, so the request is never stuck (it can still be cancelled).
    const noEvidence = refused(DEMO, evidence(r.id), /every signer of a live request/);
    const noSigned = refused(DEMO, `update fo_signature_request set status = 'SIGNED' where id = '${r.id}'`, /every signature and the stored evidence/);
    sql(DEMO, `update fo_signature_request set status = 'CANCELLED', cancel_reason = 'WITHDRAWN' where id = '${r.id}'`);
    return noClient && noEvidence && noSigned;
  })());
  ok("FO-6 fail (review M2, m9): no signer is added once anyone acted, and none to a VIEWED request", (() => {
    const e = envelope(); sql(DEMO, `update fo_signer set viewed_at = now() where id = '${e.c1}'`);
    const late = refused(DEMO, signer(e.r, "CLIENT").q, /only before anyone acted/);
    sql(DEMO, `update fo_signature_request set status = 'VIEWED' where id = '${e.r}'`);
    return late && refused(DEMO, signer(e.r, "CLIENT").q, /added to a SENT request/);
  })());
  ok("FO-6 fail (review M3): a fully signed request with its evidence can only become SIGNED: no cancel, no decline", (() => {
    const e = envelope(); for (const s of [e.c1, e.c2, e.f]) sql(DEMO, sign(s)); sql(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${e.r}'`); sql(DEMO, evidence(e.r));
    return refused(DEMO, `update fo_signature_request set status = 'CANCELLED', cancel_reason = 'WITHDRAWN' where id = '${e.r}'`, /only SIGNED follows/);
  })());
  { // Review M3, R2-2: two connections. One stores the evidence and holds its transaction open; a cancel from another waits
    // for it (the evidence trigger locks the request row first), then sees the evidence and is refused.
    const e = envelope(); for (const x of [e.c1, e.c2, e.f]) sql(DEMO, sign(x)); sql(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${e.r}'`);
    const holder = spawn(join(BIN, "psql"), [urlOf(DEMO), "-v", "ON_ERROR_STOP=1", "-q", "-c", `begin; ${evidence(e.r)}; select pg_sleep(2); commit;`], { stdio: "ignore" });
    const held = new Promise<number | null>((res) => holder.on("exit", res));
    await new Promise((r) => setTimeout(r, 700));
    const t0 = Date.now(), cancelRefused = refused(DEMO, `update fo_signature_request set status = 'CANCELLED', cancel_reason = 'WITHDRAWN' where id = '${e.r}'`, /only SIGNED follows/), waited = Date.now() - t0;
    const holderExit = await held;
    ok("FO-6 fail (review M3, R2-2, two connections): a cancel racing the evidence waits for it, then is refused; the request keeps its evidence",
      holderExit === 0 && cancelRefused && waited >= 800 && sql(DEMO, `select status || ':' || (select count(*) from fo_signing_evidence where request_id = '${e.r}') from fo_signature_request where id = '${e.r}'`) === "CLIENT_SIGNED:1", { holderExit, cancelRefused, waited });
  }
  { // Devin on #2038: a REPEATABLE READ cancel whose snapshot predates the evidence fails to serialise (the evidence
    // trigger updates the request row, so the stale writer cannot act on what it no longer sees).
    const e = envelope(); for (const x of [e.c1, e.c2, e.f]) sql(DEMO, sign(x)); sql(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${e.r}'`);
    let err = "";
    const stale = spawn(join(BIN, "psql"), [urlOf(DEMO), "-v", "ON_ERROR_STOP=1", "-q", "-c", `begin isolation level repeatable read; select count(*) from fo_signature_request where id = '${e.r}'; select pg_sleep(1.5);
      update fo_signature_request set status = 'CANCELLED', cancel_reason = 'WITHDRAWN' where id = '${e.r}'; commit;`], { stdio: ["ignore", "ignore", "pipe"] });
    stale.stderr.on("data", (d) => { err += String(d); });
    const done = new Promise<number | null>((res) => stale.on("exit", res));
    await new Promise((r) => setTimeout(r, 500));
    sql(DEMO, evidence(e.r));
    const code = await done;
    ok("FO-6 fail (Devin on #2038, two connections): a REPEATABLE READ cancel with a snapshot older than the evidence fails to serialise; the request keeps its evidence",
      code !== 0 && /could not serialize/.test(err) && sql(DEMO, `select status || ':' || (select count(*) from fo_signing_evidence where request_id = '${e.r}') from fo_signature_request where id = '${e.r}'`) === "CLIENT_SIGNED:1", { code, err: err.slice(0, 200) });
  }
  ok("FO-6 fail (review M4): one provider document id names one request across all firms", refused(DEMO, req({ firm: firmB, by: repB, pdid: `fake-${e1.r}` }).q, /fo_signature_request_provider_provider_document_id_key/));
  ok("FO-6 fail (review m6): a sixth wrong code without the lock is refused", (() => { const e = envelope(); return refused(DEMO, `update fo_signer set code_failures = 6 where id = '${e.c1}'`, /code_check/); })());
  ok("FO-6 fail (review m7): evidence names the consent text the signers agreed to", (() => {
    const e = envelope(); for (const s of [e.c1, e.c2, e.f]) sql(DEMO, sign(s)); sql(DEMO, `update fo_signature_request set status = 'CLIENT_SIGNED' where id = '${e.r}'`);
    return refused(DEMO, evidence(e.r).replace(/'esign-consent-v1'\)$/, "'esign-consent-v2')"), /consent text version is the one/);
  })());
  ok("FO-6 fail (review m8): DECLINED needs a signer who declined", (() => { const e = envelope(); return refused(DEMO, `update fo_signature_request set status = 'DECLINED' where id = '${e.r}'`, /signer who declined/); })());
  ok("FO-6 fail (review m9): viewed is written once, and a signed signer of a live request does not change", (() => {
    const e = envelope(); sql(DEMO, `update fo_signer set viewed_at = now() where id = '${e.c1}'`);
    const once = refused(DEMO, `update fo_signer set viewed_at = now() + interval '1 minute' where id = '${e.c1}'`, /written once/);
    sql(DEMO, sign(e.c2));
    return once && refused(DEMO, `update fo_signer set code_failures = 1 where id = '${e.c2}'`, /signed or declined does not change/);
  })());
  ok("FO-6 fail: nothing is deleted or truncated (all four tables)", TABLES.every((t) => refused(DEMO, `delete from ${t}`, /signing records are kept/) && refused(DEMO, `truncate ${t} cascade`, /signing records are kept/)));
  ok("FO-6 fail: a staff member who sent a request cannot be deleted (RESTRICT)", refused(DEMO, `delete from platform_staff where id = '${repA}'`, /fo_signature_request_firm_id_sent_by_fkey|fo_signer_firm_id_staff_id_fkey|violates/));
  ok("FO-6: every date-time column is timestamptz", sql(DEMO, `select count(*) from information_schema.columns where table_name = any('{${TABLES.join(",")}}') and data_type in ('timestamp without time zone', 'date')`) === "0");
} finally {
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
