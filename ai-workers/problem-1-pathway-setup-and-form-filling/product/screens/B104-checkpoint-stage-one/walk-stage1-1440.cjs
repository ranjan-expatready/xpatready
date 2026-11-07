// B104 (P-351): journey J7 Stage 1 walked like a person at 1440 px on a fresh configured checkpoint, screens only.
// Row A1 of the M3 sprint plan (6 Nov): the walk is journey J-A1. Since #1085 the checkpoint makes Visitor visa's release 2
// (IMM 5257 Online, so IMM 5645 replaces IMM 5707): 1.1 reads "In Release 2", 1.3a is a note (IMM 5645's signer is row
// A3), 2.1 opens a case for the family of four (the principal, then a partner and two children by the case page's Add
// buttons) and the walk ends at 4.4, an override without a label or reason refused on its fields.
//   node walk-stage1-1440.cjs <port> <out dir>
// Stage 0.1 through the Demo menu (Reset demo, then Load the configured checkpoint) as the author; then Stage 1 as the
// author on Immigration programs › Visitors › Visitor visa (1.1 the release and "Filed through", 1.2–1.3 who fills, from
// what age and who signs, 1.5 the IRCC account); 1.8 has no authoring screen (row B106), so its result is read where a
// person meets it; then the next capability's first step (P-348 (3)): the case officer opens a case on Visitor visa
// (2.1), the case reads "Filed through APR Portal" (2.3), and its Eligibility page runs a case check (4.1) instead of
// refusing it. Writes walk.json (one line per step, exit 1 if any step is missing) and a screenshot per step. Live AI
// off, US$0: no priced button is pressed. Never port 4400.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const [port, out] = process.argv.slice(2);
if (!port || port === "4400") { console.error("usage: node walk-stage1-1440.cjs <port, never 4400> <out dir>"); process.exit(2); }
const base = `http://127.0.0.1:${port}`;
fs.mkdirSync(out, { recursive: true });
const steps = [];
const note = (j7, what, seen, detail = "") => { steps.push({ j7, what, seen: !!seen, detail }); console.log(`${seen ? "SEEN   " : "MISSING"} J7 ${j7}  ${what}${detail ? ` — ${detail}` : ""}`); };
// A step with no screen to check is written down as a note, never counted as seen (review m5 on #1084).
const aside = (j7, what, detail = "") => { steps.push({ j7, what, note: true, detail }); console.log(`NOTE    J7 ${j7}  ${what}${detail ? ` — ${detail}` : ""}`); };
(async () => {
  // A copy whose Playwright differs from the installed browser names it (cloud: PW_CHROMIUM=/opt/pw-browsers/chromium).
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  // A 4xx a step expects (4.4's refusal) is allowed by that step; any other is an error (its URL is written down).
  let expect4xx = null, overridesKept = 0;
  page.on("response", (r) => { if (/\/runtime\/assessments\/[^/]+\/override$/.test(r.url()) && r.request().method() === "POST" && r.status() < 300) overridesKept++;
     if (r.status() >= 400 && !(expect4xx && expect4xx.test(r.url()) && r.status() === 400)) errors.push(`response ${r.status()} ${r.request().method()} ${r.url().replace(base, "")}`); });
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 300)}`); });
  const shot = (n) => page.screenshot({ path: path.join(out, `${n}.png`), fullPage: true });
  const text = async (loc = page.locator("body")) => (await loc.innerText()).replace(/\s+/g, " ");
  const as = async (actor, url) => { await page.evaluate((a) => localStorage.setItem("xr-actor", a), actor); await page.goto(base + url); await page.waitForLoadState("networkidle"); };
  await page.goto(base + "/");
  await as("user-A", "/");

  // 0.1: Demo › Reset demo…, then Demo › Load the configured checkpoint…
  await page.getByRole("button", { name: /^Demo/ }).click();
  await page.getByRole("menuitem", { name: /Reset demo/ }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Type RESET to confirm").fill("RESET", { timeout: 30000 });
  // The reset's own answer ends the step (the dialog then shows its result, which a person closes by moving on).
  const reset = page.waitForResponse((r) => r.url().endsWith("/api/demo/reset") && r.request().method() === "POST", { timeout: 300000 });
  await dlg.getByRole("button", { name: /Reset/ }).last().click();
  const rr = await reset;
  if (rr.status() >= 300) throw new Error(`Reset demo answered ${rr.status()}`);
  await as("user-A", "/");
  await page.getByRole("button", { name: /^Demo/ }).click();
  await page.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
  const t0 = Date.now();
  await page.getByRole("dialog").getByRole("button", { name: /Load the configured checkpoint/ }).click();
  await page.getByRole("dialog", { name: /Configured checkpoint loaded/ }).waitFor({ timeout: 1_200_000 });
  await shot("0-1-checkpoint-loaded");
  note("0.1", "Demo › Reset, then Load the configured checkpoint, through the menu", true, `${Math.round((Date.now() - t0) / 1000)} s`);
  await page.getByRole("button", { name: "Continue" }).click();

  // 1.1: Immigration programs › Visitor visa, release 2 (release 1 carries the Stage 1 parts; release 2 keeps them).
  await as("user-A", "/");
  await page.getByRole("button", { name: "Visitor visa", exact: true }).first().click();
  await page.waitForURL(/\/c\/[^/]+/, { timeout: 30000 }); await page.waitForLoadState("networkidle");
  const combo = page.url().match(/\/c\/([^/?#]+)/)[1];
  await page.getByRole("heading", { name: /Visitor visa/ }).first().waitFor({ timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await page.getByText(/Released versions: Release \d+/).first().waitFor({ timeout: 30000 }).catch(() => {});
  const head = await text();
  // J-A1 reads "In Release 2"; this page numbers releases by the workspace's release pack (combination.tsx row.release.pack),
  // while a case names the combination's own version (2.1a below). So 1.1 checks that Visitor visa is live on the newer of
  // its two releases, the pack it names being the one Released versions shows, with one earlier.
  const inPack = head.match(/In Release (\d+)/)?.[1], lastPack = head.match(/Released versions: Release (\d+)/)?.[1];
  note("1.1", "Visitor visa opens on its newer release (In Release N, one earlier)", !!inPack && inPack === lastPack && /Released versions: Release \d+[^·]*· 1 earlier/.test(head), (head.match(/In Release \d+[^·]{0,40}/)?.[0] ?? "no 'In Release'") + " · " + (head.match(/Released versions: Release \d+[^·]*· 1 earlier/)?.[0] ?? "no '1 earlier'"));
  await shot("1-1-visitor-visa");

  // 1.2–1.3 and 1.5: the Forms tab.
  await as("user-A", `/c/${combo}/forms`);
  const row = async (code) => { const r = page.locator(`tr[data-line="${code}"]`); return (await r.count()) ? await text(r.first()) : ""; };
  const r5257 = await row("IMM 5257"), r5645 = await row("IMM 5645"), r5707 = await row("IMM 5707"), r5476 = await row("IMM 5476"), rSch1 = await row("IMM 5257 SCH1");
  note("1.2", "IMM 5476: signed by the person and the representative", /The person and the representative/.test(r5476), r5476.slice(0, 220));
  // Release 2 retires IMM 5707 for IMM 5645, whose signer is not set yet: row A3 of the M3 sprint plan (#1084's question, 5 Nov).
  note("1.3a", "Release 2 files IMM 5645 (each person from 18) in place of IMM 5707", /18\+/.test(r5645) && (!r5707 || /retired|removed/i.test(r5707)), `IMM 5645: ${r5645.slice(0, 120)} · IMM 5707: ${r5707 ? r5707.slice(0, 80) : "no row"}`);
  aside("1.3a-signer", "IMM 5645's signer is not set on release 2: row A3", "#1084's question, 5 Nov 21:01Z; the plan's row A3");
  note("1.3b", "IMM 5257: a parent signs for a minor", /A parent, for a minor/.test(r5257), r5257.slice(0, 220));
  note("1.3c", "IMM 5257 SCH1: children from 18 (its signer left unset, for the expert)", /children 18\+/.test(rSch1) && /Not set/.test(rSch1), rSch1.slice(0, 220));
  const acct = page.getByRole("combobox", { name: "IRCC account this combination files through" });
  const chosen = (await acct.count()) ? await acct.evaluate((s) => s.options[s.selectedIndex]?.text ?? "") : "";
  note("1.5", "IRCC account: APR Portal", /APR Portal/.test(chosen), chosen);
  const wide = await page.evaluate(() => ({ page: document.scrollingElement.scrollWidth, view: window.innerWidth }));
  note("1.2w", "The Forms tab has no sideways page scroll at 1440 px (its table scrolls inside itself)", wide.page <= wide.view, `${wide.page} px wide in a ${wide.view} px window`);
  await shot("1-2-forms-tab");

  // 1.8: no authoring screen yet (B106); the gates are read where a person meets them, at 4.1 below.
  aside("1.8", "Eligibility gates: no authoring screen (row B106); set by the checkpoint, read on the case at 4.1 below", "allow-listed route, tech lead's ruling on #1084");

  // Next capability's first step (P-348 (3)): the case officer opens a case on Visitor visa (2.1).
  await as("user-O", "/cases");
  await page.getByRole("button", { name: /Open a case/ }).first().click();
  const d = page.getByRole("dialog");
  const sel = d.getByRole("combobox", { name: /Combination/ });
  await sel.waitFor({ timeout: 20000 });
  const vv = (await sel.locator("option").allInnerTexts()).find((o) => /Visitor visa/.test(o));
  note("2.1a", "Open a case offers Visitor visa, release 2", /release 2\b/.test(vv ?? ""), vv ?? "");
  if (vv) await sel.selectOption({ label: vv });
  await d.getByLabel(/Case reference/).fill("B104-WALK-1");
  await d.getByLabel(/Principal applicant's name/).fill("Sample Client A");
  const rep = d.getByRole("combobox", { name: /Representative of record/ });
  if ((await rep.locator("option").count()) > 1) await rep.selectOption({ index: 1 });
  await shot("2-1-open-a-case");
  await d.getByRole("button", { name: /Open the case|Open case|^Open$/ }).last().click();
  await page.waitForURL(/\/cases\/[^/]+$/, { timeout: 30000 }); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1000);
  const caseUrl = page.url();
  const c = await text();
  note("2.1b", "The case opens on Visitor visa", /Visitor visa/.test(c), caseUrl);
  note("2.3", "\"Filed through APR Portal\" read-only on the case", /Filed through APR Portal|through the APR Portal/i.test(c), c.match(/[^.]{0,40}Filed through[^.]{0,40}/i)?.[0] ?? "");
  // 2.1c: the family of four, by the case page's Add buttons (one per role the release allows).
  const added = [];
  for (const [role, name] of [[/partner|spouse/i, "Sample Partner B"], [/child/i, "Sample Child C"], [/child/i, "Sample Child D"]]) {
    const btn = page.locator("button[data-add-role]").filter({ hasText: role }).first();
    if (!(await btn.waitFor({ timeout: 15000 }).then(() => true, () => false))) break;
    await btn.click();
    const ad = page.getByRole("dialog"); await ad.getByLabel("Name").fill(name);
    await ad.getByRole("button", { name: "Add", exact: true }).click(); await ad.waitFor({ state: "detached", timeout: 15000 });
    await page.locator("section[aria-labelledby=people]").getByText(name, { exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
    added.push(name);
  }
  const ppl = await text(page.locator("section[aria-labelledby=people]"));
  note("2.1c", "The family of four is on the case: the principal, a partner and two children", added.length === 3 && ["Sample Client A", ...added].every((n) => ppl.includes(n)), `${added.length} added; ` + ppl.replace(/^.*?Add child \(travelling\) /, "").slice(0, 220));
  await shot("2-3-case");

  // 4.1: the case's Eligibility page runs a check (on main it is refused: "no eligibility rules yet").
  await page.goto(caseUrl + "/eligibility"); await page.waitForLoadState("networkidle");
  const runBtn = page.getByRole("button", { name: "Run eligibility check" });
  // On a release with no gates the page shows "No eligibility rules yet" and no Run button: that is the step missing.
  await page.getByText(/Run eligibility check|No eligibility rules yet/).first().waitFor({ timeout: 20000 });
  if (await runBtn.count()) {
    await runBtn.click();
    await page.getByText(/Possibly eligible|Likely eligible|Not eligible/i).first().waitFor({ timeout: 30000 });
  }
  const el = await text();
  note("4.1a", "Run eligibility check gives a result, not a refusal", /Possibly eligible/i.test(el) && !/No eligibility rules yet/.test(el), el.match(/[^.]{0,30}(Possibly eligible|No eligibility rules yet)[^.]{0,80}/)?.[0] ?? "");
  note("4.1b", "The four officer's-judgement lines are listed, never gates", ["enough money", "good health", "back home", "leave Canada"].every((w) => el.includes(w)));
  await shot("4-1-eligibility");

  // 4.4 (C6.9): an override without a label or a reason is refused on its fields, and nothing is kept.
  expect4xx = /\/runtime\/assessments\/[^/]+\/override$/;
  await page.getByRole("button", { name: /Override result/ }).first().click();
  const ov = page.getByRole("dialog");
  await ov.getByRole("button", { name: "Keep the override" }).click();
  await ov.getByRole("alert").first().waitFor({ timeout: 15000 }).catch(() => {});
  const labelBad = await ov.getByLabel("Label").getAttribute("aria-invalid"), reasonBad = await ov.getByLabel("Reason").getAttribute("aria-invalid"), ovText = await text(ov);
  const open = await ov.isVisible();
  await shot("4-4-override-refused");
  await ov.getByRole("button", { name: "Cancel" }).click(); await ov.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  note("4.4", "Override without a label or reason: refused on both fields, the panel stays open, nothing is kept", labelBad === "true" && reasonBad === "true" && open && overridesKept === 0,
    `${ovText.match(/Give a label[^.]*\./)?.[0] ?? "no label error"} ${ovText.match(/Give a reason[^.]*\./)?.[0] ?? "no reason error"} · overrides kept: ${overridesKept}`);

  fs.writeFileSync(path.join(out, "walk.json"), JSON.stringify({ port: Number(port), caseUrl, steps, errors }, null, 1));
  const counted = steps.filter((s) => !s.note);
  console.log(`seen ${counted.filter((s) => s.seen).length}/${counted.length} steps, ${steps.length - counted.length} note; errors: ${errors.length}`); errors.slice(0, 10).forEach((e) => console.log("  " + e));
  await browser.close();
  process.exit(counted.every((s) => s.seen) && !errors.length ? 0 : 1);
})().catch(async (e) => { console.error("WALK STOPPED:", e.message); fs.writeFileSync(path.join(out, "walk.json"), JSON.stringify({ stopped: e.message, steps }, null, 1)); process.exit(1); });
