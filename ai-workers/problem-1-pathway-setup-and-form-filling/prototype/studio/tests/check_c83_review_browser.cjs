// C8.3 Representative review by screens (B144; concept screens/B144/concept.md r2 §4, §5, §6 item 16; P-412): a person's
// walk at 1440 px. The case officer sees "Send for review" and each filing's review on Ready to file, and reads the
// Review page without buttons; the representative of record opens round 2 (the changed form, before → after, who typed
// it), ticks the checklist and reaches Approve by keyboard, is asked the one confirmation for unticked items, cannot send
// back without a reason, meets "Changed while you were reading" when a fact changes meanwhile, reloads and approves;
// then, on round 1, sees only the form a later change withdrew and re-approves it in one click (P-412 F1). Empty and
// loading states, a tooltip, 1024 px, axe (WCAG 2.2 AA). Screenshots go to the folder given (deviceScaleFactor 2).
// The data comes from tests/runtime/setup_c83_walk.ts (the product's own routes). No model call (US$0).
//   zsh studio/tools/isolated.sh b144w 4442 start && node studio/tests/check_c83_review_browser.cjs 4442 xr_studio_b144w [screenshot-dir]
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;

const STUDIO = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] ?? 4442), DB = process.argv[3] ?? "xr_studio_b144w", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[4] ?? null;
const PSQL = process.env.PSQL || (fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql");
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const T = { timeout: 20000 };
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail).slice(0, 500)}`}`); } };
const call = async (method, p, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${p}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const tsx = (f) => spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, f), String(PORT), DB], { encoding: "utf8", timeout: 900000, maxBuffer: 1 << 26 });

