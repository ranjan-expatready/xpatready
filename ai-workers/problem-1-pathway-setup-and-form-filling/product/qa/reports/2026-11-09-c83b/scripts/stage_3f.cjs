// Stage 3f, the case officer (re-run after #1440): confirms the section holding the principal's changed city of birth.
// Then stage 3e sends the principal's filing again (round 2).
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator("section[data-readiness]").waitFor({ timeout: 20000 });
  await p.getByRole("tab", { name: "Sample Client A", exact: true }).click();
  await p.waitForTimeout(800);
  const sec = p.getByRole("tabpanel").locator("section, fieldset, [data-section]").filter({ has: p.getByText("City or town of birth", { exact: true }) }).filter({ has: p.getByRole("button", { name: /^Confirm section/ }) }).last();
  log(`section: ${(await sec.innerText()).split("\n").slice(0, 3).join(" | ")}`);
  await sec.getByRole("button", { name: /^Confirm section/ }).click();
  const dlg = p.getByRole("dialog");
  if (await dlg.isVisible({ timeout: 2000 }).catch(() => false)) { await words(dlg, "confirm dialog"); await dlg.getByRole("button", { name: /^Confirm/ }).last().click(); }
  await p.waitForTimeout(1500);
  const tp = await p.getByRole("tabpanel").innerText(); const j = tp.indexOf("City or town of birth");
  log(`after confirm: ${tp.slice(j, j + 200).replace(/\n/g, " | ")}`);
  await shot("19-officer-section-confirmed");
};
