// Stage 2, the representative of record: from the case, "Open the review"; read round 1; approve the spouse's filing
// after ticking its checklist; send the principal's back with a reason.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.rep);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  const panel = p.locator("section[data-readiness]");
  await panel.getByRole("link", { name: "Open the review" }).first().waitFor({ timeout: 20000 });
  await panel.getByRole("link", { name: "Open the review" }).first().click();
  const page = p.locator("[data-review-page]");
  await page.waitFor({ timeout: 20000 });
  await p.waitForTimeout(800);
  log(`url: ${p.url()}`);
  await words(page, "Review page, round 1, as the representative opens it");
  await shot("05-rep-round-1-opened");
  await shot("05b-rep-round-1-full", true);
  // the spouse's filing: select it in the list by its name
  await page.locator(`[data-review-filing="${d.fS}"]`).getByText(/Visitor visa: Sample Spouse A/).first().click();
  await p.waitForTimeout(800);
  await words(page, "Round 1, the spouse's filing selected");
  await shot("06-rep-spouse-selected", true);
  const boxes = page.locator(`[data-review-filing="${d.fS}"] [data-checklist] [data-check]`);
  log(`spouse checklist items: ${await boxes.count()}`);
  for (const it of await boxes.all()) {
    const cb = it.locator("input[type=checkbox]"), label = (await it.innerText()).replace(/\s+/g, " ").slice(0, 90);
    if (!(await cb.count())) { log(`  no box: ${label}`); continue; }
    const before = await cb.isChecked(), en = await cb.isEnabled();
    if (!before && en) { await cb.click(); await p.waitForTimeout(1200); }
    log(`  ${label} | enabled ${en} | ${before} -> ${await cb.isChecked()}`);
  }
  await shot("07-rep-spouse-checklist-ticked", true);
  await page.getByRole("button", { name: /^Approve/ }).click();
  const ad = p.getByRole("dialog");
  await ad.waitFor();
  await words(ad, "Approve dialog (spouse)");
  await shot("08-rep-approve-dialog");
  await ad.getByRole("button", { name: /Approve/ }).last().click();
  await ad.waitFor({ state: "detached", timeout: 20000 });
  await p.waitForTimeout(1000);
  await words(page, "Round 1 after approving the spouse's filing");
  await shot("09-rep-spouse-approved", true);
  // the principal's filing: send back with a reason
  await page.getByText("Sample Client A", { exact: false }).first().click();
  await p.waitForTimeout(800);
  await page.getByRole("button", { name: /^Send back/ }).click();
  const sb = p.getByRole("dialog");
  await sb.waitFor();
  await sb.getByRole("button", { name: /Send back/ }).last().click();
  await p.waitForTimeout(600);
  await words(sb, "Send back with no reason");
  await shot("10-rep-send-back-no-reason");
  await sb.getByRole("textbox").first().fill("IMM 5257: the city of birth does not match the passport. Please check it with the client (Sample).");
  await shot("11-rep-send-back-reason-typed");
  await sb.getByRole("button", { name: /Send back/ }).last().click();
  await sb.waitFor({ state: "detached", timeout: 20000 });
  await p.waitForTimeout(1000);
  await words(page, "Round 1 after sending the principal's filing back");
  await shot("12-rep-principal-sent-back", true);
};
