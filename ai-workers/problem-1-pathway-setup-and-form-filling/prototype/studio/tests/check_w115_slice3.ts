// W1-15 Questions and documents, slice 3 (runtime lane; board v2 frame 3, P-147; plan.md "Slice 3"): the API under the
// Documents tab. Each person's checklist from the engine (lines per person, what each supplies about whom, and whether
// slice 1's rules take that answer out of the questionnaire); the order per person (Move up or down, at once, a History
// line, out with the next release; in the snapshot only when set); alternatives (library types only); Remove from
// checklist and the author's Undo (Removed in this draft; never after a release). A passing and a failing case per rule,
// on an isolated copy with the sample loaded. Rules only: no AI call (US$0).
//   zsh studio/tools/isolated.sh runtime_w115d 4438 start && tsx studio/tests/check_w115_slice3.ts 4438 xr_studio_runtime_w115d
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { effective } from "../engine/snapshot.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (C5.4): a release needs every number sourced

const PORT = Number(process.argv[2] ?? 4438), DB = process.argv[3] ?? "xr_studio_runtime_w115d";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const PASSPORT = "passport_or_travel_document_information_page_photocopy";

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const list = async () => (await call("GET", `/combinations/${wp}/checklist`)).body;
  const lines = (v: any, role: string) => v.roles.find((r: any) => r.role === role)?.lines ?? [];
  const cfg = async () => (await call("GET", `/combinations/${wp}`)).body;

  // ---------------------------------------------------------------- the checklist per person, supplies, taken out
  let V = await list();
  const roleKeys = V.roles.map((r: any) => r.role);
  ok("C4.5 pass: a checklist per person (principal, spouse or partner, child), each with its lines", ["principal", "spouse_or_partner", "child"].every((r) => roleKeys.includes(r)) && lines(V, "principal").length > 5, V.roles.map((r: any) => `${r.role}:${r.lines.length}`));
  const pp = lines(V, "principal").find((x: any) => x.document.key === PASSPORT);
  ok("C4.5 pass: the principal's passport supplies its facts about the holder, each taken out of the questionnaire (slice 1's source is this document)", !!pp && pp.supplies.length >= 9 && pp.supplies.every((x: any) => x.about === "holder" && x.aboutRole === "principal" && x.takenOut), pp && pp.supplies.map((x: any) => `${x.fact}:${x.takenOut}`));
  const none = lines(V, "principal").find((x: any) => !x.supplies.length);
  ok("C4.5 fail-guard: a line that supplies nothing says so (filed as is), nothing taken out", !!none && none.aboutOthers === 0, none?.document.name);
  ok("C4.5 pass: the child's checklist has the child's own lines only (per person, never combination-wide)", lines(V, "child").length >= 1 && lines(V, "child").every((x: any) => x.who !== "principal_applicant"), lines(V, "child").map((x: any) => x.who));
  ok("words pass: each line carries When in words (Always, or the condition in plain words)", lines(V, "principal").every((x: any) => x.base ? x.when === "Always" : x.when.length > 3));
  // Taken out follows slice 1: the principal's family name set to the client is no longer taken out of the questionnaire.
  let r = await call("PUT", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent("person.family_name")}`, { source: "CLIENT", version: 0 });
  V = await list();
  const fam = lines(V, "principal").find((x: any) => x.document.key === PASSPORT).supplies.find((x: any) => x.fact === "person.family_name");
  ok("C4.5 fail: with the family name set to the client, the passport no longer takes it out of the questionnaire", r.status === 200 && fam.takenOut === false, fam);
  await call("DELETE", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent("person.family_name")}`, { version: 1 });

  // ---------------------------------------------------------------- order per person: Move up or down
  let c = await cfg();
  ok("fingerprint guard: before any move no line carries a position, and the draft equals the release", c.draft.matches_release === true && !(await call("GET", `/combinations/${wp}/config?mode=draft`)).body.snapshot.document_requirements.some((x: any) => "position" in x), c.draft.matches_release);
  const before = lines(V, "principal").map((x: any) => x.lineage);
  r = await call("POST", `/combinations/${wp}/checklist/move`, { lineage: before[1], role: "principal", direction: "up" }, "user-O");
  ok("move roles fail: a case officer cannot change the order (403)", r.status === 403, r.status);
  r = await call("POST", `/combinations/${wp}/checklist/move`, { lineage: before[0], role: "principal", direction: "up" });
  ok("move fail: the first line cannot move up (409, in words)", r.status === 409 && /already first/.test(words(r)), words(r));
  r = await call("POST", `/combinations/${wp}/checklist/move`, { lineage: "no-such-line", role: "principal", direction: "down" });
  ok("move fail: a line not on this checklist is 404 in words", r.status === 404 && /not on this person's checklist/.test(words(r)), words(r));
  r = await call("POST", `/combinations/${wp}/checklist/move`, { lineage: before[1], role: "principal", direction: "up" });
  const after = lines(r.body, "principal").map((x: any) => x.lineage);
  ok("move pass: the second line moves up, at once: the first two swap and the rest keep their order", r.status === 200 && after[0] === before[1] && after[1] === before[0] && JSON.stringify(after.slice(2)) === JSON.stringify(before.slice(2)), after.slice(0, 3));
  ok("move pass: one move changes only the two lines it swaps (two draft rows with a position), never the whole checklist", Number(sql(`select count(*) from document_requirement where combination_id='${wp}' and status='DRAFT' and position is not null`)) === 2, sql(`select count(*) from document_requirement where combination_id='${wp}' and status='DRAFT'`));
  ok("move: one History line names the document and whose checklist", Number(sql(`select count(*) from audit_event where combination_id='${wp}' and summary like '%moved % up in Principal applicant''s checklist%'`)) === 1);
  c = await cfg();
  ok("move: the new order is a draft change (goes out with the next release), the release keeps its order", c.draft.matches_release === false && (await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot.document_requirements.every((x: any) => !("position" in x)), c.draft.matches_release);

  // ---------------------------------------------------------------- alternatives
  const anyOther = sql(`select document_type_key from document_type where workspace_id=(select workspace_id from combination where id='${wp}') and document_type_key<>'${PASSPORT}' order by document_type_key limit 1`);
  const ppReq = (await call("GET", `/combinations/${wp}/config?mode=draft`)).body.snapshot.document_requirements.find((x: any) => x.document_type_key === PASSPORT);
  const edit = (alternatives: string[]) => call("PATCH", `/combinations/${wp}/requirements/${encodeURIComponent(ppReq.lineage)}`, { documentTypeKey: PASSPORT, attachMode: "COMBINATION_MANDATORY", appliesToRoles: ppReq.who, providedBy: ppReq.provided_by, sourceQuote: ppReq.source_quote ?? "", alternatives });
  r = await edit(["no_such_document_type"]);
  ok("alternatives fail: a type not in the library is refused in words", r.status >= 400 && /must be a document type in the library/.test(words(r)), `${r.status} ${words(r)}`);
  r = await edit([anyOther, PASSPORT]);
  V = await list();
  const alt = lines(V, "principal").find((x: any) => x.document.key === PASSPORT).alternatives;
  ok("alternatives pass: a library type is saved as an alternative (the line's own type is never its own alternative)", r.status < 300 && alt.length === 1 && alt[0].key === anyOther && !!alt[0].name, alt);

  // ---------------------------------------------------------------- remove from checklist, and its Undo
  const target = lines(V, "principal").find((x: any) => x.document.key !== PASSPORT && x.who === "principal_applicant");
  r = await call("PATCH", `/combinations/${wp}/requirements/${encodeURIComponent(target.lineage)}`, { retire: true });
  V = await list();
  ok("remove pass: the line leaves the principal's checklist and is listed as Removed in this draft", r.status < 300 && !lines(V, "principal").some((x: any) => x.lineage === target.lineage) && V.removed.some((x: any) => x.lineage === target.lineage && x.by === "user-A"), V.removed);
  r = await call("POST", `/combinations/${wp}/checklist/undo-remove`, { lineage: target.lineage }, "user-B");
  ok("Undo fail: someone else cannot put it back (403, in words)", r.status === 403 && words(r) === "Only the person who made this draft can undo it.", `${r.status} ${words(r)}`);
  r = await call("POST", `/combinations/${wp}/checklist/undo-remove`, { lineage: target.lineage });
  ok("Undo pass: the author puts it back at once; nothing is listed as removed", r.status === 200 && lines(r.body, "principal").some((x: any) => x.lineage === target.lineage) && !r.body.removed.length, r.body.removed);
  r = await call("POST", `/combinations/${wp}/checklist/undo-remove`, { lineage: target.lineage });
  ok("Undo fail: there is no removal to undo twice (409 Nothing to undo)", r.status === 409 && /Nothing to undo/.test(r.body?.title ?? ""), `${r.status} ${r.body?.title}`);

  // ---------------------------------------------------------------- a released removal is never undone
  await call("PATCH", `/combinations/${wp}/requirements/${encodeURIComponent(target.lineage)}`, { retire: true });

  // ---------------------------------------------------------------- open point 3: the published view changes only on release
  // A removal saved as a draft over a released row is a RETIRED row whose predecessor is still PUBLISHED. The published
  // view (engine/snapshot.ts effective, the rule buildSnapshot "published" uses) keeps the released row until a release.
  const rowsOf = (table: string, keyCol: string, key: string) => sql(`select id, version, status, coalesce(supersedes_id::text,'') from ${table} where combination_id='${wp}' and ${keyCol}='${key.replace(/'/g, "''")}'`).split("\n").filter(Boolean).map((x) => { const [id, version, status, sup] = x.split("|"); return { id, version: Number(version), status, supersedesId: sup || null, key }; });
  const views = (rows: any[]) => ({ draft: effective(rows, (x) => x.key, "draft", true).length, published: effective(rows, (x) => x.key, "published", true).length, oldRule: effective(rows, (x) => x.key, "published").length });
  let vw = views(rowsOf("document_requirement", "lineage_key", target.lineage));
  ok("C4.10 pass (open point 3): a document removed in the draft stays in the published view until a release", vw.draft === 0 && vw.published === 1, vw);
  ok("C4.10 fail-guard (open point 3): the old rule took the newest published-or-retired row and dropped it before any release", vw.oldRule === 0, vw);
  const rule = sql(`select predicate_key from predicate where combination_id='${wp}' and status='PUBLISHED' order by predicate_key limit 1`);
  r = await call("PATCH", `/combinations/${wp}/rules/${encodeURIComponent(rule)}`, { retire: true });
  vw = views(rowsOf("predicate", "predicate_key", rule));
  ok("C4.10 pass (open point 3): a rule removed in the draft stays in the published view until a release", r.status < 300 && vw.draft === 0 && vw.published === 1 && vw.oldRule === 0, vw);
  const form = sql(`select lineage_key from combination_form where combination_id='${wp}' and status='PUBLISHED' order by lineage_key limit 1`);
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(form)}`, { retire: true });
  vw = views(rowsOf("combination_form", "lineage_key", form));
  ok("C4.10 pass (open point 3): a form removed in the draft stays in the published view until a release", r.status < 300 && vw.draft === 0 && vw.published === 1 && vw.oldRule === 0, vw);
  // Test-only restore: this release carries the document's removal, not the rule's or the form's.
  sql(`delete from predicate where combination_id='${wp}' and predicate_key='${rule}' and status='RETIRED'; delete from combination_form where combination_id='${wp}' and lineage_key='${form}' and status='RETIRED'`);
  // Fact sources and placements write no draft retire: a fact source's change (even back to the rules) is a DRAFT row
  // over the released one, and a placement is retired only by a library change released in its own pack.
  r = await call("PUT", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent("person.family_name")}`, { source: "CLIENT", version: Number(sql(`select coalesce(max(version),0) from fact_source where combination_id='${wp}' and lineage_key='principal|person.family_name'`)) });
  ok("C4.10 pass (open point 3): fact sources and placements have no draft retire that could leak (no RETIRED rows; a change is a draft)", r.status === 200 && sql(`select count(*) from fact_source where combination_id='${wp}' and status='RETIRED'`) === "0" && sql(`select count(*) from section_question where status='RETIRED'`) === "0" && sql(`select status from fact_source where combination_id='${wp}' and lineage_key='principal|person.family_name' order by version desc limit 1`) === "DRAFT", r.status);
  await call("DELETE", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent("person.family_name")}`, { version: Number(sql(`select max(version) from fact_source where combination_id='${wp}' and lineage_key='principal|person.family_name'`)) });
  // A check's removal (no screen removes one yet: written as the other lines' removals are) rides with this release.
  const chk = sql(`select id||'|'||check_key from check_def where combination_id='${wp}' and status='PUBLISHED' order by check_key limit 1`).split("|");
  const cols = sql(`select column_name from information_schema.columns where table_name='check_def' order by ordinal_position`).split("\n");
  const pick = (c: string) => ({ id: "gen_random_uuid()", version: "version + 1", status: "'RETIRED'", supersedes_id: "id" } as Record<string, string>)[c] ?? `"${c}"`;
  if (chk[0]) sql(`insert into check_def (${cols.map((c) => `"${c}"`).join(", ")}) select ${cols.map(pick).join(", ")} from check_def where id='${chk[0]}'`);
  vw = views(rowsOf("check_def", "check_key", chk[1] ?? ""));
  ok("C4.10 pass (open point 3): a check removed in the draft stays in the published view until a release", !!chk[0] && vw.draft === 0 && vw.published === 1 && vw.oldRule === 0, vw);

  await sourceEveryNumber(PORT, wp); // G1 (C5.4): the release's numbers need a source before it is submitted
  await call("POST", `/combinations/${wp}/submit`, {});
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const sme = ((review.submission?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("release pass: the order, the alternative and the removal are released (Release 2)", r.status === 201 && r.body?.version === 2, words(r) || r.body?.version);
  const rel = (await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot;
  ok("release: Release 2 carries the positions and the alternative, and not the removed line", rel.document_requirements.some((x: any) => "position" in x) && rel.document_requirements.some((x: any) => x.document_type_key === PASSPORT && (x.alternatives ?? []).includes(anyOther)) && !rel.document_requirements.some((x: any) => x.lineage === target.lineage), rel.document_requirements.length);
  ok("C4.10 pass (Lead check slice 3): the release carries the check's removal: the released check is superseded and Release 2 has no such check", sql(`select status from check_def where id='${chk[0]}'`) === "SUPERSEDED" && !rel.checks.some((x: any) => x.id === chk[1]), sql(`select status from check_def where id='${chk[0]}'`));
  ok("C4.10 fail-guard (Lead check slice 3): after the release the published view drops the check (held only until a release)", views(rowsOf("check_def", "check_key", chk[1])).published === 0, views(rowsOf("check_def", "check_key", chk[1])));
  r = await call("POST", `/combinations/${wp}/checklist/undo-remove`, { lineage: target.lineage });
  ok("Undo fail: a released removal is not undone (409 Released since)", r.status === 409 && /Released since/.test(r.body?.title ?? ""), `${r.status} ${words(r)}`);
  V = await list();
  ok("after the release nothing shows as Removed in this draft", V.removed.length === 0, V.removed);

  sql(`update combination set retired_at=now() where id='${wp}'`);
  r = await call("POST", `/combinations/${wp}/checklist/move`, { lineage: after[0], role: "principal", direction: "down" });
  ok("move fail: a retired combination's checklist is not changed (409, restore it first)", r.status === 409 && /is retired/.test(words(r)), words(r));
  sql(`update combination set retired_at=null where id='${wp}'`);
  r = await call("GET", `/combinations/not-a-combination/checklist`);
  ok("fail: an unknown combination is 404 in words (never a 500)", r.status === 404, r.status);

  const out = join(import.meta.dirname, "..", "..", "..", "product", "screens", "W1-questions-and-documents", "tests");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_w115_slice3.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, pass, fail, log }, null, 2));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
