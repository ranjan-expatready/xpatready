// qa C6.5 gate A walk by screens (P-348 (3)), main 2cfdad961, 10 Nov 2026. Only what a person sees and presses:
// the case officer's case page (checklist "Upload a file…", Agent view "Fill this from documents", the drawer's
// "Replay the saved read · US$0", ticks, "Confirm & use"), then the next capability's first step. Each phase is one
// pass; screenshots at each decision point go to OUT. The simulated person is chosen as the app does (localStorage
// "xr-actor"). Live AI off; replay only (US$0); never a priced button (P-175).
// Usage (from studio/): node walk.mjs <port> <caseId> <phase> <OUT> [width]
import { createRequire } from "node:module";
const { chromium } = createRequire(`${process.cwd()}/`)("playwright");
const [port, caseId, phase, OUT, width = "1024"] = process.argv.slice(2);
const FILES = process.env.FILES;
const b = await chromium.launch({ channel: "chrome" });
const errs = [];
const open = async (actor, w = Number(width)) => {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, timezoneId: "Asia/Kolkata", baseURL: `http://127.0.0.1:${port}` });
  await ctx.addInitScript((a) => localStorage.setItem("xr-actor", a), actor);
  const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(String(e).slice(0, 200))); return p;
};
const settle = async (p) => { await p.waitForLoadState("networkidle"); for (let i = 0; i < 60 && /\bLoading\b/.test(await p.locator("body").innerText()); i++) await p.waitForTimeout(250); };
const shot = async (p, name, loc) => { (loc ?? p).screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 70, ...(loc ? {} : { fullPage: false }) }); await p.waitForTimeout(150); console.log("SHOT", name); };
const say = (k, v) => console.log(`${k}: ${String(v).replace(/\s+/g, " ").trim().slice(0, 1500)}`);
const P = JSON.parse(process.env.SUBJECTS ?? "{}"), CASE_SUBJECT = process.env.CASESUBJECT;

async function upload(p, personName, label, file, shotName) {
  await p.goto(`/cases/${caseId}`); await settle(p);
  const block = p.locator("section, div").filter({ has: p.getByText(personName, { exact: true }) }).filter({ has: p.locator("[data-line]") }).last();
  const line = p.locator("[data-line]").filter({ has: p.locator("[data-line-label]", { hasText: label }) });
  // the person's own line: the n-th line with this label, in the order the people are listed
  const order = Object.keys(P).indexOf(personName);
  const target = (await line.count()) > 1 ? line.nth(Math.max(order, 0)) : line.first();
  await target.scrollIntoViewIfNeeded();
  await target.locator("[data-line-menu]").click();
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByRole("menuitem", { name: "Upload a file…" }).click()]);
  await fc.setFiles(`${FILES}/${file}`);
  await p.waitForTimeout(1500); await settle(p);
  say(`line after upload (${personName}, ${label})`, await target.innerText());
  await shot(p, shotName, target);
}
async function drawer(p, subject, fact, shotName) {
  await p.goto(`/cases/${caseId}#a-${subject}-${fact.replace(/[^a-z0-9_]/gi, "-")}`); await settle(p);
  const sec = p.locator(`[id^="s-${subject}-"]`).filter({ has: p.locator(`#a-${subject}-${fact.replace(/[^a-z0-9_]/gi, "-")}`) }).first();
  say("section heading", await sec.locator("h3, h4, h2").first().innerText().catch(() => "?"));
  await sec.locator("[data-fill-from-documents]").click();
  const d = p.locator("[data-documents-drawer]"); await d.waitFor({ timeout: 30000 }); await settle(p); await p.waitForTimeout(500);
  say("drawer", await d.innerText()); await shot(p, shotName);
  return d;
}

