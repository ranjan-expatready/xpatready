// Stage 1, the case officer: Ready to file → Send for review → tick both filings → Send.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  const panel = p.locator("section[data-readiness]");
  await panel.getByRole("button", { name: /Send for review/ }).waitFor({ timeout: 20000 });
  await panel.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await words(panel, "Ready to file, before sending");
  await shot("01-officer-ready-to-file");
  await panel.getByRole("button", { name: /Send for review/ }).click();
  const dlg = p.getByRole("dialog");
  await dlg.waitFor();
  await words(dlg, "Send for review dialog, as it opens");
  await shot("02-send-dialog-opened");
  for (const cb of await dlg.getByRole("checkbox").all()) if (!(await cb.isChecked()) && (await cb.isEnabled())) await cb.check();
  await words(dlg, "Send for review dialog, both ticked");
  await shot("03-send-dialog-both-ticked");
  await dlg.getByRole("button", { name: /^Send \d+ filings? for review/ }).click();
  await dlg.waitFor({ state: "detached", timeout: 20000 });
  await p.waitForTimeout(800);
  await words(panel, "Ready to file, after sending");
  await shot("04-officer-after-send");
};
