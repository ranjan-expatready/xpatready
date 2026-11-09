// C7.3 "Entered in the portal" by screens (P-401, QA-323): the case officer ticks each section of an Online form's answer
// sheet, takes a tick off with a reason, meets a stale sheet, sees a changed answer clear a tick, and brings the item to
// Done, at 1024 px and by keyboard only (Tab, Enter, Escape, typing; no click). Next to C7.3-tick.test.ts, which proves the
// same rules by the API; here each word checked on the screen is compared with the server's own answer in the same step.
// Rules: R1 tick (who and when; staff only) · R2 untick needs a reason · R3 stale version refused, Reload · R4 a changed
// answer clears the tick and says why · R5 To do → Done, the count words the item's own. Each has a pass and a fail.
// A case of its own (Sample Client K); synthetic data only; no model call (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/acceptance/C7.3-screen.test.ts 4440 xr_studio_accept
import type { Locator, Page } from "playwright";
import { CLIENT, OFFICER, PORT, answer, call, confirmAll, fillEverything, itemsOf, main, ok, prepare } from "./lib/m3.ts";
import { onlineItemOf } from "./lib/c73.ts";
import { walker } from "./lib/browser.ts";

type Section = { key: string; title: string; version: string; entered: { at: string; by: string } | null; out_of_date: boolean; answers: { fact: string; subject: string; copy_text: string }[] };
const BASE = `http://127.0.0.1:${PORT}`, W = 1024;

/** Moves the focus by Tab (Shift+Tab when `back`) until it is on `target`; throws when it never gets there. */
async function tabTo(page: Page, target: Locator, what: string, back = false) {
  const handle = await target.elementHandle({ timeout: 15_000 });
  for (let i = 0; i < 600; i++) {
    if (await page.evaluate((el) => document.activeElement === el, handle)) return;
    await page.keyboard.press(back ? "Shift+Tab" : "Tab");
  }
  throw new Error(`${what}: Tab never reached it`);
}

