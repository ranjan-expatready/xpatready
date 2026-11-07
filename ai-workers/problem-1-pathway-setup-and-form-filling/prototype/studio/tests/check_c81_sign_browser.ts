// C8.1 Sign and scan by screens (M3 sprint row B3, journey J-B3; concept product/screens/B3/concept.md; r5c BR-8, BR-10,
// BR-21; P-65, P-136, P-143; QA-251), on the configured checkpoint (Demo › Load the configured checkpoint, as the author).
// A single adult's Visitor visa case, its facts filled by the pack's helper (the questionnaire's screens are C4's). Then
// by screens only, as the case officer, on IMM 5476 (signed by hand and scanned): who signs is named (the person and the
// representative of record); "Signed by hand" before "Printed" cannot start, in the server's words; with no copy, Printed
// says to generate one; Generate a copy, then Printed names the copy; a second, stale tab's "Signed by hand" is refused in
// the server's words; Signed by hand; a scan that is not a PDF or image is refused on the upload, nothing stored; a file
// over 20 MB is refused before it is sent; a Sample PDF scan is received (checksum stored; the item Ready); "Uploaded to
// IRCC" cannot start until the filing is Ready to file (the server's words). The filing is taken to Ready to file by B2's
// panel (warnings passed with a reason, the representative's review); then Uploaded to IRCC: the item is Done. Ends at
// C8.2's first step ("Record the submission" enabled). A FAMILY case: Child A1's IMM 5257 names a parent as signer.
// IMM 5257 (typed name) has no signing steps. The client sees none. Keyboard only, axe (WCAG 2.2 A/AA) per state, 1440
// and 1024 px, no sideways scroll. Screenshots: product/screens/C8.1/screenshots/B3-*. Sample files only; no model call (US$0).
//   zsh studio/tools/isolated.sh scr_b3 4441 start && tsx studio/tests/check_c81_sign_browser.ts 4441 xr_studio_scr_b3
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import { CLIENT, FAMILY, PORT, agent, answer, call, confirmAll, fillEverything, filingOf, firms, generateCopy, itemsOf, needVisitorVisa, openCase, prepare, readinessOf, signedScan, sql, yearsAgo } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "C8.1", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };

