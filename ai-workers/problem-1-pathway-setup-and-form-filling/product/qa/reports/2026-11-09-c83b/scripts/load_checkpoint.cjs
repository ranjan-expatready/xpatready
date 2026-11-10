// C8.3 gate A: Demo › Load the configured checkpoint… on a fresh isolated copy, by screen, as the author (1024 px).
//   node load_checkpoint.cjs <port> <shot-dir>
const { chromium } = require("playwright");
const PORT = process.argv[2], SHOTS = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1024, height: 800 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-A"));
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${PORT}/`);
  await p.getByRole("button", { name: /^Demo/ }).click();
  await p.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
  const dlg = p.getByRole("dialog");
  await dlg.waitFor();
  await p.screenshot({ path: `${SHOTS}/00a-load-checkpoint-dialog.png` });
  await dlg.getByRole("button", { name: "Load the configured checkpoint" }).click();
  const t0 = Date.now();
  await p.getByText(/Configured checkpoint loaded in/).waitFor({ timeout: 1_200_000 });
  console.log("loaded by screen in", ((Date.now() - t0) / 1000).toFixed(1), "s:", await p.getByText(/Configured checkpoint loaded in/).first().innerText());
  await p.screenshot({ path: `${SHOTS}/00b-checkpoint-loaded.png` });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
