// F2 C2.12 (forms lane; concept §4 "Return strip" and m1, m2, K1): a form's guided path and To review, walked in a browser.
// To review reads ?form= (only that form's items, counts and kinds; "Show every form" clears it) and ?c= (that
// combination's items and the library-wide ones, as the path counts them). Every link the rail gives carries the way back
// (?form=&c=): the page it opens shows "Setting up IMM 5257 on <combination> · Step n of 6 …" and "Back to the steps",
// which reopens the rail with focus on its current step. A pass and a fail per rule; axe (WCAG 2.2 AA) at 1440, 1024 and
// 390 px; no sideways scroll at 390. US$0: one saved AI answer replayed, no model call.
//   zsh studio/tools/isolated.sh forms_c212t 4453 start && node studio/tests/check_forms_c212_to_review_browser.cjs 4453 xr_studio_forms_c212t
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4453), DB = process.argv[3] ?? "xr_studio_forms_c212t";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "F3-add-form-wizard", "screenshots", "c212"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(detail).slice(0, 300)}` : ""}`); };
function pdf(title, text) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`; objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs = []; objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", ...(init.json !== undefined ? { "content-type": "application/json" } : {}) }, data: init.json !== undefined ? JSON.stringify(init.json) : undefined, multipart: init.multipart }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  const queue = async (extra = "", actor = "user-A") => (await api(`/review-queue?filter=all${extra}`, { actor })).body;
  const shot = async (name) => { for (const w of [1440, 1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150); await p.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`), fullPage: true }); } await p.setViewportSize({ width: 1440, height: 900 }); };
  const axe = async (label) => { const bad = []; for (const w of [1440, 1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150); const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); bad.push(...r.violations.map((v) => `${w}px ${v.id}: ${v.nodes.length}`)); } await p.setViewportSize({ width: 1440, height: 900 }); step(`axe (WCAG 2.2 AA) at 1440, 1024 and 390 px: ${label}`, bad.length === 0, bad.join("; ")); };
  const sideways = async () => { await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(150); const w = await p.evaluate(() => document.documentElement.scrollWidth); await p.setViewportSize({ width: 1440, height: 900 }); return w; };
  const wait = async (sel, what, ms = 30_000) => { try { await p.locator(sel).first().waitFor({ timeout: ms }); } catch { throw new Error(`never saw ${what} (${sel})`); } };
  const rowIds = async () => p.locator("tr[data-item]").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-item")).sort());
  const q = (u) => new URL(u).searchParams;
  try {
    await api("/demo/reset", { method: "POST", json: { confirm: "RESET" } }); await api("/demo/load", { method: "POST" });
    const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
    const vv = sql("select id from combination where combination_key = 'vv.single' limit 1");
    const svLabel = sql(`select label from combination where id = '${sv}'`);
    // Test input: IMM 5257's saved field-map answer replayed on the Super visa (US$0) ...
    const att = (await api(`/combinations/${sv}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
    const saved = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
    await api(`/attachments/${att.id}/draft`, { method: "POST", json: { mode: "replay", runFile: saved.file } });
    for (let i = 0; i < 150 && !(await queue()).items.some((x) => x.kind === "ai_proposals"); i++) await new Promise((r) => setTimeout(r, 400));
    // ... the same finished draft as a row on the Visitor visa (SQL test input: one draft per file, F3 D4, refuses a second
    // real one), and a held file that belongs to no form.
    const vvJob = sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by, finished_at, detail, cost_usd) select gen_random_uuid(), j.workspace_id, '${vv}', (select a.id from source_attachment a where a.combination_id = '${vv}' and a.edition like 'IMM 5257 (%' limit 1), j.kind, j.mode, j.status, 'user-A', now(), j.detail, 0 from drafting_job j where j.combination_id = '${sv}' and j.kind = 'field_map' and j.status = 'COMPLETED' and j.mode <> 'STUB' order by j.started_at desc limit 1 returning id`).split("\n")[0];
    const held = await api("/intake", { method: "POST", multipart: { files: { name: "unreadable.pdf", mimeType: "application/pdf", buffer: pdf("A letter", "Nothing that names a form") } } });
    if (held.status >= 300) throw new Error(`the held file was not taken in: ${held.status} ${JSON.stringify(held.body)}`);

    // ── API: ?combination= with ?form= (concept K1, as the guided path counts them).
    const every = await queue();
    const one = await queue("&form=IMM%205257");
    const here = await queue(`&form=IMM%205257&combination=${sv}`);
    const svAi = every.items.find((i) => i.kind === "ai_proposals" && i.combination === sv), vvAi = every.items.find((i) => i.id === `job:${vvJob}`);
    step("C2.12 set-up: IMM 5257's AI proposals wait on the Super visa and on the Visitor visa, and a held file belongs to no form", !!svAi && !!vvAi && every.items.some((i) => i.kind === "held_file" && i.forms.length === 0), JSON.stringify(every.items.map((i) => [i.kind, i.combination, i.forms])));
    step("C2.12 K1 pass: ?form=IMM 5257&combination=<Super visa> lists the Super visa's item and no other combination's, with counts of that set", here.items.some((i) => i.id === svAi?.id) && here.items.every((i) => i.forms.includes("IMM 5257") && (i.combination === null || i.combination === sv)) && here.counts.all === here.items.length, JSON.stringify(here.items.map((i) => [i.id, i.combination])));
    step("C2.12 K1 fail: the Visitor visa's item is not on the Super visa's list; ?form= alone still lists both", !here.items.some((i) => i.id === vvAi?.id) && one.items.some((i) => i.id === vvAi?.id) && one.items.some((i) => i.id === svAi?.id));
    const lone = await api(`/review-queue?filter=all&combination=${sv}`);
    step("C2.12 K1 fail: a combination without a form is refused in words (400, naming the field)", lone.status === 400 && /Give the form too/.test(JSON.stringify(lone.body)), JSON.stringify(lone.body));
    const prog = (await api(`/combinations/${sv}/forms/${encodeURIComponent("IMM 5257")}/progress`)).body;
    const reviewStep = prog.steps.find((s) => s.key === "review");
    step("C2.12 D3 pass: the path's review step counts what To review lists for this form on this combination", reviewStep.count === here.items.filter((i) => ["ai_proposals", "proposals", "form_fields"].includes(i.kind)).length && reviewStep.count > 0, `${reviewStep.count} vs ${JSON.stringify(here.kinds)}`);

    // ── To review on screen: ?form= and ?c= (concept m2).
    await p.goto(`${BASE}/`); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
    await p.goto(`${BASE}/review?f=all&form=IMM%205257&c=${sv}`);
    await wait('[data-form-filter="IMM 5257"]', "the form filter line"); await wait("tr[data-item]", "a row");
    const shown = await rowIds();
    step("C2.12 m2 pass: To review opened with ?form=IMM 5257&c= shows the same items as the API, and says it is one form on this combination", JSON.stringify(shown) === JSON.stringify(here.items.map((i) => i.id).sort()) && /Only IMM 5257 on this combination/.test(await p.locator("[data-form-filter]").textContent()), `${shown} vs ${here.items.map((i) => i.id)}`);
    step("C2.12 m2 fail: the held file (no form) and the Visitor visa's draft are not on it", !shown.some((id) => every.items.find((i) => i.id === id)?.kind === "held_file") && !shown.includes(vvAi.id));
    step("C2.12 m2 pass: the counts on the view buttons are this form's", /All · (\d+)/.test(await p.getByRole("group", { name: "Show items" }).textContent()) && Number((await p.getByRole("group", { name: "Show items" }).textContent()).match(/All · (\d+)/)[1]) === here.counts.all);
    // The return strip on To review (opened from the path).
    await wait('[data-return-strip="IMM 5257"]', "the return strip");
    const strip = p.locator("[data-return-strip]");
    step("C2.12 m1 pass: the return strip names the form, the combination and where the path stands, with Back to the steps", new RegExp(`Setting up IMM 5257 on ${svLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · Step \\d of 6`).test(await strip.textContent()) && !/ \d+ open$/.test((await strip.textContent()).replace("Back to the steps", "").trim()) && (await strip.locator("[data-back-to-steps]").getAttribute("href")) === `/c/${sv}/forms?setup=IMM%205257&back=1`, await strip.textContent());
    step("C2.12 no sideways scroll at 390 px with the filter line and the strip", (await sideways()) <= 390);
    await axe("To review for one form, with the return strip"); await shot("10-to-review-one-form");
    // Show every form clears both.
    await p.getByRole("button", { name: "Show every form" }).first().click();
    await p.waitForFunction(() => !new URL(location.href).searchParams.has("form"));
    await wait("tr[data-kind=held_file]", "the held file row");
    step("C2.12 m2 fail: Show every form clears ?form= and ?c=, the strip goes, and every item is back (the held file, the Visitor visa's draft)", !q(p.url()).has("c") && (await p.locator("[data-return-strip]").count()) === 0 && (await p.locator(`tr[data-item="${vvAi.id}"]`).count()) === 1);
    step("C2.12 review m5 fail: after Show every form, focus is on the page's heading (never the page body)", (await p.evaluate(() => document.activeElement?.tagName)) === "H1", await p.evaluate(() => document.activeElement?.tagName));
    // Review m1: a row's step link keeps the way back, so the page it opens shows the strip.
    await p.goto(`${BASE}/review?f=all&form=IMM%205257&c=${sv}`); await wait("tr[data-item] [data-next] a", "a row's step link");
    const rowHref = await p.locator("tr[data-item] [data-next] a").first().getAttribute("href");
    step("C2.12 review m1 fail: a row's step link on To review for one form carries ?form=&c= (before: the strip was lost one click later)", q(new URL(rowHref, BASE).href).get("form") === "IMM 5257" && q(new URL(rowHref, BASE).href).get("c") === sv, rowHref);
    // Review m7: any spelling the library accepts is shown as the library writes it.
    await p.goto(`${BASE}/review?f=all&form=imm5257&c=${sv}`); await wait('[data-form-filter="IMM 5257"]', "the filter line for imm5257");
    step("C2.12 review m7 fail: ?form=imm5257 is shown as IMM 5257 on the filter line, as on the strip", /Only IMM 5257/.test(await p.locator("[data-form-filter]").textContent()));
    // Review m6: a hand-made combination reference never reaches the API path, and never blanks the app.
    const before = errs.length;
    await p.goto(`${BASE}/review?f=all&form=IMM%205257&c=${encodeURIComponent("../../review-queue?x=1#")}`); await p.waitForLoadState("networkidle");
    step("C2.12 review m6 fail: a hand-made ?c= gives no strip, no page error, and the app still shows To review", (await p.locator("[data-return-strip]").count()) === 0 && errs.length === before && (await p.getByRole("heading", { name: "To review" }).count()) === 1, errs.slice(before).join(" | "));
    // Review m3: a combination reference the studio refuses names the combination, not the form number.
    await p.goto(`${BASE}/review?form=IMM%205257&c=${"a".repeat(65)}`);
    await wait("text=This combination reference is not one the studio reads", "the combination refusal");
    step("C2.12 review m3 fail: a combination reference over 64 characters is refused under its own name, with Show every form", (await p.getByText("This form number is not one the studio reads").count()) === 0 && (await p.getByRole("button", { name: "Show every form" }).count()) >= 1);
    // ?form= without ?c=: every combination, no strip.
    await p.goto(`${BASE}/review?f=all&form=IMM%205257`); await wait('[data-form-filter="IMM 5257"]', "the form filter line");
    await wait(`tr[data-item="${vvAi.id}"]`, "the Visitor visa's row");
    step("C2.12 m2 pass: ?form= alone is that form on every combination (the Visitor visa's draft too), said in words", /on every combination/.test(await p.locator("[data-form-filter]").textContent()));
    step("C2.12 m1 fail: without ?c= there is no return strip (no path to go back to)", (await p.locator("[data-return-strip]").count()) === 0);
    // A form with nothing open.
    await p.goto(`${BASE}/review?form=IMM%201295&c=${sv}`);
    await wait("text=Nothing for IMM 1295 in Needs you", "the empty state");
    step("C2.12 m2 fail: a form with nothing waiting says so for that form, with Show every form (never the whole queue's empty state)", (await p.getByText("Nothing waits for you").count()) === 0 && (await p.getByRole("button", { name: "Show every form" }).count()) >= 1);
    // A number the studio refuses.
    await p.goto(`${BASE}/review?form=${"x".repeat(41)}`);
    await wait("text=This form number is not one the studio reads", "the refusal");
    step("C2.12 m2 fail: a form number over 40 characters is refused in the studio's words, with Show every form and no Try again", /at most 40 characters/.test(await p.locator("main").textContent()) && (await p.getByRole("button", { name: "Try again" }).count()) === 0);
    // A stale address: an unknown combination gives no strip, and the list still loads.
    await p.goto(`${BASE}/review?f=all&form=IMM%205257&c=00000000-0000-4000-8000-000000000000`);
    await wait('[data-form-filter="IMM 5257"]', "the form filter line"); await p.waitForLoadState("networkidle");
    step("C2.12 m1 fail: a combination the studio does not know gives no strip, and the page still works", (await p.locator("[data-return-strip]").count()) === 0 && (await p.locator("text=could not be loaded").count()) === 0);

    // ── The rail: every link carries the way back; To review for this form; Back to the steps lands on the current step.
    await p.goto(`${BASE}/c/${sv}/forms?setup=IMM%205257`);
    await wait('[data-setup-rail="IMM 5257"]', "the rail");
    const rail = p.locator('[data-setup-rail="IMM 5257"]');
    const hrefs = await rail.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    step("C2.12 m1 pass: every link in the rail carries ?form=IMM 5257&c=<this combination>", hrefs.length >= 2 && hrefs.every((h) => { const s = new URL(h, "http://x").searchParams; return s.get("form") === "IMM 5257" && s.get("c") === sv; }), JSON.stringify(hrefs));
    step("C2.12 m1 fail: the strip is not shown while the rail itself is open", (await p.locator("[data-return-strip]").count()) === 0);
    await rail.locator("[data-form-to-review]").click();
    await p.waitForURL(/\/review\?/); await wait('[data-return-strip="IMM 5257"]', "the strip on To review"); await wait("tr[data-item]", "the rows on To review"); await p.waitForLoadState("networkidle");
    step("C2.12 m2 pass: the rail's 'Everything for IMM 5257 on To review' opens To review for this form on this combination", q(p.url()).get("form") === "IMM 5257" && q(p.url()).get("c") === sv && (await rowIds()).length === here.items.length, `${p.url()} rows ${(await rowIds()).length} of ${here.items.length}`);
    // A step link: the page it opens keeps the strip.
    await p.goto(`${BASE}/c/${sv}/forms?setup=IMM%205257`); await wait('[data-setup-rail="IMM 5257"] [data-step-link]', "a step link");
    const first = p.locator('[data-setup-rail="IMM 5257"] [data-step-link]').first(); const target = await first.getAttribute("href");
    await first.click(); await p.waitForURL((u) => !u.searchParams.has("setup")); await wait('[data-return-strip="IMM 5257"]', `the strip on ${target}`);
    step(`C2.12 m1 pass: the page a step opens (${new URL(target, BASE).pathname}) shows the return strip`, (await p.locator("[data-return-strip]").count()) === 1);
    // Keyboard: Tab to Back to the steps, Enter; focus lands on the current step.
    const back = p.locator("[data-back-to-steps]"); await back.focus(); await p.keyboard.press("Enter");
    await wait('[data-setup-rail="IMM 5257"] [aria-current="step"]', "the rail after Back");
    await p.waitForFunction(() => document.activeElement?.getAttribute("aria-current") === "step", null, { timeout: 5000 }).catch((e) => { throw new Error(`focus never reached the current step: ${e.message}`); });
    const cur = (await api(`/combinations/${sv}/forms/${encodeURIComponent("IMM 5257")}/progress`)).body.current;
    step("C2.12 m1 pass: Back to the steps reopens the rail on IMM 5257 with focus on its current step", q(p.url()).get("setup") === "IMM 5257" && (await p.evaluate(() => document.activeElement?.getAttribute("data-step"))) === cur, await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
    await axe("the rail after Back to the steps");
    await p.keyboard.press("Escape"); await p.waitForURL((u) => !u.searchParams.has("setup"));
    // The chip takes focus back over a few frames (forms.tsx refocusChip); poll for it, and the step below says what has focus.
    for (let i = 0; i < 50 && (await p.evaluate(() => document.activeElement?.getAttribute("data-step-chip"))) !== "IMM 5257"; i++) await p.waitForTimeout(100);
    step("C2.12 m1 fail: Escape closes the rail and drops ?back= (a reload does not move focus again), focus on the form's chip", !q(p.url()).has("back") && (await p.evaluate(() => document.activeElement?.getAttribute("data-step-chip"))) === "IMM 5257", `${p.url()} focus: ${await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 160))}`);
    step("No page errors in the walk", errs.length === 0, errs.join(" | "));
  } catch (e) { step("the walk stopped", false, e.stack); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
