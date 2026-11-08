// C7.6 by screens: a Paper form's Printed and Signed in pen, recorded by the case officer on the case page at 1440 px
// (B161, Lead 34 on #1334; B132 #1278 gave the routes; P-348 (3): a capability counts when a person can do it by screens).
// Next to C7.6-10c, which records the same two steps through the API on Client A's case: here they are recorded by
// screens on a case of its own (Sample Client P), so C7.6.test.ts is untouched. The barcode form is C1's own line
// (expectedFor, never a form number written here), switched to Paper with a written accommodation reason (founder Q3,
// P-380; Sample, Unconfirmed: no counsel). Every word checked on the screen is compared with the server's own answer for
// the same step. Each rule has a pass and a fail. Synthetic data only; no model call (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/acceptance/C7.6-screen.test.ts 4440 xr_studio_accept
import { call, expectedFor, fillEverything, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, filingOf, sql, validateRoundTrip, yearsAgo } from "./lib/m3.ts";
import { walker } from "./lib/browser.ts";

const PORT = process.argv[2] ?? "4440", BASE = `http://127.0.0.1:${PORT}`;
type PenItem = { id: string; channel?: string; signature?: string; record?: string };
type ItemRead = { sign_steps?: { key: string; done: { at: string; by: string; copy?: string | null } | null }[] };

await main("C7.6", "Ready to file: Printed and Signed in pen by screens (Paper, 1440 px)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? "user-O";
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client P", dob: yearsAgo(41) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client P"];
  const e = (await expectedFor(c.id))?.["Sample Client P"], BC = [...(e?.forms ?? []), ...(e?.waiting ?? [])].find((l) => l.barcode)?.form;
  const item = async () => (BC ? itemsOf((await prepare(c.id, officer)).p, P, BC) : []).find((x) => !(x as unknown as PenItem).record) as unknown as PenItem | undefined;
  // The barcode form moves to Paper (from Online on release 2, or from PDF upload on the fixture), with a written reason.
  let it = await item();
  if (it && it.channel !== "PAPER") {
    const q = (await prepare(c.id, officer)).p;
    const r = await call("PATCH", `/runtime/items/${it.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, officer);
    console.log(`NOTE  ${BC} moved from ${it.channel} to Paper for this person with an accommodation reason (founder Q3): ${r.status}${r.status === 200 ? "" : ` ${r.body?.detail ?? ""}`}`);
  }
  await fillEverything(c.id);
  const vcopy = BC ? await validateRoundTrip(c.id, BC, P) : null;
  it = await item();
  console.log(`NOTE  set-up: ${BC} on ${it?.channel}, signed ${it?.signature}; validated copy read back: ${vcopy ? "yes" : "no"}`);
  const steps = async () => ((await call("GET", `/runtime/items/${it?.id}`, undefined, officer)).body as ItemRead)?.sign_steps ?? [];
  const rows = () => sql(`select string_agg(key, ',' order by done_at) from sign_step where item_id='${it?.id}' and superseded_at is null`) ?? "";
  const penWarn = async () => { const p = (await prepare(c.id, officer)).p; return (readinessOf(p, filingOf(p, P)?.id)?.warns ?? []).some((w) => w.code === "missing_signature" && !!BC && w.words.includes(BC) && /in pen/.test(w.words)); };

  const w = await walker(BASE);
  try {
    const page = await w.open(officer, 1440), stale = await w.open(officer, 1440);
    const open = async (p = page) => { await p.goto(`/cases/${c.id}`); await w.settle(p, "the case page"); await p.locator(`[data-pen-block="${it?.id}"]`).waitFor({ timeout: 20_000 }); };
    const block = (p = page) => p.locator(`[data-pen-block="${it?.id}"]`);
    await open(); await open(stale); // the second tab is read now and used after the steps are recorded: a stale page

    // 10d. Out of order: before Printed, Signed in pen has no button and says why in the server's own words.
    const shownWhy = (await block().locator('[data-step="sign_in_pen"] [data-step-why]').innerText().catch(() => "")).replace(/^Cannot start yet:\s*/, "").trim();
    const early = await call("POST", `/runtime/items/${it?.id}/sign-steps/sign_in_pen`, {}, officer);
    ok(`C7.6-10d fail (B161): before Printed, ${BC}'s "Signed in pen" has no button and the screen says why in the words the server refuses with (409), nothing recorded`,
      it?.signature === "PEN" && !!vcopy && (await block().locator('[data-step-action="sign_in_pen"]').count()) === 0 && !!shownWhy && early.status === 409 && early.body?.detail === shownWhy && rows() === "",
      { signature: it?.signature, shown: shownWhy, server: [early.status, early.body?.detail], rows: rows() });

    // 10e. Printed by screens: the button names the validated copy, and the copy recorded is that one.
    await block().locator('[data-step-action="print"]').click();
    await block().locator('[data-step="print"][data-done="yes"]').waitFor({ timeout: 15_000 });
    const printed = (await steps()).find((s) => s.key === "print")?.done;
    ok(`C7.6-10e pass (B161): the case officer presses "Printed" on ${BC}'s Paper line; Printed is recorded by them, on the validated copy, and the row shows who and when`,
      !!printed && printed.by === officer && printed.copy === vcopy && rows() === "print" && /recorded by/.test(await block().locator('[data-step="print"]').innerText()),
      { printed, vcopy, rows: rows() });

    // 10f. Signed in pen by screens: recorded, and readiness no longer warns that the form must be signed in pen.
    const before = await penWarn();
    await block().locator('[data-step-action="sign_in_pen"]').click();
    await block().locator('[data-step="sign_in_pen"][data-done="yes"]').waitFor({ timeout: 15_000 });
    const after = await penWarn();
    ok(`C7.6-10f pass (B161): then "Signed in pen" is recorded by screens; the CRITICAL "must be signed in pen" on ${BC} was there before and is gone after`,
      before && !after && rows() === "print,sign_in_pen" && (await steps()).find((s) => s.key === "sign_in_pen")?.done?.by === officer,
      { before, after, rows: rows() });

    // 10g. A stale page: its "Printed" is refused in the server's own words, shown under "Not recorded"; nothing changes.
    await block(stale).locator('[data-step-action="print"]').click();
    await block(stale).locator("[data-sign-refusal]").waitFor({ timeout: 15_000 });
    const refusal = (await block(stale).locator("[data-sign-refusal]").innerText()).replace(/\s+/g, " ").trim();
    const again = await call("POST", `/runtime/items/${it?.id}/sign-steps/print`, { copy: vcopy }, officer);
    ok(`C7.6-10g fail (B161): a page read before the steps were recorded presses "Printed": refused under "Not recorded" in the server's own words, nothing recorded again`,
      again.status === 409 && /^Not recorded/.test(refusal) && refusal.includes(again.body?.detail ?? "\u0000") && rows() === "print,sign_in_pen",
      { refusal, server: [again.status, again.body?.detail], rows: rows() });

    // 10h. The block is reachable and readable: no axe violation inside it; the done steps say so to a screen reader.
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    const axe = await new AxeBuilder({ page }).include(`[data-pen-block="${it?.id}"]`).analyze();
    const sr = await block().locator('[data-step="sign_in_pen"] .sr-only').innerText();
    ok("C7.6-10h pass (B161): the Paper steps block has no axe violation, and a done step reads \"done\" to a screen reader",
      axe.violations.length === 0 && /done/.test(sr), axe.violations.map((v) => `${v.id}: ${v.help}`));
    ok("C7.6-10h fail: no page error while the steps were recorded", w.errors.length === 0, w.errors);
  } finally { await w.close(); }
});
