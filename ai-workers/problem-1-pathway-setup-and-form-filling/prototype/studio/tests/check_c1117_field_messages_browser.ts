// C11.17 "Add to Program structure": every refusal shows under its own field (QA-183, P-128, skill qa §2). In the
// browser as the configuration author (user-A) at 1440 px on the six. Two ways a name is refused, each under its field:
// (1) as you type, the server's own name rules (contracts/programs.ts labelProblem: at most 120 characters, letters or
// digits) under Pathway, Program, Category and Sub-category, with Add off and nothing sent; (2) the server's refusal
// itself, whose field path names a part ("category.label", "allowedLocations"), under that part: the request is changed
// on its way (Playwright route) so the real server refuses it, as an older pop-up or a direct client would send it.
// A refusal with no field of its own keeps its words in the dialog's alert. Nothing is saved by any refusal. axe on the
// open pop-up with a message. Screenshots in product/screens/C11.17-field-messages/. NO model call (US$0).
//   zsh studio/tools/isolated.sh c1117 4476 start && tsx studio/tests/check_c1117_field_messages_browser.ts 4476 xr_studio_c1117
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page, Route } from "playwright";
import { client, recorder } from "./runtime/api.ts";
import { walker } from "../acceptance/lib/browser.ts";

const PORT = Number(process.argv[2] ?? 4476), DB = process.argv[3] ?? "xr_studio_c1117";
const SHOTS = join(import.meta.dirname, "..", "..", "..", "product", "screens", "C11.17-field-messages"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const LONG = "Sample " + "long name ".repeat(13); // 137 characters
const AT_LIMIT = "S" + "a".repeat(119); // exactly 120: allowed
const RUN = Date.now().toString(36); // names of this run (a re-run on the same copy never meets its own names)
const TV = (n: number) => `Sample transit visa ${RUN} ${n}`;

(async () => {
  if (!(await call("GET", "/demo/status")).body?.loaded) {
    const l = await call("POST", "/demo/load", { sample: "six" }, "user-A");
    if (l.status >= 300) { console.error("STOP  the six did not load", l.body); process.exit(2); }
  }
  const W = await walker(`http://localhost:${PORT}`);
  const p = await W.open("user-A", 1440);
  const dlg = p.getByRole("dialog");
  const names = () => Number(sql("select count(*) from program_def"));
  const field = (lv: string) => dlg.locator(`[data-field=${lv}] input[role=combobox]`);
  const under = (lv: string) => dlg.locator(`[data-field=${lv}] [role=alert]`);
  const underText = async (lv: string) => ((await under(lv).count()) ? (await under(lv).first().innerText()).trim() : "");
  const generalAlert = async () => ((await dlg.locator("[data-add-problem]").count()) ? (await dlg.locator("[data-add-problem]").innerText()).replace(/\s+/g, " ").trim() : "");
  let posts = 0; p.on("request", (r) => { if (/\/structure\/path$/.test(r.url()) && r.method() === "POST") posts++; });
  /** Types the name and leaves the field: an existing name typed exactly is that name ("Uses the existing …"). */
  const pickOrType = async (lv: string, name: string) => {
    await field(lv).fill(name); await field(lv).press("Tab");
    await p.waitForFunction(([sel, v]) => (document.querySelector(sel) as HTMLInputElement | null)?.value === v, [`[data-add-dialog] [data-field=${lv}] input[role=combobox]`, name] as const, { timeout: 5000 });
  };
  const fresh = async () => {
    if (await dlg.isVisible()) { await p.keyboard.press("Escape"); await dlg.waitFor({ state: "hidden", timeout: 5000 }); }
    await p.goto("/structure"); await p.locator("[data-row]").first().waitFor({ timeout: 30_000 }); await W.settle(p, "/structure");
    await p.locator("[data-add-open]").click(); await dlg.waitFor({ timeout: 10_000 });
  };
  const addOff = async () => (await dlg.locator("[data-add-submit]").isDisabled()) && (await dlg.locator("[data-add-again]").isDisabled());
  const shot = (file: string) => dlg.screenshot({ path: join(SHOTS, file) });
  /** The tip of a footer button, read from the tooltip its trigger is described by once it opens (a tip over a disabled button stays open after the pointer leaves, so each opening reads one). */
  const tipOf = async (sel: string) => {
    const trigger = dlg.locator(sel).locator("xpath=..");
    await trigger.hover();
    await p.waitForFunction((s) => !!document.querySelector(s)?.parentElement?.getAttribute("aria-describedby"), sel, { timeout: 3000 });
    return trigger.evaluate((el) => document.getElementById(el.getAttribute("aria-describedby") ?? "")?.textContent ?? "");
  };

  // ------------------------------------------------- (1) as you type: under each name field, Add off, nothing sent
  await fresh();
  const n0 = names(), p0 = posts;
  await field("pathway").fill(LONG); await field("pathway").press("Tab");
  ok("C11.17 fail: a Pathway name over 120 characters shows \"Keep the name under 120 characters.\" under Pathway as you type", /under 120 characters/.test(await underText("pathway")), await underText("pathway"));
  ok("C11.17 fail: with that message, Add and Add and add another are off (nothing can be sent)", await addOff());
  await shot("1-pathway-too-long.png");
  await field("pathway").fill("!!!"); await field("pathway").press("Tab");
  ok("C11.17 fail: a Pathway name of only punctuation shows \"Use letters or digits\" under Pathway", /letters or digits/.test(await underText("pathway")), await underText("pathway"));
  await field("pathway").fill(AT_LIMIT); await field("pathway").press("Tab");
  ok("C11.17 pass: a Pathway name of exactly 120 characters has no message, and Add is on", (await under("pathway").count()) === 0 && !(await dlg.locator("[data-add-submit]").isDisabled()), await underText("pathway"));

  await fresh(); // a new opening, as a person starts again
  await pickOrType("pathway", "Temporary residence");
  await field("program").fill(LONG); await field("program").press("Tab");
  ok("C11.17 fail: a Program name over 120 characters shows its message under Program, not elsewhere", /under 120 characters/.test(await underText("program")) && (await under("pathway").count()) === 0 && !(await generalAlert()), { program: await underText("program"), alert: await generalAlert() });
  await shot("2-program-too-long.png");
  const tip = await tipOf("[data-add-submit]");
  ok("C11.17 fail: Add is off and its tip names the field to fix", (await addOff()) && /Fix the program first/.test(tip), tip);
  await fresh(); // the Add tip stays open in this opening: a new one for the Category step
  await pickOrType("pathway", "Temporary residence"); await pickOrType("program", "Visitors");
  await field("category").fill(LONG);
  const listWhileTyping = { refused: (await dlg.locator("[data-field=category] [data-add-refused]").innerText().catch(() => "")).trim(), addNew: await dlg.locator("[data-field=category] [data-add-new]").count() };
  ok("C11.17 fail: while typing, the open list shows the rule where “Add …” would be (the note is never hidden behind it)", /under 120 characters/.test(listWhileTyping.refused) && listWhileTyping.addNew === 0, listWhileTyping);
  await field("category").press("Tab");
  ok("C11.17 fail (QA-183): a Category name over 120 characters shows \"Keep the name under 120 characters.\" under Category", /Keep the name under 120 characters\./.test(await underText("category")), await underText("category"));
  ok("C11.17 fail (QA-183): the Category input is marked invalid and its message is its description (read with the field)", await field("category").evaluate((el) => el.getAttribute("aria-invalid") === "true" && !!document.getElementById(el.getAttribute("aria-describedby") ?? "")?.textContent?.includes("under 120 characters")));
  const tipAgain = await tipOf("[data-add-again]");
  ok("C11.17 fail (QA-183): Add and add another is off too, and its tip names the field to fix", (await addOff()) && /Fix the category first/.test(tipAgain), tipAgain);

  await field("category").hover();
  await shot("3-category-too-long-QA-183.png");
  await p.screenshot({ path: join(SHOTS, "3b-category-too-long-1440-page.png") }); // the whole 1440 px page, pop-up open
  const v = (await new AxeBuilder({ page: p }).include("[role=dialog]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok("C11.17 axe: the pop-up with a message under Category has no WCAG 2.2 A/AA violation", v.length === 0, v.map((x) => `${x.id}: ${x.nodes[0]?.target}`));
  await field("category").fill(TV(1)); await field("category").press("Tab");
  ok("C11.17 pass: shortening the name clears the message under Category and Add is on again", (await under("category").count()) === 0 && !(await dlg.locator("[data-add-submit]").isDisabled()));

  await field("program").fill(""); await pickOrType("program", "Study permits");
  await pickOrType("category", "Study permit");
  await field("subCategory").fill(LONG); await field("subCategory").press("Tab");
  ok("C11.17 fail: a Sub-category name over 120 characters shows its message under Sub-category", /under 120 characters/.test(await underText("subCategory")) && (await addOff()), await underText("subCategory"));
  await shot("4-subcategory-too-long.png");
  // Devin review on #867: a Sub-category left under None is not sent, so its rule neither shows nor keeps Add off.
  await field("program").fill("Visitors"); await field("program").press("Tab"); await pickOrType("category", TV(4));
  await dlg.locator("[data-none]").uncheck(); await field("subCategory").fill(LONG); await field("subCategory").press("Tab");
  ok("C11.17 fail: under a new category with None unticked, an over-long Sub-category shows its rule and Add is off", /under 120 characters/.test(await underText("subCategory")) && (await addOff()), await underText("subCategory"));
  await dlg.locator("[data-none]").check();
  ok("C11.17 pass: ticking None again (the Sub-category is not sent) clears its rule and Add is on", (await under("subCategory").count()) === 0 && (await field("subCategory").getAttribute("aria-invalid")) === null && !(await dlg.locator("[data-add-submit]").isDisabled()), await underText("subCategory"));
  ok("C11.17 data: no name refused as you type was sent or saved", posts === p0 && names() === n0, { posts: posts - p0, before: n0, after: names() });

  // ------------------------------------------------- (2) the server's own refusal, under the part it names
  /** Changes the next POST /structure/path body on its way to the real server. */
  const rewrite = (f: (b: Record<string, unknown>) => void) => p.route("**/api/structure/path", async (r: Route) => {
    const b = JSON.parse(r.request().postData() ?? "{}"); f(b); await r.continue({ postData: JSON.stringify(b) });
  }, { times: 1 });
  const sendAndWait = async () => {
    const res = p.waitForResponse((r) => /\/structure\/path$/.test(r.url()) && r.request().method() === "POST", { timeout: 15_000 });
    await dlg.locator("[data-add-submit]").click(); const r = await res;
    await dlg.locator("[data-add-problem]").waitFor({ timeout: 5000 });
    return r;
  };
  await fresh();
  await pickOrType("pathway", "Temporary residence"); await pickOrType("program", "Visitors"); await pickOrType("category", TV(1));
  let before = names();
  await rewrite((b) => { b.category = { label: LONG }; });
  let r = await sendAndWait();
  const sent = await r.json() as { errors?: { field: string }[] };
  ok("C11.17 fail: the server refuses an over-long category (400) and names the field by its path (category.label)", r.status() === 400 && sent.errors?.[0]?.field === "category.label", { status: r.status(), body: sent });
  ok("C11.17 fail (QA-183): that refusal's words show under Category, not only in the dialog's alert", /Keep the name under 120 characters\./.test(await underText("category")), await underText("category"));
  ok("C11.17 fail: the dialog's alert says nothing was added and points to the field, without repeating the words", /^Nothing was added: see the note under Category\.$/.test(await generalAlert()), await generalAlert());
  ok("C11.17 data: the refused category was not saved", names() === before, { before, after: names() });
  await shot("5-server-refusal-under-category.png");
  await field("category").fill(TV(2)); await field("category").press("Tab");
  ok("C11.17 pass: typing in Category again clears its refusal and the alert", (await under("category").count()) === 0 && !(await generalAlert()));
  await rewrite((b) => { b.category = { label: LONG }; });
  await sendAndWait();
  await field("program").fill("Study permits"); await field("program").press("Tab");
  ok("C11.17 pass: changing the Program above clears the emptied Category's refusal (no message outlives its name)", (await field("category").inputValue()) === "" && (await under("category").count()) === 0 && (await field("category").getAttribute("aria-invalid")) === null, await underText("category"));
  await field("program").fill("Visitors"); await field("program").press("Tab"); await pickOrType("category", TV(2));

  before = names();
  await rewrite((b) => { b.program = { label: "!!!" }; delete b.category; delete b.subCategory; delete b.allowedLocations; });
  r = await sendAndWait();
  ok("C11.17 fail: a refused Program name (program.label) shows under Program", r.status() === 400 && /letters or digits/.test(await underText("program")) && /under Program\./.test(await generalAlert()) && names() === before, { program: await underText("program"), alert: await generalAlert() });

  await fresh();
  await pickOrType("pathway", "Temporary residence"); await pickOrType("program", "Visitors"); await pickOrType("category", TV(3));
  ok("C11.17 pass: a new category shows \"Cases may be opened from\" (its own field)", (await dlg.locator("[data-field=allowedLocations]").count()) === 1);
  before = names();
  await rewrite((b) => { b.allowedLocations = []; });
  r = await sendAndWait();
  const loc = (await dlg.locator("[data-field=allowedLocations] [role=alert]").count()) ? await dlg.locator("[data-field=allowedLocations] [role=alert]").innerText() : "";
  ok("C11.17 fail: a refusal of where cases may be opened (allowedLocations) shows under \"Cases may be opened from\"", r.status() === 400 && /Choose where a case for it may be opened/.test(loc) && /under Cases may be opened from\./.test(await generalAlert()) && names() === before, { loc, alert: await generalAlert() });
  await shot("6-server-refusal-under-locations.png");
  const lg = await dlg.getByRole("radiogroup", { name: "Cases may be opened from" }).evaluate((el) => ({ invalid: el.getAttribute("aria-invalid"), note: document.getElementById(el.getAttribute("aria-describedby") ?? "")?.textContent ?? "" }));
  ok("C11.17 fail: \"Cases may be opened from\" is marked invalid and described by its note", lg.invalid === "true" && /Choose where a case/.test(lg.note), lg);
  await dlg.getByRole("radio", { name: "Inside", exact: true }).click();
  ok("C11.17 pass: choosing where cases may be opened clears its refusal", (await dlg.locator("[data-field=allowedLocations] [role=alert]").count()) === 0 && !(await generalAlert()));

  before = names();
  await rewrite((b) => { b.pathwayType = "SAMPLE"; });
  r = await sendAndWait();
  const pt = (await dlg.locator("[data-field-note=pathwayType]").count()) ? await dlg.locator("[data-field-note=pathwayType]").innerText() : "";
  const group = await dlg.getByRole("radiogroup", { name: "Pathway type" }).evaluate((el) => ({ invalid: el.getAttribute("aria-invalid"), note: document.getElementById(el.getAttribute("aria-describedby") ?? "")?.textContent ?? "" }));
  ok("C11.17 fail: the Pathway type switch is marked invalid and described by its note", group.invalid === "true" && /Choose the Pathway type/.test(group.note), group);
  ok("C11.17 fail: a refused Pathway type shows under the Pathway type switch", r.status() === 400 && /Choose the Pathway type/.test(pt) && /under Pathway type\./.test(await generalAlert()) && names() === before, { pt, alert: await generalAlert() });

  before = names();
  await rewrite((b) => { b.decision = "sample"; });
  r = await sendAndWait();
  ok("C11.17 fail: a refusal with no field of its own keeps its words in the dialog's alert (never lost)", r.status() === 400 && /^Nothing was added\. Invalid option/.test(await generalAlert()) && (await dlg.locator("[data-field] [role=alert], [data-field-note]").count()) === 0 && names() === before, await generalAlert());

  await rewrite((b) => { b.pathwayType = "SAMPLE"; });
  await sendAndWait();
  await dlg.getByRole("radio", { name: "Corporate and employers" }).click();
  ok("C11.17 pass: switching the Pathway type (every level starts again) clears every message", (await dlg.locator("[data-field] [role=alert], [data-field-note]").count()) === 0 && !(await generalAlert()));

  ok("C11.17 data: no page error", W.errors.length === 0, W.errors);
  await W.close();
  process.exit(summary());
})().catch((e) => { console.error(e); process.exit(1); });
