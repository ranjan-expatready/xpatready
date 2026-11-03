// QA-184 (C11.10, C5.4; P-273, EXPERIENCE "one clear state"): a Live combination reads as one state everywhere, Live
// first, then what its next release still needs in one count of the same five steps. On Demo › Reset to the six ›
// Start With an LMIA, then one form removed in the draft (so the next release has problems on several steps, as in qa's
// evidence qa/reports/2026-11-03-explore/x-live-*), the header, the Overview strip, the Programs card and list, the tab
// counts and GET /catalogue's progress must agree. Before: Overview "Live · setup steps for the next release: 0 of 5
// done" beside a card that read "✓ Live" with nothing more, /catalogue "Step 2 of 4: Draft" (four steps beside five),
// and the Review and release tab "17 to fix" while its own step on Overview listed no problem. A browser at 1440 px plus
// the API underneath; no model call (US$0).
//   zsh studio/tools/isolated.sh screens_qa184 4621 start && node studio/tests/check_qa184_live_state_browser.cjs 4621 xr_studio_screens_qa184
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4621);
const BASE = `http://localhost:${PORT}`;
const results = [];
const step = (name, cond, detail) => { results.push({ name, ok: !!cond }); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const KEYS = ["pages", "people", "forms", "questions_documents", "release"];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 120000 }); let body = null; try { body = await r.json(); } catch { /* not JSON */ } return { status: r.status(), body }; };
  try {
    if ((await api("/demo/reset-to-six", { method: "POST", data: { confirm: "RESET" } })).status >= 300) throw new Error("Reset to the six did not load");
    const started = await api("/demo/release-with-sources", { method: "POST", data: {} });
    const lm = started.body?.combinationId;
    if (!lm) throw new Error(`Start With an LMIA did not answer: ${started.status}`);
    // A change for the next release: IMM 1295 removed in the draft (17 problems on Documents and questions, as qa saw).
    const del = await api(`/combinations/${lm}/forms/${encodeURIComponent("IMM 1295")}`, { method: "DELETE", data: {} });
    const sum = (await api(`/combinations/${lm}/summary`)).body;
    const setup = sum?.setup;
    step("setup: With an LMIA is Live at Release 1 with draft changes and open steps for the next release", del.status < 300 && setup?.chip?.status === "LIVE" && setup.chip.release === 1 && sum.changes > 0 && setup.bar.done < 5, { del: del.status, chip: setup?.chip, changes: sum?.changes, done: setup?.bar?.done });
    const open = 5 - setup.bar.done, words = `Next release: ${open} of 5 step${open === 1 ? "" : "s"} to do`;
    const items = setup.steps.flatMap((s) => s.open);
    const fixOnRelease = (setup.steps.find((s) => s.key === "release")?.open ?? []).filter((i) => i.kind === "fix_problems").reduce((t, i) => t + i.count, 0);

    // ── the API: one count of the same five steps
    step("pass: the checklist says Live first, then the next release's one count (bar.next)", setup.bar.text === "✓ Live" && setup.bar.next === words, setup.bar);
    const row = (await api("/catalogue")).body?.rows?.find((r) => r.combinationId === lm);
    step("pass: GET /catalogue's progress has the same five steps and the card's words (never 'Step n of 4')", row?.progress?.of === 5 && row.progress.live === true && row.progress.label === `✓ Live · ${words}` && !/of 4/.test(row.progress.label), row?.progress);
    step("pass: /catalogue's progress is at the step its next item is on, with the same steps done as the checklist", row?.progress?.step === KEYS.indexOf(setup.next.step) + 1 && row.progress.done.join() === setup.steps.map((s) => s.state === "done").join(), { progress: row?.progress, next: setup.next?.step });

    // ── the combination page: header, strip and tabs
    await p.goto(`${BASE}/`); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await p.goto(`${BASE}/c/${lm}/overview`); await p.locator("[data-strip-head]").waitFor({ timeout: 20000 });
    const head = (await p.locator("[data-strip-head]").innerText()).trim();
    const facts = (await p.locator("h1 ~ p, h1 + p, h1").evaluateAll((xs) => xs.map((x) => x.textContent))).join(" ");
    step("pass: the header says Live and In Release 1", /Live/.test(await p.locator("h1").locator("xpath=..").innerText()) && /In Release 1/.test(await p.locator("main").innerText()), facts.slice(0, 120));
    step("pass: the Overview strip says Live first, then the next release's line in the card's words", head === `Live · Release 1 · ${words}`, head);
    step("fail case: the strip never reads '0 of 5 done' or 'n of 5 done' on a Live combination", !/of 5 done/.test(head), head);
    const tabs = await p.locator("[role=tab]").allTextContents();
    const tab = (k) => tabs.find((t) => t.startsWith(k)) ?? "";
    const n = (t, w) => Number((t.match(new RegExp(`(\\d+) ${w}`)) ?? [0, 0])[1]);
    const reviewTab = tab("Review and release");
    step("pass: the Review and release tab counts only the problems its own step lists (the Overview's Review and release row)", n(reviewTab, "to fix") === fixOnRelease && (fixOnRelease ? true : reviewTab.trim() === "Review and release"), { reviewTab, fixOnRelease });
    const tabSum = ["Forms", "Smart questionnaire", "Documents", "Review and release"].reduce((t, k) => t + n(tab(k), "to do") + n(tab(k), "to fix"), 0);
    const itemSum = items.filter((i) => i.kind !== "view_ai" && !["submit", "sign", "release"].includes(i.kind)).reduce((t, i) => t + i.count, 0);
    step("pass: the tab counts add up to the open items the Overview lists, each counted once", tabSum === itemSum, { tabs, tabSum, itemSum });
    // The Overview's links say the same numbers (Review 95 proposals, Fix 3 problems, Fix 14 problems).
    const links = (await p.locator("[data-setup-strip] a").allTextContents()).join(" · ");
    step("pass: each problem count on the Overview is a step's own (Fix 3 problems · Fix 14 problems) and the tabs carry the same numbers", items.filter((i) => i.kind === "fix_problems").every((i) => links.includes(i.text)) && n(tab("Documents"), "to do") >= 3, links.slice(0, 200));

    // ── Immigration programs: the card and the list
    await p.goto(`${BASE}/?f=all`); await p.locator("article[data-node]").first().waitFor({ timeout: 20000 });
    const card = p.locator(`article[data-state="LIVE"]`).first();
    const cardText = (await card.innerText()).replace(/\s+/g, " ");
    step("pass: the Live card says ✓ Live first, then the same next release line", /✓ Live/.test(cardText) && cardText.includes(words) && cardText.indexOf("✓ Live") < cardText.indexOf(words), cardText.slice(0, 200));
    step("pass: the Live card's name for screen readers says the same", (await card.getAttribute("aria-label")).includes(`✓ Live · ${words}`), await card.getAttribute("aria-label"));
    const notLive = p.locator(`article[data-state="IN_PROGRESS"]`).first();
    const nlText = (await notLive.innerText()).replace(/\s+/g, " ");
    step("fail case: a combination that is not Live says 'n of 5 steps' and never 'Next release'", /\d of 5 steps/.test(nlText) && !/Next release/.test(nlText), nlText.slice(0, 160));
    await p.getByRole("button", { name: "List" }).click();
    const lrow = p.locator(`[role="row"][data-state="LIVE"]`).first(); await lrow.waitFor({ timeout: 10000 });
    const lText = (await lrow.innerText()).replace(/\s+/g, " ");
    step("pass: the List row says Live, then the same count for the next release", /Live · next release \d+ to do/.test(lText) && lText.includes(`next release ${open} to do`), lText.slice(0, 200));
    await p.getByRole("button", { name: "Cards" }).click();
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    step("pass: no sideways scroll at 1440 px", sw <= 1440, sw);
  } catch (e) { step("the check itself stopped", false, e.message); }
  await b.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} passed`);
  process.exit(f ? 1 : 0);
})();
