// QA-179 (UX Minor; P-288 (1); the UX-A one-label rule): "Needs you" carried two counts with one name. Immigration
// programs counts combinations (5), To review counts items (16/17, with held files only on To review). Now each count
// names what it counts: Programs "N combinations need you" (the chip, the Pathway marks, a Pathway's heading), To review
// "Needs you · N items" (and the other views' tabs), with a line saying how the two meet: the items on combinations, how
// many combinations they are (Programs' number), the held files named as held, the other shared-library items apart.
// Walked in a real browser on the demo sample and on the six, as user-A, user-B and user-C. Fail cases: a bare number
// beside "Needs you"; Programs' combination count differing from the combinations To review's line names; the line's
// parts not adding up to the items; a held file's row not saying it is held. 1440, 1024 and 400 px without sideways
// scroll; axe (WCAG 2.2 AA). Screenshots in product/screens/UX-A/screenshots/ (qa179-*). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_qa179 4452 start && node studio/tests/check_qa179_needs_words_browser.cjs 4452 xr_studio_screens_qa179
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4452);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "UX-A", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  QA-179: ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const PEOPLE = ["user-A", "user-B", "user-C"];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": actor, "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (actor) => { await p.goto(BASE); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  const settled = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 });
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  // Programs' Needs you as the server counts it: combinations, per Pathway type.
  const programsNeeds = async (actor, pw) => ((await api(`/catalogue?pathway=${pw}&filter=all`, {}, actor)).body?.rows ?? []).filter((r) => r.needsYou && r.combinationId).map((r) => r.combinationId);
  const reviewNeeds = async (actor) => (await api("/review-queue?filter=needs", {}, actor)).body;

  const walk = async (label) => {
    for (const actor of PEOPLE) {
      await as(actor);
      const q = await reviewNeeds(actor);
      const combos = new Set(q.items.map((i) => i.combination).filter(Boolean));
      let programsTotal = 0; const programsIds = new Set();
      // ---------------------------------------------------------------- Immigration programs: combinations, said so
      for (const pw of ["INDIVIDUAL", "CORPORATE"]) {
        const ids = await programsNeeds(actor, pw); programsTotal += ids.length; ids.forEach((id) => programsIds.add(id));
        await p.goto(`${BASE}/${pw === "CORPORATE" ? "?pw=CORPORATE" : ""}`); await p.locator("[data-needs-you]").first().waitFor({ timeout: 20000 }); await settled();
        const chip = p.locator("[data-needs-you]").first();
        await p.waitForFunction((n) => document.querySelector("[data-needs-you-count]")?.getAttribute("data-needs-you-count") === String(n), ids.length, { timeout: 15000 }).catch(() => undefined);
        const text = (await chip.innerText()).replace(/\s+/g, " ").trim();
        step(`${label} (${actor}, ${pw === "CORPORATE" ? "Corporate" : "Retail"}): Programs' chip says "${plural(ids.length, "combination needs", "combinations need")} you", the server's count`, text === `${plural(ids.length, "combination needs", "combinations need")} you`, { text, want: ids.length });
        const marks = await p.locator("[data-need]").evaluateAll((a) => a.map((x) => x.textContent));
        step(`${label} (${actor}, ${pw === "CORPORATE" ? "Corporate" : "Retail"}) fail case: no Pathway mark is a bare number (each says it counts combinations)`, marks.every((t) => /^\d+ combinations? needs? you$/.test(t.replace(/\s+/g, " ").trim())), marks);
      }
      // ---------------------------------------------------------------- To review: items, and how they meet the combinations
      await p.goto(`${BASE}/review`); await p.getByRole("heading", { name: "To review" }).waitFor(); await settled();
      await p.waitForFunction(() => /\d/.test(document.querySelector('[role="group"][aria-label="Show items"]')?.textContent ?? ""), null, { timeout: 15000 });
      const tabs = (await p.getByRole("group", { name: "Show items" }).innerText()).replace(/\s+/g, " ");
      step(`${label} (${actor}): To review's tabs count items and say so ("Needs you · ${plural(q.counts.needs, "item", "items")}")`, tabs.includes(`Needs you · ${plural(q.counts.needs, "item", "items")}`) && tabs.includes(`All · ${plural(q.counts.all, "item", "items")}`), tabs);
      const line = p.locator("[data-needs-breakdown]");
      if (!q.items.length) { step(`${label} (${actor}): nothing needs this person, so no breakdown line`, await line.count() === 0); continue; }
      await line.waitFor({ timeout: 15000 });
      const said = (await line.innerText()).replace(/\s+/g, " ").trim();
      const held = q.items.filter((i) => !i.combination && i.kind === "held_file").length;
      const library = q.items.filter((i) => !i.combination && i.kind !== "held_file").length;
      const onCombos = q.items.length - held - library;
      step(`${label} (${actor}): the line names the items (${q.items.length}) and the combinations they are on (${combos.size})`, said.startsWith(`${plural(q.items.length, "item needs", "items need")} you`) && (!onCombos || said.includes(`${plural(onCombos, "item", "items")} on ${plural(combos.size, "combination", "combinations")}`)), said);
      // Review-qa179 m1: Programs' chip counts one Pathway type at a time, so the line claims no Programs number; the same
      // combinations are marked on Programs, each under its type (set equality, not only the sum).
      step(`${label} (${actor}) fail case: the combinations on To review's line are exactly those Programs marks Needs you (both Pathway types)`, Number(await line.getAttribute("data-combinations")) === programsTotal && combos.size === programsIds.size && [...combos].every((c) => programsIds.has(c)), { line: await line.getAttribute("data-combinations"), programsTotal, combos: combos.size });
      step(`${label} (${actor}): the line says where the combinations are marked, without a number Programs' one-type chip may not show`, !onCombos || /each marked Needs you on Immigration programs, under its Pathway type/.test(said), said);
      step(`${label} (${actor}) fail case: the line's parts add up to the items`, onCombos + held + library === q.counts.needs && Number(await line.getAttribute("data-held")) === held && Number(await line.getAttribute("data-library")) === library, { onCombos, held, library, needs: q.counts.needs });
      step(`${label} (${actor}): held files are named as held on the line`, !held || said.includes(`${plural(held, "held file", "held files")} (held:`), said);
      const badge = await p.getByRole("navigation", { name: "Studio" }).getByRole("link", { name: /To review/ }).locator("span[aria-label]").last().getAttribute("aria-label").catch(() => null);
      step(`${label} (${actor}): the menu's To review badge says it counts items`, badge === `${plural(q.counts.needs, "item needs", "items need")} you`, badge);
    }
  };

  await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the demo sample loads", (await api("/demo/load", { method: "POST", data: {} })).status < 300);
  await walk("demo sample");
  const six = await api("/demo/reset-to-six", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the six load (saved AI answers replayed, US$0)", six.status < 300, six.status);
  await walk("the six");

  // Held files: each held file's row on To review says it is held (whoever it waits for).
  const all = (await api("/review-queue?filter=all", {}, "user-B")).body;
  const heldRows = all.items.filter((i) => i.kind === "held_file");
  step("held files: every held file's row says it is held", heldRows.every((i) => /^Held: /.test(i.what)), heldRows.map((i) => i.what.slice(0, 60)));
  console.log(`(held files on the six: ${heldRows.length})`);

  // ------------------------------------------------------------------ sizes, axe, screenshots (the approver on the six)
  await as("user-B");
  for (const [w, h] of [[1440, 900], [1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(BASE); await p.locator("[data-needs-you]").first().waitFor({ timeout: 20000 }); await settled();
    let side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`${w} px Programs: no sideways page scroll`, side <= 0, side);
    if (w === 1440) await axe("Immigration programs");
    await p.screenshot({ path: path.join(SHOTS, `qa179-programs-${w}.png`), fullPage: false });
    await p.goto(`${BASE}/review`); await p.getByRole("heading", { name: "To review" }).waitFor(); await settled();
    await p.locator("[data-needs-breakdown]").waitFor({ timeout: 15000 }).catch(() => undefined);
    side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`${w} px To review: no sideways page scroll`, side <= 0, side);
    if (w === 1440) await axe("To review");
    await p.screenshot({ path: path.join(SHOTS, `qa179-to-review-${w}.png`), fullPage: false });
  }
  step("no page error or console error on the walk", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
