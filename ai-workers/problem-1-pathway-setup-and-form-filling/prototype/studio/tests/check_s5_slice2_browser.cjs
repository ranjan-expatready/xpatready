// S5 Combination workspace slice 2 and the slice 1 early-look fixes (Lead note 27 Oct 23:05) walked in a real browser like
// a person: Forms lists each form once with its reading status in its row and the sources in one line (fix 1); filing
// warnings in business words (fix 2); Smart questionnaire (SQR) per person with question wording, who fills it, the forms that need
// it and a side panel that alone shows the field code (fix 3), a coverage gap blocking release; Preview with one section
// open and a jump list (fix 4). The drift check's Shoulds (Lead note 28 Oct): counts for forms attached but not set up
// (5), IRCC's words as sentences (6), Remove asks first and Undo puts it back (8, P-116), Review in words (2), Preview
// names without repeats (4), a Sample state where Review shows a form AI picked (3). Screenshots at 1440 and 1024 px into
// product/screens/W1-combination-workspace/screenshots/slice2/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_s5e 4435 start && node studio/tests/check_s5_slice2_browser.cjs 4435 xr_studio_runtime_s5e
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { sourceEveryNumber } = require("./fixtures/source-every-number.cjs"); // G1 (C5.4): a release needs every number sourced
const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_s5e";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-combination-workspace", "screenshots", "slice2"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const CODE = /\b(case|person|relationship|organisation)\.[a-z_]+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const panel = () => p.getByRole("tabpanel");
  // A wait the check relies on fails loudly when it times out (flaky-checks fix, 1 Nov): a FAIL step naming the wait,
  // never a silent catch that leaves a later step to fail on a page that had not finished.
  const loud = (what) => (e) => step(`wait: ${what}`, false, String(e?.message ?? e).split("\n")[0]);
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(loud("the page settles (nothing busy, no spinner)")); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    // Drift check 12: viewport-sized captures (no fixed bars painted mid-page, side panels in view).
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const served = (await api("/session")).body.workspace.id;
  const leaves = []; const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x.kind === "combination" && x.combinationId) leaves.push(x); Object.values(x).forEach(walk); } };
  walk((await api("/catalogue")).body);
  const C = leaves.find((l) => l.status === "READY").combinationId;
  const VV = leaves.find((l) => l.label === "Visitor visa").combinationId;
  const go = async (id, tab, qs = "") => { await p.goto(`${BASE}/c/${id}/${tab}${qs}`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle(); };

  // ======================================================== fix 1 and fix 2: Forms
  await go(C, "forms");
  const text = await panel().innerText();
  step("fix 1: each form appears once (no second list of the same forms)", text.split("IMM 5409 (01-2023)").length === 2 && await p.locator("[data-reading]").count() === 0, text.split("IMM 5409 (01-2023)").length - 1);
  step("fix 1: the row shows its reading status and last step; the sources are one compact line", /In the library/.test(await p.locator('[data-line="IMM 5409"]').innerText()) && await p.locator("[data-sources]").count() === 1);
  const warnings = await p.getByRole("list", { name: "Filing problems" }).innerText().catch(() => "");
  step("fix 2: the list warning says what it means and where it is set, with a real example (never \"no purpose yet\", never an empty or technical example)", /rows of its lists \(for example "[A-Z][^"]+"\) do not say yet what the list holds/.test(warnings) && !/no purpose yet|for example \)|for example "[A-Z_0-9]+\[/.test(warnings), warnings.split("\n")[0]);
  step("C11.6 drift 6: IRCC's words show as sentences, never a label glued to a word (\"applicableNote:\")", !/[a-z][A-Z][a-z]+:/.test(text) && /if applicable\. Note:/.test(text), (text.match(/\S*[a-z][A-Z][a-z]+:/) ?? [""])[0]);
  await state("forms-listed-once");
  // P-116 (drift 8): Remove asks first and names the form; Keep it changes nothing; after removing, Undo puts it back.
  await p.getByRole("button", { name: "Change IMM 5475" }).click();
  await p.getByRole("button", { name: "Remove from this combination" }).click();
  const ask = p.locator("[data-confirm-remove]");
  step("C11.9 P-116: Remove asks first, naming the form, and says it stays in the library and can be undone", /Remove IMM 5475 \(.+\) from this combination\? It stays in the Form library, and you can undo it/.test(await ask.innerText()));
  await state("forms-remove-confirm");
  await ask.getByRole("button", { name: "Keep it" }).click();
  step("C11.9 P-116: Keep it closes the question and removes nothing", await ask.count() === 0 && (await api(`/combinations/${C}/workspace?tab=forms`)).body.lines.some((l) => l.code === "IMM 5475"));
  await p.getByRole("button", { name: "Remove from this combination" }).click();
  await p.locator("[data-confirm-remove]").getByRole("button", { name: "Remove IMM 5475" }).click(); await settle();
  await p.locator("[data-removed]").waitFor({ timeout: 15000 }).catch(loud("the removed form shows under \"Removed in this draft\""));
  step("C11.9 P-116: the removed form leaves the list and shows under \"Removed in this draft\" with Add back; the shared Undo toast names it", await p.locator('[data-line="IMM 5475"]').count() === 0 && /IMM 5475/.test(await p.locator("[data-removed]").innerText()) && await p.getByRole("button", { name: "Add back IMM 5475" }).count() === 1 && /IMM 5475 removed from this combination/.test(await p.locator("[data-undo-toast]").innerText().catch(() => "")));
  step("C11.9 P-116: the one Undo bar names the last change, the list is in view, and the removed form is not a form waiting to be set up", /Last change: Removed IMM 5475/.test(await p.locator("[data-undo-bar]").innerText().catch(() => "")) && await p.evaluate(() => { const r = document.querySelector("[data-removed]").getBoundingClientRect(), bar = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0; return r.top >= bar && r.bottom <= window.innerHeight; }) && await p.locator("[data-pending-summary]").count() === 0 && await p.locator('[data-pending^="IMM 5475"]').count() === 0);
  await state("forms-removed-undo");
  await p.locator("[data-undo-bar]").getByRole("button", { name: "Undo" }).click(); await settle();
  await p.locator('[data-line="IMM 5475"]').waitFor({ timeout: 15000 }).catch(loud("Undo puts IMM 5475 back in the list"));
  step("C11.9 P-116: Undo puts the same line back and the notice goes", await p.locator('[data-line="IMM 5475"]').count() === 1 && await p.locator("[data-removed]").count() === 0);
  await p.getByRole("button", { name: "Change IMM 5409" }).click();
  const drawer = p.getByRole("dialog");
  step("fix 1: the form's side panel holds its reading and matching steps and its file", /Reading and matching/.test(await drawer.innerText()) && await drawer.locator("[data-reading-steps]").count() === 1);
  await state("forms-drawer-reading");
  await drawer.getByRole("button", { name: "Cancel" }).click();
  await go(VV, "forms");
  step("fix 1: forms attached but not set up yet are their own rows with their next step (Read form or Draft with AI)", await p.locator("[data-pending]").count() >= 1 && (await p.getByRole("button", { name: /Read form|Draft with AI|Add from library/ }).count()) >= 1, await p.locator("[data-pending]").count());
  const filingLine = await p.locator("[data-filing]").innerText(), pendingN = await p.locator("[data-pending]").count();
  step("C11.10 drift 5: the header counts the attached forms (never \"No forms yet · 0 forms\" above them) and says what each waits for", !/No forms yet|· 0 forms/.test(filingLine) && filingLine.includes(`${pendingN} form${pendingN === 1 ? "" : "s"} · 0 set up`) && /Not set up yet: .*(added from the library now|drafting with AI)/.test(await p.locator("[data-pending-summary]").innerText()), filingLine);
  // QA-119 (P-157, P-161 (1)): the header's one next step is the setup checklist's next item (here step 1, Official pages),
  // no longer the catalogue's "Add n forms from the library"; the summary and the rows still agree on the forms to add
  // from the library (no AI for them), and no second "Add n forms from the library" step competes with the header.
  const setupNext = (await api(`/combinations/${VV}/summary`)).body?.setup?.next ?? null;
  const header = (await p.locator("[data-header-next]").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  step("C11.10 drift 5 QA-119: the header's next step is the setup checklist's next item, in the same words (one next step per page)", !!setupNext && header.includes(setupNext.item.text) && await p.locator("[data-next-step]").count() === 1 && await p.locator("button, a").filter({ hasText: /^\s*Add \d+ forms? from the library/ }).count() === 0, `${header} | ${setupNext?.item.text}`);
  const summary = await p.locator("[data-pending-summary]").innerText(), k = Number((summary.match(/(\d+) forms? can be added from the library now/) ?? [])[1] ?? 0);
  step("C11.10 drift 5: the summary and the rows agree on the forms to add from the library (no AI for them)", k > 0 && await p.locator("[data-pending]").getByRole("button", { name: "Add from library" }).count() === k, summary);
  await state("forms-attached-not-set-up");

  // ======================================================== fix 3 and slice 2: Smart questionnaire (SQR) per person
  await go(C, "questionnaires");
  const q = p.locator("[data-questions]");
  step("one section open at first; the others fold (the page stays short)", await p.locator("[data-section] [aria-expanded=true]").count() === 1 && await p.locator("[data-section]").count() > 5);
  await state("questionnaires-per-person");
  await q.getByRole("button", { name: "Open all sections" }).click(); await settle();
  const qText = await q.innerText();
  step("fix 3: the questions show their wording; no field code and no \"(uses the field meaning)\" on the main path", (await p.locator("[data-question]").count()) > 20 && !CODE.test(qText) && !/uses the field meaning/.test(qText), (qText.match(CODE) ?? [""])[0]);
  // QA-82 (#469): the row no longer shows the field's meaning, which once carried an "IMM nnnn" by chance; the forms
  // that need a question are its Details panel's "Used by" line (checked below, after the panel opens).
  step("C4.1: one chip per person with a question count; who fills each question is shown", await p.locator("[data-role-chip]").count() === 4 && /Client|Case officer/.test(qText));
  step("coverage: the person's line says how many answers the forms need and who gives them (none asked of nobody on the sample)", /\d+ form facts( \(\d+ of them once for the application\))? · \d+ from documents · \d+ asked of the client · \d+ entered by the case officer/.test(await p.locator("[data-coverage]").innerText()) && !/asked of nobody/.test(await p.locator("[data-coverage]").innerText()));
  await p.locator("[data-question]").first().getByRole("button", { name: /^Details of/ }).click();
  const det = p.getByRole("dialog");
  step("fix 3 (QA-94): the field code stays behind the side panel's library link, never as text", /Open this answer in the shared library/.test(await det.innerText()) && !CODE.test(await det.locator("[data-question-details]").innerText()) && CODE.test(decodeURIComponent(await det.locator("[data-library-link]").getAttribute("href") ?? "")));
  const usedBy = await det.locator("[data-question-details]").innerText();
  step("C4.1: the forms that need a question are shown (its Details: Used by IMM nnnn)", /Used by\s+IMM \d{4}/.test(usedBy), usedBy.replace(/\s+/g, " ").slice(0, 200));
  await state("question-details");
  await det.getByRole("button", { name: "Close" }).first().click();
  await p.locator('[data-role-chip="spouse_or_partner"]').click(); await settle();
  await p.waitForFunction(() => /Spouse or partner:/.test(document.querySelector("[data-coverage]")?.textContent ?? ""), null, { timeout: 15000 }).catch(loud("the spouse's coverage line shows"));
  step("C4.1: choosing the spouse shows the spouse's questions (the address keeps the person)", /role=spouse_or_partner/.test(p.url()) && /Spouse or partner:/.test(await p.locator("[data-coverage]").innerText()));
  // A needed answer asked of nobody: the gap shows on the chip and the page, and release waits (BR-11).
  const fact = (await api(`/combinations/${C}/workspace?tab=questionnaires`)).body.questionnaire.sections.flatMap((s) => s.questions).find((x) => x.neededBy.length && x.filledBy === "CLIENT").fact;
  const before = sql(`select string_agg(id || '=' || status, ',' order by id) from section_question where canonical_field_key='${fact}' and workspace_id='${served}'`);
  sql(`update section_question set status='RETIRED' where canonical_field_key='${fact}' and workspace_id='${served}'`);
  await go(C, "questionnaires");
  step("BR-11 fail: an answer the forms need but nobody is asked shows on the person's chip and in a notice that release waits", /not asked/.test(await p.locator("[data-role-chip]").first().innerText()) && /needed but asked of nobody: release waits/.test(await q.innerText()) && !CODE.test(await p.locator("[data-gaps]").innerText()));
  await state("questionnaires-coverage-gap");
  // Drift 2: the second person reads the same gap on Review and release in words, never as a field code.
  await go(C, "review");
  const probs = await p.locator("[data-problem]").allInnerTexts();
  step("C5.1 drift 2: Review lists the gap in words (the question's meaning, the forms, the fix) with no field code", probs.some((x) => /nobody is asked for it/.test(x)) && !probs.some((x) => CODE.test(x)), probs.find((x) => CODE.test(x)) ?? probs[0]);
  step("C5.1 drift 11: no internal code on the review steps (\"D-2\")", !/\bD-2\b/.test(await panel().innerText()));
  await state("review-gap-in-words");
  for (const pair of before.split(",")) { const [qid, st] = pair.split("="); sql(`update section_question set status='${st}' where id='${qid}'`); }
  await go(C, "questionnaires");
  step("BR-11 pass: asked again, the gap is gone", !/asked of nobody/.test(await p.locator("[data-coverage]").innerText()));

  // ======================================================== fix 4: Preview, one section at a time
  await go(C, "preview", "?family=family2&person=principal");
  const jumps = await p.locator("[data-section-jump] button").count();
  step("fix 4: Preview opens one section with a jump list of every section (the phone column stays short); three columns kept", jumps > 3 && await p.locator("[data-preview-section]").count() === 1 && /Documents \(\d+\)/.test(await panel().innerText()) && /Forms \(\d+\)/.test(await panel().innerText()), `${jumps} sections`);
  const h0 = await p.locator("[data-preview-questions]").evaluate((e) => Math.round(e.getBoundingClientRect().height));
  await p.locator("[data-section-jump] button").nth(2).click(); await p.waitForTimeout(200);
  step("fix 4: the jump list opens another section (Section 3 of N); Next section moves on", /Section 3 of \d+/.test(await p.locator("[data-preview-section]").innerText()), h0);
  await p.getByRole("button", { name: "Next section" }).click();
  step("fix 4: Next section opens the fourth", /Section 4 of \d+/.test(await p.locator("[data-preview-section]").innerText()));
  step("fix 4: the phone column is about one screen long (under 1,800 px), not twelve", h0 < 1800, `${h0} px`);
  const names = (await p.locator("[data-section-jump] button").allInnerTexts()).map((x) => x.replace(/^\d+\.\s*/, "").replace(/\s*·\s*\d+$/, ""));
  step("C4.3 drift 4: the jump list never shows the same section name twice (a section asked about the application says so)", new Set(names).size === names.length && names.some((x) => /\(the application\)/.test(x)), names.join(" | "));
  await p.locator("[data-section-jump]").scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -120));
  await state("preview-one-section");

  // ======================================================== drift 3 (m7): a Sample state with a form AI picked
  // The form finder (slice 3) is what picks forms; until then a draft line marked as AI's shows what Review gives the
  // second person: the form, IRCC's words, and that it is Sample until the immigration expert confirms.
  const L = "IMM 5476", who0 = (await api(`/combinations/${C}/workspace?tab=forms`)).body.lines.find((l) => l.code === L).who;
  await api(`/combinations/${C}/forms/${encodeURIComponent(L)}`, { method: "PATCH", data: { who: who0 === "each_applicant" ? "principal_applicant" : "each_applicant" } });
  sql(`update combination_form set origin='AI_PROPOSAL' where combination_id='${C}' and lineage_key='${L}' and status='DRAFT'`);
  await go(C, "review");
  const picked = await p.locator("[data-ai-picked]").innerText().catch(() => "");
  step("C5.1 drift 3 pass: Review names the form AI picked with IRCC's words (as sentences) and asks to confirm before release", /IMM 5476/.test(picked) && /IRCC's words: "Use of a Representative \(IMM 5476\), if applicable\. Note:/.test(picked) && /confirm they apply before release/.test(await panel().innerText()), picked.slice(0, 160));
  await state("review-ai-picked");
  await api(`/combinations/${C}/forms/${encodeURIComponent(L)}`, { method: "PATCH", data: { who: who0 } });
  await go(C, "review");
  step("C5.1 drift 3 fail: with no form AI picked, Review shows no such notice", await p.locator("[data-ai-picked]").count() === 0);

  // ======================================================== QA-38 and QA-40 on the case side (Lead, 28 Oct)
  // The officer's New case list names the release a case opens on; a form a release files Online is still on the case.
  const o = await ctx.newPage(); o.on("pageerror", (e) => errs.push(e.message));
  await o.goto(BASE); await o.evaluate(() => { try { localStorage.setItem("xr-actor", "user-O"); } catch { /* ignore */ } });
  const label = async () => { await o.goto(`${BASE}/cases`); await o.getByRole("button", { name: "Open a case" }).click(); const d = o.getByRole("dialog"); await d.waitFor(); await o.waitForTimeout(300); return (await d.locator("select").first().locator("option").allInnerTexts()).find((x) => x.startsWith("With an LMIA")); };
  const l1 = await label(); await o.keyboard.press("Escape");
  step("C6.1 QA-38 fail-guard: with one release the New case list names release 1", l1 === "With an LMIA · release 1", l1);
  // Release 2: IMM 1295 filed Online (later wave), through the same submit, sign-off and second-person approval.
  await api(`/combinations/${C}/forms/${encodeURIComponent("IMM 1295")}/channel`, { method: "PATCH", data: { channel: "ONLINE", from: "PDF_UPLOAD" } });
  await sourceEveryNumber(BASE, C); // G1 (C5.4): the release's numbers need a source first
  await api(`/combinations/${C}/submit`, { method: "POST", data: { note: "IMM 1295 filed Online (later wave)" } });
  const sub2 = (await api(`/combinations/${C}/review`, { actor: "user-C" })).body?.submission;
  await api(`/combinations/${C}/signoff`, { method: "POST", data: { items: (sub2?.changeSummary ?? []).map((x) => `${x.kind}|${x.key}`), action: "signed" }, actor: "user-C" });
  const ap2 = await api(`/combinations/${C}/approve`, { method: "POST", actor: "user-B" });
  step("setup: release 2 files IMM 1295 Online (a second person released it)", ap2.status === 201 && ap2.body?.version === 2, ap2.body?.detail ?? ap2.status);
  const l2 = await label();
  step("C6.1 QA-38 pass: after release 2 the New case list names release 2, the one the case will use", l2 === "With an LMIA · release 2", l2);
  const dlg = o.getByRole("dialog");
  await dlg.locator("select").first().selectOption({ label: "With an LMIA · release 2" });
  await dlg.getByLabel("Your own reference (optional)").fill("S5-QA38"); await dlg.getByLabel("Principal applicant's name").fill("Sample Applicant Q");
  await dlg.getByRole("button", { name: "Open case" }).click();
  await o.waitForURL(/\/cases\/[0-9a-f-]{36}$/, { timeout: 30000 }).catch(loud("the new case opens"));
  // BK-4a: the case's release pill also names its person ("Release 2 (as Configuration author)"), so it is read by its attribute.
  const pill = o.locator("[data-case-release]").first();
  await pill.waitFor({ timeout: 15000 }).catch(loud("the case names its release"));
  const pillRelease = (await pill.textContent().catch(() => "") ?? "").replace(/\s*\(as [^)]*\)\s*$/, "").trim();
  step("C6.1 QA-38 pass: the case opens pinned to release 2, as the list said", pillRelease === "Release 2", pillRelease);
  await o.locator('[data-online-form="IMM 1295"]').waitFor({ timeout: 15000 }).catch(loud("the case lists IMM 1295 as filed Online"));
  const onl = await o.locator('[data-online-form="IMM 1295"]').innerText().catch(() => "");
  // P-145 (forms slice 1): the Online row says how it is filed and that its PDF is only a copy, not for filing.
  step("C7.6 QA-40 pass: the case still names IMM 1295 and says in words it is filed Online in a later wave, its PDF a copy not for filing (P-145)", /IMM 1295 · filed Online \(later wave\)/.test(onl.replace(/\s+/g, " ")) && /It is filed online: the case officer types it into the IRCC account/.test(onl.replace(/\s+/g, " ")) && /PDF copy, not for filing/.test(onl), onl.replace(/\s+/g, " ").slice(0, 200));
  step("C7.6 QA-40 fail-guard: a form filed as a PDF (IMM 5257 SCH1) is not in the Online rows", await o.locator('[data-online-form="IMM 5257 SCH1"]').count() === 0);
  await o.locator('[data-online-form="IMM 1295"]').scrollIntoViewIfNeeded();
  n++; await o.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-case-online-form-1440.png`) });
  const ax = await new AxeBuilder({ page: o }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  step("axe: the case page with an Online form has no WCAG A/AA violation", ax.violations.length === 0, ax.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));

  step("no page errors in the walk", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
