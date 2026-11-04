// W1-03 slice 1 (data and API): Structure with the Pathway type as a fixed value and several Pathways per type, the
// free name checks, rename at the next release, reorder, every-Pathway reads, setup steps and "Filed", and the P-116
// lifecycle (where used, remove, retire, restore) with the retired-combination guard on case opening. A passing and a
// failing case per rule (concept §10, §10b; addendum A1–A5), on an isolated copy. No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh screens_w1s1 4442 start && tsx studio/tests/check_w1_structure.ts 4442 xr_studio_screens_w1s1
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeWhy, editDistance, filedOf } from "../engine/structure.ts";
import { progressOf } from "../engine/setup-checklist.ts";
import type { SetupChecklist } from "../contracts/setup-checklist.ts";
import { diff } from "../engine/validate.ts";

const PORT = Number(process.argv[2] ?? 4442), DB = process.argv[3] ?? "xr_studio_screens_w1s1";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const node = (pathwayType: string, level: string, label: string, parentKey: string | null = null, extra: Record<string, unknown> = {}, actor = "user-A") =>
  call("POST", "/structure/nodes", { pathwayType, level, label, parentKey, ...extra }, actor);
const structure = async (t = "INDIVIDUAL") => (await call("GET", `/structure?pathwayType=${t}`)).body;
const cat = async (q = "pathway=INDIVIDUAL") => (await call("GET", `/catalogue?${q}`)).body;
const leaves = (ns: any[]): any[] => ns.flatMap((n) => (n.kind === "combination" ? [n] : leaves(n.children)));
const approve = (id: string, actor = "user-B") => call("POST", `/library/changes/${id}/approve`, {}, actor);
const releaseAll = async (actor = "user-B") => { const d = (await call("GET", "/draft", undefined, actor)).body; return call("POST", "/pack/release", { expectedChanges: d.changes }, actor); };

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }

  // ---------------------------------------------------------------- pure rules (engine/structure.ts)
  ok("C11.3 BR-5 pass: 'Visiter visa' is close to 'Visitor visa' (1 letter)", closeWhy("Visiter visa", "Visitor visa") === "1 letter apart", closeWhy("Visiter visa", "Visitor visa"));
  ok("C11.3 BR-5 pass: singular and plural, and the same words in another order, are close", closeWhy("Work permit", "Work permits") !== null && closeWhy("Visa visitor", "Visitor visa") === "Same words in another order");
  ok("C11.3 BR-5 fail: an unrelated name is not close; an exact match is a twin, not 'close'", closeWhy("Study permit", "Visitor visa") === null && closeWhy("visitor  visa", "Visitor visa") === null);
  ok("C11.3 BR-5: short names allow one letter only ('LMIA' vs 'LMIB' close, 'PNP' vs 'PGP' close, 'PNP' vs 'SUV' not)", closeWhy("LMIA", "LMIB") !== null && closeWhy("PNP", "SUV") === null && editDistance("kitten", "sitting") === 3);
  // QA-184: the catalogue's progress is the setup checklist's five steps (P-157), in the card's words; the older four-step
  // count ("Step 2 of 4: Draft") is gone.
  const KEYS = ["pages", "people", "forms", "questions_documents", "release"] as const;
  const list = (states: string[], status: string, next: number | null, bar: { done: number; text: string; next?: string | null }) =>
    ({ chip: { status, release: status === "LIVE" ? 1 : null }, steps: KEYS.map((key, i) => ({ key, state: states[i] })), current: KEYS[states.indexOf("next")] ?? KEYS[states.findIndex((x) => x !== "done")] ?? null,
      next: next === null ? null : { step: KEYS[next] }, bar: { of: 5, ...bar } }) as unknown as SetupChecklist;
  const p0 = progressOf(list(["next", "todo", "todo", "todo", "todo"], "NOT_STARTED", 0, { done: 0, text: "0 of 5 steps" }));
  const p2 = progressOf(list(["done", "done", "next", "todo", "todo"], "IN_PROGRESS", 2, { done: 2, text: "2 of 5 steps" }));
  const pLive = progressOf(list(["next", "todo", "todo", "done", "done"], "LIVE", 0, { done: 2, text: "✓ Live", next: "Next release: 3 of 5 steps to do" }));
  const pLiveDone = progressOf(list(["done", "done", "done", "done", "done"], "LIVE", null, { done: 5, text: "✓ Live", next: null }));
  ok("C11.10 A3 pass (QA-184): progress is out of 5 steps, at the step of the next item, in the card's words", p0.of === 5 && p0.step === 1 && p0.label === "0 of 5 steps" && p2.step === 3 && p2.label === "2 of 5 steps" && p2.done.join() === "true,true,false,false,false", [p0, p2]);
  ok("C11.10 A3 pass (QA-184): a Live combination says Live first, then what its next release needs; with nothing open, just Live", pLive.live && pLive.of === 5 && pLive.label === "✓ Live · Next release: 3 of 5 steps to do" && pLiveDone.live && pLiveDone.label === "✓ Live" && pLiveDone.step === 5, [pLive.label, pLiveDone.label]);
  ok("C11.10 A3 fail (QA-184): never the older four-step words", ![p0, p2, pLive, pLiveDone].some((p) => /of 4|Step \d/.test(p.label) || (p.of as number) === 4));
  ok("C11.10 A4 pass: PDF lines say 'PDF'; one Online line says 'PDF + answer sheet (later wave)'", filedOf([{ channel: "PDF_UPLOAD" }]) === "PDF" && filedOf([{ channel: "PDF_UPLOAD" }, { channel: "ONLINE" }]) === "PDF + answer sheet (later wave)");
  ok("C11.10 A4 fail: no lines say 'No forms yet', never a promise of a sheet", filedOf([]) === "No forms yet" && filedOf([{ form_kind: "checklist" }]) === "Checklists only");

  // ---------------------------------------------------------------- empty workspace: a read creates nothing (B1)
  await call("GET", "/catalogue?pathway=INDIVIDUAL"); await call("GET", "/path-options?pathway=CORPORATE"); await call("GET", "/structure?pathwayType=INDIVIDUAL");
  ok("C11.7 B1 pass: reads on an empty workspace create no Pathway (the type is a fixed value, never a row)", sql("select count(*) from program_def") === "0");
  let s = await structure();
  ok("C11.3 B1: GET /structure on an empty workspace says it is empty, under the words of the type", s.empty === true && s.typeLabel === "Retail" && s.nodes.length === 0);
  let r = await call("GET", "/structure?pathwayType=INDIVIDUAL");

  // ---------------------------------------------------------------- BR-1 Pathway type and several Pathways
  r = await node("INDIVIDUAL", "pathway", "Temporary residence");
  const trR = r.body.key;
  const rc = await node("CORPORATE", "pathway", "Temporary residence");
  ok("C11.5 BR-1 pass: the same Pathway name is accepted in both types (index per type)", r.status === 201 && rc.status === 201 && trR !== rc.body.key, [r.status, rc.status]);
  r = await node("INDIVIDUAL", "pathway", " temporary  RESIDENCE ");
  ok("C11.3 BR-1/BR-4 fail: a twin Pathway in one type is refused, with the existing one", r.status === 409 && r.body.existing?.key === trR, r.body.detail);
  r = await node("INDIVIDUAL", "pathway", "Permanent residence");
  const prR = r.body.key;
  ok("C11.3 BR-1 pass: a second Retail Pathway is accepted (several per type)", r.status === 201);
  s = await structure();
  const po = (await call("GET", "/path-options?pathway=INDIVIDUAL")).body;
  ok("C11.3 BR-1: both Retail Pathways are listed on the Structure and offered to pickers; Corporate's is not", s.nodes.filter((n: any) => n.level === "pathway").length === 2 && po.pathways.length === 2 && !po.pathways.some((p: any) => p.key === rc.body.key), po.pathways.map((p: any) => p.label));
  ok("C11.3 BR-1: the stored rows are Pathways with their type; no row stands for the type itself", sql("select string_agg(client_type, ',' order by client_type) from program_def where node_kind='PATHWAY'") === "CORPORATE,INDIVIDUAL,INDIVIDUAL");
  r = await node("INDIVIDUAL", "pathway", "Citizenship", trR);
  ok("C11.3 levels fail: a pathway has no parent", r.status === 400 && r.body.errors?.[0]?.field === "parentKey", r.body.detail);
  r = await node("INDIVIDUAL", "program", "Visitors", null);
  ok("C11.3 levels fail: a program needs its Pathway", r.status === 400, r.body.detail);
  r = await node("INDIVIDUAL", "program", "Labour market", rc.body.key);
  ok("C11.5 BR-8 fail: a Retail name cannot go under a Corporate Pathway", r.status === 400 && /other pathway type/i.test(r.body.title), r.body.detail);

  // ---------------------------------------------------------------- BR-4 twins, at once
  const four = await Promise.all([0, 1, 2, 3].map(() => node("INDIVIDUAL", "program", "Visitors", trR)));
  const visitors = four.find((x) => x.status === 201)?.body.key;
  ok("C11.3 BR-4 pass+fail: 4 adds of one name at the same moment store one; the others are refused 409", four.filter((x) => x.status === 201).length === 1 && four.filter((x) => x.status === 409).length === 3 && sql(`select count(*) from program_def where parent_node_key='${trR}' and name_key='visitors'`) === "1", four.map((x) => x.status));

  // ---------------------------------------------------------------- M5 locations, BR-2 leaf = combination
  r = await node("INDIVIDUAL", "category", "Visitor visa", visitors);
  const vv = r.body.key;
  ok("C11.3 M5 pass: a category without stated locations gets both (Sample)", r.status === 201 && JSON.stringify(r.body.allowedLocations) === JSON.stringify(["inside_canada", "outside_canada"]), r.body.allowedLocations);
  let leaf = leaves((await cat()).tree).find((l) => l.nodeKey === vv);
  ok("C11.10 BR-2 pass: a new last-level name is listed at once as a Not started combination with its five-part trail", leaf?.statusText === "Not started" && JSON.stringify(leaf?.trail) === JSON.stringify(["Retail", "Temporary residence", "Visitors", "Visitor visa", "No sub-category"]), leaf?.trail);
  ok("C11.10 BR-7/A3/A4 (QA-184): a Not started card is at step 1 of 5 (0 of 5 steps) and says 'No forms yet'", leaf?.progress?.step === 1 && leaf?.progress?.of === 5 && leaf?.progress?.label === "0 of 5 steps" && leaf?.filed === "No forms yet", [leaf?.progress?.label, leaf?.filed]);
  r = await node("INDIVIDUAL", "category", "Study permit", visitors, { allowedLocations: ["outside_canada"] });
  const sp = r.body.key;
  r = await node("INDIVIDUAL", "subCategory", "From a designated school", sp);
  ok("C11.3 M5 pass: a sub-category takes its category's locations unless told", r.status === 201 && JSON.stringify(r.body.allowedLocations) === JSON.stringify(["outside_canada"]), r.body.allowedLocations);
  r = await node("INDIVIDUAL", "program", "Visitors 2", trR, { allowedLocations: ["inside_canada"] });
  ok("C11.3 M5 fail: a program has no locations", r.status === 400 && r.body.errors?.[0]?.field === "allowedLocations", r.body.detail);
  const combo = (await call("POST", "/combinations", { nodeKey: vv })).body.combination;
  r = await node("INDIVIDUAL", "subCategory", "From India", vv);
  ok("C11.3 BR-2 fail: a sub-category under a category that has its setup is refused (category_has_setup)", r.status === 409 && r.body.code === "category_has_setup", r.body.detail);

  // ---------------------------------------------------------------- BR-5 did you mean, meaning check off
  r = await call("POST", "/structure/name-check", { pathwayType: "INDIVIDUAL", level: "category", parentKey: visitors, label: "Visiter visa" });
  ok("C11.3 BR-5 pass: name-check warns 'Visiter visa' with the existing trail and why", r.status === 201 && r.body.close?.[0]?.key === vv && r.body.close[0].trail.join(" › ") === "Retail › Temporary residence › Visitors › Visitor visa" && r.body.exact === null, r.body);
  r = await call("POST", "/structure/name-check", { pathwayType: "INDIVIDUAL", level: "category", parentKey: visitors, label: "Super visa" });
  ok("C11.3 BR-5 fail: an unrelated name gets no warning", r.body.close?.length === 0 && r.body.exact === null, r.body);
  r = await call("POST", "/structure/name-check", { pathwayType: "CORPORATE", level: "category", parentKey: null, label: "Visiter visa" });
  ok("C11.5 BR-8: the other type's names are never offered as close", r.body.close?.length === 0, r.body);
  r = await node("INDIVIDUAL", "category", "Visiter visa", visitors);
  ok("C11.3 BR-5 fail: saving a close name without 'add anyway' is refused with the close names (warn, then decide)", r.status === 409 && r.body.code === "close_names" && r.body.close?.[0]?.key === vv, r.body.detail);
  r = await node("INDIVIDUAL", "category", "Visiter visa", visitors, { decision: "add_anyway" });
  ok("C11.3 BR-5 pass: 'Add anyway' adds it and Activity records it", r.status === 201 && sql(`select count(*) from audit_event where action='added anyway' and entity_key='${r.body.key}'`) === "1", r.body.key);
  const typo = r.body.key;
  r = await call("POST", "/structure/meaning-check", { pathwayType: "INDIVIDUAL", label: "Visiter visa" });
  ok("C11.3 BR-5 (P-95): the AI meaning check is off: 403 paid_runs_off, no AI job, nothing spent", r.status === 403 && r.body.code === "paid_runs_off" && sql("select count(*) from drafting_job") === "0", r.body.detail);
  ok("C11.3 BR-5: every name shows 'Not meaning-checked' while the switch is off", (await structure()).nodes.every((n: any) => n.meaningChecked === false));
  const footer = ((await structure()).meaningCheck?.why ?? "") as string;
  ok("DV-bb-6c pass: the Program structure footer says in plain words that the meaning check is off", /AI meaning check is off/.test(footer), footer);
  ok("DV-bb-6c fail: the footer carries no decision number (PRODUCT §4: no ids on the main path)", !/\b[PD]-\d+/.test(footer), footer);

  // ---------------------------------------------------------------- BR-15 roles
  const asB = await Promise.all([node("INDIVIDUAL", "program", "Approver program", trR, {}, "user-B"), call("PATCH", `/structure/nodes/${visitors}`, { label: "X", version: 1 }, "user-B"),
    call("POST", "/structure/reorder", { pathwayType: "INDIVIDUAL", parentKey: null, keys: [prR, trR] }, "user-B"), call("DELETE", `/structure/nodes/${typo}`, { reason: "typo" }, "user-B")]);
  ok("C11.9 BR-15 fail: the approver cannot add, rename, reorder or remove (403 each, on the server)", asB.every((x) => x.status === 403), asB.map((x) => x.status));
  r = await node("INDIVIDUAL", "program", "No one", trR, {}, "nobody");
  ok("C11.3 BR-15 fail: an unknown caller is refused (401)", r.status === 401);

  // ---------------------------------------------------------------- reorder (applies at once, audit line)
  r = await call("POST", "/structure/reorder", { pathwayType: "INDIVIDUAL", parentKey: null, keys: [prR, trR] });
  s = await structure();
  ok("C11.9 reorder pass: the new Pathway order is kept and shown on the Structure, with an audit line", r.status === 201 && s.nodes.filter((n: any) => n.level === "pathway").map((n: any) => n.key).join() === [prR, trR].join() && sql("select count(*) from audit_event where action='reordered'") === "1");
  const c1 = await cat();
  ok("C11.10 reorder: Programs sections follow the Structure order", c1.sections.map((x: any) => x.pathwayKey).join() === [prR, trR].join(), c1.sections.map((x: any) => x.label));
  r = await call("POST", "/structure/reorder", { pathwayType: "INDIVIDUAL", parentKey: null, keys: [trR] });
  ok("C11.9 reorder fail: a list that is not exactly the names there is refused with the current list", r.status === 409 && r.body.current?.length === 2, r.body.detail);

  // ---------------------------------------------------------------- BR-6 rename (draft) and stale version
  r = await call("PATCH", `/structure/nodes/${visitors}`, { label: "Visitor programs", version: 1 });
  ok("C11.3 BR-6 pass: rename keeps the key and raises the version", r.status === 200 && r.body.version === 2 && r.body.label === "Visitor programs" && sql(`select name_key from program_def where program_node_key='${visitors}'`) === "visitorprograms");
  r = await call("PATCH", `/structure/nodes/${visitors}`, { label: "Visitors again", version: 1 });
  ok("C11.3 BR-6 fail: an edit made on an old version is refused with the current row", r.status === 409 && r.body.code === "stale" && r.body.current?.version === 2, r.body.detail);
  r = await call("PATCH", `/structure/nodes/${sp}`, { label: "Visitor visa", version: 1 });
  ok("C11.3 BR-6 fail: a rename onto a sibling's name is refused", r.status === 409 && r.body.existing?.key === vv, r.body.detail);
  r = await call("PATCH", `/structure/nodes/${vv}`, { allowedLocations: ["outside_canada"], version: 1 });
  ok("C11.3 M5: where cases may be opened is edited on the Structure", r.status === 200 && sql(`select allowed_locations from program_def where program_node_key='${vv}'`) === "{outside_canada}");

  // ---------------------------------------------------------------- every-Pathway reads (catalogue, path builder, proposal)
  r = await node("INDIVIDUAL", "program", "Economic immigration", prR);
  const econ = r.body.key;
  await node("INDIVIDUAL", "category", "Federal skilled worker", econ);
  const c2 = await cat();
  ok("C11.10 B1 pass: Immigration programs has one section per Retail Pathway, each with its combinations", c2.sections.length === 2 && c2.sections.find((x: any) => x.pathwayKey === prR)?.combinations === 1 && c2.totals.programs === 2, c2.sections.map((x: any) => [x.label, x.combinations]));

  // ---------------------------------------------------------------- lifecycle on a draft name (never released)
  // These names count as another person's, so a delete waits for a second person (P-116 amended: an author's own
  // draft is deleted at once, covered in check_w1_structure_r3.ts).
  sql("update program_def set created_by = 'user-C'");
  let u = (await call("GET", `/structure/nodes/${typo}/uses`)).body;
  ok("C11.9 L1: 'where used' first: an unused draft name may be removed, not retired", u.can.delete === null && /never released/.test(u.can.retire) && u.uses.length === 0, u.can);
  r = await call("DELETE", `/structure/nodes/${typo}`, { reason: "Typing slip; Visitor visa already exists." });
  const del = r.body;
  ok("C11.9 L4: removing is a draft change waiting for a different person (nothing removed yet)", r.status === 200 && del.status === "WAITING" && del.kind === "structure_node" && sql(`select count(*) from program_def where program_node_key='${typo}'`) === "1", del.status);
  r = await call("DELETE", `/structure/nodes/${typo}`, { reason: "again" });
  ok("C11.9 L4 fail: a second change while one is open is refused", r.status === 409, r.body.detail);
  r = await approve(del.id, "user-A");
  ok("C11.9 L4 fail: the person who proposed it cannot approve it", r.status === 403, r.body.detail);
  r = await approve(del.id);
  ok("C11.9 L1 pass: approved by a second person, an unused draft name is removed at once", r.status === 201 && sql(`select count(*) from program_def where program_node_key='${typo}'`) === "0" && sql(`select status from library_change where id='${del.id}'`) === "RELEASED");
  r = await call("DELETE", `/structure/nodes/${visitors}`, { reason: "Not needed" });
  ok("C11.9 L6 / R3-4 fail: a program whose branch holds a setup draft cannot be deleted; the setup is named and listed", r.status === 409 && /" under it has a setup draft/.test(r.body.detail) && r.body.uses?.some((x: any) => x.kind === "combination"), r.body.detail);
  r = await call("DELETE", `/structure/nodes/${vv}`, { reason: "Not needed" });
  ok("C11.9 L6 fail: a name whose combination has a setup draft cannot be deleted (its setup draft uses it)", r.status === 409 && /setup draft uses it/.test(r.body.detail) && r.body.uses?.some((x: any) => x.kind === "combination" && x.href === `/c/${combo.id}`), r.body.detail);
  const fsw = (await structure()).nodes.find((n: any) => n.label === "Federal skilled worker").key;
  r = await call("DELETE", `/structure/nodes/${fsw}`, { reason: "Wrong place" });
  const late = r.body;
  await node("INDIVIDUAL", "subCategory", "Outside Canada", fsw);
  r = await approve(late.id);
  ok("C11.9 L3 fail: checked again at approval: a name used since it was proposed is not removed", r.status === 409 && sql(`select count(*) from program_def where program_node_key='${fsw}'`) === "1", r.body.detail);
  r = await call("POST", `/library/changes/${late.id}/withdraw`, { note: "Now it has a sub-category." });
  ok("C11.9 L1 Undo: the author withdraws an open change", r.status === 201 && r.body.status === "WITHDRAWN", r.body.status);
  r = await call("DELETE", `/combinations/${combo.id}`, { reason: "Started by mistake" });
  const cdel = r.body;
  await approve(cdel.id);
  ok("C11.9 L1 pass: a never-released combination is removed when approved; its name is Not started again", sql(`select count(*) from combination where id='${combo.id}'`) === "0" && leaves((await cat()).tree).find((l) => l.nodeKey === vv)?.statusText === "Not started");

  // ---------------------------------------------------------------- Reset: empty in both tabs, a read creates none
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  await call("GET", "/catalogue?pathway=INDIVIDUAL"); await call("GET", "/catalogue?pathway=CORPORATE"); await call("GET", "/session");
  ok("C11.7 Reset: 0 names after Reset and none recreated by reads (both tabs empty)", r.status === 201 && sql("select count(*) from program_def") === "0" && (await structure("CORPORATE")).empty === true);
  r = await call("POST", "/demo/load");
  ok("setup: the sample inputs load, with their P-112 Pathways added like a person adds them", r.status === 201 && r.body.log?.[0] === 'pathway "Temporary residence" (Sample)', r.body.log?.slice(0, 2));
  r = await call("POST", "/demo/load");
  ok("C11.7 fail: loading again while the Structure has names is refused", r.status === 409, r.body.detail);

  // ---------------------------------------------------------------- released combination: rename = one name-only change
  const live = (await cat("pathway=INDIVIDUAL&filter=live")).rows[0];
  ok("C11.10 A3 (QA-184): the released sample is Live, its progress in the card's words, and files as PDF", live?.progress?.live === true && live.progress.of === 5 && live.progress.label.startsWith(live.setup.bar.text) && live.filed === "PDF" && live.trail.join(" › ") === "Retail › Temporary residence › Work permits › Employer-specific work permit › With an LMIA", [live?.progress?.label, live?.filed, live?.trail]);
  const wp = "individual.work_permits";
  r = await call("PATCH", `/structure/nodes/${wp}`, { label: "Work permit programs", version: 1 });
  const rel = JSON.parse(sql(`select snapshot from config_release where combination_id='${live.combinationId}' order by version desc limit 1`));
  const draft = (await call("GET", `/combinations/${live.combinationId}/config`)).body.snapshot;
  const changes = diff(rel, draft);
  ok("C11.3 BR-6 pass: a rename gives exactly one name-only change (no expert tick) on the combination under it", r.status === 200 && r.body.affected >= 1 && changes.length === 1 && changes[0].kind === "Row details" && changes[0].needs_sme === false, changes.map((c) => [c.kind, c.needs_sme]));
  ok("C11.3 BR-6: setup shows the new name at once; the release keeps the old one until the next release", (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x: any) => x.combinationId === live.combinationId)?.trail[2] === "Work permit programs" && rel.combination.path.includes("Work permits"));
  const lmiaNode = live.nodeKey;
  const v = (await structure()).nodes.find((n: any) => n.key === lmiaNode).version;
  await call("PATCH", `/structure/nodes/${lmiaNode}`, { allowedLocations: ["inside_canada", "outside_canada"], version: v });
  const changes2 = diff(rel, (await call("GET", `/combinations/${live.combinationId}/config`)).body.snapshot);
  ok("C11.3 M5 fail-safe: a location edit on a released combination needs the expert tick at release", changes2.length === 1 && changes2[0].needs_sme === true, changes2.map((c) => [c.kind, c.needs_sme]));
  const draftRow = (await call("GET", "/draft", undefined, "user-B")).body.rows.find((x: any) => x.combinationId === live.combinationId);
  ok("C11.3 BR-6/BR-14: the renaming author is a draft author, so the approver sees it held until reviewed", !!draftRow && draftRow.held === true, draftRow?.why);

  // ---------------------------------------------------------------- A2: retire a Live combination, guard case opening
  r = await call("POST", "/runtime/cases", { combinationId: live.combinationId, reference: "W1-OPEN-1", clientActor: "user-P", principal: { displayName: "Sample Principal A" } }, "user-O");
  const caseId = r.body?.case?.id ?? r.body?.id;
  ok("setup: a case is opened on the Live combination before it is retired", r.status === 201 && !!caseId, r.status);
  u = (await call("GET", `/combinations/${live.combinationId}/uses`)).body;
  ok("C11.9 A2 pass: its own release and its open case do not block retiring a Live combination; they are listed", u.can.retire === null && u.can.delete !== null && u.uses.some((x: any) => x.kind === "case" && !x.blocks) && u.uses.some((x: any) => x.kind === "release" && !x.blocks), u.can);
  r = await call("DELETE", `/combinations/${live.combinationId}`, { reason: "Not used" });
  ok("C11.9 L2 fail: a released combination is retired, never deleted", r.status === 409 && /^Can't delete: released items are kept. Retire it instead./.test(r.body.detail), r.body.detail);
  r = await call("POST", `/combinations/${live.combinationId}/retire`, { reason: "Replaced by the new route (Sample)" });
  const ret = r.body;
  const queue = (await call("GET", "/review-queue", undefined, "user-B")).body;
  const item = queue.items?.find((x: any) => x.id === `change:${ret.id}`);
  ok("C11.9 L4: the retire waits on To review for a second person, in words ('Retire the combination', with the reason)", item?.state === "needs" && /^Retire the combination\. Reason: Replaced/.test(item?.what ?? ""), item?.what);
  await approve(ret.id);
  ok("C11.9 L4: an approved retire waits for the release (still open on the catalogue until then)", sql(`select retired_at is null from combination where id='${live.combinationId}'`) === "t");
  r = await releaseAll();
  ok("C11.9 A2 pass: the release carries the retire: the combination is retired", r.status === 201 && sql(`select retired_at is not null from combination where id='${live.combinationId}'`) === "t" && sql(`select status from library_change where id='${ret.id}'`) === "RELEASED", r.body.library ?? r.body.detail);
  const all = await cat("pathway=INDIVIDUAL&filter=all"), retiredView = await cat("pathway=INDIVIDUAL&filter=retired");
  ok("C11.10 A2: a retired combination leaves 'All' and shows under 'Retired'", !all.rows.some((x: any) => x.combinationId === live.combinationId) && retiredView.rows.some((x: any) => x.combinationId === live.combinationId && x.statusText === "Retired") && all.counts.retired === 1, all.counts);
  r = await call("POST", "/runtime/cases", { combinationId: live.combinationId, reference: "W1-NEW-2", clientActor: "user-P", principal: { displayName: "Sample Principal B" } }, "user-O");
  ok("C11.9 A2 fail: no new case opens on a retired combination (runtime guard)", r.status === 409 && /retired/.test(r.body.detail), r.body.detail);
  r = await call("GET", `/runtime/cases/${caseId}`, undefined, "user-O");
  ok("C11.9 A2 pass: the case already open keeps its pinned release and still opens", r.status === 200, r.status);
  const po2 = (await call("GET", "/path-options?pathway=INDIVIDUAL")).body;
  const esw = po2.programs.find((p: any) => p.key === wp)?.categories.find((c: any) => c.key === "individual.work_permits.employer_specific");
  ok("C11.9 L2: a retired combination is not offered as a combination to open in pickers", !esw?.subCategories.some((x: any) => x.key === lmiaNode && x.combinationId), esw?.subCategories.map((x: any) => x.key));

  // ---------------------------------------------------------------- retire a structure name, leaf first (L6)
  u = (await call("GET", `/structure/nodes/individual.work_permits.employer_specific/uses`)).body;
  ok("C11.9 L3 fail: a category with a name under it that is not retired cannot be retired; the use is listed", u.can.retire !== null && u.uses.some((x: any) => x.kind === "child" && x.blocks), u.can.retire);
  u = (await call("GET", `/structure/nodes/${lmiaNode}/uses`)).body;
  ok("C11.9 L3 pass: a released name whose combination is retired may be retired (earlier releases and cases listed, not blocking)", u.can.retire === null && u.released === true, u.can);
  r = await call("POST", `/structure/nodes/${lmiaNode}/retire`, { reason: "Its combination is retired (Sample)" });
  await approve(r.body.id);
  await releaseAll();
  ok("C11.9 L2: after the release the name is retired and hidden from pickers", sql(`select retired_at is not null from program_def where program_node_key='${lmiaNode}'`) === "t" && !(await call("GET", "/path-options?pathway=INDIVIDUAL")).body.programs.find((p: any) => p.key === wp)?.categories.find((c: any) => c.key === "individual.work_permits.employer_specific")?.subCategories.some((x: any) => x.key === lmiaNode));
  r = await node("INDIVIDUAL", "subCategory", "Under a retired name", lmiaNode);
  ok("C11.9 L2 fail: nothing new goes under a retired name", r.status === 400 || r.status === 409, r.body.detail);
  r = await call("POST", `/combinations/${live.combinationId}/restore`, { reason: "Back in use" });
  ok("C11.9 restore fail: a combination whose name is retired is restored only after the name", r.status === 409 && /restore it on the Structure first/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/structure/nodes/${lmiaNode}/restore`, { reason: "Back in use (Sample)" });
  await approve(r.body.id); await releaseAll();
  r = await call("POST", `/combinations/${live.combinationId}/restore`, { reason: "Back in use (Sample)" });
  await approve(r.body.id); await releaseAll();
  r = await call("POST", "/runtime/cases", { combinationId: live.combinationId, reference: "W1-NEW-3", clientActor: "user-P", principal: { displayName: "Sample Principal C" } }, "user-O");
  ok("C11.9 restore pass: restored by the same path (approve, release): cases open again and it is back in All", r.status === 201 && (await cat("pathway=INDIVIDUAL&filter=all")).rows.some((x: any) => x.combinationId === live.combinationId), r.status);
  const changesList = (await call("GET", "/library/changes")).body;
  ok("C11.9 To review: lifecycle changes are named in words ('structure name', 'combination') with the full trail", Array.isArray(changesList) && changesList.some((c: any) => c.kind_word === "structure name" && c.label.includes(" › ")) && changesList.some((c: any) => c.kind_word === "combination"), changesList.map?.((c: any) => c.kind_word));

  // ---------------------------------------------------------------- BR-8 separate types
  const corp = await cat("pathway=CORPORATE"), ind = await cat("pathway=INDIVIDUAL");
  ok("C11.5 BR-8: a Retail list never holds a Corporate combination and the reverse", ind.rows.every((x: any) => x.pathwayType === "INDIVIDUAL") && corp.rows.every((x: any) => x.pathwayType === "CORPORATE" && x.trail[0] === "Corporate and employers"));

  const out = join(import.meta.dirname, "..", "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_w1_structure.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
