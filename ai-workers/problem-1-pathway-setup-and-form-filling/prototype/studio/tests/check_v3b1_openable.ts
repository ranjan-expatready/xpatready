// C6.1, V3 B1 (runtime side, P-297 (3)): the "Open a case" dialog offers only a release a case can open on. GET
// /runtime/openable answers each not retired combination's newest release with the startable check that opening a case
// runs (`Programs.startableMissing`), so the dialog and the server say the same thing; opening a case keeps refusing a
// release that is not startable (409, unchanged; the release gate is the screens' F2 row). The officer reads one plain
// sentence (no field keys or author's steps), the same as the 409's. The Not ready state is made the way S4 makes it
// (check_s4_startable.ts): a library field the release reads is retired, so one of its rules no longer resolves; it is
// restored at the end whatever happened. API, then the dialog in a real browser at 1440 and 400 px with axe. US$0.
//   zsh studio/tools/isolated.sh runtime_openable 4431 start && tsx studio/tests/check_v3b1_openable.ts 4431 xr_studio_runtime_openable
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_runtime_openable", BASE = `http://localhost:${PORT}`;
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const studio = join(import.meta.dirname, "..");
const SHOTS = join(studio, "..", "..", "product", "screens", "C6.1-open-case", "screenshots", "v3b1-openable"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
const OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A";
const FIELD = "case.funds_available_cad"; // read by the release's form fields and its check VV_FUNDS_ABOVE_ZERO (as S4)
type Openable = { combination_id: string; combination: string; version: number; startable: boolean; items: number; why: string | null };

async function axe(p: Page, what: string) {
  const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`C6.1 axe: ${what} has no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id}: ${x.nodes[0]?.target}`));
}
const noSideScroll = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
/** The officer opens the dialog from Cases; waits loudly until the list of releases has answered. */
async function openDialog(p: Page) {
  await p.goto(`${BASE}/cases`); await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: "Open a case" }).click();
  const d = p.getByRole("dialog", { name: "Open a case" });
  await d.waitFor({ timeout: 30_000 });
  // Loaded once the combination list or one of its notices shows (fails loudly on a timeout).
  await d.getByLabel("Combination (released)").or(d.getByTestId("not-ready-for-cases")).or(d.getByText("Nothing is released yet")).first().waitFor({ timeout: 30_000 });
  return d;
}

