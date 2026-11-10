// Stage 3e, the case officer: round 2 for the principal's filing (blocked: its barcode copy must be read back again
// after the fix, so it is not ticked by default); ticks it by hand and sends.
module.exports = async ({ p, d, BASE, as, shot, words, log }) => {
  await as(d.officer);
  await p.goto(`${BASE}/cases/${d.caseId}`);
  const panel = p.locator("section[data-readiness]");
  await panel.getByRole("button", { name: /Send for review/ }).waitFor({ timeout: 20000 });
  const blk = await p.locator(`[data-readiness-filing="${d.fP}"]`).innerText(); const k = blk.search(/BLOCK|block/);
  log(`the principal's block: ${blk.slice(Math.max(0, k - 50), k + 400).replace(/\n/g, " | ")}`);
  await panel.getByRole("button", { name: /Send for review/ }).click();
  const sd = p.getByRole("dialog"); await sd.waitFor();
  const cb = sd.locator(`[data-send-filing="${d.fP}"] input[type=checkbox]`);
  log(`principal box enabled ${await cb.isEnabled()}, checked ${await cb.isChecked()}`);
  await cb.check();
  await words(sd, "Send dialog, principal ticked by hand");
  await shot("22-officer-round-2-ticked");
  await sd.getByRole("button", { name: /^Send 1 filing for review/ }).click();
  await sd.waitFor({ state: "detached", timeout: 20000 });
  await p.waitForTimeout(800);
  await words(p.locator(`[data-readiness-filing="${d.fP}"]`).locator("> *").first(), "principal's filing after round 2 sent");
  await shot("23-officer-round-2-sent");
};
