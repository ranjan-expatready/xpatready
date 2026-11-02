// Database-level checks for the 21 Oct grounding audit findings 1–3 (and D285 master rules), against an isolated copy
// started by tools/isolated.sh (its own database and files; the demo is never touched). No browser, no model call.
//   zsh studio/tools/isolated.sh grounding 4402 start && tsx studio/tests/check_grounding_db.ts 4402 [xr_studio_grounding]
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4402), DB = process.argv[3] ?? "xr_studio_grounding";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql"].find((p) => existsSync(p)) ?? "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

(async () => {
  // The database this check reads by SQL must be the server's own (Lead check L1: a run whose database argument named
  // another copy's database looked up stale ids and failed with a 404). Stop with the reason instead.
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })(); // a database that does not exist is "not it" too
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses (its workspace ${served ?? "unknown"} is not in it). Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  // ------------------------------------------------------------ finding 1 / D285: levels, scope, duplicates
  // Screen 01 (21 Oct): pathways are fixed values the studio always has; nodes are added with POST /program-nodes
  // (contracts/programs.ts); a combination is created on a last-level node with POST /combinations {nodeKey}.
  // W1-03 (B1, 27 Oct): the Pathway type is a fixed value, never a row; Pathways are names an author adds on the
  // Structure (POST /structure/nodes), and a read creates none.
  let r = await call("GET", "/catalogue?pathway=INDIVIDUAL");
  ok("no pathway exists without data, and a read creates none (W1-03)", sql(`select count(*) from program_def where node_kind='PATHWAY'`) === "0");
  for (const [t, label] of [["INDIVIDUAL", "Individual"], ["CORPORATE", "Corporate"]]) await call("POST", "/structure/nodes", { pathwayType: t, level: "pathway", label });
  ok("an author adds one pathway per type on the Structure", sql(`select string_agg(client_type || ':' || program_node_key, ',' order by client_type) from program_def where node_kind='PATHWAY'`) === "CORPORATE:corporate,INDIVIDUAL:individual");
  r = await call("POST", "/program-nodes", { kind: "PATHWAY", label: "People", parentKey: "individual" });
  ok("a pathway is not added through the path builder's node route (Structure only)", r.status === 400, r.body.detail);
  r = await call("POST", "/program-nodes", { kind: "STREAM", label: "Visitor visa", parentKey: "individual" });
  ok("level order: a category cannot sit directly under a pathway", r.status === 400 && /goes under a program/.test(r.body.detail), r.body.detail);
  r = await call("POST", "/program-nodes", { kind: "PROGRAM", label: "Visitors", parentKey: "individual" });
  ok("a program is created under its pathway", r.status === 201, r.body.programNodeKey);
  r = await call("POST", "/program-nodes", { kind: "PROGRAM", label: "  visitors ", parentKey: "individual" });
  ok("the same program name in the same pathway is refused (trimmed, any case)", r.status === 409, r.body.detail);
  r = await call("POST", "/program-nodes", { kind: "PROGRAM", label: "Visitors", parentKey: "corporate" });
  ok("the same name in the other pathway is a separate program", r.status === 201, r.body.programNodeKey);
  r = await call("POST", "/program-nodes", { kind: "STREAM", label: "Visitor visa", parentKey: "individual.visitors" });
  ok("a category without stated locations gets both (narrowed later in the new-combination dialog, SA-1B-51)", r.status === 201 && JSON.stringify(r.body.allowedLocations) === JSON.stringify(["inside_canada", "outside_canada"]), r.body.allowedLocations);
  const twin = await Promise.all([0, 1].map(() => call("POST", "/program-nodes", { kind: "STREAM", label: "Super visa", parentKey: "individual.visitors" })));
  ok("two people creating the same category at once: exactly one succeeds, the other is refused", twin.filter((x) => x.status === 201).length === 1 && twin.filter((x) => x.status === 409).length === 1, twin.map((x) => x.status));
  r = await call("POST", "/combinations", { nodeKey: "individual.visitors" });
  ok("configuration cannot attach to a program (above a combination)", r.status === 400, r.body.detail);
  const rows = await Promise.all([0, 1].map(() => call("POST", "/combinations", { nodeKey: "individual.visitors.visitor_visa" })));
  const row = rows.find((x) => x.status === 201)?.body?.combination;
  ok("one combination per last-level node, also under concurrent creates: one created, the other returns it", rows.filter((x) => x.status === 201).length === 1 && rows.filter((x) => x.status === 200).length === 1 && rows[0].body.combination.id === rows[1].body.combination.id, rows.map((x) => x.status));
  r = await call("POST", "/combinations", { nodeKey: "individual.visitors.visitor_visa" });
  ok("a later attempt returns the existing combination to open (idempotent)", r.status === 200 && r.body.created === false && r.body.combination.id === row?.id, r.status);
  r = await call("POST", "/program-nodes", { kind: "CATEGORY", label: "From India", parentKey: "individual.visitors.visitor_visa" });
  ok("a sub-category cannot go under a category that already has its own setup", r.status === 409, r.body.detail);
  r = await call("POST", "/program-nodes", { kind: "PROGRAM", label: "Study permits", parentKey: "individual" }, "user-B");
  ok("server permission: the approver cannot author masters", r.status === 403, r.body.detail);
  r = await call("POST", "/program-nodes", { kind: "PROGRAM", label: "Study permits", parentKey: "individual" });

  // ------------------------------------------------------------ finding 2: review differences and authorship
  const id = row.id;
  // C3.6 (P-158): a new type named here waits as a library proposal (202); a second person accepts it, then the line goes in.
  r = await call("POST", `/combinations/${id}/requirements`, { newTypeName: "Passport", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client", sourceQuote: "test fixture" });
  if (r.status === 202) {
    const passportKey = (await call("POST", "/review/proposals/decide", { ids: [r.body.proposalId], action: "accept" }, "user-B")).body?.items?.[0]?.landedAs;
    r = await call("POST", `/combinations/${id}/requirements`, { documentTypeKey: passportKey, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client", sourceQuote: "test fixture" });
  }
  ok("a base document requirement is added to the draft", r.status === 201, r.body?.lineageKey ?? r.body?.detail);
  r = await call("POST", `/combinations/${id}/requirements`, { newTypeName: "Bank statement", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant" }, "user-C");
  ok("server permission: the content reviewer cannot edit the draft", r.status === 403, r.body.message);
  // Screen 02 FIX (Lead re-check item 2): the new document type is approved by a second person before any release.
  for (const ch of (await call("GET", "/library/changes?status=WAITING")).body) await call("POST", `/library/changes/${ch.id}/approve`, {}, "user-C");
  ok("the new document type is approved by a second person (no release carries an unreviewed library item)", (await call("GET", "/library/changes?status=WAITING")).body.length === 0);
  const release = async (label: string) => {
    const s = await call("POST", `/combinations/${id}/submit`, {});
    const sub = await call("GET", `/combinations/${id}/review`);
    const items = (sub.body.submission?.changeSummary ?? []).map((x: any) => `${x.kind}|${x.key}`);
    const sme = (sub.body.submission?.changeSummary ?? []).filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
    const early = sme.length ? await call("POST", `/combinations/${id}/approve`, {}, "user-B") : null;
    if (sme.length) await call("POST", `/combinations/${id}/signoff`, { items: sme, action: "signed" }, "user-C");
    const a = await call("POST", `/combinations/${id}/approve`, {}, "user-B");
    return { submit: s.status, items, sme, early: early?.status, approve: a.status, version: a.body?.version, label };
  };
  const v1 = await release("first");
  ok("first release: submit, SME sign-off, second-person approval", v1.submit === 201 && v1.approve === 201 && v1.version === 1, v1);
  r = await call("POST", `/combinations/${id}/submit`, {});
  ok("control: nothing changed since the release, so nothing can be submitted", r.status === 400 && /Nothing has changed/.test(r.body.message), r.body.message);
  r = await call("PATCH", `/combinations/${id}`, { participants: [{ role: "principal", label: "Applicant", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1, preview: 1 }] });
  ok("only the people on the row change", r.status === 200);
  const v2 = await release("people only");
  ok("a people-only change appears in review and needs the SME duty; early approval is refused", v2.items.includes(`People on this row|${row.combinationKey}`) && v2.sme.includes(`People on this row|${row.combinationKey}`) && v2.early === 409 && v2.version === 2, v2);
  const rel2 = await call("GET", `/releases?combination=${id}`);
  const r2 = rel2.body.find((x: any) => x.version === 2);
  ok("the people-only release records its author (from the change events, not only draft rows)", String(r2?.authorId ?? r2?.author ?? "").includes("user-A"), r2 && { author: r2.authorId ?? r2.author, approver: r2.approverId ?? r2.approver });
  // C11.16 (P-125 (1)(3)): the name comes from Program structure only; the setup's rename is refused, nothing changes.
  const nameBefore = sql(`select label from combination where id='${id}'`);
  r = await call("PATCH", `/combinations/${id}`, { label: "Visitor visa (renamed)", expectedLabel: row.label });
  ok("C11.16: a rename in the setup is refused in plain words (rename it on Program structure); the name is unchanged", r.status === 400 && /Program structure/.test(r.body.message) && sql(`select label from combination where id='${id}'`) === nameBefore, { status: r.status, message: r.body.message });
  // A people change after submission makes the submission stale (the draft moved on).
  r = await call("PATCH", `/combinations/${id}`, { participants: [{ role: "principal", label: "Applicant", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1, preview: 1 }, { role: "child", label: "Child", min: 0, max: 3, preview: 0 }] });
  const sub3 = await call("POST", `/combinations/${id}/submit`, {});
  ok("setup: a people change is submitted for release", sub3.status === 201, sub3.body?.message);
  r = await call("PATCH", `/combinations/${id}`, { participants: [{ role: "principal", label: "Applicant", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1, preview: 1 }] });
  r = await call("POST", `/combinations/${id}/approve`, {}, "user-B");
  ok("a draft changed after submission cannot be released (stale submission)", r.status === 409 && /hash|changed/.test(r.body.message), r.body.message);
  r = await call("PATCH", `/combinations/${id}`, { description: "Changed from an old screen", expectedLabel: "Visitor visa (renamed)" });
  ok("a change from an out-of-date screen (it expects another name) is refused, not overwritten", r.status === 409, r.body.message);
  // Renaming a program is not built on Screen 01 (P-26: the team has it); the combination keeps its key through its own rename above.

  // ------------------------------------------------------------ finding 1: publishing blocks a row above a full combination
  const progId = sql(`select id from program_def where program_node_key='individual.visitors'`);
  let refused = "";
  try { sql(`insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, source_basis, created_by) select gen_random_uuid(), workspace_id, '${progId}', 'legacy.program_row', 'Legacy', '[]', 'ILLUSTRATIVE', 'test' from program_def where id='${progId}'`); } catch (e) { refused = String((e as any).stderr ?? e); }
  ok("a legacy row attached to a program cannot even be stored: the database refuses it (Screen 01 level trigger)", /combination_level/.test(refused), refused.split("\n")[0]);

  // ------------------------------------------------------------ finding 3 at release: hiding a value a form reads
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("isolated copy reset (its own database and files only)", r.status === 201 && r.body.preserved_unchanged === true, { preserved_unchanged: r.body.preserved_unchanged });
  r = await call("POST", "/demo/load");
  ok("isolated copy: sample inputs load through the normal paths: 5 P-112 pathways (S2 fix 1), 11 programs, 6 combinations set up", r.status === 201 && sql(`select count(*) from program_def where node_kind='PROGRAM'`) === "11" && sql("select count(*) from combination") === "6" && sql(`select count(*) from program_def where node_kind='PATHWAY'`) === "5", r.body?.message ?? r.body?.seconds);
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const pl = sql(`select section_key||'|'||collected_from||'|'||repeats from section_question where lineage_key='person.given_names' order by version desc limit 1`).split("|");
  const flag = sql(`select q.canonical_field_key from section_question q join canonical_field f on f.canonical_field_key=q.canonical_field_key and f.workspace_id=q.workspace_id where f.value_type='yes_no' and q.canonical_field_key like 'person.%' order by 1 limit 1`);
  r = await call("POST", `/library/fields/person.given_names/placement`, { sectionKey: pl[0], collectedFrom: pl[1], repeats: pl[2], condition: { subjectKind: "PRINCIPAL", op: "eq", field: flag, value: true }, conditionEffect: "SHOW", conditionPlain: `only if ${flag} is yes` });
  ok("a person makes the given-names question conditional (saved as draft)", r.status === 201, { flag, status: r.status });
  r = await call("POST", `/combinations/${wp}/submit`, {});
  ok("finding 3 at release: submitting a draft that can hide a value IMM 1295 always reads is refused", r.status === 400 && /Hiding a value a form reads/.test(r.body.message), r.body.message);
  r = await call("POST", `/library/fields/person.given_names/placement`, { sectionKey: pl[0], collectedFrom: pl[1], repeats: pl[2] });
  r = await call("POST", `/combinations/${wp}/submit`, {});
  ok("after the condition is removed the draft no longer has that error", !(r.status === 400 && /Hiding a value/.test(r.body.message)), r.body.message ?? r.status);
  console.log(`\n${pass}/${pass + fail} passed`);
  const out = join(import.meta.dirname, "..", "evidence", "grounding-db"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_grounding_db.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, database: DB, pass, fail, log }, null, 1));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
