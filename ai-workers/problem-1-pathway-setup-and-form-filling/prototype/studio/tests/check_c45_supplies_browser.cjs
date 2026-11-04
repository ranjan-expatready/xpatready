// C4.5 in the browser (screens lane; concept product/screens/C4.5-document-supplies/concept.md §4, approved on #1005),
// a walk like a person on Visitor visa of the six: the author opens the passport's line on the Documents tab, "Change the
// facts it supplies…", fills one card per official line (IMM 5484's and IMM 5257's own words, Sample) and sends it; a
// refusal is shown in words; the author withdraws and sends again; the approver sees each fact with its words on the
// change page and approves; the SQR tab then reads "from documents"; Preview's "Try it missing" asks them again; Library ›
// Document types opens the same panel. Screenshots at 1440 and 1024 px in product/screens/C4.5-document-supplies/
// screenshots/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c45b 4447 start && tsx studio/tests/setup_c45_walk.ts 4447 xr_studio_screens_c45b && node studio/tests/check_c45_supplies_browser.cjs 4447 <combination id it printed>
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;

const PORT = Number(process.argv[2] ?? 4447), VV = process.argv[3], BASE = `http://localhost:${PORT}`;
const ROOT = path.join(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "C4.5-document-supplies", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const SAMPLE = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "samples", "document-supplies.json"), "utf8")).document_types[0];
let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 200)}` : ""}`); };
// The sample's official lines, each with its facts (one card per line: words shared by several facts typed once).
const LINES = [...SAMPLE.facts.reduce((m, f) => { const k = `${f.source}|${f.quote}`; m.set(k, { source: f.source, quote: f.quote, facts: [...(m.get(k)?.facts ?? []), f.fact] }); return m; }, new Map()).values()];

