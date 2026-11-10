// qa re-score of C6.16 after #1453 (QA-359 fix, P-441): gate A by screens, the QA-359 retest, and the gaps the 9 Nov
// verdict named (Resend → re-entry, Client A's own Take back, 1024 px). Client A (user-P, 390 px), Partner (own browser,
// no simulated person, 390 px), the case officer (user-O, 1024 px). Every press is a click or keyboard entry on the page;
// API calls are reads marked [under]. Viewport or element shots only.
//   node walk_c616_qa359.mjs <port> <caseId> <outDir> <run>
import { chromium } from "playwright";
const [port, id, out, run] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${port}`, T = { timeout: 20000 };
const A = `partner.${run}@example.com`, B = `new.partner.${run}@example.com`, BY_A = `by.client.a.${run}@example.com`, SECRET = `Privatestreet${run}`;
const b = await chromium.launch({ channel: "chrome" });
const errors = []; const watch = (p, who) => { p.on("pageerror", (e) => errors.push(`${who} pageerror ${String(e).slice(0, 200)}`)); p.on("response", (r) => { if (r.status() >= 500) errors.push(`${who} ${r.status()} ${r.url()}`); }); };
let n = 0;
const shot = async (p, name, loc) => { n++; const f = `${out}/${String(n).padStart(2, "0")}-${name}.png`; if (loc) { await loc.scrollIntoViewIfNeeded(); await loc.screenshot({ path: f }); } else await p.screenshot({ path: f }); console.log(`[shot] ${f.split("/").pop()}`); };
const say = (k, v) => console.log(`[${k}] ${String(v).replace(/\s+/g, " ").slice(0, 1400)}`);
const under = async (path, actor) => { const r = await fetch(`${BASE}/api${path}`, { headers: actor ? { "x-actor": actor } : {} }); return { status: r.status, text: await r.text() }; };
const msgs = async (addr) => JSON.parse((await under(`/demo/inbox?address=${encodeURIComponent(addr)}`, null)).text).messages ?? [];
const links = async (addr) => (await msgs(addr)).filter((m) => m.kind === "link").map((m) => m.link);
const ctxFor = async (w, h, actor) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, baseURL: BASE }); if (actor) await c.addInitScript((a) => localStorage.setItem("xr-actor", a), actor); return c; };
const enterWithCode = async (cp, p, addr, tag) => {
  // the person opens the newest link from their inbox page, asks for a code, reads it on the inbox page, enters it
  const ib = await cp.newPage(); await ib.goto(`/inbox?address=${encodeURIComponent(addr)}`); await ib.waitForLoadState("networkidle");
  say(`${tag} inbox`, await ib.locator("body").innerText()); await shot(ib, `${tag}-inbox`);
  await ib.getByRole("link", { name: "Open your link" }).first().click();
  await ib.getByRole("heading", { name: "Check it's you" }).waitFor(T); say(`${tag} check`, await ib.locator("main").innerText());
  await ib.getByRole("button", { name: "Send me a code" }).click(); await ib.getByLabel("Code (required)").waitFor(T);
  const ib2 = await cp.newPage(); await ib2.goto(`/inbox?address=${encodeURIComponent(addr)}`); await ib2.waitForLoadState("networkidle");
  const m = /code is (\d{3}) (\d{3})/.exec(await ib2.locator("body").innerText()); await ib2.close();
  await ib.getByLabel("Code (required)").fill(m ? `${m[1]}-${m[2]}` : "");
  await ib.getByRole("button", { name: "Continue" }).click();
  await Promise.race([ib.getByRole("heading", { name: "Before you start" }).waitFor(T), ib.getByRole("heading", { name: "Your questions" }).waitFor(T)]);
  if (await ib.getByRole("heading", { name: "Before you start" }).count()) { say(`${tag} consent`, await ib.locator("main").innerText()); await shot(ib, `${tag}-consent`); await ib.getByRole("button", { name: "Continue to my questions" }).click(); await ib.getByRole("heading", { name: "Your questions" }).waitFor(T); }
  say(`${tag} questions`, (await ib.locator("main").innerText()).slice(0, 500)); await shot(ib, `${tag}-own-questions`);
  return ib;
};
try {
  const ca = await ctxFor(390, 844, "user-P"); const a = await ca.newPage(); watch(a, "clientA");
  const about = (who) => a.locator("section", { has: a.getByRole("heading", { name: `About ${who}` }) }).first();
  const card = () => about("Sample Partner");
  // 1. Client A answers one Partner question, then sends to A
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle");
  await card().getByRole("button", { name: /^Contact information/ }).click(); await a.getByText("Answering for Sample Partner").waitFor(T);
  await a.getByLabel("E-mail address").fill(BY_A); await a.getByRole("button", { name: "Save and come back later" }).click(); await a.waitForTimeout(1200);
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle");
  await card().getByRole("button", { name: "Send to Sample Partner…" }).click();
  const d = a.getByRole("dialog"); await d.getByLabel("Sample Partner's email").fill(A); await d.getByRole("button", { name: "Send to Sample Partner" }).click();
  await card().locator("[data-link-sent]").waitFor(T); say("1 sent", await card().innerText()); await shot(a, "clientA-sent-to-A", card());
  // 2. Partner enters from inbox A
  const cp = await ctxFor(390, 844, null); const p1 = await enterWithCode(cp, null, A, "partner-A"); watch(p1, "partner");
  // Partner answers privately (street of the mailing address) in Contact information
  await p1.getByRole("button", { name: /^Contact information/ }).first().click(); await p1.getByText(/Answered by Client A/).first().waitFor(T);
  await p1.getByRole("button", { name: /^Confirm: E-mail address/ }).click(); await p1.getByText("Confirmed: it is now your own answer.").waitFor(T);
  await p1.getByLabel("Street name").first().fill(SECRET); await p1.getByRole("button", { name: "Save and come back later" }).click(); await p1.waitForTimeout(1200);
  // 3. Officer, 1024 px: Own links and privacy, Send to a new address B
  const co = await ctxFor(1024, 900, "user-O"); const o = await co.newPage(); watch(o, "officer");
  await o.goto(`/cases/${id}`); await o.waitForLoadState("networkidle");
  const panel = o.locator("section", { has: o.getByRole("heading", { name: "Own links and privacy" }) }).first();
  const row = panel.locator("[data-person]").filter({ hasText: "Sample Partner" }).first();
  await row.waitFor(T); say("3 officer row before", await row.innerText()); await shot(o, "officer-1024-panel-before", panel);
  await row.getByRole("button", { name: /new address/ }).click();
  const nd = o.getByRole("dialog"); await nd.waitFor(T); await nd.getByRole("textbox").first().fill(B);
  await shot(o, "officer-1024-send-new-address"); await nd.getByRole("button", { name: /^Send to the new address/ }).click();
  await row.getByText(/address given by Case officer/).waitFor(T); say("3 officer row after", await row.innerText()); await shot(o, "officer-1024-row-after-new-address", panel);
  const lA0 = (await links(A)).length, lB0 = await links(B); say("3 [under] link emails at A / at B", `${lA0} / ${lB0.length}`);
  // 4. Client A: the line says where Resend goes; press Resend
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle"); await card().locator("[data-private-progress]").waitFor(T);
  say("4 Client A card before Resend", await card().innerText()); say("4 buttons", (await card().getByRole("button").allInnerTexts()).join(" | "));
  await shot(a, "clientA-card-says-where-resend-goes", card());
  await card().getByRole("button", { name: "Resend" }).click(); await a.waitForTimeout(1500);
  const toast = await a.locator("[data-sonner-toast], [role=status], [role=alert]").allInnerTexts().catch(() => []); say("4 after Resend (toasts)", toast.join(" | "));
  say("4 Client A card after Resend", await card().innerText()); await shot(a, "clientA-after-resend");
  const lA1 = (await links(A)).length, lB1 = await links(B);
  say("4 [under] link emails at A before/after", `${lA0} → ${lA1}`); say("4 [under] link emails at B before/after", `${lB0.length} → ${lB1.length}; same link: ${lB1.length > 1 && lB1.every((x) => x === lB1[0])}`);
  const st = JSON.parse((await under(`/runtime/cases/${id}/people/privacy`, "user-O")).text).people?.find((x) => x.label === "Sample Partner");
  say("4 [under] officer list Partner link", JSON.stringify({ state: st?.link?.state, given_by: st?.link?.given_by, masked: st?.link?.email_masked, resend: st?.resend }));
  // 5. Partner re-enters by the newest email at B (the old browser session is gone: a new browser)
  const cp2 = await ctxFor(390, 844, null); const p2 = await enterWithCode(cp2, null, B, "partner-B"); watch(p2, "partner-B");
  const own2 = await p2.locator("main").innerText(); say("5 re-entry sees own parts, no one else", /About you/.test(own2) && !/Sample Client A|Sample Child/.test(own2));
  await p2.getByRole("button", { name: /^Contact information/ }).first().click(); await p2.waitForTimeout(1200);
  say("5 own private answer still there", (await p2.getByLabel("Street name").first().inputValue()) === SECRET); await shot(p2, "partner-B-own-answer-kept");
  // old link at A is dead: Partner's first browser
  await p1.goto(`/link`); await p1.waitForLoadState("networkidle"); await p1.waitForTimeout(800); say("5 first browser /link", await p1.locator("main").innerText()); await shot(p1, "partner-A-first-browser-after-readdress");
  // 6. Client A still progress only; Client A's own Take back
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle"); await card().locator("[data-private-progress]").waitFor(T);
  say("6 Client A card", await card().innerText()); say("6 page carries BY_A or SECRET", (await a.content()).includes(BY_A) || (await a.content()).includes(SECRET));
  say("6 buttons", (await card().getByRole("button").allInnerTexts()).join(" | "));
  const tb = card().getByRole("button", { name: /^Take back/ });
  if (await tb.count()) {
    await tb.first().click(); const td = a.getByRole("dialog"); await td.waitFor(T); say("6 Client A take back dialog", await td.innerText()); await shot(a, "clientA-take-back-dialog");
    await td.getByRole("button", { name: /^Take back/ }).last().click(); await a.waitForTimeout(1500);
    say("6 Client A card after own take back", await card().innerText()); await shot(a, "clientA-after-own-take-back", card());
    await p2.goto(`/link`); await p2.waitForLoadState("networkidle"); await p2.waitForTimeout(800); say("6 Partner after Client A's take back", await p2.locator("main").innerText()); await shot(p2, "partner-after-clientA-take-back");
    say("6 [under] Client A API carries BY_A/SECRET", ((t) => t.includes(BY_A) || t.includes(SECRET))((await under(`/runtime/cases/${id}/questionnaire`, "user-P")).text));
  } else say("6 Client A take back", "not offered");
  await o.reload(); await o.waitForLoadState("networkidle"); say("6 officer row now", await row.innerText()); await shot(o, "officer-1024-row-end", panel);
  // 7. Next capability's first step (C7.1) at 1024 px: Generate a copy of Partner's IMM 5257
  const fr = o.locator("li[data-row-form]", { has: o.getByRole("heading", { name: "IMM 5257 for Sample Partner", exact: true }) }).first();
  await fr.waitFor(T); say("7 row before", await fr.innerText());
  await fr.getByRole("button", { name: /Generate a copy/ }).click(); await fr.getByText(/form fields? written/).first().waitFor({ timeout: 60000 });
  say("7 row after", await fr.innerText()); await shot(o, "officer-1024-c71-partner-imm5257-copy", fr);
  const forms = JSON.parse((await under(`/runtime/cases/${id}/forms`, "user-O")).text); const list = Array.isArray(forms) ? forms : forms.forms ?? [];
  const pf = list.find((f) => f.form === "IMM 5257" && f.person === "Sample Partner");
  say("7 [under] Partner IMM 5257", JSON.stringify({ person: pf?.person, draft: pf?.draft, copy: pf?.copies?.[0] && { id: pf.copies[0].id, status: pf.copies[0].status, counts: pf.copies[0].counts, intact: pf.copies[0].intact } }));
} catch (e) { console.log(`[STOP] ${String(e).slice(0, 700)}`); }
say("errors", errors.length ? errors.join(" || ") : "none");
await b.close();
