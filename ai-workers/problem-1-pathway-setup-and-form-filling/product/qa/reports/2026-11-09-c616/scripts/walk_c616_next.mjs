// qa gate A walk of C6.16, part 2, on the same case after walk_c616.mjs: (F) the staff tick path of F12 (a) on the
// child of 19 ("Keep private…"), seen by Client A; (E) the next capability's first step, C7.1: the case officer presses
// "Generate a copy" on Partner's IMM 5257 under Prepare application, then the copy is read underneath ([under]).
//   node walk_c616_next.mjs <port> <caseId> <outDir> <run> <firstShotNo>
import { chromium } from "playwright";
const [port, id, out, run, first] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${port}`; const T = { timeout: 20000 };
const BY_A = `by.client.a.${run}@example.com`, SECRET = `Privatetown${run}`;
const b = await chromium.launch({ channel: "chrome" });
const errors = []; const watch = (p, who) => { p.on("pageerror", (e) => errors.push(`${who} pageerror ${String(e).slice(0, 200)}`)); p.on("response", (r) => { if (r.status() >= 500) errors.push(`${who} ${r.status()} ${r.url()}`); }); };
let n = Number(first) - 1;
const shot = async (p, name, loc) => { n++; const f = `${out}/${String(n).padStart(2, "0")}-${name}.png`; if (loc) { await loc.scrollIntoViewIfNeeded(); await loc.screenshot({ path: f }); } else await p.screenshot({ path: f, fullPage: true }); console.log(`[shot] ${f.split("/").pop()}`); };
const say = (k, v) => console.log(`[${k}] ${String(v).replace(/\s+/g, " ").slice(0, 1500)}`);
const under = async (path, actor) => { const r = await fetch(`${BASE}/api${path}`, { headers: actor ? { "x-actor": actor } : {} }); return { status: r.status, text: await r.text() }; };
const ctxFor = async (w, h, actor) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, baseURL: BASE }); if (actor) await c.addInitScript((a) => localStorage.setItem("xr-actor", a), actor); return c; };
try {
  const o = await (await ctxFor(1440, 900, "user-O")).newPage(); watch(o, "officer");
  const a = await (await ctxFor(390, 844, "user-P")).newPage(); watch(a, "clientA");
  const aboutA = (who) => a.locator("section", { has: a.getByRole("heading", { name: `About ${who}` }) }).first();
  // F: Client A answers one of the child of 19's questions first, so the tick has something to hide
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle");
  await aboutA("Sample Child 19").getByRole("button", { name: /^Contact information/ }).click();
  await a.getByText("Answering for Sample Child 19").waitFor(T);
  await a.getByLabel("E-mail address").fill(`child19.by.a.${run}@example.com`);
  await a.getByRole("button", { name: "Save and come back later" }).click(); await a.waitForTimeout(1200);
  await o.goto(`/cases/${id}`); await o.waitForLoadState("networkidle");
  const panel = o.locator("section", { has: o.getByRole("heading", { name: "Own links and privacy" }) }).first();
  const r19 = panel.locator("[data-person]").filter({ hasText: "Sample Child 19" }).first();
  await r19.getByRole("button", { name: "Keep private…" }).click();
  const kd = o.getByRole("dialog"); await kd.waitFor(T); say("F1 keep private dialog", await kd.innerText());
  await kd.getByRole("button", { name: /^Keep private/ }).last().click(); await o.waitForTimeout(500); say("F1 empty reason", await kd.innerText());
  await shot(o, "officer-keep-private-empty-refused");
  await kd.getByLabel(/Why/).fill("Sample Child 19 asked the firm for privacy (Sample, qa gate A)");
  await kd.getByRole("button", { name: /^Keep private/ }).last().click();
  await r19.getByText(/Private from Client A/).waitFor(T); say("F1 row after tick", await r19.innerText());
  say("F1 row buttons", (await r19.getByRole("button").allInnerTexts()).join(" | "));
  await shot(o, "officer-child19-kept-private", panel);
  await a.goto(`/cases/${id}/questionnaire`); await a.waitForLoadState("networkidle"); await a.waitForTimeout(1200);
  say("F2 Client A child 19 card", await aboutA("Sample Child 19").innerText());
  say("F2 [under] Client A API carries child 19's email", (await under(`/runtime/cases/${id}/questionnaire`, "user-P")).text.includes(`child19.by.a.${run}`));
  await shot(a, "clientA-child19-progress-only", aboutA("Sample Child 19"));

  // E: C7.1's first step for Partner's form
  await o.goto(`/cases/${id}`); await o.waitForLoadState("networkidle");
  const row = o.locator("li[data-row-form]", { has: o.getByRole("heading", { name: "IMM 5257 for Sample Partner", exact: true }) }).first();
  await row.waitFor(T); say("E1 row before", await row.innerText()); await shot(o, "officer-c71-partner-imm5257-before", row);
  await row.getByRole("button", { name: /Generate a copy/ }).click();
  await row.getByText(/Copy of|copy of|Generated|Download/).first().waitFor({ timeout: 60000 }).catch(() => {});
  await o.waitForTimeout(2500);
  say("E1 row after", await row.innerText()); await shot(o, "officer-c71-partner-imm5257-copy-made", row);
  const forms = await under(`/runtime/cases/${id}/forms`, "user-O");
  let mine = null; try { const j = JSON.parse(forms.text); const list = Array.isArray(j) ? j : (j.forms ?? j.items ?? []); mine = list.filter((f) => JSON.stringify(f).includes("Sample Partner") && /5257"|IMM 5257(?! SCH)/.test(JSON.stringify(f))); } catch {}
  say("E2 [under] forms status", forms.status);
  say("E2 [under] Partner IMM 5257 copy", JSON.stringify(mine)?.slice(0, 1500));
  say("E2 [under] forms JSON mentions BY_A / SECRET", `${forms.text.includes(BY_A)} / ${forms.text.includes(SECRET)}`);
  // the client's view of forms after privacy (wrong role underneath)
  const cf = await under(`/runtime/cases/${id}/forms`, "user-P"); say("E3 [under] Client A GET forms", `${cf.status} carries BY_A/SECRET: ${cf.text.includes(BY_A) || cf.text.includes(SECRET)}`);
} catch (e) { console.log(`[STOP] ${String(e).slice(0, 600)}`); }
say("errors", errors.length ? errors.join(" || ") : "none");
await b.close();
