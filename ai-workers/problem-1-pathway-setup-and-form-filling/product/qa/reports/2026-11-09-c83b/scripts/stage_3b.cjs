// Stage 3b, the case officer: are the send-back reasons on the case page, and where; the person tab's city of birth field.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  await p.locator("section[data-readiness]").waitFor({ timeout: 20000 });
  await p.waitForTimeout(1500);
  const body = await p.locator("body").innerText();
  const i = body.indexOf("city of birth does not match");
  log(`reason on the case page: ${i >= 0 ? "yes: …" + body.slice(Math.max(0, i - 300), i + 120).replace(/\n/g, " | ") : "no"}`);
  const sb = p.getByText(/Sent back/).first();
  await sb.hover(); await p.waitForTimeout(800);
  const tip = await p.getByRole("tooltip").allInnerTexts().catch(() => []);
  log(`tooltip on the Sent back chip: ${JSON.stringify(tip)}`);
  await shot("14-officer-sent-back-chip-hover");
  await p.getByRole("tab", { name: "Sample Client A", exact: true }).click();
  await p.waitForTimeout(1000);
  const panel = p.getByRole("tabpanel");
  const t = await panel.innerText();
  const j = t.search(/birth/i);
  log(`person tab, around "birth":\n${t.slice(Math.max(0, j - 200), j + 800)}`);
  await shot("15-officer-person-tab", true);
};