(async () => {
  if (sql("select count(*) from combination where combination_key='vv.single'") === "0") {
    const done = ["tests/runtime/setup_visitor_visa.ts", "acceptance/lib/setup_vv_m3.ts"].map((f) => `${f}: exit ${tsx(f).status}`);
    ok("setup: a fresh copy gets the released Visitor visa combination", sql("select count(*) from combination where combination_key='vv.single'") !== "0", done);
  }
  const s = tsx("tests/runtime/setup_c83_walk.ts");
  const d = JSON.parse(String(s.stdout).trim().split("\n").pop() || "{}");
  ok("setup: a case with round 1 (one filing approved, one sent back) and round 2 sent, through the product's routes", !!d.caseId && !!d.r1 && !!d.r2, { exit: s.status, err: String(s.stderr).slice(-400) });
  const shotsDir = SHOTS ? path.resolve(SHOTS) : null;
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: shotsDir ? 2 : 1, reducedMotion: "reduce" });
  let actor = d.officer;
  await ctx.addInitScript((a) => { if (!localStorage.getItem("xr-actor")) localStorage.setItem("xr-actor", a); }, actor);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const as = async (who) => { actor = who; await p.evaluate((a) => localStorage.setItem("xr-actor", a), who); };
  const shot = async (n, full = false) => { if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); await p.screenshot({ path: path.join(shotsDir, `${n}.png`), fullPage: full }); } };
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok(`axe (WCAG 2.2 AA): ${name}`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)); };
  try {
    // 1 The officer: Ready to file with "Send for review" and each filing's review
    await p.goto(`${BASE}/cases/${d.caseId}`);
    const panel = p.locator("section[data-readiness]");
    await panel.locator("[data-send-for-review]").waitFor(T);
    await panel.evaluate((el) => el.scrollIntoView({ block: "start" }));
    ok("C8.3 walk 1 pass (P-412 F1): Ready to file shows \"Send for review\" and, per filing, its review status with \"Open the review\" (the approval a later change withdrew reads \"Approval withdrawn\")", (await panel.locator("[data-review-link=sent]").count()) === 1 && (await panel.locator("[data-review-link=approved]").count()) === 1 && /Approval withdrawn/.test(await panel.locator("[data-review-link=approved]").innerText()) && (await panel.getByRole("link", { name: "Open the review" }).count()) === 2);
    await shot("01-officer-ready-to-file");
    await panel.locator("[data-send-for-review]").click();
    const dlg = p.getByRole("dialog");
    await dlg.locator("[data-send-dialog]").waitFor(T);
    const dtext = await dlg.innerText();
    // The spouse's validated copy is out of date since the fact changed (a block), so it is not ticked by default (BR-1).
    ok("C8.3 walk 2 pass (BR-1): the dialog lists the filings: one already in an open round (not tickable, says why), one with an open block not ticked by default, its warnings counted; the one button names the count",
      /Send for review: the representative of record checks each form and approves it or sends it back\./.test(dtext) && /Already sent for review: open that review\./.test(dtext) && /Blocked: 1 block · \d+ open warnings/.test(dtext) && /Send 0 filings for review/.test(dtext) && await dlg.locator("[data-confirm-send]").isDisabled(), dtext);
    await shot("02-send-for-review-dialog");
    await p.keyboard.press("Escape");

    // 2 The officer reads round 2: no buttons, in the concept's words (F2)
    await p.goto(`${BASE}/cases/${d.caseId}/representative-review/${d.r2}`);
    await p.locator("[data-review-page]").waitFor(T);
    ok("C8.3 walk 3 pass (F2, §4 read-only): the case officer reads the review: \"Only the representative of record approves or sends back. You can read this review.\", no Approve or Send back",
      await p.locator("[data-read-only]").innerText() === "Only the representative of record approves or sends back. You can read this review." && (await p.locator("[data-approve], [data-send-back]").count()) === 0);
    await shot("03-officer-read-only");
    ok("C8.3 walk 3b pass (m1): the officer's look opened nothing (still Sent)", sql(`select status from review_round_filing where round_id='${d.r2}'`) === "sent");

    // 3 The representative opens round 2: the changed form, before → after, who typed it
    await as(d.rep);
    await p.reload();
    await p.locator("[data-review-footer]").waitFor(T);
    const changed = p.locator("[data-review-form][data-state=changed_since_review]");
    ok("C8.3 walk 4 pass (BR-3, BR-6): opening by the representative moves the filing to Under review; only the changed form reads \"Changed since review\"; the detail shows before → after and who typed it",
      sql(`select status || '|' || opened_by from review_round_filing where round_id='${d.r2}'`) === `under_review|${d.rep}` && (await changed.count()) === 1 && /VILLE/.test(await p.locator("[data-changes]").innerText()) && /Case officer/.test(await p.locator("[data-changes]").innerText()));
    await shot("04-round-2-changed-since-review");
    await p.setViewportSize({ width: 1024, height: 800 });
    await shot("04b-round-2-at-1024");
    await axe("round 2, the representative (1024 px)");
    await p.setViewportSize({ width: 1440, height: 900 });

    // 4 Keyboard: tick a checklist item, reach Approve, the one confirmation for unticked items
    const first = p.locator("[data-checklist] input[type=checkbox]").first();
    await first.focus();
    await p.keyboard.press("Space");
    await p.waitForFunction(() => document.querySelector("[data-checklist] input[type=checkbox]")?.checked === true, null, T);
    await p.locator("[data-approve]").focus();
    await p.keyboard.press("Enter");
    const ad = p.locator("[data-approve-dialog]");
    await ad.waitFor(T);
    ok("C8.3 walk 5 pass (BR-4, keyboard): a checklist item ticked by keyboard (Space), Approve reached and pressed by keyboard; the dialog asks the one confirmation in the concept's words",
      sql(`select count(*) from review_check c join review_round_filing f on f.id=c.round_filing_id where f.round_id='${d.r2}' and c.ticked_by is not null`) === "1" && /checklist items are not ticked\. Approve anyway\? This is recorded\./.test(await ad.innerText()));
    await shot("05-approve-confirmation");
    await axe("the approve dialog");
    await p.keyboard.press("Escape");

    // 5 Send back without a reason: the field says so
    await p.locator("[data-send-back]").click();
    const sb = p.locator("[data-send-back-dialog]");
    await sb.waitFor(T);
    await p.locator("[data-confirm-send-back]").click();
    await sb.getByText(/Say what should change, and on which form/).waitFor(T);
    ok("C8.3 walk 6 fail (BR-5): Send back with no reason is refused on the field, in words; nothing is recorded", sql(`select status from review_round_filing where round_id='${d.r2}'`) === "under_review" && (await sb.getByPlaceholder("What should change, and on which form?").count()) === 1);
    await shot("06-send-back-needs-a-reason");
    await p.getByRole("button", { name: "Cancel" }).click();

    // 6 A fact changes while the representative reads: 409, nothing stamped; Reload; then approve
    if (d.spare) await call("PUT", `/runtime/cases/${d.caseId}/answers/${d.spare.subject}/${d.spare.fact}`, { value: d.spare.value, expectedId: ((await call("GET", `/runtime/cases/${d.caseId}/questionnaire?mode=agent`)).body?.sections ?? []).flatMap((x) => x.questions).find((q) => q.subjectId === d.spare.subject && q.fact === d.spare.fact)?.answer?.id ?? null }, d.officer);
    await p.locator("[data-approve]").click();
    await p.locator("[data-confirm-approve]").click();
    await p.locator("[data-conflict]").waitFor(T);
    ok("C8.3 walk 7 fail (BR-4, M4, §4 conflict): a fact changed meanwhile → \"Changed while you were reading: reload. Nothing was stamped.\"; nothing stamped",
      !!d.spare && /Changed while you were reading: reload\. Nothing was stamped\./.test(await p.locator("[data-conflict]").innerText()) && sql(`select count(*) from review_round_form where round_id='${d.r2}' and stamped_at is not null`) === "0");
    await shot("07-conflict-reload");
    await p.locator("[data-conflict]").getByRole("button", { name: "Reload" }).click();
    await p.locator("[data-conflict]").waitFor({ state: "detached", ...T });
    await p.locator("[data-approve]").click();
    await p.locator("[data-confirm-approve]").click();
    await p.locator("[data-review-filing][data-status=approved]").waitFor(T);
    ok("C8.3 walk 8 pass (BR-4): after Reload the representative approves; the filing reads Approved and every form is stamped",
      sql(`select status from review_round_filing where round_id='${d.r2}'`) === "approved" && sql(`select count(*) from review_round_form where round_id='${d.r2}' and file_kind<>'waits' and stamped_at is null`) === "0");
    await shot("08-round-2-approved");

    // 7 Round 1: the spouse's filing, its one withdrawn form, the one-click re-approve (P-412)
    await p.goto(`${BASE}/cases/${d.caseId}/representative-review/${d.r1}`);
    await p.locator(`[data-review-filing="${d.fS}"]`).waitFor(T);
    await p.locator(`#rf-${d.fS}`).click();
    await p.locator("[data-change-only]").waitFor(T);
    const withdrawn = p.locator(`[data-review-filing="${d.fS}"] [data-review-form][data-state=approval_withdrawn]`);
    ok("C8.3 walk 9 pass (P-412 F1, §5): only the form a later change touched reads \"Approval withdrawn: … changed by …\"; the footer offers \"Re-approve 1 changed form\"",
      (await withdrawn.count()) === 1 && /^Approval withdrawn: .+ changed by Case officer/.test(await p.locator("[data-withdrawn]").innerText()) && /Re-approve 1 changed form/.test(await p.locator("[data-reapprove]").innerText())
        && (await p.locator(`[data-review-filing="${d.fS}"] [data-review-form][data-state=approved]`).count()) >= 1);
    await shot("09-approval-withdrawn-change-only");
    // Keyboard first: Tab from the form's own button lands on its chip (a real key press, as a person moves).
    await withdrawn.getByRole("button").focus();
    await p.keyboard.press("Tab");
    await p.getByRole("tooltip").waitFor(T);
    ok("C8.3 walk 10 pass (m5, BIC-14): the chip's tooltip opens on keyboard focus and says how it differs from \"Changed since review\"", /Approved earlier; a fact on it changed since, so the representative checks it again\./.test(await p.getByRole("tooltip").innerText()));
    await shot("10-withdrawn-tooltip");
    await p.locator("[data-reapprove]").click();
    await p.waitForURL((u) => !u.pathname.endsWith(d.r1), T);
    await p.locator("[data-review-filing][data-status=approved]").waitFor(T);
    ok("C8.3 walk 11 pass (P-412): one click re-approves the changed form: a new round, approved, and C7.6's review line is closed again",
      sql(`select kind from review_round where case_id='${d.caseId}' order by number desc limit 1`) === "reapprove" && !((await call("GET", `/runtime/cases/${d.caseId}/prepare`)).body?.readiness ?? []).find((x) => x.filing === d.fS)?.warns.some((w) => w.code === "representative_review"));
    await shot("11-reapproved");
    await axe("the re-approved round");

    // 8 Empty and loading states
    const e = await call("POST", "/runtime/cases", { combinationId: sql("select id from combination where combination_key='vv.single'"), reference: `WALK-C83-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Client E" }, representative: d.rep, caseOfficers: [d.officer] }, d.officer);
    await p.goto(`${BASE}/cases/${e.body?.id}/representative-review`);
    await p.locator("[data-review-empty]").waitFor(T);
    ok("C8.3 walk 12 pass (§4 empty): with nothing sent, the page teaches \"Send for review\"", /Nothing is sent for review yet/.test(await p.locator("[data-review-empty]").innerText()) && /Send for review/.test(await p.locator("[data-review-empty]").innerText()));
    await shot("12-empty");
    await p.route("**/api/runtime/reviews/*", async (r) => { await new Promise((x) => setTimeout(x, 2500)); await r.continue(); });
    await p.goto(`${BASE}/cases/${d.caseId}/representative-review/${d.r1}`);
    await p.locator("[data-review-loading]").waitFor(T);
    ok("C8.3 walk 13 pass (§4 loading): a skeleton while the review loads, never \"nothing\" before the data", (await p.locator("[data-review-loading]").count()) === 1);
    await shot("13-loading");
    await p.unroute("**/api/runtime/reviews/*");
  } catch (x) {
    ok(`the walk ran to its end (stopped: ${x.message.split("\n")[0]})`, false, { errors, at: x.stack?.split("\n").find((l) => l.includes("check_c83")) });
    await shot("zz-stopped");
  } finally {
    await browser.close();
    ok("the page threw no script error", errors.length === 0, errors);
    console.log(`\n${pass}/${pass + fail} passed`);
    process.exit(fail ? 1 : 0);
  }
})();
