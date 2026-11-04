// qa2 1440 px walk of C11.7 on Demo › Reset to the six: the programs list, AI work, the Provincial nominee forms, its IMM 5669 field map.
const STUDIO = process.argv[2], OUT = process.argv[3], BASE = "http://localhost:4480", PN = process.argv[4];
const { chromium } = require(STUDIO + "/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  const say = (s) => console.log(s);
  await p.goto(BASE + "/"); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} }); await p.goto(BASE + "/"); await p.waitForTimeout(3000);
  await p.screenshot({ path: OUT + "/walk-1-programs.png" });
  const home = await p.locator("main").innerText(); say("programs: " + (home.match(/\d+ combinations[^\n]*/) || [""])[0]);
  await p.goto(BASE + "/ai"); await p.waitForTimeout(3000); await p.screenshot({ path: OUT + "/walk-2-ai-work.png" });
  const ai = await p.locator("main").innerText(); say("AI work mentions 5669: " + /5669/.test(ai) + " · 0008 DEP: " + /0008 DEP/.test(ai) + " · 'Draft with AI' waiting: " + /waits? for Draft with AI/i.test(ai));
  await p.goto(BASE + "/c/" + PN + "/forms"); await p.waitForTimeout(3500); await p.screenshot({ path: OUT + "/walk-3-pn-forms.png", fullPage: true });
  const f = await p.locator("main").innerText();
  for (const code of ["IMM 0008", "IMM 0008 DEP", "IMM 5669", "IMM 5406", "IMM 5476"]) say(code + " on PN forms: " + f.includes(code));
  say("priced buttons on PN forms: " + (await p.locator("[data-priced]").count()) + " · 'Draft with AI (about' text: " + /Draft with AI \(about/.test(f));
  const link = p.locator('a[href*="/jobs/"]', { hasText: /5669/ }).first();
  if (await link.count()) { await link.click(); await p.waitForTimeout(4000); await p.screenshot({ path: OUT + "/walk-4-imm5669-map.png" }); const j = await p.locator("main").innerText(); say("IMM 5669 job page: " + j.slice(0, 300).replace(/\n/g, " | ")); }
  else say("no IMM 5669 job link on the PN forms tab");
  say("console errors: " + errs.length + (errs.length ? " " + errs.slice(0, 2).join(" | ") : ""));
  await b.close();
})().catch((e) => { console.error("WALK ERROR " + e.message); process.exit(1); });
