// Stage "reapprove" (re-run after #1440): the representative opens the principal's review from the case and presses
// "Re-approve 1 changed form" (the one click of P-412), after another validated copy of the same facts was read back.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.rep);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator(`[data-readiness-filing="${d.fP}"]`).getByRole("link", { name: "Open the review" }).click();
  const page = p.locator("[data-review-page]"); await page.waitFor({ timeout: 20000 }); await p.waitForTimeout(1000);
  await page.getByText("IMM 5257 · Sample Client A", { exact: true }).first().click(); await p.waitForTimeout(600);
  await words(page, "Principal's review before the re-approve");
  await shot("30e-rep-principal-withdrawn-file", true);
  await page.getByRole("button", { name: /Re-approve/ }).first().click();
  const rd = p.getByRole("dialog");
  if (await rd.isVisible({ timeout: 2000 }).catch(() => false)) { await words(rd, "re-approve dialog"); await rd.getByRole("button", { name: /Re-approve/ }).last().click(); }
  await p.waitForTimeout(2000);
  await words(page, "Principal after the re-approve");
  await shot("30f-rep-principal-reapproved", true);
};
