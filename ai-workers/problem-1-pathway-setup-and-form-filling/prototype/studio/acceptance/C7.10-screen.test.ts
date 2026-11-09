// C7.10 by screens at 1440 px (row B143; AG-7-27, BR-30; P-348 (3): a capability counts when a person can do it by
// screens). The case officer opens a case: the header shows the case's readiness (lowest state and figure); Ready to file
// shows the filing's figure with "How this is worked out"; passing a warning by screens moves the figure up and counts
// the pass; Ready to file is still refused under 100; once everything else is done the figure reads Ready at 100, the
// person presses Ready to file, and the next capability's first step (C8.2's "Record the submission") is open. Every
// figure on the screen is compared with the server's own answer. A pass and a fail per rule. Synthetic data; US$0.
// SHOTS=<folder> saves the walk's screenshots (deviceScaleFactor 2).
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/acceptance/C7.10-screen.test.ts 4440 xr_studio_accept
import { call, expectedFor, fillEverything, firms, main, needVisitorVisa, ok, openCase, prepare, readinessOf, signByHand, validateRoundTrip, yearsAgo, type Prepare } from "./lib/m3.ts";
import { walker } from "./lib/browser.ts";
import { mkdirSync } from "node:fs";

const PORT = process.argv[2] ?? "4440", BASE = `http://127.0.0.1:${PORT}`, SHOTS = process.env.SHOTS;
type Figure = { filing: string; state: string; score: number; done: number; countable: number; passed: number; items: unknown[]; rule: string };
type View = Prepare & { figures?: Figure[]; case_figure?: { state: string; score: number; score_filing: string } | null };
const WORDS: Record<string, string> = { not_ready: "Not ready", attention: "Attention", ready: "Ready" };

