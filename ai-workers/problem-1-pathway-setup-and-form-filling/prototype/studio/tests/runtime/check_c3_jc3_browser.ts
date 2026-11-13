// Journey J-C3 (M3 sprint plan, row C3; C11.6, C7.6, C7.7, C9.2; founder Q3), by screens at 1440 px with a screenshot of
// each state (P-352), on the configured checkpoint. Setup by route: a Visitor visa case with Client A and a spouse, every
// fact answered and confirmed (the questionnaire's own journey is J-A2's). The case officer opens IMM 5257 › Change
// channel for Client A and picks Paper: Save without a reason is refused on the "Why on paper" field; with the
// accommodation reason it is saved for Client A only [5.2]. Ready to file names the missing validated copy, the one block
// [C7.6]. Prepare application: Client A's IMM 5257 is a copy for filing; the case officer generates it and reads back
// the validated copy [5.6]: the block is gone. The spouse's IMM 5257 is still Online, "Copy, not for filing". Ends at
// C9.2: the family name changes and the validated copy reads Out of date; the block is back. The Paper line's own steps
// have no screen yet (row B3), so they are read by route. axe-core (WCAG 2.2 A/AA) on each state; no sideways scroll.
// Adobe's Validate is simulated (tests/runtime/validated.ts). Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh rtc3 4431 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/runtime/check_c3_jc3_browser.ts 4431 xr_studio_rtc3 [shots folder]
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import AxeModule from "@axe-core/playwright";
import { adobeValidated, answer, call, confirmAll, copyBytes, fillEverything, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, yearsAgo } from "../../acceptance/lib/m3.ts";

const PORT = process.argv[2] ?? "4431", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[4] ?? null;
const T = { timeout: 30_000 };
const AxeBuilder = ((AxeModule as unknown as { default?: typeof AxeModule }).default ?? AxeModule) as typeof AxeModule;
const REASON = "The client cannot use the IRCC account: an accommodation (Sample)";

