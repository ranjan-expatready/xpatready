// Gate A, step 0: Demo › Load the configured checkpoint… through the screen, as the configuration author, 1024 px
// (c78's walk_c78_load.mjs, through the suites' own browser helper so it runs from any folder).
//   LIBDIR=<studio>/acceptance/lib tsx walk_load.mts <port> <outdir>
const [port, out] = process.argv.slice(2);
const { walker } = await import(`${process.env.LIBDIR}/browser.ts`);
const w = await walker(`http://127.0.0.1:${port}`);
try {
  const p = await w.open("user-A", 1024);
  await p.goto("/"); await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: /^Demo/ }).click();
  await p.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^Load the configured checkpoint$/ }).click();
  await p.getByText(/Configured checkpoint loaded in/).first().waitFor({ timeout: 400_000 });
  await p.screenshot({ path: `${out}/00-checkpoint-loaded.png` });
  console.log((await p.getByText(/Configured checkpoint loaded in/).first().innerText()).slice(0, 120));
} finally { await w.close(); }
