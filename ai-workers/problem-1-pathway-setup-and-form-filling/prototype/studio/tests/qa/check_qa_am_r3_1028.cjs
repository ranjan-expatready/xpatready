// qa lane, /qa after-merge on main dccd87e (28 Oct, PR #66): Program structure round 3 (P-128) and the shared lifecycle
// pattern (P-116 amended), walked like a configuration author and a second person at 1440 and 1024 px (desktop only in
// wave 1), then Immigration programs' filter bar and Add combination (P-128 (4)(5)). Resets the copy and loads the
// sample itself (Load sample is not under test here, P-33). Findings fail here today and pass when fixed (QA-55 onwards);
// the rest guard what works. Every name and person is Sample. No model call (US$0).
//   zsh studio/tools/isolated.sh qa_r3 4473 start
//   node studio/tests/qa/check_qa_am_r3_1028.cjs 4473 xr_studio_qa_r3        (QA_HEADED=1 shows the browser)
const fs = require("node:fs"); const path = require("node:path"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const [PORT, DB] = [process.argv[2] ?? "4473", process.argv[3] ?? "xr_studio_qa_r3"];
const BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => fs.existsSync(p));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-28-after-merge-r3");
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 320)}` : ""}`); };
const call = async (method, url, body, actor = "user-A") => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(240000) }); return { status: r.status, body: await r.json().catch(() => null) }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const keyOf = (label, prefix = "individual.") => sql(`select program_node_key from program_def where label='${label.replace(/'/g, "''")}' and program_node_key like '${prefix}%' order by created_at limit 1`);

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  step("setup: Reset, then Load sample", load.status < 300, load.status);
  const browser = await chromium.launch({ channel: "chrome", headless: !process.env.QA_HEADED });
  const errors = [];
  const page = async (actor, width = 1440) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("qa-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("qa-init", "1"); } } catch { /* private window */ } }, actor);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(String(e))); return p;
  };
  const axe = async (p, name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations; step(`QA-57 ${name}: axe clean`, !v.length, v.map((x) => `${x.id} (${x.nodes.length}) ${x.nodes[0]?.target} "${x.nodes[0]?.html?.replace(/<[^>]+>/g, "").slice(0, 40)}" ${x.nodes[0]?.any?.[0]?.message?.slice(0, 120) ?? ""}`).join(", ") || "clean"); };
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: false });
  const text = async (p, sel = "main") => (await p.locator(sel).first().innerText()).replace(/\s+/g, " ");
  const row = (p, key) => p.locator(`[data-row="${key}"]`);
  const openStructure = async (p, qs = "") => { await p.goto(`${BASE}/structure${qs}`); await p.locator("[data-row]").first().waitFor({ timeout: 30000 }); };

  const a = await page("user-A");
  // ═════════════ 1. The outline (P-128 (1), (3), (6))
  await openStructure(a);
  const rows = await a.locator("[data-row]").count();
  const api = (await call("GET", "/structure?pathwayType=INDIVIDUAL")).body.nodes.filter((n) => !n.retired);
  step("C11.3 P-128 (1): the Tree shows every active Retail name as one row", rows === api.length, `${rows} rows, ${api.length} names`);
  const nums = await a.locator("[data-row] [data-num]").allInnerTexts();
  step("P-128 (1): rows are numbered 1, 1.1, 1.1.1, 1.1.1.1 in page order", nums[0] === "1" && nums[1] === "1.1" && nums[2] === "1.1.1" && nums.includes("1.2.1.1") && nums.every((n) => /^\d+(\.\d+){0,3}$/.test(n)), nums.slice(0, 8).join(" "));
  const actions = await a.locator("[data-row]").evaluateAll((els) => els.map((e) => [e.querySelector("[data-edit]")?.textContent?.trim().split(" ")[0], e.querySelector("[data-action]")?.textContent?.trim().split(" ")[0]]));
  step("P-128 (3): every row writes Edit and exactly one lifecycle word (Delete, Retire, Restore or Withdraw)", actions.every(([e, x]) => e === "Edit" && ["Delete", "Retire", "Restore", "Withdraw"].includes(x)), [...new Set(actions.map((x) => x.join("+")))]);
  const greyed = await a.locator("[data-row] [data-action][aria-disabled=true]").count();
  const reasons = await a.locator("[data-row] [data-action][aria-disabled=true]").evaluateAll((els) => els.map((e) => { const id = e.getAttribute("aria-describedby"); const r = id && document.getElementById(id); return !!r && r.offsetParent !== null && /Can't|waiting/.test(r.textContent || ""); }));
  step("P-116 amended: every greyed action has its reason as visible text on the page (not a tooltip only)", greyed > 0 && reasons.every(Boolean), `${greyed} greyed, ${reasons.filter(Boolean).length} with a visible reason`);
  const codes = await text(a);
  step("P-116 amended: no rule codes on screen (L1, L2, L3, L6)", !/\(L\d\)|\bL[1-6]\b/.test(codes));
  // QA-55: the parent's "Can't retire yet" names never-released, unused names as "still in use" and says "Retire those first",
  // but those rows can only be deleted ("It was never released: delete it instead").
  const wp = keyOf("Work permits"), owp = keyOf("Open work permit");
  const wpWhy = (await row(a, wp).innerText()).replace(/\s+/g, " ");
  const owpAction = await row(a, owp).locator("[data-action]").getAttribute("data-action");
  step("QA-55 P-116 amended: a released Program's retire reason does not call unused, never-released names 'in use' nor ask to retire names that can only be deleted", !(/still in use/.test(wpWhy) && /Retire those first/.test(wpWhy) && owpAction === "DELETE"), `${wpWhy.match(/Can't retire yet[^.]*\.[^.]*\./)?.[0]} · "Open work permit" (unused, never released) offers ${owpAction}`);
  const numTip = await a.locator("[data-row] [data-num]").first().evaluate((e) => e.closest("[data-state]")?.outerHTML?.length ?? 0);
  await a.locator("[data-row] [data-num]").first().hover(); await wait(700);
  step("P-128 (1): the number's tooltip says it is not an IRCC code", /Not an IRCC code/.test(await a.locator("[role=tooltip]").first().innerText().catch(() => "")), numTip);
  await axe(a, "Program structure Tree at 1440 px");
  await shot(a, "r3-tree-1440");

  // ═════════════ 2. The filter bar (P-128 (4)) and the views
  await a.locator("[data-pathway-chip]").filter({ hasText: "Permanent residence" }).click(); await wait(500);
  const pwRows = await a.locator("[data-row][data-level=pathway]").allInnerTexts();
  step("P-128 (4): a Pathway chip shows only that Pathway, and it is in the address", pwRows.length === 1 && /Permanent residence/.test(pwRows[0]) && /[?&]p=/.test(a.url()), `${pwRows.length} pathway rows · ${a.url()}`);
  await a.reload(); await a.locator("[data-row]").first().waitFor();
  step("P-128 (4): reload keeps the Pathway filter", await a.locator("[data-row][data-level=pathway]").count() === 1);
  await a.locator("[data-clear-all]").click(); await wait(400);
  await a.locator("[data-status-filter]").selectOption("live"); await wait(500);
  const liveNames = await a.locator("[data-row] [data-name]").allInnerTexts();
  step("P-128 (4): Status Live keeps the Live combination with the names above it", liveNames.includes("With an LMIA") && !liveNames.includes("Visitor visa"), liveNames.join(" | "));
  step("P-128 (4): the counts line shows the active filter as a chip with Clear all", await a.locator("[data-clear-all]").count() === 1 && await a.getByRole("button", { name: /Remove the filter/ }).count() >= 1);
  await a.locator("[data-clear-all]").click(); await wait(400);
  await a.getByRole("textbox", { name: /Find a name/ }).fill("lmia"); await wait(800);
  const found = await a.locator("[data-row] [data-name]").allInnerTexts();
  step("Find 'lmia' keeps the matching names and their trail only", found.includes("With an LMIA") && found.includes("LMIA-exempt (employer offer)") && !found.includes("Visitor visa"), found.join(" | "));
  await a.locator("[data-clear-all]").click().catch(() => {}); await wait(300);
  // List view, remembered per person.
  await a.getByRole("button", { name: "List", exact: true }).click(); await a.locator("[data-list]").waitFor();
  const lines = await a.locator("[data-list] [data-row]").count();
  const combos = api.filter((n) => n.combination).length;
  const first = (await a.locator("[data-list] [data-row]").first().innerText()).replace(/\s+/g, " ");
  step("P-128 (1): the List is one line per combination", lines === combos, `${lines} lines, ${combos} combinations`);
  step("P-128 (1): each List line carries the full trail Pathway type › Pathway › Program › Category › Sub-category", /Retail/.test(first) && /Temporary residence/.test(first) && /Visitors/.test(first), first.slice(0, 200));
  await a.locator("[data-sort]").selectOption("az"); await wait(500);
  const az = await a.locator("[data-list] [data-row]").evaluateAll((els) => els.map((e) => e.querySelector("[data-trail]")?.textContent?.trim() ?? e.textContent.trim()));
  step("P-128 (1): A to Z sorts the List (page order is the default)", az.length === combos && /[?&]sort=az/.test(a.url()), az.slice(0, 3).join(" / "));
  await axe(a, "Program structure List at 1440 px");
  await shot(a, "r3-list-1440");
  await a.goto(`${BASE}/structure`); await a.locator("[data-row]").first().waitFor();
  step("P-128 (1): the List view is remembered for this person", await a.locator("[data-list]").count() === 1);
  const c = await page("user-C"); await openStructure(c);
  step("P-128 (1): another person keeps their own view (Tree)", await c.locator("[data-list]").count() === 0 && await c.locator("[data-block]").count() > 0);
  await a.getByRole("button", { name: "Tree", exact: true }).click(); await wait(300);

  // ═════════════ 3. One Add (P-128 (2)), prefilled from the filters
  const visitors = keyOf("Visitors");
  await openStructure(a, `?p=retail.temporary_residence&prog=${visitors}`);
  await a.locator("[data-add-open]").click();
  const dlg = a.getByRole("dialog"); await dlg.waitFor(); await wait(500);
  const pre = await dlg.locator("input[role=combobox]").evaluateAll((els) => els.map((e) => e.value));
  const focus = await a.evaluate(() => document.activeElement?.getAttribute("placeholder") ?? "");
  step("C11.17 P-128 (2): Add opens the pop-up prefilled from the tab, Pathway and Program filters, focus on the first empty level", pre[0] === "Temporary residence" && pre[1] === "Visitors" && /category/i.test(focus), `${pre.join(" | ")} · focus "${focus}"`);
  const cat = dlg.getByRole("combobox").nth(2);
  await cat.fill("visitor-VISA"); await wait(900);
  const exists = await text(a, "[role=dialog]");
  step("C11.3: an existing name typed with other case and a hyphen is recognised (Uses the existing / already there), nothing new to add", /Uses the existing category|Already in the Program structure/.test(exists) && !/1 new name/.test(exists), exists.match(/You are adding[^.]*\./)?.[0] ?? exists.slice(0, 160));
  await cat.fill("Visiter visa"); await wait(1200);
  step("C11.3: a close spelling asks 'Did you mean … Visitor visa' with Keep mine", /Did you mean .*Visitor visa/.test(await text(a, "[role=dialog]")) && await dlg.locator("[data-keep]").count() === 1);
  // QA-56: Enter on a newly typed name (the list's "Add “…” New" line) does nothing; a keyboard person keeps typing into it.
  await cat.fill("Business visit"); await wait(900);
  await cat.press("Enter"); await wait(400);
  const moved = await a.evaluate(() => document.activeElement?.closest("[data-field]")?.getAttribute("data-field"));
  step("QA-56 C11.3 keyboard: Enter on a new typed name accepts it and moves to the next level (as it does for a picked name)", moved === "subCategory", `focus stays in ${moved}`);
  await cat.press("Tab"); await wait(200);
  const onNone = await a.evaluate(() => document.activeElement?.hasAttribute("data-none"));
  await a.keyboard.press("Space"); await wait(300);
  await a.keyboard.type("Outside Canada"); await wait(900);
  step("C11.3 keyboard: Tab from a new category reaches 'None: the category is the combination', Space unticks it and moves into Sub-category", onNone && await dlg.getByRole("combobox").nth(3).inputValue() === "Outside Canada");
  const adding = await text(a, "[role=dialog]");
  step("C11.17 P-128 (2): 'You are adding' says the whole line and how many new names", /You are adding Retail › Temporary residence › Visitors › Business visit(New)? › Outside Canada/.test(adding) && /2 new names/.test(adding), adding.match(/You are adding.{0,140}/)?.[0]);
  const before = Number(sql("select count(*) from program_def")), combosBefore = Number(sql("select count(*) from combination"));
  await dlg.getByRole("button", { name: /^Add/ }).last().click();
  await dlg.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
  await wait(800);
  const bv = keyOf("Business visit");
  step("P-128 (2): only the two new names are written", Number(sql("select count(*) from program_def")) === before + 2 && !!bv);
  const leafNode = (await call("GET", "/structure?pathwayType=INDIVIDUAL")).body.nodes.find((n) => n.parentKey === bv);
  step("P-128 (2): no setup starts (the new combination is Not started)", Number(sql("select count(*) from combination")) === combosBefore && /Not started/.test(leafNode?.combination?.statusText ?? "Not started") && !leafNode?.hasSetup, `${Number(sql("select count(*) from combination")) - combosBefore} new combination rows · ${leafNode?.combination?.statusText}`);
  step("P-128 (2): the new line shows on the page (Just added, or listed under Visitors)", await row(a, bv).count() === 1, await a.locator("[data-page-note]").innerText().catch(() => ""));
  await shot(a, "r3-after-add");

  // ═════════════ 4. The lifecycle pattern: own draft deleted at once with Undo (P-116 amended)
  await openStructure(a);
  await row(a, bv).locator("[data-action]").click();
  const panel = a.locator("aside").filter({ hasText: /Delete "Business visit"/ });
  await panel.waitFor({ timeout: 8000 });
  const ptext = (await panel.innerText()).replace(/\s+/g, " ");
  step("P-116 amended: the impact list names what goes with it and says it is the author's own draft, deleted now (no reason box)", /Outside Canada/.test(ptext) && /your own draft/.test(ptext) && await panel.locator("#lifecycle-reason").count() === 0, ptext.slice(0, 260));
  await axe(a, "Impact panel (own draft) at 1440 px");
  await panel.locator("[data-confirm-send]").click();
  await a.locator("[data-undo-toast]").waitFor({ timeout: 8000 });
  step("P-116 amended: an author's own never-approved draft is deleted at once (no second person)", sql(`select count(*) from program_def where program_node_key like '${bv}%'`) === "0" && sql("select count(*) from library_change where status='WAITING'") === "0");
  const note = await a.locator("[data-page-note]").innerText().catch(() => "");
  step("P-116 amended: the page says what was deleted, not only the toast", /Deleted "Business visit" and the 1 name under it/.test(note), note);
  await a.locator("[data-undo]").click(); await wait(1500);
  step("P-116 amended: Undo brings the same names back", sql(`select count(*) from program_def where program_node_key like '${bv}%'`) === "2" && await row(a, bv).count() === 1);
  const chg = sql("select id from library_change where kind='structure_node' and action='DELETE' order by proposed_at desc limit 1");
  const again = await call("POST", `/library/changes/${chg}/undo`, {});
  step("P-116 amended: a second Undo is refused in plain words", again.status === 409 && !!again.body?.detail, `${again.status} ${again.body?.detail}`);
  // Undo after the toast's 10 s: only the toast offers it.
  await row(a, bv).locator("[data-action]").click(); await a.locator("aside [data-confirm-send]").click();
  await a.locator("[data-undo-toast]").waitFor(); await wait(10800);
  const undoLater = await a.getByRole("button", { name: "Undo" }).count();
  step("QA-58 P-116 amended: after the 10 s toast an own-draft delete can still be undone from the page", undoLater > 0, `${undoLater} Undo on the page after 10.8 s (the API still allows it)`);
  await call("POST", `/library/changes/${sql("select id from library_change where kind='structure_node' and action='DELETE' order by proposed_at desc limit 1")}/undo`, {});

  // ═════════════ 5. Sample names need the second person; Withdraw on the row
  await openStructure(a);
  const ext = keyOf("Extend stay in Canada");
  await row(a, ext).locator("[data-action]").click();
  const p2 = a.locator("aside").filter({ hasText: /Delete "Extend stay in Canada"/ }); await p2.waitFor();
  step("Lead review fix 1: a name Load sample added is not the loader's own draft: the impact panel asks a reason for the second person", await p2.locator("#lifecycle-reason").count() === 1 && /second person/i.test(await p2.innerText()));
  await p2.locator("#lifecycle-reason").fill("Not filed by this firm (qa walk)"); await p2.locator("[data-confirm-send]").click(); await wait(1500);
  step("P-116: the delete waits; the row now offers Withdraw", sql(`select count(*) from program_def where program_node_key='${ext}'`) === "1" && await row(a, ext).locator("[data-action]").getAttribute("data-action") === "WITHDRAW");
  const self = await call("POST", `/library/changes/${sql("select id from library_change where status='WAITING' limit 1")}/approve`, {});
  step("P-116: the asker cannot approve their own deletion (403)", self.status === 403, self.status);
  await row(a, ext).locator("[data-action]").click();
  const wd = a.locator("aside").filter({ hasText: /Withdraw/ }); await wd.waitFor();
  if (await wd.locator("#lifecycle-reason").count()) await wd.locator("#lifecycle-reason").fill("Changed my mind (qa walk)");
  await wd.locator("[data-confirm-send]").click(); await wait(1500);
  step("P-116: Withdraw takes the change back; the row offers Delete again", sql("select count(*) from library_change where status='WAITING'") === "0" && await row(a, ext).locator("[data-action]").getAttribute("data-action") === "DELETE");

  // ═════════════ 6. Exact branch delete (P-128 (3), R3-4): a Program and every name under it, one approval
  const prd = keyOf("Permanent resident documents");
  await row(a, prd).locator("[data-action]").click();
  const p3 = a.locator("aside").filter({ hasText: /Delete "Permanent resident documents" and everything under it/ }); await p3.waitFor();
  const goes = await p3.locator("[data-goes-with] li").allInnerTexts();
  step("R3-4: a Program's Delete lists every name that goes with it, numbered", goes.length === 2 && goes.some((g) => /PR card renewal/.test(g)) && goes.every((g) => /^\d+(\.\d+)+ /.test(g)), goes.join(" | "));
  await p3.locator("#lifecycle-reason").fill("Not offered (qa walk)"); await p3.locator("[data-confirm-send]").click(); await wait(1500);
  const bch = sql("select id from library_change where status='WAITING' limit 1");
  // A name added under it after the proposal: the approval must refuse (exact branch).
  const late = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: "retail.permanent_residence" }, program: { key: prd }, category: { label: "Replacement card" }, subCategory: null, decision: "new" });
  const b = await page("user-B");
  await b.goto(`${BASE}/review/change/${bch}`); await b.locator("main h1").waitFor();
  const btext = await text(b);
  step("R3-4: the approval page re-checks before the click and says a name was added under it", /Changed since it was proposed: "Replacement card" was added under it/.test(btext), `add ${late.status} · ${btext.match(/(Checked again|Changed since|Can't approve)[^.]*\./)?.[0]}`);
  const ap1 = await call("POST", `/library/changes/${bch}/approve`, {}, "user-B");
  step("R3-4: approving that branch is refused and nothing is deleted", ap1.status >= 400 && sql(`select count(*) from program_def where program_node_key like '${prd}%'`) === "4", `${ap1.status} ${ap1.body?.detail}`);
  await call("POST", `/library/changes/${bch}/return`, { note: "A name was added under it (qa)" }, "user-B");
  await openStructure(a);
  const retRow = (await row(a, prd).innerText()).replace(/\s+/g, " ");
  step("QA-59 P-116 amended: a returned deletion says on its row that it was returned and why (not only 'Withdraw')", /[Rr]eturned/.test(retRow), retRow.slice(0, 200));
  await call("POST", `/library/changes/${bch}/withdraw`, { note: "Proposing again (qa)" });
  // Again, without the late name (deleted at once as user-A's own draft), then approved.
  const rc = await call("DELETE", `/structure/nodes/${encodeURIComponent(keyOf("Replacement card"))}`, { reason: "Added to test the re-check (qa)" });
  const re = await call("DELETE", `/structure/nodes/${encodeURIComponent(prd)}`, { reason: "Not offered (qa walk)" });
  const reId = sql("select id from library_change where status='WAITING' limit 1");
  step("R3-4: after the late name is deleted (own draft, at once), the branch can be proposed again", rc.status < 300 && re.status < 300 && !!reId, `${rc.status} ${rc.body?.detail ?? ""} · ${re.status} ${re.body?.detail ?? ""}`);
  await b.goto(`${BASE}/review/change/${reId}`); await b.locator("main h1").waitFor();
  const bt2 = await text(b);
  step("R3-4: the approval page lists what goes with it and says it was checked again just now", /Checked again just now/.test(bt2) && /PR card renewal/.test(bt2) && /Travel document/.test(bt2), bt2.match(/Checked again[^.]*\./)?.[0]);
  await axe(b, "Approval page (branch delete) at 1440 px");
  await b.getByRole("button", { name: "Approve", exact: true }).click(); await wait(2000);
  step("R3-4: approved, the Program and its 2 names are deleted together", sql(`select count(*) from program_def where program_node_key like '${prd}%'`) === "0", sql("select status from library_change order by decided_at desc nulls last limit 1"));

  // ═════════════ 7. A Live combination row: Retire retires the name and its combination; Show retired; Restore
  const lmia = keyOf("With an LMIA"), lmiaCombo = sql(`select c.id from combination c join program_def d on d.id=c.program_def_id where d.program_node_key='${lmia}'`);
  await openStructure(a);
  await row(a, lmia).locator("[data-action]").click();
  const p4 = a.locator("aside").filter({ hasText: /Retire "With an LMIA"/ }); await p4.waitFor();
  step("QA-48 P-116: the Live combination row offers Retire and says its combination is retired with it", /Its combination is retired with it/.test(await p4.innerText()));
  await p4.locator("#lifecycle-reason").fill("Program paused (qa walk)"); await p4.locator("[data-confirm-send]").click(); await wait(1500);
  const rch = sql("select id from library_change where status='WAITING' limit 1");
  await b.goto(`${BASE}/review/change/${rch}`); await b.locator("main h1").waitFor();
  step("Lead (1): the approval page says the combination is retired with it", /combination is retired with it/i.test(await text(b)));
  await b.getByRole("button", { name: "Approve", exact: true }).click(); await wait(1500);
  const d = (await call("GET", "/draft", undefined, "user-B")).body;
  const rel = await call("POST", "/pack/release", { note: "qa: retire LMIA", expectedChanges: d?.changes ?? 0 }, "user-B");
  step("P-116: retire takes effect with the release (name and combination retired)", rel.status < 300 && sql(`select retired_at is not null from program_def where program_node_key='${lmia}'`) === "t" && sql(`select retired_at is not null from combination where id='${lmiaCombo}'`) === "t", `${rel.status} ${rel.body?.detail ?? ""}`);
  await openStructure(a);
  const hidden = await row(a, lmia).count();
  await a.locator("[data-show-retired]").click(); await wait(800);
  const rrow = row(a, lmia);
  step("P-128 (3): a retired row is hidden until Show retired, then shows '—' for its number and offers Restore", hidden === 0 && await rrow.locator("[data-num]").innerText() === "—" && await rrow.locator("[data-action]").getAttribute("data-action") === "RESTORE");
  await a.goto(`${BASE}/`); await a.waitForLoadState("networkidle");
  const prog = await text(a);
  step("QA-48: Immigration programs shows a Retired status or count for the retired combination", /Retired/.test(prog), prog.match(/Status[^]{0,120}/)?.[0]);
  await openStructure(a, "?r=1");
  await row(a, lmia).locator("[data-action]").click();
  const p5 = a.locator("aside").filter({ hasText: /Restore "With an LMIA"/ }); await p5.waitFor();
  const restoreBlocked = await p5.locator("[data-confirm-send]").count();
  if (restoreBlocked) { await p5.locator("#lifecycle-reason").fill("Program back (qa walk)"); await p5.locator("[data-confirm-send]").click(); await wait(1500); }
  const rs = sql("select id from library_change where status='WAITING' limit 1");
  if (rs) { await call("POST", `/library/changes/${rs}/approve`, {}, "user-B"); const d2 = (await call("GET", "/draft", undefined, "user-B")).body; await call("POST", "/pack/release", { note: "qa: restore", expectedChanges: d2?.changes ?? 0 }, "user-B"); }
  step("P-116: Restore on the row brings the name and its combination back after approval and release", sql(`select retired_at is null from program_def where program_node_key='${lmia}'`) === "t" && sql(`select retired_at is null from combination where id='${lmiaCombo}'`) === "t");

  // ═════════════ 8. Roles: the second person reads; the server refuses
  await openStructure(b);
  const addOff = await b.locator("[data-add-open]").isDisabled();
  const bEdit = await b.locator("[data-row] [data-edit]").first().innerText();
  step("BR-15: the approver cannot Add (disabled) and rows say View, not Edit", addOff && /View/.test(bEdit), bEdit);
  const r403 = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { label: "By approver" }, decision: "new" }, "user-B");
  const d403 = await call("DELETE", `/structure/nodes/${encodeURIComponent(ext)}`, { reason: "Approver tries (qa)" }, "user-B");
  step("BR-15: the server refuses the approver's add and delete (403, plain words)", r403.status === 403 && d403.status === 403 && !!r403.body?.detail, `${r403.status} ${d403.status} ${r403.body?.detail}`);
  await axe(b, "Program structure read-only (approver)");

  // ═════════════ 9. Keyboard and 1024 px
  await openStructure(a);
  await a.locator("[data-row] [data-edit]").first().focus();
  const tabStops = await a.locator("[data-row] button[tabindex='0'], [data-row] button:not([tabindex])").count();
  await a.keyboard.press("ArrowDown"); await wait(150);
  const onRow = await a.evaluate(() => document.activeElement?.closest("[data-row]")?.getAttribute("data-row"));
  step("Minor 7: one Tab stop for the outline (the current row's two buttons), ↓ moves to the next row", tabStops <= 2 && onRow === "individual.visitors", `${tabStops} tabbable row buttons · focus on ${onRow}`);
  await a.keyboard.press("Enter"); await wait(600);
  step("Minor 7: Enter opens Edit for the focused row", await a.locator("[data-panel]").count() === 1);
  await a.keyboard.press("Escape"); await wait(300);
  const s = await page("user-A", 1024); await openStructure(s);
  const written = await s.locator("[data-row]").first().evaluate((e) => [e.querySelector("[data-edit]")?.innerText, e.querySelector("[data-action]")?.innerText]);
  step("Minor 6: at 1024 px Edit and the action stay written, no sideways scroll", /Edit/.test(written[0]) && /Retire|Delete/.test(written[1]) && await sideways(s) <= 0, `${written.join(" + ")} · ${await sideways(s)} px`);
  await axe(s, "Program structure Tree at 1024 px");
  await shot(s, "r3-tree-1024");

  // ═════════════ 10. Immigration programs: filter bar, Add combination in place (P-128 (4)(5))
  for (const w of [1440, 1024]) {
    const pg = await page("user-A", w);
    await pg.goto(`${BASE}/`); await pg.locator("[data-filter-bar]").waitFor({ timeout: 30000 });
    step(`P-128 (4) at ${w} px: Immigration programs has the filter bar (no Pathway cards), no sideways scroll`, await pg.locator("[data-pathway-chips]").count() === 1 && await pg.locator("[data-pathway-cards]").count() === 0 && await sideways(pg) <= 0, `${await sideways(pg)} px`);
    await axe(pg, `Immigration programs at ${w} px`);
    await pg.context().close();
  }
  const pg = await page("user-A");
  await pg.goto(`${BASE}/?p=retail.temporary_residence&f=live`); await pg.locator("[data-filter-bar]").waitFor();
  await pg.locator("[data-add-combination]").click();
  const pd = pg.getByRole("dialog"); await pd.waitFor(); await wait(500);
  const ppre = await pd.locator("input[role=combobox]").evaluateAll((els) => els.map((e) => e.value));
  step("P-128 (5): Add combination opens the pop-up on this page, prefilled with the Pathway filter", new URL(pg.url()).pathname === "/" && ppre[0] === "Temporary residence", `${pg.url()} · ${ppre.join(" | ")}`);
  await pd.getByRole("combobox").nth(1).fill("Visitors"); await pd.getByRole("combobox").nth(1).press("Enter"); await wait(400);
  await pd.getByRole("combobox").nth(2).fill("Transit visa"); await pd.getByRole("combobox").nth(2).press("Tab"); await wait(900);
  await pd.locator("[data-none]").check().catch(() => {});
  await pd.getByRole("button", { name: /^Add/ }).last().click(); await pd.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {}); await wait(1000);
  const card = pg.locator("[data-just-added]");
  const ptxt = await text(pg);
  step("P-128 (5): the new combination shows in place, Just added, Not started, and the page says so (the Live filter that would hide it is cleared)", await card.count() >= 1 && /Transit visa/.test(ptxt) && /Not started/.test(ptxt) && /listed here as Not started; no setup started/.test(ptxt) && !/[?&]f=live/.test(pg.url()), `${await card.count()} just added · ${pg.url()}`);
  await shot(pg, "r3-programs-just-added");
  const pb = await page("user-B"); await pb.goto(`${BASE}/`); await pb.locator("[data-filter-bar]").waitFor();
  step("P-128 (5): the approver's Add combination is disabled", await pb.locator("[data-add-combination]").isDisabled());

  step("no page errors during the walk", !errors.length, errors.slice(0, 2).join(" | "));
  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
