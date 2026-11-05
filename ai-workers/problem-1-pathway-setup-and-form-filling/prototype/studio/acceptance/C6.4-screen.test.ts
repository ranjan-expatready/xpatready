// C6.4 (a) the Documents panel on the case page, walked in a browser at 1440 px (concept
// screens/M3-design-2026-11-04/documents/concept-draft.md §4 as changed by screens/C6.4-checkpoint/challenge-r2.md,
// approved by the tech lead on #1073). Continues the pack's numbering at C6.4-31. Every check compares the screen with
// the API's own answer for the same case, read in the same step, and names no document (challenge B1): so it holds on
// the configured checkpoint, on the fixture, and after the release's lines change. Each check has a pass and a fail.
// All values Sample; synthetic files only (P-133). No model call (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/acceptance/C6.4-screen.test.ts 4440 xr_studio_accept
import type { Page } from "playwright";
import { FAMILY, call, main, needVisitorVisa, ok, openCase, yearsAgo } from "./lib/m3.ts";
import { walker } from "./lib/browser.ts";

type Line = { id: string; label: string; state: string; state_words: string; required: boolean; version: number; kept: boolean; who_words: string; reason: string; missing: { key: string; question: string; answered: boolean; on: "case" | "person" }[]; lineage: string };
type Person = { subject: string; label: string; applies: boolean; lines: Line[]; waiting: Line[]; not_needed: Line[] };
type List = { derived?: boolean; people: Person[] };
const PORT = process.argv[2] ?? "4440", BASE = `http://127.0.0.1:${PORT}`;
const HAVE = ["received", "being_checked", "approved"];

