// C11.17 acceptance (qa/CAPABILITIES.md C11.17; P-127, P-128): "Content publisher adds to Program structure through one
// pop-up (pick or type each level, checks under each field, 'You are adding' preview, Add and add another, only new parts
// saved, may stop at any level) and reads the page in a Tree view (numbered Pathway and Program blocks) or a List view
// (one line per combination with the full trail), with a filter bar and Edit plus Delete/Retire/Restore/Withdraw on every
// row." Written 3 Nov (F6, P-290) from the row: until then C11.17 was proven only by qa's walk scripts
// (tests/qa/check_qa_am_r3_1028.cjs, check_qa_am_1027.cjs part A).
// On the six as a person loads them from the Demo menu, in a browser as the configuration author at 1440 px; the data
// underneath is read from the database. Every new name is Sample (acceptance words). No model call (US$0).
//   zsh studio/tools/isolated.sh accept 4475 start && tsx studio/acceptance/C11.17.test.ts 4475 xr_studio_accept
import type { Page } from "playwright";
import { APPROVER, AUTHOR, pack2, run } from "./lib/pack2.ts";
import { walker } from "./lib/browser.ts";

const T = pack2("C11.17");
const { call, sql, ok } = T;
const LIFECYCLE = ["Delete", "Retire", "Restore", "Withdraw"];

