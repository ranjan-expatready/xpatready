// qa (12 Nov, C6.12 re-score after BK-9; main 348fa8b11): QA-412. On the configured checkpoint, the case officer opens a
// Spouse or common-law partner case and adds the sponsor, by screens only. The sponsor's co-filed sponsorship has no
// applicants (the sponsor is not an applicant), so three places that name a filing by its first applicant fall back to a
// placeholder: Record the submission's line "Opens once every filing is Ready to file: …, A person (Not started)"
// (web/src/runtime/submission.tsx:30 whoOf; the same name is the legend of the sponsor's application-number box, line 239,
// and of its fee-receipt upload), and Prepare application's "Add a form to this's filing" (web/src/runtime/forms.tsx:66).
// Expected: the sponsor's name (the filing's owner) in each. QA-413, on the same case: at 400 px the page scrolls sideways
// (People and filings' table, whose sponsor row carries the pill "Sent with the principal's application", widens the page
// past its overflow-x-auto box; a Visitor visa case does not). Fails today; passes when fixed. US$0, live AI off.
//   zsh tools/isolated.sh qa_412 4475 start && curl -sX POST -H 'content-type: application/json' -H 'x-actor: user-A' \
//     -d '{"confirm":"RESET"}' localhost:4475/api/demo/reset && curl -sX POST -H 'content-type: application/json' \
//     -H 'x-actor: user-A' -d '{"sample":"configured"}' localhost:4475/api/demo/load && node tests/qa/check_qa412_cofiled_sponsor_name.cjs 4475
const fs = require("fs"); const { chromium } = require("playwright");
const port = process.argv[2]; if (!port || port === "4400") { console.log("usage: <port of an isolated copy>, never 4400"); process.exit(2); }
const base = `http://localhost:${port}`;
let failed = 0; const ok = (n, c, d) => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d !== undefined ? `: ${JSON.stringify(d).slice(0, 400)}` : ""}`); };
(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.statSync("/opt/pw-browsers/chromium", { throwIfNoEntry: false })?.isFile() ? { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] } : {}) });
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.setDefaultTimeout(30000);
    await p.goto(base + "/cases"); await p.waitForLoadState("networkidle");
    await p.getByRole("button", { name: /^Open a case$/ }).first().click();
    const dlg = p.getByRole("dialog"); await dlg.waitFor(); await p.waitForTimeout(1500);
    const sel = dlg.getByLabel("Combination (released)"); const spouse = (await sel.locator("option").allInnerTexts()).find((o) => /Spouse or common-law partner/.test(o));
    ok("QA-412 setup: Spouse or common-law partner is released on this copy (the configured checkpoint)", !!spouse);
    if (!spouse) return;
    await sel.selectOption({ label: spouse });
    await dlg.getByLabel("Your own reference (optional)").fill(`QA-412-${Date.now().toString(36)}`); await dlg.getByLabel("Principal applicant's name").fill("Sample Principal S");
    await dlg.getByRole("button", { name: /^Open case$/ }).click(); await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/); await p.waitForLoadState("networkidle");
    await p.getByRole("button", { name: /^Add sponsor$/ }).click();
    const add = p.getByRole("dialog"); await add.waitFor(); await add.getByLabel(/^Name/).fill("Sample Sponsor S"); await add.getByRole("button", { name: /^Add$/ }).click();
    await p.waitForTimeout(1500); await p.reload(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
    const page = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    ok("QA-412 setup: People and filings reads 2 filings, the sponsor's sent with the principal's application", /2 filings/.test(page) && /Sample Sponsor S Sponsor Sent with the principal's application/.test(page), page.match(/People and filings.{0,200}/)?.[0]);
    const opens = page.match(/Opens once every filing is Ready to file: [^.]*\./)?.[0] ?? "no line";
    ok("QA-412a Record the submission names the sponsor's filing by the sponsor's name, never \"A person\"", /Sample Sponsor S \(Not started\)/.test(opens) && !/A person/.test(opens), opens);
    const addForm = await p.getByRole("button", { name: /^Add a form to .*'s filing$/ }).allInnerTexts();
    ok("QA-412b Prepare application offers \"Add a form to Sample Sponsor S's filing\", never \"this's filing\"", addForm.some((t) => /Sample Sponsor S's filing/.test(t)) && !addForm.some((t) => /this's/.test(t)), addForm);
    await p.setViewportSize({ width: 400, height: 900 }); await p.reload(); await p.waitForLoadState("networkidle"); await p.getByText("People and filings").first().waitFor(); await p.waitForTimeout(800);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("QA-413 at 400 px the case page has no sideways scroll (People and filings' table scrolls inside its own box)", over <= 0, { overflowPx: over });
    ok("QA-412 no page error", errs.length === 0, errs);
  } finally { await b.close(); }
  console.log(`\n${failed ? `${failed} failed` : "all passed"}`); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log(`FAIL QA-412 the check ran to its end (crashed: ${e.message.split("\n")[0]})`); process.exit(1); });
