// S5 Combination workspace slice 1 (W1-08, walkthrough v2 S5) walked in a real browser like a person: one row of tabs in
// setup order and old addresses redirected; Overview only reports; Forms with the line drawer (minimum age, signed by,
// "Only if" in words with no rule, M1); Smart questionnaire (SQR) with "Who can be in this application" (add a Sponsor, the confirm
// when a form names a removed person, Undo, a stale save, M3/M4); Preview by person on caseView; Documents without the
// sample-input and attach-checklist scaffolding (m5); read-only for the approver. Screenshots at 1440 and 1024 px into
// product/screens/W1-combination-workspace/screenshots/slice1/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_s5b 4432 start && node studio/tests/check_s5_slice1_browser.cjs 4432 xr_studio_runtime_s5b
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4432);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-combination-workspace", "screenshots", "slice1"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const panel = () => p.getByRole("tabpanel");
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector('[role="status"] .animate-spin, .animate-spin'), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup: the sample, then the released work-permit combination
  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const load = await api("/demo/load", { method: "POST" });
  step("setup: the sample inputs load", load.status === 201, load.status);
  const leaves = []; const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x.kind === "combination" && x.combinationId) leaves.push(x); Object.values(x).forEach(walk); } };
  walk((await api("/catalogue")).body);
  const C = leaves.find((l) => l.status === "READY").combinationId;
  const go = async (tab, qs = "") => { await p.goto(`${BASE}/c/${C}/${tab}${qs}`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle(); };

  // ======================================================== tabs and old addresses (BR-1, m5)
  await go("overview");
  const tabs = await p.getByRole("tablist", { name: "Combination" }).getByRole("tab").allInnerTexts();
  step("BR-1: one row of seven tabs in setup order (G4 adds Tests, #525)", tabs.map((t) => t.replace(/\s*\d+ to (do|fix)( \d+ to fix)?$/, "").replace(/\d+$/, "").trim()).join(" · ") === "Overview · Forms · Smart questionnaire (SQR) · Documents · Preview · Tests · Review and release", tabs.join(" · "));
  await p.goto(`${BASE}/c/${C}/sources`); await p.waitForURL(/\/forms$/);
  step("BR-1 fail → redirect: the old Sources and forms address opens Forms", /\/c\/[^/]+\/forms$/.test(p.url()), p.url());
  await p.goto(`${BASE}/c/${C}/configuration?area=documents`); await p.waitForURL(/\/documents/);
  step("BR-1: the old Configuration › Documents address opens Documents", /\/documents/.test(p.url()), p.url());
  await p.goto(`${BASE}/c/${C}/pqr`); await p.waitForURL(/\/overview/);
  step("BR-1 fail: an unknown tab opens Overview", /\/overview/.test(p.url()), p.url());

  // ======================================================== Overview only reports (BR-2, P-118 Q5)
  await go("overview");
  const ovButtons = await panel().getByRole("button").count();
  const ovText = await panel().innerText();
  step("BR-2 pass: Overview has no add or edit control (links only)", ovButtons === 0, `${ovButtons} buttons`);
  // X1 C3: the setup strip names the people step (its card left the Overview for Forms, P-161 (2)).
  // UX-A part 3 (finding 7, QA-129): a released (Live) combination's strip reads "Live · setup steps for the next
  // release: n of 5 done"; a never-released one "Setup steps · n of 5 done".
  step("BR-2: Overview shows the setup steps (people among them, read only), the counts and released versions in one line", /(Setup steps · |Live · setup steps for the next release: )\d of 5 done/.test(ovText) && /Who can be in this application/.test(ovText) && /Released versions: Release 1/.test(ovText) && !/Held for a person|Recent steps|Add form/.test(ovText), ovText.slice(0, 300));
  await state("overview");

  // ======================================================== Forms: the line drawer (C11.6, M1)
  await go("forms");
  const rows = await p.locator("[data-line]").count();
  // C11.11 (QA-101): six lines; the checklists IMM 5488 and IMM 5905 are sources (the Sources line below), never lines.
  step("C1.6: the Forms tab lists each line with who, only if, filed as and the library edition", rows === 6 && /PDF only/.test(await p.locator("[data-filing]").innerText()), rows);
  // Early-look fix 1: each form listed once: its reading status and last step are in its row; no second list of forms.
  const row1295 = await p.locator('[data-line="IMM 1295"]').innerText();
  step("fix 1: each form's reading status and last step are in its own row; no second list repeats the forms", /In the library/.test(row1295) && /Read today/.test(row1295) && await p.locator("[data-reading]").count() === 0 && (await panel().innerText()).split("IMM 1295 (09-2023)").length <= 3, row1295.replace(/\s+/g, " ").slice(0, 160));
  step("fix 1: checklists, guides and pages that are not lines show as one compact Sources line", await p.locator("[data-sources]").count() === 1 && /Guide 5487 page/.test(await p.locator("[data-sources]").innerText()), await p.locator("[data-sources]").innerText());
  step("m5: no desktop upload and no 'Attach a sample file' on the combination (forms enter only through the Form library)", await panel().locator('input[type="file"]').count() === 0 && !/Attach a sample file|Choose files/.test(await panel().innerText()));
  await state("forms");
  await p.getByRole("button", { name: "Add a form from the library" }).click();
  const pick = p.getByRole("dialog", { name: "Add a form from the library" });
  await pick.waitFor();
  step("P-118 Q2: 'Add a form from the library' picks only library forms (no upload in the panel)", await pick.locator('input[type="file"]').count() === 0 && /Only forms already in the Form library/.test(await pick.innerText()));
  await state("forms-add-from-library");
  await pick.getByRole("button", { name: "Close" }).first().click();
  await p.getByRole("button", { name: "Change IMM 1295" }).click();
  const drawer = p.getByRole("dialog");
  await drawer.getByPlaceholder("Any age").fill("18");
  await drawer.getByLabel("Signed by").selectOption("person");
  await state("forms-drawer");
  await drawer.getByRole("button", { name: "Save to draft" }).click();
  await drawer.waitFor({ state: "hidden" }); await settle();
  await p.waitForFunction(() => /18\+/.test(document.querySelector('[data-line="IMM 1295"]')?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  const r1295 = await p.locator('[data-line="IMM 1295"]').innerText();
  step("C11.6 pass: minimum age 18 and 'The person the form is about' saved and shown on the row", /18\+/.test(r1295) && /The person the form is about/.test(r1295), r1295.replace(/\s+/g, " "));
  await p.getByRole("button", { name: "Change IMM 1295" }).click();
  await drawer.getByPlaceholder("Any age").fill("");
  await drawer.getByPlaceholder("Any age").type("150");
  step("C11.6 fail: the age field takes two digits at most (150 cannot be typed)", (await drawer.getByPlaceholder("Any age").inputValue()) === "15");
  await drawer.getByRole("button", { name: "Cancel" }).click();
  await p.getByRole("button", { name: "Change IMM 1295" }).click();
  await drawer.getByRole("radio", { name: "Only if" }).check();
  await drawer.getByLabel("In plain words").fill("Has a representative");
  await drawer.getByRole("button", { name: "Save to draft" }).click();
  await drawer.waitFor({ state: "hidden" }); await settle();
  await p.locator('[data-line="IMM 1295"] [data-no-rule]').waitFor({ timeout: 15000 }).catch(() => {});
  step("M1: 'Only if' in words with no rule shows 'No rule yet' on the row and a notice that release waits", await p.locator('[data-line="IMM 1295"] [data-no-rule]').count() === 1 && /in words only/.test(await panel().innerText()));
  await state("forms-no-rule");

  // ======================================================== Preview by person (C4.3)
  await go("preview", "?family=family2&person=principal");
  const nr = p.locator('[data-preview-form="IMM 1295"]');
  step("M1: Preview says 'Cannot tell yet: no rule' for the words-only form", /Cannot tell yet: no rule/.test(await nr.innerText().catch(() => "")));
  step("C4.3: Preview shows the person chips, what the person is asked, documents and forms", await p.locator("[data-person-chip]").count() >= 4 && await p.locator("[data-preview-questions]").count() === 1 && /Documents \(\d+\)/.test(await panel().innerText()));
  await state("preview");
  await p.locator('[data-person-chip="child-1"]').click(); await settle();
  // Under a loaded runner the address and the person's questions arrive after settle(): wait for them (the step still checks both).
  await p.waitForURL(/person=child-1/, { timeout: 15000 }).catch(() => {});
  await panel().getByText(/The questions Child 1 answers/).first().waitFor({ timeout: 15000 }).catch(() => {});
  step("C4.3: choosing a child shows that child's questions and forms (the address keeps the person)", /person=child-1/.test(p.url()) && /The questions Child 1 answers/.test(await panel().innerText()));

  // ======================================================== Who can be in this application (C11.12, M3, M4)
  // Slice C1 (P-161 (2)): the people card sits in Before forms on the Forms tab.
  await go("forms");
  const who = p.locator("[data-who-can-be]");
  // Board v2 (P-147 §3): the card is folded to one line; "Show and edit" opens the built table.
  await who.getByRole("button", { name: "Show and edit" }).click();
  await who.getByRole("button", { name: "Edit" }).click();
  const offered = await who.getByRole("combobox").locator("option").allInnerTexts();
  step("C11.12 M3: '+ Add a person' offers only roles that take part in a case and are not listed yet (Sponsor; never Parent)", offered.includes("Sponsor") && !offered.includes("Parent"), offered.join(", "));
  await who.getByLabel("Person to add").selectOption("sponsor"); // C11.12: each row now has its own Filing select
  await who.getByRole("button", { name: "Add a person" }).click();
  await who.getByRole("button", { name: "Save" }).click(); await settle();
  await who.locator('[data-person="sponsor"]').waitFor({ timeout: 15000 });
  step("C11.12 pass: the Sponsor is saved (never an applicant) and Undo is offered", /never an applicant/.test(await who.locator('[data-person="sponsor"]').innerText()) && await who.getByRole("button", { name: "Undo last change" }).count() === 1);
  await state("who-can-be");
  await who.getByRole("button", { name: "Edit" }).click();
  await who.getByRole("button", { name: "Remove Spouse or partner" }).click();
  await who.getByRole("button", { name: "Save" }).click();
  const ask = p.getByRole("dialog", { name: "Remove a person that forms name?" });
  await ask.waitFor({ timeout: 15000 });
  step("M4: removing the spouse that IMM 5409 names asks first, naming the form", /IMM 5409/.test(await ask.innerText()));
  await state("who-can-be-confirm");
  await ask.getByRole("button", { name: "Keep the person" }).click();
  step("M4: 'Keep the person' puts the spouse back in the edit", await who.locator('[data-person="spouse_or_partner"]').count() === 1);
  await who.getByRole("button", { name: "Cancel" }).click();
  await who.getByRole("button", { name: "Undo last change" }).click(); await settle();
  await p.waitForFunction(() => !document.querySelector('[data-person="sponsor"]'), null, { timeout: 15000 }).catch(() => {});
  step("M4 pass: Undo removes the Sponsor again", await who.locator('[data-person="sponsor"]').count() === 0);
  // Someone else saves while this person edits: the save is refused with who and when, and their version can be reloaded.
  await who.getByRole("button", { name: "Edit" }).click();
  const cur = (await api(`/combinations/${C}/workspace?tab=questionnaires`)).body.people;
  await api(`/combinations/${C}/people`, { method: "PATCH", data: { participants: cur.lines.map((l) => ({ role: l.role, min: l.min, max: l.max, applies: l.applies })).concat([{ role: "sponsor", min: 0, max: 1, applies: false }]), version: cur.version } });
  await who.getByRole("button", { name: "Save" }).click(); await settle();
  const staleText = await who.innerText();
  step("M4 fail: a save over someone else's change is refused, naming who changed it, with 'Reload their version'", /changed who can be in this application/.test(staleText) && await who.getByRole("button", { name: "Reload their version" }).count() === 1, staleText.slice(0, 160));
  await state("who-can-be-stale");
  await who.getByRole("button", { name: "Reload their version" }).click(); await settle();
  await who.locator('[data-person="sponsor"]').waitFor({ timeout: 15000 }).catch(() => {});
  step("M4: reloading shows their version (the Sponsor they added)", await who.locator('[data-person="sponsor"]').count() === 1);

  // ======================================================== Documents without the scaffolding (m5)
  await go("documents");
  await p.locator("[data-documents]").waitFor({ timeout: 15000 }).catch(() => {});
  const docText = await panel().innerText();
  step("m5: Documents has no 'Attach official checklist' and no sample-input buttons", !/Attach official checklist|Sample inputs/.test(docText) && /Add a document/.test(docText));
  await p.getByRole("button", { name: "Add a document" }).click();
  step("m5: the add dialog has no 'Sample inputs (instead of typing)' row", !/Sample inputs/.test(await p.getByRole("dialog").innerText()));
  await p.keyboard.press("Escape");
  await state("documents");

  // ======================================================== read only for the approver
  await as("user-B"); await go("forms");
  step("read only: the approver sees no Change on form lines", await p.getByRole("button", { name: /^Change IMM/ }).count() === 0);
  step("read only: the approver sees no Edit or Undo on who can be in the application", await p.locator("[data-who-can-be]").getByRole("button", { name: /Edit|Undo|Fill from the guide/ }).count() === 0);
  await state("read-only");
  await as("user-A");

  step("no page errors in the walk", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
