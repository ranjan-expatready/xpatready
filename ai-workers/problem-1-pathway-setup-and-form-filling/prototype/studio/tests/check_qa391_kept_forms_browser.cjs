// QA-391 (journey Major for the Bake's exit E3; P-65, C9.5 "kept and listed, never filed"; C9.2, C10.2): after Demo › Load
// the finished story, the family case's conditional forms whose rules read No once the story answers the facts stay listed
// with their earlier copies. Such a form is kept and listed, never filed: its copies read "Kept, never filed", never "Out of
// date … generate a new copy to file it"; its row says why by the form's own rule (never "not travelling" for a person who
// travels, never a field code) and offers no Generate, Validate or facts "before filing"; the lock route refuses its copy.
// A copy for checking only (filed Online) is never told "to file it". Replaces qa's tests/qa/check_qa391_not_applying_out_of_date.cjs
// as the regression suite (its a, b, c lines are here). Loads the finished story itself (about 4 minutes; replays only,
// US$0, live AI off).
//   zsh studio/tools/isolated.sh qa391 4453 start && node studio/tests/check_qa391_kept_forms_browser.cjs 4453 xr_studio_qa391
const fs = require("fs"); const { chromium } = require("playwright");
const port = process.argv[2]; if (!port || port === "4400") { console.log("usage: <port of an isolated copy>, never 4400"); process.exit(2); }
const base = `http://localhost:${port}`, OFFICER = "user-O", AUTHOR = "user-A";
const call = async (method, path, body, actor = OFFICER) => { const r = await fetch(base + "/api" + path, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
let failed = 0; const ok = (name, pass, detail) => { if (!pass) failed++; console.log(`${pass ? "PASS" : "FAIL"} ${name}${!pass && detail !== undefined ? `: ${JSON.stringify(detail).slice(0, 600)}` : ""}`); };
(async () => {
  let st = (await call("GET", "/demo/status", undefined, AUTHOR)).body;
  if (st?.story?.state !== "done" || st?.checkpoint !== "finished_story") {
    const r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" }, AUTHOR);
    if (r.status !== 202) { console.log("FAIL the finished story could not start", r.status, JSON.stringify(r.body).slice(0, 300)); process.exit(1); }
    const until = Date.now() + 600_000;
    do { await new Promise((z) => setTimeout(z, 5000)); st = (await call("GET", "/demo/status", undefined, AUTHOR)).body; } while (Date.now() < until && st?.story?.state !== "done" && st?.story?.state !== "failed");
    if (st?.story?.state !== "done") { console.log("FAIL the finished story did not finish", JSON.stringify(st?.story).slice(0, 300)); process.exit(1); }
  }
  const list = (await call("GET", "/runtime/cases")).body; const fam = (Array.isArray(list) ? list : list.cases).find((c) => c.reference === "SAMPLE-VV-FAMILY-1");
  const forms = (await call("GET", `/runtime/cases/${fam.id}/forms`)).body.forms;
  const kept = forms.filter((f) => !f.applies), applying = forms.filter((f) => f.applies);
  ok("QA-391 setup: the family case lists forms that no longer apply, each with its kept copies", kept.length > 0 && kept.every((f) => f.copies.length > 0), forms.map((f) => `${f.form}|${f.person}|${f.applies}`));
  // The reason (QA-391 c): the form's own rule in its deciding question's words; every person on the story travels.
  ok("QA-391c pass: each form that no longer applies says why by its own rule (\"needed only when …\")", kept.every((f) => /^it is needed only when ".+" is (Yes|No|".+"), and this case's answer says otherwise$/.test(f.applies_why ?? "")), kept.map((f) => f.applies_why));
  ok("QA-391c fail: the reason is never \"not travelling\" nor a field code", kept.every((f) => !/not travelling/.test(f.applies_why) && !/\b(case|person)\.[a-z_]+|[a-z]+_[a-z]+/.test(f.applies_why)), kept.map((f) => f.applies_why));
  ok("QA-391c pass: a form that applies has no such reason", applying.every((f) => f.applies_why == null), applying.filter((f) => f.applies_why != null).map((f) => f.form));
  // The rule on the server: a kept copy is never filed or uploaded back (P-65, C9.5).
  const keptCopy = kept[0]?.copies[0];
  const lock = keptCopy ? await call("POST", `/runtime/form-copies/${keptCopy.id}/lock`, { kind: "filed" }) : { status: 0, body: null };
  ok("QA-391 fail: locking a copy of a form that no longer applies as Filed is refused (409, kept, never filed)", lock.status === 409 && /no longer applies/.test(lock.body?.detail ?? "") && /never filed/.test(lock.body?.detail ?? ""), lock);
  const after = (await call("GET", `/runtime/cases/${fam.id}/forms`)).body.forms.flatMap((f) => f.copies).find((c) => c.id === keptCopy?.id);
  ok("QA-391 fail: the refused copy stays as it was (not locked)", !!after && !after.locked, after?.locked);
  // The screen, at 1440 px, as the case officer.
  const exe = process.platform === "darwin" ? { channel: "chrome" } : fs.statSync("/opt/pw-browsers/chromium", { throwIfNoEntry: false }) ? { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] } : {};
  const b = await chromium.launch({ headless: true, ...exe }); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch {} }, OFFICER);
  const p = await ctx.newPage(); await p.goto(`${base}/cases/${fam.id}`);
  await p.locator("li[data-row-form]").first().waitFor({ timeout: 60_000 });
  await p.locator("[data-not-applying]").first().waitFor({ timeout: 30_000 });
  const rows = await p.locator("li[data-row-form]").evaluateAll((els) => els.map((e) => ({ key: e.getAttribute("data-row-form"), text: e.innerText.replace(/\s+/g, " "), generate: [...e.querySelectorAll("button")].some((x) => /Generate (a new copy|a copy)/.test(x.textContent ?? "")), kept: e.querySelectorAll("[data-copy-kept]").length, why: e.querySelector("[data-not-applying]")?.textContent ?? null })));
  const keptRows = rows.filter((r) => r.why !== null);
  ok("QA-391 setup: the page shows every form that no longer applies", keptRows.length === kept.length, { page: keptRows.length, api: kept.length });
  ok("QA-391a fail: a form that no longer applies is never told \"generate a new copy to file it\"", keptRows.every((r) => !/to file it/i.test(r.text)), keptRows.filter((r) => /to file it/i.test(r.text)).map((r) => r.key));
  ok("QA-391a fail: its kept copy is never marked \"Out of date\"", keptRows.every((r) => !/\bOut of date\b/.test(r.text)), keptRows.filter((r) => /\bOut of date\b/.test(r.text)).map((r) => r.key));
  ok("QA-391a pass: its copies read \"Kept, never filed\" and the row says why, by the form's own rule", keptRows.every((r) => r.kept > 0 && /Kept, never filed/.test(r.text) && /This form no longer applies to .+: it is needed only when .+\. Its copies are kept as they were, never filed\./.test(r.why)), keptRows.map((r) => [r.key, r.kept, r.why]));
  ok("QA-391a fail: no Generate, Validate, \"not for filing\" or steps \"before filing\" on a form that no longer applies", keptRows.every((r) => !r.generate && !/before filing|Before filing|Facts confirmed|not for filing/i.test(r.text)), keptRows.filter((r) => r.generate || /before filing|Facts confirmed|not for filing/i.test(r.text)).map((r) => r.key));
  const applyingRows = rows.filter((r) => r.why === null);
  ok("QA-391 pass: a form that applies keeps its Generate button and no \"Kept\" copy", applyingRows.length > 0 && applyingRows.every((r) => r.generate && r.kept === 0), applyingRows.filter((r) => !r.generate || r.kept).map((r) => r.key));
  // QA-391 b: an Online form's "Copy, not for filing" is for checking only.
  const online = rows.filter((r) => /Copy, not for filing/.test(r.text) && r.why === null);
  ok("QA-391b fail: a \"Copy, not for filing\" is never told \"to file it\"", online.length > 0 && online.every((r) => !/to file it/i.test(r.text)), online.filter((r) => /to file it/i.test(r.text)).map((r) => r.key));
  const onlineOld = online.filter((r) => /Facts changed since this copy was made/.test(r.text));
  ok("QA-391b pass: its out-of-date copy is told to be made again to check the current answers", onlineOld.length > 0 && onlineOld.every((r) => /generate a new copy to check the current answers/.test(r.text)), online.map((r) => r.key));
  fs.mkdirSync("var", { recursive: true }); await p.screenshot({ path: `var/qa391-kept-${port}.png`, fullPage: true }).catch(() => {});
  await b.close(); console.log(failed ? `${failed} failed` : "all passed"); process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL", e.message); process.exit(1); });
