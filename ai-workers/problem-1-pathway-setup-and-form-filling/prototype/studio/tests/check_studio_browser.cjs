// Product Studio browser check: operates the real screens (http://localhost:4400, studio/start.sh running) as the
// simulated configuration author, content reviewer (SME duty) and approver, in two passes on the same database:
//   Pass A, sample path: Reset → Load sample inputs → released c1-v3 combination → preview with sample facts and an
//     on-screen answer → actual PDF fill/read-back/download → human adds a conditional document requirement (draft) →
//     draft preview changes → submit, refused early approval, SME sign-off, release v2 → release preview shows it →
//     guarded AI path for IMM 5257 (stub pass; a live call only with STUDIO_LIVE=1).
//   Pass B, from scratch after Reset: pathway/program/combination by hand → manual upload (official and a non-official
//     file) and a sample attachment → read forms → AI field map of IMM 1295 (replay of the saved real run) into an
//     empty library → IMM 5476 (replay) compared with that library: reuse, new, ambiguous, address parts → decisions,
//     a returned item → apply → coverage → section and placement added by a person → coverage changes → release.
//   Then Reset → Load sample inputs again: the same counts, no duplicates (reset → seed → run → reset → rerun).
// Screenshots, a step log and API snapshots go to studio/evidence/browser-run-<n>/.  node studio/tests/check_studio_browser.cjs
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
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
    await click(p.getByRole("dialog").getByRole("button", { name: "Reset demo" }));
    await p.getByRole("dialog").getByText(/rows and \d+ working files removed/).waitFor({ timeout: 60000 });
    const txt = await p.getByRole("dialog").innerText();
    step(`${label}: reset removes the workspace rows and files, preserved evidence byte-identical`, /byte-identical/.test(txt) && /0 rows remain/.test(txt), txt.split("\n").slice(1, 3).join(" "));
    await shot(`${label}-reset.png`);
    await click(p.getByRole("dialog").getByRole("button", { name: "Close" }).last());
    const cat = await api("/catalogue?pathway=INDIVIDUAL");
    step(`${label}: workspace empty after reset (no programs; the two fixed pathways only)`, cat.tree.length === 0 && cat.totals.combinations === 0);
  };
  const loadSamples = async (label) => {
    await go("/"); await click(btn("Demo")); await click(p.getByRole("menuitem", { name: /Load sample inputs/ }));
    await p.getByText("Sample inputs loaded", { exact: false }).first().waitFor({ timeout: 60000 });
    await click(btn("Continue"));
    // Screen 01 catalogue: one tree per pathway; a combination is a last-level row with combinationId.
    const leaves = (ns) => ns.flatMap((n) => (n.kind === "combination" ? [n] : leaves(n.children)));
    const ind = await api("/catalogue?pathway=INDIVIDUAL"), cor = await api("/catalogue?pathway=CORPORATE");
    const comps = [...leaves(ind.tree), ...leaves(cor.tree)].filter((l) => l.combinationId).map((l) => ({ ...l, id: l.combinationId }));
    let attachments = 0; for (const c of comps) attachments += (await api(`/combinations/${c.id}/summary`)).sources.length;
    const counts = { pathways: ind.pathways.length, programs: ind.tree.length + cor.tree.length, rows: comps.length, attachments, released: comps.filter((c) => c.release).length };
    const fields = await api("/library/fields");
    const dupFields = fields.length - new Set(fields.map((f) => f.key)).size;
    step(`${label}: Load sample inputs creates 11 programs over the 2 pathways and sets up 6 combinations, official files through the upload path, one released`, counts.pathways === 2 && counts.programs === 11 && counts.rows === 6 && counts.attachments === 24 && counts.released === 1, JSON.stringify(counts));
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

  await go(`/c/${wp}/preview`);
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
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("link", { name: "Download the checked PDF" }).click()]);
  const pdfPath = path.join(OUT, `downloaded-${dl.suggestedFilename()}`); await dl.saveAs(pdfPath);
  step("A4: the checked PDF downloads", fs.statSync(pdfPath).size > 800000 && fs.readFileSync(pdfPath).subarray(0, 5).toString() === "%PDF-", `${dl.suggestedFilename()} ${fs.statSync(pdfPath).size} bytes`);
  await click(p.getByRole("dialog").getByRole("button", { name: "Close" }).last());

  // a person adds a conditional document requirement (sample input instead of typing)
  await go(`/c/${wp}/configuration`); await click(p.getByRole("tab", { name: /^Documents/ }));
  await click(btn("Add a document requirement"));
  await click(btn("Minor travelling alone (conditional): IMM 5484"));
  await p.getByText("Condition is valid").waitFor();
  await click(p.getByRole("dialog").getByRole("button", { name: "Save to draft" }));
  { const t = await toastLike(/added to the draft/); step("A5: a person adds a conditional document requirement with a valid condition, saved as draft", /added to the draft/.test(t), t); }
  await p.reload(); await idle(); await click(p.getByRole("tab", { name: /^Documents/ }));
  main = await p.innerText("main");
  step("A5: the new requirement survives a reload, marked Draft and edited by a person", /Custody documents or parental letter of authorization/.test(main) && /Edited by a person/.test(main));
  await shot("A5-configuration-documents.png");

  await go(`/c/${wp}/preview`);
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
  await go(`/c/${wp}/review`);
  await click(btn("Submit for review"));
  { const t = await toastLike(/Submitted for review/); step("A7: the author submits the change for review", /Submitted for review/.test(t), t); }
  await as("user-B");
  await click(btn("Approve and release"));
  { const t = await toastLike(/SME sign-off/); step("A7: approval before the SME sign-off is refused", /SME sign-off/.test(t), t); }
  await as("user-C");
  await click(btn("Select all I can sign")); await click(btn(/^Sign/));
  await as("user-B");
  await click(btn("Approve and release")); await p.getByText(/Released version 2/).last().waitFor({ timeout: 30000 }).catch(() => {});
  step("A7: a second person (approver) releases version 2", /Released version 2/.test(await lastToast()), await lastToast());
  await shot("A7-review-released.png");
  const rel2 = await api(`/combinations/${wp}/preview?mode=release&profile=none`);
  step("A7: the released version now carries the new requirement", rel2.label === "Released version 2" && rel2.checklist.some((r) => /Custody documents/.test(r.requirement)));
  await as("user-A");

  // guarded AI path for the added form IMM 5257
  await go(`/c/${vv}/sources`);
  await click(p.getByRole("row", { name: /IMM 5257/ }).getByRole("button", { name: "Draft with AI" }));
  await p.getByRole("dialog").getByText(LIVE ? "Live AI call" : "Stub pass only").click();
  await click(p.getByRole("dialog").getByRole("button", { name: LIVE ? "Start live AI draft" : "Run stub pass" }));
  for (let i = 0; i < 120; i++) { const d = await api(`/combinations/${vv}`); const j = d.jobs.find((x) => x.kind === "field_map"); if (j && j.status !== "RUNNING" && j.status !== "QUEUED") break; await p.waitForTimeout(2000); }
  const vvd = await api(`/combinations/${vv}`); const job = vvd.jobs.find((x) => x.kind === "field_map");
  step(`A8: IMM 5257 through the guarded AI path (${LIVE ? "live" : "stub pass"}) ends in an honest state`, job && ["COMPLETED", "BLOCKED"].includes(job.status), `${job?.mode} ${job?.status}: ${job?.message?.slice(0, 160)}`);
  await go(`/c/${vv}/sources`); await shot("A8-imm5257-guarded-path.png");

  await go("/library/fields/person.date_of_birth");
  main = await p.innerText("main");
  step("A9: a shared field shows the boxes of every form that read it and whose value each needs", /IMM 1295/.test(main) && /IMM 5707/.test(main) && /the subject's spouse or partner/.test(main));
  await shot("A9-field-reuse.png");

  // ================================================================ PASS B: from scratch, after a reset
  await reset("B0");
  await go("/");
  // Masters first (level, parent and duplicates are checked by the server), then the combination is chosen from them
  // (Screen 01: "Add program or category", then "+ New combination"; the two pathways are fixed).
  const addNode = async (kind, parent, name) => {
    await click(btn("Add program or category").first()); const md = p.getByRole("dialog", { name: "Add program or category" });
    await md.getByRole("radio", { name: new RegExp(`^${kind}`) }).check();
    if (parent) await md.getByLabel(/belongs to/).selectOption({ label: parent });
    await md.getByLabel("Name").fill(name);
    await click(md.getByRole("button", { name: new RegExp(`^Add ${kind.toLowerCase()}$`) }));
  };
  await addNode("Program", null, "Work permits (built from scratch)");
  await addNode("Category", "Work permits (built from scratch)", "Employer-specific work permit");
  await click(btn("New combination")); const cd = p.getByRole("dialog", { name: "New combination" });
  await cd.getByLabel("Program", { exact: true }).selectOption({ label: "Work permits (built from scratch)" });
  await cd.getByLabel("Category", { exact: true }).selectOption({ index: 1 });
  await click(cd.getByRole("button", { name: /Next: official sources/ }));
  await click(p.getByRole("dialog", { name: "Add the official sources" }).getByRole("button", { name: "Save and set up by hand" }));
  await click(p.getByRole("dialog", { name: "Employer-specific work permit" }).getByRole("link", { name: /Open full configuration/ }));
  await p.waitForURL(/\/c\//); const scratch = p.url().split("/c/")[1].split("/")[0];
  const b1 = await p.getByText(/Category: Employer-specific work permit/).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  step("B1: pathway, program and category chosen as masters, then the configuration row created for that full combination", !!scratch && b1);
  await go(`/c/${scratch}/sources`);
  await p.setInputFiles('input[type=file]', [path.join(OFFICIAL, "forms/imm1295e.pdf")]); await p.waitForTimeout(1500); await idle();
  const junk = path.join(OUT, "not-an-official-form.pdf"); fs.writeFileSync(junk, "%PDF-1.4 not an official form\n");
  await p.setInputFiles('input[type=file]', [junk]); await p.waitForTimeout(1500); await idle();
  await click(btn("Attach a sample file")); await click(p.getByRole("dialog").getByRole("row", { name: /IMM 5476/ }).getByRole("button", { name: "Attach" })); await click(p.getByRole("dialog").getByRole("button", { name: "Done" }));
  // Wait for the refreshed list (under machine load one immediate read could still show the previous list).
  for (let i = 0; i < 40; i++) { main = await p.innerText("main"); if (/Recognised: ready to read/.test(main) && /Held: not recognised/.test(main) && /IMM 5476/.test(main)) break; await p.waitForTimeout(375); }
  step("B2: manual upload of an official form is recognised; a non-official file is held; a sample attachment uses the same path", /Recognised: ready to read/.test(main) && /Held: not recognised/.test(main) && /IMM 5476/.test(main));
  await shot("B2-sources.png");
  // Read each recognised form, one click per form, waiting until the server records it as read.
  for (let i = 0; i < 4; i++) {
    const before = (await api(`/combinations/${scratch}/attachments`)).filter((a) => a.status === "READ").length; if (before >= 2) break;
    if (await btn("Read form").count()) await click(btn("Read form").first());
    for (let w = 0; w < 60 && (await api(`/combinations/${scratch}/attachments`)).filter((a) => a.status === "READ").length <= before; w++) await p.waitForTimeout(500);
  }
  const atts = await api(`/combinations/${scratch}/attachments`);
  step("B2: both forms read on this computer (no AI); the non-official file stays held", atts.filter((a) => a.status === "READ").length === 2 && atts.some((a) => a.status === "HELD"), atts.map((a) => `${a.fileName}=${a.status}`).join(", "));

  /** Every remaining undecided proposal: take the shown recommendation (a person's click per item). */
  const decideRest = async () => {
    await click(p.getByRole("tab", { name: /^All/ }));
    // One decision per click, confirmed before the next: the list re-renders after each decision, and under machine load a
    // click aimed at a re-rendering card can be lost (the 21 Oct runs 1 and 5 timed out here; runs 2–4 passed).
    const pend = p.locator("article").filter({ has: p.getByRole("button", { name: "Return" }) });
    for (let i = 0; i < 300; i++) {
      const n = await pend.count(); if (!n) break;
      clicks++; await pend.first().getByRole("button").first().click({ timeout: 10000 }).catch(() => {});
      for (let w = 0; w < 40 && (await pend.count()) >= n; w++) await p.waitForTimeout(250);
    }
  };
  const draftReplay = async (edition) => {
    await click(p.getByRole("row", { name: new RegExp(edition) }).getByRole("button", { name: "Draft with AI" }));
    await p.getByRole("dialog").getByText("Use the saved AI answer").click();
    await click(p.getByRole("dialog").getByRole("button", { name: "Use saved AI answer" }));
    await p.getByRole("row", { name: new RegExp(edition) }).getByRole("link", { name: "Review AI proposals" }).click(); await idle();
  };
  await draftReplay("IMM 1295");
  await p.getByText("Replay of a saved run").first().waitFor();
  const j1295 = await api(`/jobs/${p.url().split("/jobs/")[1]}`);
  step("B3: the IMM 1295 draft is a labelled replay of a saved real run; against an empty library every field is new", j1295.mode === "REPLAY" && /Replay of saved run/.test(j1295.message) && j1295.detail.counts.reuse === 0 && j1295.detail.counts.new === j1295.items.length, `${j1295.runId}: ${JSON.stringify(j1295.detail.counts)}`);
  await shot("B3-imm1295-proposals.png");
  await click(btn("Accept clean new definitions"));
  await decideRest();
  await click(btn("Apply to draft")); await click(p.getByRole("dialog").getByRole("button", { name: "Apply to draft" }));
  await p.waitForURL(/preview/); await idle();
  step("B3: IMM 1295 applied: its map and new definitions are in the draft", /applied to the draft/.test(await lastToast()), await lastToast());

  await go(`/c/${scratch}/sources`);
  await draftReplay("IMM 5476");
  main = await p.innerText("main");
  const counts = (await api(`/jobs/${p.url().split("/jobs/")[1]}`)).detail.counts;
  step("B4: adding IMM 5476 reuses library definitions, proposes new ones and flags ambiguous ones (address parts, near duplicates)", counts.reuse > 0 && counts.new > 0 && counts.ambiguous > 0 && /Looks like one part/.test(main), JSON.stringify(counts));
  await shot("B4-imm5476-normalisation.png");
  await click(btn("Accept exact reuse")); await click(btn("Accept clean new definitions"));
  const tel = p.locator("article", { hasText: "Ambiguous" }).filter({ has: p.getByRole("button", { name: "Return" }) }).last();
  if (await tel.count()) { await click(tel.getByRole("button", { name: "Return" })); await tel.getByLabel(/Why it goes back/).fill("Returned for the form owner: confirm the meaning on this form before it joins the library."); await click(tel.getByRole("button", { name: "Return", exact: true }).last()); }
  await decideRest();
  const jd = await api(`/jobs/${p.url().split("/jobs/")[1]}`);
  const parts = jd.items.filter((i) => /mailing_address_/.test(i.proposedKey));
  step("B4: every proposal decided by a person; address parts reuse the composite address; one item returned with a reason", jd.items.every((i) => i.decision !== "PENDING") && parts.length > 0 && parts.every((i) => i.decidedKey === "person.mailing_address") && jd.items.some((i) => i.decision === "RETURNED"), `${jd.items.filter((i) => i.decision !== "PENDING").length}/${jd.items.length} decided; parts ${parts.map((i) => `${i.proposedKey}->${i.decidedKey}`).join(" ")}; returned ${jd.items.filter((i) => i.decision === "RETURNED").map((i) => i.proposedKey).join(",")}`);
  await click(btn("Apply to draft")); await p.getByRole("dialog").getByLabel("Who files this form").selectOption("principal_applicant"); await click(p.getByRole("dialog").getByRole("button", { name: "Apply to draft" }));
  await p.waitForURL(/preview/); await idle();
  const draft = await api(`/combinations/${scratch}/preview?mode=draft&profile=none`);
  const c5476 = draft.coverage.find((c) => c.form === "IMM 5476");
  const addrBox = c5476.boxes.find((x) => x.fact === "person.mailing_address");
  step("B5: draft preview: IMM 5476 boxes read reused definitions; new fields have no value source yet (unresolved, no placement)", !!addrBox && (c5476.counts.unresolved ?? 0) > 0, JSON.stringify(c5476.counts));
  await click(btn("Forms and coverage")); await shot("B5-coverage-before-placement.png");

  await go("/library/sections"); await p.getByLabel("New section title").fill("Contact details"); await click(p.getByRole("button", { name: "Add", exact: true }));
  await go("/library/fields/person.email"); await p.getByLabel("Section").selectOption({ label: "Contact details" }); await p.getByLabel("Collected from").selectOption("client_questionnaire");
  await click(btn("Save placement as draft"));
  { const t = await toastLike(/Placement saved/); step("B6: a person places person.email in a new section (draft)", /Placement saved/.test(t), t); }
  const after = await api(`/combinations/${scratch}/preview?mode=draft&profile=none`);
  const emailBoxes = after.coverage.flatMap((c) => c.boxes).filter((x) => x.fact === "person.email");
  step("B6: without any screen-code change the email boxes now come from a client question", emailBoxes.length > 0 && emailBoxes.every((x) => x.coverage === "client question"), `${emailBoxes.length} boxes`);
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
