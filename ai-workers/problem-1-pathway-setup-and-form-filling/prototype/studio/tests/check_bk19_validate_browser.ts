// BK-19 (C7.2, P-46, QA-315): reading back a validated copy, by screens at 1440 px, as the officer does it. A barcode
// form on Paper; the copy made by the button; then three files sent through "Read back the validated copy":
// (1) the form's Validate flag with no barcode in the file (QA-315: before BK-19 it read "Validated copy read back"):
//     the screen says "read back, not validated" with the barcode check's words, the copy is not validated, and Ready
//     to file still names the missing validated copy; (2) barcodes of other answers: not validated, in words; (3) the
//     file as Adobe's Validate leaves it, barcodes included: "Validated copy read back" and the block is gone, so the
//     next step (Ready to file, C7.6) opens. The validated files are SYNTHETIC (tools/simulate_validate.py; BK-20 is
//     the Mac's Adobe run). Axe and no sideways scroll on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh rt_bk19b 4437 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4437 xr_studio_rt_bk19b && tsx studio/acceptance/lib/setup_vv_m3.ts 4437 xr_studio_rt_bk19b && tsx studio/tests/check_bk19_validate_browser.ts 4437 xr_studio_rt_bk19b [shots folder]
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import AxeModule from "@axe-core/playwright";
import { adobeValidated, asValidated, call, copyBytes, fillEverything, firms, main, needVisitorVisa, ok, openCase, yearsAgo } from "../acceptance/lib/m3.ts";

const PORT = process.argv[2] ?? "4437", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[4] ?? null;
const T = { timeout: 30_000 };
const AxeBuilder = ((AxeModule as unknown as { default?: typeof AxeModule }).default ?? AxeModule) as typeof AxeModule;
const REASON = "The client cannot use the IRCC account: an accommodation (Sample)";

