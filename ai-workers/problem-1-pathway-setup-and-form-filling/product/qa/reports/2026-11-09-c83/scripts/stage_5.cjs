// Stage 5: the case officer changes the spouse's city of birth (read only by the spouse's IMM 5257) after the spouse's
// filing was approved; Ready to file shows the withdrawal; the representative sees only that form withdrawn and
// re-approves it in one click.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator("section[data-readiness]").waitFor({ timeout: 20000 });
  await p.getByRole("tab", { name: "Sample Spouse A", exact: true }).click();
  await p.waitForTimeout(800);
  const field = p.getByRole("tabpanel").locator("div", { has: p.getByText("City or town of birth", { exact: true }) }).filter({ has: p.getByRole("button", { name: "Edit" }) }).last();
  await field.getByRole("button", { name: "Edit" }).click();
  const dlg = p.getByRole("dialog"); await dlg.waitFor();
  await words(dlg, "Edit the spouse's city of birth");
  await dlg.getByRole("textbox").first().fill("SAMPLETOWN");
  await dlg.getByRole("button", { name: /^Save/ }).click();
  await dlg.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1000);
  const sec = p.getByRole("tabpanel").locator("section, fieldset, [data-section]").filter({ has: p.getByText("City or town of birth", { exact: true }) }).filter({ has: p.getByRole("button", { name: /^Confirm section/ }) }).last();
  await sec.getByRole("button", { name: /^Confirm section/ }).click();
  const cd = p.getByRole("dialog"); if (await cd.isVisible({ timeout: 1500 }).catch(() => false)) await cd.getByRole("button", { name: /^Confirm/ }).last().click();
  await p.waitForTimeout(1500);
  await p.reload(); await p.locator("section[data-readiness]").waitFor({ timeout: 20000 });
  const row = p.locator(`[data-readiness-filing="${d.fS}"]`);
  await row.scrollIntoViewIfNeeded();
  await words(row.locator("> *").first(), "spouse's filing on Ready to file after the change (officer)");
  const rt = await row.innerText(); const k = rt.search(/review/i);
  log(`spouse row around "review": ${rt.slice(Math.max(0, k - 100), k + 400).replace(/\n/g, " | ")}`);
  await shot("27-officer-spouse-approval-withdrawn");
  // the representative
  await as(d.rep);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator(`[data-readiness-filing="${d.fS}"]`).getByRole("link", { name: "Open the review" }).click();
  const page = p.locator("[data-review-page]"); await page.waitFor({ timeout: 20000 }); await p.waitForTimeout(1000);
  log(`url: ${p.url()}`);
  await words(page, "Round 1 with the spouse's withdrawn form (representative)");
  await shot("28-rep-withdrawn-change-only");
  await shot("28b-rep-withdrawn-full", true);
  const btn = page.getByRole("button", { name: /Re-approve/ });
  log(`re-approve buttons: ${JSON.stringify(await btn.allInnerTexts())}`);
  await btn.first().click();
  const rd = p.getByRole("dialog");
  if (await rd.isVisible({ timeout: 2000 }).catch(() => false)) { await words(rd, "re-approve dialog"); await shot("29-rep-reapprove-dialog"); await rd.getByRole("button", { name: /Re-approve/ }).last().click(); }
  await p.waitForTimeout(2000);
  log(`url after: ${p.url()}`);
  await words(page, "After re-approve");
  await shot("30-rep-reapproved", true);
};
