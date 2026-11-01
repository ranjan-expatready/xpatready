// C11.11 (Partial) — Forms enter only through Shared library › Forms; guides and checklists are stored there as "Read by
// AI", never filled; a combination only picks approved forms from the library; no add or attach controls in the
// combination; Overview only reports; online-only forms are flagged at intake (P-152); each combination keeps its IRCC
// checklist page, proposed by the rules and confirmed once by a person (P-156). Decisions: P-118 (Q2, Q3, Q5), P-152,
// P-156, P-176, P-103, P-123.
// Missing today: a checklist can still become a filed form line on a combination (QA-101: the finder attached IMM 5483 to
// Study permit; the same hole is open through POST /combinations/:id/forms, and the released sample With an LMIA carries
// the checklists IMM 5488 and IMM 5905 as "PDF upload" form lines, so its filing lines count them as filed); a form held
// only online is listed as "no file" (asked for a PDF) instead of "Online only · no official PDF" (P-152).
// Sample combinations are found by their structure trail (acceptance/lib/pack1.ts: P-112's names, else today's keys), so
// the file runs on today's sample and on P-148's six. Test input planted by SQL is marked Sample.
// API and data level only (the screen parts are journey J1 in acceptance/journeys/). US$0: no model, no canada.ca.
//   zsh tools/isolated.sh acc_b1 4564 start && ./node_modules/.bin/tsx acceptance/C11.11.test.ts 4564 xr_studio_acc_b1
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 21 pass, 5 fail — failing: AT-5 (POST
// /combinations/:id/forms makes the checklist IMM 5484 a filed form line, 201), AT-6 and AT-7 (the released With an
// LMIA has the checklists IMM 5488 and IMM 5905 as filed lines, and its filing lines count them), all because nothing
// stops a checklist from being a form line (QA-101); AT-12 twice (a form held only online is listed as "no file", not
// "Online only · no official PDF", P-152). AT-13 (P-156 checklist page confirmed once) guards what works.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).
import { checkCopy, needCombo, sqlFor, stop } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4564), DB = process.argv[3] ?? "xr_studio_acc_b1";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type R = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const words = (b: any) => `${b?.detail ?? ""} ${b?.message ?? ""}`; // eslint-disable-line @typescript-eslint/no-explicit-any
/** The newest version of each form line of a combination that is not removed (as effective() reads them). */
const liveLines = (combo: string) => sql(`select cf.lineage_key from combination_form cf where cf.combination_id='${combo}' and cf.version=(select max(v.version) from combination_form v where v.combination_id=cf.combination_id and v.lineage_key=cf.lineage_key) and cf.status<>'RETIRED' order by 1`).split("\n").filter(Boolean);
const spend = () => sql("select coalesce(sum(cost_usd),0) from drafting_job");
type Row = { code: string; type: string; accepts: string | null; field_map: { kind: string }; used_by: { id: string; as_source?: boolean }[] };

