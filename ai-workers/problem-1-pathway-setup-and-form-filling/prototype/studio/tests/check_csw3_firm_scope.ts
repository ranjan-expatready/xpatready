// CS-W3 part 1 (Release 1 row R1.3; brief build-lead-c-briefs/CS-W3-1.md; spec design/cs-w3-spike-2026-11-16.md "Part 1's
// brief lines"; contract v0.1 §8 step 5b; P-575, P-588 (4)): the case side's door. Each named test has a pass and a fail.
//   1. a scratch database with every migration: the four lookups under forced walls with no firm set (DW2, DW3), and
//      xr_case_lookup's rights (DW8).
//   2. the door's decisions without a server (features/case-firm-door.ts passDoor with stand-in lookups): DW1's list
//      refusal, DW3's 409, DW9's "never overwrite another firm" (no route reaches it today: a firm's address serves only
//      public paths, PF-25), the link's session-before-token order.
//   3. the isolated copy this suite runs on, with the spike's walls on every case-side table that has firm_id
//      (tests/fixtures/csw3/csw3-spike-walls.sql, applied by this suite): DW1-DW4, DW9's send, DW10, through the API.
//   4. the census: the case-side files that query a case table (csw3-spike.sh census) are all on the allow-list, which
//      only shrinks (part 2 takes files off it); a planted unscoped file fails it.
// Needs Visitor visa released on the copy (it runs tests/runtime/setup_visitor_visa.ts when missing). No model call, US$0.
//   zsh studio/tools/isolated.sh rt_csw3 4496 start && tsx studio/tests/check_csw3_firm_scope.ts 4496 xr_studio_rt_csw3
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HttpException } from "@nestjs/common";
import { passDoor, TwoFirms, type DoorLookups } from "../api/src/features/case-firm-door.ts";
import { currentFirm, inRequest, setRequestFirm } from "../api/src/platform/firm-scope.ts";

const PORT = process.argv[2] ?? "4496", DBNAME = process.argv[3] ?? "xr_studio_rt_csw3", BASE = `http://127.0.0.1:${PORT}`;
const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations");
const BIN = "/opt/homebrew/opt/postgresql@18/bin", HOST = "127.0.0.1:54329", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const urlOf = (db: string, user = "xr_studio") => `postgresql://${user}@${HOST}/${db}`;
const sqlIn = (db: string, q: string, user?: string) => execFileSync(join(BIN, "psql"), [urlOf(db, user), "-X", "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const errIn = (db: string, q: string, user?: string) => { try { sqlIn(db, q, user); return ""; } catch (e) { return String((e as { stderr?: string }).stderr ?? e); } };
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 600)}` : ""}`); };
const sha = (x: string) => createHash("sha256").update(x).digest("hex");
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const FNS = ["case_firm_id_of_key(text)", "case_firm_of_case(uuid)", "case_firm_of_link(text)", "case_firm_of_link_session(text)", "case_firm_of_client(text)"];

