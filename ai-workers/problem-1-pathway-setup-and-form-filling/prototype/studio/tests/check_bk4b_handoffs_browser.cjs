// BK-4b (concept BK-4 rev 2 §5, §8, §10; P-484, P-481; measure P-456 (3)): the Studio's hand-off buttons, walked in a real
// browser on the configured checkpoint (C10.1). One person sets the Configuration author once, then changes person ONLY
// by hand-off buttons: author submits → "Hand to the Content reviewer" → the reviewer returns it → "Hand back to the
// Configuration author" → the author submits again → "Hand to the Content reviewer" → the reviewer signs → "Hand to the
// Approver" → the Approver releases → "Open a case on Release N (as Case officer)" → the Open a case dialog with that
// combination chosen, as the Case officer, and the case opened. The walk counts person changes that did not come from a
// hand-off click: 0. Never touches the person picker. Also: BR-2 (no hand-off to yourself: the next person sees none),
// BR-3 pass and fail (the approver and the expert are never the submitter; a library change's proposer is never its
// target; the Release page names the approve duty), BR-7 (a button, not a link). 1440 px walk; the hand-offs also at
// 375 px; axe (WCAG 2.2 AA) on every hand-off. Screenshots: product/screens/BK-4-sign-in-hand-offs/screenshots/4b-*.
// The draft change the walk reviews is made through the API as the author (scaffolding: the Documents tab is not this
// row). No model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_bk4b 4471 start && node studio/tests/check_bk4b_handoffs_browser.cjs 4471
// BK-5 PR 2's gate A walk (concept BK-5 §9): BK5_GATE_A=1 starts from a browser with no person, by screens: /sign-in →
// the Configuration author's card → Demo › Starting points → door 2 "Start here" (RESET when the demo has content) →
// Immigration programs; then the same change → release walk. The sign-in card is the one person change before the
// hand-offs (a listed place, BK-4a BR-1); the walk's count of changes outside the hand-offs stays 0.
//   BK5_GATE_A=1 node studio/tests/check_bk4b_handoffs_browser.cjs 4471
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4471);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "BK-4-sign-in-hand-offs", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 300000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const axe = async (name, sel) => {
    const r = await new AxeBuilder({ page: p }).include(sel).withTags(TAGS).analyze();
    step(`${name}: axe finds no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const shot = (n) => p.screenshot({ path: path.join(SHOTS, `4b-${n}.png`), fullPage: false });
  const who = () => p.evaluate(() => localStorage.getItem("xr-actor"));
  const btn = (name) => p.getByRole("button", { name, exact: true });

  // Setup (as test data): the configured checkpoint, and one draft change on the released Visitor visa that the immigration
  // expert must sign (a document line now provided by staff).
  const GATE_A = process.env.BK5_GATE_A === "1";
  let ID;
  if (GATE_A) {
    // BK-5 PR 2 gate A: sign-in → Starting points → door 2, by screens, from a browser with no person stored.
    await p.goto(`${BASE}/sign-in`); await p.locator("[data-sign-in]").waitFor({ timeout: 30000 });
    step("gate A: the walk starts on the sign-in page with no person stored", await p.evaluate(() => localStorage.getItem("xr-actor")) === null);
    await p.locator('[data-sign-in-as="user-A"]').click(); await p.waitForURL((u) => u.pathname === "/start", { timeout: 15000 });
    step("gate A: the Configuration author's card lands on Starting points (BK-5 PR 2)", await p.evaluate(() => localStorage.getItem("xr-actor")) === "user-A");
    // Review m1: on a copy whose last load was door 2 the door reads "Start again from here" (its Continue link is the
    // filled control); either button reloads it. Review m2: the shot waits for the doors to come on.
    const door2 = p.locator('[data-door="configured"]').locator('[data-start-door="configured"]');
    await p.waitForFunction(() => !document.querySelector('[data-start-door="configured"]')?.disabled, null, { timeout: 30000 });
    await p.screenshot({ path: path.join(SHOTS, "..", "..", "BK-5-start-page", "screenshots", "bk5-pr2-01-start-after-sign-in-1440.png") });
    await door2.click();
    const dlg = p.getByRole("dialog"); await dlg.waitFor({ timeout: 15000 });
    if (await p.getByLabel("Type RESET to confirm").count()) await p.getByLabel("Type RESET to confirm").fill("RESET");
    await dlg.locator("[data-start-go]").click();
    await p.waitForURL((u) => u.pathname === "/", { timeout: 600000 });
    await p.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 30000 });
    await p.getByText("Visitor visa", { exact: false }).first().waitFor({ timeout: 30000 }); // review m2: the cards, not their skeletons
    step("gate A: door 2 loads the configured checkpoint and lands on Immigration programs", new URL(p.url()).pathname === "/" && await p.evaluate(() => localStorage.getItem("xr-actor")) === "user-A", p.url());
    await p.screenshot({ path: path.join(SHOTS, "..", "..", "BK-5-start-page", "screenshots", "bk5-pr2-02-door2-landed-1440.png") });
    const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body?.rows ?? [];
    ID = rows.find((r) => r.combinationId && /Visitor visa/.test(r.label ?? r.name ?? ""))?.combinationId;
    step("setup: the configured checkpoint's Visitor visa is listed", !!ID, rows.map((r) => r.label ?? r.name).slice(0, 8));
  } else {
    await p.goto(`${BASE}/inbox`);
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    const loaded = await api("/demo/load", { method: "POST", data: { sample: "configured" } });
    step("setup: the configured checkpoint loads", loaded.status < 300, loaded.status);
    ID = (loaded.body?.combinations ?? []).find((c) => /Visitor visa/.test(c.label))?.id;
  }
  const req = (await api(`/combinations/${ID}/config?mode=draft`)).body?.snapshot?.document_requirements?.find((r) => r.provided_by === "client");
  const edit = await api(`/combinations/${ID}/requirements/${encodeURIComponent(req?.lineage ?? "")}`, { method: "PATCH", data: { documentTypeKey: req?.document_type_key, attachMode: "COMBINATION_MANDATORY", appliesToRoles: req?.who, providedBy: "staff" } });
  const before = (await api(`/combinations/${ID}/review`)).body;
  const sme = (before?.draft?.changes ?? []).filter((c) => c.needs_sme).length;
  const lastRelease = before?.releases?.[0]?.release;
  step("setup: a released Visitor visa with a draft change the expert signs, and no problem blocking it", !!ID && edit.status < 300 && sme > 0 && !before.draft.problems.some((x) => x.level === "error") && before.submission?.status === "APPROVED", { ID, edit: edit.status, sme, errors: before?.draft?.problems?.filter((x) => x.level === "error").length });

  // The person is set once, at the start (the sign-in step is BK-4a's); from here only hand-off buttons change it.
  if (!GATE_A) await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  const trail = ["user-A"]; let outside = 0;
  /** A click on a hand-off: the person must change to the button's own target, and only through it. */
  const handOff = async (sel, expectTo, name) => {
    const box = p.locator(sel);
    await box.waitFor({ timeout: 30000 });
    const b0 = box.getByRole("button");
    const to = await b0.getAttribute("data-handoff-to");
    const tag = await b0.evaluate((e) => e.tagName);
    const was = await who();
    if (was !== trail[trail.length - 1]) outside++;
    await b0.click();
    await p.waitForFunction((w) => localStorage.getItem("xr-actor") !== w, was, { timeout: 15000 });
    const now = await who(); trail.push(now);
    step(`${name}: the hand-off is a button (BR-7) and moves the work to ${expectTo} (${was} → ${now})`, tag === "BUTTON" && now === expectTo && (to === "" || to === expectTo), { tag, to, now });
  };
  const reviewTab = async () => { await p.goto(`${BASE}/c/${ID}/review`); await btn("Approve and release").waitFor({ timeout: 30000 }); };
  const actingAs = (name) => p.getByText(`You are acting as ${name} (simulated)`, { exact: false }).first().waitFor({ timeout: 15000 });
  const noHandOff = async (name) => { await p.waitForTimeout(400); step(`${name} (BR-2): no hand-off for the person who is next`, await p.locator("[data-handoff]").count() === 0, await p.locator("[data-handoff]").allInnerTexts()); };

  // Release page, before the walk. QA-421 (P-498): the author's own change is not submitted yet, so the author's next step
  // is that Submit, not a hand-off (check_qa421_release_submit_first_browser.cjs walks it). BR-3: a person with no author
  // duty (the Content reviewer) is told the approve duty releases, by name, with one button. The person is set back to the
  // author before the walk's first hand-off, so the walk's count of changes outside a hand-off is unchanged.
  await p.goto(`${BASE}/release`);
  await p.locator('[data-next-step="submit"]').waitFor({ timeout: 30000 });
  step("Release page (QA-421): the author with an unsubmitted change sees Submit first and no hand-off", await p.locator("[data-handoff]").count() === 0, await p.locator("[data-handoff]").allInnerTexts());
  await p.evaluate(() => localStorage.setItem("xr-actor", "user-C"));
  await p.goto(`${BASE}/release`);
  const rel = p.locator('[data-handoff="approver"]');
  await rel.waitFor({ timeout: 30000 });
  step("Release page (BR-3): the hand-off names the Approver, the approve duty", /Next: the Approver releases/.test(await rel.innerText()) && await rel.getByRole("button").getAttribute("data-handoff-to") === "user-B", await rel.innerText());
  step("Release page: no \"Switch to\" words left", !/switch to/i.test(await p.locator("main").innerText()));
  await axe("Release page hand-off", '[data-handoff="approver"]');
  await shot("release-page-1440");
  await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));

  // 1. The author submits; the Content reviewer is next (expert changes).
  await reviewTab(); await actingAs("Configuration author");
  await noHandOff("1. author before submitting");
  await btn("Submit for review").click();
  const toReviewer = p.locator('[data-handoff="content-reviewer"]');
  await toReviewer.waitFor({ timeout: 30000 });
  const t1 = await toReviewer.innerText();
  step("1. after Submit: \"Submitted · Next: the Content reviewer signs the immigration content.\"", /Submitted/.test(t1) && /Next: the Content reviewer signs the immigration content\./.test(t1) && /Hand to the Content reviewer →/.test(t1), t1);
  step("1. BR-3: the expert's target holds the expert duty and is not the submitter", await toReviewer.getByRole("button").getAttribute("data-handoff-to") === "user-C");
  await axe("1. hand-off to the Content reviewer", '[data-handoff="content-reviewer"]');
  await shot("1-submitted-hand-to-content-reviewer-1440");
  await handOff('[data-handoff="content-reviewer"]', "user-C", "1. Hand to the Content reviewer");
  await actingAs("Content reviewer");
  step("1. BR-4: the Content reviewer works on the same page", new URL(p.url()).pathname === `/c/${ID}/review`, p.url());
  await noHandOff("1. Content reviewer");

  // 2. The reviewer returns it with a note; the author is next.
  await p.getByLabel(/Note \(optional for submit and sign; required to return\)/).fill("Please say which officer provides it (BK-4b walk).");
  await btn("Return to author").click();
  const toAuthor = p.locator('[data-handoff="author"]');
  await toAuthor.waitFor({ timeout: 30000 });
  const t2 = await toAuthor.innerText();
  step("2. after Return: \"Returned to the author · Next: the Configuration author corrects it and submits it again.\" with \"Hand back to the Configuration author →\"", /Returned to the author/.test(t2) && /Hand back to the Configuration author →/.test(t2), t2);
  await axe("2. hand-back to the author", '[data-handoff="author"]');
  await shot("2-returned-hand-back-to-author-1440");
  await handOff('[data-handoff="author"]', "user-A", "2. Hand back to the Configuration author");
  await actingAs("Configuration author");
  await noHandOff("2. author after the return");

  // 3. The author submits again; hand to the reviewer, who signs; the Approver is next.
  await btn("Submit for review").click();
  await handOff('[data-handoff="content-reviewer"]', "user-C", "3. Hand to the Content reviewer again");
  await actingAs("Content reviewer");
  await btn("Select all I can sign").click();
  await p.getByRole("button", { name: /^Sign \d+/ }).click();
  const toApprover = p.locator('[data-handoff="approver"]');
  await toApprover.waitFor({ timeout: 30000 });
  const t3 = await toApprover.innerText();
  step("3. after the expert signs: \"Signed by the immigration expert · Next: the Approver releases it.\"", /Signed by the immigration expert/.test(t3) && /Next: the Approver releases it\./.test(t3) && /Hand to the Approver →/.test(t3), t3);
  step("3. BR-3: the approver is never the submitter (approve duty, not user-A)", await toApprover.getByRole("button").getAttribute("data-handoff-to") === "user-B");
  await axe("3. hand-off to the Approver", '[data-handoff="approver"]');
  await shot("3-signed-hand-to-approver-1440");
  await handOff('[data-handoff="approver"]', "user-B", "3. Hand to the Approver");
  await actingAs("Approver");
  await noHandOff("3. Approver before releasing");

  // 4. The Approver releases; the firm opens a case on it.
  await btn("Approve and release").click();
  const openCase = p.locator("[data-handoff-open-case]");
  await openCase.waitFor({ timeout: 60000 });
  const after = (await api(`/combinations/${ID}/review`)).body;
  const N = after?.releases?.[0]?.release;
  const t4 = await openCase.innerText();
  step(`4. after release: "Released in Release ${N} · Next: the firm opens a case on it." with "Open a case on Release ${N} (as Case officer) →"`, N > lastRelease && t4.includes(`Released in Release ${N}`) && t4.includes(`Open a case on Release ${N} (as Case officer) →`), { N, lastRelease, t4 });
  step("4. the header's own \"Open a case\" stays (combination.tsx), beside the echo", await p.locator("[data-open-case]").count() === 1);
  await axe("4. open-a-case hand-off", "[data-handoff-open-case]");
  await shot("4-released-open-a-case-1440");
  await handOff("[data-handoff-open-case]", "user-O", "4. Open a case on the release");
  await p.waitForURL((u) => u.pathname === "/cases" && u.searchParams.get("open") === ID, { timeout: 15000 });
  const dlg = p.getByRole("dialog", { name: "Open a case" });
  await dlg.waitFor({ timeout: 15000 });
  const sel = dlg.getByLabel("Combination (released)");
  step("4. BR-4: lands on the Open a case dialog with the Visitor visa chosen, as the Case officer", await sel.inputValue() === ID && await who() === "user-O", await sel.inputValue());
  await shot("4-open-a-case-dialog-1440");
  await dlg.getByLabel("Case reference").fill("BK4B-WALK");
  await dlg.getByLabel("Principal applicant's name").fill("Sample Applicant");
  await dlg.getByRole("button", { name: "Open case" }).click();
  await p.waitForURL((u) => /^\/cases\/[0-9a-f-]{36}$/.test(u.pathname), { timeout: 30000 });
  const caseId = new URL(p.url()).pathname.split("/")[2];
  const made = (await api(`/runtime/cases/${caseId}/questionnaire?mode=agent`, { actor: "user-O" })).body?.case;
  step(`4. the case is opened on Release ${N} of the Visitor visa`, made?.reference === "BK4B-WALK" && made?.combination_id === ID, made);
  step("WALK (P-456 (3)): author → reviewer → author → reviewer → approver → case officer, every change by a hand-off; 0 changes outside", outside === 0 && trail.join(" → ") === "user-A → user-C → user-A → user-C → user-B → user-O", { outside, trail });
  step("WALK: the person picker was never used (the test never touches it)", true);

  // BR-3 fail side on To review: a library change waiting for a second person is never handed to its proposer.
  const named = await api(`/combinations/${ID}/requirements`, { method: "POST", data: { newTypeName: "Officer's travel letter (Sample, BK-4b)", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" } });
  if (named.status === 202) await api("/review/proposals/decide", { method: "POST", actor: "user-B", data: { ids: [named.body.proposalId], action: "accept" } });
  const waiting = ((await api("/library/changes?status=WAITING")).body ?? []).find((c) => /travel letter/i.test(c.label ?? ""));
  step("setup: a library change waits for a second person", !!waiting?.proposed_by_id, { named: named.status, waiting: waiting?.label });
  if (waiting) {
    await p.evaluate((a) => localStorage.setItem("xr-actor", a), waiting.proposed_by_id);
    await p.goto(`${BASE}/review/change/${waiting.id}`);
    const d = p.locator('[data-handoff="decide"]');
    await d.waitFor({ timeout: 30000 });
    const to = await d.getByRole("button").getAttribute("data-handoff-to");
    const session = (await api("/session", { actor: waiting.proposed_by_id })).body;
    const target = session?.actors?.find((a) => a.id === to);
    step(`BR-3: the proposer (${waiting.proposed_by_id}) is handed to someone else with the review duty (${to})`, !!to && to !== waiting.proposed_by_id && target?.duties?.includes("review"), { to, proposer: waiting.proposed_by_id });
    step("BR-3: no \"Switch to\" words on the item", !/switch to/i.test(await p.locator("main").innerText()));
    await axe("To review item hand-off", '[data-handoff="decide"]');
    await shot("library-change-proposer-1440");
    // 375 px: the hand-off fits, its button at least 24 px high.
    await p.setViewportSize({ width: 375, height: 812 }); await p.waitForTimeout(300);
    const box = await d.getByRole("button").boundingBox();
    step("375 px: the hand-off's button fits the screen and is at least 24 px high", !!box && box.x >= 0 && box.x + box.width <= 376 && box.height >= 24, box);
    const hscroll = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    step("375 px: no sideways scroll", !hscroll);
    await axe("375 px To review item hand-off", '[data-handoff="decide"]');
    await shot("library-change-proposer-375");
    await d.getByRole("button").click();
    await p.waitForFunction((w) => localStorage.getItem("xr-actor") !== w, waiting.proposed_by_id, { timeout: 15000 });
    await p.getByRole("button", { name: "Approve", exact: true }).waitFor({ timeout: 15000 });
    step("BR-2: after the hand-off the person who decides sees Approve and no hand-off", await p.locator('[data-handoff="decide"]').count() === 0);
    await p.setViewportSize({ width: 1440, height: 900 });
  }
  // BR-2 fail on the Release page (review M1): with everything released and only an unsubmitted change left, nothing
  // would be released, so the page hands nothing to the Approver; the next step is the author's own submit.
  const shared = (await api("/draft", { actor: "user-B" })).body;
  const all = await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: shared?.changes } });
  const again = await api(`/combinations/${ID}/requirements/${encodeURIComponent(req?.lineage ?? "")}`, { method: "PATCH", data: { documentTypeKey: req?.document_type_key, attachMode: "COMBINATION_MANDATORY", appliesToRoles: req?.who, providedBy: "client" } });
  step("setup: everything releasable is released, then the author changes the Visitor visa again (not submitted)", all.status < 300 && again.status < 300, { all: all.status, again: again.status, detail: all.body?.detail });
  for (const [actor, name] of [["user-A", "author"], ["user-C", "Content reviewer"]]) {
    await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor);
    await p.goto(`${BASE}/release`);
    await btn("Nothing ready to release").waitFor({ timeout: 30000 });
    step(`Release page, nothing ready (${name}) (BR-2 fail): no hand-off to the Approver`, await p.locator("[data-handoff]").count() === 0, await p.locator("[data-handoff]").allInnerTexts());
    step(`Release page, nothing ready (${name}) (QA-421): ${actor === "user-A" ? "the author's next step is Submit" : "no Submit (no author duty)"}`, await p.locator('[data-next-step="submit"]').count() === (actor === "user-A" ? 1 : 0));
  }
  await shot("release-page-nothing-ready-1440");
  step("no page error during the walk", errs.length === 0, errs);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