const page = await open("user-O");
if (phase === "funds") {
  await upload(page, "Sample Client A", "Proof of financial support", "sample-funds.pdf", "01-client-a-funds-line-received");
  const d = await drawer(page, CASE_SUBJECT, "case.funds_available_cad", "02-application-visit-drawer-cost-card");
  await d.getByRole("button", { name: /Replay the saved read/ }).click(); await page.waitForTimeout(2000); await settle(page);
  say("drawer after replay", await d.innerText()); await shot(page, "03-funds-replayed-to-tick");
  const use = d.locator("[data-confirm-and-use]").first(); say("confirm disabled before tick", await use.isDisabled());
  for (const t of await d.locator("[data-tick]").all()) await t.check();
  say("confirm disabled after tick", await use.isDisabled()); await shot(page, "04-funds-ticked");
  await use.click(); await page.waitForTimeout(2000); await settle(page);
  say("drawer after confirm", await d.innerText()); await shot(page, "05-funds-confirmed-and-used");
  say("toasts", (await page.locator("[role=status], [data-toast]").allInnerTexts()).join(" | "));
}
if (phase === "married") {
  // The couple's marital status, typed by the officer in the Agent view (setup for the marriage line, as the pack's C6.5-24a; not C6.5 itself)
  for (const who of ["Sample Client A", "Sample Spouse A"]) {
    const s = P[who];
    await page.goto(`/cases/${caseId}#a-${s}-person-marital_status`); await settle(page);
    const q = page.locator(`#a-${s}-person-marital_status`);
    say(`marital question (${who})`, await q.innerText());
    await q.getByRole("button", { name: `Add Current marital status for ${who}` }).click();
    const dlg = page.locator("[role=dialog]"); await dlg.waitFor();
    const sel = dlg.locator("select"); if (await sel.count()) await sel.selectOption({ label: "Married" }); else await dlg.getByRole("option", { name: "Married" }).click();
    await dlg.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(1200); await settle(page); say(`after (${who})`, await q.innerText());
  }
  await shot(page, "06-married-answered");
}
if (phase === "marriage") {
  await upload(page, "Sample Spouse A", "Marriage certificate copy", "sample-marriage.pdf", "07-spouse-marriage-line-received");
  const d = await drawer(page, P["Sample Spouse A"], "relationship.union_start_date", "08-spouse-drawer-cost-card");
  await d.getByRole("button", { name: /Replay the saved read/ }).click(); await page.waitForTimeout(2000); await settle(page);
  say("drawer after replay", await d.innerText()); await shot(page, "09-marriage-replayed");
  const use = d.locator("[data-confirm-and-use]").first(); say("confirm disabled before tick", await use.isDisabled());
  for (const t of await d.locator("[data-tick]").all()) await t.check();
  await use.click(); await page.waitForTimeout(2000); await settle(page);
  say("drawer after confirm", await d.innerText()); await shot(page, "10-marriage-confirmed-and-used");
}
if (phase === "sheet") { // the next capability's first step (C7.3, the online form's answer sheet), by its link on the case page
  for (const [who, n] of [["Sample Client A", "11"], ["Sample Spouse A", "12"]]) {
    await page.goto(`/cases/${caseId}`); await settle(page);
    const link = page.getByRole("link", { name: new RegExp(`Open answer sheet: IMM 5257 for ${who}`) }).first();
    await link.scrollIntoViewIfNeeded(); await shot(page, `${n}a-prepare-answer-sheet-link-${who.split(" ")[1].toLowerCase()}`, page.locator("[data-online-form]").first());
    await link.click(); await settle(page); await page.waitForTimeout(800);
    const body = await page.locator("body").innerText(); (await import("node:fs")).writeFileSync(`${OUT}/sheet-${who.split(" ")[1].toLowerCase()}.txt`, body);
    for (const re of [/[^\n]*[Ff]unds?[^\n]*\n?[^\n]*/g, /[^\n]*(marri|union|common-law)[^\n]*\n?[^\n]*/gi, /[^\n]*[Mm]arital[^\n]*\n?[^\n]*/g]) say(`sheet ${who} ${re.source.slice(0, 20)}`, (body.match(re) ?? []).join(" || "));
    const row = page.locator("tr, li, [data-sheet-row]").filter({ hasText: /14200|14,200|2019-06-14/ });
    say(`rows with the read values (${who})`, (await row.allInnerTexts()).join(" || "));
    if (await row.count()) { await row.first().scrollIntoViewIfNeeded(); }
    await shot(page, `${n}b-answer-sheet-${who.split(" ")[1].toLowerCase()}`);
  }
}
if (phase === "clienta-union") { // the same marriage, on Client A's Personal details
  const d = await drawer(page, P["Sample Client A"], "relationship.union_start_date", "13-client-a-personal-details-drawer");
  const q = page.locator(`#a-${P["Sample Client A"]}-relationship-union_start_date`); say("Client A's union question", await q.innerText().catch(() => "not on the page"));
}
if (phase === "minor") { // setup typed by the officer in the Agent view (not C6.5): the application date, and the child travels with one parent
  const typeIn = async (subject, fact, who, fill) => {
    await page.goto(`/cases/${caseId}#a-${subject}-${fact.replace(/[^a-z0-9_]/gi, "-")}`); await settle(page);
    const q = page.locator(`#a-${subject}-${fact.replace(/[^a-z0-9_]/gi, "-")}`);
    await q.getByRole("button", { name: /^(Add|Edit) / }).click();
    const dlg = page.locator("[role=dialog]"); await dlg.waitFor(); say(`dialog ${fact}`, await dlg.innerText());
    await fill(dlg); await dlg.getByRole("button", { name: "Save" }).click(); await page.waitForTimeout(1200); await settle(page);
    say(`after ${fact}`, await q.innerText());
  };
  await typeIn(CASE_SUBJECT, "case.application_date", "the application", async (d) => { await d.getByLabel("Day").fill("20"); await d.getByLabel("Month").fill("11"); await d.getByLabel("Year").fill("2026"); });
  await typeIn(P["Sample Child A1"], "person.travels_with", "Sample Child A1", async (d) => { await d.getByLabel("One parent").check(); });
}
if (phase === "birth") {
  await upload(page, "Sample Child A1", "Copy of the minor's birth certificate", "sample-birth-certificate.pdf", "14-child-birth-certificate-line-received");
  await drawer(page, P["Sample Child A1"], "person.date_of_birth", "15-child-personal-details-drawer-read-by-a-person");
}
if (phase === "sheet-funds") { // the funds row on Client A's IMM 5257 answer sheet, read from the proof of funds
  await page.goto(`/cases/${caseId}`); await settle(page);
  await page.getByRole("link", { name: /Open answer sheet: IMM 5257 for Sample Client A/ }).first().click(); await settle(page); await page.waitForTimeout(800);
  const row = page.locator("tr").filter({ hasText: "Funds available for the stay" }).first();
  await row.scrollIntoViewIfNeeded(); await page.mouse.wheel(0, -250); await page.waitForTimeout(300);
  say("funds row", await row.innerText()); await shot(page, "11c-answer-sheet-client-funds-source");
}
if (phase === "look") { // read-only: one address, one screenshot
  await page.goto(process.env.URL); await settle(page); await page.waitForTimeout(600);
  say("page", await page.locator(process.env.SEL ?? "body").first().innerText()); await shot(page, process.env.NAME ?? "look", process.env.SEL ? page.locator(process.env.SEL).first() : undefined);
}
console.log("ERRORS", JSON.stringify(errs));
await b.close();
