// N7 (runtime lane; Devin 30 Oct, product/inbox/2026-10-30-devin-d1-walk.md): three findings, each with a passing and
// a failing case. DV-bb-9: only the person who proposed a remove, retire or restore withdraws it (P-116 amended, P-15
// second-person split). DV-bb-8: files reach a combination through the one intake (P-51, P-103); the second door
// POST /combinations/:id/attachments is gone. DV-d1-3 (QA-94 class): the review page of With an LMIA shows the role of a
// calculated answer in plain words, never its system key. In a real browser for DV-d1-3; screenshots at 1440 and 1024 in
// screens/N7-devin-fixes/screenshots/, axe (WCAG 2.2 AA). No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_n7 4431 start && node studio/tests/check_runtime_n7.cjs 4431 xr_studio_runtime_n7
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_runtime_n7";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "N7-devin-fixes", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
const PDF = path.join(ROOT, "official-sources", "ircc", "forms", "imm5476e.pdf");

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", ...(init.multipart ? {} : { "content-type": "application/json" }) }, data: init.data, multipart: init.multipart, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400); };
  const state = async (name) => {
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${name}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
    const lmia = sql("select id from combination where label='With an LMIA' limit 1"), vv = sql("select id from combination where label='Visitor visa' limit 1");
    step("setup: the sample has With an LMIA and Visitor visa", !!lmia && !!vv, { lmia, vv });

    // ------------------------------------------------------------ DV-bb-8: one upload door
    const file = { name: "n7-own-file.pdf", mimeType: "application/pdf", buffer: fs.readFileSync(PDF) };
    const before = sql("select count(*) from intake_item");
    let r = await api(`/combinations/${vv}/attachments`, { method: "POST", multipart: { files: file } });
    step("DV-bb-8 fail: POST /combinations/:id/attachments is no longer a door (404) and nothing is taken in", r.status === 404 && sql("select count(*) from intake_item") === before, { status: r.status, body: r.body?.message });
    r = await api("/intake", { method: "POST", multipart: { combinationId: vv, files: file } });
    step("C2.1 DV-bb-8 pass: the same file through the one intake (POST /intake with combinationId) is taken in, on that combination, one result per file", r.status === 201 && r.body?.results?.length === 1 && r.body.results[0].file === "n7-own-file.pdf" && sql(`select count(*) from source_attachment where combination_id='${vv}' and sha256='${r.body.results[0].sha256}'`) === "1", r.body?.results ?? r.body);
    r = await api(`/combinations/${vv}/attachments`);
    step("DV-bb-8: reading a combination's attached files is unchanged (GET stays)", r.status === 200 && Array.isArray(r.body), r.status);

    // ------------------------------------------------------------ DV-bb-9: withdraw is the proposer's only
    r = await api("/structure/nodes", { method: "POST", data: { pathwayType: "CORPORATE", level: "pathway", label: "N7 check pathway", parentKey: null } });
    const key = r.body?.key;
    sql(`update program_def set created_by='user-C' where program_node_key='${key}'`); // someone else's draft: its delete waits for a second person
    r = await api(`/structure/nodes/${key}`, { method: "DELETE", data: { reason: "Not needed: a check name." } });
    const ch = r.body;
    step("setup: a remove of a draft name waits for a second person (an open change)", r.status === 200 && ch?.status === "WAITING", ch?.status ?? ch);
    sql(`update library_change set proposed_by='user-C' where id='${ch.id}'`); // as if another person had proposed it
    r = await api(`/library/changes/${ch.id}/withdraw`, { method: "POST", data: { note: "Not mine, but I try." } });
    step("C11.9 DV-bb-9 fail: an author cannot withdraw another person's proposal (403, in words that name who proposed it); it stays waiting",
      r.status === 403 && /Only the person who proposed a change can withdraw it\. Content reviewer proposed this one/.test(r.body?.detail ?? r.body?.message ?? "") && sql(`select status from library_change where id='${ch.id}'`) === "WAITING" && sql(`select count(*) from audit_event where action='withdrawn' and entity_key='${key}'`) === "0", r.body?.detail ?? r.body);
    sql(`update library_change set proposed_by='someone-gone' where id='${ch.id}'`);
    r = await api(`/library/changes/${ch.id}/withdraw`, { method: "POST", data: { note: "Not mine either." } });
    step("DV-bb-9 fail: a proposer no longer in the list is named 'Another person', never by id", r.status === 403 && /Another person proposed this one/.test(r.body?.detail ?? "") && !/someone-gone/.test(JSON.stringify(r.body)), r.body?.detail);
    // The page says so before anyone clicks: a returned change shows "Withdraw it instead…" to its proposer only.
    sql(`update library_change set proposed_by='user-C', status='RETURNED', decision_note='Check: returned' where id='${ch.id}'`);
    await p.goto(`${BASE}/review/change/${ch.id}`); await p.locator("[data-send-again]").waitFor({ timeout: 30000 }); await settle();
    step("DV-bb-9 fail (page): another person's returned change offers no Withdraw; the page says who can", await p.getByRole("button", { name: /Withdraw it instead/ }).count() === 0 && /Only Content reviewer can withdraw it\./.test(await p.locator("[data-withdraw-not-mine]").innerText()));
    await state("returned-not-mine");
    sql(`update library_change set proposed_by='user-A' where id='${ch.id}'`);
    await p.reload(); await p.locator("[data-send-again]").waitFor({ timeout: 30000 }); await settle();
    step("DV-bb-9 pass (page): the proposer's own returned change offers Withdraw it instead…", await p.getByRole("button", { name: /Withdraw it instead/ }).count() === 1 && await p.locator("[data-withdraw-not-mine]").count() === 0);
    r = await api(`/library/changes/${ch.id}/withdraw`, { method: "POST", data: { note: "My own, not needed." } });
    step("C11.9 DV-bb-9 pass: the proposer withdraws their own open change", r.status === 201 && r.body?.status === "WITHDRAWN" && sql(`select count(*) from audit_event where action='withdrawn' and entity_key='${key}'`) === "1", r.body?.status ?? r.body);

    // ------------------------------------------------------------ DV-d1-3: plain role words on the review page
    await p.goto(`${BASE}/c/${lmia}/review`); await settle();
    await p.getByText("Calculated answers", { exact: false }).first().waitFor({ timeout: 30000 });
    const text = await p.locator("main").innerText();
    step("DV-d1-3 fail: no role system key (subject_…, form_subject) on the With an LMIA review page", !/\b(subject_[a-z0-9_]+|form_subject)\b/.test(text), (text.match(/.{60}\bsubject_[a-z0-9_]+.{20}/) ?? [""])[0]);
    step("DV-d1-3 pass: the calculated answer's role reads in plain words ('the role of the subject's spouse or partner')", /holding the role of the subject's spouse or partner \(current spouse/.test(text), (text.match(/Number of person records.{0,120}/) ?? [""])[0]);
    await state("lmia-review");
    step("no page error", errs.length === 0, errs.join(" | "));
  } finally { await b.close(); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
