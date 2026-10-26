// Screen 02 slices 2 and 3 in a real browser (FINISH, Lead note 25 Oct 07:00): the journeys as scripted checks, every
// state at 1440 and 1024 px into product/screens/02-ai-work/screenshots/finish/, axe (WCAG 2.2 AA) on each. Isolated
// copy; the test builds its own data through the screens' endpoints (one saved AI answer replayed: no model call, US$0).
//   new edition → impact (three tabs) → accept · To review as the second person · a new shared field approved ·
//   merge panel (W1-02, P-102: the portal capture and screen map views are parked with the browser extension) · held file (uploader records the IRCC page, second person approves) · K1 form-field decisions and a new
//   shared field on the proposals page (J/K keys) · Draft setup panel · Describe it on New combination · checklist stub
//   pass · Release page with its Library changes group
//   zsh studio/tools/isolated.sh screens_s02c 4443 start && node studio/tests/check_screen02_slice2_browser.cjs 4443 xr_studio_screens_s02c
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4443), DB = process.argv[3] ?? "xr_studio_screens_s02c";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const OFFICIAL = path.join(ROOT, "official-sources", "ircc");
const SHOTS = path.join(ROOT, "product", "screens", "02-ai-work", "screenshots", "finish"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, lastStep = "(before the first step)";
const step = (name, ok, detail) => { lastStep = name; if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
function pdf(title, text) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", ...(init.multipart ? {} : { "content-type": "application/json" }) }, data: init.data, multipart: init.multipart, timeout: init.timeout ?? 60000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const upload = (name, buffer, combinationId, actor = "user-A") => api("/intake", { method: "POST", actor, multipart: { files: { name, mimeType: "application/pdf", buffer }, ...(combinationId ? { combinationId } : {}) } }).then((r) => r.body?.results?.[0]);
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  /** Opens a page as a person and waits for its heading (never a fixed sleep). */
  /** Who acts: set on the app's own origin before the page that is checked (the visit itself is a literal goto). */
  const asWho = async (who) => { await p.goto(`${BASE}/`); await as(who); };
  /** The page has drawn: its heading, or the right panel for a page that opens one (never a fixed sleep). */
  const ready = async (heading) => { await (heading ? p.getByRole("heading", { level: 1, name: heading }).first() : p.getByRole("dialog")).waitFor({ timeout: 30000 }); await p.waitForLoadState("networkidle").catch(() => {}); };
  const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await p.waitForTimeout(300); } return false; };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 });
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };
  const toast = (re) => p.getByText(re).first().waitFor({ timeout: 30000 }).then(() => true).catch(() => false);

  // ======================================================== C9.1 new edition: impact review and accept (empty library)
  await p.goto(BASE); await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await upload("imm5476e-2021.pdf", fs.readFileSync(path.join(OFFICIAL, "previous-editions", "imm5476e-2021.pdf")));
  const held = await upload("imm5476e.pdf", fs.readFileSync(path.join(OFFICIAL, "forms", "imm5476e.pdf")));
  step("setup: the current IMM 5476 is held as a new edition of the 2021 one in the library", held?.outcome === "new_edition_held", held?.outcome);
  const heldId = sql("select id from intake_item where outcome='new_edition_held' and status='HELD' limit 1");
  await asWho("user-A"); await p.goto(`${BASE}/review`); await ready("To review");
  step("C5.3: To review lists the new edition with Review impact", /Review impact/.test(await p.locator(`tr[data-item="held:${heldId}"]`).textContent()));
  step("C9.1: the row's step links to the impact review", (await p.locator(`tr[data-item="held:${heldId}"] [data-next] a`).getAttribute("href")) === `/review/edition/${heldId}`);
  await p.goto(`${BASE}/review/edition/${heldId}`); await ready("New edition: review impact");
  const counts = await p.locator("[data-counts]").textContent();
  step("C9.1 BR-12: the impact page shows the four counts and says no AI, US$0", /Unchanged form fields/.test(counts) && /Reworded/.test(counts) && /New form fields/.test(counts) && /without AI/.test(await p.locator("[data-ai-line]").textContent()), counts.replace(/\s+/g, " "));
  await state("edition-impact-comparison");
  await p.getByRole("tab", { name: /Impact on library/ }).click(); await p.getByRole("tab", { name: /Impact on library/, selected: true }).waitFor();
  await state("edition-impact-library");
  await p.getByRole("tab", { name: /Combinations/ }).click(); await p.getByRole("tab", { name: /Combinations/, selected: true }).waitFor();
  step("C9.1: open cases stay on their release (said on the Combinations tab)", /stay on the release they started on|No combination files this form yet/.test(await p.locator('[role="tabpanel"]').textContent()));
  await p.getByRole("button", { name: "Accept into the shared draft" }).click(); await p.waitForURL(/\/review$/);
  step("C9.1: accepting returns to To review with what was carried and what is left for a person", await toast(/accepted: \d+ form fields carried, \d+ left for a person/));

  // ======================================================== the sample inputs and one item of each kind
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  let r = await api("/demo/load", { method: "POST", timeout: 180000 });
  step("setup: sample inputs load", r.status === 201, r.body?.seconds);
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const att = (await api(`/combinations/${sv}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  const jobId = sql(`select id from drafting_job where combination_id='${sv}' and kind='field_map' order by started_at desc limit 1`);
  for (let i = 0; i < 120 && sql(`select status from drafting_job where id='${jobId}'`) !== "COMPLETED"; i++) await p.waitForTimeout(500);
  // The proposals page: keys, and a new shared field typed by name (BR-7).
  await asWho("user-A"); await p.goto(`${BASE}/c/${sv}/jobs/${jobId}`); await ready(/AI-proposed field map/);
  step("C3.2 view 4: the proposals page shows its keys (J / K / A / N)", /Keys: J \/ K/.test(await p.locator("[data-keys]").textContent()));
  await p.getByRole("tab", { name: /^New/ }).click().catch(() => {});
  await p.locator("article[data-proposal]").first().waitFor();
  await p.locator("body").click({ position: { x: 5, y: 300 } }); await p.keyboard.press("j");
  const focused1 = await p.evaluate(() => document.activeElement?.getAttribute("data-proposal"));
  await p.keyboard.press("j");
  const focused2 = await p.evaluate(() => document.activeElement?.getAttribute("data-proposal"));
  step("C3.2 view 4 keyboard: J moves to the first proposal, then the next", !!focused1 && !!focused2 && focused1 !== focused2, `${focused1} → ${focused2}`);
  await p.keyboard.press("n"); await p.locator("[data-new-field]").waitFor({ timeout: 5000 });
  await p.locator("[data-new-field]").getByLabel("Name").fill("Purpose of the earlier trip (test)");
  const needsReason = /needed/.test(await p.locator("[data-new-field]").textContent());
  if (needsReason) await p.locator("[data-new-field]").getByLabel(/Why is this not/).fill("A different trip from the one in the library field.");
  await p.locator("[data-new-field]").getByLabel("Meaning").fill("Why the person made an earlier trip, as written on the form.");
  await state("proposals-new-shared-field");
  await p.locator("[data-new-field]").getByRole("button", { name: "Create the shared field" }).click();
  await p.getByText(/"Purpose of the earlier trip \(test\)" · a second person approves it on To review/).waitFor({ timeout: 15000 });
  step("C3.6 BR-7: N names it as a new shared field; the key is not typed; a second person approves it", true);
  // Review Must 3: Accept on a new field that a library field could fit asks why first (no 400 after the click).
  const nearItem = (await api(`/jobs/${jobId}`)).body.items.find((i) => i.decision === "PENDING" && i.outcome === "NEW" && (i.candidates ?? []).some((c) => c.score >= 0.55) && i.evidence?.recommendation?.action !== "reuse");
  if (nearItem) {
    await p.getByRole("tab", { name: /^Needs a decision/ }).click();
    const card = p.locator(`article[data-proposal="${nearItem.id}"]`);
    await card.locator("[data-accept]").click();
    await card.locator("[data-accept-reason]").waitFor({ timeout: 5000 });
    step("C3.6 BR-7 (Must 3): Accept on a new field a library field could fit asks why, focused, before it is accepted", await card.locator("[data-accept-reason] input").evaluate((el) => el === document.activeElement) && /Why is this not/.test(await card.locator("[data-accept-reason]").textContent()));
    await state("proposals-accept-needs-reason");
    await card.locator("[data-accept-reason] input").fill("A second phone number, not the main one.");
    await card.getByRole("button", { name: "Accept with this reason" }).click();
    await until(async () => (await api(`/jobs/${jobId}`)).body.items.find((i) => i.id === nearItem.id)?.decision === "ACCEPTED");
    step("C3.6 BR-7 (Must 3): accepted with the reason kept", (await api(`/jobs/${jobId}`)).body.items.find((i) => i.id === nearItem.id)?.decisionNote === "A second phone number, not the main one.");
  } else step("C3.6 BR-7 (Must 3): the replayed answer has a new proposal a library field could fit", false);
  for (const o of ["REUSE", "NEW"]) await api(`/jobs/${jobId}/accept-clean`, { method: "POST", data: { outcome: o } });
  for (const i of (await api(`/jobs/${jobId}`)).body.items.filter((x) => x.decision === "PENDING")) await api(`/jobs/${jobId}/items/${i.id}`, { method: "POST", data: { decision: "ACCEPTED", note: "Test: a different meaning from the library field that could fit." } });
  r = await api(`/jobs/${jobId}/apply`, { method: "POST", data: { who: "each_applicant" } });
  step("setup: the decided draft is applied (new shared fields wait on To review)", r.status === 201, r.body?.new_fields);
  await asWho("user-A"); await p.goto(`${BASE}/c/${sv}/jobs/${jobId}`); await ready(/AI-proposed field map/);
  await p.locator("[data-form-field-decisions]").waitFor();
  step("C3.8 K1: after apply, the page lists the form fields with no decision", /Form fields with no decision \(\d+\)/.test(await p.locator("[data-form-field-decisions]").textContent()));
  const firstFF = p.locator("[data-form-field]").first();
  await firstFF.getByRole("button", { name: "Decide" }).click();
  await firstFF.getByLabel("Decision").selectOption("by_hand"); await firstFF.getByLabel("Reason").fill("Signed and dated by the applicant on paper.");
  await state("proposals-form-field-decision");
  const before = Number((await p.locator("#ff-decide").textContent()).match(/\((\d+)\)/)[1]);
  await firstFF.getByRole("button", { name: "Save" }).click();
  await p.waitForFunction((x) => Number((document.querySelector("#ff-decide")?.textContent ?? "").match(/\((\d+)\)/)?.[1]) === x - 1, before, { timeout: 15000 }).catch(() => {});
  step("C3.8 K1: a form field decided \"filled by hand\" with its reason leaves the list", Number((await p.locator("#ff-decide").textContent()).match(/\((\d+)\)/)[1]) === before - 1, before);
  // Review Musts 4, 5: the same decisions from To review, on their own page by edition.
  await asWho("user-C"); await p.goto(`${BASE}/review?kind=form_fields`); await ready("To review");
  const ffRow = p.locator('tr[data-kind="form_fields"]').first();
  step("C3.8 K1 (Must 4): To review lists the form fields with no decision, with a step to decide them", /Decide \d+ form field/.test(await ffRow.textContent()));
  const ffHref = await ffRow.locator("[data-next] a").getAttribute("href");
  const ffEdition = ffHref.split("/").pop();
  await p.goto(`${BASE}/review/form-fields/${ffEdition}`); await ready("Form fields with no decision");
  await p.locator("[data-form-field-decisions]").waitFor();
  await state("form-fields-page");
  const ffBefore = Number((await p.locator("#ff-decide").textContent()).match(/\((\d+)\)/)[1]);
  const ff2 = p.locator("[data-form-field]").first();
  await ff2.getByRole("button", { name: "Decide" }).click();
  await ff2.getByLabel("Reason").fill("Office use only: no case fact fills it.");
  await ff2.getByRole("button", { name: "Save" }).click();
  await p.waitForFunction((x) => Number((document.querySelector("#ff-decide")?.textContent ?? "").match(/\((\d+)\)/)?.[1]) === x - 1, ffBefore, { timeout: 15000 }).catch(() => {});
  step("C3.8 K1 (Must 5): a form field decided on the Form fields page leaves its list", Number((await p.locator("#ff-decide").textContent()).match(/\((\d+)\)/)[1]) === ffBefore - 1, ffBefore);
  // A merge and a held file, each by the author.
  const [keep, merge] = sql("select canonical_field_key from canonical_field where value_type='text' and status='PUBLISHED' and merged_into_key is null group by canonical_field_key order by canonical_field_key limit 2").split("\n");
  await api("/library/merges", { method: "POST", data: { keep, merge, reason: "Test input: the same meaning under two keys." } });
  const mergeId = sql("select id from field_merge where status='PROPOSED' limit 1");
  await upload("imm5476-next.pdf", pdf("IMM 5476 E: Use of a representative (test edition)", "IMM 5476 (01-2027) E"), sv);
  const heldFile = sql("select id from intake_item where status='HELD' and outcome='held' order by created_at desc limit 1");

  // ======================================================== To review as the second person
  await asWho("user-C"); await p.goto(`${BASE}/review`); await ready("To review");
  const kinds = await p.locator("tr[data-kind]").evaluateAll((rs) => [...new Set(rs.map((x) => x.getAttribute("data-kind")))]);
  step("C5.3: the second person's Needs you lists library changes and the merge (the held file waits for its IRCC page; no capture or screen map: P-102)", ["library_change", "merge"].every((k) => kinds.includes(k)) && !kinds.includes("held_file") && !kinds.includes("capture") && !kinds.includes("screen_map"), kinds.join(","));
  step("C5.3: merge rows name the fields by name, not by key", !(await p.locator(`tr[data-item="merge:${mergeId}"]`).textContent()).includes(merge), merge);
  await state("to-review-second-person");

  // ======================================================== a new shared field: proposer read-only, second person approves
  const changeId = sql("select id from library_change where label='Purpose of the earlier trip (test)'");
  await asWho("user-A"); await p.goto(`${BASE}/review/change/${changeId}`); await ready(/Add shared field/);
  step("C5.3 BR-9: the person who proposed the new field sees it read-only", await p.getByRole("button", { name: "Approve" }).count() === 0 && /You proposed this/.test(await p.locator("main").textContent()));
  await state("library-change-proposer");
  await asWho("user-C"); await p.goto(`${BASE}/review/change/${changeId}`); await ready(/Add shared field/);
  step("C3.6: the approver sees its name, meaning, kind of value and group; the key only under Details", /Purpose of the earlier trip \(test\)/.test(await p.locator("[data-change-field]").textContent()) && !(await p.locator("[data-change-field]").textContent()).includes(sql(`select key from library_change where id='${changeId}'`)));
  await state("library-change-approver");
  await p.getByRole("button", { name: "Approve" }).click(); await p.waitForURL(/\/review$/);
  step("C5.3: approving returns to To review; it is released with the next release", await toast(/approved: it is released with the next release/));

  // ======================================================== board views 5 and 6 are parked (P-102)
  await asWho("user-C"); await p.goto(`${BASE}/review/capture/00000000-0000-4000-8000-000000000000`); await p.getByText("Page not found").waitFor({ timeout: 30000 });
  step("C5.3 P-102: the portal capture and screen map review pages are gone (Page not found)", /Page not found/.test(await p.locator("main").textContent()));

  // ======================================================== board view 8: merge (panel over To review)
  await asWho("user-C"); await p.goto(`${BASE}/review/merge/${mergeId}`); await ready(null); // the panel hides the list behind it from assistive technology
  step("C3.5 view 8: the merge opens as a right panel over To review, the field that goes and the one that stays side by side", /Goes away/.test(await p.locator("[data-merge]").textContent()) && /Stays/.test(await p.locator("[data-merge]").textContent()));
  await state("merge-panel-second-person");
  await p.getByRole("dialog").getByRole("button", { name: "Approve the merge" }).click(); await p.waitForURL(/\/review$/);
  step("C3.5 view 8: approving merges and closes the panel", await toast(/Merged/));

  // ======================================================== board view 9: held file (P-80)
  await asWho("user-A"); await p.goto(`${BASE}/review?kind=held_file`); await ready("To review");
  step("C2.3 P-80 (Must 6): the uploader's To review step is to record the IRCC page", /Record the IRCC page/.test(await p.locator(`tr[data-item="held:${heldFile}"]`).textContent()));
  await p.goto(`${BASE}/review/held/${heldFile}`); await ready(/IMM 5476/);
  await p.getByLabel("Paste the canada.ca page").fill("https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5476.html");
  await state("held-file-uploader");
  await p.getByRole("button", { name: "Record the page" }).click(); await toast(/IRCC page recorded/);
  await asWho("user-C"); await p.goto(`${BASE}/review/held/${heldFile}`); await ready(/IMM 5476/);
  step("C2.3 view 9: the second person sees the IRCC page to compare with", /canada\.ca/.test(await p.locator("main").textContent()));
  await state("held-file-second-person");
  await p.getByRole("button", { name: "Approve as an official source" }).click(); await p.waitForURL(/\/review$/);
  step("C2.3 P-80: approving it returns to To review with what the intake did next", await toast(/Approved as an official source/));

  // ======================================================== board view 2: Draft setup (right panel); view 11: Describe it
  // A combination with an official form the library has not mapped yet (IMM 5406), so its next step is the AI draft.
  const start = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.find((x) => x.label === "Working holiday");
  const wh = (await api("/combinations", { method: "POST", data: { nodeKey: start.nodeKey } })).body.combination;
  await upload("imm5406e.pdf", fs.readFileSync(path.join(OFFICIAL, "forms", "imm5406e.pdf")), wh.id);
  const draftRow = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.find((x) => x.nextAction?.kind === "draft_ai");
  if (draftRow) {
    await asWho("user-A"); await p.goto(`${BASE}/c/${draftRow.combinationId}`); await ready(draftRow.label);
    await p.locator("main [data-next-step='draft_ai']").first().click();
    await p.getByRole("dialog", { name: "Draft setup" }).waitFor();
    await p.locator("[data-cost-line]").waitFor({ timeout: 30000 });
    step("C3.3 view 2: the combination's next step opens Draft setup as a right panel with the cost line before any paid run", /worst case|Replay|Stub/.test(await p.locator("[data-cost-line]").textContent()));
    await state("draft-setup-panel");
    await p.keyboard.press("Escape");
  } else step("C3.3 view 2: a combination with forms to draft exists in the sample", false, "none");
  await asWho("user-A"); await p.goto(`${BASE}/new`); await ready("New combination");
  await p.locator("[data-describe]").getByLabel("What application is it?").fill("Super visa for parents and grandparents");
  await p.getByRole("button", { name: /Propose a path/ }).click();
  await p.getByText("Proposal without AI").waitFor();
  step("C1.2 view 11: Describe it proposes the path, says no AI and US$0, and offers the existing combination", /Visitors › Super visa/.test(await p.locator("[data-describe]").textContent()) && /already exists/.test(await p.locator("[data-describe]").textContent()));
  await state("new-combination-describe");

  // ======================================================== K2: checklist stub pass; Release page Library changes
  const ck = (await api(`/combinations/${sv}/attachments`)).body.find((a) => a.recognised && a.kind === "Document checklist");
  const ckJob = (await api(`/attachments/${ck.id}/draft-checklist`, { method: "POST", data: { mode: "stub" } })).body.id;
  await asWho("user-A"); await p.goto(`${BASE}/c/${sv}/jobs/${ckJob}`); await ready(/proposed document requirements/);
  step("C3.4 K2: the checklist stub pass says nothing is proposed and costs nothing", /Nothing proposed/.test(await p.locator("main").textContent()) && /US\$0\.00/.test(await p.locator("main").textContent()));
  await state("checklist-stub-pass");
  for (const c of (await api("/library/changes?status=WAITING")).body) await api(`/library/changes/${c.id}/approve`, { method: "POST", actor: "user-C", data: {} });
  await asWho("user-B"); await p.goto(`${BASE}/release`); await ready("Review and release");
  step("C5.3 B1: the Release page lists the approved library changes in their own group", (await p.locator('[data-library-change]').count()) > 0 && /Library changes/.test(await p.locator("main").textContent()));
  await state("release-library-changes");

  step("no page errors in the browser", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`${fail ? `${fail} failed` : "all passed"}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`STOPPED after "${lastStep}": ${String(e?.message ?? e).split("\n")[0].slice(0, 160)}`); process.exit(2); });
