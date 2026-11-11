// M4 (A19 (j), master plan 08-monitoring.md): the smoke walk run after every demo update (.github/workflows/demo-update.yml).
// A person's journey by screens, read-only: the copy's health (GET /api/health, M1), then by role — the Configuration
// author's Immigration programs; the Case officer's Cases, the finished-story case and its forms (Prepare application);
// Client A's questionnaire on that case. It presses no button (no priced button, no write, live AI untouched) and only
// opens pages. Each screen fails on: a script error on the page, a server error (5xx) from /api, an error notice
// ("could not be loaded", "went wrong", …), or the screen's own content not appearing within 20 s. The first screen that
// breaks ends the walk, named in the output and in $GITHUB_STEP_SUMMARY, with a screenshot when --shots is given.
// The case: the finished story's (reference SAMPLE-VV-FAMILY-1, Demo › Load the finished story); with no finished story
// on the copy, the newest case; with no case at all, the case screens are skipped and said so (a reset demo is not broken).
//   node studio/tools/demo-smoke.mjs [--base http://localhost:4400] [--shots <dir>] [--timeout-ms 20000]
// Exit 0 every screen worked · 1 a screen broke (named) · 2 the walk could not run (no browser). US$0, no model call.
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const BASE = arg("--base", "http://localhost:4400").replace(/\/$/, ""), SHOTS = arg("--shots", ""), WAIT = Number(arg("--timeout-ms", "20000"));
const STORY_REF = "SAMPLE-VV-FAMILY-1";
const AUTHOR = "user-A", OFFICER = "user-O";
const t0 = Date.now(), lines = [], writes = [];
const say = (l) => { lines.push(l); console.log(l); };
const summary = (title, rows) => {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, [`### ${title}`, ...rows.map((r) => `- ${r}`), ""].join("\n") + "\n"); } catch { /* the summary is a convenience */ }
};
const api = async (path, actor) => {
  const r = await fetch(`${BASE}/api${path}`, { headers: actor ? { "x-actor": actor } : {} });
  return { status: r.status, body: await r.json().catch(() => null) };
};
class Broke extends Error { constructor(screen, why) { super(`${screen}: ${why}`); this.screen = screen; this.why = why; } }

/** One screen: open `path` as `actor`, wait for `expect` (a locator maker), let the page's reads settle (at most 5 s),
 *  and fail on errors met on the way. `later`: what a later screen of the same page owns (its reads, by path, and its
 *  section), so a break there is named by that screen, not this one. */