// ------------------------------------------------------------------------------------------ 1. the scratch database
function scratch() {
  const DB = `xr_studio_csw3_mig_${process.pid}`, sql = (q: string, user?: string) => sqlIn(DB, q, user), err = (q: string, user?: string) => errIn(DB, q, user);
  execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]);
  execFileSync(join(BIN, "createdb"), [...PG, DB]);
  try {
    for (const d of readdirSync(MIG).filter((x) => /^\d{14}_/.test(x)).sort()) execFileSync(join(BIN, "psql"), [urlOf(DB), "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
    const [W, CMB, F1, F2, K1, K2, K4, L1, S1] = [u(1), u(2), u(3), u(4), u(11), u(12), u(14), u(21), u(31)];
    const H1 = sha("link-token-1"), HS1 = sha("session-token-1");
    // The rows the lookups read, written as a restore would (triggers and keys off); then the walls forced with no policy
    // for the app, so a plain read as xr_app with no firm set sees nothing.
    sql(`set session_replication_role = replica;
      insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values ('${F1}', 'sample-firm', 'Sample Firm', 'CA', 'a@sample-firm.example.com', now()), ('${F2}', 'sample-solo', 'Sample Solo', 'CA', 'a@sample-solo.example.com', now());
      insert into runtime_case (id, workspace_id, combination_id, reference, client_actor_id, created_by, firm_key, case_number, firm_id, client_id) values
        ('${K1}', '${W}', '${CMB}', 'W3-1', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001', '${F1}', '${u(41)}'), ('${K2}', '${W}', '${CMB}', 'W3-2', 'user-Q', 'user-S', 'sample-solo', 'C-2026-00001', '${F2}', '${u(42)}');
      insert into person_link (id, workspace_id, case_id, subject_id, address, address_masked, address_given_by, token_hash, sent_by, expires_at) values ('${L1}', '${W}', '${K1}', '${u(51)}', 'a@example.com', 'a…@example.com', 'user-P', '${H1}', 'user-P', now() + interval '1 day');
      insert into person_link_session (id, link_id, token_hash, expires_at) values ('${S1}', '${L1}', '${HS1}', now() + interval '1 hour');
      alter table runtime_case enable row level security; alter table runtime_case force row level security;
      alter table person_link enable row level security; alter table person_link force row level security;
      alter table person_link_session enable row level security; alter table person_link_session force row level security;`);
    const app = (q: string) => sql(q, "xr_app"), firmOf = (f: string, arg: string) => app(`select coalesce(case_lookup.${f}(${arg})::text, 'none')`);

    // DW2: the link lookups.
    ok("CS-W3 DW2 (setup): as xr_app with no firm set, person_link, person_link_session and runtime_case read nothing (forced walls)",
      app(`select (select count(*) from person_link) + (select count(*) from person_link_session) + (select count(*) from runtime_case)`) === "0");
    ok("CS-W3 DW2 pass: the link token's and the session token's hashes each give the firm of the link's case, with no firm set",
      firmOf("case_firm_of_link", `'${H1}'`) === F1 && firmOf("case_firm_of_link_session", `'${HS1}'`) === F1);
    ok("CS-W3 DW2 fail: an unknown, empty, null, wildcard or injected hash gives nothing, and a link hash is no session hash (and back)",
      ["''", "null", "'%'", `'${sha("nope")}'`, `'${H1}'' or ''1''=''1'`, `upper('${H1}')`].every((h) => firmOf("case_firm_of_link", h) === "none" && firmOf("case_firm_of_link_session", h) === "none")
      && firmOf("case_firm_of_link_session", `'${H1}'`) === "none" && firmOf("case_firm_of_link", `'${HS1}'`) === "none");
    ok("CS-W3 DW2 fail: the app cannot read the tables through the lookup's policy (a SELECT on person_link_session as xr_app is still empty)",
      app(`select count(*) from person_link_session where token_hash = '${HS1}'`) === "0");

    // DW3: the case and client lookups.
    ok("CS-W3 DW3 pass: a case's firm, and a client's firm when their cases are in one firm", firmOf("case_firm_of_case", `'${K1}'`) === F1 && firmOf("case_firm_of_client", "'user-P'") === F1 && firmOf("case_firm_of_client", "'user-Q'") === F2);
    ok("CS-W3 DW3 fail: an unknown case or client gives nothing", firmOf("case_firm_of_case", `'${u(99)}'`) === "none" && firmOf("case_firm_of_client", "'user-Z'") === "none" && firmOf("case_firm_of_client", "'%'") === "none");
    sql(`set session_replication_role = replica; insert into runtime_case (id, workspace_id, combination_id, reference, client_actor_id, created_by, firm_key, case_number, firm_id, client_id) values ('${K4}', '${W}', '${CMB}', 'W3-4', 'user-P', 'user-S', 'sample-solo', 'C-2026-00002', '${F2}', '${u(43)}')`);
    const two = err(`select case_lookup.case_firm_of_client('user-P')`, "xr_app");
    ok("CS-W3 DW3 fail (ruling 1): a client whose cases are in two firms gets cardinality_violation (21000), never one firm or a list",
      /more than one firm/.test(two) && sql(`select 1 from pg_proc where proname = 'case_firm_of_client' and prosrc ~ '21000'`) === "1" && firmOf("case_firm_of_case", `'${K4}'`) === F2, two);

    // DW8: xr_case_lookup's rights.
    const R = "xr_case_lookup";
    const owned = sql(`select string_agg(n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proowner = '${R}'::regrole`);
    ok("CS-W3 DW8 pass: xr_case_lookup owns exactly the five lookup functions (CS-W1's one and these four), all in case_lookup",
      owned === "case_lookup.case_firm_id_of_key(key text),case_lookup.case_firm_of_case(case_id uuid),case_lookup.case_firm_of_client(actor text),case_lookup.case_firm_of_link(token_hash text),case_lookup.case_firm_of_link_session(token_hash text)", owned);
    const defs = sql(`select string_agg(p.proname || ':' || p.prosecdef || ':' || array_to_string(p.proconfig, ';'), ' | ' order by p.proname) from pg_proc p where p.proowner = '${R}'::regrole`);
    ok("CS-W3 DW8 pass: each is SECURITY DEFINER with search_path pinned, pg_temp last (pg_proc.proconfig)",
      defs.split(" | ").length === 5 && defs.split(" | ").every((d) => d.endsWith(":true:search_path=pg_catalog, public, case_lookup, pg_temp")), defs);
    ok("CS-W3 DW8 pass: it cannot log in, is no superuser, passes no wall and owns no table",
      sql(`select rolcanlogin::text || rolsuper || rolbypassrls || (select count(*) from pg_class where relowner = r.oid) from pg_roles r where rolname = '${R}'`) === "falsefalsefalse0");
    ok("CS-W3 DW8 fail: it holds no INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES or table-wide SELECT anywhere",
      sql(`select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind in ('r', 'p', 'v') and n.nspname not in ('pg_catalog', 'information_schema')
        and (has_table_privilege('${R}', c.oid, 'INSERT') or has_table_privilege('${R}', c.oid, 'UPDATE') or has_table_privilege('${R}', c.oid, 'DELETE') or has_table_privilege('${R}', c.oid, 'TRUNCATE') or has_table_privilege('${R}', c.oid, 'REFERENCES') or has_table_privilege('${R}', c.oid, 'SELECT'))`) === "0");
    const cols = sql(`select string_agg(table_name || '.' || column_name, ',' order by table_name, column_name) from information_schema.column_privileges where grantee = '${R}' and privilege_type = 'SELECT'`);
    ok("CS-W3 DW8 pass: its only column SELECTs are the ones the lookups read, person_link.id among them",
      cols === "person_link.case_id,person_link.id,person_link.token_hash,person_link_session.link_id,person_link_session.token_hash,platform_firm.id,platform_firm.key,runtime_case.client_actor_id,runtime_case.firm_id,runtime_case.id"
      && sql(`select count(*) from information_schema.column_privileges where grantee = '${R}' and privilege_type <> 'SELECT'`) === "0", cols);
    const pols = sql(`select string_agg(c.relname || ':' || p.polname || ':' || p.polcmd::text || ':' || pg_get_expr(p.polqual, p.polrelid) || ':' || array_to_string(p.polroles::regrole[], '+'), ',' order by c.relname) from pg_policy p join pg_class c on c.oid = p.polrelid where c.relname in ('runtime_case', 'person_link', 'person_link_session')`);
    ok("CS-W3 DW8 pass: one role-only policy on each table the lookups read, for xr_case_lookup's reads only",
      pols === "person_link:case_lookup_read:r:true:xr_case_lookup,person_link_session:case_lookup_read:r:true:xr_case_lookup,runtime_case:case_lookup_read:r:true:xr_case_lookup", pols);
    ok("CS-W3 DW8 fail: no CREATE on public; PUBLIC holds no EXECUTE on any of the five; xr_data's members do",
      sql(`select has_schema_privilege('${R}', 'public', 'CREATE')`) === "f"
      && FNS.every((f) => sql(`select has_function_privilege('public', 'case_lookup.${f}', 'EXECUTE')::text || has_function_privilege('xr_app', 'case_lookup.${f}', 'EXECUTE')`) === "falsetrue"));
    ok("CS-W3 DW8 fail: the app's SET ROLE xr_case_lookup is refused, and signing in as it is refused",
      /permission denied to set role "xr_case_lookup"/.test(err(`set role ${R}`, "xr_app")) && /not permitted to log in/i.test(err("select 1", R)));
  } finally { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]); }
}