(async () => {
  if (sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") === "0") {
    const r = spawnSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { encoding: "utf8", timeout: 600_000, maxBuffer: 1 << 26 });
    ok("setup: the Visitor visa released on this copy (setup_visitor_visa.ts)", r.status === 0, r.stderr?.slice(-200));
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const newest = Number(sql(`select max(version) from config_release where combination_id='${vv}'`));
  const was = sql(`select status from canonical_field where canonical_field_key='${FIELD}'`);
  const audited = (what: string) => sql(`insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), workspace_id, 'user-A', 'updated', 'field', '${FIELD}', 'V3 B1 check: ${what} ${FIELD}' from canonical_field where canonical_field_key='${FIELD}'`);
  const list = async (actor = OFFICER) => { const r = await call("GET", "/runtime/openable", undefined, actor); return { status: r.status, rows: (Array.isArray(r.body) ? r.body : []) as Openable[] }; };
  const open = (ref: string) => call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: CLIENT, principal: { displayName: "Sample Client B1" }, representative: "user-R", caseOfficers: [OFFICER] }, OFFICER);
  const cases = () => Number(sql(`select count(*) from runtime_case where combination_id='${vv}'`));

  // API: who may read it.
  ok("C6.1-B1-1 fail: a client cannot read which releases open cases (403)", (await list(CLIENT)).status === 403);
  ok("C6.1-B1-2 fail: a configuration author (no case duty) cannot read it either (403)", (await list(AUTHOR)).status === 403);

  // Live: listed as startable, on its newest release, and a case opens.
  let l = await list();
  let row = l.rows.find((x) => x.combination_id === vv);
  ok("C6.1-B1-3 pass: a Live combination is listed once, on its newest release, startable, with no reason", l.status === 200 && l.rows.filter((x) => x.combination_id === vv).length === 1 && row?.version === newest && row?.startable === true && row?.items === 0 && row?.why === null, { status: l.status, row });
  let r = await open(`B1-${Date.now().toString(36)}-a`);
  ok("C6.1-B1-4 pass: the listed release opens a case (201): the list and the server agree", r.status === 201, r.status);
  const released = sql("select string_agg(distinct r.combination_id::text, ',' order by r.combination_id::text) from config_release r join combination c on c.id = r.combination_id where c.retired_at is null");
  ok("C6.1-B1-5 pass: every not retired released combination is listed exactly once, and nothing else (never a retired one, never one with no release)", [...l.rows.map((x) => x.combination_id)].sort().join(",") === released, { listed: l.rows.length, released: released.split(",").length });

  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
    const p = await ctx.newPage(); const errs: string[] = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), OFFICER);
    let d = await openDialog(p);
    const options = await d.getByLabel("Combination (released)").locator("option").allTextContents();
    ok("C6.1-B1-6 pass (browser): a Live release is offered by name and release, and Open case is enabled", options.some((o) => o.startsWith(`${row?.combination} · release ${newest}`)) && await d.getByRole("button", { name: "Open case" }).isEnabled() && !(await d.getByTestId("not-ready-for-cases").count()), options);
    await p.screenshot({ path: join(SHOTS, "01-live-offered-1440.png") });

    // Not ready: a library field the release reads is retired (as S4) while the dialog is open on it (break m1).
    await d.getByLabel("Combination (released)").selectOption({ label: options.find((o) => o.startsWith(`${row?.combination} · release ${newest}`))! });
    await d.getByLabel("Your own reference (optional)").fill(`B1-${Date.now().toString(36)}-s`); await d.getByLabel(/Principal applicant/).fill("Sample Client B1");
    sql(`update canonical_field set status='RETIRED' where canonical_field_key='${FIELD}'`); audited("retired");
    try {
      const refused = p.waitForResponse((q) => q.url().endsWith("/api/runtime/cases") && q.request().method() === "POST", { timeout: 30_000 });
      await d.getByRole("button", { name: "Open case" }).click();
      const st = (await refused).status();
      await d.getByTestId("not-ready-for-cases").waitFor({ timeout: 30_000 });
      const after = await d.getByLabel("Combination (released)").locator("option").allTextContents();
      ok("C6.1-B1-16 fail (break m1): a release that stops being ready while the dialog is open is refused (409), and the dialog then stops offering it and names it", st === 409 && !after.some((o) => o.startsWith(`${row?.combination} · release`)) && ((await d.getByTestId("not-ready-for-cases").textContent()) ?? "").includes(`${row?.combination} · release ${newest}`), { st, after });
      // Review M1 (d7b9b80f): what the select now shows is what a second Open case sends, and it opens (201).
      const shownId = await d.getByLabel("Combination (released)").inputValue();
      const shownLabel = (await d.getByLabel("Combination (released)").locator("option:checked").textContent()) ?? "";
      const sent = p.waitForRequest((q) => q.url().endsWith("/api/runtime/cases") && q.method() === "POST", { timeout: 30_000 });
      const second = p.waitForResponse((q) => q.url().endsWith("/api/runtime/cases") && q.request().method() === "POST", { timeout: 30_000 });
      await d.getByRole("button", { name: "Open case" }).click();
      const body = JSON.parse((await sent).postData() ?? "{}") as { combinationId?: string };
      const st2 = (await second).status();
      const other = l.rows.find((x) => x.combination_id === shownId);
      ok("C6.1-B1-16a pass (review M1): after the reload, a second Open case sends the combination the select shows (never the dropped one) and opens it (201)", shownId !== vv && body.combinationId === shownId && !!other && shownLabel.startsWith(`${other.combination} · release`) && st2 === 201, { shownId, sent: body.combinationId, shownLabel, st2 });
      await p.waitForURL(/\/cases\/[0-9a-f-]{36}/, { timeout: 30_000 });
      l = await list();
      row = l.rows.find((x) => x.combination_id === vv);
      const before = cases();
      r = await open(`B1-${Date.now().toString(36)}-b`);
      ok("C6.1-B1-7 fail: the same release, now not startable, is listed startable: false with its item count", row?.startable === false && (row?.items ?? 0) >= 1, row);
      ok("C6.1-B1-8 fail (P-297 (3)): opening a case on it keeps refusing (409 \"Not ready for cases\"); no case is written", r.status === 409 && r.body?.title === "Not ready for cases" && cases() === before, { status: r.status, title: r.body?.title });
      ok("C6.1-B1-9 pass: the list's reason is word for word the officer's 409 sentence (one rule, one message)", !!row?.why && row.why === r.body?.detail && (r.body?.missing ?? []).length === row.items, { list: row?.why, refusal: r.body?.detail });
      ok("C6.1-B1-10 fail: the reason carries no field key, form box or author's step (the items are the authors' to fix)", !!row?.why && !/form1\[|\[0\]|case\.[a-z_]+|person\.[a-z_]+|K1|Next step/.test(row.why), row?.why);

      d = await openDialog(p);
      const note = d.getByTestId("not-ready-for-cases");
      const text = (await note.textContent()) ?? "";
      const offered = await d.getByLabel("Combination (released)").locator("option").allTextContents();
      const others = l.rows.filter((x) => x.startable);
      ok("C6.1-B1-11 fail (browser): the not ready release is not offered; the Live ones still are", !offered.some((o) => o.startsWith(`${row?.combination} · release`)) && others.every((x) => offered.some((o) => o.startsWith(`${x.combination} · release ${x.version}`))) && offered.length === others.length, { offered, others: others.map((x) => x.combination) });
      ok("C6.1-B1-12 pass (browser): the dialog names it, its release and the plain reason, under \"Released, not ready for new cases\"", text.includes(`${row?.combination} · release ${newest}`) && text.includes(row?.why ?? "~") && await d.getByText("Released, not ready for new cases").isVisible(), text);
      await axe(p, "the dialog with one release not ready for cases (1440 px)");
      await p.screenshot({ path: join(SHOTS, "02-one-not-ready-1440.png") });
      await p.keyboard.press("Escape");
      // None ready: every other release is answered not startable too (the list is stubbed for this one state, with the
      // server's own row for this combination; the server rule itself is B1-7 to B1-9).
      await p.route("**/api/runtime/openable", (q) => q.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(l.rows.map((x) => x.startable ? { ...x, startable: false, items: 1, why: `"${x.combination}" is not ready for new cases: 1 item to fix in Immigration programs, by the people who set it up. Cases already open are not affected.` } : x)) }));
      d = await openDialog(p);
      ok("C6.1-B1-13 fail (browser): with no release ready there is no combination list and Open case is disabled, saying why", !(await d.getByLabel("Combination (released)").count()) && await d.getByRole("button", { name: "Open case" }).isDisabled() && (await d.getByRole("button", { name: "Open case" }).getAttribute("title")) === "No released combination is ready for new cases yet" && await d.getByText("No released combination is ready for new cases yet").isVisible());
      const posts: string[] = []; p.on("request", (q) => { if (q.method() === "POST" && q.url().endsWith("/api/runtime/cases")) posts.push(q.url()); });
      await d.getByLabel("Your own reference (optional)").fill("B1-ENTER"); await d.getByLabel("Your own reference (optional)").press("Enter"); await p.waitForTimeout(500);
      ok("C6.1-B1-13a fail (browser): pressing Enter in the form sends nothing while no release is ready", posts.length === 0, posts.length);
      await axe(p, "the dialog with no release ready for cases (1440 px)");
      await p.screenshot({ path: join(SHOTS, "03-none-ready-1440.png") });
      await p.setViewportSize({ width: 400, height: 850 }); await p.waitForTimeout(300);
      ok("C6.1 400 px: the dialog with no release ready has no sideways scroll", await noSideScroll(p));
      await axe(p, "the dialog with no release ready for cases (400 px)");
      await p.screenshot({ path: join(SHOTS, "04-none-ready-400.png") });
      await p.keyboard.press("Escape"); await p.setViewportSize({ width: 1440, height: 900 }); await p.unroute("**/api/runtime/openable");
      // Break m2: a 200 that is not a list (a proxy's HTML page) is "could not load", not a blank app.
      await p.route("**/api/runtime/openable", (q) => q.fulfill({ status: 200, contentType: "text/html", body: "<html><body>proxy</body></html>" }));
      const errsBefore = errs.length;
      await p.goto(`${BASE}/cases`); await p.waitForLoadState("networkidle"); await p.getByRole("button", { name: "Open a case" }).click();
      d = p.getByRole("dialog", { name: "Open a case" });
      await d.getByText("Could not load the released combinations").waitFor({ timeout: 30_000 });
      ok("C6.1-B1-17 fail (break m2): a 200 answer that is not a list shows \"Could not load\" with Open case disabled, and no page error", await d.getByRole("button", { name: "Open case" }).isDisabled() && errs.length === errsBefore, errs.slice(errsBefore));
      await p.keyboard.press("Escape"); await p.unroute("**/api/runtime/openable");
    } finally {
      sql(`update canonical_field set status='${was}' where canonical_field_key='${FIELD}'`); audited("restored");
    }
    l = await list();
    row = l.rows.find((x) => x.combination_id === vv);
    r = await open(`B1-${Date.now().toString(36)}-c`);
    ok("C6.1-B1-14 pass: once the cause is gone it is startable again and a case opens (201)", row?.startable === true && r.status === 201, { row, open: r.status });
    d = await openDialog(p);
    ok("C6.1-B1-15 pass (browser): and the dialog offers it again", (await d.getByLabel("Combination (released)").locator("option").allTextContents()).some((o) => o.startsWith(`${row?.combination} · release ${newest}`)));
    ok("C6.1: no page error in the browser walk", errs.length === 0, errs);
  } finally { await browser.close(); }
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { ok("C6.1-B1: the check ran to its end", false, (e as Error).message); process.exitCode = 1; });