// Demo › Reset, then Demo › Load the configured checkpoint, as the author (node:http: the load can outlast fetch's wait).
const post = (path: string, body: unknown) => new Promise<{ status: number; body: { detail?: string } | null }>((done) => {
  const data = JSON.stringify(body);
  const rq = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method: "POST", timeout: 1_200_000, headers: { "content-type": "application/json", "x-actor": "user-A", "content-length": Buffer.byteLength(data) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("timeout", () => rq.destroy(new Error("no answer in 20 minutes"))); rq.on("error", (e) => done({ status: 0, body: { detail: e.message } })); rq.end(data);
});
if (process.env.B3_KEEP_DATA !== "1") {
  const reset = await post("/demo/reset", { confirm: "RESET" });
  const load = reset.status < 300 ? await post("/demo/load", { sample: "configured" }) : reset;
  if (load.status >= 300) { console.log(`STOP  the configured checkpoint did not load: ${load.status} ${load.body?.detail ?? ""}`); process.exit(2); }
  ok("setup: Demo › Load the configured checkpoint (after Reset)", true);
}

const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep;
const nameOf = (id: string | null) => f.firm?.users.find((u) => u.actor === id)?.name ?? id ?? "";
ok("setup: the Sample firm has a representative of record and a separate case officer", !!rep && rep !== officer, { rep, officer });
const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: rep, caseOfficers: [officer] });
const P = c.subjects["Sample Client A"];
console.log(`NOTE  set-up: facts filled by the pack's helper: ${(await fillEverything(c.id)) ? "all confirmed" : "some left open (passed with a reason on B2's panel below)"}`);
type Item = { id: string; kind: string; form?: string; signature?: string; signers?: string[]; state: string; reason?: string };
const read = async () => (await prepare(c.id, officer)).p;
let pv = await read();
const it = itemsOf(pv, P, "IMM 5476")[0] as Item | undefined, i5257 = itemsOf(pv, P, "IMM 5257")[0] as Item | undefined;
const fid = filingOf(pv, P)?.id ?? "";
ok("setup (QA-228 closed on the checkpoint): IMM 5476 is signed by hand and scanned, by the person and the representative; IMM 5257 is not", it?.signature === "HAND_SCANNED" && JSON.stringify(it?.signers) === JSON.stringify(["person", "representative"]) && i5257?.signature !== "HAND_SCANNED", { it, i5257: i5257?.signature });
const steps = () => (sql(`select key || '|' || coalesce(copy_id::text, '') from sign_step where item_id = '${it?.id}' and superseded_at is null order by done_at`) ?? "").split("\n").filter(Boolean);
const scans = () => Number(sql(`select count(*) from signed_scan where item_id = '${it?.id}'`) ?? -1);

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage(); const errs: string[] = [];
const watch = (pg: Page) => { pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); }); };
watch(p);
const as = async (pg: Page, actor: string) => { await pg.goto(BASE); await pg.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
const settle = async (pg: Page = p) => { await pg.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 90_000 }); await pg.waitForTimeout(300); };
const blockOn = (pg: Page) => pg.locator(`[data-sign-block="${it?.id}"]`);
const block = () => blockOn(p);
const rowOf = (pg: Page, form: string, person: string) => pg.locator("li", { has: pg.getByRole("heading", { name: `${form} for ${person}`, exact: true }) });
const open = async (pg: Page = p, caseId = c.id) => { await pg.goto(`${BASE}/cases/${caseId}`); await pg.locator("[data-readiness]").waitFor({ timeout: 60_000 }); await settle(pg); };
const press = async (loc: Locator, pg: Page = p) => { await loc.focus(); await pg.keyboard.press("Enter"); await settle(pg); };
const stepEl = (key: string) => block().locator(`[data-step="${key}"]`);
const whyOf = async (key: string) => ((await stepEl(key).locator("[data-step-why]").first().innerText().catch(() => "")).trim());
let n = 0;
async function state(name: string, scope = "[data-sign-block]") {
  n++; const base = `B3-${String(n).padStart(2, "0")}-${name}`;
  await settle(); const target = p.locator(scope).first(); await target.scrollIntoViewIfNeeded().catch(() => null);
  await p.screenshot({ path: join(SHOTS, `${base}-1440.png`) });
  const v = (await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`axe: ${name}: no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250); await target.scrollIntoViewIfNeeded().catch(() => null);
  await p.screenshot({ path: join(SHOTS, `${base}-1024.png`) });
  ok(`1024 px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
}

// ---------------------------------------------------------------- the case officer: who signs, nothing printed yet
await as(p, officer); await open();
const row5476 = rowOf(p, "IMM 5476", "Sample Client A"), row5257 = rowOf(p, "IMM 5257", "Sample Client A");
const who = (await row5476.locator("[data-who-signs]").innerText().catch(() => "")).trim();
ok("C8.1 BR-1 pass (VV-R10): IMM 5476's row says who signs: the person by name and the representative of record by name, signed by hand and scanned", /Who signs: Sample Client A and the representative of record/.test(who) && who.includes(nameOf(rep)) && /Signed by hand and scanned/.test(who), who);
ok("C8.1 BR-2 fail-guard: IMM 5257 (not signed by hand) has no signing steps; IMM 5476 has one block", (await row5257.locator("[data-sign-block]").count()) === 0 && (await block().count()) === 1, { b5257: await row5257.locator("[data-sign-block]").count() });
ok("C8.1-3 pass: the steps in order: Printed, Signed by hand, Signed scan received, Uploaded to IRCC", (await block().locator("[data-step]").evaluateAll((els) => els.map((e) => e.getAttribute("data-step")))).join() === "print,signed,scan_received,uploaded_to_ircc");
// J-B3: "Signed" before "Print" is refused in words: here it cannot start, and its words are the server's refusal.
const signedWhy = await whyOf("signed");
const r409 = await call("POST", `/runtime/items/${it?.id}/sign-steps/signed`, {}, officer);
ok("C8.1-4 / BR-3 fail: \"Signed by hand\" before \"Printed\" cannot start: no button, and the words equal the server's refusal (409)", (await stepEl("signed").getByRole("button").count()) === 0 && signedWhy === `Cannot start yet: ${r409.body?.detail}` && r409.status === 409 && steps().length === 0, { signedWhy, detail: r409.body?.detail });
const noCopy = await whyOf("print");
ok("C8.1-5 / BR-4 fail: with no generated copy, Printed has no button and says to generate a copy first", (await stepEl("print").getByRole("button").count()) === 0 && /Generate a copy of IMM 5476 above first/.test(noCopy), noCopy);
await state("not-printed");

// Generate a copy (the row's own button), then Printed names it.
await press(row5476.getByRole("button", { name: /^Generate a (new )?copy$/ }));
await stepEl("print").getByRole("button", { name: /^Printed: the copy of/ }).waitFor({ timeout: 120_000 }).catch(() => null);
const copyId = sql(`select id from form_instance where case_id = '${c.id}' and subject_id = '${P}' and form_number = 'IMM 5476' and status = 'GENERATED' order by created_at desc limit 1`) ?? "";
await press(stepEl("print").getByRole("button", { name: /^Printed: the copy of/ }));
await block().locator('[data-step="print"][data-done="yes"]').waitFor({ timeout: 15_000 }).catch(() => null);
ok("C8.1-6 / BR-4 pass: Printed is recorded with the copy printed (the newest generated copy), and the step names it, who and when", steps().join() === `print|${copyId}` && /Copy of .* · recorded by /.test(await stepEl("print").innerText()) && (await stepEl("print").innerText()).includes(nameOf(officer)), { steps: steps(), copyId, text: await stepEl("print").innerText() });
ok("keyboard: after Printed the focus is on the next step's button (Signed by hand)", await p.evaluate(() => document.activeElement?.getAttribute("data-step-action")) === "signed");
await state("printed");

// Challenge M1 (C9.2): a fact IMM 5476 reads changes after Printed: the printed copy is out of date, so Signed by hand
// is not offered; a new copy is generated and printed; the server starts the signing again (earlier steps superseded).
type Q = { subjectId: string; fact: string; required: boolean; hidden: boolean; group: string | null; value_type: string; fills: { form: string }[] };
const q5476 = ((await agent(c.id))?.sections ?? []).flatMap((x: { questions: Q[] }) => x.questions)
  .find((q: Q) => q.subjectId === P && !q.hidden && !q.group && q.value_type === "text" && q.fills.some((x) => x.form === "IMM 5476"));
const changed = q5476 ? await answer(c.id, P, q5476.fact, "Sample Changed Value", officer) : null;
if (q5476) await confirmAll(c.id, P);
await open();
ok("C8.1 BR-8 / challenge M1 fail: after a fact on the printed copy changed, Signed by hand is not offered; the block says the signed copy is out of date and the copy must be generated again",
  !!q5476 && (changed?.status ?? 500) < 300 && (await block().locator('[data-step-action="signed"]').count()) === 0 && await block().locator("[data-sign-again]").isVisible() && /generate a new copy of IMM 5476/.test(await block().locator("[data-sign-again]").innerText()), { fact: q5476?.fact, status: changed?.status, text: await block().innerText().catch(() => "") });
await state("printed-copy-out-of-date");
await press(row5476.getByRole("button", { name: /^Generate a (new )?copy$/ }));
await block().locator("[data-sign-again]").getByRole("button", { name: /^Printed: the new copy of/ }).waitFor({ timeout: 120_000 }).catch(() => null);
const copy2 = sql(`select id from form_instance where case_id = '${c.id}' and subject_id = '${P}' and form_number = 'IMM 5476' and status = 'GENERATED' order by created_at desc limit 1`) ?? "";
await press(block().locator("[data-sign-again]").getByRole("button", { name: /^Printed: the new copy of/ }));
await block().locator('[data-step-action="signed"]').waitFor({ timeout: 15_000 }).catch(() => null);
ok("C8.1 BR-8 / challenge M1 pass: the new copy is printed: the server starts the signing again (the earlier Printed superseded) and Signed by hand is the next step",
  copy2 !== copyId && steps().join() === `print|${copy2}` && Number(sql(`select count(*) from sign_step where item_id = '${it?.id}' and superseded_at is not null`) ?? 0) >= 1 && (await block().locator("[data-sign-again]").count()) === 0, { steps: steps(), copy2, copyId });

// A second tab, opened before the step: it still offers "Signed by hand" after the first tab recorded it.
const p2 = await ctx.newPage(); watch(p2); await open(p2);
await press(blockOn(p).locator('[data-step-action="signed"]'));
await press(blockOn(p2).locator('[data-step-action="signed"]'), p2);
const stale = (await blockOn(p2).locator("[data-sign-refusal]").innerText().catch(() => "")).trim();
ok("C8.1 BR-3 / BR-9 fail (stale tab): the second \"Signed by hand\" is refused in the server's words; nothing recorded twice", /Not recorded/.test(stale) && /Signed by hand is already done for IMM 5476/.test(stale) && steps().filter((s) => s.startsWith("signed|")).length === 1, { stale, steps: steps() });
ok("keyboard (stale tab): after the refusal the focus is on the block's heading", await blockOn(p2).locator("h4").evaluate((el) => el === document.activeElement));
await p2.close();
ok("C8.1-7 pass / challenge m1: Signed by hand names the signers and who recorded it, and when", steps().map((s) => s.split("|")[0]).join() === "print,signed" && /Signed by Sample Client A and the representative of record/.test(await stepEl("signed").innerText()) && (await stepEl("signed").innerText()).includes(`recorded by ${nameOf(officer)}`), await stepEl("signed").innerText());
await state("signed");

// The scan: the upload button opens the file chooser (keyboard); a text file is refused on the upload by the server.
const choose = async (files: { name: string; mimeType: string; buffer: Buffer }) => {
  const [chooser] = await Promise.all([p.waitForEvent("filechooser", { timeout: 10_000 }), (async () => { await block().locator('[data-step-action="scan_received"]').focus(); await p.keyboard.press("Enter"); })()]);
  await chooser.setFiles(files); await p.waitForTimeout(500); await settle();
};
await choose({ name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf, only words (Sample)") });
const typeErr = (await block().locator("[data-scan-error]").innerText().catch(() => "")).trim();
ok("C8.1-8 / BR-6 fail: a scan that is not a PDF or image (judged by its bytes, named .pdf) is refused on the upload in the server's words; nothing stored", /Send the signed scan as a PDF, JPEG or PNG/.test(typeErr) && /Nothing was stored/.test(typeErr) && scans() === 0 && steps().length === 2, { typeErr, scans: scans() });
ok("keyboard: after the refusal the focus is back on the upload button, described by the error", await p.evaluate(() => document.activeElement?.getAttribute("data-step-action")) === "scan_received" && (await block().locator('[data-step-action="scan_received"]').getAttribute("aria-invalid")) === "true");
await state("scan-refused");
await choose({ name: "big-scan.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(20 * 1024 * 1024 + 1, 0x25) });
ok("C8.1 BR-6 fail: a file over 20 MB is refused before it is sent; nothing stored", /larger than 20 MB/.test(await block().locator("[data-scan-error]").innerText().catch(() => "")) && scans() === 0);
await choose({ name: "IMM5476-signed-Sample.pdf", mimeType: "application/pdf", buffer: signedScan("IMM 5476") });
await stepEl("scan_received").locator("[data-scan-file]").waitFor({ timeout: 15_000 }).catch(() => null);
pv = await read();
ok("C8.1-10 / BR-6 pass: the Sample PDF scan is received: stored with its checksum, named on the step (file, type, size, who), the item Ready", scans() === 1 && !!sql(`select sha256 from signed_scan where item_id = '${it?.id}'`) && /IMM5476-signed-Sample\.pdf · PDF · /.test(await stepEl("scan_received").innerText()) && itemsOf(pv, P, "IMM 5476")[0]?.state === "ready" && (await block().getAttribute("data-state")) === "ready", { scans: scans(), text: await stepEl("scan_received").innerText(), state: itemsOf(pv, P, "IMM 5476")[0]?.state });
const irccWhy = await whyOf("uploaded_to_ircc");
const r409b = await call("POST", `/runtime/items/${it?.id}/sign-steps/uploaded_to_ircc`, {}, officer);
ok("C8.1-11 / BR-7 fail: \"Uploaded to IRCC\" cannot start before the filing is Ready to file: no button, the server's words (409)", (await stepEl("uploaded_to_ircc").locator('[data-step-action]').count()) === 0 && irccWhy.startsWith(`Cannot start yet: ${r409b.body?.detail}`) && r409b.status === 409, { irccWhy, detail: r409b.body?.detail });
const sumry = stepEl("scan_received").locator("summary", { hasText: "Checksum" });
await press(sumry);
ok("challenge m6 (keyboard): the scan's checksum opens from a focusable \"Checksum\" and equals the stored one", (await stepEl("scan_received").locator("details").innerText()).includes(sql(`select sha256 from signed_scan where item_id = '${it?.id}'`) ?? "-"));
await state("scan-received");
await press(stepEl("uploaded_to_ircc").getByRole("button", { name: "Go to Ready to file" }));
ok("keyboard: \"Go to Ready to file\" moves the focus to the Ready to file panel", await p.evaluate(() => document.activeElement?.id) === "readiness-h");

// ---------------------------------------------------------------- B2's panel: Ready to file (by screens)
const filing = (pg: Page = p) => pg.locator(`[data-readiness-filing="${fid}"]`);
type Line = { code: string; key: string };
const lineOf = (l: Line) => filing().locator(`[data-line="${l.key.replace(/"/g, '\\"')}"][data-code="${l.code}"]`);
let k = 0;
for (const w of (readinessOf(await read(), fid)?.warns ?? []).filter((x: Line) => x.code !== "representative_review") as Line[]) {
  k++;
  await press(lineOf(w).getByRole("button", { name: /^Pass with a reason/ }));
  await p.keyboard.type(`Sample: checked with the client by phone (${k})`);
  await press(lineOf(w).getByRole("button", { name: "Pass", exact: true }));
  await lineOf(w).waitFor({ state: "detached", timeout: 15_000 }).catch(() => null);
}
await as(p, rep!); await open();
if (await filing().getByRole("button", { name: "Review the filing" }).count()) {
  await press(filing().getByRole("button", { name: "Review the filing" }));
  await press(filing().getByRole("button", { name: "Confirm the review" }));
  await filing().locator("[data-reviewed]").waitFor({ timeout: 15_000 }).catch(() => null);
}
await as(p, officer); await open();
await press(filing().locator("[data-mark-ready]"));
await p.waitForFunction((id) => document.querySelector(`[data-readiness-filing="${id}"]`)?.getAttribute("data-status") === "ready_to_file", fid, { timeout: 15_000 }).catch(() => null);
ok("setup by screens (B2's panel): the filing is Ready to file", String(filingOf(await read(), P)?.status).toLowerCase() === "ready_to_file");

// ---------------------------------------------------------------- Uploaded to IRCC
await block().scrollIntoViewIfNeeded();
const up = stepEl("uploaded_to_ircc").getByRole("button", { name: "Uploaded to IRCC" });
ok("C8.1 BR-7 pass: once the filing is Ready to file, \"Uploaded to IRCC\" is the next step's button", await up.isVisible());
await state("ready-to-file");
await press(up);
await p.waitForFunction((id) => document.querySelector(`[data-sign-block="${id}"]`)?.getAttribute("data-state") === "done", it?.id, { timeout: 15_000 }).catch(() => null);
pv = await read();
ok("C8.1-13 pass: Uploaded to IRCC is recorded; the item is Done on the screen and in /prepare", steps().map((s) => s.split("|")[0]).join() === "print,signed,scan_received,uploaded_to_ircc" && itemsOf(pv, P, "IMM 5476")[0]?.state === "done" && (await block().getAttribute("data-state")) === "done" && /Done/.test(await block().locator("h4 + span").innerText()), { steps: steps(), state: itemsOf(pv, P, "IMM 5476")[0]?.state });
ok("C8.1 pass: no step is left with a button once all four are done", (await block().locator("[data-step-action]").count()) === 0);
ok("C8.1-12 fail-guard: the screen offers no \"sign for the client\" action", (await block().getByText(/sign for the client/i).count()) === 0);
await state("done");

// ---------------------------------------------------------------- C8.2's first step
const recordBtn = p.locator("[data-submission]").getByRole("button", { name: /^Record the submission/ }).first();
ok("C8.2 pass: \"Record the submission\" is enabled once the filing is Ready to file and IMM 5476 is uploaded", await recordBtn.isEnabled().catch(() => false));

// ---------------------------------------------------------------- challenge M2: the submission recorded: read-only
pv = await read();
const g = pv?.groups.find((x) => x.filings.includes(fid));
const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
const rec = await call("PATCH", `/runtime/groups/${g?.id}/record`, { filings: [{ filing: fid, our_reference: "SAMPLE-REF-B3", submitted_on: today, application_number: "V300000031", fee_receipt: "SAMPLE-RECEIPT" }], ucis: [{ subject: P, uci: "3333-3333" }], version: pv?.version }, officer);
await open();
ok("challenge M2 pass: once the submission is recorded, the block says the application is read-only and offers no step", rec.status < 300 && await block().locator("[data-sign-readonly]").isVisible() && (await block().locator("[data-step-action]").count()) === 0 && (await block().locator("[data-step-why]").count()) === 0, { rec: rec.status, detail: (rec.body as { detail?: string } | null)?.detail });
await state("recorded-read-only");

// ---------------------------------------------------------------- a FAMILY case: a parent signs for a child
const fam = await openCase(vv, FAMILY);
await as(p, officer); await open(p, fam.id);
const childWho = (await rowOf(p, "IMM 5257", "Sample Child A1").locator("[data-who-signs]").innerText().catch(() => "")).trim();
const adultWho = (await rowOf(p, "IMM 5257", "Sample Client A").locator("[data-who-signs]").innerText().catch(() => "")).trim();
ok("C8.1-1 / BR-1 pass (VV-R09): Child A1's IMM 5257 names a parent as signer; Client A's names Client A", /Who signs: a parent, for Sample Child A1 \(under 18\)/.test(childWho) && /Who signs: Sample Client A\b/.test(adultWho) && !/parent/.test(adultWho), { childWho, adultWho });
await state("family-who-signs", "[data-who-signs]");
// Challenge m7: each adult's IMM 5476 has its own block; a step on one leaves the other as it was.
const fp = (await prepare(fam.id, officer)).p;
const hand = (fp?.items ?? []).filter((x) => x.kind === "form" && x.signature === "HAND_SCANNED" && !(x as { record?: string }).record) as Item[];
ok("challenge m7 pass: every hand-signed item of the family case has its own signing block", hand.length >= 2 && (await p.locator("[data-sign-block]").count()) === hand.length && (await Promise.all(hand.map((x) => p.locator(`[data-sign-block="${x.id}"]`).count()))).every((k) => k === 1), { hand: hand.map((x) => `${x.form}|${x.person}`), blocks: await p.locator("[data-sign-block]").count() });
const [h1, h2] = hand;
const fc = h1 ? await generateCopy(fam.id, h1.form!, (h1 as unknown as { subject: string }).subject) : null;
const pr = await call("POST", `/runtime/items/${h1?.id}/sign-steps/print`, { copy: fc }, officer);
await open(p, fam.id);
const doneOf = async (id: string | undefined) => p.locator(`[data-sign-block="${id}"] [data-step="print"]`).getAttribute("data-done");
ok("challenge m7 pass: Printed on one adult's IMM 5476 shows on that block only", pr.status === 200 && (await doneOf(h1?.id)) === "yes" && (await doneOf(h2?.id)) === "no", { pr: pr.status, a: await doneOf(h1?.id), b: await doneOf(h2?.id) });

// ---------------------------------------------------------------- the client never reaches the block
await as(p, CLIENT); await p.goto(`${BASE}/cases/${c.id}`); await p.waitForTimeout(1500);
ok("roles fail: the client's view has no signing block", (await p.locator("[data-sign-block]").count()) === 0);
ok("no page error or console error during the walk", errs.length === 0, errs.slice(0, 3));

await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
