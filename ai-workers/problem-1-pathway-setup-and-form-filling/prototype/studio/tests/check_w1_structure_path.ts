// W1-visual-system: POST /structure/path, the one "Add to Program structure" pop-up's write (P-127, AD-1…AD-8), against
// the server and the database, not the browser. A passing and a failing case per server rule: who may add, a level
// needs the one above, under a new name every level is new, an existing name must be found, under the level above and
// not retired, P-26 (a category with setup gets no sub-category), exact twins, everything already there, None on a
// category with sub-categories, close names (refused, or added anyway with an Activity line), where cases may be opened
// only on a category or sub-category. Every refusal writes nothing. All or nothing for real: a database trigger
// (installed in this copy's own database only, removed at the end) refuses the third new name, and the two names
// written before it in the same transaction are gone too. Four identical saves at once store one branch. Sample
// inputs; no model call (US$0).
//   zsh studio/tools/isolated.sh screens_path 4439 start && tsx studio/tests/check_w1_structure_path.ts 4439 xr_studio_screens_path
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4439), DB = process.argv[3] ?? "xr_studio_screens_path";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const names = () => Number(sql("select count(*) from program_def"));
const lines = () => Number(sql("select count(*) from audit_event"));
const add = (body: Record<string, unknown>, actor = "user-A") => call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", ...body }, actor);
/** A refusal: the status and code expected, and nothing written (no name, no Activity line). */
const refused = async (name: string, body: Record<string, unknown>, status: number, check: (b: any) => boolean = () => true, actor = "user-A") => {
  const n0 = names(), a0 = lines();
  const r = await add(body, actor);
  ok(name, r.status === status && check(r.body) && names() === n0 && lines() === a0, { status: r.status, title: r.body?.title, detail: r.body?.detail, written: names() - n0 });
  return r;
};
const PW = "retail.temporary_residence", VISITORS = "individual.visitors", OPEN = "individual.work_permits.open";

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("setup: sample inputs loaded", (await call("POST", "/demo/load")).status === 201);

  // ---------------------------------------------------------------- "Used by" counts on each line (P-127 (1), drift check 3)
  const combos = (await call("GET", "/structure?pathwayType=INDIVIDUAL")).body.nodes.filter((x: any) => x.combination?.id);
  const lmia = combos.find((x: any) => x.label === "With an LMIA")?.combination, vv = combos.find((x: any) => x.label === "Visitor visa")?.combination;
  ok("C11.3 P-127 used by pass: a released combination counts its release (With an LMIA: 1 release, 0 open cases)", lmia?.releases === 1 && lmia?.openCases === 0, lmia);
  ok("C11.3 P-127 used by fail: a combination in setup has no release and no case (Visitor visa)", vv?.releases === 0 && vv?.openCases === 0, vv);

  // ---------------------------------------------------------------- who may add (BR-15)
  await refused("C11.3 BR-15 fail: the approver cannot add (403), nothing written", { pathway: { key: PW }, program: { label: "Approver program (test)" } }, 403, undefined, "user-B");
  await refused("C11.3 BR-15 fail: a case officer cannot add (403), nothing written", { pathway: { key: PW }, program: { label: "Officer program (test)" } }, 403, undefined, "user-O");
  let n0 = names();
  let r = await add({ pathway: { key: PW }, program: { label: "Author program (test)" } });
  ok("C11.3 BR-15 pass: the configuration author adds; the path may stop at a Program (no combination)", r.status === 201 && r.body.created.length === 1 && r.body.combination === null && names() === n0 + 1, r.body);

  // ---------------------------------------------------------------- AD-1: a level needs the one above
  await refused("C11.3 AD-1 fail: a category with no program is refused on the Program field", { pathway: { key: PW }, category: { label: "Orphan (test)" } }, 400, (b) => b.errors?.[0]?.field === "program");
  await refused("C11.3 AD-2 fail: 'None' with no category is refused", { pathway: { key: PW }, program: { key: VISITORS }, subCategory: null }, 400, (b) => b.errors?.[0]?.field === "category");
  n0 = names();
  r = await add({ pathway: { key: PW }, program: { key: VISITORS }, category: { label: "Transit visa (test)" }, subCategory: null });
  const transit = r.body?.leaf?.key;
  ok("C11.3 AD-1/AD-2 pass: one new category with None is one combination, listed as Not started, no setup", r.status === 201 && r.body.created.length === 1 && r.body.combination === "Not started" && names() === n0 + 1
    && sql(`select count(*) from combination c join program_def p on p.id = c.program_def_id where p.program_node_key = '${transit}'`) === "0", r.body);

  // ---------------------------------------------------------------- AD-3: under a new name every level is new; existing names are checked
  await refused("C11.3 AD-3 fail: an existing name under a new one is refused ('Under a new name')", { pathway: { key: PW }, program: { label: "Brand-new program (test)" }, category: { key: `${VISITORS}.visitor_visa` } }, 400, (b) => b.title === "Under a new name" && b.errors?.[0]?.field === "category");
  await refused("C11.3 AD-3 fail: an unknown key is Not found (404)", { pathway: { key: PW }, program: { key: "individual.nowhere" } }, 404, (b) => b.errors?.[0]?.field === "program");
  await refused("C11.3 AD-3 fail: a name that is not under the level above is refused", { pathway: { key: "retail.citizenship" }, program: { key: VISITORS }, category: { label: "Misplaced (test)" } }, 400, (b) => b.title === "Not under the level above");
  await refused("C11.5 BR-8 fail: a Corporate Pathway cannot be used in Retail", { pathway: { key: "corporate.temporary_residence" }, program: { label: "Cross type (test)" } }, 400, (b) => b.title === "Not under the level above");
  sql("update program_def set retired_at = now() where program_node_key = 'individual.pr_documents'");
  await refused("C11.9 fail: a retired program cannot take a new category (409 Retired)", { pathway: { key: "retail.permanent_residence" }, program: { key: "individual.pr_documents" }, category: { label: "Under retired (test)" } }, 409, (b) => b.title === "Retired");
  sql("update program_def set retired_at = null where program_node_key = 'individual.pr_documents'");
  n0 = names();
  r = await add({ pathway: { key: "retail.permanent_residence" }, program: { key: "individual.pr_documents" }, category: { label: "Under restored (test)" } });
  ok("C11.9 pass: once restored, the same program takes the category", r.status === 201 && names() === n0 + 1, r.status);

  // ---------------------------------------------------------------- P-26, twins, already there, None on a category with sub-categories
  await refused("C11.3 P-26 fail: a category with its own setup gets no sub-category (409 category_has_setup)", { pathway: { key: PW }, program: { key: VISITORS }, category: { key: `${VISITORS}.visitor_visa` }, subCategory: { label: "Sub of set-up (test)" } }, 409, (b) => b.code === "category_has_setup");
  n0 = names();
  r = await add({ pathway: { key: PW }, program: { key: VISITORS }, category: { key: `${VISITORS}.extend_stay` }, subCategory: { label: "From a visitor record (test)" } });
  ok("C11.3 P-26 pass: a category without setup takes its first sub-category", r.status === 201 && names() === n0 + 1 && r.body.leaf.level === "subCategory", r.body);
  await refused("C11.3 BR-5 fail: an exact twin (case and punctuation ignored) is refused with the existing name", { pathway: { key: PW }, program: { key: VISITORS }, category: { label: "visitor VISA!" } }, 409, (b) => b.title === "Name already used" && b.existing?.label === "Visitor visa");
  await refused("C11.3 AD-7 fail: a path that is all existing names is 'Already in the structure', with its key", { pathway: { key: PW }, program: { key: VISITORS }, category: { key: `${VISITORS}.super_visa` }, subCategory: null }, 409, (b) => b.code === "exists" && b.existing?.key === `${VISITORS}.super_visa`);
  await refused("C11.3 AD-2 fail: 'None' on a category that has sub-categories asks for a sub-category (not 'already there')", { pathway: { key: PW }, program: { key: "individual.work_permits" }, category: { key: OPEN }, subCategory: null }, 400, (b) => b.title === "Choose a sub-category" && b.errors?.[0]?.field === "subCategory");

  // ---------------------------------------------------------------- BR-5 close names: refused, or added anyway with an Activity line
  await refused("C11.3 BR-5 fail: a close name ('Visiter visa') is refused with 'Did you mean'", { pathway: { key: PW }, program: { key: VISITORS }, category: { label: "Visiter visa" } }, 409, (b) => b.code === "close_names" && /Did you mean/.test(b.detail));
  n0 = names(); const a0 = lines();
  r = await add({ pathway: { key: PW }, program: { key: VISITORS }, category: { label: "Visiter visa" }, decision: "add_anyway" });
  ok("C11.3 BR-5 pass: 'add anyway' adds it and Activity says close names exist", r.status === 201 && names() === n0 + 1 && lines() === a0 + 1 && sql("select count(*) from audit_event where summary like '%Visiter visa%although close names exist%'") === "1", r.status);

  // ---------------------------------------------------------------- where cases may be opened
  await refused("C11.3 fail: 'cases may be opened from' on a Program is refused (only categories and sub-categories)", { pathway: { key: PW }, program: { label: "With places (test)" }, allowedLocations: ["inside_canada"] }, 400, (b) => b.errors?.[0]?.field === "allowedLocations");
  r = await add({ pathway: { key: PW }, program: { key: VISITORS }, category: { label: "Inside only (test)" }, subCategory: null, allowedLocations: ["inside_canada"] });
  ok("C11.3 pass: a new category keeps 'inside Canada' only", r.status === 201 && sql(`select array_to_string(allowed_locations, ',') from program_def where program_node_key = '${r.body.leaf.key}'`) === "inside_canada", r.body?.leaf);

  // ---------------------------------------------------------------- four new levels in one go, then all or nothing for real
  n0 = names();
  r = await add({ pathway: { label: "Path pathway (test)" }, program: { label: "Path program (test)" }, category: { label: "Path category (test)" }, subCategory: { label: "Path sub-category (test)" } });
  ok("C11.3 AD-6 pass: a new Pathway › Program › Category › Sub-category is written in one save, the leaf Not started", r.status === 201 && r.body.created.length === 4 && names() === n0 + 4 && r.body.combination === "Not started"
    && r.body.trail.join(" › ") === "Retail › Path pathway (test) › Path program (test) › Path category (test) › Path sub-category (test)", r.body?.trail);
  sql("create or replace function xr_test_refuse_name() returns trigger as $f$ begin if new.label = 'Refused category (test)' then raise exception 'test trigger: refused'; end if; return new; end $f$ language plpgsql");
  sql("create trigger xr_test_refuse_name before insert on program_def for each row execute function xr_test_refuse_name()");
  n0 = names(); const a1 = lines();
  r = await add({ pathway: { label: "Half pathway (test)" }, program: { label: "Half program (test)" }, category: { label: "Refused category (test)" }, subCategory: null });
  ok("C11.3 AD-6 fail (all or nothing): the database refuses the third name, so the Pathway and Program written before it are gone too", r.status === 500 && names() === n0 && lines() === a1
    && sql("select count(*) from program_def where label in ('Half pathway (test)', 'Half program (test)', 'Refused category (test)')") === "0", { status: r.status, written: names() - n0 });
  sql("drop trigger xr_test_refuse_name on program_def"); sql("drop function xr_test_refuse_name()");
  n0 = names();
  r = await add({ pathway: { label: "Half pathway (test)" }, program: { label: "Half program (test)" }, category: { label: "Refused category (test)" }, subCategory: null });
  ok("C11.3 AD-6 pass: the same save goes through once nothing refuses it (three names)", r.status === 201 && names() === n0 + 3, r.status);

  // ---------------------------------------------------------------- four identical saves at once store one branch
  n0 = names();
  const same = { pathway: { key: PW }, program: { label: "Race program (test)" }, category: { label: "Race category (test)" }, subCategory: null };
  const all = await Promise.all([1, 2, 3, 4].map(() => add(same)));
  const won = all.filter((x) => x.status === 201).length;
  ok("C11.3 race: four identical saves at once write one Program and one category; the others are told (409)", won === 1 && names() === n0 + 2 && all.filter((x) => x.status === 409).length === 3, all.map((x) => `${x.status} ${x.body?.code ?? ""}`));

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
