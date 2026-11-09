// qa gate A walk of C3.16, part 4 by screens (1024 px), case officer on the worker case from part 3: how the case asks
// the employer name (marked Organisation), then C1.3's first step (Choose employer case… › Sample employer case › Copy),
// then where the copy landed. node walk4_employer_link.cjs <port> <outdir> <case id>
const { chromium } = require("playwright");
const [port, out, caseId] = process.argv.slice(2);
const shot = async (p, n, full = true) => { await p.screenshot({ path: `${out}/${n}.png`, fullPage: full }); console.log("SHOT", n); };
const flat = (s) => s.replace(/\n+/g, " | ");
const around = (t, re, a = 250, z = 450) => { const i = t.search(re); return i < 0 ? "(not found)" : t.slice(Math.max(0, i - a), i + z); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 800 } });
  await p.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
  await p.goto(`http://localhost:${port}/cases/${caseId}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  const tab = async (name) => { await p.locator("main button").filter({ hasText: new RegExp(`^${name}`) }).first().click(); await p.waitForTimeout(700); return flat(await p.locator("[role=tabpanel][data-state=active]").first().innerText()); };
  const emp = () => p.locator("[role=tabpanel][data-state=active] [data-scope-tag]").filter({ hasText: "About the employer" });
  const rowOf = (l) => l.locator("xpath=../../..");
  let t = await tab("The application");
  console.log("APPLICATION TAB: 'About the employer' questions:", await emp().count(), "|", await emp().count() ? flat(await rowOf(emp().first()).innerText()).slice(0, 300) : "");
  if (await emp().count()) { await emp().first().scrollIntoViewIfNeeded(); await p.mouse.wheel(0, -120); await p.waitForTimeout(300); await shot(p, "07a-application-asks-employer-name-once", false); }
  t = await tab("Client A");
  console.log("CLIENT A TAB: asks the employer's name itself:", (t.match(/Name of the prospective employer/g) || []).length, "| the unmarked address on Client A:", around(t, /Complete address of the prospective employer/, 0, 160));
  await shot(p, "07b-client-a-tab", false);
  // C1.3's first step
  await p.getByRole("button", { name: /Choose employer case/ }).click();
  const panel = p.getByRole("dialog"); await panel.waitFor(); await p.waitForTimeout(800);
  const radio = panel.getByRole("radio", { name: /Sample Employer Ltd/ });
  if (await radio.count()) await radio.check(); await p.waitForTimeout(800);
  console.log("PANEL", flat(await panel.innerText()).slice(0, 1500));
  await shot(p, "08a-rely-on-employer-case-panel", false);
  await panel.getByRole("button", { name: /^Copy \d+ fact|^Link without copying/ }).click();
  await p.waitForTimeout(1500);
  t = flat(await p.locator("main").innerText());
  console.log("HEADER AFTER", around(t, /Relies on an employer case/, 0, 400));
  await shot(p, "08b-linked-header", false);
  t = await tab("The application");
  console.log("APPLICATION TAB AFTER:", await emp().count() ? flat(await rowOf(emp().first()).innerText()).slice(0, 400) : "(no tag)");
  if (await emp().count()) { await emp().first().scrollIntoViewIfNeeded(); await p.mouse.wheel(0, -120); await p.waitForTimeout(300); await shot(p, "08c-application-employer-name-copied", false); }
  t = await tab("Client A");
  console.log("CLIENT A AFTER: employer reads:", (await p.locator("[role=tabpanel][data-state=active] [data-household-reads]").count()) ? flat(await p.locator("[role=tabpanel][data-state=active] [data-household-reads]").first().innerText()) : "none", "| address:", around(t, /Complete address of the prospective employer/, 0, 200));
  if (await p.locator("[role=tabpanel][data-state=active] [data-household-reads]").count()) { await p.locator("[role=tabpanel][data-state=active] [data-household-reads]").first().scrollIntoViewIfNeeded(); await shot(p, "08d-client-a-reads-employer-name", false); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
