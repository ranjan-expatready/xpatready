// qa (11 Nov, after-merge G5 on main fbfb263c7): QA-391. After Demo › Load the finished story, the family case's
// conditional forms that no longer apply on release 2 (IMM 5475 and IRM 0002, for all four people: their rules read No once
// the story answers the facts) stay listed under each submitted filing with their release-1 copy (made by the configured
// checkpoint before those facts were answered) marked "Out of date" and the words "Facts changed since this copy was made;
// generate a new copy to file it", beside "This form no longer applies to <person> (for example, not travelling)" and a
// disabled "Generate a new copy". Every one of these people travels. Expected: a form that no longer applies is never told
// to be filed again; its copy reads as kept, never filed (as the move panel says for IMM 5707), and the reason is the
// form's own rule, not "not travelling". Part b: an Online form's old "Copy, not for filing" is told "to file it".
// Fails today; passes when fixed. US$0, live AI off.
//   zsh tools/isolated.sh qa_391 4472 start && node tests/qa/check_qa391_not_applying_out_of_date.cjs 4472
//   (loads the finished story itself when the copy has not, about 4 min; never :4400)
const fs = require("fs"); const { chromium } = require("playwright");
const port = process.argv[2]; if (!port || port === "4400") { console.log("usage: <port of an isolated copy>, never 4400"); process.exit(2); }
const base = `http://localhost:${port}`;
const get = async (path, actor = "user-A") => (await fetch(base + path, { headers: { "x-actor": actor } })).json();
let failed = 0; const ok = (name, pass, detail) => { if (!pass) failed++; console.log(`${pass ? "PASS" : "FAIL"} ${name}${!pass && detail ? `: ${JSON.stringify(detail).slice(0, 600)}` : ""}`); };
(async () => {
  let st = await get("/api/demo/status");
  if (st.story?.state !== "done") {
    const r = await fetch(base + "/api/demo/checkpoints/finished-story", { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify({ confirm: "RESET" }) });
    if (r.status !== 202) { console.log("could not start the finished story", r.status, await r.text()); process.exit(2); }
    for (let i = 0; i < 120 && st.story?.state !== "done" && st.story?.state !== "failed"; i++) { await new Promise((z) => setTimeout(z, 5000)); st = await get("/api/demo/status"); }
    if (st.story?.state !== "done") { console.log("the finished story did not finish", st.story); process.exit(2); }
  }
  const cases = await get("/api/runtime/cases", "user-O"); const fam = (Array.isArray(cases) ? cases : cases.cases).find((c) => c.reference === "SAMPLE-VV-FAMILY-1");
  const forms = (await get(`/api/runtime/cases/${fam.id}/forms`, "user-O")).forms;
  const gone = forms.filter((f) => !f.applies);
  ok("QA-391 setup: the family case has conditional forms that no longer apply (IMM 5475, IRM 0002)", gone.length > 0, forms.map((f) => `${f.form}|${f.person}|${f.applies}`));
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.statSync("/opt/pw-browsers/chromium", { throwIfNoEntry: false })?.isFile() ? { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] } : {}) }); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-O"); } catch {} });
  const p = await ctx.newPage(); await p.goto(`${base}/cases/${fam.id}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  const rows = await p.locator("li[data-row-form]").evaluateAll((els) => els.map((e) => ({ key: e.getAttribute("data-row-form"), text: e.innerText.replace(/\s+/g, " ") })));
  const notApplying = rows.filter((r) => /This form no longer applies/.test(r.text));
  ok("QA-391 setup: the case page shows the forms that no longer apply", notApplying.length === gone.length, { page: notApplying.length, api: gone.length });
  const toFile = notApplying.filter((r) => /generate a new copy to file it/i.test(r.text));
  ok("QA-391a fail today: a form that no longer applies is never told \"generate a new copy to file it\"", toFile.length === 0, toFile.map((r) => r.key));
  const ood = notApplying.filter((r) => /\bOut of date\b/.test(r.text));
  ok("QA-391a fail today: its kept copy is not marked \"Out of date\" (it is kept, never filed)", ood.length === 0, ood.map((r) => r.key));
  const travelling = notApplying.filter((r) => /for example, not travelling/.test(r.text));
  ok("QA-391c fail today: the reason is the form's own rule, not \"not travelling\" (all four people travel)", travelling.length === 0, travelling.map((r) => r.key));
  const online = rows.filter((r) => /Copy, not for filing/.test(r.text) && /generate a new copy to file it/i.test(r.text));
  ok("QA-391b fail today: a \"Copy, not for filing\" is never told \"to file it\"", online.length === 0, online.map((r) => r.key));
  await p.screenshot({ path: `var/qa391-${port}.png`, fullPage: true }).catch(() => {});
  await b.close(); console.log(failed ? `${failed} failed` : "all passed"); process.exit(failed ? 1 : 0);
})();
