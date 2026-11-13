// The case officer presses every "Generate a copy" in Prepare application, one at a time, waiting for each to finish.
const out = [];
const n = await page.getByRole("button", { name: "Generate a copy", exact: true }).count();
out.push(`buttons: ${n}`);
for (let i = 0; i < n; i++) {
  const b = page.getByRole("button", { name: "Generate a copy", exact: true }).nth(i);
  await b.scrollIntoViewIfNeeded().catch(() => {});
  const t0 = Date.now();
  await b.click().catch((e) => out.push(`#${i} click failed ${String(e).slice(0, 80)}`));
  await page.waitForTimeout(1200);
  for (let w = 0; w < 40 && /Generating|Making|Filling…|Reading back/i.test(await page.locator("main").innerText()); w++) await page.waitForTimeout(500);
  out.push(`#${i} ${Date.now() - t0} ms`);
}
const t = await page.locator("main").innerText();
const i0 = t.indexOf("Prepare application");
console.log(out.join("\n") + "\n----\n" + t.slice(i0, i0 + 9000));
