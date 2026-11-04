// C6.12 breadth (F6, 3 Nov; tech lead on #677 and #686, P-290): one check per reason C6.12 "Filings and fees derived from
// the case" is Partial in qa/CAPABILITIES.md ("Not built: sponsorship's two filings, the child study-permit question,
// other combinations, the screen (the case page shows no filings or fees)"). Each reads what a person would see once that
// part is built, so this pack is red until then and C6.12 stays Partial while it is (Works needs this pack and
// acceptance/C6.12.test.ts green). Kept apart from C6.12.test.ts, the Visitor visa part, because
// tests/check_vv_prepare_api.ts runs that one as a regression check and needs it green (README: a builder moves a pack
// into the suites when it passes). Rules and one browser read; no model call (US$0).
// Needs first, on a fresh copy: tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts (as C6.12).
//   tsx studio/acceptance/C6.12-breadth.test.ts 4440 xr_studio_accept
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { FEE_TABLE } from "../engine/runtime/filings.ts";
import { FAMILY, OFFICER, PORT, main, needVisitorVisa, ok, openCase, sql } from "./lib/m3.ts";

await main("C6.12 breadth", "Filings and fees: the parts C6.12 is Partial for", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY); // a Visitor visa family case, for the case page (C6.12-25)
  type TableLine = { key: string; label?: string; basis?: string; family_max?: unknown };
  type TableCombo = { label?: string; lines?: string[]; modes?: Record<string, string> };
  const lines = (Array.isArray(FEE_TABLE.lines) ? FEE_TABLE.lines : []) as unknown as TableLine[];
  const combos = (FEE_TABLE.combinations ?? {}) as unknown as Record<string, TableCombo>;
  // (1) Spouse or partner sponsorship: two filings (sponsorship, PR) in one submission group.
  const fsReleased = Number(sql("select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='fs.spouse'") ?? 0);
  const fsTable = combos["fs.spouse"];
  ok("C6.12-22 pass (Partial: sponsorship): spouse or partner sponsorship is two filings, the sponsorship and the PR application, in one submission group — Spouse or common-law partner is released and its fee lines are set per filing", fsReleased > 0 && !!fsTable && (fsTable.lines ?? []).some((k) => /sponsorship/.test(k)) && (fsTable.lines ?? []).some((k) => /^pr_/.test(k)) && Object.values(fsTable.modes ?? {}).some((m) => /co_file/.test(m)),
    { released: fsReleased, feeTable: fsTable ?? "no fs.spouse entry in samples/fee-table.json (only vv.single today)" });
  // (2) The case officer's question for an accompanying child of a student or worker.
  const studyQ = Number(sql("select count(*) from config_release where snapshot::text ~* '(study|studies)[^\"]{0,40}(6|six) months or more'") ?? 0);
  ok("C6.12-23 pass (Partial: child study question): a release of a student or worker combination asks the case officer \"will this child study 6 months or more?\" (yes adds a study permit filing)", studyQ > 0, { releasesWithTheQuestion: studyQ });
  // (3) Other combinations: extensions, study and work permits have their fees, with no family maximum.
  const other = lines.filter((l) => /study|work|extension/i.test(`${l.key} ${l.label ?? ""}`));
  ok("C6.12-24 pass (Partial: other combinations): the fee table prices study permits, work permits and extensions, none with a family maximum", ["study", "work", "extension"].every((w) => other.some((l) => new RegExp(w, "i").test(`${l.key} ${l.label ?? ""}`))) && other.every((l) => !l.family_max && l.basis !== "family_maximum"),
    { lines: lines.map((l) => l.key), combinations: Object.keys(combos) });
  // (4) The screen: the case officer sees the filings and fees on the case page.
  const browser = await chromium.launch(existsSync("/opt/google/chrome/chrome") || process.platform === "darwin" ? { channel: "chrome" } : {});
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* private window */ } }, OFFICER);
    const pg = await ctx.newPage();
    await pg.goto(`http://localhost:${PORT}/cases/${c.id}`);
    await pg.waitForLoadState("networkidle", { timeout: 30_000 }); // throws on a time-out (a wait fails loudly)
    await pg.getByText(/Sample Client A/).first().waitFor({ timeout: 30_000 });
    const page = (await pg.locator("body").innerText()).replace(/\s+/g, " ");
    ok("C6.12-25 pass (Partial: the screen): the case page shows the case's filings and fees (visitor visa CAD 100 each, biometrics CAD 170 for the family)", /visitor visa fee/i.test(page) && /CAD\s?100/.test(page) && /biometric/i.test(page) && /CAD\s?170/.test(page), page.match(/.{0,60}(fee|CAD).{0,60}/i)?.[0] ?? "no fee or CAD on the case page");
  } finally { await browser.close(); }
});
