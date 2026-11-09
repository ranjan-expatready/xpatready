// Stage 3a, the case officer: what the send back shows on the case (BR-5: the officer sees the reasons on the filing).
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  const panel = p.locator("section[data-readiness]");
  await panel.getByRole("button", { name: /Send for review/ }).waitFor({ timeout: 20000 });
  await panel.evaluate((el) => el.scrollIntoView({ block: "start" }));
  for (const f of [d.fP, d.fS]) { const row = p.locator(`[data-readiness-filing="${f}"]`); await words(row.locator("> *").first(), `filing ${f} head`).catch(async () => words(row, `filing ${f}`)); }
  await shot("13-officer-sees-send-back");
  const tabs = await p.getByRole("tab").allInnerTexts().catch(() => []);
  const links = await p.getByRole("link").allInnerTexts();
  log(`tabs: ${JSON.stringify(tabs)}\nlinks: ${JSON.stringify(links.slice(0, 40))}`);
};
