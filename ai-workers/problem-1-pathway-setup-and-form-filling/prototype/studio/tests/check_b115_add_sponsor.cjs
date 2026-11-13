// B115 (QA-271; C6.1, C11.12; P-319): a person adds the sponsor by screens. On a copy with the configured checkpoint
// (Family sponsorship › Spouse or common-law partner released, #1052), the case officer opens a case on it by the
// "Open a case" dialog, sees one Add button per role the release lists (Add sponsor, Add child; no "Add spouse or
// partner": the principal is the sponsored spouse; no "Add representative": the case team's representative of record,
// C7.7, review M1), adds the sponsor, and IMM 1344 and IMM 5532 appear
// for the sponsor on Prepare application and in GET /runtime/cases/:id/forms. Fail lines: before the sponsor, neither
// form is on the case; a second sponsor is refused in words in the dialog (the release allows 1); a Visitor visa case
// offers no Add sponsor (its release lists no sponsor). axe-core (WCAG 2.2 A/AA) and no sideways scroll at 1440 px;
// every wait fails loudly. The check loads the configured checkpoint itself (Reset, then Load) when its copy has no
// released Family sponsorship. Sample data, no live AI, US$0.
//   zsh studio/tools/isolated.sh rt_b115 4439 start && node studio/tests/check_b115_add_sponsor.cjs 4439
const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4439", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[3] ?? null;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400)}`}`); };
const T = { timeout: 20000 };
const FS = "Family sponsorship › Spouse or common-law partner", FS_OPTION = "Spouse or common-law partner · release", VV = /^Visitor visa · release/;
const api = async (path, actor = "user-O") => { const r = await fetch(`${BASE}/api${path}`, { headers: { "x-actor": actor } }); return { status: r.status, body: await r.json().catch(() => null) }; };
// node:http, not fetch: the checkpoint load can outlast fetch's 300 s header wait on a busy machine.
const post = (path, body, actor = "user-A") => new Promise((done, failed) => {
  const data = JSON.stringify(body);
  const rq = require("node:http").request({ host: "localhost", port: PORT, path: `/api${path}`, method: "POST", headers: { "x-actor": actor, "content-type": "application/json", "content-length": Buffer.byteLength(data) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", failed); rq.write(data); rq.end();
});
const shot = async (p, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); } };

(async () => {
  const released = async () => ((await api("/runtime/openable")).body ?? []).some((r) => r.combination === "Spouse or common-law partner" && r.startable);
  if (!(await released())) {
    await post("/demo/reset", { confirm: "RESET" });
    const l = await post("/demo/load", { sample: "configured" });
    if (l.status >= 300 || !(l.body?.released ?? []).includes(FS)) { console.error("STOP  the configured checkpoint did not release Family sponsorship", l.status, JSON.stringify(l.body).slice(0, 400)); process.exit(2); }
    console.log(`      loaded the configured checkpoint in ${Number(l.body.seconds ?? 0).toFixed(1)} s`);
  }
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-O"); });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  const axe = async (name) => {
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok(`B115 axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const run = Date.now().toString(36);
  // Opens a case by the "Open a case" dialog on the released combination whose option matches `which`.
  const openCase = async (which, ref) => {
    await p.goto(`${BASE}/cases`);
    await p.getByRole("button", { name: "Open a case" }).click(T);
    const dlg = p.getByRole("dialog");
    const select = dlg.getByLabel("Combination (released)");
    await select.waitFor(T);
    const options = await select.locator("option").evaluateAll((os) => os.map((o) => ({ value: o.value, text: o.textContent ?? "" })));
    const opt = options.find((o) => (typeof which === "string" ? o.text.startsWith(which) : which.test(o.text)));
    if (!opt) throw new Error(`no released combination ${which} in Open a case: ${options.map((o) => o.text).join(" | ")}`);
    await select.selectOption(opt.value);
    await dlg.getByLabel("Your own reference (optional)").fill(ref);
    await dlg.getByLabel("Principal applicant's name").fill("Sample Client A");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
    await p.getByRole("heading", { name: "People and filings" }).waitFor(T);
    return p.url().split("/").pop();
  };
  const addButtons = async () => (await p.locator("[data-add-role]").evaluateAll((bs) => bs.map((b) => `${b.getAttribute("data-add-role")}|${(b.textContent ?? "").trim()}`)));
  const formsOf = async (id) => (await api(`/runtime/cases/${id}/forms`)).body?.forms ?? [];
  try {
    // 1. Family sponsorship, by screens.
    const id = await openCase(FS_OPTION, `B115-${run}`);
    const view = (await api(`/runtime/cases/${id}`)).body;
    const lines = (view?.can_add ?? []).map((r) => r.role);
    ok("B115 pass (data): the case view lists the roles its release lets a person add, sponsor first, never the principal or the representative", JSON.stringify(lines) === JSON.stringify(["sponsor", "child"]), view?.can_add);
    const buttons = await addButtons();
    ok("B115 pass (P-319): the Add buttons are the release's roles, in its words: Add sponsor, Add child", JSON.stringify(buttons) === JSON.stringify(["sponsor|Add sponsor", "child|Add child"]), buttons);
    ok("B115 fail (review M1, C7.7): no \"Add representative\": the representative comes from the case team, never added as a person", (await p.getByRole("button", { name: /Add representative/ }).count()) === 0);
    ok("B115 fail (P-319): no fixed \"Add spouse or partner\" on a combination whose release lists no spouse line", (await p.getByRole("button", { name: /Add spouse or partner/ }).count()) === 0);
    const before = (await formsOf(id)).map((f) => f.form);
    ok("B115 fail: before the sponsor is added, neither IMM 1344 nor IMM 5532 is on the case", !before.includes("IMM 1344") && !before.includes("IMM 5532"), before);
    await axe("a Family sponsorship case before the sponsor");
    ok("B115: the case page has no sideways scroll at 1440 px", !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    await shot(p, "b115-1-case-before-1440");

    await p.getByRole("button", { name: "Add sponsor", exact: true }).click(T);
    const dlg = p.getByRole("dialog", { name: "Add a sponsor" });
    await dlg.waitFor(T);
    await axe("the Add a sponsor dialog");
    await shot(p, "b115-2-add-sponsor-dialog-1440");
    await dlg.getByLabel("Name", { exact: true }).fill("Sample Sponsor A");
    await dlg.getByRole("button", { name: "Add", exact: true }).click();
    await dlg.waitFor({ state: "hidden", ...T });
    await p.getByText("Sponsor added: their questions are now asked").waitFor(T);
    const chip = p.locator("section[aria-labelledby=people] tr", { hasText: "Sample Sponsor A" });
    await chip.waitFor(T);
    ok("B115 pass: the sponsor is listed on the case in the release's words (Sponsor), sent with the principal's application", /Sponsor/.test(await chip.innerText()) && /Sent with the principal's application/.test(await chip.innerText()), await chip.innerText());
    ok("B115 fail (review m1): the sponsor carries no \"Not travelling\" pill (that pill says they are asked only what the principal's forms need)", !/Not travelling/.test(await chip.innerText()), await chip.innerText());
    const sponsor = (await api(`/runtime/cases/${id}`)).body?.people?.find((x) => x.role === "sponsor");
    const after = await formsOf(id), mine = after.filter((f) => f.subject_id === sponsor?.subject_id).map((f) => f.form);
    ok("B115 pass (data): IMM 1344 and IMM 5532 are on the case for the sponsor", mine.includes("IMM 1344") && mine.includes("IMM 5532"), after.map((f) => `${f.form}:${f.person}`));
    const panel = p.locator("section[aria-labelledby=forms-h]");
    for (const form of ["IMM 1344", "IMM 5532"]) {
      await panel.getByText(form, { exact: false }).first().waitFor(T);
      ok(`B115 pass (screen): ${form} appears on Prepare application`, (await panel.getByText(form, { exact: false }).count()) > 0);
    }
    await shot(p, "b115-3-case-after-sponsor-1440");

    // A second sponsor: the release allows at most 1; the refusal is in words in the dialog, nothing added.
    await p.getByRole("button", { name: "Add sponsor", exact: true }).click(T);
    const dlg2 = p.getByRole("dialog", { name: "Add a sponsor" });
    await dlg2.getByLabel("Name", { exact: true }).fill("Sample Sponsor B");
    await dlg2.getByRole("button", { name: "Add", exact: true }).click();
    await dlg2.getByText(/at most 1 sponsor/).waitFor(T);
    ok("B115 fail: a second sponsor is refused in words (the release allows 1), nothing added", (await api(`/runtime/cases/${id}`)).body?.people?.filter((x) => x.role === "sponsor").length === 1);
    await dlg2.getByRole("button", { name: "Cancel" }).click();

    // The next step (P-352): the sponsor's questions are asked. As Client A, the Client questionnaire has a part about
    // the sponsor, and its first part names the role in words ("(sponsor)"), never a blank or an internal name.
    const cctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await cctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-P"); });
    const cp = await cctx.newPage();
    cp.on("pageerror", (e) => errors.push(`client: ${e.message}`));
    await cp.goto(`${BASE}/cases/${id}/questionnaire`);
    const about = cp.getByRole("heading", { name: "About Sample Sponsor A" });
    await about.waitFor(T);
    await cp.locator("section", { has: about }).getByRole("button").first().click();
    const line = cp.getByText(/^Answering for/);
    await line.waitFor(T);
    const words = await line.innerText();
    ok("B115 pass (next step): the Client questionnaire asks about the sponsor, \"Answering for Sample Sponsor A (sponsor)\"", /Sample Sponsor A \(sponsor\)/.test(words), words);
    ok("B115 fail: the role is never blank or an internal name in that line", !/\(\)|undefined|co_files/.test(words), words);
    await shot(cp, "b115-4-client-sponsor-part-1440");
    await cctx.close();

    // 2. Visitor visa: its release lists no sponsor, so no Add sponsor (choices from the release, never a fixed list).
    const vv = await openCase(VV, `B115V-${run}`);
    const vvButtons = await addButtons();
    ok("B115 fail (P-319): a Visitor visa case offers no Add sponsor and no Add representative; its buttons are its release's roles", JSON.stringify(vvButtons) === JSON.stringify(["spouse_or_partner|Add spouse or partner (travelling)", "child|Add child (travelling)"]), vvButtons);
    const r = await fetch(`${BASE}/api/runtime/cases/${vv}/people`, { method: "POST", headers: { "x-actor": "user-O", "content-type": "application/json" }, body: JSON.stringify({ role: "sponsor", displayName: "Sample Sponsor V" }) });
    ok("B115 fail (route agrees with the screen): adding a sponsor to the Visitor visa case is refused (422)", r.status === 422, r.status);
  } catch (e) {
    ok("B115 journey ran to the end", false, String(e && e.message ? e.message : e));
  }
  ok("B115: no page error", errors.length === 0, errors);
  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
