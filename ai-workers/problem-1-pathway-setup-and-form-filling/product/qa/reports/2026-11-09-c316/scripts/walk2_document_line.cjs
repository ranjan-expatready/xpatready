// Setup by screens (not under test): the author adds one document line by hand on the LMIA work permit's Documents tab
// (its checklist has no saved AI reading on the six and live AI is off), so its release has a document to collect.
// node walk2_document_line.cjs <port> <outdir> <wp combination id>
const { chromium } = require("playwright");
const [port, out, wp] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 800 } });
  await p.addInitScript(() => localStorage.setItem("xr-actor", "user-A"));
  await p.goto(`http://localhost:${port}/c/${wp}/documents`); await p.waitForLoadState("networkidle");
  await p.locator("[data-add-document]").click();
  const dlg = p.getByRole("dialog");
  const sel = dlg.getByLabel("Document type", { exact: true });
  const opts = await sel.locator("option").allInnerTexts();
  console.log("TYPES", JSON.stringify(opts.slice(0, 15)));
  const pick = opts.find((o) => /passport/i.test(o)) ?? opts[1];
  await sel.selectOption({ label: pick });
  console.log("WHOSE", JSON.stringify(await dlg.getByLabel("Whose document").locator("option").allInnerTexts()));
  await p.screenshot({ path: `${out}/05a-wp-documents-add-line.png` });
  await dlg.getByRole("button", { name: /^Save/ }).click();
  await p.waitForTimeout(1500);
  console.log("AFTER", (await p.locator("main").innerText()).slice(0, 600).replace(/\n+/g, " | "));
  await p.screenshot({ path: `${out}/05b-wp-documents-line-saved.png`, fullPage: false });
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
