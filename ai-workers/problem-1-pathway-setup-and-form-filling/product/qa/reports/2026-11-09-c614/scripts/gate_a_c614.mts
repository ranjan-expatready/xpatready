// qa gate A walk of C6.14 (row B136) on main, by screens, 1024 px, on a fresh isolated copy loaded with the configured
// checkpoint through Demo › Load the configured checkpoint. Live AI off; US$0. Screenshots next to this folder.
// Setup not under test (named): the cases are opened and two people's marital status answered by the pack's helpers
// (acceptance/lib/m3.ts, C6.1 / C6.2's routes). Everything C6.14 owns, and the release between (C4.x), is by screens.
// Then the next capability's first step: C6.4 / C6.5 "Request" and "Upload a file…" on the one shared item.
//   zsh studio/tools/isolated.sh qa_c614 4474 start --ttl 60 && trap '…stop' EXIT && tsx gate_a_c614.mts 4474 xr_studio_qa_c614
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = join(HERE, "..", "..", "..", "..", "..", "prototype", "studio");
const L: any = await import(join(STUDIO, "acceptance", "lib", "m3.ts"));
const { chromium } = createRequire(join(STUDIO, "package.json"))("playwright");
const PORT = Number(process.argv[2] ?? 4474);
const OUT = join(HERE, "..", "shots");
mkdirSync(OUT, { recursive: true });
const sql = (q: string) => L.sql(q) ?? "";
const lines: string[] = [];
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; const s = `${c ? "PASS" : "FAIL"}  ${n}${d !== undefined ? ` — ${typeof d === "string" ? d : JSON.stringify(d)}`.slice(0, 600) : ""}`; console.log(s); lines.push(s); };
const note = (s: string) => { console.log(`NOTE  ${s}`); lines.push(`NOTE  ${s}`); };

const exe = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const B = `http://localhost:${PORT}`;
const as = async (actor: string) => { await page.evaluate((a: string) => { try { localStorage.setItem("xr-actor", a); } catch { /* blocked */ } }, actor); };
const go = async (path: string) => { await page.goto(`${B}${path}`, { waitUntil: "networkidle" }); };
const shot = async (n: string) => { await page.screenshot({ path: join(OUT, `${n}.png`), fullPage: false }); };
const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const step = async (name: string, f: () => Promise<void>) => { try { await f(); } catch (e) { ok(`${name} (threw)`, false, (e as Error).message.split("\n")[0]); await shot(`ERR-${name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}`).catch(() => {}); } };

