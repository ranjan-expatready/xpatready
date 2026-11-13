// Answers the client questionnaire part by part through the screen only (run inside drive.mjs's page context).
const log = [];
const childDob = "2023-03-14", adultDob = "1986-05-20";
for (let step = 0; step < 90; step++) {
  const h = (await page.locator("main h1, main h2").first().innerText().catch(() => "")).trim();
  const part = (await page.locator("main").innerText()).match(/Part (\d+) of (\d+)[^\n]*/)?.[0] ?? "";
  if (!part) { log.push(`[${step}] no part on screen: ${h}`); break; }
  require("fs").appendFileSync("<scratchpad>/parts.txt", "\n=== "+part+"\n"+(await page.locator("main").innerText()).slice(0,2500)+"\n");
  const who = (await page.locator("main").innerText()).match(/About (Sample [A-Za-z]+ A)/)?.[1] ?? "";
  const isChild = /Child/.test(part + " " + (await page.locator("main").innerText()).slice(0, 400));
  // radios: per group pick "No" if present, else the first option
  const groups = await page.locator("main input[type=radio]:visible").evaluateAll((es) => [...new Set(es.map((e) => e.name))]);
  for (const g of groups) {
    const opts = page.locator(`main input[type=radio][name="${g}"]:visible`);
    const labels = await opts.evaluateAll((es) => es.map((e) => (e.labels?.[0]?.innerText || e.value || "").trim()));
    if (await opts.evaluateAll((es) => es.some((e) => e.checked))) continue;
    let k = labels.findIndex((l) => /^No\b/.test(l)); if (k < 0) k = 0;
    await opts.nth(k).check({ force: true }).catch(() => {});
  }
  for (const cb of await page.locator("main [role=checkbox]:visible, main input[type=checkbox]:visible").all()) { /* leave checkboxes as a person who has nothing to tick */ }
  const fields = page.locator("main input:visible:not([type=radio]):not([type=checkbox]), main textarea:visible, main select:visible");
  const n = await fields.count();
  for (let i = 0; i < n; i++) {
    const f = fields.nth(i);
    const meta = await f.evaluate((e) => ({ tag: e.tagName, type: e.type, val: e.value, label: (e.labels?.[0]?.innerText || e.getAttribute("aria-label") || e.name || "").toLowerCase(), legend: (e.closest("fieldset")?.querySelector("legend")?.innerText || "").toLowerCase(), opts: e.tagName === "SELECT" ? [...e.options].map((o) => o.text) : [], max: e.maxLength }));
    const part3 = /^(day|month|year)$/.test(meta.label.trim());
    if (part3) {
      const lg = meta.legend; const kind = meta.label.trim();
      const yr = /birth/.test(lg) ? (isChild ? "2023" : "1986") : /(planned|last day|first day|expir|valid until|until|end)/.test(lg) ? "2027" : "2020";
      const v3 = kind === "day" ? (/last day|until|end/.test(lg) ? "20" : "14") : kind === "month" ? (/last day|until|end/.test(lg) ? "07" : "06") : yr;
      await f.fill(v3).catch(() => {}); continue;
    }
    if (/telephone|fax|phone/.test(meta.legend) && /^(country code|number)$/.test(meta.label.trim())) { await f.fill(meta.label.trim() === "number" ? "9876543210" : "91").catch(() => {}); continue; }
    if (/family name/.test(meta.label)) { await f.fill((who.split(" ")[1] || "Principal")).catch(() => {}); continue; }
    if (/given name/.test(meta.label)) { await f.fill("Sample").catch(() => {}); continue; }
    if (/city or town of birth|place of birth/.test(meta.label)) { await f.fill("New Delhi").catch(() => {}); continue; }
    if (/unique client identifier|\buci\b/.test(meta.label)) { await f.fill("1122334455").catch(() => {}); continue; }
    if (meta.val) continue;
    if (meta.tag === "SELECT") {
      let pick = meta.opts.findIndex((o) => /^(India|Indian)$/i.test(o));
      if (pick < 0 && /marital/.test(meta.label)) pick = meta.opts.findIndex((o) => /married/i.test(o));
      if (pick < 0) pick = meta.opts.findIndex((o, j) => j > 0 && o && !/choose|select|—/i.test(o));
      if (pick >= 0) await f.selectOption({ index: pick }).catch(() => {});
      continue;
    }
    let v = "Sample";
    const L = meta.label;
    if (meta.type === "date" || /date|birth|dob|from|until|expiry|issue/.test(L)) v = /birth/.test(L) ? (isChild ? childDob : adultDob) : /expir|until|to\b/.test(L) ? "2031-06-30" : "2024-01-15";
    else if (meta.type === "email" || /e-?mail/.test(L)) v = "client.a@example.com";
    else if (meta.type === "tel" || /phone|telephone/.test(L)) v = "4165550100";
    else if (meta.type === "number" || /amount|funds|number of|how many|cad|cost/.test(L)) v = /funds|cad|amount|cost/.test(L) ? "8000" : "1";
    else if (/passport|document number|id number|uci/.test(L)) v = "P1234567";
    else if (/postal|zip/.test(L)) v = /canada/.test(meta.legend) ? "K1A 0B1" : "110001";
    else if (/^country/.test(L.trim())) v = /canada/.test(meta.legend) ? "Canada" : "India";
    else if (/city|town|place/.test(L)) v = "New Delhi";
    else if (/family name|surname|last name/.test(L)) v = who.split(" ")[1] ?? "Principal";
    else if (/given name|first name/.test(L)) v = "Sample";
    if (meta.max > 0 && v.length > meta.max) v = v.slice(0, meta.max);
    await f.fill(v).catch(() => {});
  }
  const none = page.getByRole("button", { name: "None apply" });
  for (let k = 0; k < (await none.count()); k++) await none.nth(k).click().catch(() => {});
  const before = part;
  await page.getByRole("button", { name: "Save and continue" }).click().catch((e) => log.push(`[${step}] no Save and continue: ${part}`));
  await page.waitForTimeout(700);
  for (let w = 0; w < 30 && /Saving…/.test(await page.locator("main").innerText()); w++) await page.waitForTimeout(500);
  const after = (await page.locator("main").innerText()).match(/Part (\d+) of (\d+)[^\n]*/)?.[0] ?? "(no part)";
  const errs = await page.locator("main [role=alert]:visible, main .text-danger:visible, main [aria-invalid=true]:visible").evaluateAll((es) => es.map((e) => (e.innerText || e.getAttribute("aria-label") || e.name || "").replace(/\s+/g, " ").slice(0, 140)).filter(Boolean));
  log.push(`[${step}] ${before} -> ${after}${errs.length ? " ERR: " + errs.slice(0, 3).join(" || ") : ""}`);
  if (after === before) { // stuck: stop and report
    log.push(`STUCK on ${before}`); break;
  }
  if (after === "(no part)") break;
}
console.log(log.join("\n"));
