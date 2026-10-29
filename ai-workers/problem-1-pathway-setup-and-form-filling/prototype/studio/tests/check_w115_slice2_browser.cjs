// W1-15 Questions and documents, slice 2 (runtime lane; board v2 agreed P-147): the Questionnaires tab walked like a
// content publisher in a real browser. The strip, source chips and "Needs you"; "Who can be" folded to one line; rows of
// five things; the ⋯ menu whose greyed actions keep their reason as visible text; the side drawer with its locks in words
// (a declaration is always the client's, the agent is not offered for a passport fact); a save that the row then shows;
// the bulk bar on ticked rows with refusals in words and one Undo; an approver sees no ticks and no edits. A pass and a
// fail per rule; screenshots at 1440 and 1024 in screens/W1-questions-and-documents/screenshots/slice2/, axe (WCAG 2.2
// AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_w115c 4437 start && node studio/tests/check_w115_slice2_browser.cjs 4437 xr_studio_runtime_w115c
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_runtime_w115c";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "slice2"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const CODES = /\bP-\d+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const go = async () => { await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(); };
  await go();

  // ======================================================== the strip, the chips, the fold
  const strip = await p.locator("[data-source-strip]").innerText();
  const L = (await api(`/combinations/${wp}/fact-sources`)).body;
  step("C4.10 strip pass: full form = from documents + client answers + agent enters, with the server's counts", strip.includes(String(L.counts.facts)) && strip.includes(String(L.counts.document)) && L.counts.facts === L.counts.document + L.counts.client + L.counts.agent && /✓ Every fact has one source/.test(strip), strip.replace(/\n/g, " "));
  step("C4.10 strip fail-guard: it shows no system key", !/\b[a-z_]+\.[a-z_]+\b/.test(strip));
  const who = p.locator("[data-who-can-be]");
  step("P-147 §3 pass: Who can be in this application is folded to one line with Show and edit", await who.getAttribute("data-folded") !== null && await who.getByRole("button", { name: "Show and edit" }).count() === 1 && await who.locator("table").count() === 0);
  await who.getByRole("button", { name: "Show and edit" }).click(); await settle();
  step("P-147 §3: Show and edit opens the full table (built S5 card)", await p.locator("[data-who-can-be] table").count() === 1 && await p.locator('[data-who-can-be] [data-person="principal"]').count() === 1);
  const chips = await p.locator('[role="group"][aria-label="Where it comes from"]').innerText();
  step("EXPERIENCE §0 pass: source chips Document · Client · Agent and Needs you · 0", /Document \d+/.test(chips) && /Client \d+/.test(chips) && /Agent \d+/.test(chips) && /Needs you · 0/.test(chips), chips.replace(/\n/g, " "));
  // S2-1 (Lead, 29 Oct): the person's line uses slice 1's sources, with the chips' numbers.
  await p.waitForFunction(() => /from documents/.test(document.querySelector("[data-coverage]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  const line = await p.locator("[data-coverage]").innerText();
  const num = (re, t) => Number((t.match(re) ?? [])[1] ?? -1);
  const [cd, cc, ca] = [num(/Document (\d+)/, chips), num(/Client (\d+)/, chips), num(/Agent (\d+)/, chips)];
  const [ld, lc, la, ln] = [num(/(\d+) from documents/, line), num(/(\d+) asked of the client/, line), num(/(\d+) entered by the agent/, line), num(/need (\d+) answers/, line)];
  step("S2-1 pass: the person's line says documents · client · agent with the chips' numbers, and they add up", ld === cd && lc === cc && la === ca && ln === cd + cc + ca, `${line} | chips ${cd}/${cc}/${ca}`);
  step("S2-1 fail: the line no longer uses the older split (\"filled by the case officer\")", !/filled by the case officer/.test(line), line);
  await state("questionnaires-strip-and-rows");

  // ======================================================== rows of five things, ⋯ menu
  const firstTable = p.locator("[data-section] table").first();
  const heads = (await firstTable.locator("thead th").allInnerTexts()).map((x) => x.trim()).filter(Boolean);
  step("P-147 Q1 pass: a row shows five things: Question · Comes from · Pre-qualification · Only if · Status", JSON.stringify(heads) === JSON.stringify(["Question", "Comes from", "Pre-qualification", "Only if", "Status", "Actions"]), heads.join(" | "));
  await p.locator('[data-source-chip="DOCUMENT"]').click(); await settle();
  const docRows = p.locator('[data-question]:has([data-comes-from="DOCUMENT"])');
  step("chip pass: Document shows only rows from a document", await docRows.count() > 0 && await p.locator('[data-question]:not(:has([data-comes-from="DOCUMENT"]))').count() === 0, await docRows.count());
  const dob = p.locator('[data-question][data-fact="person.family_name"]').first();
  await dob.getByRole("button", { name: /^Actions for/ }).click();
  const menu = p.locator("[data-row-menu-items]"); await menu.waitFor();
  const menuText = await menu.innerText();
  step("P-147 Q1 pass: the ⋯ menu lists every action", ["Open details", "Change where it comes from…", "Back to the rules' default", "Change in the library…", "Move up or down", "Retire"].every((x) => menuText.includes(x)), menuText.replace(/\n/g, " | "));
  step("P-147 Q1 fail-guard: each greyed action keeps its reason as visible text (order set in the library section; a line is not retired here)", /The order is set in the library section .+ Change it there\./.test(menuText) && /A question line is not retired here\. Retire the question in the library\./.test(menuText) && await menu.locator('[data-disabled] [data-menu-why]').count() >= 3, menuText.replace(/\n/g, " | "));
  await state("row-menu-greyed-reasons");
  await p.keyboard.press("Escape");

  // ======================================================== the drawer: locks in words, a save the row shows
  await dob.getByRole("button", { name: /^Details of/ }).click();
  const drawer = p.getByRole("dialog"); await drawer.locator("[data-fact-drawer]").waitFor();
  const agentOpt = drawer.locator('[data-source-option="AGENT"]');
  step("lock fail (P-147 frame 1): Agent is greyed for a passport fact, with the reason in words", await agentOpt.locator("input").isDisabled() && /Not offered: the agent enters only/.test(await agentOpt.innerText()), await agentOpt.innerText());
  step("M2 pass: the drawer says the fallback question is reachable and the override is for this combination only", /Fallback question reachable/.test(await drawer.locator("[data-fallback]").innerText()) && /override for this combination only/.test(await drawer.innerText()));
  step("drawer: the system name shows only here, with where it is changed", /System name/.test(await drawer.locator("[data-question-details]").innerText()) && /person\.family_name/.test(await drawer.locator("[data-question-details]").innerText()));
  await state("drawer-passport-fact");
  await drawer.locator('[data-source-option="CLIENT"] input').check();
  await drawer.locator("[data-pq-tick]").check();
  await drawer.getByRole("button", { name: "Save" }).click(); await settle();
  await p.locator('[data-source-chip="all"]').click(); await settle();
  await p.getByRole("button", { name: "Open all sections" }).click(); await settle();
  const row = p.locator('[data-question][data-fact="person.family_name"]').first();
  await row.waitFor();
  step("C4.10 M1 pass: the row now says Client, Ask, Changed here", /Client/.test(await row.locator("[data-comes-from]").innerText()) && /Ask/.test(await row.innerText()) && await row.locator('[data-row-status="draft"]').count() === 1, await row.innerText());
  step("undo toast: one Undo for the save", await p.locator("[data-undo-toast] [data-undo]").count() === 1);
  await p.locator("[data-undo-toast] [data-undo]").click(); await settle();
  step("Undo pass: the row goes back to the passport and the rules", /Document/.test(await row.locator("[data-comes-from]").innerText()) && await row.locator('[data-row-status="rules"]').count() === 1, await row.innerText());

  // ======================================================== a declaration: always the client
  const decl = L.facts.find((f) => f.clientOnly && f.role === "principal");
  const dRow = p.locator(`[data-question][data-fact="${decl.fact}"]`).first();
  step("C4.9 pass: a declarations section shows the lock (Always the client)", await p.locator("[data-client-only]").count() >= 1);
  await dRow.getByRole("button", { name: /^Details of/ }).click();
  const d2 = p.getByRole("dialog"); await d2.locator("[data-fact-drawer]").waitFor();
  step("C4.9 fail: Document and Agent are greyed on a declaration with \"Declarations are always answered by the client.\"", await d2.locator('[data-source-option="AGENT"] input').isDisabled() && /Declarations are always answered by the client\./.test(await d2.locator('[data-source-option="AGENT"]').innerText()), await d2.locator('[data-source-option="AGENT"]').innerText());
  step("words fail-guard: no decision code in the drawer", !CODES.test(await d2.innerText()));
  await p.keyboard.press("Escape"); await settle();

  // ======================================================== bulk bar: refusals in words, one Undo
  await p.locator('[data-source-chip="DOCUMENT"]').click(); await settle();
  const ticks = p.locator('[data-question]:has([data-comes-from="DOCUMENT"]) [data-row-tick]');
  step("P-147 Q2 fail-guard: no bulk bar while nothing is ticked", await p.locator("[data-bulk-bar]").count() === 0);
  await ticks.nth(0).check(); await ticks.nth(1).check();
  const bar = p.locator("[data-bulk-bar]");
  step("P-147 Q2 pass: two ticked rows show the bulk bar (Set where it comes from, Pre-qualification; no bulk remove, delete or retire)", /2 selected/.test(await bar.innerText()) && await bar.getByLabel("Set where it comes from").count() === 1 && await bar.getByLabel("Pre-qualification").count() === 1 && !/^(Remove|Delete|Retire)/m.test(await bar.locator("button").allInnerTexts().then((x) => x.join("\n"))), await bar.innerText());
  await state("bulk-bar-two-ticked");
  await bar.getByLabel("Set where it comes from").selectOption("AGENT"); await settle();
  const refused = p.locator("[data-bulk-refused]");
  step("P-147 Q2 fail: Agent on two passport facts is refused per row, each in words with its question", await refused.locator("li").count() === 2 && /Not offered: the agent enters only/.test(await refused.innerText()), await refused.innerText());
  await state("bulk-refused-in-words");
  await bar.getByLabel("Set where it comes from").selectOption("CLIENT"); await settle();
  const toast = p.locator("[data-undo-toast]");
  step("P-147 Q2 pass: set to the client on 2 questions, with one Undo", /set to the client on 2 questions/.test(await toast.innerText()) && await toast.locator("[data-undo]").count() === 1 && await p.locator("[data-bulk-bar]").count() === 0, await toast.innerText());
  const changed = (await api(`/combinations/${wp}/fact-sources`)).body.facts.filter((f) => f.change?.batchId);
  step("bulk: both rows carry one batch id", changed.length === 2 && changed[0].change.batchId === changed[1].change.batchId, changed.map((f) => f.fact).join(", "));
  await state("bulk-done-undo-toast");
  await toast.locator("[data-undo]").click(); await settle();
  const after = (await api(`/combinations/${wp}/fact-sources`)).body.facts.filter((f) => f.change);
  step("Undo pass: one Undo takes both rows back", after.length === 0, after.map((f) => f.fact).join(", "));

  // ======================================================== Needs you: a release check on its row
  sql(`insert into fact_source (workspace_id, combination_id, lineage_key, role, canonical_field_key, source, version, status, origin, updated_by) select workspace_id, id, '${decl.role}|${decl.fact}', '${decl.role}', '${decl.fact}', 'AGENT', 1, 'DRAFT', 'HUMAN', 'user-A' from combination where id='${wp}'`);
  await go();
  step("Needs you pass: the chip counts the release check and the strip says one to fix", /Needs you · 1/.test(await p.locator('[data-source-chip="needs"]').innerText()) && /1 release check to fix/.test(await p.locator("[data-strip-state]").innerText()));
  await p.locator('[data-source-chip="needs"]').click(); await settle();
  step("Needs you pass: it shows only the row with the check, marked Release check", await p.locator("[data-question]").count() === 1 && await p.locator('[data-question] [data-row-status="check"]').count() === 1);
  await state("needs-you-release-check");
  sql(`delete from fact_source where combination_id='${wp}'`);

  // ======================================================== read only: the approver
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-B"); } catch { /* ignore */ } });
  await go();
  step("read only pass: the approver sees no ticks and no bulk bar", await p.locator("[data-row-tick]").count() === 0 && await p.locator("[data-bulk-bar]").count() === 0);
  await p.locator("[data-question]").first().getByRole("button", { name: /^Actions for/ }).click();
  const m2 = await p.locator("[data-row-menu-items]").innerText();
  step("read only fail: the approver's ⋯ menu greys every change with \"Read only: you do not hold the author duty.\"", /Read only: you do not hold the author duty\./.test(m2), m2.replace(/\n/g, " | "));
  await p.keyboard.press("Escape");
  await state("read-only-approver");
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });

  step("no page error or console error", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
