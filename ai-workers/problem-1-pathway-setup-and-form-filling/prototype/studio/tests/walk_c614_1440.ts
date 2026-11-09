// C6.14 (row B136): a 1440 px walk like a person on the configured checkpoint, by screens: the author sets who provides
// Visitor visa's "Marriage certificate copy" in the Documents tab drawer and sends it; the approver compares and approves
// it on To review; the next release (submit, the expert's sign-off, approval: the release's own capability, C4.x, by its
// routes as C6.15's walk does); then on a new case's Documents panel the case officer sees one shared item with its two
// providers, opens "Change providers", is refused a child, and saves the principal alone with a reason; the line then says
// who chose and why. Screenshots into product/screens/B136/walk/. A walk, not a suite: it writes screenshots. US$0.
//   zsh studio/tools/isolated.sh c614walk 4432 start  (then Demo › Load the configured checkpoint as the author)
//   tsx studio/tests/walk_c614_1440.ts 4432 xr_studio_c614walk
/* eslint-disable @typescript-eslint/no-explicit-any -- a walk reads responses loosely */
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { answer, call as API0, openCase, sql as sql0, yearsAgo } from "../acceptance/lib/m3.ts";
const { chromium } = createRequire(import.meta.url)("playwright");
const PORT = Number(process.argv[2] ?? 4432);
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "product", "screens", "B136", "walk");
const sql = (q: string) => sql0(q) ?? "";
const API = (path: string, method = "GET", body?: unknown, actor = "user-A") => API0(method, path, body, actor);
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 300)}` : ""}`); };
(async () => {
  mkdirSync(OUT, { recursive: true });
  const vv = sql("select id from combination where combination_key = 'vv.single'");
  const MARRIAGE = sql(`select document_type_key from document_requirement where combination_id = '${vv}' and applies_to_roles = 'couple_once' and status <> 'RETIRED' order by version desc limit 1`);
  // The project pins its own Playwright; a cloud copy has the pre-installed browser at this path (PW_CHROMIUM overrides).
  const exe = process.env.PW_CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const as = async (actor: string) => { await page.evaluate((a: string) => { try { localStorage.setItem("xr-actor", a); } catch { /* storage blocked */ } }, actor); };
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  // 1. The author: Visitor visa › Documents › the spouse's chip › Marriage certificate copy › Who provides it when shared.
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" }); await as("user-A");
  await page.goto(`http://localhost:${PORT}/c/${vv}/documents?role=spouse_or_partner`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Details of: Marriage certificate copy/ }).first().click();
  const panel = page.locator("[data-drawer-providers]");
  await panel.waitFor({ timeout: 30_000 }); await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, "01-author-drawer-not-set.png") });
  ok("C6.14 walk 1: the drawer shows \"Who provides it when shared\": not set, and that this line is asked once", /Not set/.test(await panel.innerText()) && (await panel.locator("[data-providers-applies]").getAttribute("data-providers-applies")) === "yes", await panel.innerText());
  await panel.getByRole("button", { name: /Set who provides it/ }).click();
  for (const role of ["Principal applicant", "Spouse or partner"]) { await panel.getByLabel("Add a role").selectOption({ label: role }); await panel.getByRole("button", { name: "Add", exact: true }).click(); }
  await panel.getByLabel("Why who provides it changes").fill("SA-1B-151 rule 5's example: the principal applicant or the spouse gives the marriage certificate (Sample).");
  await page.screenshot({ path: join(OUT, "02-author-editor-filled.png") });
  await panel.getByRole("button", { name: "Send for a second person" }).click();
  await panel.locator("[data-providers-said]").waitFor({ timeout: 30_000 });
  await panel.locator("[data-providers-open]").waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, "03-author-sent-waits.png") });
  ok("C6.14 walk 2: sent; the drawer says the change waits for a second person on To review", /waits for a second person/.test(await panel.innerText()), await panel.innerText());
  ok("C6.14 walk: no sideways scroll at 1440 px (drawer)", !(await sideways()));

  // 2. The approver: To review › the change › compare › Approve.
  const id = sql(`select id from library_change where kind = 'document_providers' and key = '${MARRIAGE}' and status = 'WAITING' order by proposed_at desc limit 1`);
  await as("user-B");
  await page.goto(`http://localhost:${PORT}/review/change/${id}`, { waitUntil: "networkidle" });
  const cmp = page.locator("[data-change-providers]");
  await cmp.waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, "04-second-person-compares.png") });
  ok("C6.14 walk 3: the second person reads before (not set) → after (Principal applicant, then Spouse or partner), under a heading in words (no raw action key)", !/SET_PROVIDERS/.test(await page.locator("h1").first().innerText()) && /Not set/.test(await cmp.locator("[data-providers-before]").innerText()) && (await cmp.locator("[data-providers-after]").innerText()) === "Principal applicant, then Spouse or partner");
  await page.getByRole("button", { name: /^Approve/ }).first().click();
  await page.waitForURL(/\/review$/, { timeout: 30_000 });
  await page.screenshot({ path: join(OUT, "05-second-person-approved.png") });
  ok("C6.14 walk 4: approved: the type's draft carries the roles", sql(`select array_to_string(default_provider_roles, ',') from document_type where document_type_key = '${MARRIAGE}' order by version desc limit 1`) === "principal,spouse_or_partner");

  // 3. The release (C4.x's own steps, by its routes) and a new case with a married couple and a child of 10.
  const s = await API(`/combinations/${vv}/submit`, "POST", { note: "C6.14 walk: provider roles" });
  const sub = (await API(`/combinations/${vv}/review`, "GET", undefined, "user-C")).body?.submission;
  await API(`/combinations/${vv}/signoff`, "POST", { items: (sub?.changeSummary ?? sub?.change_summary ?? []).filter((x: any) => x.needs_sme !== false).map((x: any) => `${x.kind}|${x.key}`), action: "signed" }, "user-C");
  const a = await API(`/combinations/${vv}/approve`, "POST", undefined, "user-B");
  ok("C6.14 walk 5: the next release goes out (submit, sign-off, approval by a different person)", s.status < 300 && a.status < 300, [s.status, a.status, a.body?.detail]);
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }, { role: "child", name: "Sample Child A1", dob: yearsAgo(10) }]);
  const caseId = c.id, officer = c.officer, P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], K = c.subjects["Sample Child A1"];
  for (const who of [P, S]) await answer(caseId, who, "person.marital_status", "married");

  // 4. The case officer: the case's Documents panel.
  await as(officer);
  await page.goto(`http://localhost:${PORT}/cases/${caseId}`, { waitUntil: "networkidle" });
  const docs = page.locator("[data-documents-panel]");
  await docs.waitFor({ timeout: 30_000 });
  const shared = docs.locator("[data-shared]");
  await shared.first().waitFor({ timeout: 30_000 }); await shared.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, "06-officer-one-shared-item.png") });
  const sharedText = await shared.first().innerText();
  ok("C6.14 walk 6: one shared item on the case, provided by Sample Client A and Sample Spouse A, from the document type's default", (await shared.count()) === 1 && /Sample Client A and Sample Spouse A/.test(sharedText) && /Default from the document type/.test(sharedText), sharedText);
  const row = docs.locator("li[data-line]").filter({ has: page.locator("[data-shared]") }).first();
  await row.getByRole("button", { name: /Actions for Marriage certificate copy/ }).click();
  await page.getByRole("menuitem", { name: "Change providers…" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.waitFor({ timeout: 10_000 });
  await page.screenshot({ path: join(OUT, "07-officer-change-providers-dialog.png") });
  ok("C6.14 walk 7: the dialog lists the case's people; the child of 10 cannot be ticked (under 18)", await dlg.locator(`[data-provider-option="${K}"]`).isDisabled() && /is 10 on .*nobody under 18/.test(await dlg.locator(`[data-provider-blocked="${K}"]`).innerText())
    && (await dlg.locator(`[data-provider-option="${P}"]`).isEnabled()) && (await dlg.locator("[data-provider-blocked]").count()) === 1, await dlg.innerText());
  await dlg.locator(`[data-provider-option="${S}"]`).uncheck();
  await dlg.locator("[data-providers-save]").click();
  await dlg.getByText(/reason/i).first().waitFor({ timeout: 10_000 });
  await page.screenshot({ path: join(OUT, "08-officer-no-reason-refused.png") });
  ok("C6.14 walk 8: saving with no reason is refused in words, nothing changed", /Give a reason/.test(await dlg.innerText()), await dlg.innerText());
  await dlg.locator("[data-providers-reason]").fill("Only the principal holds the original certificate (Sample).");
  await dlg.locator("[data-providers-save]").click();
  await dlg.waitFor({ state: "detached", timeout: 15_000 });
  await shared.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, "09-officer-chosen-with-reason.png") });
  const after = await shared.first().innerText();
  ok("C6.14 walk 9: the line now says Sample Client A alone, chosen by the case officer, with the reason", /Provided by Sample Client A\n/.test(`${after}\n`) || (/Provided by Sample Client A/.test(after) && !/and Sample Spouse A/.test(after) && /Chosen by the case officer/.test(after) && /holds the original/.test(after)), after);
  ok("C6.14 walk: no sideways scroll at 1440 px (case)", !(await sideways()));

  // 5. Devin on #1392: a returned change is withdrawn on its page by its proposer, then the author can propose again.
  const prop = await API(`/library/document-types/${MARRIAGE}/providers`, "POST", { roles: ["principal"], reason: "C6.14 walk: the principal alone (Sample)." }, "user-A");
  const back = prop.body?.id ? await API(`/library/changes/${prop.body.id}/return`, "POST", { note: "Keep the spouse as a provider too." }, "user-B") : prop;
  await as("user-A");
  await page.goto(`http://localhost:${PORT}/review/change/${prop.body?.id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Withdraw it instead…" }).click();
  await page.getByLabel("Why withdraw it").fill("The reviewer is right: both keep providing it.");
  await page.screenshot({ path: join(OUT, "10-author-withdraws-returned-change.png") });
  await page.getByRole("button", { name: "Withdraw it", exact: true }).click();
  await page.waitForURL(/\/review$/, { timeout: 30_000 });
  ok("C6.14 walk 10 (Devin on #1392): the proposer withdraws a returned change on its page; it is withdrawn and nothing in the library changed", back.status < 300 && sql(`select status from library_change where id = '${prop.body?.id}'`) === "WITHDRAWN" && sql(`select array_to_string(default_provider_roles, ',') from document_type where document_type_key = '${MARRIAGE}' order by version desc limit 1`) === "principal,spouse_or_partner", [back.status, sql(`select status from library_change where id = '${prop.body?.id}'`)]);
  const again = await API(`/library/document-types/${MARRIAGE}/providers`, "POST", { roles: ["spouse_or_partner", "principal"], reason: "C6.14 walk: proposed again after the withdrawal (Sample)." }, "user-A");
  ok("C6.14 walk 11: after withdrawing, the author can propose again", again.status < 300, again.body);
  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