async function screen(page, name, actor, path, expect, extra, later = null) {
  const errors = [], server = [];
  const onError = (e) => errors.push(String(e?.message ?? e).split("\n")[0].slice(0, 200));
  const onResponse = (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/") && r.status() >= 500 && !later?.reads.test(u.pathname)) server.push(`${r.request().method()} ${u.pathname} answered ${r.status()}`); };
  page.on("pageerror", onError); page.on("response", onResponse);
  const started = Date.now();
  try {
    await page.evaluate((a) => localStorage.setItem("xr-actor", a), actor);
    const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: WAIT });
    if (!res || res.status() >= 400) throw new Broke(name, `the page answered ${res?.status() ?? "nothing"}`);
    const want = expect(page);
    const appeared = await want.first().waitFor({ state: "visible", timeout: WAIT }).then(() => true, () => false);
    if (appeared) await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    // A failed read shows as a danger notice (role=alert) with these words (web/src: "could not be loaded", "could not
    // be opened", "could not load", "went wrong"); a script error or a 5xx is a break even when the content appeared.
    const alertSel = later ? `[role="alert"]:not(${later.section} [role="alert"])` : '[role="alert"]';
    const alerts = (await page.locator(alertSel).allInnerTexts().catch(() => [])).map((t) => t.split("\n")[0].trim()).filter((t) => /could not|cannot be (loaded|opened)|went wrong|failed to/i.test(t));
    if (errors.length) throw new Broke(name, `a script error on the page: ${errors[0]}`);
    if (server.length) throw new Broke(name, `a server error: ${server[0]}`);
    if (alerts.length) throw new Broke(name, `the page shows "${alerts[0].slice(0, 160)}"`);
    if (!appeared) throw new Broke(name, `${want.toString().replace(/^locator\(/, "").slice(0, 120)} did not appear within ${WAIT / 1000} s`);
    if (extra) await extra(page);
    if (errors.length) throw new Broke(name, `a script error on the page: ${errors[0]}`);
    if (server.length) throw new Broke(name, `a server error: ${server[0]}`);
    say(`PASS  ${name} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  } catch (e) {
    if (SHOTS) { try { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, "broke.png"), fullPage: false }); } catch { /* best effort */ } }
    throw e instanceof Broke ? e : new Broke(name, String(e?.message ?? e).split("\n")[0].slice(0, 200));
  } finally { page.off("pageerror", onError); page.off("response", onResponse); }
}

async function walk() {
  // 1. The copy's health (M1): a database down, a full disk or a stuck fill queue named before any page opens.
  const h = await api("/health").catch((e) => ({ status: 0, body: { error: e.message } }));
  if (h.status !== 200) {
    const parts = (h.body?.failing ?? []).map((k) => `${k} — ${h.body?.checks?.[k]?.words ?? ""}`).join("; ");
    throw new Broke("Health (/api/health)", h.status === 0 ? `the copy does not answer (${h.body?.error})` : `${h.status}: ${parts || JSON.stringify(h.body).slice(0, 200)}`);
  }
  say(`PASS  Health (/api/health): commit ${String(h.body?.sha ?? "").slice(0, 9)}, ${h.body?.checks?.disk?.free_gb} GB free, ${h.body?.checks?.fill_queue?.waiting ?? 0} copies in the fill queue`);

  // The case to walk, from the case officer's own list (the same read as the Cases screen).
  const list = await api("/runtime/cases", OFFICER);
  const rows = Array.isArray(list.body?.cases) ? list.body.cases : [];
  const story = rows.find((c) => c.reference === STORY_REF) ?? null;
  const theCase = story ?? [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] ?? null;

  const executablePath = process.platform !== "darwin" && existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
  let browser;
  try { browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : executablePath ? { executablePath } : {}) }); }
  catch (e) { const err = new Error(`no browser could start: ${String(e?.message ?? e).split("\n")[0]}`); err.cannotRun = true; throw err; }
  try {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    // Read-only: every write a page makes is listed (none expected); none is pressed by the walk itself.
    page.on("request", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/") && !["GET", "HEAD"].includes(r.method())) writes.push(`${r.method()} ${u.pathname}`); });
    await page.goto(`${BASE}/api/session`, { timeout: WAIT }); // the origin, so the simulated person can be chosen

    // 2. Configuration author: Immigration programs.
    await screen(page, "Immigration programs (/), as the Configuration author", AUTHOR, "/", (p) => p.getByRole("heading", { level: 1, name: "Immigration programs" }));
    // 3. Case officer: Cases.
    await screen(page, "Cases (/cases), as the Case officer", OFFICER, "/cases", (p) => p.getByRole("heading", { level: 1, name: "Cases" }),
      theCase ? async (p) => { if (!(await p.getByText(theCase.reference, { exact: true }).first().isVisible().catch(() => false))) throw new Broke("Cases (/cases), as the Case officer", `the case ${theCase.reference} is not in the list`); } : undefined);
    if (!theCase) { say("SKIP  Case page, Forms and Client questionnaire: no case on this copy (Demo › Load the finished story adds one)"); return { story: false, skipped: true }; }
    if (!story) say(`NOTE  no finished story on this copy: walking the newest case, ${theCase.reference}`);
    // 4. The case page.
    const casePath = `/cases/${theCase.id}`;
    const FORMS = 'section[aria-labelledby="forms-h"]';
    await screen(page, `Case page (${casePath}, ${theCase.reference})`, OFFICER, casePath, (p) => p.getByRole("heading", { level: 1 }).filter({ hasText: theCase.reference }),
      undefined, { reads: /^\/api\/runtime\/cases\/[^/]+\/forms$/, section: FORMS });
    // 5. Its forms: Prepare application on the case page, loaded with at least one form (or the words that none applies).
    await screen(page, `Forms (Prepare application on ${theCase.reference})`, OFFICER, casePath, (p) => p.locator(`${FORMS} li, ${FORMS} p:has-text("No form applies")`),
      async (p) => {
        const sec = p.locator(FORMS);
        const forms = await sec.locator("li").count();
        if (story && forms === 0) throw new Broke(`Forms (Prepare application on ${theCase.reference})`, "the finished story's case lists no form");
        say(`NOTE  ${forms} form rows on ${theCase.reference}`);
      });
    // 6. The client: the questionnaire on that case, as the case's own client login.
    const view = await api(`/runtime/cases/${theCase.id}/questionnaire?mode=agent`, OFFICER);
    const client = view.body?.case?.client;
    if (typeof client === "string" && client) {
      const qPath = `/cases/${theCase.id}/questionnaire`;
      await screen(page, `Client questionnaire (${qPath}), as the case's client`, client, qPath, (p) => p.locator("main").getByRole("heading").first());
    } else say(`SKIP  Client questionnaire: the case view names no client (${view.status})`);
    return { story: !!story, skipped: false };
  } finally { await browser.close().catch(() => {}); }
}

let code = 0;
try {
  const r = await walk();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  say(`SMOKE PASS in ${secs} s${r.story ? "" : r.skipped ? " (no case on the copy)" : " (no finished story: newest case)"}`);
  if (writes.length) say(`NOTE  the pages made ${writes.length} write(s) by themselves: ${[...new Set(writes)].slice(0, 5).join(", ")}`);
  summary("Smoke walk: every screen works", [...lines.filter((l) => !l.startsWith("SMOKE")).map((l) => l.replace(/^(\w+)\s+/, "$1 · ")), `${secs} s`]);
} catch (e) {
  if (e?.cannotRun) { code = 2; say(`SMOKE NOT RUN: ${e.message}`); summary("Smoke walk: not run", [e.message]); }
  else {
    code = 1;
    const screenName = e instanceof Broke ? e.screen : "the walk", why = e instanceof Broke ? e.why : String(e?.message ?? e);
    say(`BROKE  ${screenName} — ${why}`);
    say(`SMOKE FAIL: broke at ${screenName}`);
    summary(`Smoke walk: BROKE at ${screenName}`, [why, ...lines.filter((l) => l.startsWith("PASS")).map((l) => `worked · ${l.slice(6)}`), SHOTS ? `screenshot: ${join(SHOTS, "broke.png")}` : ""].filter(Boolean));
  }
}
process.exit(code);