await main("J-C3", "Validate on release 2 by screens (1440 px)", async () => {
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const vv = needVisitorVisa(), f = await firms(), officer = f.officer!;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const [P, S] = [c.subjects["Sample Client A"], c.subjects["Sample Spouse A"]];
  await fillEverything(c.id);
  const ready = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms?.find((x: { form: string; subject_id: string }) => x.form === "IMM 5257" && x.subject_id === P)?.readiness?.ready;
  ok("J-C3 setup (by route): every fact IMM 5257 reads for Client A is answered and confirmed", ready === true);

  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors: string[] = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await ctx.addInitScript((a) => { localStorage.setItem("xr-actor", a); }, officer);
    const r: Page = await ctx.newPage();
    r.on("pageerror", (e) => errors.push(e.message));
    let n = 0;
    const shot = async (name: string) => { if (SHOTS) await r.screenshot({ path: join(SHOTS, `${String(++n).padStart(2, "0")}-${name}-1440.png`), fullPage: false }); };
    const axe = async (name: string) => {
      const a = await new AxeBuilder({ page: r }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      ok(`J-C3 axe: ${name} has no WCAG A/AA violation`, a.violations.length === 0, a.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
      ok(`J-C3: ${name} has no sideways scroll at 1440 px`, !(await r.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    };
    const channels = r.locator("[data-item-channels]");
    const line = (person: string) => channels.locator(`[data-channel-person='${person === "Sample Client A" ? P : S}'] [data-form='IMM 5257']`);
    const formRow = (person: string) => r.locator("li").filter({ has: r.getByRole("heading", { name: `IMM 5257 for ${person}` }) }).first();
    const readiness = r.locator("[data-readiness]");
    const blockLine = readiness.getByText(/no validated copy read back/i).first();

    // [5.2] Change channel → Paper: without a reason it is refused on its field; with the reason it is saved.
    await r.goto(`${BASE}/cases/${c.id}`);
    await line("Sample Client A").waitFor(T);
    ok("J-C3 1: on the case page both IMM 5257 lines read Online (release 2's line)", await line("Sample Client A").getAttribute("data-channel") === "ONLINE" && await line("Sample Spouse A").getAttribute("data-channel") === "ONLINE");
    await r.getByRole("button", { name: "Change channel: IMM 5257 for Sample Client A" }).click(T);
    const dlg = r.getByRole("dialog");
    await dlg.getByLabel("Paper", { exact: true }).check(T);
    await dlg.getByRole("button", { name: "Save" }).click(T);
    const reasonBox = dlg.getByLabel(/Why on paper/);
    await reasonBox.waitFor(T);
    const refusal = await dlg.getByText(/Give the reason for IMM 5257 on paper/).waitFor(T).then(() => true, () => false);
    ok("J-C3 2: Save with Paper and no reason is refused on the \"Why on paper\" field, in the server's words", refusal && await reasonBox.getAttribute("aria-invalid") === "true", (await dlg.innerText()).slice(-300));
    await shot("paper-no-reason"); await axe("the Change channel dialog with its refusal");
    await reasonBox.fill(REASON);
    await dlg.getByRole("button", { name: "Save" }).click(T);
    await dlg.waitFor({ state: "detached", ...T });
    await r.waitForFunction(() => document.querySelector("[data-item-channels] [data-form='IMM 5257'][data-channel='PAPER']"), undefined, T);
    const why = await line("Sample Client A").innerText();
    ok("J-C3 3: Client A's IMM 5257 reads Paper, changed from Online with the reason; the spouse's stays Online", await line("Sample Client A").getAttribute("data-channel") === "PAPER" && why.includes(REASON) && /Changed from Online/.test(why) && await line("Sample Spouse A").getAttribute("data-channel") === "ONLINE", why);
    await line("Sample Client A").scrollIntoViewIfNeeded(); await shot("paper-saved"); await axe("How each form is filed after the change");

    // [C7.6] The one block: no validated copy read back.
    await blockLine.waitFor(T);
    ok("J-C3 4: Ready to file names the missing validated copy of IMM 5257 for Client A", /IMM 5257/.test(await blockLine.innerText()) || /IMM 5257/.test(await blockLine.locator("xpath=..").innerText()), await blockLine.innerText());
    await blockLine.scrollIntoViewIfNeeded(); await shot("ready-to-file-block"); await axe("Ready to file with the Validate block");

    // The Paper line's steps (no screen yet, row B3): by route.
    const pl = itemsOf((await prepare(c.id, officer)).p, P, "IMM 5257")[0];
    ok("J-C3 5 (route, no screen yet: row B3): the Paper line's steps start with Validate, and it never says \"Ask the Lead\"", pl?.steps?.[0]?.key === "validate" && !/Ask the Lead/.test(pl?.reason ?? ""), pl?.reason);

    // [5.6] The copy for filing: generate, then read back the validated copy.
    const row = formRow("Sample Client A");
    await row.scrollIntoViewIfNeeded();
    ok("J-C3 6: Client A's IMM 5257 under Prepare application is not marked \"Copy, not for filing\"", !(await row.getByText("Copy, not for filing").count()));
    await row.getByRole("button", { name: /Generate a copy/ }).click(T);
    const readBack = row.getByRole("button", { name: "Read back the validated copy" });
    await readBack.waitFor(T);
    const copyId = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms?.find((x: { form: string; subject_id: string }) => x.form === "IMM 5257" && x.subject_id === P)?.copies?.[0]?.id as string;
    const dir = mkdtempSync(join(tmpdir(), "jc3-")), file = join(dir, "IMM5257-validated.pdf");
    writeFileSync(file, adobeValidated(await copyBytes(copyId, officer)));
    await row.getByLabel("Validated copy of IMM 5257").setInputFiles(file);
    await row.getByText("Validated copy read back", { exact: true }).waitFor(T);
    ok("J-C3 7: the validated copy is read back on Client A's IMM 5257", await row.locator("[data-validated='current']").count() === 1);
    await shot("validated-read-back"); await axe("Prepare application with the validated copy");
    await r.waitForFunction(() => !/no validated copy read back/i.test(document.querySelector("[data-readiness]")?.textContent ?? ""), undefined, T).catch(() => null);
    ok("J-C3 8: Ready to file no longer names a missing validated copy", !(await readiness.getByText(/no validated copy read back/i).count()));
    await readiness.scrollIntoViewIfNeeded(); await shot("ready-to-file-no-block");
    const after = itemsOf((await prepare(c.id, officer)).p, P, "IMM 5257")[0];
    ok("J-C3 9 (route): the Paper line is In progress, naming the validated copy", after?.state === "in_progress" && after?.validated?.copy === copyId, [after?.state, after?.reason]);

    // A line left Online still gives "Copy, not for filing".
    const sp = formRow("Sample Spouse A");
    await sp.scrollIntoViewIfNeeded();
    ok("J-C3 10: the spouse's IMM 5257, left Online, reads \"Copy, not for filing\"", await sp.getByText("Copy, not for filing").count() >= 1);
    await shot("spouse-online");

    // [C9.2] A fact changes after the read-back: Out of date, and the block is back.
    await answer(c.id, P, "person.family_name", "SAMPLEDZ"); await confirmAll(c.id, P);
    await r.reload(); await formRow("Sample Client A").waitFor(T);
    await formRow("Sample Client A").locator("[data-validated='out_of_date']").waitFor(T).catch(() => null);
    ok("J-C3 11: after the family name changes, Client A's validated copy reads Out of date", await formRow("Sample Client A").locator("[data-validated='out_of_date']").count() === 1, await formRow("Sample Client A").innerText().then((t) => t.slice(0, 300)));
    await formRow("Sample Client A").scrollIntoViewIfNeeded(); await shot("out-of-date"); await axe("Prepare application with the copy out of date");
    await blockLine.waitFor(T).catch(() => null);
    ok("J-C3 12: Ready to file names the missing validated copy again", await readiness.getByText(/no validated copy read back/i).count() >= 1);
    const stale = itemsOf((await prepare(c.id, officer)).p, P, "IMM 5257")[0];
    ok("J-C3 13 (route, C9.2): the Paper line is Out of date, naming the family name", stale?.state === "out_of_date" && /family name/i.test(stale?.reason ?? ""), stale?.reason);
    ok("J-C3: no page error", !errors.length, errors.slice(0, 3));
  } finally { await browser.close(); }
});
