// Stage 3c, the case officer: reads the reasons from "Open the review", fixes the principal's city of birth on the
// person tab (Edit), then sends the principal's filing again (round 2).
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator(`[data-readiness-filing="${d.fP}"]`).getByRole("link", { name: "Open the review" }).click();
  const page = p.locator("[data-review-page]");
  await page.waitFor({ timeout: 20000 }); await p.waitForTimeout(800);
  const t = await page.innerText();
  log(`officer on the review: read-only words: ${JSON.stringify(await p.locator("[data-read-only]").allInnerTexts())}; reason shown: ${/city of birth does not match/.test(t)}; Approve/Send back buttons: ${await page.getByRole("button", { name: /^(Approve|Send back)/ }).count()}`);
  await shot("16-officer-reads-reasons");
  await page.getByRole("link", { name: /Back to the case/ }).click();
  await p.locator("section[data-readiness]").waitFor({ timeout: 20000 });
  await p.getByRole("tab", { name: "Sample Client A", exact: true }).click();
  await p.waitForTimeout(800);
  const field = p.getByRole("tabpanel").locator("div", { has: p.getByText("City or town of birth", { exact: true }) }).filter({ has: p.getByRole("button", { name: "Edit" }) }).last();
  await field.getByRole("button", { name: "Edit" }).click();
  const dlg = p.getByRole("dialog");
  await dlg.waitFor();
  await words(dlg, "Edit City or town of birth");
  await shot("17-officer-edit-city");
  const box = dlg.getByRole("textbox").first();
  await box.fill("SAMPLEVILLE");
  await dlg.getByRole("button", { name: /^Save/ }).click();
  await dlg.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1200);
  const tp = await p.getByRole("tabpanel").innerText(); const j = tp.indexOf("City or town of birth");
  log(`after save: ${tp.slice(j, j + 260).replace(/\n/g, " | ")}`);
  await shot("18-officer-city-saved");
  // confirm the section if the page asks for it
  const conf = p.getByRole("tabpanel").getByRole("button", { name: /^Confirm/ });
  log(`confirm buttons on the tab: ${JSON.stringify(await conf.allInnerTexts())}`);
};
