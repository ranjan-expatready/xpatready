// C11.3 (Day-0 acceptance, P-220) — Five levels with Pathway type as the tab (Retail · Corporate and employers) and the
// full trail on every list; one Structure page adds and renames with a duplicate check and an AI "did you mean"; a
// combination is picked only from it (P-104; the New combination page is gone, P-125 (5), P-128 (5)); the sample structure
// uses the wave 1 names (P-112).
// Status (CAPABILITIES, 1 Nov): Partial. Missing: the AI meaning check is hard-off ("off until W1-07") instead of behind
// the live switch like every AI step (P-175); the full five-part trail is not on every list (library "Used by", the
// finder's run and plan show Pathway › Program › Category without the Pathway type); Load sample still uses the earlier
// names, not P-112's.
// Decisions: P-104, P-112, P-125, P-128, P-95 (the meaning check "sits behind the same paid-run switch", off by default),
// P-175, P-116, P-148 (Load sample shows only the six P-112 combinations).
// US$0: no model, no canada.ca; the AI check is only asked on a copy without the live switch.
//   zsh tools/isolated.sh acc_a3 4563 start && ./node_modules/.bin/tsx acceptance/C11.3.test.ts 4563 xr_studio_acc_a3
// Expected today (branch claude/awesome-mendel-nusfn1 from main 55376830, 2 Nov 2026, isolated copy, US$0): 26 pass, 1
// fail — failing: AT-5 (second) only, the AI "did you mean", which waits on X6 (the meaning check answers "The AI
// meaning check is off", footer on:false). AT-9 loads the six as the Demo menu does ({"sample":"six"}, P-148); before
// 2 Nov it called POST /demo/load with no body, the suites' older fixture (api/src/demo.ts load), so AT-9.2–9.6 failed
// on names no person can load (qa after-merge 2 Nov, Question 1). AT-10 full trails pass since #505 (QA-150).
// Since QA-215 (4 Nov) the held AT-5 check prints HELD, not FAIL (P-284): today's expected result is 26/26 passed, 1 held.
// Exit: 0 all pass (held steps excepted) · 1 a check failed · 2 setup missing or refused (demo port or database, copy not
// reachable, sample).
import { checkCopy, sqlFor } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4563), DB = process.argv[3] ?? "xr_studio_acc_a3";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
let heldN = 0;
/** A step of a held part (P-284): PASS when green; red, it prints HELD with the decision that holds it and fails nothing. */
const held = (name: string, why: string, c: unknown, detail?: unknown) => { if (c) return ok(name, c, detail); heldN++; console.log(`HELD  ${name} — ${why}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- responses are read loosely, as in tests/check_*.ts
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  try {
    const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
    return { status: r.status, body: j ?? {} };
  } catch (e) { return { status: 0, body: { detail: String(e) } }; }
};
const sql = sqlFor(DB);
const TECH = /ENOENT|errno|syscall|\/Users\/|node:|Prisma|at [A-Za-z.]+ \(|Error:/;
const plain = (b: any) => typeof b?.detail === "string" && b.detail.length > 10 && !TECH.test(b.detail); // eslint-disable-line @typescript-eslint/no-explicit-any
const node = (pathwayType: string, level: string, label: string, parentKey: string | null = null, extra: Record<string, unknown> = {}, actor = "user-A") => call("POST", "/structure/nodes", { pathwayType, level, label, parentKey, ...extra }, actor);
const committed = async () => (await call("GET", "/ledger")).body?.committed_usd;
const T = (...p: string[]) => p.join(" › ");
const FIVE = /^(Retail|Corporate and employers) › [^›]+ › [^›]+ › [^›]+/; // type › pathway › program › category (› sub-category)

(async () => {
  await checkCopy(PORT, DB);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const usd0 = await committed();

  // ------------------------------------------------ the Pathway type is the tab, a fixed value
  const retail = (await call("GET", "/structure?pathwayType=INDIVIDUAL")).body, corp = (await call("GET", "/structure?pathwayType=CORPORATE")).body;
  const bogus = await call("GET", "/structure?pathwayType=FAMILY");
  ok("C11.3 AT-1 the Pathway type is the tab: Retail and Corporate and employers, fixed values that a read never stores as rows",
    retail?.typeLabel === "Retail" && corp?.typeLabel === "Corporate and employers" && sql("select count(*) from program_def") === "0", [retail?.typeLabel, corp?.typeLabel]);
  ok("C11.3 AT-1 refusal: a Pathway type outside the two is refused (400)", bogus.status === 400, bogus.status);

  // ------------------------------------------------ five levels, added on the one Structure page
  let r = await node("INDIVIDUAL", "pathway", "Temporary residence");
  const tr = r.body?.key;
  r = await node("INDIVIDUAL", "program", "Study permits", tr); const sp = r.body?.key;
  r = await node("INDIVIDUAL", "category", "Study permit", sp, { allowedLocations: ["outside_canada", "inside_canada"] }); const spc = r.body?.key;
  r = await node("INDIVIDUAL", "subCategory", "Outside Canada", spc); const out = r.body?.key;
  ok("C11.3 AT-2 the four levels under the type are added on Program structure: Pathway › Program › Category › Sub-category",
    !!tr && !!sp && !!spc && !!out && sql(`select string_agg(node_kind::text, ',' order by node_kind::text) from program_def`).split(",").length === 4, sql("select string_agg(node_kind::text, ',') from program_def"));
  const noParent = await node("INDIVIDUAL", "program", "Visitors", null);
  const sixth = await node("INDIVIDUAL", "subCategory", "From a designated school", out);
  const wrongParent = await node("INDIVIDUAL", "category", "Visitor visa", tr);
  ok("C11.3 AT-2 refusal: each level sits only under the level above (a program without its Pathway, a sixth level, a category straight under a Pathway: 400), nothing stored",
    noParent.status === 400 && sixth.status === 400 && wrongParent.status === 400 && sql("select count(*) from program_def") === "4", [noParent.status, sixth.status, wrongParent.status]);

  // ------------------------------------------------ duplicate check and "did you mean"
  const four = await Promise.all([0, 1, 2, 3].map(() => node("INDIVIDUAL", "program", "Visitors", tr)));
  const vis = four.find((x) => x.status === 201)?.body?.key;
  ok("C11.3 AT-3 duplicate check: four adds of one name at the same moment store one; the others are refused (409) naming the one that exists",
    four.filter((x) => x.status === 201).length === 1 && four.filter((x) => x.status === 409 && x.body?.existing?.key === vis).length === 3 && sql(`select count(*) from program_def where parent_node_key='${tr}' and name_key='visitors'`) === "1", four.map((x) => x.status));
  r = await node("INDIVIDUAL", "pathway", "  temporary RESIDENCE ");
  ok("C11.3 AT-3 refusal: a twin written another way (case, spaces) is refused in plain words, with the existing name", r.status === 409 && r.body?.existing?.key === tr && plain(r.body), r.body?.detail);
  r = await node("INDIVIDUAL", "category", "Visitor visa", vis);
  const vv = r.body?.key;
  r = await call("POST", "/structure/name-check", { pathwayType: "INDIVIDUAL", level: "category", parentKey: vis, label: "Visiter visa" });
  ok("C11.3 AT-4 did you mean (rules, US$0): 'Visiter visa' is warned as close to Visitor visa, with its full trail",
    r.body?.close?.[0]?.key === vv && T(...(r.body?.close?.[0]?.trail ?? [])) === T("Retail", "Temporary residence", "Visitors", "Visitor visa"), r.body?.close?.[0]);
  r = await node("INDIVIDUAL", "category", "Visiter visa", vis);
  ok("C11.3 AT-4 refusal: saving the close name without 'Add anyway' is refused (409) with the close names; nothing stored",
    r.status === 409 && r.body?.code === "close_names" && sql(`select count(*) from program_def where name_key='visitervisa'`) === "0", r.body?.code);
  r = await node("INDIVIDUAL", "category", "Visiter visa", vis, { decision: "add_anyway" });
  const typo = r.body?.key;
  ok("C11.3 AT-4 'Add anyway' adds it and Activity records who decided", r.status === 201 && sql(`select count(*) from audit_event where action='added anyway' and entity_key='${typo}'`) === "1", r.status);
  const jobs0 = sql("select count(*) from drafting_job");
  r = await call("POST", "/structure/meaning-check", { pathwayType: "INDIVIDUAL", level: "category", parentKey: vis, label: "Tourist visa" });
  ok("C11.3 AT-5 refusal (US$0): on a copy without the live switch the AI 'did you mean' calls no AI and spends nothing, in plain words",
    r.status >= 400 && r.status < 500 && plain(r.body) && sql("select count(*) from drafting_job") === jobs0 && (await committed()) === usd0, { status: r.status, detail: r.body?.detail });
  // The held part (P-284, P-265): while the AI "did you mean" is held for the product owner, this check prints HELD when
  // it is red and is not counted as a failure (QA-215); green, it passes as before. Released hold: back to ok().
  held("C11.3 AT-5 the AI 'did you mean' is built behind the same live switch as every AI step (P-175): it says AI is switched off on this copy, not that the check itself is off",
    "P-284: the AI meaning check is held for the SA-01B product owner (P-251)",
    /switched off on this copy/.test(r.body?.detail ?? "") && (await call("GET", "/structure?pathwayType=INDIVIDUAL")).body?.meaningCheck?.on !== false, { detail: r.body?.detail, footer: (await call("GET", "/structure?pathwayType=INDIVIDUAL")).body?.meaningCheck });

  // ------------------------------------------------ rename on the same page
  const v1 = Number(sql(`select version from program_def where program_node_key='${vis}'`));
  r = await call("PATCH", `/structure/nodes/${vis}`, { label: "Visitor programs", version: v1 });
  ok("C11.3 AT-6 rename on Program structure keeps the key and moves the version on; the cards follow the new name",
    r.status === 200 && r.body?.key === vis && r.body?.version === v1 + 1 && ((await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all")).body?.rows ?? []).find((x: any) => x.nodeKey === vv)?.trail?.[2] === "Visitor programs", r.body?.label); // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await call("PATCH", `/structure/nodes/${vis}`, { label: "Visitors again", version: v1 });
  ok("C11.3 AT-6 refusal: a rename made on an old version is refused (409) with the current name; nothing changes", r.status === 409 && r.body?.code === "stale" && sql(`select label from program_def where program_node_key='${vis}'`) === "Visitor programs", r.body?.detail);
  r = await call("PATCH", `/structure/nodes/${typo}`, { label: "Visitor visa", version: 1 });
  ok("C11.3 AT-6 refusal: a rename onto a sibling's name is refused (409)", r.status === 409 && r.body?.existing?.key === vv, r.body?.detail);
  const asB = await Promise.all([node("INDIVIDUAL", "program", "Work permits", tr, {}, "user-B"), call("PATCH", `/structure/nodes/${vis}`, { label: "X", version: v1 + 1 }, "user-B")]);
  const asNobody = await node("INDIVIDUAL", "program", "Work permits", tr, {}, "nobody");
  ok("C11.3 AT-7 refusal: only an author adds or renames (approver 403, unknown caller 401); nothing stored", asB.every((x) => x.status === 403) && asNobody.status === 401 && sql(`select count(*) from program_def where name_key='workpermits'`) === "0", [...asB.map((x) => x.status), asNobody.status]);

  // ------------------------------------------------ a combination is picked only from the structure
  const pathGone = await call("POST", "/combinations/path", { pathway: "INDIVIDUAL", program: { create: "X" }, category: { create: "Y" } });
  const atProgram = await call("POST", "/combinations", { nodeKey: vis });
  const unknown = await call("POST", "/combinations", { nodeKey: "individual.made_up.nowhere" });
  ok("C11.3 AT-8 refusal: a combination is only a last-level name of the structure (no free path 404; a Program 400; an unknown name 404)",
    pathGone.status === 404 && atProgram.status === 400 && unknown.status === 404 && sql("select count(*) from combination") === "0", [pathGone.status, atProgram.status, unknown.status]);
  r = await call("POST", "/combinations/start", { nodeKey: out });
  ok("C11.3 AT-8 a sub-category picked from the structure becomes its combination", r.status === 201 && sql("select count(*) from combination") === "1", r.status);

  // ------------------------------------------------ the sample uses the wave 1 names (P-112); the full trail on every list
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load", { sample: "six" }); // what Demo › Load sample sends (web/src/App.tsx); no body is the suites' fixture
  if (load.status >= 300) { console.error("STOP  setup missing: Load sample failed", load.status); process.exit(2); }
  const trails = [...((await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all")).body?.rows ?? []), ...((await call("GET", "/catalogue?pathway=CORPORATE&filter=all")).body?.rows ?? [])].map((x: any) => T(...x.trail)); // eslint-disable-line @typescript-eslint/no-explicit-any
  const WAVE1 = [
    T("Retail", "Temporary residence", "Visitors", "Visitor visa", "No sub-category"),
    T("Retail", "Temporary residence", "Study permits", "Study permit", "Outside Canada"),
    T("Retail", "Temporary residence", "Work permits", "Employer-specific work permit", "With an LMIA – inside Canada"),
    T("Retail", "Permanent residence", "Provincial nominees", "Express Entry stream", "No sub-category"),
    T("Retail", "Permanent residence", "Family sponsorship", "Spouse or common-law partner", "No sub-category"),
    T("Corporate and employers", "Temporary residence", "Labour market impact assessment", "High-wage position", "No sub-category"),
  ];
  WAVE1.forEach((w, i) => ok(`C11.3 AT-9.${i + 1} Load sample has the wave 1 combination ${w}`, trails.includes(w), trails.filter((t) => t.split(" › ")[3] === w.split(" › ")[3] || t.split(" › ")[2] === w.split(" › ")[2]).slice(0, 4)));
  const vvLoaded = ((await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all")).body?.rows ?? []).find((x: any) => x.label === "Visitor visa"); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.3 AT-10 full trail on Immigration programs: every card names Pathway type › Pathway › Program › Category › Sub-category (or No sub-category)", trails.length > 0 && trails.every((t) => FIVE.test(t) && t.split(" › ").length === 5), trails.filter((t) => t.split(" › ").length !== 5));
  const usedBy = ((((await call("GET", "/library/forms/list")).body?.rows ?? []) as any[]).flatMap((x) => x.used_by ?? [])).map((u: any) => u.label as string); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.3 AT-10 full trail on the Form library's Used by: each combination is named from its Pathway type down", usedBy.length > 0 && usedBy.every((l) => FIVE.test(l)), usedBy.slice(0, 3));
  const plan = (await call("POST", `/combinations/${vvLoaded?.combinationId}/forms/find/plan`, { mode: "rules" })).body;
  ok("C11.3 AT-10 full trail on the form finder's plan and run card: Pathway type › Pathway › Program › Category", FIVE.test(T(...(plan?.combination?.trail ?? []))), plan?.combination?.trail);
  ok("C11.3 AT-11 US$0: the whole file spent nothing (ledger unchanged, no live AI job)", (await committed()) === usd0 && sql("select count(*) from drafting_job where mode='LIVE'") === "0", { before: usd0, after: await committed() });

  console.log(`\n${pass}/${pass + fail} passed${heldN ? `, ${heldN} held (P-284)` : ""}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
