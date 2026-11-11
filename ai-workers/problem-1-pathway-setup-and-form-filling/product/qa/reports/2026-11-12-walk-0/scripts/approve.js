const reqs = []; page.on("response", r => { if (r.request().method() !== "GET") reqs.push(r.url().replace(/^.*\/api/, "").slice(-50) + " " + r.status()); });
for (const f of ["Visitor visa: Sample Spouse A", "Visitor visa: Sample Principal A", "Visitor visa: Sample Child A"]) {
  await page.getByRole("button", { name: new RegExp("^" + f + " · Round 1") }).click(); await page.waitForTimeout(1000);
  const boxes = page.locator("main input[type=checkbox]:visible, main [role=checkbox]:visible");
  const nb = await boxes.count(); let ticked = 0;
  for (let i = 0; i < nb; i++) { const b = boxes.nth(i); if (!(await b.isChecked().catch(() => true)) && !(await b.isDisabled())) { await b.click().catch(() => {}); ticked++; await page.waitForTimeout(150); } }
  const left = (await page.locator("main").innerText()).match(new RegExp(f + ": [^\\n]*"))?.[0];
  console.log(f, "checkboxes", nb, "ticked", ticked, "|", left);
  await page.getByRole("button", { name: "Approve", exact: true }).click(); await page.waitForTimeout(900);
  const d = page.getByRole("dialog"); if (await d.count()) { console.log("  dialog:", (await d.innerText()).replace(/\s+/g, " ").slice(0, 250)); await d.getByRole("button", { name: /Approve/ }).last().click(); await page.waitForTimeout(1200); }
  console.log("  alerts:", (await page.locator("[role=alert],[data-sonner-toast]").allInnerTexts()).join(" | ").replace(/\s+/g, " ").slice(0, 250));
}
console.log("REQS", reqs.join(" ; "));
