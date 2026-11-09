// Stage 6, the case officer, Ready to file and on to C8.2's first step: after the files were made (setup part 2), are
// the representative's approvals still current; pass each remaining warning with a reason by screen (never a
// representative-review line: that is C8.3's to close); Ready to file; then "Record the submission…" opens.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator("section[data-readiness]").waitFor({ timeout: 20000 }); await p.waitForTimeout(1000);
  for (const f of [d.fP, d.fS]) await words(p.locator(`[data-readiness-filing="${f}"]`).locator("> *").first(), `filing ${f.slice(0, 8)} after the files were made`);
  const revLines = await p.locator("[data-code=representative_review]").allInnerTexts();
  log(`representative_review lines open: ${JSON.stringify(revLines)}`);
  await p.locator("section[data-readiness]").evaluate((el) => el.scrollIntoView({ block: "start" }));
  await shot("31-officer-after-files-made");
  let passed = 0;
  for (const f of [d.fP, d.fS]) {
    const row = p.locator(`[data-readiness-filing="${f}"]`);
    for (let n = 0; n < 60; n++) {
      const li = row.locator("li[data-code]:not([data-code=representative_review])").filter({ has: p.getByRole("button", { name: /^Pass with a reason/ }) }).first();
      if (!(await li.count())) break;
      const code = await li.getAttribute("data-code");
      const btn = li.getByRole("button", { name: /^Pass with a reason/ });
      await btn.click();
      const form = row.locator("[data-pass-form]");
      await form.locator("textarea").fill(`Checked by the case officer for the qa walk (Sample): ${code}.`);
      await form.getByRole("button", { name: "Pass" }).click();
      await form.waitFor({ state: "detached", timeout: 20000 });
      passed++; await p.waitForTimeout(300);
    }
  }
  log(`warnings passed by screen: ${passed}`);
  for (const f of [d.fP, d.fS]) {
    const row = p.locator(`[data-readiness-filing="${f}"]`);
    const rest = await row.locator("li[data-code]").evaluateAll((ls) => ls.map((l) => `${l.getAttribute("data-severity")}:${l.getAttribute("data-code")}`));
    log(`filing ${f.slice(0, 8)} lines left: ${JSON.stringify(rest)}`);
    const mr = row.locator("[data-mark-ready]");
    if (await mr.count()) { await mr.click(); await p.waitForTimeout(1500); }
    await words(row.locator("> *").first(), `filing ${f.slice(0, 8)} after Ready to file`);
  }
  await shot("32-officer-ready-to-file", true);
  const rec = p.getByRole("button", { name: "Record the submission…" });
  await rec.scrollIntoViewIfNeeded();
  log(`Record the submission… enabled: ${await rec.isEnabled()}`);
  const why = await p.locator("[id^=sub-why-]").allInnerTexts(); log(`why closed: ${JSON.stringify(why)}`);
  if (await rec.isEnabled()) {
    await rec.click();
    const dlg = p.getByRole("dialog"); await dlg.waitFor();
    await words(dlg, "C8.2 Record the submission dialog (its first step)");
    await shot("33-c82-record-the-submission-opens");
  }
};
