// Forms lane, Lead note 26 Oct Pass B item 4 (P-93 DEMO.md rows 1 and 7): the forms part of the demo story, seeded
// through the same services as the screens, on the runtime lane's released Visitor visa. Row 1: the official forms and
// checklists through the one intake, an off-list copy held and decided by a second person; row 7: the checklist drafting
// stub pass. W1-02 (P-102): the APR rows (2: online capture, 13: filed Online on the APR Portal) are parked with the
// browser extension. Who may run it, and twice. Scout SC-3 in a browser: the sample-file picker shows no internal
// approval ids, filters by kind and finds by code. No model call (US$0).
//   zsh studio/tools/isolated.sh forms_demo 4452 start && tsx studio/tests/check_forms_demo.ts 4452 xr_studio_forms_demo
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_demo";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
/** The runtime lane's visitor-visa setup (released, IMM 5257 filed as a PDF), on this isolated copy only. */
const setupVisitorVisa = (port: number, db: string) => { const studio = join(import.meta.dirname, ".."); execFileSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, "tests", "runtime", "setup_visitor_visa.ts"), String(port), db], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600_000 }); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

(async () => {
  setupVisitorVisa(PORT, DB);
  const vv = sql("select id from combination where combination_key='vv.single'");
  ok("setup: the runtime lane's Visitor visa is released (release 1, every form a PDF)", !!vv && sql(`select count(*) from config_release where combination_id='${vv}'`) === "1");
  let r = await call("POST", "/demo/forms-story", { combinationId: vv }, "user-C");
  ok("demo fail: only an author runs the forms part of the story (the content reviewer: 403); nothing is seeded", r.status === 403 && sql("select count(*) from intake_item where file_name like '%-from-email.pdf'") === "0", r.body.message);
  r = await call("POST", "/demo/forms-story", { combinationId: "00000000-0000-4000-8000-000000000000" });
  ok("demo fail: a combination that does not exist (404)", r.status === 404, r.body.message);

  r = await call("POST", "/demo/forms-story", { combinationId: vv, online: true });
  ok("demo: the forms part of the story runs and says what it did, row by row (rows 1 and 7; no APR row, no capture, the old online flag ignored)", r.status === 201 && ["row 1:", "row 7:"].every((x) => (r.body.log as string[]).some((l) => l.startsWith(x))) && !(r.body.log as string[]).some((l) => /^row (2|13):/.test(l)) && r.body.capture_id === undefined && sql("select count(*) from portal_capture") === "0", r.body.log ?? r.body.message);
  const files = sql(`select string_agg(distinct split_part(edition, ' (', 1), ',' order by split_part(edition, ' (', 1)) from source_attachment where combination_id='${vv}' and recognised`);
  ok("C2.1: DEMO row 1 the visitor visa's official forms and checklists are attached through the one intake, read without AI", ["IMM 5257", "IMM 5707", "IMM 5476", "IMM 5484", "IMM 5881"].every((c) => files.includes(c)), files);
  // Review-4 Major 2: the copy is a visitor visa form (Sample list: Guide 5256's forms), never another program's (IMM 1344).
  // The library already holds every visitor visa form from its official file, so the second person rejects the copy as
  // not needed (review-3 Major 1: never approved into a loop); approval of an off-list file is P-80's (p80_guard).
  const VISITOR_FORMS = ["IMM 5257", "IMM 5257 SCH1", "IMM 5707", "IMM 5476", "IMM 5484", "IMM 5409", "IMM 5881"];
  const copyCodes = () => sql("select string_agg(distinct code, ',') from intake_item where file_name like '%-from-email.pdf'").split(",");
  ok("C2.2: review-4 Major 2 the demo's off-list copy is a visitor visa form (IMM 5409 here), never a sponsorship form", copyCodes().join() === "IMM 5409" && copyCodes().every((c) => VISITOR_FORMS.includes(c)), copyCodes());
  const decided = sql("select created_by || '|' || status || '|' || coalesce(reason,'') from intake_item where file_name like '%-from-email.pdf'");
  ok("C2.2/C2.3: DEMO row 1 the off-list copy was held, then decided by a second person (the reviewer, not the uploader): rejected as not needed, the library holds IMM 5409 from the official file",
    r.body.held_decision === "rejected" && /^user-A\|DONE\|Rejected by Content reviewer: Sample: the library already holds IMM 5409/.test(decided) && sql("select count(*) from audit_event where action='rejected' and actor='user-C'") !== "0", { decision: r.body.held_decision, decided });
  ok("C2.3: review-3 Major 1 the rejected copy is not in the library, not attached, and nothing is left waiting in To review", sql("select count(*) from approved_source") === "0" && sql("select count(*) from intake_item where status='HELD'") === "0", sql("select string_agg(outcome || ':' || coalesce(reason,''), ' / ') from intake_item where status='HELD'"));
  // For the draft dialog below (review-3 Minor 4), this check approves its own off-list copy, as p80_guard does: the
  // official IMM 1344 with one byte line added (check data only, never the demo story).
  const checkCopy = Buffer.concat([readFileSync(join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc", "forms", "imm1344e.pdf")), Buffer.from("\n% check only: an off-list copy for the draft dialog\n")]);
  const cfd = new FormData(); cfd.append("files", new Blob([checkCopy]), "imm1344e-check-copy.pdf");
  await fetch(`http://localhost:${PORT}/api/combinations/${vv}/attachments`, { method: "POST", headers: { "x-actor": "user-A" }, body: cfd });
  const checkHeld = sql("select id from intake_item where file_name='imm1344e-check-copy.pdf' and status='HELD'");
  await call("PATCH", `/intake/held/${checkHeld}`, { irccPage: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm1344.html" });
  const checkApproved = await call("POST", `/intake/held/${checkHeld}/approve`, {}, "user-C");
  ok("setup: this check's own off-list copy (check data, not the demo) is approved by the second person and attached", checkApproved.status < 300 && sql(`select count(*) from source_attachment a join approved_source s on s.sha256 = a.sha256 where a.combination_id='${vv}'`) === "1", checkApproved.body?.message ?? checkApproved.status);
  ok("C2.6: DEMO row 7 the checklist drafting path ran its stub pass (US$0, nothing proposed until the founder's live run)", !!r.body.checklist_job_id && sql(`select kind || '|' || mode || '|' || cost_usd from drafting_job where id='${r.body.checklist_job_id}'`) === "checklist_draft|STUB|0", sql(`select kind || '|' || mode from drafting_job where id='${r.body.checklist_job_id}'`));
  ok("C1.6: P-102 the seed leaves IMM 5257 filed as a PDF upload on the Visitor visa, with no portal", sql(`select channel from combination_form where combination_id='${vv}' and lineage_key='IMM 5257' order by version desc limit 1`) === "PDF_UPLOAD" && sql(`select coalesce(portal_key,'') from combination where id='${vv}'`) === "");
  // Scout SC-3: the sample-file picker on the combination's sources tab.
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
    await p.goto(`http://localhost:${PORT}/c/${vv}/sources`);
    await p.getByRole("button", { name: "Attach a sample file" }).click();
    const dlg = p.getByRole("dialog");
    await dlg.getByText("Every file here is on the approved official source list").waitFor();
    const rows = () => dlg.locator("tbody tr");
    const all = await rows().count();
    const text = await dlg.innerText();
    ok("SC-3 C2.1: the picker says every file is on the approved official list and shows no internal approval id (D229, D257) or Approved column", !/\bD2\d\d\b/.test(text) && !/\bApproved\b/.test(await dlg.locator("thead").innerText()) && all > 10, all);
    await dlg.getByRole("combobox", { name: "Kind" }).selectOption("Document checklist");
    const kinds = await dlg.locator("tbody tr td:nth-child(2)").allInnerTexts();
    ok("SC-3: the kind filter shows document checklists only", kinds.length > 0 && kinds.length < all && kinds.every((k) => /checklist/i.test(k)), kinds);
    await dlg.getByRole("combobox", { name: "Kind" }).selectOption("");
    await dlg.getByRole("searchbox", { name: "Find a form code or title" }).fill("imm 5257");
    const found = await dlg.locator("tbody tr td:first-child p.font-medium").allInnerTexts();
    ok("SC-3: a search by form code (any case) finds that form's files only", found.length > 0 && found.every((f) => /IMM 5257/.test(f)), found);
    await dlg.getByRole("searchbox", { name: "Find a form code or title" }).fill("nothing like this");
    ok("SC-3 fail: a search that matches nothing says so, with no rows", (await rows().count()) === 0 && /No official file matches/.test(await dlg.innerText()));
    // Review-3 Minor 4: the approved copy (this check's own) is read on this computer, then its draft dialog starts on the stub pass
    // and says why the paid call is closed for it.
    await p.keyboard.press("Escape");
    const row = p.locator("tr", { hasText: "imm1344e-check-copy.pdf" }).first(); // the row's status words change once it is read
    await row.getByRole("button", { name: "Read form" }).click();
    await row.getByRole("button", { name: "Draft with AI" }).click();
    const draft = p.getByRole("dialog");
    await draft.getByText("not open yet for a form approved in the product").waitFor();
    const radios = draft.getByRole("radio");
    ok("C3.1: review-3 Minor 4 an approved-in-product form's draft dialog starts on the stub pass; Live is disabled with the reason", await radios.nth(0).isDisabled() && await radios.nth(2).isChecked() && /Run stub pass/.test(await draft.innerText()));
  } finally { await browser.close(); }

  r = await call("POST", "/demo/forms-story", { combinationId: vv });
  ok("demo fail: run twice on the same combination, it is refused in words (409) and nothing is added twice", r.status === 409 && /reset the demo/.test(r.body.message) && sql("select count(*) from intake_item where file_name like '%-from-email.pdf'") === "1", r.body.message);
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("demo: a reset removes the story's held copies and approvals (blank again)", r.status < 300 && sql("select (select count(*) from intake_item) + (select count(*) from approved_source)") === "0", r.status);

  // Review-3 Major 1, on the loaded demo (its Visitor visa already holds the official Schedule 1): the copy is not needed.
  r = await call("POST", "/demo/load");
  const demoVv = sql("select id from combination where label='Visitor visa' limit 1"), lmia = sql("select id from combination where label='With an LMIA' limit 1");
  const lmiaFiles = sql(`select count(*) from source_attachment where combination_id='${lmia}'`);
  r = await call("POST", "/demo/forms-story", { combinationId: lmia });
  ok("demo fail (break 13): the story's files are never attached to another combination (With an LMIA: 409, nothing attached)", r.status === 409 && /Visitor visa/.test(r.body.message) && sql(`select count(*) from source_attachment where combination_id='${lmia}'`) === lmiaFiles, r.body.message);
  r = await call("POST", "/demo/forms-story", { combinationId: demoVv });
  ok("C2.3: review-3 Major 1 on the loaded demo the story's off-list copy is decided by the second person and nothing is left stuck in To review", r.status === 201 && !!r.body.held_decision && sql("select count(*) from intake_item where status='HELD'") === "0", r.body.log ?? r.body.message);
  ok("C2.2: review-4 Major 2 on the loaded demo too, every off-list copy the story made is a visitor visa form", copyCodes().every((c) => VISITOR_FORMS.includes(c)), copyCodes());
  // The same copy uploaded by hand and sent for approval: refused before anything changes, in words.
  const copy = Buffer.concat([readFileSync(join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc", "forms", "imm5257_1e.pdf")), Buffer.from("\n% another copy\n")]);
  const fd = new FormData(); fd.append("files", new Blob([copy]), "schedule1-again.pdf");
  const up = await fetch(`http://localhost:${PORT}/api/combinations/${demoVv}/attachments`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd }).then((x) => x.json()) as { results?: { message: string }[] };
  const again = sql("select id from intake_item where file_name='schedule1-again.pdf' and status='HELD'");
  await call("PATCH", `/intake/held/${again}`, { irccPage: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5257-schedule-1.html" });
  r = await call("POST", `/intake/held/${again}/approve`, {}, "user-C");
  ok("C2.3: review-3 Major 1 fail: approving a copy of an edition the library holds is refused (409) before anything changes, saying to reject it; the hold message said so already", r.status === 409 && /already holds IMM 5257 SCH1 \(09-2023\) from the official file/.test(r.body.message) && sql(`select status from intake_item where id='${again}'`) === "HELD" && /already holds/.test(up.results?.[0]?.message ?? ""), { approve: r.body.message, held: up.results?.[0]?.message });
  // Review-4 Minor 2: the held page says so before anyone clicks: no Approve, Reject is the main action with the reason filled in.
  const heldList = (await call("GET", "/intake/held", undefined, "user-C")).body as { id: string; cannotApprove: string | null }[];
  ok("C2.3: review-4 Minor 2 the held list says why this copy cannot be approved (the library holds that edition)", /already holds IMM 5257 SCH1/.test(heldList.find((x) => x.id === again)?.cannotApprove ?? ""), heldList.find((x) => x.id === again));
  const b2 = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await b2.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => localStorage.setItem("xr-actor", "user-C"));
    await p.goto(`http://localhost:${PORT}/review/held/${again}`);
    await p.getByText("This copy cannot be approved").waitFor();
    const approveShown = await p.getByRole("button", { name: "Approve as an official source" }).count();
    const note = await p.getByLabel(/Reason/).inputValue();
    ok("C2.3: review-4 Minor 2 fail case: the held page of a copy the library holds offers no Approve; Reject is the action, its reason already filled in", approveShown === 0 && /already holds IMM 5257 SCH1/.test(note) && await p.getByRole("button", { name: "Reject" }).isEnabled(), { approveShown, note });
    await p.getByRole("button", { name: "Reject" }).click(); await p.waitForURL(/\/review$/);
    ok("C2.3: review-4 Minor 2 Reject closes the copy from the held page (nothing left held)", sql(`select status from intake_item where id='${again}'`) === "DONE");
  } finally { await b2.close(); }

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 300)}`); console.error(e); process.exit(1); });
