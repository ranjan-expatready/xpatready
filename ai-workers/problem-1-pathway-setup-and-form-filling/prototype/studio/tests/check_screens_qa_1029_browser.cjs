// Screens lane, qa bugs of 29 Oct (product/qa/BUGS.md) in the browser at 1440 and 1024 px (wave 1 is desktop only): plain
// words and no system values on the screens' pages. QA-70 menu focus ring · QA-80 page titles, one name per person, the
// AI work page's heading · QA-79 Overview counts and release line · QA-74 Releases and Activity · QA-72 Checks · QA-39 and
// QA-71 Fields, Sections, Document types · QA-73 Review and release · QA-48 Retired combinations on Immigration programs.
// A passing and a failing case per bug where the page allows both. Sample inputs; no AI call (US$0). Screenshots into
// product/screens/W1-qa-1029/screenshots/, axe (WCAG 2.2 AA) on each page.
//   zsh studio/tools/isolated.sh screens_qa29 4438 start && node studio/tests/check_screens_qa_1029_browser.cjs 4438 xr_studio_screens_qa29
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4438), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_screens_qa29";
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "W1-qa-1029", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
/** System values a person must never read: user ids, field keys, raw types, fingerprints, screen numbers. */
const KEY = /\b(person|case|relationship|organisation|representative)\.[a-z_]+\b/;
const SYSTEM = /\buser-[A-Z]\b|\byes_no\b|\bScreen 0\d\b|[0-9a-f]{16}/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const go = async (u) => { await p.goto(`${BASE}${u}`); await p.waitForLoadState("networkidle"); await p.waitForFunction(() => !!document.querySelector("main h1"), null, { timeout: 30000 }); };
  const main = () => p.locator("main").innerText();
  const axe = async (name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id}: ${x.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    step("setup: sample inputs loaded", (await api("/demo/load", { method: "POST" })).status === 201);
    const visitor = sql("select id from combination where label = 'Visitor visa' limit 1");
    const released = sql("select combination_id from config_release order by released_at desc limit 1"); // the sample's released combination
    // #118 review Minor 2: a form-field warning's example is the form's own words, never a PDF path (IMM_5476[0].Page1[0]…).
    const paths = [];
    for (const id of sql("select id from combination where retired_at is null").split("\n").filter(Boolean)) for (const x of (await api(`/combinations/${id}/review`)).body?.draft?.problems ?? []) if (/\w\[\d+\]\./.test(x.message)) paths.push(`${x.where} ${x.item}: ${x.message.slice(0, 120)}`);
    step("Review and release (#118 Minor 2): no warning or error shows a PDF field path as its example", paths.length === 0, paths[0] ?? "none");

    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      await p.setViewportSize({ width: w, height: h });
      // QA-70: a menu link reached by the keyboard shows a ring, as buttons do
      await go("/structure");
      await p.locator("nav a", { hasText: "Program structure" }).first().focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab");
      const ring = await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { on: a?.tagName === "A" && a.closest("nav") !== null, ring: cs.boxShadow !== "none" || cs.outlineStyle !== "none", what: `${a?.tagName} ${a?.textContent?.trim()}` }; });
      step(`QA-70 (${w}): a menu link focused by the keyboard shows a focus ring`, ring.on && ring.ring, ring.what);
      await p.mouse.click(5, 5);
      const still = await p.evaluate(() => { const a = document.querySelector("nav a"); return getComputedStyle(a).boxShadow; });
      step(`QA-70 (${w}): a menu link that is not focused shows no ring`, still === "none", still);
      // QA-80: the page's own title, one name per person in the header, the demo label kept at 1024
      step(`QA-80 (${w}): the browser tab names the page`, (await p.title()) === "Program structure · Product Studio", await p.title());
      const header = await p.locator("header").innerText();
      step(`QA-80 (${w}): the header names the person once, with no staff role, and keeps "Prototype · demo workspace"`, /Configuration author/.test(header) && !/Super Admin/.test(header) && /Prototype · demo workspace/.test(header), header);
      await p.screenshot({ path: path.join(SHOTS, `header-${w}.png`) });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    await go("/library/fields"); step("QA-80: another page has its own title", (await p.title()) === "Fields · Product Studio", await p.title());
    await go("/release"); step("QA-80 retest (X4): Review and release, reached from the draft bar, names itself in the tab", (await p.title()) === "Review and release · Product Studio", await p.title());

    // QA-79: Overview counts in words and the release line (on the sample's released combination)
    await go(`/c/${released}`);
    const ov = await main();
    step("QA-79: the rules tile names both numbers (\"39 rules · 64 checks\" form)", /\d+ rules? · \d+ checks?/.test(ov), (ov.match(/Rules and checks\s*\S[^\n]*/) ?? [])[0]);
    step("QA-79: the release line reads as a sentence (no \"on today\")", /Release \d+/.test(ov) && !/on today/.test(ov) && !/today \d/.test(ov), (ov.match(/Released versions:[^\n]*/) ?? [])[0]);
    step("QA-79: the Forms tile links once (\"see them\"), not \"Forms\" again", await p.locator("[data-overview] a", { hasText: /^Forms$/ }).count() === 0);
    await axe("Overview"); await p.screenshot({ path: path.join(SHOTS, "overview-1440.png"), fullPage: true });

    // QA-74: Releases and Activity: names, one date format, no fingerprint column
    await go("/releases");
    const rel = await main();
    step("QA-74: Releases name the people (author / submitter / approver), never user ids", /Configuration author|Approver|Content reviewer/.test(rel) && !/\buser-[A-Z]\b/.test(rel), rel.slice(0, 200));
    step("QA-74: Releases show no fingerprint column or hash", !/Fingerprint/.test(rel) && !/[0-9a-f]{16}/.test(rel));
    step("QA-74: Releases dates in the one format (no \"10/29/2026, 7:53:23 AM\")", !/\d+\/\d+\/\d{4}/.test(rel));
    // P-165 SI-11: the Releases page carries the one Stand-in chip; its tip says today and later in plain words.
    const chip = p.locator('[data-stand-in="SI-11"]');
    await chip.focus(); await p.waitForTimeout(500);
    const tip = (await p.locator('[role="tooltip"]').first().innerText().catch(() => "")).replace(/\s+/g, " ");
    step("P-165: Releases shows one Stand-in chip for SI-11; on focus its tip says what it does today and what replaces it", await chip.count() === 1 && (await chip.innerText()) === "Stand-in" && /Today: our own draft/.test(tip) && /Later: the team's content pack container/.test(tip) && /Row SI-11/.test(tip), tip);
    await p.mouse.click(5, 5);
    await axe("Releases");
    await go("/activity");
    const act = await main();
    const actBad = /\buser-[A-Z]\b|configuration row|program nodes/;
    step("QA-74: Activity names who did it, never a user id, and never \"configuration row\"", /Configuration author/.test(act) && !actBad.test(act), (act.split("\n").find((l) => actBad.test(l)) ?? "").slice(0, 240));
    step("QA-74: Activity dates in the one format", !/\d+\/\d+\/\d{4}/.test(act));
    await axe("Activity"); await p.screenshot({ path: path.join(SHOTS, "activity-1440.png") });

    // QA-72: Checks says where the checks are, no screen number
    await go("/library/checks");
    step("P-165 fail case: a page with no stand-in shows no chip (Checks)", await p.locator("[data-stand-in]").count() === 0);
    const ck = await main();
    step("QA-72: Checks says where they are listed, with no screen number or \"later screen\"", /Smart questionnaire \(SQR\) tab/.test(ck) && !/Screen 0\d|later screen/.test(ck), ck.slice(0, 200));

    // QA-39, QA-71: Fields, a field, Sections, Document types
    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      await p.setViewportSize({ width: w, height: h });
      await go("/library/fields");
      const fl = await main();
      const firstCell = (await p.locator("main table tbody tr td").first().innerText()).split("\n").filter((l) => l.trim());
      step(`QA-39 (${w}): Fields is headed "Fields"; each row leads with words, the key small under it`, /^Fields$/m.test(fl) && !/Canonical fields/.test(fl) && !KEY.test(firstCell[0]) && KEY.test(firstCell[1] ?? ""), firstCell.join(" / "));
      step(`QA-39 (${w}): types in words; "1 form field" in the singular; no "staff working view"`, !/\byes_no\b|\bcode\b/.test(await p.locator("main table tbody td:nth-child(3)").allInnerTexts().then((x) => x.join(" "))) && !/\b1 form fields\b/.test(fl) && !/staff working view/.test(fl));
      const fits = await p.evaluate(() => { const f = document.querySelector("main table").parentElement; return { ok: f.scrollWidth <= f.clientWidth + 1, scroll: f.scrollWidth, width: f.clientWidth }; });
      step(`QA-39 (${w}): every column fits on screen, Asked in and Status included (no sideways scroll)`, fits.ok, JSON.stringify(fits));
      step(`QA-39 (${w}): a known abbreviation in a field's name is in capitals ("Applying for PGWP")`, /Applying for PGWP/.test(fl) && !/Applying for pgwp/.test(fl));
      await p.screenshot({ path: path.join(SHOTS, `fields-${w}.png`) });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    await axe("Fields");
    await go("/library/fields/person.family_name");
    const fd = await main();
    step("QA-39: a field's page is headed with its name; no \"one meaning per key\", no user id in its versions", /^Family name$/m.test(fd) && !/one meaning per key/.test(fd) && !/\buser-[A-Z]\b/.test(fd), fd.slice(0, 160));
    await go("/library/sections");
    const sc = await main();
    step("QA-71: Sections: \"Questions\", not \"Question placements\"; no \"Imported release\" or version badge in the list", /Questions/.test(sc) && !/Question placements|Imported release|\bv1\b/.test(sc));
    await go("/library/documents");
    const dt = await main();
    step("QA-71: Document types: facts in words, categories in words, no \"reader profiles\"", !KEY.test(dt) && (await p.locator("main table tbody td:nth-child(2)").allInnerTexts()).every((c) => /^(Client|Employer|Government|Someone else)$/.test(c.trim())) && !/reader profiles|Imported release/.test(dt), (dt.match(KEY) ?? [])[0]);
    await axe("Document types"); await p.screenshot({ path: path.join(SHOTS, "documents-1440.png") });

    // QA-73: Review and release in words. UX-A part 3 (P-273): a combination with nothing set up has nothing to release, so
    // its Review tab lists no change (as Immigration programs and the bar say); one form from the library gives Visitor
    // visa content, and its draft's calculations are listed with it.
    const aForm = sql(`select cf.lineage_key from combination_form cf join combination c on c.id=cf.combination_id where c.combination_key='wp.family' and cf.status not in ('RETIRED','SUPERSEDED') and cf.lineage_key like 'IMM 5%' order by cf.lineage_key limit 1`);
    step("setup: a form from the library is added to Visitor visa (its draft has content)", (await api(`/combinations/${visitor}/forms`, { method: "POST", data: { formKey: aForm } })).status < 300, aForm);
    await go(`/c/${visitor}/review`);
    await p.locator("main table").filter({ has: p.locator("th", { hasText: /^Item$/ }) }).first().waitFor({ timeout: 30000 }).catch(() => undefined);
    const rv = await main();
    step("QA-73: Review and release: no \"SME duty\", no \"Derived\", no \"no tested helper\"", !/SME duty|Derived definition|Derived fields|no tested helper/.test(rv), (rv.match(/SME duty|Derived[^\n]{0,40}|no tested helper/) ?? [])[0]);
    // QA-73 retest 832ee5bd (F8): the Item column names each item in a few words; a calculation's long definition is in the tip.
    const items = await p.locator("main table").filter({ has: p.locator("th", { hasText: /^Item$/ }) }).locator("tbody tr td:nth-child(3)").evaluateAll((els) => els.map((e) => ({ text: e.textContent.trim(), tip: e.getAttribute("title") ?? "", clamp: !!e.querySelector(".line-clamp-2") })));
    const longTips = items.filter((x) => x.tip.length > 60);
    step("QA-73 pass: every Item cell is 60 characters or fewer (or clamped), and a long definition is in its tip", items.length > 0 && items.every((x) => x.text.length <= 60 || x.clamp) && longTips.every((x) => x.clamp ? x.tip === x.text : (x.tip !== x.text && x.tip.length > x.text.length && / /.test(x.tip))), `${items.length} items, ${longTips.length} with a long definition in the tip; longest text ${Math.max(0, ...items.map((x) => x.text.length))}`);
    step("QA-73 fail: no Item cell shows a system role name or a whole definition", !items.some((x) => /subject_[a-z_]+|\b[a-z]+_[a-z_]+\b/.test(x.text) || (x.text.length > 60 && !x.clamp)), items.find((x) => /subject_[a-z_]+/.test(x.text) || (x.text.length > 60 && !x.clamp))?.text);
    await axe("Review and release"); await p.screenshot({ path: path.join(SHOTS, "review-1440.png"), fullPage: true });
    // Tech lead 31 Oct (#117 Q1): a disabled primary button is plainly grey on every page, not a half-faded blue.
    const off = await p.getByRole("button", { name: /Approve and release/ }).evaluate((e) => { const c = getComputedStyle(e); return { off: e.disabled, bg: c.backgroundColor, opacity: c.opacity }; });
    step("Button: a disabled primary (Approve and release, for the author) is grey at full opacity, not a faded brand blue", off.off && off.opacity === "1" && !/rgb\(8, 98, 197\)/.test(off.bg), JSON.stringify(off));
    // QA-73 and QA-74 retest (X4): on the released combination, each list warning names its form once, and the versions
    // table has no fingerprint column (it is in the version's tip) and dates in the one format.
    await go(`/c/${released}/review`);
    if (await p.getByRole("button", { name: /^Show all \d+$/ }).count()) await p.getByRole("button", { name: /^Show all \d+$/ }).click();
    const rr = await main(), lists = rr.split("\n").filter((l) => /rows? of its lists/.test(l));
    step("QA-73: a list warning names its form once (\"IMM 1295: 37 rows\", never \"IMM 1295: IMM 1295:\")", lists.length > 0 && lists.every((l) => !/(IMM [\w ]+?): \1:/.test(l)), lists.find((l) => /(IMM [\w ]+?): \1:/.test(l)) ?? `${lists.length} list warnings`);
    const versions = await p.locator("main table").last().innerText();
    step("QA-74: Released versions: no Fingerprint column and no hash; the fingerprint is in the version's tip", /^Version\s/.test(versions) && !/Fingerprint/.test(versions) && !/[0-9a-f]{16}/.test(versions) && /^Fingerprint \(SHA-256\): [0-9a-f]{64}$/.test(await p.locator("main table").last().locator("tbody td").first().getAttribute("title") ?? ""), versions.slice(0, 160));
    step("QA-74: Released versions: dates in the one format (no \"10/29/2026, 8:34:03 PM\")", !/\d+\/\d+\/\d{4}/.test(versions), versions.slice(0, 160));
    // #118 review Minor 3: step 3 said "Release 2" while the table said "v1"; both now name the version and its Release.
    const card3 = /Last released: version (\d+), in Release (\d+)/.exec(rr), row1 = /v(\d+) · Release (\d+)/.exec(versions);
    step("Review and release (#118 Minor 3): step 3 and the Released versions table name the same version and the same Release", !!card3 && !!row1 && card3[1] === row1[1] && card3[2] === row1[2], `${card3?.[0]} | ${row1?.[0]}`);
    await axe("Review and release (released)"); await p.screenshot({ path: path.join(SHOTS, "review-released-1440.png"), fullPage: true });

    // QA-48: a retired combination is found under the Retired chip (card v4, P-180), and the counts line says it is hidden
    await go("/");
    const noRetired = await p.locator('[data-status-chip="retired"]').count();
    step("QA-48 fail case: with nothing retired the counts line says nothing about retired ones and there is no Retired chip", !/retired, not shown/.test(await main()) && noRetired === 0, noRetired);
    // Retired as a release does it (P-116): the row and its activity line (the catalogue's cache follows the activity).
    sql(`update combination set retired_at = now() where id = '${visitor}'; insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), workspace_id, 'user-B', 'retired', 'combination', id::text, 'Approver retired Visitor visa (check)' from combination where id = '${visitor}'`);
    await go("/");
    const pg = await main();
    step("QA-48: the counts line says one is retired and not shown, and how to see it", /1 retired, not shown \(Retired\)/.test(pg), (pg.match(/\d+ combinations?[^\n]*/) ?? [])[0]);
    await p.locator('[data-status-chip="retired"]').click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(300);
    const rt = await main();
    step("QA-48: the Retired chip lists the retired combination", /Visitor visa/.test(rt) && /f=retired/.test(p.url()), p.url().replace(BASE, ""));
    const card = p.locator('article[data-label="Visitor visa"]');
    // Card v4 (concept v4 §6): "Retired at Release n", no bar, Open; restoring stays on Program structure (P-116).
    step("QA-48 (card v4): the retired card says Retired at Release n with no bar and offers Open, never a setup step", /^1 retired combination/m.test(rt) && /Retired at Release \d+/.test(await card.innerText()) && await card.locator("[data-edge-bar]").count() === 0 && (await card.locator("[data-card-act]").innerText()).trim() === "Open" && !/In setup|Start setup|Resume setup|of 5 steps/.test(await card.innerText()), (await card.innerText()).replace(/\n/g, " / "));
    await p.screenshot({ path: path.join(SHOTS, "retired-1440.png") });
    // PR #91 outside review (2): the row announces what its chip shows.
    const label = await card.getAttribute("aria-label");
    step("QA-48: the retired card's accessible name says Retired, as its progress line does", /, Retired at Release \d+$/.test(label ?? ""), label);
    step("QA-48 fail case: it never announces Live, In setup or Not started", !/(Live|Not ready|In setup|Not started|of 5 steps)$/.test(label ?? ""), label);
    // PR #91 outside review (1), card v4: Open on a retired card opens its combination page (restore is on Program structure).
    await card.locator("[data-card-act] button").click(); await p.waitForURL(/\/c\//, { timeout: 10000 }).catch(() => {});
    step("QA-48 (card v4): Open on the retired card opens its combination page", p.url().includes(`/c/${visitor}`), p.url().replace(BASE, ""));
    sql(`update combination set retired_at = null where id = '${visitor}'`);
    // Card v4: a retired combination that was set up offers Open (above); a retired name never set up has nothing to
    // open, so its card links to Program structure on its own tab, where it is restored (P-116).
    const corpRow = ((await api("/catalogue?pathway=CORPORATE&filter=all")).body?.rows ?? []).find((r) => !r.combinationId);
    const corp = [corpRow?.nodeKey, corpRow?.label];
    step("setup: the sample has a Corporate name not set up yet, to retire", !!corpRow, corpRow?.label);
    sql(`update program_def set retired_at = now(), retired_by = 'user-B' where program_node_key = '${corp[0]}'; insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), workspace_id, 'user-B', 'retired', 'program', program_node_key, 'Approver retired a Corporate name (check)' from program_def where program_node_key = '${corp[0]}'`);
    await go("/?pw=CORPORATE&f=retired");
    const corpCard = p.locator(`article[data-label="${corp[1]}"]`);
    const href = await corpCard.getByRole("link", { name: "Restore on Program structure" }).getAttribute("href", { timeout: 10000 }).catch(() => null);
    step("QA-48 (card v4): a retired Corporate name never set up links Restore to Program structure on Corporate and employers", href === "/structure?r=1&t=CORPORATE", `${corp[1]}: ${href} / ${(await corpCard.innerText().catch(() => "no card")).replace(/\n/g, " / ")}`);
    if (href) { await corpCard.getByRole("link", { name: "Restore on Program structure" }).click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(400); }
    step("QA-48: there it is listed (Show retired on), so it can be restored", !!href && (await main()).includes(corp[1]), p.url().replace(BASE, ""));
    sql(`update program_def set retired_at = null, retired_by = null where program_node_key = '${corp[0]}'`);

    // #133 review Major: a Start setup greyed with aria-disabled (a change to it waits for a second person) is grey too.
    const del = await api("/structure/nodes/individual.visitors.extend_stay", { method: "DELETE", data: { reason: "Check: a greyed Start setup." } });
    await go("/");
    const startBtn = p.getByRole("button", { name: "Start setup: Extend stay in Canada" }).first();
    const sLook = await startBtn.evaluate((e) => { const c = getComputedStyle(e); return { aria: e.getAttribute("aria-disabled"), bg: c.backgroundColor, opacity: c.opacity }; }).catch((e) => ({ error: e.message.split("\n")[0] }));
    step("Button: a greyed Start setup (a change waits for a second person) is grey at full opacity, not a faded brand blue", del.status < 300 && sLook.aria === "true" && sLook.opacity === "1" && !/rgb\(8, 98, 197\)/.test(sLook.bg ?? "rgb(8, 98, 197)"), JSON.stringify({ del: del.status, ...sLook }));
    await startBtn.focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab");
    const sFocus = await p.evaluate(() => { const a = document.activeElement; return { start: !!a?.matches?.("[data-start-setup]"), shadow: getComputedStyle(a).boxShadow }; });
    step("Button: the greyed Start setup, reached by Tab, shows the 3 px focus ring (WCAG 2.4.7)", sFocus.start && /0px 0px 0px 3px/.test(sFocus.shadow), JSON.stringify(sFocus));

    step("no page error", !errs.length, errs.join(" | "));
    const all = [ov, rel, act, ck, sc, dt, rv].join("\n");
    step("no user id, raw type, fingerprint or screen number on these pages", !SYSTEM.test(all), (all.match(SYSTEM) ?? [])[0]);
  } finally { await b.close(); }
  console.log(`\n${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
