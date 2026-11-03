// S6 slice 1b in the browser (screens lane; P-149 one door, P-121, P-123; C11.13, C11.14): To review's Proposals row
// opens the review queue; a group shows Ready to accept · Check · Decide; Ready AI items are accepted together with one
// Undo, a rules item landing on the library never, and (P-305) only clean reuse: a new answer list is accepted on its
// own; the side panel shows both readings, IRCC's quote and the rules, and takes a reject (reason needed) or the
// checker's reading; the second person approves a decision of several together, never its decider. Items enter through the door (tests/seed_proposals.ts); no AI call (US$0). Screenshots into
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
  // Lead early look: a toast never covers the side panel's footer. Each footer button is outside every toast and is the
  // element a click at its centre reaches.
  const footerClear = () => p.evaluate(() => {
    const toasts = [...document.querySelectorAll("[data-toaster] > div")].map((x) => x.getBoundingClientRect());
    const dialog = document.querySelector('[role="dialog"]');
    const buttons = [...dialog.querySelectorAll("button")].filter((x) => /^(Accept|Reject)/.test(x.textContent.trim()));
    const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const detail = buttons.map((x) => { const r = x.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return `${x.textContent.trim()}@${Math.round(r.left)},${Math.round(r.top)} hit=${hit?.tagName}.${(hit?.textContent ?? "").trim().slice(0, 20)} overlap=${toasts.some((o) => overlap(o, r))}`; });
    return { detail, toastAt: toasts.map((o) => `${Math.round(o.left)},${Math.round(o.top)},${Math.round(o.right)},${Math.round(o.bottom)}`), toasts: toasts.length, buttons: buttons.length, ok: buttons.length >= 2 && buttons.every((x) => { const r = x.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !toasts.some((o) => overlap(o, r)) && !!hit && dialog.contains(hit) && (x.disabled || hit === x || x.contains(hit)); }) };
  });
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

    // C11.14 (P-121): Select all and Deselect all within the group
    step("C11.14 fail: Clear the choice is off while nothing is chosen", await band("ready").getByRole("button", { name: "Clear the choice" }).isDisabled());
    await band("ready").getByRole("button", { name: "Choose all 2" }).click();
    step("C11.14 pass: Choose all picks the group's two acceptable Ready items", (await band("ready").getByRole("checkbox", { checked: true }).count()) === 2 && /2 items chosen/.test(await band("ready").innerText()));
    await band("ready").getByRole("button", { name: "Clear the choice" }).click();
    step("C11.14 pass (review m1): focus moves to Choose all after clearing", await p.waitForFunction(() => document.activeElement?.hasAttribute("data-choose-all"), null, { timeout: 3000 }).then(() => true, () => false));
    step("C11.14 pass: Clear the choice deselects all; Accept is off again", (await band("ready").getByRole("checkbox", { checked: true }).count()) === 0 && await band("ready").getByRole("button", { name: /^Accept/ }).isDisabled());

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
    step("C11.14 (P-305): accepted again; both record the library item they reuse, and nothing new waits for a second person", sql(`select string_agg(decided_key, ',' order by decided_key) from proposal_item where batch_id = '${batch}' and status = 'accepted'`) === [...ids.reused].sort().join(",") && sql(`select count(*) from library_change where batch_id = '${batch}'`) === "0");

    // The side panel: both readings, the quote, the rules; reject needs a reason; the checker's reading
    await band("decide").getByRole("button", { name: "Open Name at birth" }).click();
    const panel = p.getByRole("dialog");
    await panel.waitFor();
    const txt = await panel.innerText();
    step("C11.13: the side panel shows both readings, IRCC's words with file and page, and the rules", /Name given at birth/.test(txt) && /Name as printed on the birth certificate/.test(txt) && /imm1111e\.pdf · edition 02-2026 · page 2 · found in the file/.test(txt) && /Passed/.test(txt) && /the readings differ/i.test(txt), txt.slice(0, 400));
    step("C11.14 fail: Reject stays off without a reason", await panel.getByRole("button", { name: "Reject" }).isDisabled());
    const clear1440 = await footerClear();
    step("C11.14 (1440): with a toast showing, the panel's Accept and Reject stay visible and clickable", clear1440.toasts >= 1 && clear1440.ok, JSON.stringify(clear1440));
    await p.screenshot({ path: path.join(SHOTS, "panel-decide-1440.png") });
    await axe("the side panel");
    await panel.getByRole("button", { name: "Accept the checker's reading" }).click(); await settle();
    // #477 CI: the write can land after settle()'s fixed wait on a slow runner; poll for it, and still fail if it never lands.
    const landed = await (async () => { for (let i = 0; i < 40; i++) { const v = sql(`select status || '|' || (payload->>'label') from proposal_item where id = '${ids.decide}'`); if (v === "edited|Name on the birth certificate") return v; await p.waitForTimeout(200); } return sql(`select status || '|' || (payload->>'label') from proposal_item where id = '${ids.decide}'`); })();
    step("C11.14: accepting the checker's reading lands that reading", landed === "edited|Name on the birth certificate", landed);
    await band("check").getByRole("button", { name: "Open Height in centimetres" }).click();
    await p.getByRole("dialog").getByLabel(/Reason/).fill("Height is not asked on this form");
    await p.getByRole("dialog").getByRole("button", { name: "Reject" }).click(); await settle();
    step("C11.14: a Check item is rejected with its reason; the producer can learn from it", sql(`select status || '|' || decision_reason from proposal_item where id = '${ids.check}'`) === "rejected|Height is not asked on this form");

    // P-305: two Ready new answer lists (another edition) have no checkbox: each is accepted on its own.
    const ED3 = "IMM 3333 (02-2026)";
    const lists = JSON.parse(execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, "tests", "seed_proposals.ts"), DB, ED3, "lists"], { encoding: "utf8" }).trim().split("\n").pop()).lists;
    await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent(`edition:${ED3}`)}`); await settle();
    const why = ((await api(`/review/proposals?group=${encodeURIComponent(`edition:${ED3}`)}`, { actor: "user-C" })).body?.group?.bands.ready ?? []).map((x) => x.bulk_why);
    step("C11.14 fail (P-305): two Ready new answer lists have no checkbox; each says it is decided on its own", (await band("ready").locator("tbody tr").count()) === 2 && (await band("ready").getByRole("checkbox").count()) === 0 && why.length === 2 && why.every((w) => /new item to the shared library/.test(w ?? "")), JSON.stringify(why));
    const one = await api("/review/proposals/decide", { method: "POST", actor: "user-C", data: { ids: [lists[0]], action: "accept" } });
    const two = await api("/review/proposals/decide", { method: "POST", actor: "user-C", data: { ids: [lists[1]], action: "accept" } });
    step("C11.14 pass (P-305): each list is accepted on its own, as its own decision", one.status === 201 && two.status === 201 && one.body.batchId !== two.body.batchId);
    // Grouped second-person approval: To review no longer makes a decision of several library changes (P-305: new items and conditions are each accepted on their own), but the
    // batch page still serves those decided before it; one is made here from the two single accepts.
    const group = one.body.batchId;
    sql(`update library_change set batch_id = '${group}' where batch_id = '${two.body.batchId}'; update proposal_item set batch_id = '${group}' where id = '${lists[1]}'`);
    await p.goto(`${BASE}/review/batch/${group}`); await settle();
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
    step("C11.14: the second person approves both together, each through the same guard", sql(`select string_agg(status, ',') from library_change where batch_id = '${group}'`) === "APPROVED,APPROVED");

    // Narrower screen
    await as("user-C"); await p.setViewportSize({ width: 1024, height: 768 });
    await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent(`edition:${ED}`)}`); await settle();
    step("layout (1024): the queue has no sideways page scroll", await noSideScroll());
    // A toast while the panel stays open: the item is decided elsewhere meanwhile, so Accept is refused in a toast.
    await band("ready").getByRole("button", { name: "Open Eye colour" }).click();
    await p.getByRole("dialog").waitFor();
    await api("/review/proposals/decide", { method: "POST", actor: "user-C", data: { ids: [ids.rules], action: "reject", reason: "Decided elsewhere (test)" } });
    await p.getByRole("dialog").getByRole("button", { name: /^Accept/ }).click();
    await p.locator("[data-toaster] > div").first().waitFor();
    const clear1024 = await footerClear();
    step("C11.14 fail (1024): a refused Accept shows its toast and the panel's Accept and Reject stay visible and clickable", clear1024.toasts >= 1 && clear1024.ok, JSON.stringify(clear1024));
    await p.screenshot({ path: path.join(SHOTS, "panel-toast-1024.png") });
    await p.setViewportSize({ width: 800, height: 900 });
    await p.waitForTimeout(200);
    const clear800 = await footerClear();
    step("C11.14 (800, panel full width): the toast sits above the panel's footer; Accept and Reject stay clickable", clear800.toasts >= 1 && clear800.ok, JSON.stringify(clear800));
    await p.screenshot({ path: path.join(SHOTS, "panel-toast-800.png") });
    await p.keyboard.press("Escape");
    await p.screenshot({ path: path.join(SHOTS, "queue-1024.png"), fullPage: true });
    // Lead review of PR #96 (5): deciding a group's last item keeps its Undo, though the group then answers 404.
    sql(`update proposal_item set status = 'waiting', decided_by = null, decided_at = null, decision_reason = null, batch_id = null where id = '${ids.rules}'`);
    await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent(`edition:${ED}`)}`); await settle();
    await band("ready").getByRole("button", { name: "Open Eye colour" }).click();
    await p.getByRole("dialog").getByLabel(/Reason/).fill("Not asked on this form (test)");
    await p.getByRole("dialog").getByRole("button", { name: "Reject" }).click(); await settle();
    const lastUndo = p.getByRole("button", { name: /^Undo \(\d+ s\)/ });
    step("C11.14 (#96 5): the group's last item decided, the page says nothing waits and still offers its Undo", /Nothing waits in this group any more/.test(await p.locator("main").innerText()) && await lastUndo.isVisible());
    await lastUndo.click(); await settle();
    step("C11.14 (#96 5): that Undo puts the item back to wait", sql(`select status from proposal_item where id = '${ids.rules}'`) === "waiting");
    step("no page errors", !errs.length, errs.join(" | "));
  } catch (e) { step("the run finished", false, e.stack ?? e); }
  await b.close();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
