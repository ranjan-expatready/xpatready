// qa after-merge 1 Nov, third round (main 63168762), explore runtime by walk (handover of #246):
// Part A — a case with a representative (With an LMIA, the sample's Live combination that lists one) as the case
//   officer: how the page names the representative (QA-76: lower-case "representative", team words), at 1440 px.
//   B117 (P-373): the representative of record comes from the case team (C6.11), never added as a person: the walk opens
//   the case with one and reads their name from the case team; adding one through the people route is now refused (422).
// Part B — the client's questionnaire as Client A, keyboard only, at 200 % zoom (720 × 450 CSS px) and 1024 px:
//   skip link or first focus, every focus visible, a text answer typed and saved by keyboard, no sideways scroll, axe.
// Sample data (Load sample; the case is opened through the API as the case officer), no STUDIO_*_LIVE, US$0.
//   zsh studio/tools/isolated.sh qa_wk 4472 start && node studio/tests/qa/check_qa_am_1101c_walk.cjs 4472
//   node studio/tests/qa/check_qa_am_1101c_runtime_walk.cjs 4472
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4472), BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-11-01-after-merge-4"); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : ` — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 400)}`}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : { channel: "chrome" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (u, actor, method = "GET", data) => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const actAs = async (a) => { await p.goto(BASE); await p.evaluate((x) => localStorage.setItem("xr-actor", x), a); };
  await actAs("user-A");
  if (!(await api("/demo/status", "user-A")).body?.loaded) step("setup: Load sample", (await api("/demo/load", "user-A", "POST")).status === 201);
  const lm = (await api("/catalogue?pathway=INDIVIDUAL&filter=all", "user-A")).body.rows.find((r) => r.label === "With an LMIA")?.combinationId;
  const made = await api("/runtime/cases", "user-O", "POST", { combinationId: lm, reference: `QAREP-${Date.now().toString(36).slice(-5)}`, clientActor: "user-P", principal: { displayName: "Client A" }, representative: "user-R", caseOfficers: ["user-O"] });
  step("setup: a With an LMIA case opens with a representative of record in its case team", made.status === 201, made.body?.detail ?? made.status);
  const id = made.body.id;
  const team = await api(`/runtime/cases/${id}/team`, "user-O");
  const repName = team.body?.representative?.name ?? "";
  step("setup: the case team names its representative of record", team.status === 200 && team.body?.representative?.id === "user-R" && !!repName, team.body?.representative ?? team.status);
  const asPerson = await api(`/runtime/cases/${id}/people`, "user-O", "POST", { role: "representative", displayName: "Representative R" });
  step("B117: a representative is never added as a person (422, the case team named)", asPerson.status === 422 && /case team/.test(asPerson.body?.detail ?? ""), asPerson.body?.detail ?? asPerson.status);

  // ---------------------------------------------------------------- Part A: the officer's page with a representative
  await actAs("user-O"); await p.goto(`${BASE}/cases/${id}`); await p.waitForLoadState("networkidle");
  const text = await p.locator("main").innerText();
  const tips = await p.locator("[title]").evaluateAll((els) => els.map((e) => e.getAttribute("title")).join(" | "));
  await p.screenshot({ path: path.join(SHOTS, "04-case-with-representative-1440.png"), fullPage: true });
  const lower = [...`${text}\n${tips}`.matchAll(/(^|[\n•·|:] ?)representative\b/g)].length;
  step("QA-76 C7.x: a sentence or label never starts with lower-case \"representative\"", lower === 0, lower);
  step(`QA-76 C7.x: the representative of record is named (${repName}) on the case page`, !!repName && text.includes(repName));
  step("QA-76 C7.x: no slice or lane word a person cannot act on (\"forms slice\", \"lane\", P-nn)", !/forms slice|\blane\b|\bP-\d+\b/.test(`${text}\n${tips}`), (`${text}`.match(/.{0,60}(forms slice|\blane\b|\bP-\d+\b).{0,40}/) ?? [""])[0]);
  const ax0 = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("axe: case page with a representative is clean", ax0.violations.length === 0, ax0.violations.map((v) => v.id));

  // ---------------------------------------------------------------- Part B: the client's questionnaire by keyboard
  await actAs("user-P");
  for (const [w, h, name] of [[720, 450, "200% zoom"], [1024, 768, "1024 px"]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`${BASE}/cases/${id}/questionnaire`); await p.waitForLoadState("networkidle");
    const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`C4.x client questionnaire ${name}: no sideways scroll`, side <= 0, side);
    // Tab until the first text box; every stop on the way must show a visible focus indicator.
    const unseen = []; let box = null, started = false, saves = 0;
    for (let i = 0; i < 160 && !box; i++) {
      await p.keyboard.press("Tab");
      const f = await p.evaluate(async () => { const e = document.activeElement; if (!e || e === document.body) return null;
        // A button eases its ring in (transition-all, 150 ms): read what a person sees once it has settled.
        await Promise.all(e.getAnimations().map((a) => a.finished.catch(() => {}))); const s = getComputedStyle(e); const r = e.getBoundingClientRect();
        return { programmatic: e.tabIndex < 0 && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.tagName), tag: e.tagName, type: e.getAttribute("type"), label: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 40), ring: (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow || "").split(/,(?![^(]*\))/).some((l) => { const m = l.trim().match(/^(\w+\(([^)]*)\))\s+0px 0px 0px ([\d.]+)px/); if (!m || !(parseFloat(m[3]) > 0)) return false; const a = m[2].includes("/") ? parseFloat(m[2].split("/")[1]) : (m[1].startsWith("rgba") ? parseFloat(m[2].split(",")[3]) : 1); return a > 0; }), css: `fv=${e.matches(":focus-visible")} cls=${String(e.className).slice(0, 220)} | ${s.outlineStyle} ${s.outlineWidth} | ${(s.boxShadow || "").split(/,(?![^(]*\))/).filter((l) => !/ 0px 0px 0px 0px/.test(l)).join(",")}`, inView: r.bottom > 0 && r.top < innerHeight }; });
      if (!f) continue;
      // A heading the page moves focus to after a step (tabindex=-1, for screen readers) is not a Tab stop (WCAG 2.4.7 is about operable controls).
      if (!f.ring && !f.programmatic) unseen.push(`${f.tag} ${f.label} [${f.css}]`);
      if (!started && f.tag === "BUTTON" && /^(Start|Continue)/.test(f.label)) { started = true; await p.keyboard.press("Enter"); await p.waitForLoadState("networkidle"); continue; }
      // A choice question: Space picks the focused option (a person answers it by keyboard), then on to Save and continue.
      if (f.tag === "INPUT" && f.type === "radio") { await p.keyboard.press("Space"); continue; }
      if (f.tag === "BUTTON" && /^Save and continue/.test(f.label) && saves < 6) { saves++; await p.keyboard.press("Enter"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(400); continue; }
      if ((f.tag === "INPUT" && !["radio", "checkbox", "hidden"].includes(f.type ?? "")) || f.tag === "TEXTAREA") box = f;
    }
    step(`C4.x client questionnaire ${name} keyboard: Tab reaches a text answer`, !!box, box);
    step(`C4.x client questionnaire ${name} keyboard: every stop on the way shows where focus is (WCAG 2.4.7; retest after #243)`, unseen.length === 0, unseen.slice(0, 6));
    if (box) {
      const inView = await p.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
      step(`C4.x client questionnaire ${name} keyboard: the focused answer is scrolled into view (WCAG 2.4.11)`, inView);
      const val = box.type === "number" ? String(w) : box.type === "date" ? "2026-12-0" + (w === 720 ? 1 : 2) : `QA keyboard ${w}`;
      await p.keyboard.type(val);
      // Underneath: the answer is stored once the person saves (Tab on to "Save and come back later", Enter).
      const stored = async () => JSON.stringify((await api(`/runtime/cases/${id}/questionnaire?mode=agent`, "user-O")).body ?? {}).includes(JSON.stringify(val));
      let later = false;
      for (let i = 0; i < 12 && !later; i++) { await p.keyboard.press("Tab"); later = /^Save and come back later/.test(await p.evaluate(() => (document.activeElement?.textContent ?? "").trim())); }
      if (later) { await p.keyboard.press("Enter"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800); }
      step(`C4.x client questionnaire ${name} keyboard: "Save and come back later" by keyboard stores the typed answer exactly (read as the case officer)`, later && await stored(), { later });
    }
    await p.screenshot({ path: path.join(SHOTS, `05-client-questionnaire-${w}.png`) });
    const ax = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe ${name}: client questionnaire clean`, ax.violations.length === 0, ax.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`));
  }
  step("no page error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
