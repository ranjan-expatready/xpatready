// qa after-merge on S2 Immigration programs (W1-04, PR #53, main f289ec7), 27 Oct: what the builder's own check does not
// cover, walked as a content publisher and as the read-only approver. 390 px and 200 % zoom, keyboard only, the Structure
// and the page agreeing after add, rename, reorder, remove and retire, search edges, Status menu counts against what is
// shown, Start setup never creating (also on a double click), roles underneath, timings. Each label names its capability.
// Fails today mark findings (QA-n in the label); they pass once fixed. Real PostgreSQL, no model call except a saved
// replay (US$0).
//   zsh studio/tools/isolated.sh qa_s2 4472 start && node studio/tests/qa/check_qa_am_s2_1027.cjs 4472 xr_studio_qa_s2
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4472), DB = process.argv[3] ?? "xr_studio_qa_s2";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "qa", "reports", "2026-10-27-after-merge-s2"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 240)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const h = { "content-type": "application/json" }; if (init.actor !== null) h["x-actor"] = init.actor ?? "user-A"; const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: h, data: init.data, timeout: init.timeout ?? 30000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const cards = () => p.locator("[data-pathway-cards]");
  const card = (name) => cards().getByRole("button", { name: new RegExp(`^${name}`) });
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector('[data-view], [data-slot="empty-state"]'), null, { timeout: 30000 });
  const open = async (qs = "") => { await p.goto(`${BASE}/${qs}`); await ready(); await p.waitForTimeout(250); };
  const main = async () => (await p.locator("main").innerText()).replace(/\s+/g, " ");
  const sideways = () => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name}`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const shot = (n) => p.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: true });
  const combos = () => Number(sql("select count(*) from combination"));
  const cat = async (pw = "INDIVIDUAL", qs = "") => (await api(`/catalogue?pathway=${pw}&filter=all${qs}`)).body;
  const release = async () => api("/pack/release", { method: "POST", actor: "user-B", data: { note: "qa", expectedChanges: (await api("/draft")).body?.changes ?? 0 } });
  const approve = async (id) => api(`/library/changes/${id}/approve`, { method: "POST", actor: "user-B", data: {} });

  // ======================================================== empty after Reset, both tabs
  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await open("?pw=CORPORATE");
  step("C11.10 empty after Reset: Corporate and employers says it is empty in its own words and points to the Structure", /Nothing set up in Corporate and employers yet/.test(await main()) && await p.getByRole("button", { name: /^Open (Program s|S)tructure$/ }).count() === 1, (await main()).slice(0, 220));
  await p.getByRole("button", { name: /^Open (Program s|S)tructure$/ }).click(); await p.waitForURL(/\/structure/);
  step("C11.3 empty: Open Structure from Corporate lands on the Structure's Corporate tab", /t=CORPORATE/.test(p.url()) || /Corporate and employers/.test(await p.locator("[aria-pressed=true], [aria-selected=true]").first().innerText().catch(() => "")), p.url());
  await api("/demo/load", { method: "POST", timeout: 240000 }); // sample load runs past the 30 s request default on a loaded Mac

  // ======================================================== 390 px: the page a phone sees (the builder's check stops at 1024)
  await open();
  const first = await cat();
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300);
    const cols = await p.evaluate(() => { const s = document.querySelector("[data-section] ul, [data-section] [role=list]"); if (!s) return 0; const xs = new Set([...s.children].map((c) => Math.round(c.getBoundingClientRect().left))); return xs.size; });
    step(`C11.10 ${w} px: cards in ${w >= 1280 ? 3 : w >= 1000 ? 2 : 1} column(s), no sideways scroll`, !(await sideways()) && cols === (w >= 1280 ? 3 : w >= 1000 ? 2 : 1), `cols ${cols}, scrollWidth ${await p.evaluate(() => document.documentElement.scrollWidth)}`);
    const ctl = await p.evaluate(() => ["Search combinations", "Status:", "Cards", "List", "Add combination"].map((t) => { const e = [...document.querySelectorAll("main input, main button")].find((x) => (x.getAttribute("aria-label") ?? x.textContent).includes(t)); if (!e) return `${t}: missing`; const r = e.getBoundingClientRect(); return r.right <= window.innerWidth + 1 && r.left >= 0 && r.width > 20 ? "" : `${t}: off screen ${Math.round(r.left)}–${Math.round(r.right)}`; }).filter(Boolean));
    step(`C11.10 ${w} px: search, Status, Cards/List and Add combination are all on screen`, ctl.length === 0, ctl.join("; "));
    if (w === 390) { await shot("s2-390-cards"); await axe("390 px cards"); }
  }
  await p.getByRole("button", { name: "List", exact: true }).click(); await p.waitForSelector('[data-view="list"]');
  step("C11.10 390 px: the List view has no sideways scroll and each row keeps its next step on screen", !(await sideways()) && await p.evaluate(() => [...document.querySelectorAll('[role=row][data-node]')].slice(0, 5).every((r) => { const n = r.querySelector("[data-next-step], a, button"); return !n || n.getBoundingClientRect().right <= window.innerWidth + 1; })), `scrollWidth ${await p.evaluate(() => document.documentElement.scrollWidth)}`);
  await shot("s2-390-list"); await axe("390 px list");
  await p.getByRole("button", { name: "Cards", exact: true }).click(); await p.waitForSelector('[data-view="cards"]');
  // 200 % zoom of a 1440 screen = a 720 px wide layout at twice the pixels
  const z = await b.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2, reducedMotion: "reduce" }); const zp = await z.newPage();
  await zp.goto(BASE); await zp.evaluate(() => localStorage.setItem("xr-actor", "user-A")); await zp.goto(BASE); await zp.waitForSelector("[data-view]");
  step("C11.10 200 % zoom: no sideways scroll, Pathway cards and the first card's next step reachable", !(await zp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) && await zp.locator("[data-next-step]").first().isVisible());
  await zp.screenshot({ path: path.join(SHOTS, "s2-zoom200.png"), fullPage: false }); await z.close();
  await p.setViewportSize({ width: 1440, height: 900 });

  // ======================================================== keyboard only
  await open();
  await p.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => undefined);
  await p.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  step("C11.10 keyboard: ⌘K puts the cursor in the search", await p.evaluate(() => document.activeElement?.getAttribute("aria-label")?.startsWith("Search combinations")));
  await p.keyboard.type("visa"); await p.waitForTimeout(500);
  const seen = []; for (let i = 0; i < 30; i++) { await p.keyboard.press("Tab"); seen.push(await p.evaluate(() => { const a = document.activeElement; return (a?.getAttribute("aria-label") || a?.textContent || a?.tagName || "").replace(/\s+/g, " ").trim().slice(0, 40); })); if (/^(Start setup|Open|Add \d)/.test(seen.at(-1))) break; }
  step("C11.10 keyboard: from the search, Tab reaches Clear search, Status, Cards/List and then a card's next step", seen.some((t) => /Clear search/.test(t)) && seen.some((t) => /^Status/.test(t)) && seen.some((t) => /^(Start setup|Open|Add \d)/.test(t)), seen.join(" → "));
  const focusRing = await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { ok: cs.boxShadow !== "none" || cs.outlineStyle !== "none", what: `${a?.tagName} ${a?.getAttribute("aria-label") ?? a?.textContent?.slice(0, 40)} ${a?.className?.toString().slice(0, 160)}` }; });
  step("C11.10 keyboard: the focused element shows a focus ring", focusRing.ok, focusRing.what);
  await open();
  await card("Citizenship").focus(); await p.keyboard.press("Enter"); await p.waitForFunction(() => document.querySelectorAll("[data-section]").length === 1);
  await p.keyboard.press("Tab"); await p.keyboard.press("Shift+Tab");
  step("C11.10 keyboard: Enter on a Pathway card opens it and focus stays on the card", await card("Citizenship").getAttribute("aria-pressed") === "true" && await p.evaluate(() => document.activeElement?.getAttribute("data-pathway") === "retail.citizenship"));

  // ======================================================== search edges
  const search = p.getByRole("textbox", { name: /Search combinations/ });
  const typeSearch = async (t) => { await search.fill(t); await p.waitForTimeout(600); await ready(); };
  await open();
  await typeSearch("imm 5257");
  step("C11.10 search: a form number in lower case finds its combinations and says why", /\d+ of 21 combinations match/.test(await main()) && /Matches: .*IMM 5257/i.test(await main()), (await main()).match(/\d+ of 21[^.]*/)?.[0]);
  await typeSearch("working HOLIDAY");
  step("C11.10 search: a sub-category word in any case finds it", await p.locator("article[data-node]").count() === 1 && /Working holiday/.test(await main()));
  await typeSearch("Citizenship");
  step("C11.10 search: a Pathway's name finds its combinations", await p.locator("article[data-node]").count() >= 1 && (await p.locator("[data-section]").count()) === 1);
  await typeSearch("签证 visa de résident");
  step("C11.10 search: a non-English search with no match says so, with Clear search, and no error", /No combination matches/.test(await main()) && await p.getByRole("button", { name: "Clear search" }).count() >= 1);
  await typeSearch("x".repeat(300));
  step("C11.10 search: a 300-character search is cut, not refused (no 'could not load')", !/could not load/i.test(await main()) && /No combination matches/.test(await main()));
  await typeSearch("   ");
  step("C11.10 search: spaces only shows every combination", await p.locator("article[data-node]").count() === 21);
  await typeSearch("Global Talent");
  const offer = await main();
  step("C11.10 BR-8 search: a Corporate-only name from Retail is offered as '1 match in Corporate and employers', never mixed in", /1 match in Corporate and employers\. Show it/.test(offer) && await p.locator("article[data-node]").count() === 0, offer.match(/No combination[^.]*\.|\d+ match[^.]*\./g)?.join(" "));
  await p.getByRole("button", { name: /Show it/ }).click(); await ready(); await p.waitForTimeout(400);
  step("C11.10 BR-8: Show it keeps the search on the Corporate tab and shows that one card", /pw=CORPORATE/.test(p.url()) && await search.inputValue() === "Global Talent" && await p.locator("article[data-node]").count() === 1);

  // ======================================================== Status menu: each count equals what is then shown (with a Pathway chosen too)
  await open("?p=retail.temporary_residence");
  const statusBtn = () => p.getByRole("button", { name: /^Status:/ });
  await statusBtn().click();
  const opts = await p.getByRole("menuitemradio").evaluateAll((xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ")));
  await p.keyboard.press("Escape");
  const bad = [];
  for (const o of opts) {
    const [, label, n] = o.match(/^(All|Needs work|Not started|In setup|Not ready|Live)(?: · default)? (\d+)/) ?? [];
    if (!label) { bad.push(`unparsed ${o}`); continue; }
    await statusBtn().click(); await p.getByRole("menuitemradio").filter({ hasText: new RegExp(`^${label}`) }).click(); await ready(); await p.waitForTimeout(300);
    const shown = await p.locator("article[data-node]").count();
    if (shown !== Number(n)) bad.push(`${label}: menu ${n}, shown ${shown}`);
  }
  step("C11.10 BR-13: with a Pathway chosen, every Status option's count equals the cards then shown", bad.length === 0 && opts.length === 6, bad.join("; ") || opts.join(" | "));

  // ======================================================== the Structure and the page agree (add, rename, reorder, remove, retire)
  await open();
  const vis = "individual.visitors";
  const add = await api("/structure/nodes", { method: "POST", data: { pathwayType: "INDIVIDUAL", level: "category", parentKey: vis, label: "Visitor record", decision: "add_anyway" } });
  await open();
  const vr = p.locator(`article[data-label="Visitor record"]`);
  step("C11.10 BR-2: a category added on the Structure is a Not started card at once, counted in its Pathway card", add.status === 201 && await vr.count() === 1 && /Not started/.test(await vr.innerText()) && /13 combinations/.test(await card("Temporary residence").innerText()), `${add.status} ${(await card("Temporary residence").innerText()).replace(/\s+/g, " ")}`);
  const node = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.find((n) => n.key === add.body.key);
  const ren = await api(`/structure/nodes/${add.body.key}`, { method: "PATCH", data: { label: "Visitor record extension", version: node.version } });
  await open();
  step("C11.10 BR-6: a rename on the Structure shows on the page at once (same key)", ren.status === 200 && await p.locator(`article[data-node="${add.body.key}"][data-label="Visitor record extension"]`).count() === 1, ren.status);
  const progs = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.filter((n) => n.parentKey === "retail.temporary_residence").map((n) => n.label);
  const pageProgs = [...new Set(await p.locator('[data-section="retail.temporary_residence"] article[data-node]').evaluateAll((xs) => xs.map((x) => x.querySelector("[data-trail]")?.textContent.split(" › ")[2] ?? x.getAttribute("aria-label")?.split(" › ")[2])))];
  step("QA-49 C11.10 P-116: the page lists programs in the Structure's order (sample, before any reorder)", JSON.stringify(pageProgs) === JSON.stringify(progs), `structure ${progs.join(", ")} / page ${pageProgs.join(", ")}`);
  const kids = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.filter((n) => n.parentKey === vis).map((n) => n.key);
  const reversed = [...kids].reverse();
  const reo = await api("/structure/reorder", { method: "POST", data: { pathwayType: "INDIVIDUAL", parentKey: vis, keys: reversed } });
  await open("?p=retail.temporary_residence");
  const order = await p.locator(`article[data-node^="${vis}."]`).evaluateAll((xs) => xs.map((x) => x.getAttribute("data-node")));
  step("QA-49 C11.10 P-116: a reorder on the Structure is the order of that program's cards on the page", reo.status < 300 && JSON.stringify(order) === JSON.stringify(reversed), `reorder ${reo.status}; structure ${reversed.join(",")} / page ${order.join(",")}`);
  await p.getByRole("button", { name: "List", exact: true }).click(); await p.waitForSelector('[data-view="list"]');
  const lorder = await p.locator(`[role=row][data-node^="${vis}."]`).evaluateAll((xs) => xs.map((x) => x.getAttribute("data-node")));
  await p.locator('[role=columnheader] button').first().click(); await p.waitForTimeout(300); await p.locator('[role=columnheader] button').first().click(); await p.waitForTimeout(300);
  await p.locator('[role=columnheader] button').first().hover(); const sortTip = await p.getByRole("tooltip").first().innerText().catch(() => "");
  await p.locator('[role=columnheader] button').first().click(); await p.waitForTimeout(300);
  const lorder2 = await p.locator(`[role=row][data-node^="${vis}."]`).evaluateAll((xs) => xs.map((x) => x.getAttribute("data-node")));
  step("QA-49 C11.10 P-116: the List follows the same Structure order, also after 'Back to Structure order'", JSON.stringify(lorder) === JSON.stringify(reversed) && JSON.stringify(lorder2) === JSON.stringify(reversed), `tip "${sortTip}"; list ${lorder2.join(",")}`);
  await p.getByRole("button", { name: "Cards", exact: true }).click();
  const del = await api(`/structure/nodes/${add.body.key}`, { method: "DELETE", data: { reason: "qa: added by mistake" } });
  const delId = del.body?.change?.id ?? del.body?.id;
  await open();
  step("C11.10 P-116: a remove waiting for approval still shows the card (nothing gone yet)", await p.locator(`article[data-node="${add.body.key}"]`).count() === 1, `${del.status} ${JSON.stringify(del.body).slice(0, 120)}`);
  const ap = await approve(delId);
  await open();
  step("C11.10 P-116: once approved, the removed name's card is gone and the counts drop back", ap.status < 300 && await p.locator(`article[data-node="${add.body.key}"]`).count() === 0 && /12 combinations/.test(await card("Temporary residence").innerText()), `${ap.status}`);

  // ======================================================== Start setup never creates, also on a double click; Add pathway goes to the Structure
  const n0 = combos();
  const ns = p.locator('article:has([data-next-step]):has-text("Not started")').first();
  const nsLabel = await ns.getAttribute("data-label");
  // S3 (P-125, routed by the screens lane 28 Oct): Start setup starts the setup and opens it; a double click starts one.
  await ns.locator("[data-next-step]").dblclick(); await p.waitForURL(/\/c\/[0-9a-f-]+\/(sources|forms)/); // S3 item 5: lands on the Forms tab
  step("C11.10 fix 3 (S3): a double click on Start setup starts one setup, not two", combos() === n0 + 1, `${nsLabel}: ${n0} → ${combos()}`);
  await p.goBack(); await p.waitForTimeout(800);
  step("QA-50 C11.10: after a double click on Start setup, one Back returns to Immigration programs", !/\/c\//.test(p.url()), p.url());
  await open();
  await card("Add pathway").click(); await p.waitForURL(/\/structure/);
  step("C11.10: + Add pathway opens the Structure (new names enter only there)", /\/structure/.test(p.url()), p.url());

  // ======================================================== need you, seen by a person: one waiting combination
  const sv = (await cat()).rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  for (let i = 0; i < 60; i++) { if ((await cat()).rows.find((x) => x.nodeKey === sv.nodeKey).aiProposals > 0) break; await p.waitForTimeout(500); }
  await open();
  const trCard = (await card("Temporary residence").innerText()).replace(/\s+/g, " ");
  const allCard = (await card("All pathways").innerText()).replace(/\s+/g, " ");
  step("C11.10 fix 6: one waiting combination (AI proposals) shows '1 needs you' on its Pathway card, All pathways and its section", /1 needs you/.test(trCard) && /1 needs you/.test(allCard) && /1 needs you/.test(await p.locator('[data-section="retail.temporary_residence"]').innerText()), `${trCard} / ${allCard}`);
  await statusBtn().click(); await p.getByRole("menuitemradio").filter({ hasText: /^Needs work/ }).click(); await ready();
  step("C11.10 BR-13: Needs work lists the waiting combination (Super visa)", await p.locator('article[data-label="Super visa"]').count() === 1);
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  step("C11.10 390 px: the need-you chip is on screen and the page does not scroll sideways", !(await sideways()) && await p.locator("[data-need-you]").first().isVisible());
  await shot("s2-390-need-you");
  await p.setViewportSize({ width: 1440, height: 900 });

  // ======================================================== read-only approver and the server underneath
  await as("user-B"); await open();
  await cards().getByRole("button", { name: /Add pathway/ }).hover();
  const addTip = await p.getByRole("tooltip").first().innerText().catch(() => "");
  step("BR-15 read-only: '+ Add pathway' tells the approver why it is disabled", /configuration author/i.test(addTip), addTip);
  const notStartedName = p.locator('article:has-text("Not started")').first();
  const nb = combos();
  await notStartedName.locator("[data-open]").click(); await p.waitForTimeout(600);
  const said = (await p.locator("body").innerText()).replace(/\s+/g, " ");
  step("BR-15 read-only: the approver clicking a Not started name gets the reason, stays on the page and nothing is created", combos() === nb && /A configuration author starts it/.test(said) && !/\/new/.test(p.url()), said.match(/[^.]*configuration author starts it\./)?.[0]);
  const leaf = (await cat()).rows.find((r) => !r.combinationId && r.level === "Category");
  const body = { nodeKey: leaf.nodeKey }; // S3: the one server-side start (the path builder's request went with its page)
  const asB = await api("/combinations/start", { method: "POST", actor: "user-B", data: body });
  const asNone = await api("/combinations/start", { method: "POST", actor: null, data: body });
  step("BR-15 server: a start by the approver is refused 403 and by nobody 401, in plain words", asB.status === 403 && asNone.status === 401 && typeof asB.body?.detail === "string", `${asB.status} ${asB.body?.detail ?? asB.body?.title} / ${asNone.status}`);
  await axe("approver cards");
  await as("user-A");

  // ======================================================== a retired combination (QA-48 context): where does a person find it?
  const vv = (await cat()).rows.find((r) => r.nodeKey === "individual.work_permits.employer_specific.with_lmia");
  const rt = await api(`/combinations/${vv.combinationId}/retire`, { method: "POST", data: { reason: "qa: no longer offered" } });
  await approve(rt.body?.change?.id ?? rt.body?.id); const rel = await release();
  await open();
  await statusBtn().click();
  const optsAfter = await p.getByRole("menuitemradio").evaluateAll((xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ")));
  await p.keyboard.press("Escape");
  step("C11.9 P-116: a retired combination leaves the cards (All) after the release", rel.status === 201 && await p.locator(`article[data-node="${vv.nodeKey}"]`).count() === 0, `${rt.status} ${rel.status}`);
  step("QA-48 C11.9 P-116: a person can find a retired combination on the page (a Retired status or a note), to restore it", optsAfter.some((o) => /Retired/.test(o)) || /retired/i.test(await main()), optsAfter.join(" | "));
  const restoreName = await api(`/combinations/${vv.combinationId}/restore`, { method: "POST", data: { reason: "qa" } });
  await approve(restoreName.body?.change?.id ?? restoreName.body?.id); await release();

  // ======================================================== timings at sample size (STANDARDS §9)
  const t0 = Date.now(); await p.goto(BASE); await p.waitForSelector("article[data-node]"); const firstView = Date.now() - t0;
  const t1 = Date.now(); await search.fill("permit"); await p.waitForFunction(() => /of \d+ combinations match/.test(document.querySelector("main").innerText)); const searchMs = Date.now() - t1;
  step("C11.10 STANDARDS §9: first view under 1 s and a search answered under 400 ms (120 ms pause included) at sample size", firstView < 1000 && searchMs < 400, `first view ${firstView} ms, search ${searchMs} ms`);

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  console.log(`${pass}/${pass + fail} passed`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
