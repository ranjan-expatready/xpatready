// The case officer confirms every section, tab by tab, through the Agent view's own buttons; logs each section's line first.
const out = [];
const tabs = await page.locator("[role=tab]").evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
for (const name of tabs) {
  const tab = page.getByRole("tab", { name: name.split(" ").slice(0, 4).join(" ") }).first();
  await tab.click().catch(() => {}); await page.waitForTimeout(700);
  const p = page.locator("[role=tabpanel]:visible").first();
  const btns = p.getByRole("button", { name: "Confirm section", exact: true });
  const n = await btns.count();
  const info = await btns.evaluateAll((bs) => bs.map((b) => { let s = b.parentElement; for (let k = 0; k < 4 && s && !/answered/.test(s.innerText.slice(0, 200)); k++) s = s.parentElement; return { dis: b.disabled || b.getAttribute("aria-disabled") === "true", head: (s?.innerText || "").split("\n").slice(0, 4).join(" / ").slice(0, 160) }; }));
  out.push(`TAB ${name}: ${n} sections`);
  for (let i = 0; i < n; i++) {
    const it = info[i]; out.push(`  ${it.dis ? "[disabled]" : "[enabled ]"} ${it.head}`);
    if (!it.dis && !/ 0 to confirm/.test(it.head)) { await btns.nth(i).click().catch((e) => out.push("   click failed " + String(e).slice(0, 80))); await page.waitForTimeout(900); }
  }
  const after = (await page.locator("[role=tab]").evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, " ").trim())));
  out.push(`  tabs now: ${after.join(" | ")}`);
}
const line = (await page.locator("main").innerText()).match(/\d+ questions for this household[^\n]*/)?.[0];
out.push("HOUSEHOLD: " + line);
console.log(out.join("\n"));
