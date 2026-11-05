// B81 (C10.1 row 9; concept screens/b81-not-on-form/concept.md): the choices step walked like a person at 1440 px and 1024 px:
// the section on the form's panel, the dialog, a mark saved, a release problem's link, read-only for
// others. No AI, no priced button, US$0.
//   zsh studio/tools/isolated.sh forms_b81b 4413 start && node studio/tests/check_forms_b81_browser.cjs 4413 xr_studio_forms_b81b
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const { seedAnswerList } = require("./seed_library.cjs");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
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
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data, timeout: 400000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const axe = async (name, within) => { const a = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).include(within).analyze(); step(`B81 (review R2-M2): axe (WCAG 2.2 AA) on ${name}: no violations`, a.violations.length === 0, a.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`).join(", ")); };
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
  await axe("the section", "[data-form-choices]");
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
  await axe("the dialog", "[data-choices-dialog]");
  await shot("b81-02-dialog-1440");
  await select.focus(); await select.selectOption("__not_on_form");
  step("B81: the answer's choice is labelled with the answer", (await select.getAttribute("aria-label")) === "Sample answer no form prints: what this form prints");
  // Review M4: an edit is asked about however the dialog is closed; dismissing keeps it open with the edit in place.
  let asked = 0; const ask = (d) => { asked++; void d.dismiss(); }; p.on("dialog", ask);
  await p.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();
  step("B81 (review M4): closing with an unsaved edit asks first, and No keeps the edit", asked === 1 && (await select.inputValue()) === "__not_on_form", String(asked));
  // Review m8: Save from the keyboard.
  await group.locator("[data-save-choices]").focus(); await p.keyboard.press("Enter");
  await group.locator("[data-not-saved]").waitFor({ state: "detached", timeout: 20000 });
  step("B81 pass: saved through the step, the mark reads back on the group, and it no longer blocks", (await row("sample_no_choice").getByRole("combobox").inputValue()) === "__not_on_form" && !/Blocks release/.test(await group.innerText()), await group.innerText());
  step("B81: the mark is stored on the form's draft field map", Number(sql(`select count(*) from form_field_map where status = 'DRAFT' and option_map -> 'notOnForm' ? 'sample_no_choice'`)) >= 1);
  await axe("the dialog after a save", "[data-choices-dialog]");
  await shot("b81-03-saved-1440");
  await p.setViewportSize({ width: 1024, height: 768 });
  const wide = await p.evaluate(() => { const d = document.querySelector("[data-choices-dialog]"); return !!d && d.scrollWidth <= d.clientWidth + 1; });
  step("B81: at 1024 px the dialog does not scroll sideways", wide);
  await p.setViewportSize({ width: 1440, height: 900 });
  // Review R3-M1, R3-M3, break M3: someone else's save under an unsaved pick; a problem that can always be saved away.
  const second = dlg.locator("[data-choice-group]").nth(1);
  if (await second.count()) {
    const view = async () => (await api(`/editions/${sql("select id from form_edition where edition_label like 'IMM 5707 (%' limit 1")}/option-maps`)).body;
    const edId = (await view()).edition_id, g0 = (await view()).groups.find((g) => g.values.some((v) => v.key === "sample_no_choice" && v.not_on_form));
    await row("sample_no_choice").getByRole("combobox").selectOption("");
    const other = await api(`/editions/${edId}/option-maps/group`, { method: "PATCH", data: { dataPaths: g0.form_fields.map((f) => f.data_path), map: Object.fromEntries(g0.values.filter((v) => v.code).map((v) => [v.key, v.code])), notOnForm: ["sample_no_choice"], baseRevision: g0.revision } });
    step("setup: someone else saves the same choices", other.status < 300, JSON.stringify(other.body).slice(0, 200));
    await second.locator("[data-save-choices]").click(); await second.locator("[data-not-saved]").waitFor({ state: "detached", timeout: 20000 });
    step("B81 (break m1): someone else's save leaves this person's unsaved pick in place", (await row("sample_no_choice").getByRole("combobox").inputValue()) === "");
    await group.locator("[data-save-choices]").click();
    const notice = group.getByText(/changed these choices since you opened them/);
    step("B81 fail (review R3-M1): the save after that is told, never overwrites", await notice.waitFor({ timeout: 20000 }).then(() => true).catch(() => false));
    await group.getByRole("button", { name: "Look again" }).click();
    await notice.waitFor({ state: "detached", timeout: 20000 });
    step("B81 (break m2): Look again clears the notice and shows what is saved", (await row("sample_no_choice").getByRole("combobox").inputValue()) === "__not_on_form");
    // A list value gone under a mark: named on the group, and Save clears it with every row looking right.
    const paths0 = g0.form_fields.map((f) => `'${f.data_path}'`).join(",");
    sql(`update form_field_map set option_map = jsonb_set(option_map, '{notOnForm}', option_map->'notOnForm' || '["gone_value"]'::jsonb) where form_edition_id = '${edId}' and status = 'DRAFT' and data_path in (${paths0})`);
    await p.reload(); await p.getByRole("button", { name: "Change IMM 5707" }).click(); await p.locator("[data-set-choices]").click();
    const g2 = p.locator("[data-choices-dialog] [data-choice-group]").first(), probs = g2.locator("[data-choice-problems]");
    const named = await probs.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    step("B81 (review R3-M3, break M3): a stale mark is named on the group and Save stays open", named && /gone_value/.test(await probs.innerText()) && !(await g2.locator("[data-save-choices]").isDisabled()), named ? await g2.innerText() : "no problems list");
    await g2.locator("[data-save-choices]").click();
    step("B81 (review R3-M3, break M3): saving clears it", await probs.waitFor({ state: "detached", timeout: 20000 }).then(() => true).catch(() => false));
    await axe("the dialog after the problem", "[data-choices-dialog]");
  } else step("the fixture has a second group for the stale-save steps", false);
  const group3 = p.locator("[data-choices-dialog] [data-choice-group]").first();
  await group3.locator("[data-choice-fields] summary").click();
  step("B81 (review M5): the group lists each form field, told apart in the form's words", (await group3.locator("[data-choice-fields] li").count()) === Number(/Save (\d+) form field/.exec(await group3.locator("[data-save-choices]").innerText())?.[1]), await group3.locator("[data-choice-fields]").innerText());
  await axe("the dialog with the form fields listed", "[data-choices-dialog]");
  await p.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();
  step("B81 (review M4): after a save nothing is asked on closing", asked === 1 && (await p.locator("[data-choices-dialog]").count()) === 0, String(asked));
  await p.locator("[data-set-choices]").and(p.locator(":focus")).waitFor({ timeout: 5000 }).then(() => step("B81 (break m9): focus goes back to Set choices", true)).catch(() => step("B81 (break m9): focus goes back to Set choices", false));
  p.off("dialog", ask);

  // A release problem leads to the step.
  await p.goto(`${BASE}/c/${id}/review`);
  await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const link = p.locator("[data-choices-link]").first();
  const more = p.getByRole("button", { name: /^Show all/ }); if (await more.count()) await more.click();
  const hasLink = await link.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  step("B81 (challenge M3): a release problem on a form's choices links to the step", hasLink);
  if (hasLink) { await link.click(); await p.locator("[data-choices-dialog]").waitFor({ timeout: 20000 }); step("B81 (challenge M3): the link lands on that form's panel with the choices open", /Choices: /.test(await p.getByRole("dialog").last().innerText())); await shot("b81-04-from-review-1440"); }

  // Review R2-M1: a line filed Online keeps the step: the release check still reads its PDF field map.
  const online = sql("select id from combination where combination_key = 'wp.family' and retired_at is null limit 1");
  const toOnline = await api(`/combinations/${online}/forms/IMM%201295/channel`, { method: "PATCH", data: { channel: "ONLINE" } });
  step("setup: IMM 1295 is filed Online on a combination", toOnline.status < 300, JSON.stringify(toOnline.body));
  await p.goto(`${BASE}/c/${online}/forms`); await p.getByRole("button", { name: "Change IMM 1295" }).click();
  step("B81 (review R2-M1): a line filed Online still has its choices step", await p.locator("[data-form-choices]").waitFor({ timeout: 20000 }).then(() => true).catch(() => false));

  // Review M3: the panel is the author's, whatever the way in.
  await as("user-B");
  await p.goto(`${BASE}/c/${id}/review`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const moreB = p.getByRole("button", { name: /^Show all/ }); if (await moreB.count()) await moreB.click();
  await p.locator("[data-problem]").first().waitFor({ timeout: 20000 });
  step("B81 fail (review M3): the Approver has no link to the author's step", (await p.locator("[data-choices-link]").count()) === 0);
  await p.goto(`${BASE}/c/${id}/forms?choices=IMM%205707`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.waitForTimeout(1500);
  step("B81 fail (review M3): the Approver's address to it opens nothing", (await p.locator("[data-form-choices]").count()) === 0 && !/choices=/.test(p.url()), p.url());
  step("B81: no page error on the walk", errors.length === 0, errors.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
