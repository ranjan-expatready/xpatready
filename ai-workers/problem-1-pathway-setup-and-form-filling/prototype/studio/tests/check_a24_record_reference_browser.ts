// A24-1 (P-492; P-496 (2), review and break M2): Record submission's "Our reference" for a case opened WITHOUT the firm's
// own reference reads its case number, never "null". On the configured checkpoint: a Visitor visa case opened through the
// API with no reference (the principal and a spouse: two filings, so the dialog suggests "<number>-1" and "<number>-2"),
// then one opened WITH a reference (its words unchanged: "<reference>"). The filings are set Ready to file in SQL as setup
// (the dialog opens only for a group whose filings are all Ready to file; the readiness steps are other suites' checks).
// Each value is compared with GET /prepare in the same run. Screenshots: product/screens/A24-1/screenshots/. US$0.
//   zsh studio/tools/isolated.sh rt_a24r 4497 start && tsx studio/tests/check_a24_record_reference_browser.ts 4497 xr_studio_rt_a24r
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { call, firms, PORT, prepare, run, sql } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "A24-1", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const AUTHOR = "user-A", CLIENT = "user-P";
const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("vv.single")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const vv = comboId("vv.single")!;
const f = await firms();
const officer = f.officer ?? "user-O";

/** A Visitor visa case with a principal and a spouse, prepared, its filings set Ready to file (SQL, setup). */
async function family(reference: string | undefined) {
  const c = await call("POST", "/runtime/cases", { combinationId: vv, ...(reference ? { reference } : {}), clientActor: CLIENT, principal: { displayName: "Sample Client R" }, ...(f.rep ? { representative: f.rep, caseOfficers: [officer] } : {}) }, officer);
  const id: string = c.body?.id ?? "";
  await call("POST", `/runtime/cases/${id}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse R" }, officer);
  const p = (await prepare(id, officer)).p;
  sql(`update filing set status='READY_TO_FILE' where case_id='${id}'`);
  return { id, number: c.body?.case_number as string, filings: p?.filings.length ?? 0, opened: c.status };
}

const bare = await family(undefined), named = await family(`A24R-${run}`);
ok("A24-1 setup: two Visitor visa cases opened (one without a reference), each with two filings set Ready to file", bare.opened === 201 && named.opened === 201 && bare.filings === 2 && named.filings === 2, [bare, named]);

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors: string[] = []; p.on("pageerror", (e) => errors.push(String(e)));
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), officer);
/** Opens the case, then Record the submission…, and reads each "Our reference" box in the dialog. */
async function ourReferences(id: string, shot: string): Promise<string[]> {
  await p.goto(`${BASE}/cases/${id}`);
  const button = p.getByRole("button", { name: "Record the submission…" }).first();
  await button.waitFor({ timeout: 60_000 });
  await button.click();
  const dialog = p.getByRole("dialog");
  await dialog.waitFor({ timeout: 15_000 });
  const boxes = dialog.getByLabel("Our reference");
  await boxes.first().waitFor({ timeout: 15_000 });
  await p.screenshot({ path: join(SHOTS, shot), fullPage: false });
  const values = await boxes.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  await p.keyboard.press("Escape");
  return values;
}

const bareRefs = await ourReferences(bare.id, "05-record-submission-no-reference-1440.png");
const prepBare = await call("GET", `/runtime/cases/${bare.id}/prepare`, undefined, officer);
ok("A24-1 pass (P-496 (2)): for a case opened without a reference, Record submission's \"Our reference\" reads its case number (<number>-1, <number>-2), never \"null\"",
  bareRefs.length === 2 && bareRefs[0] === `${bare.number}-1` && bareRefs[1] === `${bare.number}-2` && prepBare.body?.reference === bare.number, { bareRefs, number: bare.number, prepare: prepBare.body?.reference });
ok("A24-1 fail: no \"null\" in any suggested reference", bareRefs.every((v) => !/null/i.test(v)), bareRefs);
const namedRefs = await ourReferences(named.id, "06-record-submission-with-reference-1440.png");
ok("A24-1 pass (byte-identical words): a case with its own reference still suggests that reference (<reference>-1, <reference>-2), not its number",
  namedRefs[0] === `A24R-${run}-1` && namedRefs[1] === `A24R-${run}-2`, namedRefs);
ok("A24-1: no page error", errors.length === 0, errors);
await b.close();
process.exitCode = summary() ? 1 : 0;
