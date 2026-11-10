// qa gate A walk of C10.2 (the finished story: the Paper IMM 5257 through Validate) by screens. The author loads the
// story through Demo › Load the finished story…; the case officer opens the family case from the Cases list and reads the
// story's end: the Online sheet Done, the family's three filings recorded, the Paper IMM 5257 waiting only for its Adobe
// Validate, and the next step's door ("Read back the validated copy") offered. Nothing is uploaded: a Validate is never
// simulated (P-46, P-171). API reads only to compare. US$0.
//   LIBDIR=<studio>/acceptance/lib tsx walk_c102.mts <port> <db> <outdir>
const [port, , out] = process.argv.slice(2);
const { walker } = await import(`${process.env.LIBDIR}/browser.ts`);
const { call } = await import(`${process.env.LIBDIR}/m3.ts`);
const log = (...a: unknown[]) => console.log(...a);
const w = await walker(`http://127.0.0.1:${port}`);
let n = 0; const shot = async (p: any, name: string, full = true) => { const f = `${out}/${String(n++).padStart(2, "0")}-${name}.png`; await p.screenshot({ path: f, fullPage: full }); log("  shot", f); };
const fails: string[] = []; const check = (label: string, cond: boolean, detail?: unknown) => { log(`${cond ? "PASS" : "FAIL"}  ${label}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 600)); if (!cond) fails.push(label); };
try {
  // 1. The author loads the finished story by screens.
  const a = await w.open("user-A", 1024);
  await a.goto("/"); await w.settle(a, "home");
  await a.getByRole("button", { name: /^Demo/ }).click();
  await a.getByRole("menuitem", { name: /Load the finished story/ }).click();
  const dlg = a.getByRole("dialog"); await dlg.waitFor({ timeout: 10_000 });
  const reset = dlg.getByRole("textbox"); if (await reset.count()) await reset.first().fill("RESET");
  await shot(a, "load-dialog", false);
  const t0 = Date.now();
  await dlg.locator("[data-finished-story-load]").click();
  await a.getByText(/^Finished story loaded$/).first().waitFor({ timeout: 900_000 });
  const secs = Math.round((Date.now() - t0) / 1000);
  const body = (await dlg.innerText()).slice(0, 2500);
  await shot(a, "story-loaded", false);
  log("loaded in", secs, "s; dialog:", body.replace(/\n+/g, " | ").slice(0, 1500));
  const st = (await call("GET", "/demo/status", undefined, "user-A")).body;
  const stages = (st?.story?.stages ?? []).map((x: any) => `${x.key}:${x.status}`).join(" ");
  check("1 the author loads the finished story by screens; the dialog says Finished story loaded", st?.story?.state === "done" && st?.checkpoint === "finished_story", { secs, stages });
  // 2. The case officer finds the family case in the Cases list.
  const o = await w.open("user-O", 1024);
  await o.goto("/cases"); await w.settle(o, "cases");
  const row = o.getByRole("link", { name: /SAMPLE-VV-FAMILY-1/ }).first();
  const rowCount = await row.count();
  await shot(o, "cases-list", false);
  if (rowCount) await row.click(); else { await o.getByText("SAMPLE-VV-FAMILY-1").first().click(); }
  await w.settle(o, "family case"); await o.locator("h1").first().waitFor();
  const caseId = o.url().split("/cases/")[1]?.split(/[/?#]/)[0];
  const header = (await o.getByText(/^Readiness:/).first().innerText().catch(() => "")).trim();
  await shot(o, "family-case");
  check("2 the officer opens SAMPLE-VV-FAMILY-1 from the Cases list", !!caseId && o.url().includes("/cases/"), { url: o.url(), header });
  const prep = (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, "user-O")).body;
  const people = (prep.people ?? []).map((p: any) => p.label);
  const paperItem = (prep.items ?? []).find((i: any) => i.channel === "PAPER" && i.kind === "form");
  const paperFiling = (prep.filings ?? []).find((f: any) => f.applicants.some((x: any) => x.subject === paperItem?.subject));
  log("people:", people, "| paper item:", paperItem?.form, paperItem?.state, paperItem?.reason, "| filings:", (prep.filings ?? []).map((f: any) => `${f.applicants[0]?.label}:${f.status}:${f.group}`));
  // 3. The Online sheet of the principal: Done.
  const online = (prep.items ?? []).filter((i: any) => i.channel === "ONLINE" && i.kind === "form");
  const sheetLink = o.getByRole("link", { name: /Open answer sheet/ });
  const sheetLines = await sheetLink.count();
  const sheetText = sheetLines ? (await sheetLink.first().locator("xpath=ancestor::*[self::li or self::p][1]").innerText()).trim() : "";
  check("3 the Online IMM 5257 line reads Done on the case page", sheetLines >= 1 && /Done/.test(sheetText) && online.every((i: any) => i.state === "done"), { sheetText: sheetText.slice(0, 200), online: online.map((i: any) => `${i.form}:${i.state}`) });
  if (sheetLines) { await sheetLink.first().click(); await w.settle(o, "sheet"); await o.locator("[data-progress]").waitFor(); const pr = (await o.locator("[data-progress]").innerText()).trim(); const ctl = await o.getByRole("button", { name: /^(Entered|Take the tick off)/ }).count(); await shot(o, "principal-sheet"); check("3b the principal's sheet: every section ticked, read-only once recorded", /^Every section is ticked/.test(pr) && ctl === 0, { pr, ctl }); await o.goBack(); await w.settle(o, "case back"); }
  // 4. The Paper IMM 5257 card: no mandatory field left empty; waits for Validate in Adobe; the read-back door offered.
  const card = o.locator("li, section, div").filter({ hasText: new RegExp(`IMM 5257 for ${paperItem?.subject_label ?? "Child 18 or over"}`) }).filter({ has: o.getByRole("button", { name: /Read back the validated copy|Read back again/ }) }).last();
  const cardCount = await card.count();
  let cardText = "";
  if (cardCount) { await card.scrollIntoViewIfNeeded(); cardText = (await card.innerText()).trim(); await card.screenshot({ path: `${out}/${String(n++).padStart(2, "0")}-paper-card.png` }); }
  log("paper card:", cardText.replace(/\n+/g, " | ").slice(0, 2000));
  const rb = o.getByRole("button", { name: /^Read back the validated copy$/ });
  check("4a the Paper IMM 5257 card waits only for its Adobe Validate and lists no mandatory field left empty", cardCount > 0 && /Validate IMM 5257 in Adobe/.test(cardText) && !/mandatory form fields? (would be )?left empty|mandatory field.*empty/i.test(cardText), cardText.slice(0, 400));
  check("4b the next step's door, \"Read back the validated copy\", is offered and enabled (not used: never simulated)", (await rb.count()) >= 1 && await rb.first().isEnabled(), await rb.count());
  // 5. Submission to IRCC: three filings recorded together; the Paper one split out, not recorded.
  const sub = o.locator("[data-submission]"); await sub.scrollIntoViewIfNeeded();
  const subText = (await sub.innerText()).trim();
  await sub.screenshot({ path: `${out}/${String(n++).padStart(2, "0")}-submission.png` });
  const rec = (prep.filings ?? []).filter((f: any) => f.status === "submitted");
  check("5 Submission to IRCC: the other three filings recorded in one group; the Paper filing split out and not recorded", rec.length === 3 && new Set(rec.map((f: any) => f.group)).size === 1 && paperFiling?.status !== "submitted" && !rec.some((f: any) => f.group === paperFiling?.group), { recorded: rec.length, paper: paperFiling?.status, sub: subText.replace(/\n+/g, " | ").slice(0, 500) });
  const blocks = (prep.readiness ?? []).find((r: any) => r.filing === paperFiling?.id)?.blocks ?? [];
  check("5b underneath: the Paper filing's only block is the missing validated copy", blocks.length === 1 && blocks[0].code === "barcode_not_validated", blocks.map((b: any) => `${b.code}: ${String(b.words).slice(0, 160)}`));
  check("6 no page error during the walk", w.errors.length === 0, w.errors);
  console.log(`CASE ${caseId} PAPER_ITEM ${paperItem?.id} PAPER_SUBJECT ${paperItem?.subject}`);
} finally { await w.close(); log(fails.length ? `WALK: ${fails.length} FAIL: ${fails.join(" | ")}` : "WALK: all PASS"); process.exitCode = fails.length ? 1 : 0; }
