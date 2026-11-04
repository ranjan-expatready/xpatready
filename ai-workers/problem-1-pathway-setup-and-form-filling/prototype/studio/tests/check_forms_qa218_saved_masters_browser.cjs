// QA-218 (C3.4, P-138, P-149 (1), P-120; forms lane): a person starts the Saved AI masters run from a screen. On a fresh
// isolated copy reset to the six, at 1440 px, as the configuration author:
//  - a form's door is Library › Forms › its ⋯ › Re-read with AI (a form's masters are per edition): IMM 5257 (09-2023)
//    shows "Saved · US$0", IMM 5707 (no saved run) does not;
//  - the guide's door is Visitor visa › Forms (its run belongs to the combination; the tab lists each form once, S5 fix 1):
//    Guide 5256 shows "Saved · US$0".
// A click replays the run (no model call, US$0) and its form checks, document types and guide checks wait on To review;
// once drafted, the row says so and offers no second Saved. One masters request per view (review M1). No priced button.
//   zsh studio/tools/isolated.sh forms_qa218 4458 start && node studio/tests/check_forms_qa218_saved_masters_browser.cjs 4458 xr_studio_forms_qa218
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4458), DB = process.argv[3] ?? "xr_studio_forms_qa218", BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql"].find((p) => fs.existsSync(p)) ?? "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, failed = 0;
const step = (name, c, detail) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const spent = () => Number(sql("select coalesce(sum(cost_usd),0) from drafting_job") || 0);
// The masters steps: the rules' sections and lists (masters_edition), a form's AI checks and document types (masters_form)
// and a guide's AI checks (masters_guide).
const proposals = () => Number(sql("select count(*) from proposal_item where step in ('masters_edition','masters_form','masters_guide')"));

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const consoleErrors = []; p.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  // Review M1 (STANDARDS §5: one request per screen view, not per row): the masters requests each view sends.
  let asks = []; p.on("request", (r) => { if (/\/draft-masters\/plan|\/masters-readings?\b/.test(r.url())) asks.push(r.url().replace(/^.*\/api/, "")); });
  const call = async (method, pth, json) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, ...(json ? { data: json } : {}), timeout: 600000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  // Setup: Demo › Reset to the six, by its own route (the same one request the menu sends).
  const six = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  step("setup: Reset to the six", six.status === 201, six.status);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const att = (file) => sql(`select id from source_attachment where combination_id='${vv}' and lower(file_name)=lower('${file}') limit 1`);
  const before = spent();
  const liveBefore = Number(sql("select count(*) from drafting_job where mode='LIVE'"));
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  const settled = () => p.waitForFunction(() => { const r = [...document.querySelectorAll("[data-form-masters] [data-form-masters-row]")]; return r.length > 0 && r.every((x) => x.getAttribute("data-masters-saved") !== "asking"); }, null, { timeout: 30000 });
  const openReread = async (code) => {
    await p.goto(`${BASE}/library/forms`);
    const trigger = p.getByRole("button", { name: new RegExp(`^Actions for ${code}$`) });
    await trigger.waitFor({ timeout: 60000 });
    asks = [];
    await trigger.click();
    await p.getByRole("menuitem", { name: /Re-read with AI/ }).click();
    const panel = p.locator("[data-form-masters]");
    await panel.waitFor({ timeout: 30000 });
    await settled();
    return panel;
  };

  // ---- A form's door: Library › Forms › IMM 5257 › Re-read with AI.
  let panel = await openReread("IMM 5257");
  const libRow = panel.locator('[data-form-masters-row="IMM 5257"]');
  step("QA-218 pass: Library › IMM 5257 › Re-read with AI offers Saved · US$0 beside the rules button", (await libRow.getByRole("button", { name: "Saved · US$0" }).count()) === 1 && (await libRow.getByRole("button", { name: /Draft sections and lists · US\$0/ }).count()) === 1);
  step("QA-218 fail→pass (review M1): the dialog asks for the masters state once", asks.length === 1 && asks[0] === `/attachments/${att("imm5257e.pdf")}/masters-reading`, asks);
  const priced = await panel.getByRole("button").evaluateAll((els) => els.map((e) => e.textContent ?? "").filter((t) => /Live|US\$(?!0\b)/.test(t)));
  step("QA-218 fail: the panel offers no Live or priced button (P-175: live AI is off)", priced.length === 0, priced);
  const axe = await new AxeBuilder({ page: p }).include("[data-form-masters]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("QA-218 pass: axe finds no WCAG 2.2 AA violation in the panel", axe.violations.length === 0, axe.violations.map((v) => v.id));
  const n0 = proposals();
  await libRow.getByRole("button", { name: "Saved · US$0" }).click();
  const st = libRow.getByRole("status");
  await st.waitFor({ timeout: 120000 });
  const n1 = proposals();
  step("QA-218 pass: one click on Saved drafts IMM 5257's masters and says how many wait on To review", n1 > n0 && new RegExp(`Saved AI draft \\(US\\$0\\): ${n1 - n0} proposals? wait on To review`).test(await st.innerText()), [n1 - n0, await st.innerText()]);
  step("QA-218 fail→pass (review m3): after Saved, focus is on the row's Open Proposals, not lost to the page", await p.evaluate(() => document.activeElement?.textContent === "Open Proposals" && !!document.activeElement.closest('[data-form-masters-row="IMM 5257"]')));
  const kinds = sql(`select string_agg(distinct kind, ',' order by kind) from proposal_item where step in ('masters_edition','masters_form') and created_at > now() - interval '10 minutes'`);
  step("QA-218 pass: the Saved draft brings form checks and document types (not only the rules' sections and lists)", /form_check/.test(kinds) && /document_type/.test(kinds), kinds);
  const job = sql(`select mode||'|'||status||'|'||cost_usd from drafting_job where kind='masters_edition' and attachment_id='${att("imm5257e.pdf")}' and (detail->>'ai')='true' order by started_at desc limit 1`);
  step("QA-218 pass: the run is a Saved replay that completed at US$0 (no model call)", /^REPLAY\|COMPLETED\|0(\.0+)?$/.test(job), job);
  const href = await st.getByRole("link", { name: "Open Proposals" }).getAttribute("href");
  const group = decodeURIComponent(new URL(href ?? "/", BASE).searchParams.get("group") ?? "");
  const q = await call("GET", `/review/proposals?group=${encodeURIComponent(group)}`);
  const items = Object.values(q.body?.group?.bands ?? {}).flat();
  step("QA-218 pass: Open Proposals is IMM 5257's edition group in To review, holding its AI form checks", /^edition:IMM 5257 \(/.test(group) && items.some((x) => x.kind === "form_check"), [group, items.length]);

  // ---- A form with no saved run: Saved is not offered, and the door refuses it.
  panel = await openReread("IMM 5707");
  const noRow = panel.locator('[data-form-masters-row="IMM 5707"]');
  step("QA-218 fail: IMM 5707 (no saved masters run) has no Saved button and says so", (await noRow.getByRole("button", { name: "Saved · US$0" }).count()) === 0 && /No Saved AI draft of its checks yet/.test(await noRow.innerText()));
  step("QA-218 fail: the API refuses Saved where no saved run exists (IMM 5707: 409)", (await call("POST", `/attachments/${att("imm5707e.pdf")}/draft-masters`, { mode: "replay" })).status === 409);

  // ---- The guide's door: Visitor visa › Forms (each form still listed once there).
  asks = [];
  await p.goto(`${BASE}/c/${vv}/forms`);
  panel = p.locator("[data-form-masters]");
  await panel.waitFor({ timeout: 60000 });
  await settled();
  const rows = await panel.locator("[data-form-masters-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-form-masters-row")));
  step("QA-218 pass: Visitor visa › Forms shows the guide only (forms are listed once, S5 fix 1), with Saved · US$0", rows.length === 1 && /^Guide 5256/.test(rows[0]) && (await panel.getByRole("button", { name: "Saved · US$0" }).count()) === 1 && (await panel.getByRole("button", { name: /Draft sections and lists/ }).count()) === 0, rows);
  step("QA-218 fail→pass (review M1): the Forms tab asks for the masters state once per view, never once per row", asks.length === 1 && asks[0] === `/combinations/${vv}/masters-readings`, asks);
  const g0 = proposals();
  await panel.getByRole("button", { name: "Saved · US$0" }).click();
  const gs = panel.getByRole("status");
  await gs.waitFor({ timeout: 120000 });
  step("QA-218 pass: Saved on Guide 5256 drafts its checks into To review", proposals() > g0 && /Saved AI draft \(US\$0\): \d+ proposals? wait on To review/.test(await gs.innerText()), await gs.innerText());
  const gHref = await gs.getByRole("link", { name: "Open Proposals" }).getAttribute("href");
  step("QA-218 pass: the guide's Open Proposals opens Visitor visa's own group", decodeURIComponent(gHref ?? "").endsWith(`group=combination:${vv}`), gHref);

  // ---- Once drafted: a reload says so and offers no second Saved (review m4); the door drafts nothing more (P-138).
  const n2 = proposals();
  await p.reload(); await panel.waitFor({ timeout: 60000 }); await settled();
  step("QA-218 fail→pass (review m4): after a reload, the guide says it is drafted with AI and offers no second Saved", (await panel.getByRole("button", { name: "Saved · US$0" }).count()) === 0 && /Drafted with AI \(Saved, US\$0\)/.test(await panel.innerText()));
  panel = await openReread("IMM 5257");
  step("QA-218 fail→pass (review m4): IMM 5257's dialog says it is drafted with AI and offers no second Saved", (await panel.getByRole("button", { name: "Saved · US$0" }).count()) === 0 && /Drafted with AI \(Saved, US\$0\)/.test(await panel.innerText()));
  const again = await call("POST", `/attachments/${att("imm5257e.pdf")}/draft-masters`, { mode: "replay" });
  step("QA-218 fail: a second Saved request proposes nothing more and returns the one draft (P-138)", proposals() === n2 && again.status < 300 && again.body?.already === true, [again.status, again.body?.already]);

  // ---- Review m2: a combination whose guide page is not drafted by AI (With an LMIA – inside Canada) shows no panel,
  // asks once and logs no failed request.
  asks = []; consoleErrors.length = 0;
  const lmia = sql("select id from combination where label ilike '%With an LMIA%inside Canada%' limit 1");
  const answered = p.waitForResponse((r) => r.url().endsWith(`/combinations/${lmia}/masters-readings`), { timeout: 60000 });
  await p.goto(`${BASE}/c/${lmia}/forms`);
  const r = await answered;
  await p.getByRole("tablist", { name: "Combination" }).waitFor({ timeout: 60000 });
  step("QA-218 fail→pass (review m2): With an LMIA › Forms asks once, gets 200, shows no panel and logs no failed request", asks.length === 1 && r.status() === 200 && (await p.locator("[data-form-masters]").count()) === 0 && consoleErrors.length === 0, [asks, r.status(), consoleErrors]);
  step("QA-218 pass: nothing was spent and no Live job ran (US$0)", spent() === before && Number(sql("select count(*) from drafting_job where mode='LIVE'")) === liveBefore, [before, spent()]);
  step("no page errors", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