// --------------------------------------------------------------------------------- 2. the door's decisions, no server
async function decisions() {
  const [A, B] = [u(101), u(102)], calls: string[] = [];
  const look = (o: Partial<DoorLookups> = {}): DoorLookups => ({
    ofActor: async (a) => { calls.push(`actor:${a.id}`); return a.id === "user-O" ? A : a.id === "user-S" ? B : null; },
    ofCase: async (id) => { calls.push(`case:${id}`); return id === u(11) ? A : null; },
    ofClient: async (id) => { calls.push(`client:${id}`); return id === "user-P" ? A : null; },
    ofLink: async (h) => { calls.push(`link:${h.slice(0, 6)}`); return h === sha("t".repeat(43)) ? A : null; },
    ofLinkSession: async (h) => { calls.push(`session:${h.slice(0, 6)}`); return h === sha("s".repeat(43)) ? A : null; },
    ...o,
  });
  const req = (method: string, path: string, headers: Record<string, string> = {}, body?: unknown) => ({ method, path, url: path, headers, body });
  const tag = (r: object) => inRequest(r, () => currentFirm());
  const status = async (r: ReturnType<typeof req>, l = look()) => { try { await passDoor(r, l); return 0; } catch (e) { return e instanceof HttpException ? e.getStatus() : -1; } };

  const staff = req("GET", "/api/runtime/cases", { "x-actor": "user-O" });
  ok("CS-W3 DW1 pass (door): a staff request is tagged with that person's firm", (await status(staff)) === 0 && tag(staff) === A);
  const noFirmList = req("GET", "/api/runtime/cases", { "x-actor": "user-O" }), noFirmCase = req("GET", `/api/runtime/cases/${u(11)}`, { "x-actor": "user-O" });
  const none = look({ ofActor: async () => null });
  ok("CS-W3 DW1 fail (door): a person with the case duty but no firm is refused the case list (403 NO_FIRM), never an empty 200; a case route is left untagged and answers as today (404 once walled)",
    (await status(noFirmList, none)) === 403 && (await status(noFirmCase, none)) === 0 && tag(noFirmCase) === undefined);
  const client = req("GET", `/api/runtime/cases/${u(11)}/people`, { "x-actor": "user-P" }), clientOther = req("GET", "/api/runtime/openable", { "x-actor": "client" });
  ok("CS-W3 DW3 pass (door): a client with a case in the path gets that case's firm; without one, the firm of their cases",
    (await status(client)) === 0 && tag(client) === A && (await status(clientOther)) === 0 && tag(clientOther) === A && calls.includes(`case:${u(11)}`) && calls.includes("client:user-P"));
  const two = look({ ofClient: async () => { throw new TwoFirms(); } });
  ok("CS-W3 DW3 fail (door, ruling 1): a client whose cases are in two firms gets 409 on a route with no case in its path",
    (await status(req("GET", "/api/runtime/openable", { "x-actor": "user-P" }), two)) === 409);
  const before = calls.length, clientList = { ...req("GET", "/api/runtime/cases", { "x-actor": "user-P" }), url: "/api/runtime/cases?client=user-Q" };
  const clientListTwo = req("GET", "/api/runtime/cases", { "x-actor": "user-P" });
  ok("CS-W3 DW3 fail (door, bk3 BR-1): on the case list a client is never looked up, tagged or refused by the door (never 409 or NO_FIRM), even with cases in two firms: the handler's own 403 answers",
    (await status(clientList)) === 0 && tag(clientList) === undefined && calls.length === before && (await status(clientListTwo, two)) === 0 && tag(clientListTwo) === undefined);
  const forged = req("GET", "/api/runtime/cases", { "x-actor": "user-O", "x-firm-id": B }, { firmId: B });
  ok("CS-W3 DW1 fail (door): a firm id the caller typed (a header, a body field) is never read: the tag is the person's own firm", (await status(forged)) === 0 && tag(forged) === A);
  const unknown = req("GET", "/api/runtime/cases", { "x-actor": "nobody" }), outside = req("GET", "/api/combinations", { "x-actor": "user-O" }), demo = req("POST", "/api/demo/reset", { "x-actor": "user-A" });
  ok("CS-W3 door: an unknown person, a configuration route and a demo route are left as they are (no tag, no refusal)",
    (await status(unknown)) === 0 && tag(unknown) === undefined && (await status(outside)) === 0 && tag(outside) === undefined && (await status(demo)) === 0 && tag(demo) === undefined);

  const sess = req("GET", "/api/link/me", { authorization: `Bearer ${"s".repeat(43)}` }, { token: "x".repeat(43) });
  const tok = req("POST", "/api/link/code/send", {}, { token: "t".repeat(43) }), badTok = req("POST", "/api/link/code/send", {}, { token: "short" });
  const tokWithStray = req("POST", "/api/link/open", { authorization: `Bearer ${"z".repeat(43)}` }, { token: "t".repeat(43) });
  ok("CS-W3 DW2 pass (door): a session route is tagged from its session only (a body token is never read there); a token door from the token's own hash",
    (await status(sess)) === 0 && tag(sess) === A && !calls.includes(`link:${sha("x".repeat(43)).slice(0, 6)}`) && (await status(tok)) === 0 && tag(tok) === A);
  ok("CS-W3 DW2 fail (door, breaker m1): on open, code/send and code a stray or unknown session header never picks the firm; the body token does",
    (await status(tokWithStray)) === 0 && tag(tokWithStray) === A && !calls.includes(`session:${sha("z".repeat(43)).slice(0, 6)}`));
  ok("CS-W3 DW2 fail (door): a malformed token is never looked up and leaves the request untagged (the route's own 404 or 401 as today)",
    (await status(badTok)) === 0 && tag(badTok) === undefined && !calls.some((c) => c === `link:${sha("short").slice(0, 6)}`));

  const tagged = req("POST", "/api/link/code/send", {}, { token: "t".repeat(43) });
  setRequestFirm(tagged, B);   // as PF-25's host routing would on firm B's own address
  ok("CS-W3 DW9 fail (door): a request already carrying another firm is refused (404) and keeps its firm, never overwritten", (await status(tagged)) === 404 && tag(tagged) === B);
  const same = req("POST", "/api/link/code/send", {}, { token: "t".repeat(43) });
  setRequestFirm(same, A);
  ok("CS-W3 DW9 pass (door): the same firm already set passes and stays", (await status(same)) === 0 && tag(same) === A);
}

