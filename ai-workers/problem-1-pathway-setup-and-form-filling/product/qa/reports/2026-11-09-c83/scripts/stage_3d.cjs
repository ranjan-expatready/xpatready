// Stage 3d, the case officer: confirms the section holding the changed fact, then sends the principal's filing for
// review again (round 2).
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator("section[data-readiness]").waitFor({ timeout: 20000 });
  await p.getByRole("tab", { name: "Sample Client A", exact: true }).click();
  await p.waitForTimeout(800);
  const sec = p.getByRole("tabpanel").locator("section, fieldset, [data-section]").filter({ has: p.getByText("City or town of birth", { exact: true }) }).filter({ has: p.getByRole("button", { name: /^Confirm section/ }) }).last();
  const head = (await sec.innerText()).split("\n").slice(0, 3).join(" | ");
  log(`section: ${head}`);
  await sec.getByRole("button", { name: /^Confirm section/ }).click();
  const dlg = p.getByRole("dialog");
  if (await dlg.isVisible({ timeout: 2000 }).catch(() => false)) { await words(dlg, "confirm dialog"); await dlg.getByRole("button", { name: /^Confirm/ }).last().click(); }
  await p.waitForTimeout(1500);
  const tp = await p.getByRole("tabpanel").innerText(); const j = tp.indexOf("City or town of birth");
  log(`after confirm: ${tp.slice(j, j + 200).replace(/\n/g, " | ")}`);
  await shot("19-officer-section-confirmed");
  const panel = p.locator("section[data-readiness]");
  await panel.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await panel.getByRole("button", { name: /Send for review/ }).click();
  const sd = p.getByRole("dialog"); await sd.waitFor();
  await words(sd, "Send dialog for round 2");
  await shot("20-officer-send-round-2-dialog");
  await sd.getByRole("button", { name: /^Send \d+ filings? for review/ }).click();
  await sd.waitFor({ state: "detached", timeout: 20000 });
  await p.waitForTimeout(800);
  await words(p.locator(`[data-readiness-filing="${d.fP}"]`).locator("> *").first(), "principal's filing after round 2 sent");
  await shot("21-officer-round-2-sent");
};
