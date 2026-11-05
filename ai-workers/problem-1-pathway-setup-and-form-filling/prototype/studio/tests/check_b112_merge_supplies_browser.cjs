// B112 (QA-256, C4.5) walked at 1440 px as people do it: the second person approves a merge on its card on To review, and the
// document type's panel still says the fact is about the holder's spouse; a merge that would make one fact about two people
// is refused on the card in words. The merges are proposed through the route the field page calls. No AI, US$0.
//   zsh studio/tools/isolated.sh forms_b112b 4411 start && node studio/tests/check_b112_merge_supplies_browser.cjs 4411 xr_studio_forms_b112b
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2]), DB = process.argv[3], SHOTS = process.argv[4];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database> [screenshots folder]"); process.exit(2); }
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(detail).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const api = async (pth, data, actor = "user-A", method = "POST") => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, data, timeout: 400000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (who) => { await p.goto(BASE); await p.evaluate((w) => { try { localStorage.setItem("xr-actor", w); } catch { /* ignore */ } }, who); };
  const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
  // Setup on this test copy only: a released document type with these facts. A release takes minutes, and while a change is
  // open the panel shows that change's own words instead of the type's, which would prove nothing here.
  const supplies = async (key, facts) => { const about = Object.fromEntries(facts.filter(([, a]) => a !== "holder")); sql(`update document_type set supplies_facts = array[${facts.map(([f]) => `'${f}'`).join(",")}], supplies_about = '${JSON.stringify(about)}'::jsonb where document_type_key = '${key}' and status = 'PUBLISHED'`); return 200; };
  const propose = async (keep, merge) => (await api("/library/merges", { keep, merge, reason: "Test: these two mean the same for this walk only (B112)." })).body.id;
  await as("user-A");
  step("setup: the fixture loads", (await api("/demo/load")).status === 201);
  const types = sql("select distinct document_type_key from document_type where status = 'PUBLISHED' order by 1 limit 2").split("\n");
  const [keepA, goneA, keepB, goneB] = sql("select distinct f.canonical_field_key from canonical_field f where f.status = 'PUBLISHED' and f.merged_into_key is null and f.canonical_field_key like 'person.%' and f.value_type = 'text' and f.answer_list_key is null and not exists (select 1 from document_type t where f.canonical_field_key = any(t.supplies_facts)) order by 1 limit 4").split("\n");
  step("setup: a document supplies a fact about the spouse", (await supplies(types[0], [[goneA, "holder.spouse"]])) < 300);
  const m1 = await propose(keepA, goneA);

  await as("user-B");
  await p.goto(`${BASE}/review/merge/${m1}`);
  const yes = p.getByRole("button", { name: "Approve the merge" }); await yes.waitFor({ timeout: 30000 });
  await p.waitForFunction(() => { const x = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Approve the merge")); return x && x.getAttribute("aria-disabled") !== "true" && !x.disabled; }, null, { timeout: 30000 });
  await shot("b112-1-merge-card-1440");
  await yes.click();
  await p.waitForURL((u) => !u.pathname.includes("/review/merge/"), { timeout: 30000 }).catch(() => {});
  step("B112: the second person approves the merge on its card", sql(`select status from field_merge where id = '${m1}'`) === "APPLIED");

  await as("user-A");
  await p.goto(`${BASE}/library/documents`);
  const open = p.locator(`[data-type-supplies="${types[0]}"]`); await open.waitFor({ timeout: 60000 });
  await open.click();
  const panel = p.locator("[data-supplies-panel]"); await panel.waitFor({ timeout: 30000 });
  await panel.locator("select").first().waitFor({ timeout: 30000 });
  const whom = await panel.locator('select[aria-label^="Whom"]').evaluateAll((s) => s.map((x) => x.value));
  step("B112 pass (QA-256): the document's panel still says the fact is about the holder's spouse after the merge", whom.length === 1 && whom[0] === "holder.spouse", JSON.stringify(whom));
  await shot("b112-2-panel-after-merge-1440");
  await p.keyboard.press("Escape");

  step("setup: another document supplies both fields, about different people", (await supplies(types[1], [[keepB, "holder"], [goneB, "holder.spouse"]])) < 300);
  const m2 = await propose(keepB, goneB);
  await as("user-B");
  await p.goto(`${BASE}/review/merge/${m2}`);
  const yes2 = p.getByRole("button", { name: "Approve the merge" }); await yes2.waitFor({ timeout: 30000 });
  await p.waitForFunction(() => { const x = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Approve the merge")); return x && x.getAttribute("aria-disabled") !== "true" && !x.disabled; }, null, { timeout: 30000 });
  await yes2.click();
  const refused = p.getByText(/about different people, so merging them would lose whom one is about/).first();
  step("B112 fail: the card says in words why the merge is refused, and nothing is merged", await refused.waitFor({ timeout: 30000 }).then(() => true).catch(() => false) && sql(`select status from field_merge where id = '${m2}'`) === "PROPOSED");
  await shot("b112-3-refused-1440");
  step("B112: no page error on the walk", errors.length === 0, errors.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
