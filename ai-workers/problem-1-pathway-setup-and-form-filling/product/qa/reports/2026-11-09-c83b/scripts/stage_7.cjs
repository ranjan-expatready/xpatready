// Stage 7, the representative of record (P-155: the one who records), C8.2 by screen: records the submission and
// reads whether the record names the review C8.3 made (Prepared by · Reviewed by).
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.rep);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  const rec = p.getByRole("button", { name: "Record the submission…" });
  await rec.waitFor({ timeout: 20000 }); await rec.scrollIntoViewIfNeeded();
  await rec.click();
  const dlg = p.getByRole("dialog"); await dlg.waitFor();
  const nums = dlg.getByRole("textbox", { name: /Application number/ });
  log(`application number boxes: ${await nums.count()}`);
  await nums.nth(0).fill("W123456789"); await nums.nth(1).fill("W123456790");
  const dates = dlg.locator("input[type=date]"); const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < await dates.count(); i++) await dates.nth(i).fill(today);
  await shot("34-c82-record-filled");
  await dlg.getByRole("button", { name: "Record the submission" }).click();
  await dlg.waitFor({ state: "detached", timeout: 20000 }).catch(async () => { await words(dlg, "dialog still open"); });
  await p.waitForTimeout(1500);
  const grp = p.locator("[data-submission-group]").first();
  await grp.scrollIntoViewIfNeeded();
  await words(grp, "C8.2 submission after recording");
  await shot("35-c82-recorded");
};