await main("BK-19", "Read back a validated copy by screens (1440 px)", async () => {
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const vv = needVisitorVisa(), f = await firms(), officer = f.officer!;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client A"];
  await fillEverything(c.id);
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors: string[] = [];
  const dir = mkdtempSync(join(tmpdir(), "bk19-"));
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await ctx.addInitScript((a) => { localStorage.setItem("xr-actor", a); }, officer);
    const r: Page = await ctx.newPage();
    r.on("pageerror", (e) => errors.push(e.message));
    let n = 0;
    const shot = async (name: string) => { if (SHOTS) await r.screenshot({ path: join(SHOTS, `${String(++n).padStart(2, "0")}-${name}-1440.png`), fullPage: false }); };
    const axe = async (name: string) => {
      const a = await new AxeBuilder({ page: r }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      ok(`C7.2 BK-19 axe: ${name} has no WCAG A/AA violation`, a.violations.length === 0, a.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
      ok(`C7.2 BK-19: ${name} has no sideways scroll at 1440 px`, !(await r.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    };
    const row = r.locator("li").filter({ has: r.getByRole("heading", { name: "IMM 5257 for Sample Client A" }) }).first();
    const readiness = r.locator("[data-readiness]");
    const blocked = async () => (await readiness.getByText(/no validated copy read back/i).count()) >= 1;

    // The officer files IMM 5257 on Paper (a barcode form to validate), as J-C3 does.
    await r.goto(`${BASE}/cases/${c.id}`);
    await r.getByRole("button", { name: "Change channel: IMM 5257 for Sample Client A" }).click(T);
    const dlg = r.getByRole("dialog");
    await dlg.getByLabel("Paper", { exact: true }).check(T);
    await dlg.getByRole("button", { name: "Save" }).click(T);
    await dlg.getByLabel(/Why on paper/).fill(REASON);
    await dlg.getByRole("button", { name: "Save" }).click(T);
    await dlg.waitFor({ state: "detached", ...T });
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: /Generate a copy/ }).click(T);
    await row.getByRole("button", { name: "Read back the validated copy" }).waitFor(T);
    const copyId = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms?.find((x: { form: string; subject_id: string }) => x.form === "IMM 5257" && x.subject_id === P)?.copies?.[0]?.id as string;
    const made = await copyBytes(copyId, officer);
    ok("C7.2 BK-19 setup: IMM 5257 on Paper, its copy made by the button, and Ready to file names the missing validated copy", !!copyId && await blocked());
    const send = async (name: string, bytes: Buffer) => {
      const file = join(dir, `${name}.pdf`); writeFileSync(file, bytes);
      const button = row.getByRole("button", { name: /Read back (the validated copy|again)/ });
      await row.getByLabel("Validated copy of IMM 5257").setInputFiles(file);
      await button.waitFor(T); await r.waitForFunction(() => !document.querySelector("[aria-busy='true']"), undefined, T).catch(() => null);
    };

    // (1) QA-315: the form's own flag says Validate passed, but the file holds no barcode.
    await send("flag-only", asValidated(made));
    const toast1 = r.getByText(/IMM 5257: read back, not validated\. 0 of the 5 barcodes are in this file/);
    const t1 = await toast1.first().waitFor(T).then(() => true, () => false);
    await row.locator("[data-validated='not_validated']").waitFor(T).catch(() => null);
    const pill1 = await row.innerText();
    ok("C7.2 BK-19 fail (QA-315): a file whose form says Validate passed but which holds no barcode is said \"read back, not validated\", with the words to press Validate in Adobe Reader", t1 && await row.locator("[data-validated='not_validated']").count() === 1 && /0 of the 5 barcodes are in this file/.test(pill1) && /press Validate/.test(pill1) && !/Validated copy read back/.test(pill1), pill1.slice(0, 400));
    await r.reload(); await row.waitFor(T);
    ok("C7.2 BK-19 fail (QA-315): Ready to file still names the missing validated copy (the file does not count)", await readiness.getByText(/no validated copy read back/i).first().waitFor(T).then(() => true, () => false));
    await row.scrollIntoViewIfNeeded(); await shot("flag-only-not-validated"); await axe("the copy read back but not validated");

    // (2) Barcodes of other answers (the form changed after Validate).
    await send("stale", asValidated(made, "Yes", true, "barcodes-stale"));
    await row.getByText(/do not agree with the form's answers/).waitFor(T).catch(() => null);
    const pill2 = await row.innerText();
    ok("C7.2 BK-19 fail (P-46): barcodes of other answers: not validated, the words say the form changed after Validate", /do not agree with the form's answers/.test(pill2) && await row.locator("[data-validated='not_validated']").count() === 1, pill2.slice(0, 400));
    await shot("stale-barcodes"); await axe("the copy with barcodes of other answers");

    // (3) As Adobe's Validate leaves it: the barcodes agree; the next step, Ready to file, opens.
    await send("adobe", adobeValidated(made));
    const t3 = await r.getByText("IMM 5257: validated copy read back").first().waitFor(T).then(() => true, () => false);
    await row.getByText("Validated copy read back", { exact: true }).waitFor(T).catch(() => null);
    ok("C7.2 BK-19 pass (P-46): the file as Adobe's Validate leaves it (barcodes read and agreeing) is \"Validated copy read back\"", t3 && await row.locator("[data-validated='current']").count() === 1);
    await r.waitForFunction(() => !/no validated copy read back/i.test(document.querySelector("[data-readiness]")?.textContent ?? ""), undefined, T).catch(() => null);
    ok("C7.2 BK-19 pass: Ready to file no longer names a missing validated copy (the next step, C7.6, opens)", !(await blocked()));
    await row.scrollIntoViewIfNeeded(); await shot("validated-read-back"); await axe("the copy validated and read back");
    await readiness.scrollIntoViewIfNeeded(); await shot("ready-to-file");
    ok("C7.2 BK-19: no page error", !errors.length, errors.slice(0, 3));
  } finally { await browser.close(); }
});