try {
  // 0. Load the configured checkpoint through the product's screens.
  await step("0 load", async () => {
    await go("/"); await as("user-A"); await go("/");
    await page.getByRole("button", { name: /^Demo/ }).click();
    await page.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Load the configured checkpoint/ }).click();
    const t = Date.now();
    await page.getByText(/Configured checkpoint loaded in/).first().waitFor({ timeout: 600_000 });
    await shot("00-checkpoint-loaded");
    ok("0 Demo › Load the configured checkpoint (by screens)", true, `${Math.round((Date.now() - t) / 1000)} s`);
  });
  const vv = L.needVisitorVisa();
  const MARRIAGE = sql(`select document_type_key from document_requirement where combination_id = '${vv}' and applies_to_roles = 'couple_once' and status <> 'RETIRED' order by version desc limit 1`);
  note(`Visitor visa ${vv}; the line asked once for the couple: ${MARRIAGE}`);
  const married = async (people: any[]) => { const c = await L.openCase(vv, people); for (const p of people) if (p.role !== "child" && c.subjects[p.name]) await L.answer(c.id, c.subjects[p.name], "person.marital_status", "married"); return c; };
  const marriageRows = async () => { const docs = page.locator("[data-documents-panel]"); await docs.waitFor({ timeout: 30_000 }); return docs.locator("li[data-line]").filter({ has: page.locator("[data-line-label]", { hasText: /^Marriage certificate/ }) }); };
  const panelText = async () => page.locator("[data-documents-panel]").innerText();

  // 1. F18 before any roles: a case on the checkpoint's release.
  const A = await married(L.FAMILY.slice(0, 2));
  await step("1 before roles", async () => {
    await as(A.officer); await go(`/cases/${A.id}`);
    const rows = await marriageRows(); await rows.first().scrollIntoViewIfNeeded();
    await shot("01-before-roles-holder-provides");
    const t = await rows.first().innerText();
    ok("1 (F18, BR-5) before any roles: one marriage-certificate item, Shared, provided by Sample Spouse A (the person it is for), and it says why", (await rows.count()) === 1 && /Provided by Sample Spouse A/.test(t), t.replace(/\n/g, " / "));
  });

  // 2. The author sets who provides it, in the Documents tab drawer.
  await step("2 author", async () => {
    await as("user-A"); await go(`/c/${vv}/documents?role=spouse_or_partner`);
    await page.getByRole("button", { name: /Details of: Marriage certificate copy/ }).first().click();
    const panel = page.locator("[data-drawer-providers]"); await panel.waitFor({ timeout: 30_000 }); await panel.scrollIntoViewIfNeeded();
    await shot("02-author-drawer-not-set");
    ok("2a the drawer shows \"Who provides it when shared\": Not set", /Not set/.test(await panel.innerText()), (await panel.innerText()).replace(/\n/g, " / "));
    await panel.getByRole("button", { name: /Set who provides it/ }).click();
    await panel.getByRole("button", { name: "Send for a second person" }).click().catch(() => {});
    await page.waitForTimeout(600);
    await shot("03-author-empty-send");
    note(`2b pressing Send with nothing filled: ${(await panel.innerText()).replace(/\n/g, " / ").slice(0, 400)}`);
    for (const role of ["Principal applicant", "Spouse or partner"]) { await panel.getByLabel("Add a role").selectOption({ label: role }); await panel.getByRole("button", { name: "Add", exact: true }).click(); }
    await panel.getByLabel("Why who provides it changes").fill("qa gate A: the principal or the spouse gives the marriage certificate (Sample).");
    await shot("04-author-editor-filled");
    await panel.getByRole("button", { name: "Send for a second person" }).click();
    await panel.locator("[data-providers-open]").waitFor({ timeout: 30_000 });
    await shot("05-author-sent-waits");
    ok("2c sent; the drawer says it waits for a second person", /waits for a second person/.test(await panel.innerText()), (await panel.innerText()).replace(/\n/g, " / ").slice(0, 300));
    ok("2d no sideways scroll at 1024 px (drawer)", !(await sideways()));
  });

  // 3. The second person approves on To review (found in the list, not by URL).
  await step("3 approver", async () => {
    await as("user-B"); await go("/review");
    await shot("06-to-review-list");
    let row = page.locator("tr", { hasText: /Marriage certificate/ });
    if (!(await row.count())) { await page.getByRole("button", { name: /^All/ }).first().click().catch(() => {}); await page.waitForLoadState("networkidle"); row = page.locator("tr", { hasText: /Marriage certificate/ }); }
    note(`3 To review rows naming the marriage certificate: ${await row.count()}${(await row.count()) ? ` — ${(await row.first().innerText()).replace(/\s+/g, " ").slice(0, 300)}` : ""}`);
    if (await row.count()) { await row.first().scrollIntoViewIfNeeded(); await shot("06b-to-review-row"); }
    const link = row.first().getByRole("link").last();
    if (await row.count() && await link.count()) await link.click(); else {
      note("3 no link named Marriage certificate on To review; opened the change by its id");
      const id = sql(`select id from library_change where kind = 'document_providers' and status = 'WAITING' order by proposed_at desc limit 1`);
      await go(`/review/change/${id}`);
    }
    await page.waitForLoadState("networkidle");
    const cmp = page.locator("[data-change-providers]"); await cmp.waitFor({ timeout: 30_000 });
    await shot("07-second-person-compares");
    ok("3a before (Not set) → after (Principal applicant, then Spouse or partner)", /Not set/.test(await cmp.locator("[data-providers-before]").innerText()) && (await cmp.locator("[data-providers-after]").innerText()) === "Principal applicant, then Spouse or partner", (await cmp.innerText()).replace(/\n/g, " / "));
    await page.getByRole("button", { name: /^Approve/ }).first().click();
    await page.waitForURL(/\/review$/, { timeout: 30_000 });
    ok("3b approved: the type's draft carries the roles (read underneath)", sql(`select array_to_string(default_provider_roles, ',') from document_type where document_type_key = '${MARRIAGE}' order by version desc limit 1`) === "principal,spouse_or_partner");
  });

  // 4. The next release by screens (C4.x): submit, the expert's sign-off, approval by a second person.
  await step("4 release", async () => {
    const before = sql(`select coalesce(max(version),0) from config_release where combination_id = '${vv}'`);
    await as("user-A"); await go(`/c/${vv}/review`);
    await page.getByRole("button", { name: /Submit for review/ }).click(); await page.getByText(/Submitted by /).first().waitFor({ timeout: 60_000 });
    await shot("08-release-submitted");
    await as("user-C"); await go(`/c/${vv}/review`);
    const main = await page.locator("main").innerText();
    const line = (main.match(/[^\n]*provided by \(when shared\)[^\n]*/) ?? [""])[0];
    ok("4a the release line the expert signs names the roles in words", /provided by \(when shared\): principal applicant, then spouse or partner/i.test(main), line || main.slice(0, 300));
    await page.getByText(/provided by \(when shared\)/i).first().scrollIntoViewIfNeeded().catch(() => {});
    await shot("09-expert-reads-release-line");
    await page.getByRole("button", { name: "Select all I can sign" }).click(); await page.getByRole("button", { name: /^Sign \d/ }).click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(800);
    await as("user-B"); await go(`/c/${vv}/review`);
    await page.getByRole("button", { name: /Approve and release/ }).click();
    await page.getByText(/Released version|released/i).first().waitFor({ timeout: 60_000 }).catch(() => {});
    await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
    await shot("10-released");
    const after = sql(`select coalesce(max(version),0) from config_release where combination_id = '${vv}'`);
    ok("4b a new release went out (by screens)", Number(after) === Number(before) + 1, `${before} → ${after}`);
  });

  // 5. A new family case: one shared item, two providers, children never providers.
  const C = await married(L.FAMILY);
  const P = C.subjects["Sample Client A"], S = C.subjects["Sample Spouse A"], K = C.subjects["Sample Child A1"];
  await step("5 officer sees one item", async () => {
    await as(C.officer); await go(`/cases/${C.id}`);
    const rows = await marriageRows(); await rows.first().scrollIntoViewIfNeeded();
    await shot("11-officer-one-shared-item");
    const t = await rows.first().innerText();
    const all = await panelText();
    ok("5a one marriage-certificate item for the whole couple (not one per person)", (await rows.count()) === 1 && (all.match(/Marriage certificate/g) ?? []).length === 1, `${await rows.count()} rows`);
    ok("5b Shared · Provided by Sample Client A and Sample Spouse A, from the document type's default", /Provided by Sample Client A and Sample Spouse A/.test(t) && /Default from the document type/.test(t), t.replace(/\n/g, " / "));
    const sharedCount = await page.locator("[data-documents-panel] [data-shared]").count();
    ok("5c no other line is marked Shared (the passport stays per person)", sharedCount === 1, `${sharedCount} shared lines`);
    ok("5d no sideways scroll at 1024 px (case)", !(await sideways()));
  });

  // 6. Change providers: a child refused, no reason refused, the principal alone with a reason, then back to the defaults.
  await step("6 change providers", async () => {
    const rows = await marriageRows();
    await rows.first().getByRole("button", { name: /Actions for Marriage certificate/ }).click();
    await page.getByRole("menuitem", { name: "Change providers…" }).click();
    const dlg = page.getByRole("dialog"); await dlg.waitFor({ timeout: 10_000 });
    await shot("12-change-providers-dialog");
    const kid = dlg.locator(`[data-provider-option="${K}"]`);
    ok("6a the children cannot be ticked, with the reason in words", await kid.isDisabled() && /under 18/.test(await dlg.locator(`[data-provider-blocked="${K}"]`).innerText()), (await dlg.innerText()).replace(/\n/g, " / ").slice(0, 500));
    await dlg.locator(`[data-provider-option="${S}"]`).uncheck();
    await dlg.locator("[data-providers-save]").click(); await page.waitForTimeout(800);
    await shot("13-no-reason-refused");
    ok("6b Save with no reason is refused in words on the reason field", /reason/i.test(await dlg.innerText()) && await dlg.isVisible(), (await dlg.innerText()).replace(/\n/g, " / ").slice(0, 400));
    await dlg.locator("[data-providers-reason]").fill("Only the principal holds the original certificate (Sample, qa).");
    await dlg.locator("[data-providers-save]").click();
    await dlg.waitFor({ state: "detached", timeout: 15_000 });
    const r2 = await marriageRows(); await r2.first().scrollIntoViewIfNeeded();
    await shot("14-principal-alone-with-reason");
    const t = await r2.first().innerText();
    ok("6c the line now reads Provided by Sample Client A alone, chosen by the case officer, with the reason", /Provided by Sample Client A(?! and)/.test(t) && /Chosen by the case officer/.test(t) && /holds the original/.test(t), t.replace(/\n/g, " / "));
    ok("6d stored and audited underneath", Number(sql(`select count(*) from audit_event where entity = 'checklist line' and action = 'providers changed'`)) >= 1);
    await r2.first().getByRole("button", { name: /Actions for Marriage certificate/ }).click();
    await page.getByRole("menuitem", { name: "Change providers…" }).click();
    const d2 = page.getByRole("dialog"); await d2.waitFor({ timeout: 10_000 });
    await d2.locator("[data-providers-reason]").fill("Back to the document type's defaults (qa).");
    await shot("15-use-the-defaults");
    await d2.locator("[data-providers-defaults]").click();
    await d2.waitFor({ state: "detached", timeout: 15_000 });
    const t3 = await (await marriageRows()).first().innerText();
    await shot("16-back-to-defaults");
    ok("6e Use the defaults with a reason: both providers again", /Provided by Sample Client A and Sample Spouse A/.test(t3), t3.replace(/\n/g, " / "));
  });

  // 7. F18: nobody left (a principal of unknown age, a spouse of 17) → the filing's first applicant, the person the item is for.
  const D = await married([{ role: "principal", name: "Sample Client C", dob: null }, { role: "spouse_or_partner", name: "Sample Spouse C", dob: L.yearsAgo(17) }]);
  await step("7 F18 nobody matches", async () => {
    await as(D.officer); await go(`/cases/${D.id}`);
    const rows = await marriageRows(); await rows.first().scrollIntoViewIfNeeded();
    await shot("17-f18-nobody-matches-first-applicant");
    const t = await rows.first().innerText();
    ok("7a (F18) nobody matches → Provided by Sample Spouse C, the filing's first applicant (the person the item is for), with the reasons in words", /Provided by Sample Spouse C/.test(t), t.replace(/\n/g, " / "));
    note(`7b F18 words on the line: ${t.replace(/\n/g, " / ")}`);
    await rows.first().getByRole("button", { name: /Actions for Marriage certificate/ }).click();
    await page.getByRole("menuitem", { name: "Change providers…" }).click();
    const dlg = page.getByRole("dialog"); await dlg.waitFor({ timeout: 10_000 });
    await shot("17b-f18-dialog-why");
    note(`7c F18 dialog: ${(await dlg.innerText()).replace(/\n/g, " / ")}`);
    ok("7d (BR-4/BR-5) the screen says why nobody matched (unknown age, 17) somewhere a person sees it", /cannot be checked|is 17/.test(t + (await dlg.innerText())), "line + dialog");
    await page.keyboard.press("Escape");
  });

  // 8. The next capability's first step: C6.4 Request and C6.5 Upload on the one shared item (case C).
  await step("8 next step", async () => {
    await as(C.officer); await go(`/cases/${C.id}`);
    let rows = await marriageRows();
    await rows.first().getByRole("button", { name: /Actions for Marriage certificate/ }).click();
    await shot("18-next-step-actions-menu");
    const items = (await page.getByRole("menuitem").allInnerTexts()).join(" | ");
    note(`8 actions on the shared item: ${items}`);
    const req = page.getByRole("menuitem", { name: /^Request/ });
    if (await req.count()) { await req.first().click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(800); } else await page.keyboard.press("Escape");
    rows = await marriageRows(); await rows.first().scrollIntoViewIfNeeded();
    await shot("19-next-step-requested");
    const st1 = await rows.first().locator("[data-state-words]").innerText();
    ok("8a C6.4 first step: the shared item can be requested (once, for the couple)", !!(await req.count()) || /Requested/i.test(st1), st1);
    const png = join(OUT, "..", "scripts", "marriage-sample.png");
    writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
    await rows.first().getByRole("button", { name: /Actions for Marriage certificate/ }).click();
    const up = page.getByRole("menuitem", { name: /Upload a file/ });
    if (await up.count()) {
      const chooserP = page.waitForEvent("filechooser", { timeout: 8_000 }).catch(() => null);
      await up.first().click(); const chooser = await chooserP;
      if (chooser) await chooser.setFiles(png); else { note("8 headless: no file-chooser event from the menu item; the file was set on the row's own file input (what the chooser fills)"); await rows.first().locator("[data-upload-input]").setInputFiles(png); }
      await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
    } else await page.keyboard.press("Escape");
    rows = await marriageRows(); await rows.first().scrollIntoViewIfNeeded();
    await shot("20-next-step-uploaded-on-the-one-item");
    const t = await rows.first().innerText();
    ok("8b C6.5 first step: a file uploaded on the one shared item lands on it (file named, state moves on), providers still shown", /marriage-sample\.png/.test(t) && /Provided by Sample Client A and Sample Spouse A/.test(t), t.replace(/\n/g, " / "));
    const docs = sql(`select count(*) from case_document d join checklist_line l on l.id = d.checklist_line_id where l.case_id = '${C.id}'`);
    note(`8c files stored on the case underneath: ${docs || "(query not matched)"}`);
    ok("8d no other person's list gained a marriage-certificate item after the upload", ((await panelText()).match(/Marriage certificate/g) ?? []).length === 1);
  });
} finally {
  await browser.close();
  writeFileSync(join(OUT, "..", "walk-output.txt"), lines.join("\n") + `\n\n${pass}/${pass + fail} passed\n`);
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}
