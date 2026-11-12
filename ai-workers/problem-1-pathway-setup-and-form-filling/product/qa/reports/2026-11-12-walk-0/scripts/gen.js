await page.locator("header select").selectOption({ label: "Case officer · Sample firm" }); await page.waitForTimeout(1500);
console.log("URL", page.url());
const reqs = []; page.on("response", r => { if (r.request().method() === "POST") reqs.push(r.url().replace(/^.*\/api/, "").slice(-60) + " " + r.status()); });
const g = page.getByRole("button", { name: "Generate a copy" });
const n = await g.count(); console.log("generate buttons", n);
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const b = page.getByRole("button", { name: "Generate a copy" }).nth(i);
  const card = (await b.evaluate(e => { let p = e; for (let k = 0; k < 4; k++) p = p.parentElement; return p.innerText.split("\n")[0]; }));
  const s = Date.now();
  await b.click({ timeout: 5000 }).catch(e => console.log("ERR", card, String(e).slice(0, 120)));
  await page.waitForTimeout(600);
  const d = page.getByRole("dialog");
  if (await d.count()) { console.log("  dialog:", (await d.innerText()).replace(/\s+/g, " ").slice(0, 400)); await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  console.log(card, (Date.now() - s) + "ms");
}
await page.waitForTimeout(1000);
console.log("POSTS", reqs.join(" ; "));
