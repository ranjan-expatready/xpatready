// Product Studio browser check: operates the real screens (http://localhost:4400, studio/start.sh running) as the
// simulated configuration author, content reviewer (SME duty) and approver, in two passes on the same database:
//   Pass A, sample path: Reset → Load sample inputs → released c1-v3 combination → preview with sample facts and an
//     on-screen answer → actual PDF fill/read-back/download → human adds a conditional document requirement (draft) →
//     draft preview changes → submit, refused early approval, SME sign-off, release v2 → release preview shows it →
//     guarded AI path for IMM 5257 (stub pass; a live call only with STUDIO_LIVE=1).
//   Pass B, from scratch after Reset: program and category through the Add pop-up, Start setup on the new card → manual upload (official and a non-official
//     file) and a sample attachment → read forms → AI field map of IMM 1295 (replay of the saved real run) into an
//     empty library → IMM 5476 (replay) compared with that library: reuse, new, ambiguous, address parts → decisions,
//     a returned item → apply → coverage → section and placement added by a person → coverage changes → release.
//   Then Reset → Load sample inputs again: the same counts, no duplicates (reset → seed → run → reset → rerun).
// Screenshots, a step log and API snapshots go to studio/evidence/browser-run-<n>/.  node studio/tests/check_studio_browser.cjs
// (an isolated copy: STUDIO_URL=http://localhost:<port> STUDIO_DB=xr_studio_<name>; the section step writes to that database)
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("playwright");
const { setFilingModes } = require("./fixtures/steps-before-forms.cjs");
const { sourceEveryNumber } = require("./fixtures/source-every-number.cjs"); // G1 (C5.4): a release needs every number sourced
const URL = process.env.STUDIO_URL ?? "http://localhost:4400"; // an isolated copy: STUDIO_URL=http://localhost:<port>
const ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
const OFFICIAL = path.join(ROOT, "ai-workers/problem-1-pathway-setup-and-form-filling/official-sources/ircc");
const runN = Number(process.env.RUN ?? 1);
const OUT = path.join(__dirname, "..", "evidence", `browser-run-${runN}`); fs.mkdirSync(OUT, { recursive: true });
const LIVE = process.env.STUDIO_LIVE === "1";
const log = []; const t0 = Date.now(); let clicks = 0;
const step = (name, ok, detail) => { log.push({ name, ok: !!ok, detail: detail === undefined ? undefined : String(detail).slice(0, 400), s: Math.round((Date.now() - t0) / 1000) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 200)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", acceptDownloads: true });
  const p = await ctx.newPage(); globalThis.__page = p; const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const idle = async () => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(150); };
  const btn = (name, opts = {}) => p.getByRole("button", { name, exact: false, ...opts });
  const click = async (loc) => { clicks++; await loc.click(); await idle(); };
  const shot = async (n) => p.screenshot({ path: path.join(OUT, n), fullPage: true });
  const as = async (id) => { await p.getByLabel("Simulated person").selectOption(id); await idle(); };
  const api = async (pth, init) => { const r = await p.request.fetch(`${URL}/api${pth}`, { headers: { "x-actor": "user-A", "content-type": "application/json" }, ...init }); return r.json(); };
  const lastToast = async () => (await p.locator("[aria-live=polite] p").allTextContents()).slice(-1)[0] ?? "";
  /** Waits (up to 20 s) for a toast matching re, then returns it; a slow response no longer races the check. */
  const toastLike = async (re) => { try { await p.locator("[aria-live=polite] p", { hasText: re }).last().waitFor({ timeout: 20000 }); } catch { /* reported by the step */ } return (await p.locator("[aria-live=polite] p", { hasText: re }).allTextContents()).slice(-1)[0] ?? await lastToast(); };
  /** The custody line's status once the preview shows `want` (the preview refetches after each change; under machine load
   *  a single immediate read could still show the previous profile's result). */
  const custodyStatus = async (want) => { const re = /Custody documents or parental letter of authorization[\s\S]{0,200}?(Cannot tell yet|Needed|Not needed)/; for (let i = 0; i < 40; i++) { const m = re.exec(await p.innerText("main"))?.[1]; if (m === want) return m; await p.waitForTimeout(375); } return re.exec(await p.innerText("main"))?.[1]; };
  const toasts = async () => (await p.locator("[aria-live=polite] p").allTextContents()).join(" | ");
  const go = async (u) => { await p.goto(`${URL}${u}`); await idle(); };
  const reset = async (label) => {
    await go("/"); await click(btn("Demo")); await click(p.getByRole("menuitem", { name: /Reset demo/ })); // demo controls live in one menu (P-35)
    await p.getByLabel("Type RESET to confirm").fill("RESET");
    await click(p.getByRole("dialog").getByRole("button", { name: "Reset everything" }));
    await p.getByRole("dialog").getByText(/rows and \d+ working files removed/).waitFor({ timeout: 60000 });
    const txt = await p.getByRole("dialog").innerText();
    step(`${label} (DV-bb-6b pass): reset removes the workspace rows and files, keeps only the 6 built-in person roles, preserved evidence byte-identical`, /byte-identical/.test(txt) && /keeps only its 6 built-in person roles/.test(txt), txt.split("\n").slice(1, 3).join(" "));
    step(`DV-bb-6b fail (${label}): the reset never says "0 rows remain" while the 6 built-in person roles stay`, !/\b0 rows remain/.test(txt), txt.split("\n").slice(1, 3).join(" "));
    await shot(`${label}-reset.png`);
    await click(p.getByRole("dialog").getByRole("button", { name: "Close" }).last());
    const cat = await api("/catalogue?pathway=INDIVIDUAL");
    // W1-03 (B1): after Reset the Structure is empty in both tabs; reads create no Pathway.
    const structureEmpty = (await api("/structure?pathwayType=INDIVIDUAL")).empty && (await api("/structure?pathwayType=CORPORATE")).empty;
    step(`${label}: workspace empty after reset (no Pathway, no program, no combination in either tab)`, cat.tree.length === 0 && cat.totals.combinations === 0 && structureEmpty);
  };
  const loadSamples = async (label) => {
    // S7 (P-148): the Demo menu loads the six; this suite runs on the suites' fixture (the older sample with the reviewed
    // work-permit release), loaded through the API as test data (plan step 6), never from the menu.
    await p.request.fetch(`${URL}/api/demo/load`, { method: "POST", headers: { "x-actor": "user-A" }, timeout: 180000 });
    await go("/");
    // Screen 01 catalogue: one tree per pathway; a combination is a last-level row with combinationId.
    const leaves = (ns) => ns.flatMap((n) => (n.kind === "combination" ? [n] : leaves(n.children)));
    const ind = await api("/catalogue?pathway=INDIVIDUAL"), cor = await api("/catalogue?pathway=CORPORATE");
    const comps = [...leaves(ind.tree), ...leaves(cor.tree)].filter((l) => l.combinationId).map((l) => ({ ...l, id: l.combinationId }));
    let attachments = 0; for (const c of comps) attachments += (await api(`/combinations/${c.id}/summary`)).sources.length;
    const counts = { pathways: ind.pathways.length, programs: ind.tree.length + cor.tree.length, rows: comps.length, attachments, released: comps.filter((c) => c.release).length };
    const fields = await api("/library/fields");
    const dupFields = fields.length - new Set(fields.map((f) => f.key)).size;
    step(`${label}: Load sample inputs creates 11 programs over the 2 pathways and sets up 6 combinations, official files through the upload path, one released`, counts.pathways === 2 && counts.programs === 11 && counts.rows === 6 && counts.attachments === 27 /* 24 + 3 IRCC guides linked as sources (S5 slice 3) */ && counts.released === 1, JSON.stringify(counts));
    step(`${label}: no duplicate field definitions`, dupFields === 0, `${fields.length} fields`);
    return { counts, fields: fields.length, comps };
  };
  const NODE = { "wp.family": "individual.work_permits.employer_specific.with_lmia", "vv.single": "individual.visitors.visitor_visa" }; // sample row keys → their nodes
  const compId = (comps, key) => comps.find((c) => c.nodeKey === NODE[key])?.id;

  // ================================================================ PASS A: the sample path
  await go("/");
  await reset("A0");
  await shot("A1-empty.png");
  const first = await loadSamples("A1");
  await shot("A1-programs.png");
  const wp = compId(first.comps, "wp.family"), vv = compId(first.comps, "vv.single"); // stable row keys kept from the earlier fixture

  await go(`/c/${wp}`);
  step("A2: the work-permit row (Individual › Work permits › Employer-specific work permit) shows it is in Release 1 (one release word, review #3) and no draft changes", /In Release 1/.test(await p.innerText("main")) && /draft matches the release/i.test(await p.innerText("main")));
  await shot("A2-overview.png");

  await go(`/c/${wp}/preview?view=studio`); // S5: the coverage and PDF-fill preview sits behind Preview (the tab itself is Preview by person)
  await p.getByText("Questions to ask").first().waitFor();
  let main = await p.innerText("main");
  step("A3: preview renders the released configuration with the sample family's confirmed facts", /Released version 1/.test(main) && /questions to ask/i.test(main), main.match(/forms\n(\d+)/i)?.[0]);
  const before = await api(`/combinations/${wp}/preview?mode=release&profile=client-a-family`);
  const imm5409Before = before.forms.find((f) => f.form === "IMM 5409")?.applies;
  // answer a deciding question on screen: the partner's marital status
  const decider = p.getByRole("textbox", { name: /Answer for Spouse or partner: .*marital status/i }).first();
  await decider.fill("common_law"); await click(decider.locator("xpath=..").getByRole("button", { name: "Set" }));
  await click(btn("Forms and coverage"));
  main = await p.innerText("main");
  const row5409 = await p.locator("div.rounded-xl", { hasText: "IMM 5409" }).first().innerText();
  step("A3: an on-screen answer (partner common-law) turns IMM 5409 on, with the reason", imm5409Before === "cannot_tell" && /Applies/.test(row5409), row5409.replace(/\n/g, " ").slice(0, 160));
  await shot("A3-preview-forms.png");

  // fill the actual PDF from confirmed facts and download it
  const fillRow = p.locator("div.rounded-xl", { hasText: "Application for Work Permit made Outside of Canada · Principal applicant" }).first();
  await click(fillRow.getByRole("button", { name: "Fill PDF from confirmed facts" }));
  await p.getByText("filled and checked").waitFor({ timeout: 120000 });
  const dlg = await p.getByRole("dialog").innerText();
  step("A4: IMM 1295 filled from confirmed sample facts: every written value reads back and the file is intact", /The file is intact and every written value reads back/.test(dlg), dlg.split("\n").slice(2, 3).join(" ").slice(0, 300));
  await shot("A4-pdf-fill.png");
  // A failed download is a failed step, not the end of the run (a lane copy under a dot-folder answers 404 here, QA-4).
  // QA-270 (file half): the download is a button that fetches the file with the person header (a plain link carries none
  // and is refused); the file request's own answer is the evidence when no download arrives.
  const dlBtn = p.getByRole("dialog").getByRole("button", { name: "Download the checked PDF" });
  const fileAnswer = p.waitForResponse((r) => /\/api\/artifacts\/[^/]+\/file$/.test(r.url()), { timeout: 30000 }).catch(() => null);
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 30000 }).catch(() => null), dlBtn.click()]);
  if (dl) {
    const pdfPath = path.join(OUT, `downloaded-${dl.suggestedFilename()}`); await dl.saveAs(pdfPath);
    step("A4: the checked PDF downloads", fs.statSync(pdfPath).size > 800000 && fs.readFileSync(pdfPath).subarray(0, 5).toString() === "%PDF-", `${dl.suggestedFilename()} ${fs.statSync(pdfPath).size} bytes`);
  } else {
    const r = await fileAnswer;
    step("A4: the checked PDF downloads", false, `no download; ${r ? `${r.url().replace(URL, "")} answered ${r.status()} ${(await r.text().catch(() => "")).slice(0, 120)}` : "no request for the file was made"}${/\/\.[^/]+\//.test(__dirname) ? " (this copy lives under a dot-folder: QA-4 also affects file downloads)" : ""}`);
  }
  if (await p.getByRole("dialog").count()) await click(p.getByRole("dialog").getByRole("button", { name: "Close" }).last());

  // a person adds a conditional document requirement (sample input instead of typing)
  // S5 (m5): the "Sample inputs" buttons are gone from the Documents tab; the person types the requirement.
  await go(`/c/${wp}/configuration?area=documents`); await p.waitForURL(/\/documents/);
  await click(btn("Add a document"));
  { const dlg = p.getByRole("dialog");
    await dlg.getByLabel("New document type name").fill("Custody documents or parental letter of authorization");
    await dlg.getByLabel("Whose document").selectOption("each_dependent_child");
    await dlg.getByLabel("Requirement").selectOption("ANSWER_CONDITIONAL");
    await dlg.getByRole("button", { name: "Edit as JSON" }).click();
    await dlg.getByLabel("Condition as JSON").fill(JSON.stringify({ subjectKind: "DEPENDENT", op: "eq", field: "person.travelling_alone_to_canada", value: true }));
    await dlg.getByLabel("Why it is needed, in plain words").fill("Only for a minor travelling alone.");
    await dlg.getByLabel("Source quote").fill("Minors travelling alone or with one parent must provide custody documents or a letter of authorization from the other non accompanying parent or a letter of authorization signed by both parents or legal guardians."); }
  await p.getByText("Condition is valid").waitFor();
  // C3.6 (P-158): the new type name waits as a library proposal; the dialog stays open with the line's details; a second
  // person accepts it (here through the API), the dialog chooses the type, and the author saves the line.
  const named = p.waitForResponse((r) => /\/requirements$/.test(r.url()) && r.request().method() === "POST");
  await click(p.getByRole("dialog").getByRole("button", { name: "Save to draft" }));
  const namedRes = await named;
  await p.locator("[data-requirement-type-waiting]").waitFor({ timeout: 15000 }).catch(() => {});
  step("A5 (C3.6): the new document type waits as a library proposal; the dialog stays open with the line's details", namedRes.status() === 202 && (await p.locator("[data-requirement-type-waiting]").count()) === 1 && (await p.getByRole("dialog").getByLabel("Why it is needed, in plain words").inputValue()) === "Only for a minor travelling alone.", namedRes.status());
  const pid = (await namedRes.json().catch(() => ({})))?.proposalId;
  const acc = await p.request.fetch(`${URL}/api/review/proposals/decide`, { method: "POST", headers: { "x-actor": "user-B", "content-type": "application/json" }, data: { ids: [pid], action: "accept" } });
  await p.locator("[data-requirement-type-accepted]").waitFor({ timeout: 20000 }).catch(() => {});
  step("A5 (C3.6): once a second person accepts it, the dialog chooses the new type", acc.status() === 201 && (await p.locator("[data-requirement-type-accepted]").count()) === 1, acc.status());
  await click(p.getByRole("dialog").getByRole("button", { name: "Save to draft" }));
  { const t = await toastLike(/added to the draft/); step("A5: a person adds a conditional document requirement with a valid condition, saved as draft", /added to the draft/.test(t), t); }
  await p.reload(); await idle(); await click(p.getByRole("tab", { name: /^Documents/ }));
  // W1-15 slice 3 (board v2 frame 3): the Documents tab shows one person's checklist at a time and opens on the principal
  // applicant; this requirement is each dependent child's, so it is on the Child checklist.
  await click(p.locator('[data-doc-role-chip="child"]'));
  main = await p.innerText("main");
  step("A5: the new requirement survives a reload, marked Draft and edited by a person", /Custody documents or parental letter of authorization/.test(main) && /Edited by a person/.test(main));
  await shot("A5-configuration-documents.png");

  await go(`/c/${wp}/preview?view=studio`);
  await p.getByLabel("Known facts", { exact: false }).selectOption("none").catch(async () => { await p.locator("select").nth(2).selectOption("none"); });
  await idle(); await click(btn("Document checklist"));
  const custody0 = await custodyStatus("Cannot tell yet");
  await click(btn("Questionnaire"));
  await p.getByLabel("Whose questions").selectOption({ label: "Child" }); await idle();
  const alone = p.getByRole("combobox", { name: /Answer for Child.*travelling to Canada alone/i }).first();
  await alone.selectOption("true"); await idle(); await click(btn("Document checklist"));
  const custody1 = await custodyStatus("Needed");
  step("A6: draft preview: the new conditional document waits for its answer, then is needed once the child travels alone", custody0 === "Cannot tell yet" && custody1 === "Needed", `${custody0} → ${custody1}`);
  await shot("A6-draft-preview-checklist.png");
  const relBefore = await api(`/combinations/${wp}/preview?mode=release&profile=none`);
  step("A6: the released version is unchanged by the draft edit", !relBefore.checklist.some((r) => /Custody documents/.test(r.requirement)));

  // review and release under separate duties
  await sourceEveryNumber(URL, wp); // G1 (C5.4): the release's numbers need a source first (Source panel: PR 2b)
  await go(`/c/${wp}/review`);
  await click(btn("Submit for review"));
  { const t = await toastLike(/Submitted for review/); step("A7: the author submits the change for review", /Submitted for review/.test(t), t); }
  await as("user-B");
  await click(btn("Approve and release"));
  { const t = await toastLike(/SME sign-off/); step("A7: approval before the SME sign-off is refused", /SME sign-off/.test(t), t); }
  await as("user-C");
  await click(btn("Select all I can sign")); await click(btn(/^Sign/));
  // Screen 02 FIX (Lead re-check item 2): a document type named with the requirement is new to the shared library, so a
  // second person approves it on To review before the release carries it.
  await go("/review?kind=library_change");
  const newType = p.locator('tr[data-kind="library_change"]').first();
  const typeName = (await newType.count()) ? (await newType.textContent()) : "";
  if (await newType.count()) { await click(newType.locator("[data-next] a")); await click(btn("Approve")); await p.waitForURL(/\/review$/); }
  step("A7: the new document type is approved by a second person on To review", /approved: it is released with the next release/.test(await lastToast()), `${typeName.slice(0, 80)} · ${await lastToast()}`);
  await go(`/c/${wp}/review`);
  await as("user-B");
  await click(btn("Approve and release")); await p.getByText(/Released version 2/).last().waitFor({ timeout: 30000 }).catch(() => {});
  step("A7: a second person (approver) releases version 2", /Released version 2/.test(await lastToast()), await lastToast());
  await shot("A7-review-released.png");
  const rel2 = await api(`/combinations/${wp}/preview?mode=release&profile=none`);
  step("A7: the released version now carries the new requirement", rel2.label === "Released version 2" && rel2.checklist.some((r) => /Custody documents/.test(r.requirement)));
  await as("user-A");

  // guarded AI path for the added form IMM 5257
  await go(`/c/${vv}/forms`);
  if (LIVE) {
    await click(p.getByRole("row", { name: /IMM 5257/ }).getByRole("button", { name: "Draft with AI" }));
    await p.getByRole("dialog").getByText(/^Live$/).click();
    await click(p.getByRole("dialog").getByRole("button", { name: "Start Live" }));
  } else {
    // P-227 (D2 part 2): the stub pass is no longer offered to a person; this check starts it through the API (US$0).
    const att = (await api(`/combinations/${vv}/attachments`)).find((x) => /imm5257e/i.test(x.fileName ?? x.file_name ?? ""));
    await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "stub", idempotencyKey: `stub-${Date.now()}` } });
    const dlg = p.getByRole("row", { name: /IMM 5257/ }).getByRole("button", { name: "Draft with AI" });
    await click(dlg);
    await p.getByRole("dialog").locator('[data-draft-start][data-options-loaded="true"]').waitFor({ timeout: 60_000 });
    const choices = await p.getByRole("dialog").locator('input[type="radio"]').evaluateAll((xs) => xs.map((x) => (x.closest("label")?.querySelector("b")?.textContent ?? "").trim()));
    await p.keyboard.press("Escape");
    step("D2 (P-227): the field-map dialog offers exactly Live and Saved, never Stub pass only", JSON.stringify(choices) === JSON.stringify(["Live", "Saved"]), choices);
  }
  for (let i = 0; i < 120; i++) { const d = await api(`/combinations/${vv}`); const j = d.jobs.find((x) => x.kind === "field_map"); if (j && j.status !== "RUNNING" && j.status !== "QUEUED") break; await p.waitForTimeout(2000); }
  const vvd = await api(`/combinations/${vv}`); const job = vvd.jobs.find((x) => x.kind === "field_map");
  step(`A8: IMM 5257 through the guarded AI path (${LIVE ? "live" : "stub pass"}) ends in an honest state`, job && ["COMPLETED", "BLOCKED"].includes(job.status), `${/Access to this API has been restricted/.test(job?.message ?? "") ? "known QA-8 (the AI step's child process is refused file access in this copy; not faked): " : ""}${job?.mode} ${job?.status}: ${job?.message?.slice(0, 160)}`);
  await go(`/c/${vv}/forms`); await shot("A8-imm5257-guarded-path.png");

  await go("/library/fields/person.date_of_birth");
  main = await p.innerText("main");
  step("A9: a shared field shows the boxes of every form that read it and whose value each needs", /IMM 1295/.test(main) && /IMM 5707/.test(main) && /the subject's spouse or partner/.test(main));
  await shot("A9-field-reuse.png");

  // ================================================================ PASS B: from scratch, after a reset
  await reset("B0");
  // W1-03 (P-127): after Reset no Pathway exists; a firm adds its first one on Program structure, in the one Add pop-up.
  await go("/structure");
  await click(btn("Add pathway"));
  await p.locator('[data-field="pathway"] input[role="combobox"]').fill("Temporary residence");
  await p.waitForFunction(() => /no exact match/.test(document.querySelector('[data-field="pathway"]')?.textContent ?? ""));
  await click(p.locator("[data-add-submit]"));
  // Waits for the saved name.
  let pathways = [];
  for (let i = 0; i < 40 && !pathways.length; i++) { pathways = (await api("/structure?pathwayType=INDIVIDUAL")).nodes.filter((n) => n.level === "pathway").map((n) => n.label); if (!pathways.length) await p.waitForTimeout(250); }
  step("B0b: the first Retail Pathway is added on Program structure through the Add pop-up (P-112 name, P-127)", pathways.join() === "Temporary residence", pathways.join());
  await go("/");
  // S3 (P-125): every name is added on Program structure, here through its Add pop-up opened in place from Immigration
  // programs (P-128 (5)); Start setup on the new card creates the combination and opens it on its Forms tab (S5).
  await click(p.locator("[data-add-combination]")); await p.locator("[data-add-dialog]").waitFor();
  const name = async (lv, text) => { const f = p.locator(`[data-field="${lv}"] input[role="combobox"]`); await f.fill(text); await p.keyboard.press("Tab"); await p.waitForTimeout(600); };
  if (!(await p.locator('[data-field="pathway"] input[role="combobox"]').inputValue())) await name("pathway", "Temporary residence");
  await name("program", "Work permits (built from scratch)");
  await name("category", "Employer-specific work permit");
  const willBe = (await p.locator("[data-you-are-adding]").innerText()).replace(/New/g, "").replace(/\s+/g, " ");
  await click(p.locator("[data-add-submit]")); await p.locator("[data-add-dialog]").waitFor({ state: "detached" });
  let leafKey = null;
  for (let i = 0; i < 40 && !leafKey; i++) { leafKey = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).rows.find((r) => r.label === "Employer-specific work permit")?.nodeKey ?? null; if (!leafKey) await p.waitForTimeout(250); }
  await click(p.locator(`[data-node="${leafKey}"] [data-start-setup]`).first());
  await p.waitForURL(/\/c\/[0-9a-f-]+\/(sources|forms)/, { timeout: 15000 }).catch(() => {}); const scratch = p.url().includes("/c/") ? p.url().split("/c/")[1].split("/")[0] : null;
  if (scratch) await p.getByRole("heading", { level: 1, name: "Employer-specific work permit" }).waitFor({ timeout: 15000 }).catch(() => {}); // the page header arrives with the combination
  const crumbs = scratch ? await p.getByRole("navigation", { name: "Path" }).getByRole("link").allTextContents().catch(() => []) : [];
  const made = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).rows.find((r) => r.combinationId === scratch);
  step("B1 (S3): the Add pop-up adds the program and category; Start setup creates the combination for that full path and opens it", !!scratch && /Retail › Temporary residence › Work permits \(built from scratch\) › Employer-specific work permit/.test(willBe) && made?.path.join(" › ") === "Work permits (built from scratch) › Employer-specific work permit" && crumbs.join(" › ").includes("Work permits (built from scratch)"), `${willBe} → ${crumbs.join(" › ")}`);
  // S5 (P-118 Q2, m5): forms enter only through the Form library; the combination picks them from there. The library's
  // upload is S4's (P-123): one run card per file (rules check, then library or held for a person).
  await go("/library/forms");
  const junk = path.join(OUT, "not-an-official-form.pdf"); fs.writeFileSync(junk, "%PDF-1.4 not an official form\n");
  await p.getByLabel("Choose PDFs to upload").setInputFiles([path.join(OFFICIAL, "forms/imm1295e.pdf"), path.join(OFFICIAL, "forms/imm5476e.pdf"), junk]);
  await p.waitForTimeout(1000);
  await p.waitForFunction(() => /not-an-official-form\.pdf[\s\S]{0,120}Failed/.test(document.querySelector("main")?.textContent ?? ""), null, { timeout: 120000 }).catch(() => {});
  for (let i = 0; i < 240; i++) { if (!((await api("/runs?active=1")).runs ?? []).length) break; await p.waitForTimeout(500); }
  await idle();
  const junkToast = ((await p.innerText("main")).match(/[^\n]*not-an-official-form\.pdf[\s\S]{0,160}/) ?? [""])[0].replace(/\s+/g, " ");
  await go(`/c/${scratch}/forms`);
  await click(btn("Add a form from the library"));
  for (const code of ["IMM 1295", "IMM 5476"]) { await click(p.getByRole("dialog").getByRole("button", { name: `Add ${code}` })); await p.getByRole("dialog").getByText("Added").nth(code === "IMM 1295" ? 0 : 1).waitFor({ timeout: 30000 }).catch(() => {}); }
  await click(p.getByRole("dialog").getByRole("button", { name: "Close" }).first());
  // Wait for the refreshed list (under machine load one immediate read could still show the previous list).
  // The one intake (P-51): a file that is not an approved official source is held for a person, never attached.
  for (let i = 0; i < 40; i++) { main = await p.innerText("main"); if (/Recognised: ready to read/.test(main) && /IMM 1295/.test(main) && /IMM 5476/.test(main)) break; await p.waitForTimeout(375); }
  const refusedJunk = () => /Rules check the file/.test(junkToast) && api("/intake/held").then((h) => !h.some((x) => x.file === "not-an-official-form.pdf"));
  const junkAttached = () => api(`/combinations/${scratch}/attachments`).then((a) => a.some((x) => x.fileName === "not-an-official-form.pdf"));
  step("B2 (S5): official forms uploaded in the Form library and picked into the combination are recognised; a damaged non-official file is refused at the rules check in words, never added or attached (S4)", /Recognised: ready to read/.test(main) && /IMM 1295/.test(main) && /IMM 5476/.test(main) && await refusedJunk() && !(await junkAttached()), junkToast);
  await shot("B2-forms-reading.png");
  // Read each recognised form, one click per form, waiting until the server records it as read.
  for (let i = 0; i < 4; i++) {
    const before = (await api(`/combinations/${scratch}/attachments`)).filter((a) => a.status === "READ").length; if (before >= 2) break;
    if (await btn("Read form").count()) await click(btn("Read form").first());
    for (let w = 0; w < 240 && (await api(`/combinations/${scratch}/attachments`)).filter((a) => a.status === "READ").length <= before; w++) await p.waitForTimeout(500); // up to 2 min: slow on a busy machine
  }
  const atts = await api(`/combinations/${scratch}/attachments`);
  step("B2: both forms read on this computer (no AI); the refused file is still not attached", atts.filter((a) => a.status === "READ").length === 2 && await refusedJunk() && !(await junkAttached()), atts.map((a) => `${a.fileName}=${a.status}`).join(", "));

  // Screen 02 FIX (review Must 4): with form fields left to decide, apply stays on the job page and focuses their list;
  // with none left it goes on to the preview. The journey goes on to the preview either way.
  const afterApply = async () => {
    await Promise.race([p.waitForURL(/preview/, { timeout: 30000 }), p.locator("#ff-decide:focus").waitFor({ timeout: 30000 })]);
    const t = await lastToast();
    if (!/preview/.test(p.url())) { step("C3.8 K1 (Must 4): form fields are left to decide, so apply stays on the job page with their list focused", /Form fields with no decision/.test(await p.locator("#ff-decide").textContent())); await go(`/c/${scratch}/preview`); }
    await idle(); return t;
  };
  /** Every remaining undecided proposal: take the shown recommendation (a person's click per item). */
  const decideRest = async () => {
    await click(p.getByRole("tab", { name: /^All/ }));
    // One decision per click, confirmed before the next: the list re-renders after each decision, and under machine load a
    // click aimed at a re-rendering card can be lost (the 21 Oct runs 1 and 5 timed out here; runs 2–4 passed).
    const pend = p.locator("article").filter({ has: p.getByRole("button", { name: "Return" }) });
    for (let i = 0; i < 300; i++) {
      const n = await pend.count(); if (!n) break;
      clicks++; await pend.first().getByRole("button").first().click({ timeout: 10000 }).catch(() => {});
      // BR-7 (Screen 02 FIX, Must 3): a new field a library field could fit asks why before it is accepted.
      const why = pend.first().locator("[data-accept-reason]");
      if (await why.count()) { await why.getByRole("textbox").fill("A different meaning on this form from the library field."); await why.getByRole("button", { name: "Accept with this reason" }).click({ timeout: 10000 }).catch(() => {}); }
      for (let w = 0; w < 40 && (await pend.count()) >= n; w++) await p.waitForTimeout(250);
    }
  };
  const draftReplay = async (edition) => {
    await click(p.getByRole("row", { name: new RegExp(edition) }).getByRole("button", { name: "Draft with AI" }));
    await p.getByRole("dialog").getByRole("radio", { name: /^Saved/ }).check();
    await click(p.getByRole("dialog").getByRole("button", { name: "Use Saved (US$0)" }));
    // The replay runs after the stub pass, in the background: a busy CI runner needs more than a click's 30 s (PR #39 CI
    // timed out here once; a local run takes a few seconds). The wait reads the real state from the API each second (the
    // form's attachment and its newest field-map job), so a failure says which it was (#133 CI, 31 Oct): the job ended
    // FAILED / BLOCKED / CANCELLED (its own message), the job finished but the page never showed the link (the Forms tab
    // did not refresh: a real stall), or it was still running after 3 minutes (a slow machine: its state is printed).
    const link = p.getByRole("row", { name: new RegExp(edition) }).getByRole("link", { name: "Review AI proposals" });
    const cid = new globalThis.URL(p.url()).pathname.split("/")[2]; // URL is this file's base address
    let doneAt = 0, state = null;
    for (const deadline = Date.now() + 180000; !(await link.count()); await p.waitForTimeout(1000)) {
      const c = await api(`/combinations/${cid}`).catch(() => null);
      const att = (c?.attachments ?? []).find((a) => (a.edition ?? "").startsWith(edition));
      const job = (c?.jobs ?? []).find((j) => j.attachmentId === att?.id && j.kind === "field_map"); // newest first
      state = { attachment: att?.status ?? "none", job: job?.status ?? "none", message: job?.message ?? null };
      if (["FAILED", "BLOCKED", "CANCELLED"].includes(state.job)) throw new Error(`${edition}: the AI step ended ${state.job}: ${state.message}`);
      if (state.attachment === "DRAFTED" && ["COMPLETED", "APPLIED"].includes(state.job)) {
        doneAt ||= Date.now();
        if (Date.now() - doneAt > 15000) throw new Error(`${edition}: the job finished (${state.job}) 15 s ago but the page never showed "Review AI proposals": the Forms tab did not refresh`);
      }
      if (Date.now() > deadline) throw new Error(`${edition}: no "Review AI proposals" after 3 minutes; still ${JSON.stringify(state)}`);
    }
    await link.click(); await idle();
  };
  await draftReplay("IMM 1295");
  await p.waitForURL(/\/jobs\//, { timeout: 60_000 }); // the replayed draft's own page (the run pill there reads "Saved")
  const j1295 = await api(`/jobs/${p.url().split("/jobs/")[1]}`);
  step("B3: the IMM 1295 draft is a labelled replay of a saved real run; against an empty library every field is new", j1295.mode === "REPLAY" && /Replay of saved run|Saved AI answer.*no model call, US\$0/.test(j1295.message) && j1295.detail.counts.reuse === 0 && j1295.detail.counts.new === j1295.items.length, `${j1295.mode} · ${j1295.items.length} items · "${String(j1295.message).slice(0, 90)}" · ${j1295.runId}: ${JSON.stringify(j1295.detail.counts)}`);
  await shot("B3-imm1295-proposals.png");
  // C3.2 (P-121, P-296 (1)): new definitions are never accepted together; each is decided on its own (decideRest).
  await decideRest();
  await click(btn("Apply to draft")); await click(p.getByRole("dialog").getByRole("button", { name: "Apply to draft" }));
  const applied1295 = await afterApply();
  step("B3: IMM 1295 applied: its map and new definitions are in the draft", /applied to the draft/.test(applied1295), applied1295);

  await go(`/c/${scratch}/forms`);
  await draftReplay("IMM 5476");
  main = await p.innerText("main");
  const counts = (await api(`/jobs/${p.url().split("/jobs/")[1]}`)).detail.counts;
  step("B4: adding IMM 5476 reuses library definitions, proposes new ones and flags ambiguous ones (address parts, near duplicates)", counts.reuse > 0 && counts.new > 0 && counts.ambiguous > 0 && /Looks like one part/.test(main), JSON.stringify(counts));
  await shot("B4-imm5476-normalisation.png");
  // C3.2 (P-121): bulk accept takes only High reuse matches (both AI rounds agree and the rules pass). Since the C11.14
  // result (#671's checker rounds, 3 Nov) IMM 5476's replay has its checker round, so some reuse matches may be High: the
  // button counts them and is on, or with none it is off and says why. There is no bulk accept of new definitions. Every
  // proposal is decided one by one below (decideRest).
  const bulk = p.getByRole("button", { name: /^Accept High exact reuse \(\d+\)$/ });
  const highN = Number(/\((\d+)\)/.exec((await bulk.innerText()) ?? "")?.[1] ?? -1), bulkTitle = (await bulk.getAttribute("title")) ?? "";
  step("C3.2: bulk accept takes only High reuse matches: on when some are High (both rounds agree, rules pass), off with the reason when none is; no bulk accept of new definitions", highN >= 0 && (highN > 0 ? !(await bulk.isDisabled()) && /both AI rounds agree/.test(bulkTitle) : (await bulk.isDisabled()) && bulkTitle.length > 10) && (await btn("Accept clean new definitions").count()) === 0, `${highN}: ${bulkTitle}`);
  const tel = p.locator("article", { hasText: "Ambiguous" }).filter({ has: p.getByRole("button", { name: "Return" }) }).last();
  if (await tel.count()) { await click(tel.getByRole("button", { name: "Return" })); await tel.getByLabel(/Why it goes back/).fill("Returned for the form owner: confirm the meaning on this form before it joins the library."); await click(tel.getByRole("button", { name: "Return", exact: true }).last()); }
  await decideRest();
  const jd = await api(`/jobs/${p.url().split("/jobs/")[1]}`);
  const parts = jd.items.filter((i) => /mailing_address_/.test(i.proposedKey));
  step("B4: every proposal decided by a person; address parts reuse the composite address; one item returned with a reason", jd.items.every((i) => i.decision !== "PENDING") && parts.length > 0 && parts.every((i) => i.decidedKey === "person.mailing_address") && jd.items.some((i) => i.decision === "RETURNED"), `${jd.items.filter((i) => i.decision !== "PENDING").length}/${jd.items.length} decided; parts ${parts.map((i) => `${i.proposedKey}->${i.decidedKey}`).join(" ")}; returned ${jd.items.filter((i) => i.decision === "RETURNED").map((i) => i.proposedKey).join(",")}`);
  await click(btn("Apply to draft")); await p.getByRole("dialog").getByLabel("Who files this form").selectOption("principal_applicant"); await click(p.getByRole("dialog").getByRole("button", { name: "Apply to draft" }));
  await afterApply();
  const draft = await api(`/combinations/${scratch}/preview?mode=draft&profile=none`);
  const c5476 = draft.coverage.find((c) => c.form === "IMM 5476");
  const addrBox = c5476.boxes.find((x) => x.fact === "person.mailing_address");
  step("B5: draft preview: IMM 5476 boxes read reused definitions; new fields have no value source yet (unresolved, no placement)", !!addrBox && (c5476.counts.unresolved ?? 0) > 0, JSON.stringify(c5476.counts));
  await go(`/c/${scratch}/preview?view=studio`); await click(btn("Forms and coverage")); await shot("B5-coverage-before-placement.png");

  // P-158 (S6 2a): sections come from the forms' parts, never a free add. The page offers no Add; until slice 2 proposes
  // sections from the forms, the journey's new section is written as that proposal would be (tests/seed_library.cjs).
  await go("/library/sections");
  step("B6 P-158: the Sections page says where sections come from and offers no Add", /Where these come from/.test(await p.locator("main").innerText()) && (await p.getByRole("button", { name: "Add", exact: true }).count()) === 0 && (await p.getByLabel("New section title").count()) === 0);
  require("./seed_library.cjs").seedSection((q) => require("node:child_process").execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${process.env.STUDIO_DB ?? "xr_studio_demo"}`, "-Atc", q], { encoding: "utf8" }).trim(), { title: "Contact details" });
  await go("/library/fields/person.email"); await p.getByLabel("Section").selectOption({ label: "Contact details" }); await p.getByLabel("Collected from").selectOption("client_questionnaire");
  await click(btn("Save placement as draft"));
  { const t = await toastLike(/Placement saved/); step("B6: a person places person.email in a new section (draft)", /Placement saved/.test(t), t); }
  const after = await api(`/combinations/${scratch}/preview?mode=draft&profile=none`);
  const emailBoxes = after.coverage.flatMap((c) => c.boxes).filter((x) => x.fact === "person.email");
  step("B6: without any screen-code change the email boxes now come from a client question", emailBoxes.length > 0 && emailBoxes.every((x) => x.coverage === "client question"), `${emailBoxes.length} boxes`);
  // Screen 02 slice 2 (K1, B1): every form field of the applied editions has a decision, and a second person approves
  // the new shared fields on To review, before the draft is submitted and released (through the API: scaffolding here;
  // check_screen02_slice2_browser.cjs walks the same decisions on their pages).
  const appliedJobs = (await api(`/combinations/${scratch}`)).jobs.filter((j) => j.kind === "field_map" && j.status === "APPLIED");
  let decidedFF = 0;
  for (const j of appliedJobs) {
    const ff = await api(`/jobs/${j.id}/form-fields`);
    for (const x of ff.fields.filter((y) => y.outcome === "unresolved")) { await api(`/editions/${ff.edition.id}/form-fields/decision`, { method: "POST", data: { dataPath: x.dataPath, decision: x.background ? "by_hand" : "not_a_fact", reason: x.background ? "A Background question, recorded by hand in this journey (Sample; C3.8)." : "Not filled from case facts in this journey (Sample)." } }); decidedFF++; }
  }
  const waitingAdds = await api("/library/changes?status=WAITING");
  for (const c of waitingAdds) await p.request.fetch(`${URL}/api/library/changes/${c.id}/approve`, { method: "POST", headers: { "x-actor": "user-C", "content-type": "application/json" }, data: {} });
  step("B6b: every form field decided (K1) and each new shared field approved by a second person (B1)", (await api("/library/changes?status=WAITING")).length === 0, `${decidedFF} form fields · ${waitingAdds.length} new fields approved`);
  // S5 slice 2 coverage gate (BR-11): release waits while an answer the forms need is asked of nobody. The Smart questionnaire (SQR)
  // tab names each one; the person has the case officer fill them (placed in a working view, the call the Fields page makes).
  await go(`/c/${scratch}/questionnaires`);
  const gapsShown = await p.locator("[data-gaps] li").count();
  const sec = (await api("/library/sections"))[0]?.key;
  for (const x of (await api(`/combinations/${scratch}`)).draft.problems.filter((q) => q.where === "Questionnaires"))
    await p.request.fetch(`${URL}/api/library/fields/${encodeURIComponent(x.item)}/placement`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: { sectionKey: sec, collectedFrom: "staff_working_view", repeats: x.item.startsWith("case.") ? "once_per_case" : "per_person" } });
  const left = (await api(`/combinations/${scratch}`)).draft.problems.filter((q) => q.where === "Questionnaires").length;
  step("B6c (S5 BR-11): the answers the forms need but nobody was asked are named on Smart questionnaire (SQR); once the case officer fills them, none is left", left === 0, `${gapsShown} shown, ${left} left`);
  // C11.12 BR-7: a new release needs each applicant role's filing; the author sets them (through the API: scaffolding here;
  // check_c1112_filing_browser.cjs walks the Filing column on its screen).
  await setFilingModes(async (pth, init = {}) => { const r = await p.request.fetch(`${URL}/api${pth}`, { headers: { "x-actor": "user-A", "content-type": "application/json" }, ...init }); return { status: r.status(), body: await r.json() }; }, scratch);
  await sourceEveryNumber(URL, scratch); // G1 (C5.4)
  // G5 (C5.1, P-248, #868): a release needs a document line beside its forms; one with a type the library has released
  // (through the API: scaffolding here; acceptance/C5.1.test.ts walks the refusal and the Documents tab).
  // The library here is built from scratch, so the type is named on the line: it waits as a proposal (C3.6), a second
  // person accepts it, and a third approves its library ADD before any release carries it (BR-9).
  const post = (pth, data, actor = "user-A") => p.request.fetch(`${URL}/api${pth}`, { method: "POST", headers: { "x-actor": actor, "content-type": "application/json" }, data }).then(async (r) => ({ status: r.status(), body: await r.json().catch(() => null) }));
  const docLine = { attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" };
  const namedDoc = await post(`/combinations/${scratch}/requirements`, { ...docLine, documentTypeName: "Passport copy (Sample)" });
  const docKey = namedDoc.status === 202 ? (await post("/review/proposals/decide", { ids: [namedDoc.body.proposalId], action: "accept" }, "user-B")).body?.items?.[0]?.landedAs : null;
  if (docKey) await post(`/combinations/${scratch}/requirements`, { ...docLine, documentTypeKey: docKey });
  for (const ch of await api("/library/changes?status=WAITING")) await post(`/library/changes/${ch.id}/approve`, {}, "user-C");
  await go(`/c/${scratch}/review`);
  await click(btn("Submit for review"));
  await as("user-C"); await click(btn("Select all I can sign")); await click(btn(/^Sign/));
  await as("user-B"); await click(btn("Approve and release")); await p.getByText(/Released version \d/).last().waitFor({ timeout: 30000 }).catch(() => {});
  step("B7: the from-scratch configuration is reviewed and released as version 1", /Released version 1/.test(await toasts()), await toasts());
  await shot("B7-scratch-released.png");
  await as("user-A");
  const libB = await api("/library/fields");
  step("B7: library holds one definition per key, AI-proposed and human rows labelled", libB.length === new Set(libB.map((f) => f.key)).size && libB.some((f) => f.origin === "AI_PROPOSAL"), `${libB.length} fields`);

  // ================================================================ reset → seed → rerun
  await reset("C0");
  const second = await loadSamples("C1");
  step("C1: the rerun after reset has the same counts as the first load (no duplicates, no stale state)", JSON.stringify(second.counts) === JSON.stringify(first.counts) && second.fields === first.fields, `${JSON.stringify(second.counts)} fields ${second.fields}`);
  const act = await api("/activity");
  step("C1: activity starts fresh from the reset (no stale history in the new workspace)", act.every((x) => new Date(x.at) > new Date(Date.now() - 600000)) && act.some((x) => x.action === "reset"));
  await shot("C1-programs-after-rerun.png");

  step("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  const passed = log.filter((l) => l.ok).length;
  fs.writeFileSync(path.join(OUT, "studio-browser-run.json"), JSON.stringify({ at: new Date().toISOString(), live: LIVE, passed, total: log.length, clicks, seconds: Math.round((Date.now() - t0) / 1000), steps: log }, null, 1));
  console.log(`\n${passed}/${log.length} passed, ${clicks} clicks, ${Math.round((Date.now() - t0) / 1000)} s`);
  await b.close();
  process.exit(passed === log.length ? 0 : 1);
})().catch(async (e) => { console.error(e); try { const pg = globalThis.__page; if (pg) await pg.screenshot({ path: path.join(OUT, "FAILURE.png"), fullPage: true }); } catch { /* ignore */ } fs.writeFileSync(path.join(OUT, "studio-browser-run.json"), JSON.stringify({ error: String(e.stack ?? e), steps: log }, null, 1)); process.exit(2); });
