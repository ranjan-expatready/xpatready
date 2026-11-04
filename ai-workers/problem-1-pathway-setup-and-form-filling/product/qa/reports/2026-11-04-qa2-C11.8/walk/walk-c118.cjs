// qa2 C11.8 walk on Reset to the six, 1440 px, Configuration author. Presses only "Draft with AI" (opens a dialog) and,
// on IMM 5645, "Use Saved (US$0)". Never a Live start. ARGS: studio base out json{attachments}
const [STUDIO, BASE, OUT, J] = process.argv.slice(2); const A = JSON.parse(J);
const { chromium } = require(STUDIO + "/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [], miss = []; p.on("response", (r) => r.status() === 404 && miss.push(r.url().replace(/^https?:\/\/[^/]+/, ""))); p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(BASE + "/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  const open = async (name, a) => {
    await p.goto(`${BASE}/c/${a.combo}/forms`); await p.waitForTimeout(4000);
    const row = p.locator("tr, li, [data-attachment]").filter({ hasText: new RegExp(a.code.replace(/ /g, "\\s")) }).first();
    const rowText = (await row.innerText().catch(() => "")).replace(/\s+/g, " ");
    const btn = row.getByRole("button", { name: /Draft with AI/ });
    let via = "button";
    if (await btn.count()) await btn.first().click(); else { via = "?draft= link (no Draft with AI button on the row)"; await p.goto(`${BASE}/c/${a.combo}/forms?draft=${a.id}`); }
    await p.locator('[data-draft-start][data-options-loaded="true"]').waitFor({ timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const box = p.getByRole("dialog"); const t = (await box.innerText().catch(() => "(no dialog)")).replace(/\n+/g, " ⏎ ");
    const start = p.locator("[data-draft-start]");
    const st = (await start.count()) ? { label: (await start.innerText()).trim(), disabled: await start.isDisabled(), mode: await start.getAttribute("data-mode") } : null;
    const radios = await box.locator('input[type="radio"]').evaluateAll((rs) => rs.map((r) => `${r.closest("label")?.innerText.split("\n")[0]}:${r.checked ? "checked" : ""}${r.disabled ? ",disabled" : ""}`));
    await p.screenshot({ path: `${OUT}/${name}-1440.png` });
    console.log(`=== ${name} via ${via}\nrow: ${rowText.slice(0, 300)}\nradios: ${radios.join(" | ")}\nstart: ${JSON.stringify(st)}\ndialog: ${t.slice(0, 1600)}\n`);
    return { start, st };
  };
  const r5645 = await open("imm5645-draft-with-ai", A.imm5645);
  if (r5645.st && !r5645.st.disabled && /Use Saved \(US\$0\)/.test(r5645.st.label)) {
    await r5645.start.click(); await p.waitForTimeout(1500);
    const shots = [];
    for (let i = 0; i < 12; i++) { const t = (await p.locator("main").innerText()).replace(/\n+/g, " ⏎ "); shots.push(t); if (/Stop|Cancel|step|progress|done|finished|Spent|US\$/i.test(t) && i >= 1) {} await p.waitForTimeout(1000); if (i === 1) await p.screenshot({ path: `${OUT}/imm5645-saved-run-early-1440.png` }); }
    await p.screenshot({ path: `${OUT}/imm5645-saved-run-after-1440.png` });
    console.log(`=== after Use Saved (US$0): url ${p.url()}\n${shots[1].slice(0, 1200)}\n...\n${shots.at(-1).slice(0, 1600)}\n`);
  } else console.log("=== Use Saved (US$0) not offered on IMM 5645; nothing pressed");
  await open("imm5406-spouse-shared", A.imm5406);
  await p.goto(`${BASE}/ai`); await p.waitForTimeout(3000);
  console.log(`=== /ai (${p.url()})\n${(await p.locator("main").innerText().catch(() => "")).replace(/\n+/g, " ⏎ ").slice(0, 1500)}`);
  await p.screenshot({ path: `${OUT}/ai-work-list-1440.png` });
  console.log("404 addresses:", [...new Set(miss)].join(" | ")); console.log("page/console errors:", errs.length, errs.slice(0, 5).join(" || "));
  await b.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
