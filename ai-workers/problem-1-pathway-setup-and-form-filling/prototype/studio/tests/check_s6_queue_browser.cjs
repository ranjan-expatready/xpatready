// S6 slice 1b in the browser (screens lane; P-149 one door, P-121, P-123; C11.13, C11.14): To review's Proposals row
// opens the review queue; a group shows Ready to accept · Check · Decide; Ready AI items are accepted together with one
// Undo, a rules item landing on the library never; the side panel shows both readings, IRCC's quote and the rules, and
// takes a reject (reason needed) or the checker's reading; the second person approves the batch together, never its
// decider. Items enter through the door (tests/seed_proposals.ts); no AI call (US$0). Screenshots into
// product/screens/W1-shared-library/screenshots/slice1b/, axe (WCAG 2.2 AA) on the queue, the panel and the batch page.
//   zsh studio/tools/isolated.sh screens_queue 4445 start && node studio/tests/check_s6_queue_browser.cjs 4445 xr_studio_screens_queue
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4445), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_screens_queue";
const STUDIO = path.join(__dirname, "..");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "W1-shared-library", "screenshots", "slice1b"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const ED = "IMM 1111 (02-2026)";
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (actor) => { await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  const go = async (u) => { await p.goto(`${BASE}${u}`); await p.waitForLoadState("networkidle"); await p.waitForFunction(() => !!document.querySelector("main h1"), null, { timeout: 30000 }); };
  const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(400); };
  const band = (b) => p.locator(`[data-band="${b}"]`);
  const axe = async (name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id}: ${x.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const noSideScroll = () => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  try {
    await p.goto(BASE); await as("user-C");
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    step("setup: sample inputs loaded", (await api("/demo/load", { method: "POST" })).status === 201);
    const ids = JSON.parse(execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, "tests", "seed_proposals.ts"), DB, ED], { encoding: "utf8" }).trim().split("\n").pop());
    step("setup: five items enter through the one door", !!ids.rules);

    // To review → the queue
    await go("/review?kind=proposals");
    const row = p.getByRole("row", { name: new RegExp(ED.replace(/[()]/g, "\\$&")) });
    step("C11.13: To review shows one Proposals row for the form edition, with its counts", /5 proposals waiting: 3 ready to accept, 1 to check, 1 to decide/.test(await row.innerText()), await row.innerText().catch(() => "no row"));
    await row.getByRole("link", { name: "Review 5 proposals" }).click();
    await p.waitForURL(/\/review\/proposals\?group=edition/); await settle();
    step("C11.13: the queue opens on that group, in Ready to accept · Check · Decide", (await band("ready").locator("tbody tr").count()) === 3 && (await band("check").locator("tbody tr").count()) === 1 && (await band("decide").locator("tbody tr").count()) === 1);
    step("C11.14 fail: the rules item that adds to the library has no checkbox (never accepted in bulk)", (await band("ready").getByRole("checkbox").count()) === 2 && (await band("ready").getByRole("checkbox", { name: /Eye colour/ }).count()) === 0);
    step("C11.14 fail: Accept stays off until items are chosen", await band("ready").getByRole("button", { name: /^Accept/ }).isDisabled());
    step("layout (1440): no sideways page scroll", await noSideScroll());
    await p.screenshot({ path: path.join(SHOTS, "queue-1440.png"), fullPage: true });
    await axe("the review queue");

    // Bulk accept, Undo, accept again
    await band("ready").getByRole("button", { name: "Choose all 2" }).click();
    await band("ready").getByRole("button", { name: "Accept 2 items" }).click(); await settle();
    const undoBtn = p.getByRole("button", { name: /^Undo \(\d+ s\)/ });
    step("C11.14: two Ready items are accepted together; one Undo is offered with its seconds", await undoBtn.isVisible() && (await band("ready").locator("tbody tr").count()) === 1);
    await p.screenshot({ path: path.join(SHOTS, "queue-undo-1440.png") });
    await undoBtn.click(); await settle();
    step("C11.14: Undo takes the whole batch back: both wait again, nothing waits on To review", (await band("ready").locator("tbody tr").count()) === 3 && sql(`select count(*) from proposal_item where id in ('${ids.ready1}', '${ids.ready2}') and status = 'waiting'`) === "2" && sql("select count(*) from library_change where status = 'WAITING' and batch_id is not null") === "0");
    await band("ready").getByRole("button", { name: "Choose all 2" }).click();
    await band("ready").getByRole("button", { name: "Accept 2 items" }).click(); await settle();
    const batch = sql(`select batch_id from proposal_item where id = '${ids.ready1}'`);
    step("C11.14: accepted again; both landed as new library items waiting for a second person", sql(`select count(*) from library_change where batch_id = '${batch}' and status = 'WAITING'`) === "2");

    // The side panel: both readings, the quote, the rules; reject needs a reason; the checker's reading
    await band("decide").getByRole("button", { name: "Open Name at birth" }).click();
    const panel = p.getByRole("dialog");
    await panel.waitFor();
    const txt = await panel.innerText();
    step("C11.13: the side panel shows both readings, IRCC's words with file and page, and the rules", /Name given at birth/.test(txt) && /Name as printed on the birth certificate/.test(txt) && /imm1111e\.pdf · edition 02-2026 · page 2 · found in the file/.test(txt) && /Passed/.test(txt) && /the readings differ/i.test(txt), txt.slice(0, 400));
    step("C11.14 fail: Reject stays off without a reason", await panel.getByRole("button", { name: "Reject" }).isDisabled());
    await p.screenshot({ path: path.join(SHOTS, "panel-decide-1440.png") });
    await axe("the side panel");
    await panel.getByRole("button", { name: "Accept the checker's reading" }).click(); await settle();
    step("C11.14: accepting the checker's reading lands that reading", sql(`select status || '|' || (payload->>'label') from proposal_item where id = '${ids.decide}'`) === "edited|Name on the birth certificate");
    await band("check").getByRole("button", { name: "Open Height in centimetres" }).click();
    await p.getByRole("dialog").getByLabel(/Reason/).fill("Height is not asked on this form");
    await p.getByRole("dialog").getByRole("button", { name: "Reject" }).click(); await settle();
    step("C11.14: a Check item is rejected with its reason; the producer can learn from it", sql(`select status || '|' || decision_reason from proposal_item where id = '${ids.check}'`) === "rejected|Height is not asked on this form");

    // Grouped second-person approval
    await p.goto(`${BASE}/review/batch/${batch}`); await settle();
    step("C11.14 fail: the person who accepted them sees why they cannot approve, and no Approve button", /You accepted these proposals/.test(await p.locator("main").innerText()) && (await p.getByRole("button", { name: /^Approve/ }).count()) === 0);
    await as("user-B");
    await go("/review?kind=library_change");
    const bRow = p.getByRole("row", { name: /2 new library items from one review decision/ });
    step("C11.14: the second person sees one row for the decision", await bRow.isVisible());
    await bRow.getByRole("link", { name: "Approve or return 2 items" }).click();
    await p.waitForURL(/\/review\/batch\//); await settle();
    step("C11.14 fail: Return stays off without a reason", await p.getByRole("button", { name: "Return 2 items" }).isDisabled());
    await p.screenshot({ path: path.join(SHOTS, "batch-1440.png") });
    await axe("the batch page");
    await p.getByRole("button", { name: "Approve 2 items" }).click();
    await p.waitForURL(/\/review(\?|$)/); await settle();
    step("C11.14: the second person approves both together, each through the same guard", sql(`select string_agg(status, ',') from library_change where batch_id = '${batch}'`) === "APPROVED,APPROVED");

    // Narrower screen
    await as("user-C"); await p.setViewportSize({ width: 1024, height: 768 });
    await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent(`edition:${ED}`)}`); await settle();
    step("layout (1024): the queue has no sideways page scroll", await noSideScroll());
    await p.screenshot({ path: path.join(SHOTS, "queue-1024.png"), fullPage: true });
    step("no page errors", !errs.length, errs.join(" | "));
  } catch (e) { step("the run finished", false, e.stack ?? e); }
  await b.close();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
