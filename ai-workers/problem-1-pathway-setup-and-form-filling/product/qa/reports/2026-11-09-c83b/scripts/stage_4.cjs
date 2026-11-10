// Stage 4, the representative: opens round 2 from the case; reads "Changed since review" (before → after, who typed it);
// approves with the one confirmation for unticked items.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.rep);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator(`[data-readiness-filing="${d.fP}"]`).getByRole("link", { name: "Open the review" }).click();
  const page = p.locator("[data-review-page]");
  await page.waitFor({ timeout: 20000 }); await p.waitForTimeout(1000);
  log(`url: ${p.url()}`);
  await words(page, "Round 2 as the representative opens it");
  await shot("24-rep-round-2-opened");
  await shot("24b-rep-round-2-full", true);
  const ch = await p.locator("[data-changes]").allInnerTexts();
  log(`changes panel: ${JSON.stringify(ch)}`);
  await page.getByRole("button", { name: /^Approve/ }).click();
  const ad = p.getByRole("dialog"); await ad.waitFor();
  await words(ad, "Approve dialog, round 2, nothing ticked");
  await shot("25-rep-round-2-approve-dialog");
  await ad.getByRole("button", { name: /Approve/ }).last().click();
  await ad.waitFor({ state: "detached", timeout: 20000 });
  await p.waitForTimeout(1000);
  await words(page, "Round 2 after approve");
  await shot("26-rep-round-2-approved", true);
};