await main("C7.10", "Readiness figure by screens (Ready to file and the case header, 1440 px)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? "user-O";
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client W", dob: yearsAgo(36) }], { representative: f.rep, caseOfficers: [officer] });
  await fillEverything(c.id); // set-up: the facts answered and confirmed (C6.9's own pack walks that by screens)
  const view = async () => (await prepare(c.id, officer)).p as View | null;
  let v = await view();
  const fid = v?.filings[0]?.id ?? "", fig = () => v?.figures?.find((g) => g.filing === fid);

  const w = await walker(BASE);
  try {
    const ctx = await w.browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1, baseURL: BASE });
    await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* private window */ } }, officer);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => w.errors.push(String(e).slice(0, 200)));
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });
    const shot = async (name: string, el?: string) => { if (!SHOTS) return; if (el) await page.locator(el).first().screenshot({ path: `${SHOTS}/${name}.png` }); else await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
    const HEADER = "main h1 >> xpath=../.."; // the case header block (reference, pills, team, the readiness pill)
    const row = () => page.locator(`[data-figure="${fid}"]`);
    const open = async () => { await page.goto(`/cases/${c.id}`); await w.settle(page, "the case page"); await row().waitFor({ timeout: 20_000 }); };
    const shown = async () => ({ state: await row().getAttribute("data-figure-state"), score: Number(await row().getAttribute("data-figure-score")), text: (await row().innerText()).replace(/\s+/g, " ") });
    const pill = async () => (await page.locator("[data-case-figure]").innerText()).replace(/\s+/g, " ");

    await open();
    let s = await shown(), g = fig();
    ok("C7.10-s1 pass (BR-5): the case header shows the case's readiness in words and figure, as the server gives it",
      !!v?.case_figure && (await pill()).includes(`Readiness: ${WORDS[v.case_figure.state]}`) && (await pill()).includes(`${v.case_figure.score}%`), { pill: await pill(), server: v?.case_figure });
    await shot("01-case-header", HEADER);
    ok("C7.10-s2 fail (BR-1, BR-4): Ready to file shows the filing Not ready under 100 with \"n of m done\", the same as the server",
      !!g && s.state === g.state && s.score === g.score && g.state === "not_ready" && g.score < 100 && s.text.includes(`${g.score}%`) && s.text.includes(`${g.done} of ${g.countable} done`) && s.text.includes("Not ready"), { shown: s, server: g });
    await row().locator("[data-figure-how] summary").click();
    const items = await row().locator("[data-figure-item]").count(), rule = await row().locator("[data-figure-rule]").innerText();
    ok("C7.10-s3 pass (BR-7): \"How this is worked out\" opens by its summary and lists every counted item with Done or Not done, then the rule in words",
      items === g?.countable && rule === g?.rule && (await row().locator('[data-figure-item][data-done="no"]').count()) === (g?.countable ?? 0) - (g?.done ?? 0), { items, countable: g?.countable });
    await row().scrollIntoViewIfNeeded(); await shot("02-figure-how-it-is-worked-out", `[data-readiness-filing="${fid}"]`);

    // Pass a plain warning by screens: the figure rises and the pass is counted, as on the server.
    const before = g!;
    const line = page.locator(`[data-readiness-filing="${fid}"] [data-line][data-severity="warning"]`).first();
    const code = await line.getAttribute("data-code");
    await line.getByRole("button", { name: /Pass with a reason/ }).click();
    await line.locator("[data-pass-form] textarea").fill("Passport seen in the original at the office (Sample)");
    await line.locator("[data-pass-form]").getByRole("button", { name: "Pass", exact: true }).click();
    await page.locator(`[data-figure="${fid}"] [data-figure-count]`, { hasText: "passed with a reason" }).waitFor({ timeout: 15_000 });
    await w.settle(page, "after the pass");
    v = await view(); g = fig(); s = await shown();
    ok(`C7.10-s4 pass (BR-3): a warning (${code}) passed with a reason by screens counts as done: the figure rises, "1 passed with a reason" shows, screen and server agree`,
      !!code && !!g && g.score > before.score && g.passed === before.passed + 1 && s.score === g.score && s.text.includes(`${g.passed} passed with a reason`), { before: before.score, after: g?.score, shown: s.text });
    await shot("03-after-pass", `[data-readiness-filing="${fid}"]`);
    await page.locator(`[data-readiness-filing="${fid}"] [data-mark-ready]`).click();
    await page.locator(`[data-readiness-filing="${fid}"] [data-refusal]`).waitFor({ timeout: 15_000 });
    s = await shown();
    ok("C7.10-s5 fail (BR-6): under 100 the person presses Ready to file and is refused with the lines; the figure stays under 100 (it never gates, it agrees)",
      s.score < 100 && (await page.locator(`[data-readiness-filing="${fid}"] [data-refusal]`).innerText()).includes("Not ready to file"), s);

    // Set-up, as C7.6's own packs do by the product's routes: the barcode copy validated, the hand-signed form signed and
    // scanned, the representative's review, every other warning passed with a reason. The person then presses Ready to file.
    const e = (await expectedFor(c.id))?.["Sample Client W"];
    for (const i of (v?.items ?? []).filter((x) => x.kind === "form" && !["ready", "done"].includes(x.state))) {
      if (i.channel === "PDF_UPLOAD" && e?.forms.some((l) => l.form === i.form && l.barcode)) await validateRoundTrip(c.id, i.form!, i.subject);
      if (i.signature === "HAND_SCANNED") await signByHand(c.id, i.id, i.form!, i.subject);
    }
    await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed (Sample)", facts_hash: readinessOf(await view(), fid)?.facts_hash }, f.rep ?? "");
    for (const l of readinessOf(await view(), fid)?.warns ?? []) await call("POST", `/runtime/filings/${fid}/warnings/${l.code}/pass`, { reason: "Passed for the walk (Sample)", key: l.key }, officer);
    await open();
    v = await view(); g = fig(); s = await shown();
    ok("C7.10-s6 pass (BR-1, BR-4): with nothing left open, Ready to file shows Ready at 100 and the header reads Ready · 100%, as the server",
      g?.state === "ready" && g.score === 100 && readinessOf(v, fid)?.ready === true && s.state === "ready" && s.score === 100 && (await pill()).includes("Readiness: Ready · 100%"), { shown: s, pill: await pill() });
    await shot("04-ready-100", `[data-readiness-filing="${fid}"]`);
    await page.locator(`[data-readiness-filing="${fid}"] [data-mark-ready]`).click();
    await page.locator(`[data-readiness-filing="${fid}"][data-status="ready_to_file"]`).waitFor({ timeout: 15_000 });
    await w.settle(page, "after Ready to file");
    const record = page.getByRole("button", { name: /Record the submission/ }).first();
    ok("C7.10-s7 pass: the person presses Ready to file; the filing reads Ready to file and the next step, C8.2's \"Record the submission\", is open",
      (await page.locator(`[data-readiness-filing="${fid}"][data-status="ready_to_file"]`).count()) === 1 && (await record.count()) === 1 && await record.isEnabled());
    await record.scrollIntoViewIfNeeded(); await shot("05-ready-to-file-next-step");
    await page.locator("h1").first().scrollIntoViewIfNeeded(); await shot("06-case-header-ready", HEADER);
    ok("C7.10-s8 pass: no page error during the walk", w.errors.length === 0, w.errors);
  } finally { await w.close(); }
});
