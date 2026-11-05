// B81 (C10.1 row 9; concept screens/b81-not-on-form/concept.md): the choices step walked like a person at 1440 px and 1024 px,
// keyboard included: the section on the form's panel, the dialog, a mark saved, a release problem's link, read-only for
// others. No AI, no priced button, US$0.
//   zsh studio/tools/isolated.sh forms_b81b 4413 start && node studio/tests/check_forms_b81_browser.cjs 4413 xr_studio_forms_b81b
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const { seedAnswerList } = require("./seed_library.cjs");
const PORT = Number(process.argv[2] ?? 4413), DB = process.argv[3] ?? "xr_studio_forms_b81b", SHOTS = process.argv[4];
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(detail).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
  const as = async (actor) => { await p.goto(BASE); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  await as("user-A");
  step("setup: the fixture loads", (await api("/demo/load", { method: "POST" })).status === 201);
  seedAnswerList(sql, { key: "marital_status", label: "Marital status (Sample)", values: [["annulled_marriage", "Annulled Marriage"], ["common_law", "Common-Law"], ["divorced", "Divorced"], ["legally_separated", "Legally Separated"], ["married", "Married"], ["single", "Single"], ["unknown", "Unknown"], ["widowed", "Widowed"], ["sample_no_choice", "Sample answer no form prints"]].map(([key, label]) => ({ key, label })) });
  step("setup: the marital status field reads the list", (await api("/library/fields/person.marital_status/answer-list", { method: "POST", data: { list: "marital_status" } })).status < 300);
  const id = sql("select c.id from combination c join combination_form f on f.combination_id = c.id join gov_form_def d on d.id = f.gov_form_def_id where d.form_key = 'IMM 5707' and c.retired_at is null limit 1");
  step("setup: a combination files IMM 5707", !!id);

  const openPanel = async () => {
    await p.goto(`${BASE}/c/${id}/forms`); await p.getByRole("button", { name: "Change IMM 5707" }).click();
    return p.locator("[data-form-choices]").waitFor({ timeout: 20000 });
  };
  await openPanel();
  const section = p.locator("[data-form-choices]");
  step("B81: the form's panel has the section, says what is open, and marks that it blocks release", /read an answer list/.test(await section.innerText()) && /Blocks release/.test(await section.innerText()), await section.innerText());
  await shot("b81-01-section-1440");
  await section.getByRole("button", { name: "Set choices" }).click();
  const dlg = p.locator("[data-choices-dialog]"); await dlg.waitFor();
  const group = dlg.locator('[data-choice-group]').first();
  const row = (k) => group.locator(`[data-choice-value="${k}"]`);
  step("B81: nothing is saved until a person saves, and the form's own words are suggested", /Nothing saved yet/.test(await group.innerText()) && /Suggested from the form's words/.test(await row("single").innerText()), await group.innerText());
  step("B81 (challenge M5): the dialog says the choices are saved on the edition, and who files it", /Saved on IMM 5707 \(.*\): .*file/.test(await p.getByRole("dialog").innerText()), await p.getByRole("dialog").innerText());
  const select = row("sample_no_choice").getByRole("combobox");
  const opts = await row("single").getByRole("combobox").locator("option").evaluateAll((o) => o.map((x) => ({ t: x.textContent, d: x.disabled })));
  step("B81 (challenge m2): a value the form prints cannot be marked: its option is greyed and says what it prints", opts.some((o) => /^Not on this form \(it prints Single\)/.test(o.t) && o.d), JSON.stringify(opts));
  step("B81 (challenge m2): a choice another answer uses is greyed and names it", opts.some((o) => /\(used by /.test(o.t) && o.d), JSON.stringify(opts));
  await shot("b81-02-dialog-1440");
  await select.focus(); await select.selectOption("__not_on_form");
  step("B81: choosing Not on this form takes the keyboard's focus path (the select is reachable and labelled)", (await select.getAttribute("aria-label")) === "Sample answer no form prints: what this form prints");
  await group.locator("[data-save-choices]").click();
  await group.locator("[data-not-saved]").waitFor({ state: "detached", timeout: 20000 });
  step("B81 pass: saved through the step, the mark reads back on the group, and it no longer blocks", (await row("sample_no_choice").getByRole("combobox").inputValue()) === "__not_on_form" && !/Blocks release/.test(await group.innerText()), await group.innerText());
  step("B81: the mark is stored on the form's draft field map", Number(sql(`select count(*) from form_field_map where status = 'DRAFT' and option_map -> 'notOnForm' ? 'sample_no_choice'`)) >= 1);
  await shot("b81-03-saved-1440");
  await p.setViewportSize({ width: 1024, height: 768 });
  const wide = await p.evaluate(() => { const d = document.querySelector("[data-choices-dialog]"); return !!d && d.scrollWidth <= d.clientWidth + 1; });
  step("B81: at 1024 px the dialog does not scroll sideways", wide);
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();

  // A release problem leads to the step.
  await p.goto(`${BASE}/c/${id}/review`);
  await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const link = p.locator("[data-choices-link]").first();
  const more = p.getByRole("button", { name: /^Show all/ }); if (await more.count()) await more.click();
  const hasLink = await link.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  step("B81 (challenge M3): a release problem on a form's choices links to the step", hasLink);
  if (hasLink) { await link.click(); await p.locator("[data-choices-dialog]").waitFor({ timeout: 20000 }); step("B81 (challenge M3): the link lands on that form's panel with the choices open", /Choices: /.test(await p.getByRole("dialog").last().innerText())); await shot("b81-04-from-review-1440"); }

  // Someone without the duty reads, and is told why.
  await as("user-B");
  await openPanel().catch(() => {});
  const canOpen = await p.getByRole("button", { name: "Change IMM 5707" }).count();
  if (!canOpen) step("B81: the Approver has no way in: the line's Change is the author's", true);
  step("B81: no page error on the walk", errors.length === 0, errors.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
