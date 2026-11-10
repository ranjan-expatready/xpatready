// Re-read (qa, after walk_c102's locator caught only the validate box): the Paper IMM 5257's whole card on the family
// case, as the case officer, 1024 px. The story is loaded by its route as the author (the screen load was walked in
// walk_c102). Reads only. US$0.   LIBDIR=<studio>/acceptance/lib tsx read_card.mts <port> <db> <outdir>
const [port, , out] = process.argv.slice(2);
const { walker } = await import(`${process.env.LIBDIR}/browser.ts`);
const { call, until, sql } = await import(`${process.env.LIBDIR}/m3.ts`);
let r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" }, "user-A");
console.log("load:", r.status);
await until(async () => { const b = (await call("GET", "/demo/status", undefined, "user-A")).body; return b?.story?.state === "done" && b?.checkpoint === "finished_story"; }, 900_000);
const caseId = sql(`select id from runtime_case where reference='SAMPLE-VV-FAMILY-1'`);
const w = await walker(`http://127.0.0.1:${port}`);
try {
  const o = await w.open("user-O", 1024);
  await o.goto(`/cases/${caseId}`); await w.settle(o, "case");
  const btn = o.getByRole("button", { name: /^Read back the validated copy$/ }).first();
  await btn.scrollIntoViewIfNeeded();
  let el = btn; let best = "";
  for (let i = 1; i <= 10; i++) { el = el.locator("xpath=.."); const t = (await el.innerText()).trim(); console.log(`--- ancestor ${i}: ${t.length} chars`); if (/Validate IMM 5257 in Adobe|Printed|Signed/.test(t) && t.includes("Child 18 or over") && !best) { best = t; await el.screenshot({ path: `${out}/07-paper-card-whole.png` }); console.log(t); break; } }
  // The Paper copy's own "Not needed" lines for question 7.
  const fb = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, "user-O")).body;
  console.log("forms keys:", Object.keys(fb ?? {}).slice(0, 10));
  console.log(JSON.stringify(fb).match(/.{0,200}Not needed: written only when.{0,200}/g)?.slice(0, 4));
  console.log("page errors:", w.errors);
} finally { await w.close(); }