(async () => {
  await checkCopy(PORT, DB);
  if ((await call("POST", "/demo/reset", { confirm: "RESET" })).status >= 300) stop("demo reset refused");
  if ((await call("POST", "/demo/load")).status !== 201) stop("the sample did not load");
  const vv = await needCombo(PORT, DB, "visitor_visa"), wp = await needCombo(PORT, DB, "lmia_work_permit");
  const spend0 = spend();
  const lib = (await call("GET", "/library/forms/list")).body.rows as Row[];
  const kind = (code: string) => lib.find((r) => r.code === code)?.type;

  // ── Guides and checklists are stored in the library as "Read by AI", never filled.
  const notForms = lib.filter((r) => r.type !== "form");
  ok("C11.11 AT-1 [IRCC-F06] every guide and checklist in the library is Read by AI with no field map", notForms.length >= 4 && notForms.every((r) => r.accepts === "READ_BY_AI" && r.field_map.kind === "not_filled"), notForms.map((r) => [r.code, r.accepts, r.field_map.kind]));
  ok("C11.11 AT-1 fail case: no IRCC form (type form) is marked Read by AI", lib.filter((r) => r.type === "form").every((r) => r.accepts !== "READ_BY_AI"), lib.filter((r) => r.type === "form" && r.accepts === "READ_BY_AI").map((r) => r.code));
  const acc = await call("POST", `/library/forms/${encodeURIComponent("IMM 5484")}/accepts`, { channels: ["PDF_UPLOAD"], reason: "Acceptance test: a checklist is never filed (Sample)." });
  ok("C11.11 AT-2 [IRCC-F06] what IRCC accepts cannot be set for a checklist: 409 in words, nothing waits", acc.status === 409 && /read by AI and never filed/.test(words(acc.body)) && sql("select count(*) from library_change where kind='form_accepts' and key='IMM 5484'") === "0", acc);

  // ── A combination only picks approved forms from the library.
  const add = await call("POST", `/combinations/${vv}/forms`, { formKey: "imm5257" });
  ok("C11.11 AT-3 pass: the author adds an approved library form (IMM 5257, any spelling) to Visitor visa", add.status === 201 && liveLines(vv).includes("IMM 5257"), { add, lines: liveLines(vv) });
  const again = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5257" });
  ok("C11.11 AT-3 fail case: the same form twice is 409 'already one of this combination's forms', still one line", again.status === 409 && /already one of this combination's forms/.test(words(again.body)) && liveLines(vv).filter((l) => l === "IMM 5257").length === 1, again);
  const before = liveLines(vv).join();
  const missing = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 1294" });
  ok("C11.11 AT-4 [IRCC-F01] a form that is not in the library is 404 and says to find or upload it in the library; nothing added", missing.status === 404 && /not in the library/.test(words(missing.body)) && liveLines(vv).join() === before, missing);
  // Test input: a library form whose only file is not approved (no checksum on the approved list, nothing official).
  sql("insert into gov_form_def (id, workspace_id, form_key, display_name, form_kind) select gen_random_uuid(), workspace_id, 'IMM 0101', 'Acceptance test form (Sample)', 'data_form' from gov_form_def where form_key='IMM 5409'");
  sql(`insert into form_edition select (jsonb_populate_record(null::form_edition, to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'gov_form_def_id', (select id from gov_form_def where form_key='IMM 0101'), 'edition_label', 'IMM 0101 (01-2026)', 'sha256', repeat('ab', 32), 'official_file', null))).* from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5409' limit 1`);
  const unapproved = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 0101" });
  ok("C11.11 AT-4 fail case: a library form whose file is not approved is refused (409, waits for a second person); nothing added", unapproved.status === 409 && /second person/.test(words(unapproved.body)) && liveLines(vv).join() === before, unapproved);
  const nofile = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5802" });
  ok("C11.11 AT-4 fail case: a form listed by IRCC with no file yet is 409 'No file yet', said in words", nofile.status === 409 && /no file in the library yet/.test(words(nofile.body)) && liveLines(vv).join() === before, nofile);

  // ── Guides and checklists never become filed form lines (QA-101).
  ok("setup: IMM 5484 is a checklist and Guide 5256 a guide in the library", kind("IMM 5484") === "checklist" && kind("Guide 5256") === "guide", [kind("IMM 5484"), kind("Guide 5256")]);
  const chk = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5484" });
  ok("C11.11 AT-5 [IRCC-F06] a checklist (IMM 5484) is never added as a filed form line: refused in words (4xx), no line made", chk.status >= 400 && chk.status < 500 && /checklist/i.test(words(chk.body)) && !liveLines(vv).includes("IMM 5484"), { status: chk.status, body: chk.body, lines: liveLines(vv) });
  // The other route, on the same real target (Visitor visa exists in today's sample and in P-112's): another checklist.
  if (kind("IMM 5881") !== "checklist") stop("IMM 5881 is not a checklist in the library");
  const viaLines = await call("POST", `/combinations/${vv}/lines`, { formKey: "IMM 5881", kind: "FORM" });
  ok("C11.11 AT-5 [IRCC-F06] the other route (POST …/lines, Visitor visa, checklist IMM 5881) makes no form line and says so: refused in words (4xx), or kept as a source read by AI (added: source) with words", ((viaLines.status >= 400 && viaLines.status < 500) || (viaLines.status < 300 && viaLines.body?.added === "source")) && words(viaLines.body).trim().length > 10 && !liveLines(vv).includes("IMM 5881"), { status: viaLines.status, body: viaLines.body, lines: liveLines(vv) });
  const guide = await call("POST", `/combinations/${vv}/forms`, { formKey: "Guide 5256" });
  ok("C11.11 AT-5 [IRCC-F06] a guide is never a form line: refused (4xx), no line", guide.status >= 400 && guide.status < 500 && !liveLines(vv).includes("Guide 5256"), guide.status);
  const readOnly = lib.filter((r) => r.type !== "form").map((r) => r.code);
  const offenders = sql(`select c.combination_key || ' ' || cf.lineage_key from combination_form cf join combination c on c.id=cf.combination_id where cf.version=(select max(v.version) from combination_form v where v.combination_id=cf.combination_id and v.lineage_key=cf.lineage_key) and cf.status<>'RETIRED' and cf.lineage_key in (${readOnly.map((c) => `'${c}'`).join(",")})`).split("\n").filter(Boolean).filter((x) => !x.endsWith("IMM 5484"));
  ok("C11.11 AT-6 [IRCC-F06] the loaded sample has no guide or checklist as a filed form line on any combination (draft or released)", offenders.length === 0, offenders);
  // The guide stays a source read by AI: Visitor visa uses Guide 5256 as a source, not as a line.
  ok("C11.11 AT-6 pass: a guide is used by combinations as a source read by AI (used by, as source)", (lib.find((r) => r.code === "Guide 5256")?.used_by ?? []).some((u) => u.as_source === true), lib.find((r) => r.code === "Guide 5256")?.used_by);
  const ch = (await call("GET", `/combinations/${wp}/channels`)).body as { filing_method: string; lines: { form: string }[] };
  const cat = JSON.stringify((await call("GET", "/catalogue")).body);
  ok("C11.11 AT-7 [IRCC-F06] With an LMIA's filing lines and the Programs card never count a checklist as filed (no IMM 5488 or IMM 5905 line; no 'Checklists only' tag)", !ch.lines.some((l) => readOnly.includes(l.form)) && !/"filing":"Checklists only"/.test(cat), { lines: ch.lines.map((l) => l.form), checklistsOnly: /Checklists only/.test(cat) });

  // ── Roles: only the configuration author adds; data unchanged on refusal.
  const n0 = liveLines(vv).join();
  const asApprover = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5707" }, "user-B");
  const asClient = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5707" }, "user-P");
  const asNobody = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5707" }, null);
  ok("C11.11 AT-8 roles: the approver and a client are 403, nobody named is 401; no line added", asApprover.status === 403 && asClient.status === 403 && asNobody.status === 401 && liveLines(vv).join() === n0, [asApprover.status, asClient.status, asNobody.status]);
  const asAuthor = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5707" });
  ok("C11.11 AT-8 pass: the configuration author adds the same form", asAuthor.status === 201 && liveLines(vv).includes("IMM 5707"), asAuthor.status);

  // ── Overview only reports (P-118 Q5): no add or attach actions in what the combination's summary returns.
  const sum = JSON.stringify((await call("GET", `/combinations/${vv}/summary`)).body);
  ok("C11.11 AT-9 Overview only reports: the combination summary offers no 'Add form', 'Choose file' or 'Attach official form/checklist/sample file' action", sum.length > 200 && !/Add form\b|Choose file|Attach (official|sample|checklist)|Filing: no forms yet/i.test(sum), sum.match(/.{60}(Add form|Choose file|Attach (official|sample|checklist)).{60}/i)?.[0]);
  // A file brought in on a combination is still a library form first (same intake: number + edition + checksum).
  const viaCombo = await call("POST", `/combinations/${vv}/attachments/sample`, { officialFile: "imm5409e.pdf" });
  ok("C11.11 AT-10 [IRCC-F03] a file brought in on a combination goes through the library intake first (in the library, by number and edition)", viaCombo.status < 300 && viaCombo.body?.outcome === "in_library" && viaCombo.body?.code === "IMM 5409" && /IMM 5409 \(01-2023\)/.test(viaCombo.body?.edition ?? ""), viaCombo.body);

  // ── P-152: an online-only form (no public PDF) is flagged at intake, never asked for a PDF. Test input (SQL, Sample):
  // a library form held only as its online version, with P-152's system code.
  const ONLINE = "ONLINE-IRCC-EE-PROFILE";
  sql(`insert into gov_form_def (id, workspace_id, form_key, display_name, form_kind) select gen_random_uuid(), workspace_id, '${ONLINE}', 'Express Entry profile (online only, Sample)', 'data_form' from gov_form_def where form_key='IMM 5409'`);
  sql(`insert into form_edition select (jsonb_populate_record(null::form_edition, to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'gov_form_def_id', (select id from gov_form_def where form_key='${ONLINE}'), 'edition_label', '${ONLINE} (online)', 'channel', 'ONLINE', 'sha256', null, 'official_file', null, 'stored_path', null, 'inventory_file', null, 'form_page_url', null, 'source_url', null, 'canada_updated', null, 'portal_key', 'ee-profile', 'content_sha256', repeat('cd', 32)))).* from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5409' limit 1`);
  const onl = ((await call("GET", "/library/forms/list")).body.rows as (Row & { status: string; edition: string | null })[]).find((r) => r.code === ONLINE);
  const onlText = JSON.stringify(onl ?? {});
  ok("C11.11 AT-12 [P-152] pass: a form held only online is in the Forms list flagged \"Online only · no official PDF\" with its system code", !!onl && /Online only · no official PDF/.test(onlText), onl);
  ok("C11.11 AT-12 [P-152] refusal: it is never asked for a PDF: not counted as \"no file\", no upload-its-PDF next step, no PDF edition", !!onl && onl.status !== "no_file" && !/upload its PDF|Upload PDF/i.test(onlText) && sql(`select count(*) from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${ONLINE}' and e.channel<>'ONLINE'`) === "0", { status: onl?.status, words: onlText.slice(0, 200) });

  // ── P-156 (2): each combination keeps its IRCC apply/checklist page: the rules propose, a person confirms once.
  const pages = (await call("GET", `/combinations/${vv}/official-pages`)).body as { pages: { state: string; matches?: number }; candidates: { id: string; match: boolean; title: string }[] };
  const proposed = pages?.candidates?.find((c) => c.match), other = pages?.candidates?.find((c) => !c.match);
  if (!proposed || !other) stop("Visitor visa has no rules-proposed official page and another page to choose from");
  const stored = () => sql(`select count(*) from combination_official_pages where combination_id='${vv}'`);
  ok("C11.11 AT-13 [P-156] the rules propose exactly one page for Visitor visa before anyone confirms; nothing is stored yet", pages.pages.state === "proposed" && pages.candidates.filter((c) => c.match).length === 1 && stored() === "0", pages.pages);
  const asClientPg = await call("POST", `/combinations/${vv}/official-pages/confirm`, { attachmentId: proposed!.id }, "user-P");
  const otherPg = await call("POST", `/combinations/${vv}/official-pages/confirm`, { attachmentId: other!.id });
  ok("C11.11 AT-13 [P-156] refusal: a client cannot confirm (403), and the author cannot confirm a page the rules did not propose (403, it is the immigration expert's call, in words); nothing stored", asClientPg.status === 403 && otherPg.status === 403 && /immigration expert/.test(words(otherPg.body)) && stored() === "0", [asClientPg.status, otherPg.status, words(otherPg.body).slice(0, 120)]);
  const conf = await call("POST", `/combinations/${vv}/official-pages/confirm`, { attachmentId: proposed!.id });
  const conf2 = await call("POST", `/combinations/${vv}/official-pages/confirm`, { attachmentId: proposed!.id });
  const after = (await call("GET", `/combinations/${vv}/official-pages`)).body;
  ok("C11.11 AT-13 [P-156] pass: the author confirms the proposed page once: stored for this combination with who and the tier; the same confirm again writes nothing", conf.status < 300 && after?.pages?.state === "confirmed" && after?.record?.confirmedBy === "user-A" && after?.record?.confirmedAs === "author" && conf2.body?.again === true && sql(`select count(*) from audit_event where action='confirmed' and entity='official page' and entity_key='${vv}'`) === "1" && stored() === "1", { conf: conf.status, state: after?.pages?.state, again: conf2.body?.again });
  ok("C11.11 AT-13 [P-156] each combination keeps its own: With an LMIA's page is not confirmed by Visitor visa's", sql(`select count(*) from combination_official_pages where combination_id='${wp}'`) === "0", sql(`select count(*) from combination_official_pages where combination_id='${wp}'`));

  ok("C11.11 AT-11 US$0: nothing in this file spent money", spend() === spend0, { before: spend0, after: spend() });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