// ------------------------------------------------------------------------------------------ 3. the API, walls on
type Res = { status: number; body: any };
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-O", auth?: string): Promise<Res> => {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (actor) h["x-actor"] = actor;
  if (auth) h.authorization = `Bearer ${auth}`;
  const r = await fetch(`${BASE}/api${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let b: any = text; try { b = JSON.parse(text); } catch { /* text */ }
  return { status: r.status, body: b };
};
const sql = (q: string, user?: string) => sqlIn(DBNAME, q, user);
const yearsAgo = (y: number) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };
const inbox = async (address: string) => ((await call("GET", `/demo/inbox?address=${encodeURIComponent(address)}`, undefined, null)).body?.messages ?? []) as { kind: string; link?: string; body?: string }[];
const tokenIn = (m: { kind: string; link?: string }[]) => /#t=([A-Za-z0-9_-]{43})/.exec(m.find((x) => x.kind === "link")?.link ?? "")?.[1] ?? "";
const codeIn = (m: { kind: string; body?: string }[]) => (/code is (\d{3}) (\d{3})/.exec(m.find((x) => x.kind === "code")?.body ?? "") ?? []).slice(1).join("");
const until = async (f: () => Promise<boolean> | boolean, ms = 30_000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await f()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };

async function api() {
  const openable = async () => ((await call("GET", "/runtime/openable")).body ?? []).find((r: { combination: string; startable: boolean }) => /Visitor visa/.test(r.combination) && r.startable);
  let vv = await openable();
  if (!vv) {
    execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), PORT, DBNAME], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 });
    vv = await openable();
  }
  if (!vv) { console.error("STOP  Visitor visa could not be released on this copy"); process.exit(2); }
  const run = Date.now().toString(36);
  const open = async (actor: string, client: string, tag: string) => {
    const c = await call("POST", "/runtime/cases", { combinationId: vv.combination_id, reference: `CSW3-${tag}-${run}`, clientActor: client, principal: { displayName: "Sample Client" } }, actor);
    return { status: c.status, id: c.body?.id as string, P: c.body?.people?.find((x: { role: string }) => x.role === "principal")?.subject_id as string };
  };
  // Before the walls: one case of each Sample firm (Client A at the firm, Client B at the solo practice).
  const k1 = await open("user-O", "user-P", "k1"), k2 = await open("user-S", "user-Q", "k2");
  ok("CS-W3 (setup): a case of each Sample firm opens before the walls", k1.status === 201 && k2.status === 201 && sql(`select count(distinct firm_id) from runtime_case where id in ('${k1.id}', '${k2.id}')`) === "2", [k1.status, k2.status]);
  execFileSync(join(BIN, "psql"), [urlOf(DBNAME), "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", join(STUDIO, "tests", "fixtures", "csw3", "csw3-spike-walls.sql")], { stdio: ["ignore", "ignore", "pipe"] });
  ok("CS-W3 (setup): the walls are on (7 case-side tables forced), and as xr_app with no firm set the cases read nothing",
    sql(`select count(*) from pg_class where relname in ('runtime_case', 'case_stage', 'firm_case_counter', 'case_decision', 'case_party_index', 'filing', 'party') and relrowsecurity and relforcerowsecurity`) === "7"
    && sql(`select count(*) from runtime_case`, "xr_app") === "0");

  // DW1: staff.
  const list = await call("GET", "/runtime/cases"), ids = (list.body?.cases ?? []).map((c: { id: string }) => c.id);
  const own = await call("GET", `/runtime/cases/${k1.id}`), other = await call("GET", `/runtime/cases/${k2.id}`), solo = await call("GET", `/runtime/cases/${k2.id}`, undefined, "user-S");
  ok("CS-W3 DW1 pass: with the walls on, the firm's officer lists and reads the firm's case, and the solo representative theirs",
    list.status === 200 && ids.includes(k1.id) && own.status === 200 && solo.status === 200, { list: list.status, own: own.status, solo: solo.status });
  ok("CS-W3 DW1 fail: the other firm's case is 404 (\"No such case.\") and never in the list", other.status === 404 && /No such case/.test(other.body?.detail ?? "") && !ids.includes(k2.id), other);
  const authorList = await call("GET", "/runtime/cases", undefined, "user-A");
  ok("CS-W3 DW1 fail: a person with no firm gets the door's 403 (NO_FIRM) on the case list, never an empty 200", authorList.status === 403 && authorList.body?.code === "NO_FIRM" && !Array.isArray(authorList.body?.cases), authorList);
  const opened = await open("user-O", "user-P", "walls");
  ok("CS-W3 DW1 pass: with the walls on, the officer opens a case (the first write, party, goes through: the spike's cause 1 is gone)", opened.status === 201 && sql(`select firm_key from runtime_case where id = '${opened.id}'`) === "sample-firm", opened);

  // DW3: the simulated client.
  const pOwn = await call("GET", `/runtime/cases/${k1.id}`, undefined, "user-P"), pOther = await call("GET", `/runtime/cases/${k2.id}`, undefined, "user-P");
  const pNoCase = await call("GET", "/runtime/openable", undefined, "user-P");
  // GET /runtime/openable refuses a client in its handler today (403, no case duty); the door must pass it through for
  // their one firm, so the answer is that handler's 403, never the door's 409 or NO_FIRM (the 409 is asserted below).
  ok("CS-W3 DW3 pass: the client reaches their own case with the walls on, and a route with no case in its path passes the door for their one firm (the handler's own answer, as today)",
    pOwn.status === 200 && pNoCase.status === 403 && !["CLIENT_IN_TWO_FIRMS", "NO_FIRM"].includes(pNoCase.body?.code), { own: pOwn.status, noCase: pNoCase.status, code: pNoCase.body?.code });
  ok("CS-W3 DW3 fail: another person's case is still 404", pOther.status === 404, pOther.status);

  // DW2 and DW9: a link and its session, with the walls on.
  const auditBefore = Number(sql(`select count(*) from audit_event where case_id = '${k1.id}'`));
  const added = await call("POST", `/runtime/cases/${k1.id}/people`, { role: "spouse_or_partner", displayName: "Sample Partner" });
  const auditAfter = Number(sql(`select count(*) from audit_event where case_id = '${k1.id}'`));
  const S = added.body?.subject_id as string;
  for (const [s, d] of [[k1.P, yearsAgo(40)], [S, yearsAgo(38)]]) await call("PUT", `/runtime/cases/${k1.id}/answers/${s}/person.date_of_birth`, { value: d, expectedId: null });
  const A = `partner.w3.${run}@example.com`;
  const sent = await call("POST", `/runtime/cases/${k1.id}/people/${S}/link`, { address: A }, "user-P");
  await until(async () => !!tokenIn(await inbox(A)));
  const t = tokenIn(await inbox(A));
  const codeSent = await call("POST", "/link/code/send", { token: t }, null);
  await until(async () => !!codeIn(await inbox(A)));
  const verified = await call("POST", "/link/code", { token: t, code: codeIn(await inbox(A)) }, null), session = verified.body?.session as string;
  ok("CS-W3 DW9 pass: with the walls on, \"Send to …\" and \"Send me a code\" work for the link's own case (PF-19r reads the case after the door set its firm)",
    sent.status < 300 && !!t && codeSent.status === 200 && verified.status < 300 && !!session, { sent: sent.status, codeSent: codeSent.status, verified: verified.status });
  const me = await call("GET", "/link/me", undefined, null, session), consent = await call("POST", "/link/consent", undefined, null, session);
  const q1 = await call("GET", `/link/cases/${k1.id}/people/${S}/questionnaire`, undefined, null, session), q2 = await call("GET", `/link/cases/${k2.id}/people/${S}/questionnaire`, undefined, null, session);
  ok("CS-W3 DW2 pass: the link session reads its own person's questions with the walls on", me.status === 200 && consent.status < 300 && q1.status === 200, { me: me.status, consent: consent.status, q1: q1.status, body: q1.body });
  ok("CS-W3 DW2 fail: the session never reaches another firm's case (404), an unknown token is 404 and an unknown session 401, as today",
    q2.status === 404 && (await call("POST", "/link/code/send", { token: "A".repeat(43) }, null)).status === 404 && (await call("GET", "/link/me", undefined, null, "B".repeat(43))).status === 401, q2);

  // DW4: two firms' requests interleaved never swap firms.
  const mixed = await Promise.all(Array.from({ length: 100 }, (_, i) => i % 2 ? call("GET", `/runtime/cases/${k2.id}`, undefined, "user-S") : call("GET", `/runtime/cases/${k1.id}`)));
  const swapped = mixed.filter((r, i) => r.status !== 200 || r.body?.id !== (i % 2 ? k2.id : k1.id));
  ok("CS-W3 DW4 pass: 100 interleaved requests of the two firms each read their own firm's case (a swapped firm would read 404 under the walls)", swapped.length === 0, swapped.slice(0, 3).map((r) => r.status));
  const crossed = await Promise.all(Array.from({ length: 40 }, (_, i) => i % 2 ? call("GET", `/runtime/cases/${k1.id}`, undefined, "user-S") : call("GET", `/runtime/cases/${k2.id}`)));
  ok("CS-W3 DW4 fail: interleaved requests for the other firm's case are each 404, never one that slipped through", crossed.every((r) => r.status === 404), crossed.map((r) => r.status).filter((s) => s !== 404));

  // DW10: AUD-1m's case id on a case route's audit line.
  ok("CS-W3 DW10 pass: with the walls on, the audit line of adding a person (a case route) carries its case id (core.ts caseIdOf reads the case as the door's firm)", added.status < 300 && auditAfter > auditBefore, { added: added.status, auditBefore, auditAfter });
  ok("CS-W3 DW10 fail: the same read with no firm set finds no case (what caseIdOf would get without the door, so the line would lose its case id)",
    sql(`select count(*) from runtime_case where id = '${k1.id}'`, "xr_app") === "0");

  // DW3 (ruling 1): Client A with a case at each firm.
  const k3 = await open("user-S", "user-P", "k3");
  const pList = await call("GET", "/runtime/cases", undefined, "user-P"), pNoCase2 = await call("GET", "/runtime/openable", undefined, "user-P"), pOwn2 = await call("GET", `/runtime/cases/${k1.id}`, undefined, "user-P");
  ok("CS-W3 DW3 fail (ruling 1): a client whose cases are in two firms gets 409 on a route with no case in its path, never an empty or mixed 200",
    k3.status === 201 && pNoCase2.status === 409 && pNoCase2.body?.code === "CLIENT_IN_TWO_FIRMS", { k3: k3.status, noCase: pNoCase2.status });
  // bk3 BR-1 (Lead 15, run 44898779984): a client asking the case list for anyone's cases (their own, another client's,
  // or a client with none) is refused 403 "not allowed", never 409, and the answer is the same whatever exists.
  const lOwn = await call("GET", "/runtime/cases?client=user-P", undefined, "user-P"), lOther = await call("GET", "/runtime/cases?client=user-Q", undefined, "user-P");
  const lNobody = await call("GET", "/runtime/cases?client=nobody-at-all", undefined, "user-P");
  const same = (r: Res) => JSON.stringify({ s: r.status, b: r.body });
  ok("CS-W3 DW3 fail (bk3 BR-1): a client with cases in two firms asking the case list for their own, another client's or no one's cases gets 403 each time, never 409, never a list",
    [pList, lOwn, lOther, lNobody].every((r) => r.status === 403 && !Array.isArray(r.body?.cases) && !["CLIENT_IN_TWO_FIRMS", "NO_FIRM"].includes(r.body?.code)), [pList, lOwn, lOther, lNobody].map((r) => r.status));
  ok("CS-W3 DW3 fail (bk3 BR-1): the refusal is word for word the same whether or not the cases asked for exist or are the client's (no hint)",
    same(lOwn) === same(lOther) && same(lOther) === same(lNobody) && same(pList) === same(lOwn), [lOwn, lOther, lNobody].map((r) => r.body));
  ok("CS-W3 DW3 pass (ruling 1): that client still opens each of their cases by its own address", pOwn2.status === 200 && (await call("GET", `/runtime/cases/${k3.id}`, undefined, "user-P")).status === 200);
}

// ------------------------------------------------------------------------------------------------- 4. the census
// The 42 files of the spike's re-census (cs-w3-spike-2026-11-16.md, revision 3), plus five merged on main after the
// spike: case-clients/prospect-won (FO-8), case-clients/client-link and case-clients/live (CS-K1 part 2; live.ts already
// sets its firm per client), case-deadlines/reminders and features/case-milestones (CS-DL3 part 1). Paths relative to api/src. Only shrinks: part 2 and part 3 take files off as their areas run
// with the walls on.
const ALLOW = `case-clients/prospect-won case-clients/client-link case-clients/live case-deadlines/reminders features/case-milestones assessments case-changes case-checklist case-close case-count case-documents case-filings case-prepare case-stages case-work clients
  core demo document-review-counts earlier-facts employer-link filing-changes filing-record fill-case findings finished-story form-additions
  form-library health person-link readiness-inputs readiness release-update review-rounds review-runs review-stamp routes-data runtime
  sample-case sample-validated sign-steps stage-scope studio submission-record submission team where-used`.split(/\s+/).map((f) => `api/src/${f}.ts`);
function census() {
  const listed = () => execFileSync("bash", [join(STUDIO, "tests", "fixtures", "csw3", "csw3-spike.sh"), "census"], { encoding: "utf8" }).split("\n").slice(2).filter(Boolean).map((l) => l.split("\t")[0]);
  const now = listed(), extra = now.filter((f) => !ALLOW.includes(f));
  ok("CS-W3 census pass: every case-side file that queries a case table is on the allow-list (47 at part 1)", ALLOW.length === 47 && extra.length === 0, extra);
  const planted = join(STUDIO, "api", "src", `zz-csw3-planted-${process.pid}.ts`);
  writeFileSync(planted, "// a throwaway file the census must catch\nexport const x = (db: any) => db.case.findMany({});\n");
  try {
    execFileSync("git", ["-C", STUDIO, "add", "-N", planted]);   // git grep sees tracked files only: intent-to-add, undone below
    const caught = listed().filter((f) => !ALLOW.includes(f));
    ok("CS-W3 census fail: a new case-side file with an unscoped case query, not on the list, fails the census", caught.length === 1 && caught[0].endsWith(`zz-csw3-planted-${process.pid}.ts`), caught);
  } finally { try { execFileSync("git", ["-C", STUDIO, "rm", "-q", "--cached", "-f", planted]); } catch { /* not added */ } rmSync(planted, { force: true }); }
}

(async () => {
  scratch();
  await decisions();
  census();
  await api();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
