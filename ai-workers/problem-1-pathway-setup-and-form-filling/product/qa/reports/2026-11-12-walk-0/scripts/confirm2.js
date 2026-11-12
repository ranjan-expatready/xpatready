const names = ["The representative","The application","Sample Principal A","Sample Principal A's mother","Sample Principal A's father","Sample Principal A's brothers and sisters","Sample Spouse A","Sample Spouse A's mother","Sample Spouse A's father","Sample Spouse A's brothers and sisters","Sample Child A"];
const fails = [];
page.on("response", r => { if (r.request().method() === "POST" && r.status() >= 300) fails.push(r.url().replace(/^.*\/api/, "") + " " + r.status()); });
for (const n of names) {
  const tab = page.locator("main button").filter({ hasText: new RegExp("^" + n.replace(/[()]/g, "\\$&") + "$") }).last();
  try { await tab.click({ timeout: 4000 }); } catch { console.log("cannot open tab", n); continue; }
  await page.waitForTimeout(700);
  const b = page.getByRole("button", { name: "Confirm section" }).filter({ visible: true });
  const c = await b.count();
  let miss=0; for (let j = 0; j < c; j++) { try { await b.nth(j).click({timeout:3000}); } catch { miss++; } await page.waitForTimeout(700); }
  console.log(n, "sections", c, "missed", miss);
}
await page.reload(); await page.waitForTimeout(1500);
console.log("FAILS", fails.join(" ; "));
console.log((await page.locator("main").innerText()).match(/\d+ questions for this household[^\n]*/)?.[0]);