await main("C6.4", "Documents panel on the case page (screen, 1440 px)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const officer = c.officer;
  const list = async (id = c.id) => (await call("GET", `/runtime/cases/${id}/checklist`, undefined, officer)).body as List;
  const w = await walker(BASE);
  try {
    const page = await w.open(officer, 1440);
    const open = async (id = c.id) => { await page.goto(`/cases/${id}`); await w.settle(page, "the case page"); await page.locator("[data-documents-panel]").waitFor({ timeout: 20_000 }); };
    /** What the panel shows, per person: line labels and state words, the received count, the waiting lines. */
    const shown = (p: Page) => p.evaluate(() => [...document.querySelectorAll("[data-documents-person]")].map((s) => ({
      subject: s.getAttribute("data-documents-person"),
      lines: [...s.querySelectorAll("[data-line]")].map((l) => ({ id: l.getAttribute("data-line"), label: l.querySelector("[data-line-label]")?.textContent ?? "", state: l.querySelector("[data-state-words]")?.textContent ?? "", who: l.querySelector("[data-who]")?.textContent ?? "", menu: !!l.querySelector("[data-line-menu]") })),
      waiting: [...s.querySelectorAll("[data-waiting-line]")].map((l) => ({ lineage: l.getAttribute("data-waiting-line"), text: l.textContent ?? "", link: !!l.querySelector("[data-answer-first]"), menu: !!l.querySelector("[data-line-menu]") })),
      received: s.querySelector("[data-received]")?.textContent ?? null, notTravelling: !!s.querySelector("[data-not-travelling]") })));
    const same = (api: List, scr: Awaited<ReturnType<typeof shown>>) => api.people.every((p) => {
      const s = scr.find((x) => x.subject === p.subject); if (!s) return false;
      const need = p.lines.filter((l) => l.required), n = need.filter((l) => HAVE.includes(l.state)).length;
      return s.lines.length === p.lines.length && p.lines.every((l) => s.lines.some((x) => x.id === l.id && x.label === l.label && x.state === l.state_words && x.who === l.who_words))
        && s.waiting.length === p.waiting.length && (need.length ? s.received === `${n} of ${need.length} received` : s.received === null);
    });
    const menuOf = async (lineId: string) => { await page.locator(`[data-line="${lineId}"] [data-line-menu]`).click(); const items = await page.locator("[data-action]").evaluateAll((e) => e.map((x) => x.getAttribute("data-action"))); return items; };
    const closeMenu = () => page.keyboard.press("Escape");
    const lineState = async (lineId: string) => (await page.locator(`[data-line="${lineId}"]`).getAttribute("data-state")) ?? "";
    const waitState = async (lineId: string, state: string) => { await page.locator(`[data-line="${lineId}"][data-state="${state}"]`).waitFor({ timeout: 15_000 }); };

    // 31. The groups and lines are the API's; a person not travelling shows that nothing is asked of them.
    await open();
    let api = await list(), scr = await shown(page);
    ok("C6.4-31 pass: the panel shows each person's lines, state words, whose line it is and \"n of m received\" exactly as the API answers them", !!api.people?.length && same(api, scr), { api: api.people?.map((p) => [p.label, p.lines.map((l) => l.label)]), scr });
    const apart = await openCase(vv, [{ role: "principal", name: "Sample Client G", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse G", dob: yearsAgo(38), applies: false }]);
    await open(apart.id);
    const ga = (await shown(page)).find((x) => x.subject === apart.subjects["Sample Spouse G"]);
    ok("C6.4-31 fail: a spouse not travelling shows \"Not travelling with this application: nothing is asked of them\" and no line", !!ga && ga.notTravelling && ga.lines.length === 0, ga);

    // 32. A waiting line: "May be needed", linked to its question, with no actions; the API refuses acting on it.
    await open();
    api = await list(); scr = await shown(page);
    const wp = api.people.find((p) => p.waiting.length), wl = wp?.waiting[0];
    const ws = wp ? scr.find((x) => x.subject === wp.subject)?.waiting.find((x) => x.lineage === wl!.lineage) : undefined;
    ok("C6.4-32 pass: a waiting line shows under \"May be needed\" with its reason and a link to the question to answer first", !!ws && ws.link && ws.text.includes(wl!.label) && ws.text.includes((wl!.missing[0]?.question ?? "\u0000").replace(/^["“]|["”]$/g, "")), { wl: wl && [wl.label, wl.missing], ws });
    ok("C6.4-32 fail: the waiting line has no actions, and the API refuses a request on it (404)", !!ws && !ws.menu && (await call("POST", `/runtime/checklist-lines/${encodeURIComponent(wl!.id)}/request`, {}, officer)).status === 404);

    // 33. Request from the menu; then Request is gone. A Not applicable line offers Request again and no upload.
    const first = api.people.flatMap((p) => p.lines).find((l) => l.state === "not_requested")!;
    let items = await menuOf(first.id);
    const offered = items.includes("request") && items.includes("upload") && items.includes("not-applicable");
    await page.locator("[data-action=request]").click();
    await waitState(first.id, "requested");
    items = await menuOf(first.id); await closeMenu();
    const after = (await list()).people.flatMap((p) => p.lines).find((l) => l.id === first.id);
    ok("C6.4-33 pass: Request from the line's menu turns the pill to the API's state words (Requested), and Request is then no longer offered", offered && after?.state === "requested" && (await page.locator(`[data-line="${first.id}"] [data-state-words]`).textContent()) === after.state_words && !items.includes("request"), { offered, items, after: after?.state });
    const second = (await list()).people.flatMap((p) => p.lines).find((l) => l.state === "not_requested" && l.id !== first.id)!;
    await call("POST", `/runtime/checklist-lines/${second.id}/not-applicable`, { reason: "Sample: set by the test" }, officer);
    await open();
    items = await menuOf(second.id); await closeMenu();
    ok("C6.4-33 fail: on a Not applicable line the menu offers Request again and no upload", items.includes("request") && !items.includes("upload"), items);

    // 34. Upload a PDF: Received, and the person's count goes up by one. A text file named .pdf: the API's words, no change.
    const before = await shown(page);
    const holder = (await list()).people.find((p) => p.lines.some((l) => l.id === first.id))!;
    const count = (s: Awaited<ReturnType<typeof shown>>) => Number((s.find((x) => x.subject === holder.subject)?.received ?? "0").split(" ")[0]);
    await page.locator(`[data-line="${first.id}"] [data-upload-input]`).setInputFiles({ name: "sample-document.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% Sample synthetic document (C6.4-34)\n") });
    await waitState(first.id, "received");
    ok("C6.4-34 pass: uploading a PDF through the line gives Received, and \"n of m received\" goes up by one", (await list()).people.flatMap((p) => p.lines).find((l) => l.id === first.id)?.state === "received" && count(await shown(page)) === count(before) + 1, { before: count(before), after: count(await shown(page)) });
    const third = (await list()).people.flatMap((p) => p.lines).find((l) => l.state === "not_requested")!;
    await page.locator(`[data-line="${third.id}"] [data-upload-input]`).setInputFiles({ name: "not-really.pdf", mimeType: "application/pdf", buffer: Buffer.from("Sample: plain text, not a PDF") });
    const err34 = page.locator(`[data-line="${third.id}"] [data-line-error]`);
    await err34.waitFor({ timeout: 15_000 });
    ok("C6.4-34 fail: a text file named .pdf shows the API's words on that line, and its state stays as it was", /PDF, JPEG or PNG/.test((await err34.textContent()) ?? "") && (await lineState(third.id)) === "not_requested", await err34.textContent());

    // 35. Not applicable with a reason; with no reason, the error under the field and nothing changes.
    await menuOf(third.id); await page.locator("[data-action=not-applicable]").click();
    await page.locator("[data-na-save]").click();
    const fieldErr = page.getByRole("dialog").locator("[role=alert]");
    await fieldErr.first().waitFor({ timeout: 15_000 });
    const emptyWords = await fieldErr.first().textContent();
    ok("C6.4-35 fail: Not applicable with an empty reason shows the API's field error under Reason, and the line is unchanged", /reason/i.test(emptyWords ?? "") && (await list()).people.flatMap((p) => p.lines).find((l) => l.id === third.id)?.state === "not_requested", emptyWords);
    await page.locator("[data-na-reason]").fill("Sample: not needed for this test case");
    await page.locator("[data-na-save]").click();
    await waitState(third.id, "not_applicable");
    ok("C6.4-35 pass: Not applicable with a reason: the line stays on the list as Not applicable, with the reason shown", (await page.locator(`[data-line="${third.id}"]`).textContent())?.includes("Sample: not needed for this test case") === true);

    // 36. Changed elsewhere after the panel loaded: the click shows the API's 409 words and the list reloads.
    const fourth = (await list()).people.flatMap((p) => p.lines).find((l) => l.state === "not_requested")!;
    await open();
    await call("POST", `/runtime/checklist-lines/${fourth.id}/request`, {}, officer); // someone else asks for it meanwhile
    await menuOf(fourth.id); await page.locator("[data-action=request]").click();
    const err36 = page.locator(`[data-line="${fourth.id}"] [data-line-error]`);
    await err36.waitFor({ timeout: 15_000 });
    await waitState(fourth.id, "requested");
    ok("C6.4-36 pass: a line changed after the panel loaded: the click shows the API's words (changed after you opened it) and the list reloads to the state now", /changed after you opened it/.test((await err36.textContent()) ?? ""), await err36.textContent());
    const fifth = (await list()).people.flatMap((p) => p.lines).find((l) => l.state === "not_requested");
    if (fifth) { await open(); await menuOf(fifth.id); await page.locator("[data-action=request]").click(); await waitState(fifth.id, "requested"); }
    ok("C6.4-36 fail: with no change in between, the same click shows no error", !!fifth && (await page.locator(`[data-line="${fifth.id}"] [data-line-error]`).count()) === 0);

    // 37. Answering a waiting line's question in the Agent view moves the line on the panel as the API moves it, no reload.
    await open();
    api = await list();
    const wp2 = api.people.find((p) => p.waiting.length), wl2 = wp2?.waiting[0];
    /** Answers one "answer first" question by screen: the panel's link while the line waits (else the same address), the
     *  question's Add or Edit in the Agent view, then a choice (the pick-th answer), or a date (today), and Save. */
    const answerBy = async (m: { key: string; on: "case" | "person" }, pick: number, who = wp2!.subject, lineage = wl2!.lineage) => {
      const anchor = `a-${m.on === "case" ? c.caseSubject : who}-${m.key.replace(/[^a-z0-9_]/gi, "-")}`;
      const link = page.locator(`[data-documents-person="${who}"] [data-waiting-line="${lineage}"] [data-answer-first="${m.key}"]`).first();
      if (await link.count()) await link.click(); else await page.evaluate((h) => { window.location.hash = h; }, anchor);
      const row = page.locator(`[id="${anchor}"]`);
      await row.getByRole("button", { name: /^(Add|Edit) / }).click();
      const dlg = page.getByRole("dialog"), sel = dlg.locator("select"), radios = dlg.locator("input[type=radio]"), day = dlg.getByLabel("Day", { exact: true });
      let kind: "choice" | "date" = "choice";
      if (await sel.count()) await sel.first().selectOption({ index: pick });
      else if (await radios.count()) await radios.nth(pick - 1).check();
      else if (await day.count()) { const t = new Date(); kind = "date"; await day.fill(String(t.getDate())); await dlg.getByLabel("Month", { exact: true }).fill(String(t.getMonth() + 1)); await dlg.getByLabel("Year", { exact: true }).fill(String(t.getFullYear())); }
      else throw new Error(`C6.4-37: the question ${m.key} is neither a choice nor a date; this walk cannot answer it`);
      await dlg.getByRole("button", { name: "Save" }).click();
      await dlg.waitFor({ state: "detached", timeout: 15_000 });
      await w.settle(page, "after the answer");
      return kind;
    };
    const placeOf = (l: List, p: string, lineage: string) => { const x = l.people.find((y) => y.subject === p)!; return x.lines.some((y) => y.lineage === lineage) ? "lines" : x.waiting.some((y) => y.lineage === lineage) ? "waiting" : x.not_needed.some((y) => y.lineage === lineage) ? "not_needed" : "gone"; };
    const screenPlace = async (p: string, lineage: string, label: string) => page.evaluate(([pp, lin, lab]) => { const s = document.querySelector(`[data-documents-person="${pp}"]`); if (!s) return "gone"; if (s.querySelector(`[data-waiting-line="${lin}"]`)) return "waiting"; if ([...s.querySelectorAll("[data-line-label]")].some((e) => e.textContent === lab)) return "lines"; if ([...(s.querySelector("[data-not-needed]")?.querySelectorAll("li") ?? [])].some((e) => e.textContent?.startsWith(`${lab}:`))) return "not_needed"; return "gone"; }, [p, lineage, label] as const);
    if (wl2) {
      const nav = await page.evaluate(() => performance.getEntriesByType("navigation").length);
      // Each question the line waits on, in turn, until it leaves "May be needed" (at most four).
      let p1 = "waiting", last: { key: string; on: "case" | "person" } | null = null, lastKind = "";
      for (let i = 0; i < 4 && p1 === "waiting"; i++) {
        const now = (await list()).people.find((x) => x.subject === wp2!.subject)!.waiting.find((x) => x.lineage === wl2.lineage);
        const m = now?.missing.find((x) => !x.answered) ?? now?.missing[0];
        if (!m) break;
        lastKind = await answerBy(m, 1); last = m;
        p1 = placeOf(await list(), wp2!.subject, wl2.lineage);
      }
      const s1 = await screenPlace(wp2!.subject, wl2.lineage, wl2.label);
      ok("C6.4-37 pass: answering the waiting line's questions in the Agent view (reached from the panel's links) moves the line on the panel where the API puts it, without a page reload",
        p1 !== "waiting" && p1 === s1 && (await page.evaluate(() => performance.getEntriesByType("navigation").length)) === nav, { p1, s1, last: last?.key });
      // The other way: the choice this line was settled by, else (it was settled by a date) a line that now waits on a choice,
      // its answers in turn: after each, the panel shows the line where the API puts it, and at least two answers put it in
      // different places (at most seven).
      const cand = last && lastKind === "choice" ? { who: wp2!.subject, l: wl2, m: last }
        : (await list()).people.flatMap((x) => x.waiting.map((l) => ({ who: x.subject, l, m: l.missing.find((y) => !y.answered) }))).find((x) => !!x.m);
      const seen = new Set<string>(); let follows = !!cand, p2 = "", s2 = "";
      if (cand) for (let pick = 1; pick <= 7 && seen.size < 2; pick++) {
        let kind: string;
        try { kind = await answerBy(cand.m!, pick, cand.who, cand.l.lineage); } catch { break; } // fewer answers than tries: the step fails below
        if (kind !== "choice") break;
        p2 = placeOf(await list(), cand.who, cand.l.lineage); s2 = await screenPlace(cand.who, cand.l.lineage, cand.l.label);
        follows &&= p2 === s2; seen.add(p2);
      }
      ok("C6.4-37 fail: answering a choice the other way, the panel follows the API again each time (needed, not needed, still waiting, or kept when acted on)", follows && seen.size >= 2, { line: cand?.l.label, places: [...seen], p2, s2 });
    } else {
      ok("C6.4-37 pass: answering the waiting line's questions in the Agent view moves the line on the panel where the API puts it, without a page reload", false, "no waiting line on this release to answer");
      ok("C6.4-37 fail: answering it the other way, the panel follows the API again (needed, not needed, or kept when acted on)", false, "no waiting line on this release to answer");
    }

    // 38. Keyboard only, key presses only (review and break M1): the menu opens and acts from the keyboard, and after each
    // action, and when each dialog closes, focus is back on that line's ⋯ button (WCAG 2.4.3), so the next Tab goes on.
    await open();
    const sixth = (await list()).people.flatMap((p) => p.lines).find((l) => l.state === "not_requested");
    /** Focus settles on the line's ⋯ button within 3 s (false when it never does: the step below fails on it). */
    const onTrigger = (id: string) => page.waitForFunction((x) => document.activeElement === document.querySelector(`[data-line="${x}"] [data-line-menu]`), id, { timeout: 3_000 }).then(() => true, () => false);
    /** Arrow down through the open menu to the item, then Enter. Each key waits for the menu to move focus first (a key
     *  pressed before the menu has focused an item would skip one); a menu that never focuses fails loudly. */
    const focused = () => page.evaluate(() => document.activeElement?.getAttribute("data-action") ?? null);
    const pick = async (action: string) => {
      await page.waitForFunction(() => !!document.activeElement?.getAttribute("data-action"), undefined, { timeout: 10_000 });
      for (let i = 0; i < 6 && (await focused()) !== action; i++) {
        const was = await focused();
        await page.keyboard.press("ArrowDown");
        await page.waitForFunction((w) => document.activeElement?.getAttribute("data-action") !== w, was, { timeout: 5_000 });
      }
      if ((await focused()) !== action) throw new Error(`C6.4-38: the menu has no "${action}" item to reach by keys`);
      await page.keyboard.press("Enter");
    };
    const focusAfter: Record<string, boolean> = {};
    if (sixth) {
      await page.locator(`[data-line="${sixth.id}"] [data-line-menu]`).focus(); // the starting point; everything after is keys
      await page.keyboard.press("Enter"); await page.locator("[data-action]").first().waitFor({ timeout: 10_000 });
      await pick("request"); await waitState(sixth.id, "requested");
      focusAfter.request = await onTrigger(sixth.id);
      await page.keyboard.press("Enter"); await page.locator("[data-action]").first().waitFor({ timeout: 10_000 });
      await pick("not-applicable"); await page.locator("[data-na-reason]").waitFor({ timeout: 10_000 });
      await page.keyboard.type("Sample: keyboard check"); await page.keyboard.press("Enter");
      await waitState(sixth.id, "not_applicable");
      focusAfter.notApplicable = await onTrigger(sixth.id);
      await page.keyboard.press("Enter"); await page.locator("[data-action]").first().waitFor({ timeout: 10_000 });
      await pick("history"); await page.locator("[data-history]").waitFor({ timeout: 10_000 });
      await page.keyboard.press("Escape"); await page.locator("[data-history]").waitFor({ state: "detached", timeout: 10_000 });
      focusAfter.history = await onTrigger(sixth.id);
    }
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    // Break M2: a reason of 500 characters with no space (a pasted address) must wrap, never widen the page.
    const longLine = (await list()).people.flatMap((p) => p.lines).find((l) => l.state === "not_requested");
    if (longLine) await call("POST", `/runtime/checklist-lines/${longLine.id}/not-applicable`, { reason: `https://www.canada.ca/${"x".repeat(470)}` }, officer);
    const axe: Record<number, string[]> = {}, fits: Record<number, boolean> = {};
    for (const width of [1440, 1024, 400]) {
      await page.setViewportSize({ width, height: 900 }); await open();
      const r = await new AxeBuilder({ page }).include("[data-documents-panel]").withTags(["wcag2a", "wcag2aa"]).analyze();
      axe[width] = r.violations.map((v) => `${v.id} (${v.nodes.length})`);
      fits[width] = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    }
    const scroll = !!longLine && Object.values(fits).every(Boolean);
    ok("C6.4-38 pass: keys only: Request, Not applicable (typed reason, Enter) and History act from the keyboard, and focus returns to the line's ⋯ button after each", !!sixth && Object.keys(focusAfter).length === 3 && Object.values(focusAfter).every(Boolean), focusAfter);
    ok("C6.4-38 fail: no accessibility violation in the panel at 1440, 1024 or 400 px, and no sideways scroll at any of them, even with a 500-character reason with no space", Object.values(axe).every((v) => v.length === 0) && scroll, { axe, fits });
    ok("C6.4-38 data: no page error while walking the panel", w.errors.length === 0, w.errors.slice(0, 3));
  } finally { await w.close(); }
});
