// S1/S2 FIX (Lead note 27 Oct): the qa after-merge findings and two S2 points, each walked in a real browser (or on the
// API underneath) with a pass and a fail. QA-45 "Add sub-category" in the panel opens the Add pop-up down to a category
// that has none yet (P-127; it opened an add row before); QA-44 letters typed while a name saves are kept; QA-46 Remove is called Remove on To review too; QA-49
// Immigration programs follows the Structure's order, also after a reorder; QA-50 a double click on Start setup leaves
// one history entry; review m1 the setup bar shows the stage of the next step; break m8 reads are denied by default.
// Sample inputs plus one saved AI replay (US$0) and one released-but-Not-ready combination. No model call.
//   zsh studio/tools/isolated.sh screens_s1s2 4448 start && node studio/tests/check_w1_s1s2_fix.cjs 4448 xr_studio_screens_s1s2
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4448);
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
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const ssSme = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (ssSme.length) await api(`/combinations/${ss.id}/signoff`, { method: "POST", actor: "user-C", data: { items: ssSme, action: "signed" } });
  const rel = await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: (await api("/draft")).body.changes } });
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

  // ======================================================== review m1: the bar shows the stage of the next step
  step("review m1 pass: AI proposals to review → the bar is at Draft (step 2), beside 'Review N AI proposals'", svRow.nextAction.kind === "review_proposals" && svRow.progress.step === 2 && svRow.progress.done.join() === "true,false,false,false", `${svRow.nextAction.label} · ${svRow.progress.label}`);
  step("review m1 pass: released but Not ready with something missing → the bar is at that stage, never 'Step 4 of 4 · Release'", ssRow.nextAction.kind === "see_missing" && ssRow.progress.step < 4 && !ssRow.progress.live, `${ssRow.nextAction.label} · ${ssRow.progress.label}`);
  const live = cat.rows.find((x) => x.status === "READY" && !x.nextAction);
  step("review m1 fail-guard: Live with no next step keeps all four steps done", !live || (live.progress.live && live.progress.step === 4 && live.progress.done.every(Boolean)), live?.progress.label);
  step("review m1: every combination with setup has its bar at its next step's stage (none ahead of the button)", cat.rows.filter((x) => x.combinationId && x.nextAction && ["start", "add_forms", "add_from_library", "see_new_edition"].includes(x.nextAction.kind)).every((x) => x.progress.step === 1));
  await p.goto(`${BASE}/`); await ready();
  const svCard = await p.locator(`article[data-node="${sv.nodeKey}"]`).innerText();
  step("review m1: on the card, the bar's words and the button agree (Step 2 of 4 · Draft beside Review … AI proposals)", /Step 2 of 4 · Draft/.test(svCard) && /Review \d+ AI proposals?/.test(svCard), svCard.replace(/\s+/g, " ").slice(0, 200));

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
  await p.waitForURL(/\/new\?leaf=/);
  await p.waitForTimeout(400);
  await p.goBack(); await p.waitForTimeout(600);
  step("QA-50 pass: after a double click on Start setup, one Back returns to Immigration programs", new URL(p.url()).pathname === "/" && await p.getByRole("heading", { level: 1, name: "Immigration programs" }).count() === 1, p.url());
  step("QA-50 fail-guard: the double click created nothing (no silent start)", (await catOf()).counts.not_started === cat.counts.not_started);

  // ======================================================== QA-45: Add sub-category in the panel (since P-127: the one Add pop-up)
  const nodes = await structOrder();
  const kidsOf = (k) => nodes.filter((n) => n.parentKey === k);
  const leafCat = nodes.find((n) => n.level === "category" && !kidsOf(n.key).length && !n.hasSetup && !n.retired);
  const sub = p.locator('[data-field="subCategory"] input[role="combobox"]');
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(leafCat.key)}`);
  await panel().getByRole("button", { name: "Add sub-category" }).waitFor();
  await panel().getByRole("button", { name: "Add sub-category" }).click();
  await sub.waitFor({ timeout: 5000 }).catch(() => undefined);
  step("QA-45 pass: 'Add sub-category' on a category with none yet opens the Add pop-up down to it, focused on Sub-category", await sub.count() === 1 && await sub.evaluate((e) => e === document.activeElement) && (await p.locator('[data-field="category"] input').inputValue()) === leafCat.label, leafCat.label);
  await sub.fill("Inside Canada (test)"); await p.waitForTimeout(500);
  await p.locator("[data-add-submit]").click(); await p.locator("[data-add-dialog]").waitFor({ state: "detached" }).catch(() => undefined);
  const after = await structOrder();
  step("QA-45 pass: the first sub-category is added there, by the page", after.some((n) => n.parentKey === leafCat.key && n.label === "Inside Canada (test)"));
  const setUpCat = nodes.find((n) => n.level === "category" && !kidsOf(n.key).length && n.hasSetup && !n.retired);
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(setUpCat.key)}`);
  await panel().getByRole("button", { name: "Add sub-category" }).waitFor();
  step("QA-45 fail: a category that has its own setup still cannot get a sub-category (button disabled)", await panel().getByRole("button", { name: "Add sub-category" }).isDisabled(), setUpCat.label);

  // ======================================================== QA-44: letters typed while a name saves are kept ("Add and add another")
  const leafCat2 = nodes.find((n) => n.level === "category" && !kidsOf(n.key).length && !n.hasSetup && !n.retired && n.key !== leafCat.key);
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(leafCat2.key)}`);
  await panel().getByRole("button", { name: "Add sub-category" }).click();
  await sub.waitFor();
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

  // ======================================================== QA-46: Remove is Remove everywhere
  const extra = (await api("/structure/nodes", { method: "POST", data: { pathwayType: "INDIVIDUAL", level: "program", label: "Removable program (test)", parentKey: "retail.citizenship" } })).body.key;
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(extra)}`);
  await panel().getByRole("button", { name: "Remove" }).click();
  await p.getByLabel(/Why remove/).fill("Added by mistake (test).");
  await panel().getByRole("button", { name: "Send for approval" }).click();
  await panel().locator("[data-panel-note]").waitFor();
  await as("user-B"); await p.goto(`${BASE}/review`); await p.waitForTimeout(800);
  const row = p.locator('tr[data-kind="library_change"]').filter({ hasText: "Removable program (test)" });
  const rowText = (await row.innerText().catch(() => "")) ?? "";
  step("QA-46 pass: To review calls it Remove, the word the author pressed", /Remove/.test(rowText) && !/Delete/.test(rowText), rowText.replace(/\s+/g, " ").slice(0, 160));
  await row.locator("[data-next] a").click().catch(() => undefined); await p.waitForURL(/\/review\/change\//, { timeout: 10000 }).catch(() => undefined); await p.waitForTimeout(600);
  const page = await p.locator("main").innerText();
  step("QA-46 pass: the approval page says Remove, never Delete", /Remove/.test(page) && !/\bDelete\b/.test(page), page.replace(/\s+/g, " ").slice(0, 160));
  await as("user-A");

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
