const out = [];
for (let k = 0; k < 20; k++) {
  const b = page.getByRole("button", { name: "Generate a copy", exact: true }).first();
  if (!(await b.count())) break;
  const label = await b.evaluate((e) => { let s = e; for (let j = 0; j < 6 && s && !/^IMM|^IRM/.test(s.innerText || ""); j++) s = s.parentElement; return (s?.innerText || "").split("\n")[0]; });
  const t0 = Date.now();
  await b.scrollIntoViewIfNeeded().catch(() => {});
  await b.click().catch((e) => out.push(`click failed ${String(e).slice(0, 80)}`));
  await page.waitForTimeout(2500);
  out.push(`${label}: ${Date.now() - t0} ms`);
}
const t = await page.locator("main").innerText();
const lines = t.split("\n").filter((l) => /^(IMM|IRM) \S+( \S+)? for |^Copy of |^Not yet|^Facts to answer|fact to answer|mandatory form fields left empty|^To write by hand/.test(l));
console.log(out.join("\n") + "\n----\n" + lines.join("\n"));
