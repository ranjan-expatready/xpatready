// Stage "look" (re-run after #1440, QA-345 by screens): the representative opens the review of one filing from the case
// and reads each form's stamp line and state. d.look = { filing: "fP" | "fS", form?: "IMM 5257 · Sample Client A", shot: "<name>", label: "<words>" }.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.rep);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  const fid = d[d.look.filing];
  const row = p.locator(`[data-readiness-filing="${fid}"]`);
  await row.waitFor({ timeout: 20000 }); await p.waitForTimeout(800);
  await words(row.locator("> *").first(), `${d.look.label}: the filing on Ready to file`);
  await row.getByRole("link", { name: "Open the review" }).click();
  const page = p.locator("[data-review-page]"); await page.waitFor({ timeout: 20000 }); await p.waitForTimeout(1000);
  const sel = page.locator(`[data-review-filing="${fid}"]`);
  if (await sel.count()) { await sel.first().click().catch(() => {}); await p.waitForTimeout(800); }
  if (d.look.form) { await page.getByText(d.look.form, { exact: true }).first().click(); await p.waitForTimeout(800); }
  log(`url: ${p.url()}`);
  await words(page, `${d.look.label}: the review page (representative)`);
  log(`re-approve buttons: ${JSON.stringify(await page.getByRole("button", { name: /Re-approve/ }).allInnerTexts())}`);
  await shot(d.look.shot, true);
};
