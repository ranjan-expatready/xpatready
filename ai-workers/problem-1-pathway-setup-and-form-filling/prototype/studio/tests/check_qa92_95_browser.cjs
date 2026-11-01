// QA-92 to QA-95 (qa lane, 29 Oct; Questionnaires tab), runtime lane fix pass: a pass and a fail per finding, in a real
// browser and through the API. QA-92 a case question's details save under the case's own role; QA-93 "Remove from
// questionnaire" asks first and then offers one Undo that puts the section back in its place (P-116); QA-94 no system
// name on screen or in the refusals; QA-95 a too-short reason says how much to write, linked to its box. US$0.
//   zsh studio/tools/isolated.sh runtime_qa9x 4436 start && node studio/tests/check_qa92_95_browser.cjs 4436 xr_studio_runtime_qa9x
const path = require("node:path"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_qa9x";
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const KEYS = /\b(case|person|relationship|organisation)\.[a-z_]+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300); };
  const say = (r) => `${r.body?.detail ?? ""} ${r.body?.message ?? ""} ${(r.body?.errors ?? []).map((e) => e.message).join(" ")}`;

  // ======================================================== setup
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const go = async () => { await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(); };
  const L = (await api(`/combinations/${wp}/fact-sources`)).body;
  // A case question asked in a section (the case's facts show on the principal applicant's tab), whose source can change.
  const caseFact = L.facts.find((f) => f.role === "case" && f.placed && !f.clientOnly);
  step("setup: the sample has a case question asked in a section", !!caseFact, caseFact?.fact);

  // ======================================================== QA-92: a case question's details save under "case"
  const wrongRole = await api(`/combinations/${wp}/fact-sources/principal/${encodeURIComponent(caseFact.fact)}`, { method: "PUT", data: { source: "CLIENT", version: caseFact.version } });
  step("QA-92 fail: saving a case fact as the principal applicant's is refused (404), in words without a system name (QA-94)", wrongRole.status === 404 && /nothing to choose/.test(say(wrongRole)) && !KEYS.test(say(wrongRole)), say(wrongRole));
  await go();
  await p.getByRole("button", { name: "Open all sections" }).click().catch(() => {}); await settle();
  const caseRow = p.locator(`[data-question][data-fact="${caseFact.fact}"]`).first();
  await caseRow.getByRole("button", { name: /^Details of/ }).click();
  const drawer = p.getByRole("dialog"); await drawer.locator("[data-fact-drawer]").waitFor();
  step("QA-92: the drawer names the case, not the person whose tab shows it", /The case/.test(await drawer.innerText()));
  const other = drawer.locator('[data-source-option] input:not([disabled]):not(:checked)').first();
  await other.check();
  await drawer.getByRole("button", { name: "Save" }).click();
  await p.locator("[data-undo-toast]").waitFor({ timeout: 15000 }).catch(() => {}); await settle();
  const after = (await api(`/combinations/${wp}/fact-sources`)).body.facts.find((f) => f.role === "case" && f.fact === caseFact.fact);
  step("QA-92 pass: Save in the drawer saves the case question's new source (no 404, drawer closed, the change is a draft)", await drawer.count() === 0 && after?.change?.status === "DRAFT" && after.version === caseFact.version + 1, JSON.stringify(after?.change));
  await p.locator("[data-undo-toast]").getByRole("button", { name: "Undo" }).click();
  await p.locator("[data-undo-toast]").waitFor({ state: "detached", timeout: 15000 }).catch(() => {}); await settle();
  const undone = (await api(`/combinations/${wp}/fact-sources`)).body.facts.find((f) => f.role === "case" && f.fact === caseFact.fact);
  step("QA-92 pass: its Undo takes the change back", undone?.change === null, JSON.stringify(undone?.change));

  // ======================================================== QA-94: refusals name the question, never the system key
  const pf = L.facts.find((f) => f.role === "principal" && f.fact === "person.family_name");
  const stale = await api(`/combinations/${wp}/fact-sources/principal/person.family_name`, { method: "PUT", data: { source: "CLIENT", version: pf.version + 7 } });
  step("QA-94 pass: a stale save (409) names the question in words", stale.status === 409 && say(stale).includes(`"${pf.label}"`), say(stale));
  step("QA-94 fail-guard: the 409 carries no system name", !KEYS.test(say(stale)), say(stale));
  const bulk = await api(`/combinations/${wp}/fact-sources/bulk`, { method: "POST", data: { items: [{ role: "principal", fact: caseFact.fact, version: 0 }], source: "CLIENT" } });
  const ref = bulk.body?.refused?.[0];
  step("QA-94 pass: a bulk refusal of an answer no form needs any more says so in words", bulk.status < 300 && /no longer needed/.test(ref?.message ?? ""), JSON.stringify(bulk.body).slice(0, 200));
  step("QA-94 fail-guard: the bulk refusal is not labelled by its system name", !KEYS.test(`${ref?.label ?? ""} ${ref?.message ?? ""}`), JSON.stringify(ref));

  // ======================================================== QA-95: a too-short reason, said on its box
  await go();
  await p.getByRole("button", { name: "Open all sections" }).click().catch(() => {}); await settle();
  const fam = p.locator('[data-question][data-fact="person.family_name"]').first();
  await fam.getByRole("button", { name: /^Details of/ }).click();
  const d2 = p.getByRole("dialog"); await d2.locator("[data-fact-drawer]").waitFor();
  step("QA-94 pass: the drawer shows no system name; the library link carries it", !/System name/.test(await d2.innerText()) && !KEYS.test(await d2.locator("[data-question-details]").innerText()) && /person\.family_name/.test(await d2.locator("[data-library-link]").getAttribute("href") ?? ""));
  await d2.locator('[data-source-option="AGENT"] input').check();
  await d2.locator("[data-officer-why-box]").fill("abc");
  await d2.getByRole("button", { name: "Save" }).click(); await settle();
  const err = d2.locator("[data-drawer-error]");
  const errText = await err.innerText().catch(() => "");
  step("QA-95 pass: a 3-character reason is refused with how much to write", /Write at least 5 characters: why the case officer enters it\./.test(errText), errText);
  step("QA-95 fail-guard: it no longer reads as if nothing was written", !/write why/.test(errText), errText);
  const box = d2.locator("[data-officer-why-box]");
  step("QA-95 pass: the box is aria-invalid and linked to its message (aria-describedby)", await box.getAttribute("aria-invalid") === "true" && await box.getAttribute("aria-describedby") === await err.getAttribute("id") && !!(await err.getAttribute("id")));
  await box.fill("");
  await d2.getByRole("button", { name: "Save" }).click(); await settle();
  step("QA-95 fail: with no reason at all the words still ask to write why", /write why/.test(await d2.locator("[data-drawer-error]").innerText().catch(() => "")));
  await box.fill("Sample: the officer copies it from the passport scan.");
  await d2.getByRole("button", { name: "Save" }).click(); await settle();
  step("QA-95 pass: 5 characters or more saves", await d2.count() === 0);

  // ======================================================== QA-93: Remove from questionnaire asks first, then Undo
  // A question the shared library places in a section is asked whether or not the section is chosen, so removing is
  // offered only for a section that asks this person nothing; elsewhere the reason is written where the button was.
  // QA-117: a person no longer sees another person's section as an empty one of theirs, so the empty section is a chosen
  // section that asks nobody. Neither sample has one and the library takes no free add (P-158): the test places one
  // library section with no questions and chooses it.
  const who = "spouse_or_partner", target = "qa93_empty";
  sql(`insert into logical_section (id, workspace_id, section_key, version, status, title, meaning, display_order, client_only, origin, updated_by, updated_at) select gen_random_uuid(), workspace_id, '${target}', 1, 'PUBLISHED', 'Sample: a section with no questions', 'Test only (QA-93).', 99, false, 'HUMAN', 'user-A', now() from combination where id='${wp}'`);
  const chosen = await api(`/combinations/${wp}/sections/${target}`, { method: "POST", data: {} });
  const qv = (await api(`/combinations/${wp}/workspace?tab=questionnaires&role=${who}`)).body?.questionnaire;
  step("setup: a chosen section asks nobody", chosen.status < 300 && !!qv?.sections.some((s) => s.id === target && !s.questions.length), `${chosen.status} ${say(chosen)}`);
  await p.goto(`${BASE}/c/${wp}/questionnaires?role=${who}`); await p.locator("[data-source-strip]").waitFor(); await settle();
  const ids = async () => p.locator("[data-questions] [data-section]:not([data-section='unasked'])").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-section")));
  const before = await ids();
  const busy = p.locator("[data-questions] [data-section]").filter({ has: p.locator("[data-remove-why]") }).first();
  step("QA-93 fail-guard: a section that asks this person something offers no Remove, and says why in words", await busy.count() === 1 && await busy.getByRole("button", { name: /^Remove from questionnaire/ }).count() === 0 && /placed in it in the shared library and stays? asked/.test(await busy.locator("[data-remove-why]").innerText()));
  const sec = p.locator(`[data-questions] [data-section="${target}"]`);
  const title = (await sec.locator("button[aria-expanded] .font-medium").first().innerText()).trim();
  await sec.getByRole("button", { name: `Remove from questionnaire: ${title}` }).click();
  const ask = p.getByRole("dialog");
  const askText = await ask.innerText();
  step("QA-93 pass: Remove asks first, naming the section, for whom, and that it can be undone", askText.includes(`Remove "${title}" from the questionnaire?`) && /It asks .+ nothing in this combination/.test(askText) && /undo/.test(askText), askText.replace(/\n/g, " "));
  await ask.getByRole("button", { name: "Keep the section" }).click(); await settle();
  step("QA-93 fail: Keep the section removes nothing", JSON.stringify(await ids()) === JSON.stringify(before));
  await sec.getByRole("button", { name: `Remove from questionnaire: ${title}` }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Remove section" }).click();
  await p.locator("[data-undo-toast]").waitFor({ timeout: 15000 }).catch(() => {});
  const toast = await p.locator("[data-undo-toast]").innerText().catch(() => "");
  await sec.waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  step("QA-93 pass: the section goes and the Undo toast names it", !(await ids()).includes(target) && toast.includes(`"${title}" removed from the questionnaire`) && /Undo/.test(toast), toast.replace(/\n/g, " "));
  await p.locator("[data-undo-toast]").getByRole("button", { name: "Undo" }).click();
  await sec.waitFor({ timeout: 15000 }).catch(() => {}); await settle();
  step("QA-93 pass: Undo puts the section back in the same place", JSON.stringify(await ids()) === JSON.stringify(before), (await ids()).join(","));

  step("no page error or console error", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
