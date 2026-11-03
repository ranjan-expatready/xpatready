// W1 setup checklist, the card v4 on Immigration programs (concept v4 §6–§7 "Slice B tests (card)", board
// W1-setup-checklist/design/draft-board-v4.html; R-144, P-180): the card shows exactly five things (name, trail,
// "n of 5 steps" or "✓ Live" with the edge bar, Needs you, one button); the button word per state and per duty (Open
// for anyone without the author duty); Needs you only when the viewer's item waits; one primary colour; status chips
// All · Not started · In progress · Live; sections Pathway › Program with "n of m live"; fold state remembered per
// person; the List's row; 4 / 3 / 2 / 1 columns at 1440 / 1024 / 800 / 375 px with no sideways scroll; axe. Sample
// inputs, one saved AI replay (US$0) and one release. Screenshots into product/screens/W1-setup-checklist/screenshots/card/.
//   zsh studio/tools/isolated.sh screens_card 4441 start && node studio/tests/check_setup_card_browser.cjs 4441 xr_studio_screens_card
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { speed } = require("./speed_budget.cjs"); // P-184, P-215: speed budgets judged on the Mac, not on GitHub's machines
const PORT = Number(process.argv[2] ?? 4441);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-setup-checklist", "screenshots", "card"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 260)}` : ""}`); };
const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  // #131 CI (ECONNRESET, "socket hang up"): under machine load the server closes a kept-alive connection while a slow
  // step runs and the next request finds it closed (as check_forms_channels notes). Each call opens its own connection
  // (connection: close), so none is reused; nothing is retried, so no POST can run twice.
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json", connection: "close" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector("[data-view]"), null, { timeout: 30000 });
  const open = async (qs = "") => { await p.goto(`${BASE}/${qs}`); await ready(); await p.waitForTimeout(300); };
  const catOf = async (actor = "user-A", filter = "all") => (await api(`/catalogue?pathway=INDIVIDUAL&filter=${filter}`, { actor })).body;
  let n = 0;
  const shot = async (name, widths = [1440, 1024]) => {
    n++;
    for (const w of widths) {
      await p.setViewportSize({ width: w, height: w > 1100 ? 900 : 768 }); await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${name}-${w}.png`), fullPage: true });
    }
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
  };

  // ======================================================== setup: sample inputs, one AI replay, one release
  // The isolated server answers before the first request (up to 60 s), or the run says so by name.
  for (let i = 0; ; i++) {
    const ok = await p.request.fetch(`${BASE}/api/session`, { headers: { "x-actor": "user-A", connection: "close" }, timeout: 5000 }).then((r) => r.ok(), () => false);
    if (ok) break;
    if (i >= 60) throw new Error(`the isolated server at ${BASE} did not answer /api/session within 60 s`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await api("/demo/load", { method: "POST" });
  const sv = (await catOf()).rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  for (let i = 0; i < 60; i++) { if ((await catOf()).rows.find((x) => x.nodeKey === sv.nodeKey).aiProposals > 0) break; await p.waitForTimeout(500); }
  const ssKey = "individual.work_permits.open.spouse_student";
  const ss = (await api("/combinations", { method: "POST", data: { nodeKey: ssKey } })).body.combination;
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const ssSme = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (ssSme.length) await api(`/combinations/${ss.id}/signoff`, { method: "POST", actor: "user-C", data: { items: ssSme, action: "signed" } });
  await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: (await api("/draft")).body.changes } });
  const cat = await catOf();
  const byKey = new Map(cat.rows.map((r) => [r.nodeKey, r]));
  const states = new Set(cat.rows.map((r) => r.setup.chip.status));
  step("setup: Not started, In progress and Live cards all present; the author has something waiting (AI proposals)", states.has("NOT_STARTED") && states.has("IN_PROGRESS") && states.has("LIVE") && cat.rows.some((r) => r.setup.viewer.needsYou), [...states].join(","));

  // ======================================================== the card: five things only
  await open("?v=cards");
  const cards = await p.locator("article[data-node]").evaluateAll((as) => as.map((a) => ({
    key: a.dataset.node, state: a.dataset.state, text: a.innerText,
    name: a.querySelector("h3")?.innerText.trim(), trail: a.querySelector("[data-trail]")?.textContent, trailTitle: a.querySelector("[data-trail]")?.getAttribute("title"),
    progress: a.querySelector("[data-progress]")?.textContent, buttons: [...a.querySelectorAll("[data-card-act] button, [data-card-act] a")].map((x) => x.textContent.trim()),
    needs: !!a.querySelector("[data-needs-you-mark]"), bar: a.querySelector("[data-edge-bar]")?.getAttribute("data-edge-bar") ?? null, barHidden: a.querySelector("[data-edge-bar]")?.getAttribute("aria-hidden"),
    old: a.querySelectorAll("[data-status], [data-setup], [data-filed], [data-just-added-chip]").length,
  })));
  step("C11.10: one card per combination of the tab", cards.length === cat.rows.length, `${cards.length} cards, ${cat.rows.length} rows`);
  const nameOf = (r) => (r.trail[4] && r.trail[4] !== "No sub-category" ? r.trail[4] : r.trail[3]);
  step("C11.10: the heading is the combination's name; the trail is the full path in one line, full on hover", cards.every((c) => { const r = byKey.get(c.key); const full = r.trail.filter((x) => x !== "No sub-category").join(" › "); return c.name === nameOf(r) && c.trail === full && c.trailTitle === full; }), cards.find((c) => c.name !== nameOf(byKey.get(c.key)))?.name);
  // QA-184: a Live card says ✓ Live, then its next release's line (the checklist's bar.next) when anything is open for it.
  const barWords = (b) => [b.text, b.next].filter(Boolean).join(" · ");
  step("C11.10: one progress line, \"n of 5 steps\" or \"✓ Live\" (· its next release's line), equal to the checklist's bar", cards.every((c) => c.progress === barWords(byKey.get(c.key).setup.bar) && /^(\d of 5 steps|✓ Live( · Next release: \d of 5 steps? to do)?)$/.test(c.progress)), cards.map((c) => c.progress).join(" | "));
  step("C11.10 (fail case): no status chip, Next line, facts line, rule code or release number on a card", cards.every((c) => c.old === 0 && !/P-\d+|Release \d|Next:|Filed:|Not ready|In setup|In progress|Needs work/.test(c.text)), cards.find((c) => /P-\d+|Release \d|Next:|Filed:/.test(c.text))?.text);
  step("C11.10: exactly one button on every card", cards.every((c) => c.buttons.length === 1), cards.map((c) => c.buttons.length).join(""));
  step("C11.10: the edge bar repeats the steps (one part per step done, all parts when Live) and is hidden from screen readers", cards.every((c) => c.barHidden === "true" && c.bar === (c.state === "LIVE" ? "live" : String(byKey.get(c.key).setup.bar.done))), cards.map((c) => c.bar).join(","));

  // ======================================================== the button word per state, for the author
  const word = { NOT_STARTED: "Start setup", IN_PROGRESS: "Resume setup", NOT_READY: "Resume setup", LIVE: "Open" };
  step("C11.10 P-180: author: Not started → Start setup, In progress → Resume setup, Live → Open", cards.every((c) => c.buttons[0] === word[c.state] && c.buttons[0] === byKey.get(c.key).setup.viewer.button), cards.map((c) => `${c.state}:${c.buttons[0]}`).join(" "));
  step("C11.10: Needs you on a card exactly when an item on the author's duty waits", cards.every((c) => c.needs === !!byKey.get(c.key).setup.viewer.needsYou) && cards.some((c) => c.needs), cards.filter((c) => c.needs).map((c) => c.key).join(","));
  const mark = p.locator(`article[data-node="${sv.nodeKey}"] [data-needs-you-mark]`);
  await mark.hover(); await p.waitForTimeout(400);
  const tip = await p.locator('[role="tooltip"]').first().textContent().catch(() => "");
  step("C11.10: Needs you's hover says what waits and how many", !!tip && tip === byKey.get(sv.nodeKey).setup.viewer.needsYou.text && /\d/.test(tip), tip);
  await p.mouse.move(0, 0);
  const fills = await p.locator("[data-card-act] button").evaluateAll((bs) => [...new Set(bs.map((x) => getComputedStyle(x).backgroundColor))]);
  step("C11.10 P-180 Q3: one primary colour: every card button has the brand blue fill (#0862C5)", fills.length === 1 && fills[0] === rgb("#0862c5"), fills.join(" | "));
  const chipN = Number((await p.locator("[data-needs-you]").textContent()).replace(/\D/g, ""));
  step("C11.10: the Needs you toggle counts the cards that need this person", chipN === cat.rows.filter((r) => r.setup.viewer.needsYou).length, chipN);
  await shot("cards-author");

  // ======================================================== sections: Pathway, then Program, "n of m live"
  const bands = await p.locator("[data-section]").evaluateAll((ss) => ss.map((s) => ({ key: s.dataset.section, live: s.querySelector("h2 [data-live-count]")?.textContent, progs: [...s.querySelectorAll("[data-program-section]")].map((x) => ({ key: x.dataset.programSection, live: x.querySelector("[data-live-count]")?.textContent, cards: x.querySelectorAll("article").length })) })));
  step("C11.10 P-180: each Pathway header says \"n of m live\" from the server's counts", bands.length === cat.sections.length && bands.every((x) => { const s = cat.sections.find((y) => y.pathwayKey === x.key); return x.live === `${s.live} of ${s.combinations} live`; }), bands.map((x) => x.live).join(" | "));
  step("C11.10 P-180: under each Pathway, one Program header per Program with \"n of m live\", and its cards", bands.every((x) => x.progs.every((g) => { const m = cat.programs.find((y) => y.key === g.key); return m && g.live === `${m.live} of ${m.combinations} live` && g.cards === cat.rows.filter((r) => r.programKey === g.key && r.pathwayKey === x.key).length; })) && bands.some((x) => x.progs.length > 1), JSON.stringify(bands[0]?.progs));

  // ======================================================== fold state, per person
  const wp = "individual.work_permits";
  await p.locator(`[data-program-section="${wp}"] [data-program-band] button`).click();
  step("C11.10: folding a Program hides its cards", await p.locator(`[data-program-section="${wp}"] article`).count() === 0);
  await open("?v=cards");
  step("C11.10: the fold is remembered after a reload", await p.locator(`[data-program-section="${wp}"] article`).count() === 0 && await p.locator(`[data-program-section="${wp}"] [data-program-band] button`).getAttribute("aria-expanded") === "false");
  await open(`?v=cards&q=${encodeURIComponent("Spouse of a student")}`);
  step("C11.10: a search opens every section holding a match, folded or not", await p.locator(`article[data-node="${ssKey}"]`).count() === 1);
  await as("user-C"); await open("?v=cards");
  step("C11.10 (fail case): another person's fold is their own (the expert sees Work permits open)", await p.locator(`[data-program-section="${wp}"] article`).count() > 0);
  await as("user-A"); await open("?v=cards");
  await p.locator(`[data-program-section="${wp}"] [data-program-band] button`).click(); await p.waitForTimeout(200);

  // ======================================================== status chips: All · Not started · In progress · Live
  const chips = await p.locator("[data-status-chip]").evaluateAll((cs) => cs.map((c) => c.dataset.statusChip));
  step("C11.10 P-180 Q2: the status chips are All · Not started · In progress · Live (no Needs work, Not ready or In setup)", chips.join() === "all,not_started,in_progress,live", chips.join());
  step("C11.10: the chip counts add up: Not started + In progress + Live = All", cat.counts.not_started + cat.counts.in_progress + cat.counts.live === cat.counts.all, JSON.stringify(cat.counts));
  for (const [k, want] of [["not_started", ["NOT_STARTED"]], ["in_progress", ["IN_PROGRESS", "NOT_READY"]], ["live", ["LIVE"]]]) {
    await p.locator(`[data-status-chip="${k}"]`).click(); await ready(); await p.waitForTimeout(300);
    const st = await p.locator("article[data-node]").evaluateAll((as) => as.map((a) => a.dataset.state));
    step(`C11.10: the ${k.replace("_", " ")} chip shows only those cards (${cat.counts[k]})`, st.length === cat.counts[k] && st.every((x) => want.includes(x)) && new URL(p.url()).searchParams.get("f") === k, `${st.length}: ${[...new Set(st)].join(",")}`);
  }
  await open("?v=cards&n=1");
  step("C11.10: Needs you shows only the cards waiting for this person", await p.locator("article[data-node]").count() === cat.rows.filter((r) => r.setup.viewer.needsYou).length && await p.locator("article[data-node]:not(:has([data-needs-you-mark]))").count() === 0);

  // ======================================================== the expert and the approver: Open on every card
  for (const [who, name] of [["user-C", "expert"], ["user-B", "approver"]]) {
    const theirs = await catOf(who);
    await as(who); await open("?v=cards");
    const words = await p.locator("article[data-node] [data-card-act]").evaluateAll((xs) => xs.map((x) => x.innerText.trim()));
    step(`C11.10 P-180 Q1: the ${name} (no author duty) sees Open on every card`, words.length === theirs.rows.length && words.every((w) => w === "Open"), [...new Set(words)].join(","));
    const marks = await p.locator("article[data-node]").evaluateAll((as) => as.filter((a) => a.querySelector("[data-needs-you-mark]")).map((a) => a.dataset.node));
    step(`C11.10: the ${name}'s Needs you marks are their own items`, marks.length === theirs.rows.filter((r) => r.setup.viewer.needsYou).length && marks.every((k) => theirs.rows.find((r) => r.nodeKey === k).setup.viewer.needsYou), marks.join(","));
    if (who === "user-C") await shot("cards-expert", [1440]);
  }
  await as("user-A");

  // ======================================================== Resume setup lands on the first open item
  await open("?v=cards");
  const svRow = byKey.get(sv.nodeKey);
  await p.locator(`article[data-node="${sv.nodeKey}"] [data-card-button="resume"]`).click();
  await p.waitForURL((u) => u.pathname !== "/", { timeout: 15000 }).catch(() => {});
  const landed = new URL(p.url());
  step("C11.10: Resume setup goes where the checklist's next item is (first open step)", `${landed.pathname}${landed.search}`.startsWith(svRow.setup.next.href.split("?")[0].replace(/\/$/, "")) || (svRow.setup.next.href.startsWith("/review") && landed.pathname.startsWith("/review")), `${landed.pathname}${landed.search} vs ${svRow.setup.next.href}`);
  await open("?v=cards");
  await p.locator(`article[data-node="${ssKey}"] h3 button`).click(); await p.waitForURL(/\/c\//, { timeout: 15000 }).catch(() => {});
  step("C11.10: the name opens the combination page", new RegExp(`/c/${ss.id}`).test(p.url()), p.url());

  // ======================================================== the List: one line per combination
  await open("?v=list");
  const lines = await p.locator('[role="row"][data-node]').evaluateAll((rs) => rs.map((r) => ({ key: r.dataset.node, name: r.querySelector("[data-name]")?.textContent, trail: r.querySelector("[data-trail]")?.textContent, prog: r.querySelector("[data-progress]")?.textContent, needs: !!r.querySelector("[data-needs-you-mark]"), button: r.querySelector("[data-step-cell]")?.innerText.trim(), mini: r.querySelector("[data-edge-bar]")?.getAttribute("aria-hidden") })));
  step("C11.10 P-115: the List has one line per combination with name, trail, mini bar and \"n of 5\" or \"Live\", Needs you, the button", lines.length === cat.rows.length && lines.every((l) => { const r = byKey.get(l.key); const t = r.trail.filter((x) => x !== "No sub-category"); return l.name === nameOf(r) && l.trail === t.slice(0, -1).join(" › ") && l.prog === (r.setup.chip.status === "LIVE" ? `Live${r.setup.bar.next ? ` · next release ${5 - r.setup.bar.done} to do` : ""}` : `${r.setup.bar.done} of 5`) && l.mini === "true" && l.needs === !!r.setup.viewer.needsYou && l.button === r.setup.viewer.button; }), JSON.stringify(lines.find((l) => l.button !== byKey.get(l.key).setup.viewer.button) ?? lines[0]));
  step("C11.10: the List's Pathway and Program bands say \"n of m live\"", await p.locator("[data-group] [data-live-count]").evaluateAll((xs) => xs.every((x) => /\d+ of \d+ live/.test(x.textContent))) && await p.locator("[data-group]").count() > cat.sections.length);
  await shot("list-author");

  // ======================================================== widths: 4 · 3 · 2 · 1 columns, no sideways scroll; axe
  await open("?v=cards");
  for (const [w, h, cols] of [[1440, 900, 4], [1024, 768, 3], [800, 900, 2], [375, 812, 1]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300);
    const got = await p.locator(`[data-program-section="${wp}"] article`).evaluateAll((as) => new Set(as.map((a) => Math.round(a.getBoundingClientRect().left))).size);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    step(`C11.10: ${w} px: ${cols} column${cols === 1 ? "" : "s"} of cards, no sideways scroll`, got === cols && !wide, `${got} columns, scrollWidth ${await p.evaluate(() => document.documentElement.scrollWidth)}`);
    if (w <= 800) await p.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-cards-${w}.png`), fullPage: false });
  }
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(200);
  for (const v of ["cards", "list"]) {
    await open(`?v=${v}`);
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: the ${v} view has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target?.join(" ")}`).join(" | "));
  }
  // Keyboard: Tab reaches a card's name and then its button.
  await open("?v=cards");
  await p.locator(`article[data-node="${sv.nodeKey}"] h3 button`).focus(); await p.keyboard.press("Tab");
  const focused = await p.evaluate(() => document.activeElement?.closest("article")?.dataset.node + "|" + document.activeElement?.textContent?.trim());
  step("C11.10: keyboard: from a card's name, Tab reaches its Needs you mark or its button", focused.startsWith(sv.nodeKey) && /Needs you|Resume setup/.test(focused), focused);

  // ======================================================== 150 combinations: the page within its budget (concept §8)
  const have = (await catOf()).counts.all;
  for (let i = have; i < 150; i++) await api("/structure/nodes", { method: "POST", data: { pathwayType: "INDIVIDUAL", level: "category", label: `Scale card ${String(i + 1).padStart(3, "0")}`, parentKey: "individual.visitors", decision: "add_anyway" } });
  const big = await catOf();
  await open("?v=cards"); await open("?v=list"); // a normal visit: the app files are cached
  for (const v of ["cards", "list"]) {
    const t = Date.now();
    await p.goto(`${BASE}/?v=${v}`);
    await p.waitForFunction((want) => document.querySelectorAll("[data-node]").length === want, big.rows.length, { timeout: 30000 }).catch((e) => step(`wait: the ${v} view shows all ${big.rows.length} combinations`, false, String(e?.message ?? e).split("\n")[0]));
    const ms = Date.now() - t, shown = await p.locator("[data-node]").count();
    step(`C11.10: ${big.counts.all} combinations: the ${v} view shows every one`, big.counts.all >= 150 && shown === big.rows.length, `${shown} of ${big.rows.length} shown`);
    { const s = speed(`C11.10: ${big.counts.all} combinations: the ${v} view shows them within 2000 ms (server ${big.timing_ms.total} ms)`, ms < 2000, `${shown} shown in ${ms} ms`); step(s.label, s.ok, s.detail); }
  }

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
