// The representative, for each filing in turn: tick "Values confirmed", Approve, and approve the remaining unticked items (recorded).
const out = [];
for (let k = 0; k < 3; k++) {
  const dlg = page.getByRole("dialog"); if (await dlg.count()) { await dlg.getByRole("button", { name: "Go back" }).click().catch(() => {}); await page.waitForTimeout(500); }
  const filings = page.getByRole("button", { name: /^Visitor visa: .* · Round 1/ });
  const names = await filings.evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, " ")));
  out.push(`filings: ${names.join(" | ")}`);
  const idx = names.findIndex((n) => !/Approved/.test(n)); if (idx < 0) break;
  await filings.nth(idx).click(); await page.waitForTimeout(900);
  const vc = page.getByRole("checkbox", { name: /Values confirmed/ }).first();
  if (await vc.count()) await vc.check().catch((e) => out.push("tick failed " + String(e).slice(0, 60)));
  await page.getByRole("button", { name: "Approve", exact: true }).first().click(); await page.waitForTimeout(900);
  const d2 = page.getByRole("dialog");
  if (await d2.count()) { out.push("  dialog: " + (await d2.innerText()).split("\n")[0]); await d2.getByRole("button", { name: "Approve", exact: true }).click(); await page.waitForTimeout(1500); }
}
const names = await page.getByRole("button", { name: /^Visitor visa: .* · Round 1/ }).evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, " ")));
out.push("END: " + names.join(" | "));
console.log(out.join("\n"));