(async () => {
  if (!VV) { console.error("STOP  pass the combination id tests/setup_c45_walk.ts printed"); process.exit(2); }
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const as = async (who) => { await p.goto(BASE); await p.evaluate((w) => { try { localStorage.setItem("xr-actor", w); } catch { /* ignore */ } }, who); };
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const shot = async (name, both = false) => {
    await p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`) });
    if (both) { await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, `${name}-1024.png`) }); await p.setViewportSize({ width: 1440, height: 900 }); }
  };
  const coverage = async () => { await p.locator("[data-coverage]").waitFor({ timeout: 60000 }); await p.waitForFunction(() => !/working out where/.test(document.querySelector("[data-coverage]")?.textContent ?? ""), null, { timeout: 60000 }); return p.locator("[data-coverage]").innerText(); };
  const panel = p.locator("[data-supplies-panel]");
  const openFromDrawer = async () => {
    await p.goto(`${BASE}/c/${VV}/documents`); await p.locator("[data-doc-supplies]").first().waitFor({ timeout: 60000 });
    await p.locator("tr", { hasText: "Passport information page copy" }).first().getByRole("button").first().click();
    await p.locator("[data-drawer-supplies]").click(); await panel.waitFor({ timeout: 60000 });
  };

  // The shared fields' names as the panel lists them (searched by a person by their words).
  const view = await (await p.request.get(`${BASE}/api/library/document-types/passport_information_page_copy/supplies`, { headers: { "x-actor": "user-A" } })).json();
  const LABEL = new Map(view.fields.map((f) => [f.key, f.label]));
  // ---------------------------------------------------------------- before
  await as("user-A");
  await p.goto(`${BASE}/c/${VV}/questionnaires`);
  ok("before: the SQR tab reads 0 from documents", /\b0 from documents/.test(await coverage()));

  // ---------------------------------------------------------------- the author's step, in place from the Documents drawer
  await openFromDrawer();
  const first = p.locator("[data-supplies-card='1']");
  ok("the panel opens in place, its first official line prefilled with the checklist line's own words (IMM 5484)", /information page of your valid passport/.test(await first.locator("[data-supplies-quote]").inputValue()) && /^IMM 5484, page/.test(await first.locator("[data-supplies-source]").inputValue()));
  ok("suggested first: shared fields whose meaning names the passport", await first.locator("[data-supplies-pick='person.passport_number']").count() === 1);
  await shot("10-panel-empty", true); await axe("the panel, empty");
  for (const [i, l] of LINES.entries()) {
    if (i) await p.locator("[data-supplies-add-line]").click();
    const card = p.locator(`[data-supplies-card='${i + 1}']`);
    await card.locator("[data-supplies-source]").fill(l.source);
    await card.locator("[data-supplies-quote]").fill(l.quote);
    for (const f of l.facts) {
      if (!(await card.locator(`[data-supplies-pick='${f}']`).count())) await card.locator("[data-supplies-search]").fill(LABEL.get(f));
      await card.locator(`[data-supplies-pick='${f}']`).first().click();
    }
  }
  const chips = await p.locator("[data-supplies-chip]").count();
  ok(`the author fills ${LINES.length} official lines with the passport's ${SAMPLE.facts.length} facts as chips (words typed once per line)`, chips === SAMPLE.facts.length && LINES.length < SAMPLE.facts.length, { chips, lines: LINES.length });
  await p.locator("[data-supplies-card='1'] [data-supplies-quote]").fill("");
  await p.locator("[data-supplies-reason]").fill(SAMPLE.reason);
  await p.locator("[data-supplies-send]").click();
  ok("fail: a line with facts but no official words is refused in words, nothing sent", /needs its source .* and its quote/.test(await p.locator("[data-supplies-error]").innerText()));
  await p.locator("[data-supplies-card='1'] [data-supplies-quote]").fill(LINES[0].quote);
  await shot("11-panel-filled", true); await axe("the panel, filled");
  await p.locator("[data-supplies-send]").click();
  await p.locator("[data-supplies-open='WAITING']").waitFor({ timeout: 60000 });
  ok("sent: the panel says it waits for a second person, read only, with each fact's words", (await p.locator("[data-supplies-open='WAITING'] li").count()) === SAMPLE.facts.length);
  await shot("12-panel-waiting", true); await axe("the panel, waiting");
  // Withdraw (only its proposer), then send again.
  await p.locator("[data-supplies-why]").fill("Withdrawn to check the step (C4.5 browser check).");
  await p.locator("[data-supplies-withdraw]").click();
  await p.locator("[data-supplies-card='1']").waitFor({ timeout: 60000 });
  ok("withdraw: the author withdraws it and the panel is editable again, with nothing in the library changed", (await p.locator("[data-supplies-chip]").count()) === 0);
  await p.keyboard.press("Escape");
  await openFromDrawer();
  for (const [i, l] of LINES.entries()) {
    if (i) await p.locator("[data-supplies-add-line]").click();
    const card = p.locator(`[data-supplies-card='${i + 1}']`);
    await card.locator("[data-supplies-source]").fill(l.source); await card.locator("[data-supplies-quote]").fill(l.quote);
    for (const f of l.facts) { await card.locator("[data-supplies-search]").fill(LABEL.get(f)); await card.locator(`[data-supplies-pick='${f}']`).first().click(); }
  }
  await p.locator("[data-supplies-reason]").fill(SAMPLE.reason); await p.locator("[data-supplies-send]").click();
  await p.locator("[data-supplies-open='WAITING']").waitFor({ timeout: 60000 });
  await p.keyboard.press("Escape");
  await p.goto(`${BASE}/c/${VV}/questionnaires`);
  ok("waiting: nothing changes before approval (0 from documents)", /\b0 from documents/.test(await coverage()));

  // ---------------------------------------------------------------- the second person
  await as("user-B");
  await p.goto(`${BASE}/review`); await p.getByText(/Passport information page copy · supplies 9 facts/).first().waitFor({ timeout: 60000 });
  await p.getByRole("link", { name: /Approve or return/ }).first().click();
  await p.locator("[data-change-supplies]").waitFor({ timeout: 60000 });
  ok("the change page shows the approver each fact with its source, date read and quote", (await p.locator("[data-supply-cite]").count()) === SAMPLE.facts.length);
  await shot("13-change-page", true); await axe("the change page");
  const [res] = await Promise.all([p.waitForResponse((r) => /\/library\/changes\/[^/]+\/approve$/.test(r.url()), { timeout: 60000 }), p.getByRole("button", { name: "Approve", exact: true }).click()]);
  ok("the approver approves it", res.status() < 300 && (await res.json()).status === "APPROVED", res.status());

  // ---------------------------------------------------------------- the effect
  await as("user-A");
  await p.goto(`${BASE}/c/${VV}/questionnaires`);
  const after = await coverage();
  ok("after: the SQR tab reads N from documents > 0 for the principal", /\b9 from documents/.test(after), after);
  await p.locator("[data-coverage]").scrollIntoViewIfNeeded(); await shot("14-sqr-after", true); await axe("the SQR tab");
  await openFromDrawer();
  ok("the panel says approved, in every draft now and out with the next release", (await p.locator("[data-supplies-open='APPROVED']").count()) === 1);
  await shot("15-panel-approved"); await p.keyboard.press("Escape");
  await p.goto(`${BASE}/c/${VV}/preview?person=principal`); await p.locator("[data-try-missing]").waitFor({ timeout: 60000 });
  const n = async () => Number(/Client questionnaire · (\d+) of/.exec(await p.locator("[data-set='sqr']").innerText())?.[1] ?? NaN);
  const n0 = await n();
  ok("Preview: the passport fills 9 answers and offers Try it missing (Preview only)", /fills 9 answers/.test(await p.locator("[data-from-documents]").innerText()));
  await p.locator("[data-try-missing]").scrollIntoViewIfNeeded(); await shot("16-preview", true); await axe("Preview");
  await p.locator("[data-try-missing] input[type=checkbox]").first().click();
  await p.locator("[data-missing-note]").waitFor({ timeout: 60000 });
  const n1 = await n();
  ok("Preview, tried as missing: its 9 answers are asked instead (Preview only, said in words)", n1 === n0 + 9 && /document reader \(M3\)/.test(await p.locator("[data-missing-note]").innerText()), { before: n0, after: n1 });
  await shot("17-preview-missing", true); await axe("Preview, tried as missing");
  await p.locator("[data-try-missing] input[type=checkbox]").first().click();
  await p.waitForFunction((x) => new RegExp(`Client questionnaire · ${x} of`).test(document.querySelector("[data-set='sqr']")?.textContent ?? ""), n0, { timeout: 60000 });
  ok("Preview: switched off, the answers come from the passport again", (await n()) === n0);
  await p.goto(`${BASE}/library/documents`); await p.locator("[data-type-supplies='passport_information_page_copy']").click(); await panel.waitFor({ timeout: 60000 });
  ok("Library › Document types opens the same panel (the second way in)", (await p.locator("[data-supplies-open='APPROVED']").count()) === 1);
  await shot("18-library-panel");
  // The approver reads, never edits.
  await p.keyboard.press("Escape"); await as("user-B"); await p.goto(`${BASE}/library/documents`); await p.getByText("Passport information page copy").first().waitFor({ timeout: 60000 });
  ok("the approver sees no Change the facts button (author only)", (await p.locator("[data-type-supplies]").count()) === 0);
  // A returned change (review M1): the author is told to propose it again and withdraws it; no dead "Send again".
  const api = async (method, pth, data, actor) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const prop = await api("POST", "/library/document-types/visa_application_photos/supplies", { facts: [{ fact: "person.date_of_birth", source: "IMM 5484 (05-2026), page 1", quote: "On the back of two photos, write your name and date of birth.", readOn: SAMPLE.facts[0].readOn }], reason: "Test: a change to return (C4.5 browser check)." }, "user-A");
  const ret = prop.body?.id ? await api("POST", `/library/changes/${prop.body.id}/return`, { note: "The photos do not supply it: the client writes it on them." }, "user-B") : prop;
  await as("user-A"); await p.goto(`${BASE}/review/change/${prop.body?.id}`);
  await p.getByText("Propose it again").first().waitFor({ timeout: 60000 });
  ok("returned: the author sees Propose it again (never Send again with a name and meaning)", ret.status < 300 && (await p.getByRole("button", { name: /Send again/ }).count()) === 0 && (await p.getByText(/withdraw it, then propose the facts again/).count()) === 1, { propose: prop.status, ret: ret.status });
  await shot("19-returned"); await axe("the returned change");
  await p.getByRole("button", { name: /Withdraw it instead/ }).click();
  await p.locator("[data-withdraw] input").fill("Returned: the photos supply no fact.");
  const [wr] = await Promise.all([p.waitForResponse((r) => /\/withdraw$/.test(r.url()), { timeout: 60000 }), p.getByRole("button", { name: "Withdraw it", exact: true }).click()]);
  await p.getByText(/Withdrawn: nothing in the library changed/).first().waitFor({ timeout: 30000 }).catch(() => undefined);
  ok("returned: the author withdraws it, and the toast says nothing changed (no undefined count)", wr.status() < 300 && (await p.getByText(/undefined/).count()) === 0 && (await p.getByText(/Withdrawn: nothing in the library changed/).count()) >= 1, wr.status());
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