run(async () => {
  await T.ready();
  const W = await walker(`http://localhost:${T.PORT}`);
  const p = await W.open(AUTHOR);
  const names = () => Number(sql("select count(*) from program_def"));
  const dlg = p.getByRole("dialog");
  const field = (lv: string) => dlg.locator(`[data-field=${lv}] input[role=combobox]`);
  const fieldText = async (lv: string) => (await dlg.locator(`[data-field=${lv}]`).innerText()).replace(/\s+/g, " ");
  /** Picks the existing name from the list when it is offered, else types a new one; waits for the field to show it. */
  const pickOrType = async (lv: string, name: string) => {
    await field(lv).fill(name);
    const opt = dlg.getByRole("option", { name, exact: true });
    await opt.first().waitFor({ timeout: 3000 }).then(() => opt.first().click(), async () => { await field(lv).press("Tab"); });
    await p.waitForFunction(([sel, v]) => (document.querySelector(sel) as HTMLInputElement | null)?.value === v, [`[data-add-dialog] [data-field=${lv}] input[role=combobox]`, name] as const, { timeout: 5000 });
  };
  const sent = () => p.waitForResponse((r) => /\/structure\/path$/.test(r.url()) && r.request().method() === "POST", { timeout: 15_000 });
  const openDialog = async () => { if (!(await dlg.isVisible())) { await p.locator("[data-add-open]").click(); await dlg.waitFor({ timeout: 10_000 }); } };
  const structure = async (qs = "") => { await p.goto(`/structure${qs}`); await p.locator("[data-row]").first().waitFor({ timeout: 30_000 }); await W.settle(p, `/structure${qs}`); };

  // ---------------------------------------------------------------- the one pop-up
  await structure();
  await openDialog();
  const levels = await dlg.locator("[data-field]").evaluateAll((els) => els.map((e) => e.getAttribute("data-field")));
  ok("C11.17 pass: one pop-up names each level, Pathway › Program › Category › Sub-category, each a pick-or-type field", ["pathway", "program", "category", "subCategory"].every((l) => levels.includes(l)) && (await dlg.locator("[data-field] input[role=combobox]").count()) >= 4, levels);
  await pickOrType("pathway", "Temporary residence");
  await pickOrType("program", "Visitors");
  const NEW = "Transit visa (acceptance C11.17)";
  await pickOrType("category", NEW);
  const preview = (await dlg.locator("[data-you-are-adding]").innerText()).replace(/\s+/g, " ");
  ok("C11.17 pass: \"You are adding\" shows the trail and that only one name is new", /You are adding/i.test(preview) && preview.includes("Temporary residence") && preview.includes("Visitors") && preview.includes(NEW) && /\b1 new name\b/i.test(preview), preview.slice(0, 200));
  const marks = await dlg.locator("[data-field]").evaluateAll((els) => els.filter((e) => e.querySelector("[data-new]")).map((e) => e.getAttribute("data-field")));
  ok("C11.17 pass: only the typed level is marked New (the picked Pathway and Program are existing names)", marks.length === 1 && marks[0] === "category", marks);

  // checks under each field
  await field("category").fill("visitor VISA");
  await p.waitForTimeout(900);
  const twin = `${await fieldText("category")} ${(await dlg.locator("[data-you-are-adding]").innerText()).replace(/\s+/g, " ")}`;
  ok("C11.17 fail: an existing name typed another way (\"visitor VISA\") is recognised as Visitor visa, nothing new to add", /exist|already/i.test(twin) && !/\b1 new name\b/i.test(twin), twin.slice(0, 220));
  await field("category").fill("A".repeat(10) + " very long category name".repeat(12));
  await field("category").press("Tab");
  await p.waitForTimeout(600);
  const before = names();
  let tried = "not sent: refused in the pop-up";
  if ((await dlg.locator("[data-field=category] [role=alert]").count()) === 0 && !(await dlg.locator("[data-add-submit]").isDisabled())) {
    const lr = sent(); await dlg.locator("[data-add-submit]").click(); tried = String((await lr).status());
    await dlg.locator("[role=alert]").first().waitFor({ timeout: 5000 }); // the refusal's words must show
  }
  const longField = await fieldText("category"), longDlg = (await dlg.innerText()).replace(/\s+/g, " ");
  ok("C11.17 fail: a name over the limit (120 characters) gets its message under its own field, in words; nothing saved", (await dlg.locator("[data-field=category] [role=alert]").count()) > 0 && /characters|too long|at most/i.test(longField) && names() === before, { sent: tried, underField: longField.slice(-140), elsewhere: longDlg.match(/.{0,60}120 characters.{0,20}/)?.[0] ?? null });

  // Add and add another: only new parts are saved; the levels above stay
  await field("category").fill("");
  await pickOrType("category", NEW);
  const n0 = names();
  let res = sent();
  await dlg.locator("[data-add-again]").click();
  let r = await res;
  ok("C11.17 pass: Add and add another saves the name (2xx)", r.status() < 300, r.status());
  await p.waitForFunction(() => ((document.querySelector("[data-add-dialog] [data-field=category] input[role=combobox]") as HTMLInputElement | null)?.value ?? "x") === "", undefined, { timeout: 5000 });
  ok("C11.17 data: only the new part is saved (one name more; the picked Pathway and Program are not written again)", names() === n0 + 1 && sql(`select count(*) from program_def where label='${NEW}'`) === "1", { before: n0, after: names() });
  ok("C11.17 pass: after Add and add another the pop-up stays open, the levels above kept and the last field empty", (await dlg.isVisible()) && (await field("pathway").inputValue()) === "Temporary residence" && (await field("program").inputValue()) === "Visitors" && (await field("category").inputValue()) === "", { pathway: await field("pathway").inputValue(), program: await field("program").inputValue() });
  const parentOk = sql(`select count(*) from program_def c join program_def p on p.program_node_key=c.parent_node_key where c.label='${NEW}' and p.label='Visitors'`);
  ok("C11.17 data: the new category sits under Visitors", parentOk === "1", parentOk);

  // may stop at any level: a Program alone
  const PROG = "Acceptance programs (C11.17)";
  await field("program").fill("");
  await pickOrType("program", PROG);
  const n1 = names();
  res = sent();
  await dlg.locator("[data-add-submit]").click();
  r = await res;
  await dlg.waitFor({ state: "hidden", timeout: 10_000 });
  ok("C11.17 pass: the path may stop at any level: a Program alone is added (Add, the pop-up closes)", r.status() < 300 && names() === n1 + 1 && sql(`select node_kind from program_def where label='${PROG}'`) === "PROGRAM", { status: r.status(), kind: sql(`select node_kind from program_def where label='${PROG}'`) });

  // ---------------------------------------------------------------- the Tree
  await structure("?v=tree");
  const nums = await p.locator("[data-tree] [data-row] [data-num]").allInnerTexts();
  ok("C11.17 pass: the Tree numbers its rows 1, 1.1, 1.1.1 … in page order", nums[0] === "1" && nums[1] === "1.1" && nums.every((x) => /^\d+(\.\d+){0,3}$/.test(x.trim())), nums.slice(0, 8));
  const blocks = await p.locator("[data-tree] [data-block]").count();
  ok("C11.17 pass: the Tree shows Pathway and Program blocks", blocks >= 2, blocks);
  const treeRowActions = async (pg: Page) => pg.locator("[data-row]").evaluateAll((els) => els.map((e) => [e.querySelector("[data-edit]")?.textContent?.trim().split(/\s/)[0] ?? "", e.querySelector("[data-action]")?.textContent?.trim().split(/\s/)[0] ?? ""]));
  const ta = await treeRowActions(p);
  ok("C11.17 pass: every Tree row has Edit and one of Delete, Retire, Restore or Withdraw", ta.length > 10 && ta.every(([e, a]) => e === "Edit" && LIFECYCLE.includes(a)), [...new Set(ta.map((x) => x.join("+")))]);
  const fresh = p.locator("[data-row]").filter({ hasText: NEW }).first();
  ok("C11.17 pass: the new category is in the Tree, offered Delete (never released)", (await fresh.count()) === 1 && /^Delete/.test((await fresh.locator("[data-action]").innerText()).trim()), await fresh.locator("[data-action]").innerText().catch(() => "not shown"));

  // ---------------------------------------------------------------- the List
  await p.locator("[data-view-choice=list]").click();
  await p.locator("[data-list] [data-row]").first().waitFor({ timeout: 10_000 });
  const lines = await p.locator("[data-list] [data-row]").count();
  const allNodes = ((await call("GET", "/structure?pathwayType=INDIVIDUAL")).body?.nodes ?? []) as any[];
  const parents = new Set(allNodes.map((n) => n.parentKey).filter(Boolean));
  const leafCount = allNodes.filter((n) => !n.retired && (n.level === "category" || n.level === "subCategory") && !parents.has(n.key)).length;
  ok("C11.17 pass: the List shows one line per combination (every last level, Retail)", lines === leafCount && leafCount > 0, { lines, combinations: leafCount });
  const trails = await p.locator("[data-list] [data-row] [data-trail-line]").allInnerTexts();
  ok("C11.17 pass: each List line shows its full trail (Pathway › Program › … in words)", trails.length === lines && trails.every((t) => (t.match(/›/g) ?? []).length >= 2), trails.slice(0, 3));
  const la = await treeRowActions(p);
  ok("C11.17 pass: every List line has Edit and one of Delete, Retire, Restore or Withdraw", la.length === lines && la.every(([e, a]) => e === "Edit" && LIFECYCLE.includes(a)), [...new Set(la.map((x) => x.join("+")))]);
  await p.goto("/structure"); await p.locator("[data-row]").first().waitFor({ timeout: 30_000 });
  ok("C11.17 pass: the chosen view is remembered for the person (List again after leaving the page)", (await p.locator("[data-list]").count()) === 1 && (await p.locator("[data-view-choice=list]").getAttribute("aria-pressed")) === "true");

  // ---------------------------------------------------------------- the filter bar
  ok("C11.17 pass: a filter bar with Pathway chips and Find", (await p.locator("[data-filter-bar]").count()) === 1 && (await p.locator("[data-pathway-chip]").count()) >= 3 && (await p.getByPlaceholder(/Find a name/).count()) === 1, await p.locator("[data-pathway-chip]").allInnerTexts());
  await p.locator("[data-pathway-chip]").filter({ hasText: "Permanent residence" }).first().click();
  await p.waitForURL(/[?&]p=/, { timeout: 5000 });
  const onlyPr = await p.locator("[data-list] [data-trail-line]").allInnerTexts();
  ok("C11.17 pass: a Pathway chip shows only that Pathway, and the filter is in the address", onlyPr.length > 0 && onlyPr.every((t) => t.includes("Permanent residence")), { url: p.url().replace(/^.*\/structure/, "/structure"), first: onlyPr.slice(0, 2) });
  await p.locator("[data-clear-all]").first().click();
  await p.getByPlaceholder(/Find a name/).fill("Visitor");
  await p.waitForURL(/[?&]q=Visitor/, { timeout: 5000 });
  const found = await p.locator("[data-list] [data-row]").allInnerTexts();
  ok("C11.17 pass: Find keeps only the lines with a matching name, and is in the address", found.length > 0 && found.length < lines && found.every((t) => /visitor/i.test(t)), found.length);

  // ---------------------------------------------------------------- only the content publisher adds
  const b = await W.open(APPROVER);
  await b.goto("/structure"); await b.locator("[data-row]").first().waitFor({ timeout: 30_000 });
  const addFor = await b.locator("[data-add-open]").count() ? await b.locator("[data-add-open]").isDisabled() : true;
  ok("C11.17 fail: the approver (not a content publisher) is not offered Add", addFor, await b.locator("[data-add-open]").count());
  const deny = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { label: "Approver pathway (acceptance)" } }, APPROVER);
  ok("C11.17 fail: the server refuses an add by the approver (403), nothing saved", deny.status === 403 && sql("select count(*) from program_def where label='Approver pathway (acceptance)'") === "0", deny.status);
  ok("C11.17 data: no page error", W.errors.length === 0, W.errors.slice(0, 3));
  await W.close();
  T.done();
});