await main("C7.3", "\"Entered in the portal\" by screens: 1024 px, keyboard only (US$0)", async () => {
  const got = await onlineItemOf("Sample Client K");
  if (!got) { console.log("STOP  setup: no Online form item for the principal (expectedFor, C11.6)"); process.exit(2); }
  const { caseId, subject: P, itemId, form } = got;
  await fillEverything(caseId);
  const sheet = async () => (await call("GET", `/runtime/items/${itemId}/answer-sheet`, undefined, OFFICER)).body as { sections: Section[] };
  const itemNow = async () => itemsOf((await prepare(caseId)).p, P, form)[0] as unknown as { state: string; reason?: string };
  let s = await sheet();
  const first = s.sections.find((x) => x.answers.some((a) => a.fact === "person.family_name" && a.subject === P)) ?? s.sections[0];
  const K = first.key, N = s.sections.length;
  const name = first.answers.find((a) => a.fact === "person.family_name" && a.subject === P)?.copy_text;
  console.log(`      set-up: ${form} Online for Sample Client K; ${N} sections; section "${first.title}" carries the family name`);

  const w = await walker(BASE);
  try {
    const page = await w.open(OFFICER, W), stale = await w.open(OFFICER, W);
    const url = `/cases/${caseId}/sheet/${itemId}`;
    const open = async (p = page) => { await p.goto(url); await w.settle(p, "the answer sheet"); await p.locator(`[data-section="${K}"]`).waitFor({ timeout: 20_000 }); await p.locator("body").focus(); };
    const card = (p = page) => p.locator(`[data-section="${K}"]`);
    const progress = async (p = page) => (await p.locator("[data-progress]").innerText()).trim();
    const wide = async (p = page) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await open(); await open(stale);

    // R5 words: the count on the page is the item's own.
    let it = await itemNow();
    const tickButtons = await page.getByRole("button", { name: /^Entered in the portal: / }).count();
    ok(`C7.3-40 pass (R5, QA-323): at ${W} px every section has its "Entered in the portal" button and the sheet says "${N} of ${N} sections still to tick", the number the item's own words give`,
      tickButtons === N && (await progress()) === `${N} of ${N} sections still to tick “Entered in the portal”` && (it.reason ?? "").includes(`${N} of ${N} section`) && it.state === "to_do" && (await wide()),
      { buttons: tickButtons, page: await progress(), item: [it.state, it.reason], noSideScroll: await wide() });

    // R1 by keyboard: tick the first section.
    await tabTo(page, card().getByRole("button", { name: `Entered in the portal: ${first.title}` }), "the first section's tick");
    await page.keyboard.press("Enter");
    await card().locator('[data-tick="entered"]').waitFor({ timeout: 15_000 });
    s = await sheet();
    const pill = (await card().locator("[data-section-state]").innerText()).trim();
    const focusOnOff = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    ok(`C7.3-41 pass (R1): by keyboard the officer ticks "${first.title}"; the section shows who and when, the count drops to ${N - 1} of ${N}, the focus stays on the section ("Take the tick off"), and the server holds the tick by the officer`,
      /^Entered by .+, \d/.test(pill) && (await progress()).startsWith(`${N - 1} of ${N}`) && focusOnOff === `Take the tick off ${first.title}` && s.sections.find((x) => x.key === K)?.entered?.by === OFFICER,
      { pill, progress: await progress(), focus: focusOnOff, server: s.sections.find((x) => x.key === K)?.entered });

    // R2 by keyboard: no reason → refused on the field; Escape keeps the tick.
    await tabTo(page, card().getByRole("button", { name: `Take the tick off ${first.title}` }), "Take the tick off");
    await page.keyboard.press("Enter");
    const reasonBox = card().getByLabel("Why does the tick come off? (required)");
    await reasonBox.waitFor({ timeout: 5_000 });
    const focusedReason = await reasonBox.evaluate((el) => document.activeElement === el);
    await tabTo(page, card().locator('button[type="submit"]'), "the submit button");
    await page.keyboard.press("Enter");
    const fieldError = (await card().locator('[role="alert"]').first().innerText().catch(() => "")).trim();
    s = await sheet();
    ok("C7.3-42 fail (R2): taking the tick off with no reason is refused on the reason field (the box had the focus), and the tick stays on the server",
      focusedReason && fieldError === "Say why the tick comes off." && !!s.sections.find((x) => x.key === K)?.entered, { focusedReason, fieldError, entered: s.sections.find((x) => x.key === K)?.entered });
    await reasonBox.focus(); await page.keyboard.press("Escape");
    const closed = (await reasonBox.count()) === 0, back = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    ok("C7.3-43 pass (R2): Escape closes the reason form without a change; the focus returns to \"Take the tick off\" and the section is still ticked", closed && back === `Take the tick off ${first.title}` && (await card().locator('[data-tick="entered"]').count()) === 1, { closed, focus: back });

    const REASON = "Typed into the wrong application in the portal (Sample)";
    await page.keyboard.press("Enter");
    await reasonBox.waitFor({ timeout: 5_000 });
    await page.keyboard.type(REASON);
    await tabTo(page, card().locator('button[type="submit"]'), "the submit button");
    await page.keyboard.press("Enter");
    await card().locator("[data-unticked]").waitFor({ timeout: 15_000 });
    s = await sheet();
    const shownOff = (await card().locator("[data-unticked]").innerText()).trim();
    const focusTick = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    ok("C7.3-44 pass (R2): with a reason the tick comes off: the section shows who took it off and the reason, the count is back to all, the focus is on its tick button, and the server says not ticked",
      shownOff.includes(REASON) && /^Tick taken off by /.test(shownOff) && (await progress()).startsWith(`${N} of ${N}`) && focusTick === `Entered in the portal: ${first.title}` && !s.sections.find((x) => x.key === K)?.entered,
      { shown: shownOff, progress: await progress(), focus: focusTick });

    // R3: the second tab read the sheet before an answer changed; its tick is refused, Reload brings the new answer.
    await answer(caseId, P, "person.family_name", "SAMPLEKA"); await confirmAll(caseId, P);
    await tabTo(stale, card(stale).getByRole("button", { name: `Entered in the portal: ${first.title}` }), "the stale tab's tick");
    await stale.keyboard.press("Enter");
    await card(stale).getByRole("button", { name: "Reload" }).waitFor({ timeout: 15_000 });
    const staleWords = (await card(stale).innerText());
    s = await sheet();
    ok("C7.3-45 fail (R3): a tick from a tab opened before an answer changed is refused: the section says it changed since the sheet was opened and offers Reload, and nothing is ticked on the server",
      /Changed since you opened the sheet/.test(staleWords) && /changed since you read the sheet/.test(staleWords) && !s.sections.find((x) => x.key === K)?.entered, { entered: s.sections.find((x) => x.key === K)?.entered });
    await tabTo(stale, card(stale).getByRole("button", { name: "Reload" }), "Reload");
    await stale.keyboard.press("Enter");
    await card(stale).getByText("SAMPLEKA", { exact: true }).first().waitFor({ timeout: 15_000 });
    ok("C7.3-46 pass (R3): Reload (by keyboard) shows the new answer and clears the notice", (await card(stale).getByRole("button", { name: "Reload" }).count()) === 0);

    // R4: tick, then an answer changes: the tick is cleared and the section says why.
    await open();
    await tabTo(page, card().getByRole("button", { name: `Entered in the portal: ${first.title}` }), "the tick");
    await page.keyboard.press("Enter");
    await card().locator('[data-tick="entered"]').waitFor({ timeout: 15_000 });
    ok("C7.3-47 fail (R4): a ticked section whose answers did not change shows no \"tick cleared\" and lists no change", (await card().locator("[data-changes]").count()) === 0 && !/Tick cleared/.test(await card().innerText()));
    await answer(caseId, P, "person.family_name", "SAMPLEKB"); await confirmAll(caseId, P);
    await open();
    const why = (await card().locator("[data-changes]").innerText().catch(() => "")).replace(/\s+/g, " ");
    it = await itemNow();
    ok("C7.3-48 pass (R4): after an answer changes, the section reads \"Tick cleared: answers changed\", names the answer (was SAMPLEKA, now SAMPLEKB), asks to tick again, counts it as still to tick, and the item is not Done",
      /Tick cleared: answers changed/.test(await card().locator("[data-section-state]").innerText()) && /was SAMPLEKA, now SAMPLEKB/.test(why) && /tick again/.test(why) && (await progress()).startsWith(`${N} of ${N}`) && it.state !== "done" && name !== "SAMPLEKB",
      { why, progress: await progress(), state: it.state });

    // R5: every other section ticked (API), the last by keyboard → Done, in the item's own words.
    s = await sheet();
    for (const x of s.sections.filter((y) => y.key !== K)) await call("POST", `/runtime/items/${itemId}/screens/${x.key}/entered`, { version: x.version }, OFFICER);
    await open();
    it = await itemNow();
    ok(`C7.3-49 fail (R5): with only "${first.title}" still to tick, the page says "1 of ${N}" and the item is not Done`, (await progress()).startsWith(`1 of ${N}`) && it.state !== "done" && (await page.locator("[data-item-state]").getAttribute("data-item-state")) === it.state, { progress: await progress(), state: it.state });
    await tabTo(page, card().getByRole("button", { name: `Entered in the portal: ${first.title}` }), "the re-tick");
    await page.keyboard.press("Enter");
    await page.locator('[data-item-state="done"]').waitFor({ timeout: 15_000 });
    it = await itemNow();
    ok("C7.3-50 pass (R5): ticking the last section by keyboard brings the item to Done: the page reads \"Every section is ticked\" and Done, as the server does",
      (await progress()) === "Every section is ticked “Entered in the portal”" && it.state === "done" && /Done/.test(await page.locator("[data-item-state]").innerText()) && (await wide()), { progress: await progress(), state: it.state, reason: it.reason });

    // R1 fail by screens: a client opening the sheet's address gets no sheet and no tick. A configuration author never
    // reaches it as themself: the case side switches a configuration persona to the simulated case officer
    // (runtime/cases.tsx), so the author's refusal is the server's, proven by C7.3-20 and C7.3-24 (403).
    const cp = await w.open(CLIENT, W);
    await cp.goto(url); await w.settle(cp, "the sheet as the client");
    const client = { sheet: await cp.locator("[data-answer-sheet]").count(), ticks: await cp.getByRole("button", { name: /Entered in the portal|Take the tick off/ }).count(), text: (await cp.locator("body").innerText()).match(/This page is for the case officer[^\n]*/)?.[0] ?? "" };
    ok("C7.3-51 fail (R1): a client opening the sheet's address gets no answer sheet and no tick control, and is told it is the case officer's", client.sheet === 0 && client.ticks === 0 && !!client.text, client);
    ok("C7.3-52 pass: no page error on any screen walked", w.errors.length === 0, w.errors);
  } finally { await w.close(); }
});
