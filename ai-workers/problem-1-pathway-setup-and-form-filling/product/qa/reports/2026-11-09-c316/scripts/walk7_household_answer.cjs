// qa gate A walk of C3.16, part 7 by screens (1024 px), case officer on the Visitor visa family case from part 6: the
// union date asked once on The application, answered once; each adult's part shows it read-only, the child's does not;
// then the next step: a copy of IMM 5257 for each person. node walk7_household_answer.cjs <port> <outdir> <case id>
const { chromium } = require("playwright");
const [port, out, caseId] = process.argv.slice(2);
const shot = async (p, n, full = false) => { await p.screenshot({ path: `${out}/${n}.png`, fullPage: full }); console.log("SHOT", n); };
const flat = (s) => s.replace(/\n+/g, " | ");
const Q = /Date the person married or began the common-law relationship/;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 800 } });
  await p.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
  await p.goto(`http://localhost:${port}/cases/${caseId}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  const tab = async (name) => { await p.locator("main button").filter({ hasText: new RegExp(`^${name}`) }).first().click(); await p.waitForTimeout(800); };
  await tab("The application");
  const tag = p.locator("[data-scope-tag]").first(); await tag.scrollIntoViewIfNeeded();
  await p.mouse.wheel(0, -150); await shot(p, "11a-application-asks-union-date-once");
  await p.getByRole("button", { name: /^(Add|Edit) Date the person married/ }).first().click(); await p.waitForTimeout(600);
  const dlgs = await p.getByRole("dialog").count();
  const row = dlgs ? p.getByRole("dialog").last() : tag.locator("xpath=../../..");
  console.log("EDITOR", flat(await row.innerText()).slice(0, 400), "| controls:", JSON.stringify(await row.locator("input,select,button").evaluateAll((els) => els.map((e) => e.tagName + ":" + (e.type || "") + ":" + (e.getAttribute("aria-label") || e.innerText || e.placeholder || "").slice(0, 40)))));
  const ins = row.locator("input");
  await ins.nth(0).fill("30"); await ins.nth(1).fill("6"); await ins.nth(2).fill("2012");
  await shot(p, "11b-union-date-typed");
  await row.getByRole("button", { name: /^Save/ }).first().click(); await p.waitForTimeout(1500);
  console.log("AFTER SAVE", flat(await tag.locator("xpath=../../..").innerText()).slice(0, 400));
  await shot(p, "11c-union-date-saved-once");
  for (const who of ["Client A", "Client B", "Child C"]) {
    await tab(who);
    const reads = p.locator("[data-household-reads]");
    const n = await reads.count();
    console.log(who, "household reads:", n ? flat(await reads.first().innerText()) : "none");
    console.log(who, "has its own Add/Edit for the union date:", await p.locator("[role=tabpanel][data-state=active]").getByRole("button", { name: /^(Add|Edit) Date the person married/ }).count());
    if (n) { await reads.first().scrollIntoViewIfNeeded(); await shot(p, `12-${who.replace(" ", "-").toLowerCase()}-reads-household-answer`); }
  }
  // the next step: a copy of IMM 5257 for each person
  for (const who of ["Client A", "Client B", "Child C"]) {
    const li = p.locator("main li").filter({ has: p.locator("h3", { hasText: new RegExp(`^IMM 5257 for ${who}`) }) }).first();
    if (!(await li.count())) { console.log("no IMM 5257 row for", who); continue; }
    await li.getByRole("button", { name: /Generate a (new )?copy/ }).click(); await p.waitForTimeout(5000);
    console.log("IMM 5257", who, flat(await li.innerText()).match(/Copy of [^|]*\|[^|]*/)?.[0]);
    if (who === "Client B") { await li.scrollIntoViewIfNeeded(); await shot(p, "13-imm5257-copy-client-b"); }
  }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
