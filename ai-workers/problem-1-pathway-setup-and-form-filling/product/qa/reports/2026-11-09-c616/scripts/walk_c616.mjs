// qa gate A walk of C6.16 by screens (P-317, P-348 (3)). Client A (user-P, 390 px), Partner on their own link (390 px, a
// separate browser with no simulated person), the case officer (user-O, 1440 px). Every press is a Playwright click or a
// keyboard entry on what the page shows; the only API reads are the "underneath" lines marked [under]. Ends at the next
// capability's first step: C7.1 "Generate a copy" of Partner's form on Prepare application, made from Partner's own answers.
//   node walk_c616.mjs <port> <caseId> <outDir> <run>
import { chromium } from "playwright";
const [port, id, out, run] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${port}`;
const ADDRESS = `partner.${run}@example.com`, NEWADDR = `partner.new.${run}@example.com`;
const BY_A = `by.client.a.${run}@example.com`, SECRET = `Privatetown${run}`;
const T = { timeout: 20000 };
const b = await chromium.launch({ channel: "chrome" });
const errors = [];
const watch = (p, who) => { p.on("pageerror", (e) => errors.push(`${who} pageerror ${String(e).slice(0, 200)}`)); p.on("response", (r) => { if (r.status() >= 500) errors.push(`${who} ${r.status()} ${r.url()}`); }); };
let n = 0;
const shot = async (p, name) => { n++; const f = `${out}/${String(n).padStart(2, "0")}-${name}.png`; await p.screenshot({ path: f, fullPage: true }); console.log(`[shot] ${f.split("/").pop()}`); };
const say = (k, v) => console.log(`[${k}] ${String(v).replace(/\s+/g, " ").slice(0, 1200)}`);
const under = async (path, actor) => { const r = await fetch(`${BASE}/api${path}`, { headers: actor ? { "x-actor": actor } : {} }); return { status: r.status, text: await r.text() }; };
const ctxFor = async (w, h, actor) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, baseURL: BASE, acceptDownloads: true }); if (actor) await c.addInitScript((a) => localStorage.setItem("xr-actor", a), actor); return c; };
try {
  // ---------- A. Client A, 390 px
  const ca = await ctxFor(390, 844, "user-P"); const a = await ca.newPage(); watch(a, "clientA");
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle");
  const about = (who) => a.locator("section", { has: a.getByRole("heading", { name: `About ${who}` }) }).first();
  await about("Sample Partner").getByRole("button", { name: "Send to Sample Partner…" }).waitFor(T);
  say("A1 send buttons", (await a.getByRole("button", { name: /^Send to / }).allInnerTexts()).join(" | "));
  say("A1 child 10 section", (await about("Sample Child 10").innerText()).slice(0, 200));
  await about("Sample Partner").scrollIntoViewIfNeeded(); await shot(a, "clientA-questionnaire-send-to");
  // A2: Client A answers one of Partner's questions (Contact information › E-mail address)
  await about("Sample Partner").getByRole("button", { name: /^Contact information/ }).click();
  await a.getByText("Answering for Sample Partner").waitFor(T);
  await a.getByLabel("E-mail address").fill(BY_A);
  await shot(a, "clientA-answers-partner-email");
  await a.getByRole("button", { name: "Save and come back later" }).click();
  await a.waitForTimeout(1500); say("A2 after save url", a.url());
  // A3: Send to Sample Partner…
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle");
  await about("Sample Partner").getByRole("button", { name: "Send to Sample Partner…" }).click();
  const dlg = a.getByRole("dialog"); await dlg.waitFor(T);
  say("A3 dialog", await dlg.innerText());
  await dlg.getByRole("button", { name: "Send to Sample Partner" }).click();
  await a.waitForTimeout(600); say("A3 empty send", await dlg.innerText()); await shot(a, "clientA-send-empty-refused");
  await dlg.getByLabel("Sample Partner's email").fill("not an address");
  await dlg.getByRole("button", { name: "Send to Sample Partner" }).click();
  await a.waitForTimeout(600); say("A3 bad address", await dlg.innerText());
  await dlg.getByLabel("Sample Partner's email").fill(ADDRESS);
  await dlg.getByRole("button", { name: "Send to Sample Partner" }).click();
  await about("Sample Partner").locator("[data-link-sent]").waitFor(T);
  say("A3 sent line", await about("Sample Partner").locator("[data-link-sent]").innerText());
  await about("Sample Partner").scrollIntoViewIfNeeded(); await shot(a, "clientA-sent");

  // ---------- B. Partner, 390 px, own browser, no simulated person
  const cp = await ctxFor(390, 844, null); const p = await cp.newPage(); watch(p, "partner");
  await p.goto(`/inbox?address=${encodeURIComponent(ADDRESS)}`); await p.waitForLoadState("networkidle");
  say("B1 inbox", await p.locator("body").innerText()); await shot(p, "partner-demo-inbox");
  await p.getByRole("link", { name: "Open your link" }).click();
  await p.getByRole("heading", { name: "Check it's you" }).waitFor(T);
  say("B1 check it's you", await p.locator("main").innerText()); say("B1 url", p.url()); await shot(p, "partner-check-its-you");
  await p.getByRole("button", { name: "Send me a code" }).click();
  await p.getByLabel("Code (required)").waitFor(T);
  // read the code on the demo inbox page, as the person would in their email
  const ib = await cp.newPage(); await ib.goto(`/inbox?address=${encodeURIComponent(ADDRESS)}`); await ib.waitForLoadState("networkidle");
  const ibText = await ib.locator("body").innerText(); const m = /code is (\d{3}) (\d{3})/.exec(ibText); const code = m ? m[1] + m[2] : "";
  say("B2 inbox with code", ibText); await shot(ib, "partner-inbox-code"); await ib.close();
  await p.getByLabel("Code (required)").fill(code === "000000" ? "111-111" : "000-000");
  await p.getByRole("button", { name: "Continue" }).click();
  await p.getByText("There is a problem").waitFor(T); say("B2 wrong code", await p.locator("main").innerText()); await shot(p, "partner-wrong-code");
  // [under] before the right code: Client A still sees Partner's questions
  const pre = await under(`/runtime/cases/${id}/questionnaire`, "user-P"); say("B2 [under] Client A sees BY_A before the right code", pre.text.includes(BY_A));
  await p.getByLabel("Code (required)").fill(`${code.slice(0, 3)} ${code.slice(3)}`);
  await p.getByRole("button", { name: "Continue" }).click();
  await p.getByRole("heading", { name: "Before you start" }).waitFor(T);
  say("B3 consent", await p.locator("main").innerText()); await shot(p, "partner-consent");
  await p.getByRole("button", { name: "Continue to my questions" }).click();
  await p.getByRole("heading", { name: "Your questions" }).waitFor(T);
  say("B3 overview", await p.locator("main").innerText()); await shot(p, "partner-own-questions");
  // B4: Confirm Client A's answer; answer one question privately
  await p.getByRole("button", { name: /^Contact information/ }).first().click();
  await p.getByText(/Answered by Client A/).first().waitFor(T);
  say("B4 part", (await p.locator("main").innerText()).slice(0, 1500)); await shot(p, "partner-part-with-confirm");
  await p.getByRole("button", { name: /^Confirm: E-mail address/ }).click();
  await p.getByText("Confirmed: it is now your own answer.").waitFor(T);
  const city = p.getByLabel("City or town").first(); await city.fill(SECRET);
  await shot(p, "partner-confirmed-and-private-answer");
  const save = p.getByRole("button", { name: /Save and come back later|^Save$/ }).first();
  say("B4 save button", await save.innerText()); await save.click(); await p.waitForTimeout(1500);
  say("B4 after save", (await p.locator("main").innerText()).slice(0, 600)); await shot(p, "partner-after-save");
  const ag = await under(`/runtime/cases/${id}/questionnaire?mode=agent`, "user-O");
  say("B4 [under] staff sees SECRET", ag.text.includes(SECRET));

  // ---------- C. Client A: progress only
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle");
  await about("Sample Partner").locator("[data-private-progress]").waitFor(T);
  const prog = await about("Sample Partner").innerText(); say("C1 Partner card", prog);
  say("C1 page shows BY_A or SECRET", (await a.content()).includes(BY_A) || (await a.content()).includes(SECRET));
  say("C1 buttons in Partner card", (await about("Sample Partner").getByRole("button").allInnerTexts()).join(" | "));
  await about("Sample Partner").scrollIntoViewIfNeeded(); await shot(a, "clientA-progress-only");
  await a.goto(`/cases/${id}/questionnaire?part=43`); await a.waitForLoadState("networkidle"); await a.waitForTimeout(800);
  say("C2 Client A by URL ?part=43", (await a.locator("main").innerText()).slice(0, 600)); await shot(a, "clientA-partner-part-by-url");
  const qa = await under(`/runtime/cases/${id}/questionnaire`, "user-P"); say("C2 [under] Client A API carries BY_A/SECRET", qa.text.includes(BY_A) || qa.text.includes(SECRET));

  // ---------- D. Case officer, 1440 px
  const co = await ctxFor(1440, 900, "user-O"); const o = await co.newPage(); watch(o, "officer");
  await o.goto(`/cases/${id}`); await o.waitForLoadState("networkidle");
  const panel = o.locator("section", { has: o.getByRole("heading", { name: "Own links and privacy" }) }).first();
  await panel.waitFor(T); say("D1 panel", await panel.innerText());
  await panel.scrollIntoViewIfNeeded(); await panel.screenshot({ path: `${out}/${String(++n).padStart(2, "0")}-officer-own-links-panel.png` }); console.log("[shot] officer-own-links-panel");
  const row = panel.locator("[data-person]").filter({ hasText: "Sample Partner" }).first();
  await row.getByRole("button", { name: "Take back…" }).click();
  const td = o.getByRole("dialog"); await td.waitFor(T);
  await td.getByRole("button", { name: "Take back" }).click(); await o.waitForTimeout(500); say("D2 empty reason", await td.innerText());
  await shot(o, "officer-take-back-empty-refused");
  await td.getByLabel(/Why/).fill("Partner asked the firm to stop the link (Sample, qa gate A)");
  await td.getByRole("button", { name: "Take back" }).click();
  await row.getByText(/Taken back/).waitFor(T); say("D2 row after take back", await row.innerText());
  await panel.screenshot({ path: `${out}/${String(++n).padStart(2, "0")}-officer-taken-back.png` }); console.log("[shot] officer-taken-back");
  // D3: Client A after the take back (F12 (a)): still progress only
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle"); await a.waitForTimeout(1200);
  say("D3 Client A Partner card after take back", await about("Sample Partner").innerText());
  say("D3 Client A buttons", (await about("Sample Partner").getByRole("button").allInnerTexts()).join(" | "));
  await about("Sample Partner").scrollIntoViewIfNeeded(); await shot(a, "clientA-after-take-back");
  // D4: Partner's link after take back
  await p.goto(`/link`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  say("D4 partner dead link", await p.locator("main").innerText()); await shot(p, "partner-link-taken-back");
  // D5: F12 (b): only staff send to a new address. Client A's options first, then the officer's.
  say("D5 officer row buttons", (await row.getByRole("button").allInnerTexts()).join(" | "));
  const newBtn = row.getByRole("button", { name: /new address/ });
  if (await newBtn.count()) {
    await newBtn.first().click(); const nd = o.getByRole("dialog"); await nd.waitFor(T); say("D5 dialog", await nd.innerText());
    const box = nd.getByRole("textbox").first(); await box.fill(NEWADDR);
    const reason = nd.getByLabel(/Why/); if (await reason.count()) await reason.fill("Partner gave the firm a new address (Sample)");
    await shot(o, "officer-send-new-address");
    await nd.getByRole("button", { name: /^Send/ }).last().click(); await o.waitForTimeout(1500);
    say("D5 row after new address", await row.innerText());
    const inb = await under(`/demo/inbox?address=${encodeURIComponent(NEWADDR)}`, null); say("D5 [under] new inbox messages", inb.text.slice(0, 300));
  }
  // ---------- E. Next capability's first step: C7.1 Generate a copy of Partner's form (Prepare application)
  await o.goto(`/cases/${id}`); await o.waitForLoadState("networkidle");
  const gen = o.getByRole("button", { name: /Generate a copy/ });
  say("E1 generate buttons", await gen.count());
  const rowsText = await o.locator("main").innerText(); const idx = rowsText.indexOf("Prepare application"); say("E1 prepare section", rowsText.slice(idx, idx + 1500));
  // the row of Partner's IMM 5257
  const partnerForm = o.locator("li, article, section, tr, div").filter({ hasText: /IMM 5257.*Sample Partner|Sample Partner.*IMM 5257/ }).filter({ has: o.getByRole("button", { name: /Generate a copy/ }) }).last();
  say("E1 partner form row", (await partnerForm.innerText()).slice(0, 600));
  await partnerForm.getByRole("button", { name: /Generate a copy/ }).first().click();
  await o.waitForTimeout(4000);
  await partnerForm.scrollIntoViewIfNeeded(); await shot(o, "officer-c71-generate-copy-partner");
  say("E1 partner form row after", (await partnerForm.innerText()).slice(0, 800));
} catch (e) { console.log(`[STOP] ${String(e).slice(0, 600)}`); }
say("errors", errors.length ? errors.join(" || ") : "none");
await b.close();
