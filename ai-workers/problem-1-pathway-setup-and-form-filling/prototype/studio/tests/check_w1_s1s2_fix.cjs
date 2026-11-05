// S1/S2 FIX (Lead note 27 Oct): the qa after-merge findings and two S2 points, each walked in a real browser (or on the
// API underneath) with a pass and a fail. QA-45 a category with none yet gets its first sub-category through the one Add
// (since P-128: prefilled from the filters, pick the category, untick None); QA-44 letters typed while a name saves are
// kept; QA-46 the word is the same everywhere (since P-128: Delete, on the row, To review and the approval page); QA-49
// Immigration programs follows the Structure's order, also after a reorder; QA-50 a double click on Start setup leaves
// one history entry; review m1 the setup bar shows the stage of the next step (QA-184: the checklist's five steps); break m8 reads are denied by default.
// Sample inputs plus one saved AI replay (US$0) and one released-but-Not-ready combination. No model call.
//   zsh studio/tools/isolated.sh screens_s1s2 4448 start && node studio/tests/check_w1_s1s2_fix.cjs 4448 xr_studio_screens_s1s2
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_screens_s1s2";
const { execFileSync } = require("node:child_process");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const BASE = `http://localhost:${PORT}`;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  /** actor: a person's id, or null for a request that names nobody. */
  const api = async (pth, init = {}) => {
    const headers = { "content-type": "application/json" }; if (init.actor !== null) headers["x-actor"] = init.actor ?? "user-A";
    const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers, data: init.data, timeout: 180000 });
    return { status: r.status(), body: await r.json().catch(() => null) };
  };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const panel = () => p.locator("aside[aria-label$='details']");
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector('[data-view], [data-slot="empty-state"]'), null, { timeout: 30000 });
  const catOf = async (pw = "INDIVIDUAL") => (await api(`/catalogue?pathway=${pw}&filter=all`)).body;

  // ======================================================== setup: sample inputs, one AI replay, one Not ready release
  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await api("/demo/load", { method: "POST" });
  const sv = (await catOf()).rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  for (let i = 0; i < 60; i++) { if ((await catOf()).rows.find((x) => x.nodeKey === sv.nodeKey).aiProposals > 0) break; await p.waitForTimeout(500); }
  const ss = (await api("/combinations", { method: "POST", data: { nodeKey: "individual.work_permits.open.spouse_student" } })).body.combination;
  // C11.12 BR-7 (P-233): a new release needs a filing mode on every applicant role; set as the author would (Sample).
  sql(`update combination set participants = (select jsonb_agg(case when x->>'role' in ('spouse_or_partner','child') then x || '{"filingMode":"files_own"}'::jsonb else x end) from jsonb_array_elements(participants) x) where id='${ss.id}'`);
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  // G5 (C5.1, P-248, #868): a release needs a document line beside its form; one with a type the library has released.
  await api(`/combinations/${ss.id}/requirements`, { method: "POST", data: { documentTypeKey: sql("select document_type_key from document_type where status = 'PUBLISHED' order by document_type_key limit 1"), attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" } });
  await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const ssSme = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (ssSme.length) await api(`/combinations/${ss.id}/signoff`, { method: "POST", actor: "user-C", data: { items: ssSme, action: "signed" } });
  const rel = await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: (await api("/draft")).body.changes } });
  // B78 (BR-8 counts what a release asks): a release that asks each person nothing, the state this page must never call Live.
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{placements}', '[]'::jsonb) where combination_id = '${ss.id}'`);
  let cat = await catOf();
  const svRow = cat.rows.find((x) => x.nodeKey === sv.nodeKey), ssRow = cat.rows.find((x) => x.nodeKey === "individual.work_permits.open.spouse_student");
  step("setup: Super visa has AI proposals (saved replay, US$0); Spouse of a student is released but Not ready", svRow.aiProposals > 0 && ssRow.status === "NOT_READY" && rel.status === 201);

  // ======================================================== break m8: reads are denied by default
  for (const [what, pth, init] of [["the catalogue", "/catalogue?pathway=INDIVIDUAL"], ["the Structure", "/structure?pathwayType=INDIVIDUAL"], ["path options", "/path-options?pathway=INDIVIDUAL"], ["where used", "/structure/nodes/retail.temporary_residence/uses"], ["the name check", "/structure/name-check", { method: "POST", data: { pathwayType: "INDIVIDUAL", level: "program", parentKey: "retail.temporary_residence", label: "Visitors" } }]]) {
    const none = await api(pth, { ...init, actor: null }), nobody = await api(pth, { ...init, actor: "nobody" }), officer = await api(pth, { ...init, actor: "user-O" });
    const author = await api(pth, { ...init, actor: "user-A" }), sme = await api(pth, { ...init, actor: "user-C" }), approver = await api(pth, { ...init, actor: "user-B" });
    step(`break m8 fail: ${what} refuses a request that names nobody (401), an unknown name (401) and a case person (403)`, none.status === 401 && nobody.status === 401 && officer.status === 403 && /Not for case people/.test(officer.body?.title ?? ""), [none.status, nobody.status, officer.status].join(" "));
    step(`break m8 pass: ${what} still answers every configuration person (author, content reviewer, approver)`, [author, sme, approver].every((x) => x.status < 300), [author.status, sme.status, approver.status].join(" "));
  }

  // ======================================================== review m1, QA-184: the progress is the checklist's next step
  // QA-184 replaced the four-step count with the setup checklist's five steps: the progress sits on the step its next
  // item is on and says the card's words, so it can never run ahead of the button or disagree with the Overview.
  const at = (x) => (x.setup.next ? ["pages", "people", "forms", "questions_documents", "release"].indexOf(x.setup.next.step) + 1 : null);
  step("review m1 pass (QA-184): AI proposals to review → the progress is at the step of the next item, in the card's words", svRow.progress.of === 5 && svRow.progress.step === at(svRow) && svRow.progress.label === svRow.setup.bar.text, `${svRow.setup.next?.line} · ${svRow.progress.label}`);
  step("review m1 pass (QA-184): released but Not ready → never Live, at the step of its fix", !ssRow.progress.live && ssRow.progress.step === at(ssRow) && ssRow.setup.chip.status !== "LIVE", `${ssRow.setup.next?.line} · ${ssRow.progress.label}`);
  const live = cat.rows.find((x) => x.setup?.chip?.status === "LIVE");
  step("review m1 fail-guard (QA-184): a Live combination's progress says Live first, then its next release's line", !live || (live.progress.live && live.progress.label.startsWith("✓ Live") && (!live.setup.bar.next || live.progress.label.endsWith(live.setup.bar.next))), live?.progress.label);
  step("review m1 (QA-184): every combination's progress is out of 5 and never says the older four steps", cat.rows.filter((x) => x.combinationId).every((x) => x.progress.of === 5 && !/of 4/.test(x.progress.label)));
  await p.goto(`${BASE}/`); await ready();
  const svCard = await p.locator(`article[data-node="${sv.nodeKey}"]`).innerText();
  // Card v4 (P-180): the card shows the checklist's "n of 5 steps" and one button; the proposals to review are its Needs you.
  step("review m1 (card v4): on the card, the progress line is the checklist's, beside Resume setup and Needs you for the proposals", svCard.includes(svRow.setup.bar.text) && /Resume setup/.test(svCard) && /Needs you/.test(svCard) && !/Step \d of 4/.test(svCard), svCard.replace(/\s+/g, " ").slice(0, 200));

  // ======================================================== QA-49: the Structure's order everywhere
  const structOrder = async () => (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes;
  const leafOrder = (nodes) => { const kids = new Map(); for (const n of nodes) kids.set(n.parentKey ?? "", [...(kids.get(n.parentKey ?? "") ?? []), n]); const out = []; const walk = (n) => { const c = kids.get(n.key) ?? []; if (!c.length && (n.level === "category" || n.level === "subCategory")) out.push(n.key); for (const x of c) walk(x); }; for (const r of kids.get("") ?? []) walk(r); return out; };
  const shown = async () => p.locator("article[data-node]").evaluateAll((a) => a.map((x) => x.getAttribute("data-node")));
  let want = leafOrder(await structOrder()).filter((k) => cat.rows.some((r) => r.nodeKey === k));
  let got = await shown();
  const alpha = [...cat.rows].sort((x, y) => x.trail.join(" ").localeCompare(y.trail.join(" "))).map((x) => x.nodeKey);
  step("QA-49 pass: the cards follow the Structure's order (as the outline draws it)", JSON.stringify(got) === JSON.stringify(want), `${got.slice(0, 4).join(", ")} …`);
  step("QA-49 fail-guard: the sample's Structure order is not alphabetical, so this check can tell them apart", JSON.stringify(want) !== JSON.stringify(alpha));
  const visitors = (await structOrder()).filter((n) => n.parentKey === "individual.visitors").map((n) => n.key);
  const reo = await api("/structure/reorder", { method: "POST", data: { pathwayType: "INDIVIDUAL", parentKey: "individual.visitors", keys: [...visitors].reverse() } });
  await p.goto(`${BASE}/`); await ready(); await p.waitForTimeout(300);
  want = leafOrder(await structOrder()).filter((k) => cat.rows.some((r) => r.nodeKey === k)); got = await shown();
  step("QA-49 pass: a reorder on the Structure reaches the cards at once", reo.status < 300 && JSON.stringify(got) === JSON.stringify(want) && got.indexOf(visitors[visitors.length - 1]) < got.indexOf(visitors[0]), `${reo.status}`);
  await p.goto(`${BASE}/?v=list`); await ready(); await p.waitForTimeout(300);
  const rowsGot = await p.locator('[role="row"][data-node]').evaluateAll((a) => a.map((x) => x.getAttribute("data-node")));
  step("QA-49 pass: the List rows follow the same order", JSON.stringify(rowsGot) === JSON.stringify(want));
  await p.goto(`${BASE}/?v=cards`); await ready();

  // ======================================================== QA-50: a double click on Start setup is one history entry
  cat = await catOf();
  const ns = cat.rows.find((r) => !r.combinationId);
  await p.goto(`${BASE}/`); await ready(); await p.waitForTimeout(300);
  await p.locator(`article[data-node="${ns.nodeKey}"] [data-next-step]`).dblclick();
  await p.waitForURL(/\/c\/[0-9a-f-]+\/(sources|forms)/); // S3 item 5: Start setup opens the Forms tab
  await p.waitForTimeout(400);
  await p.goBack(); await p.waitForTimeout(600);
  step("QA-50 pass: after a double click on Start setup, one Back returns to Immigration programs", new URL(p.url()).pathname === "/" && await p.getByRole("heading", { level: 1, name: "Immigration programs" }).count() === 1, p.url());
  step("QA-50 fail-guard (S3): the double click started one setup, not two", (await catOf()).counts.not_started === cat.counts.not_started - 1 && sql(`select count(*) from combination c join program_def p on p.id=c.program_def_id where p.program_node_key='${ns.nodeKey}'`) === "1");

  // ======================================================== QA-45: the first sub-category (since P-128: the one Add, prefilled from the filters)
  const nodes = await structOrder();
  const kidsOf = (k) => nodes.filter((n) => n.parentKey === k);
  const pathOf = (n) => { const t = [n]; while (t[0].parentKey) t.unshift(nodes.find((x) => x.key === t[0].parentKey)); return t; };
  const sub = p.locator('[data-field="subCategory"] input[role="combobox"]'), catField = p.locator('[data-field="category"] input[role="combobox"]');
  /** Opens Add from Program structure with the Pathway and Program filters of a category set, then picks that category. */
  const addUnder = async (cat) => {
    const [pw, pr] = pathOf(cat);
    await p.goto(`${BASE}/structure?p=${encodeURIComponent(pw.key)}&prog=${encodeURIComponent(pr.key)}`); await p.locator("[data-row]").first().waitFor();
    await p.locator("[data-add-open]").click(); await p.locator("[data-add-dialog]").waitFor();
    await catField.fill(cat.label); await p.waitForTimeout(500);
  };
  const leafCat = nodes.find((n) => n.level === "category" && !kidsOf(n.key).length && !n.hasSetup && !n.retired);
  await addUnder(leafCat);
  step("QA-45 pass: Add opens with the Pathway and Program from the filters, and typing the category picks the existing one", (await p.locator('[data-field="program"] input').inputValue()) === pathOf(leafCat)[1].label && /Uses the existing category/.test(await p.locator('[data-field="category"]').innerText()), leafCat.label);
  await p.locator("[data-none]").uncheck(); await sub.waitFor({ state: "visible" });
  await sub.fill("Inside Canada (test)"); await p.waitForTimeout(500);
  await p.locator("[data-add-submit]").click(); await p.locator("[data-add-dialog]").waitFor({ state: "detached" }).catch(() => undefined);
  const after = await structOrder();
  step("QA-45 pass: the first sub-category is added there, and its row is tagged Just added", after.some((n) => n.parentKey === leafCat.key && n.label === "Inside Canada (test)") && await p.locator("[data-just-added]").count() === 1);
  const setUpCat = nodes.find((n) => n.level === "category" && !kidsOf(n.key).length && n.hasSetup && !n.retired);
  await addUnder(setUpCat);
  step("QA-45 fail: a category that has its own setup still cannot get a sub-category (the field is off, with the reason)", /already has its own setup, so it is the combination/.test(await p.locator("[data-sub-off]").innerText().catch(() => "")), setUpCat.label);
  await p.keyboard.press("Escape");

  // ======================================================== QA-44: letters typed while a name saves are kept ("Add and add another")
  const leafCat2 = nodes.find((n) => n.level === "category" && !kidsOf(n.key).length && !n.hasSetup && !n.retired && n.key !== leafCat.key);
  await addUnder(leafCat2);
  await p.locator("[data-none]").uncheck(); await sub.waitFor({ state: "visible" });
  await sub.fill("Outside Canada (test)"); await p.waitForTimeout(500);
  await p.route("**/api/structure/path", async (r) => { await new Promise((x) => setTimeout(x, 800)); await r.continue(); });
  await p.locator("[data-add-again]").click(); await p.keyboard.type("From abroad (test)", { delay: 15 });
  await p.waitForFunction(() => !document.querySelector("[data-add-submit]")?.closest("button")?.getAttribute("aria-busy"), null, { timeout: 10000 }).catch(() => undefined);
  await p.waitForTimeout(1200);
  await p.unroute("**/api/structure/path");
  step("QA-44 pass: the next name typed while the first one saves is kept, whole", await sub.inputValue() === "From abroad (test)" && (await structOrder()).some((n) => n.parentKey === leafCat2.key && n.label === "Outside Canada (test)"), await sub.inputValue());
  await sub.fill("Outside Canada (test)"); await p.waitForTimeout(600);
  step("QA-44 fail-guard: an exact twin is picked as the existing name, so nothing new can be added twice", /Uses the existing sub-category/.test(await p.locator('[data-field="subCategory"]').innerText()) && await p.locator("[data-add-submit]").isDisabled(), (await p.locator('[data-field="subCategory"]').innerText()).replace(/\s+/g, " ").slice(0, 160));
  await p.keyboard.press("Escape");

  // ======================================================== QA-46: one word everywhere (since P-128: Delete)
  const extra = (await api("/structure/nodes", { method: "POST", data: { pathwayType: "INDIVIDUAL", level: "program", label: "Removable program (test)", parentKey: "retail.citizenship" } })).body.key;
  sql(`update program_def set created_by = 'user-C' where program_node_key = '${extra}'`); // another person's: it goes to a second person
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(extra)}`);
  await panel().getByRole("button", { name: "Delete" }).click();
  await p.locator("[data-impact-panel]").getByLabel(/Why delete/).fill("Added by mistake (test).");
  await p.locator("[data-impact-panel]").getByRole("button", { name: "Send for approval" }).click();
  await p.locator("[data-page-note]").waitFor();
  await as("user-B"); await p.goto(`${BASE}/review`); await p.waitForTimeout(800);
  const row = p.locator('tr[data-kind="library_change"]').filter({ hasText: "Removable program (test)" });
  const rowText = (await row.innerText().catch(() => "")) ?? "";
  step("QA-46 pass (P-128): To review calls it Delete, the word the author pressed", /Delete/.test(rowText) && !/Remove/.test(rowText), rowText.replace(/\s+/g, " ").slice(0, 160));
  await row.locator("[data-next] a").click().catch(() => undefined); await p.waitForURL(/\/review\/change\//, { timeout: 10000 }).catch(() => undefined); await p.waitForTimeout(600);
  const page = await p.locator("main").innerText();
  step("QA-46 pass (P-128): the approval page says Delete, never Remove", /\bDelete\b/.test(page) && !/Remove/.test(page), page.replace(/\s+/g, " ").slice(0, 160));
  await as("user-A");

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
