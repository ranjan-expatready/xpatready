// X5 fill hardening (PR #146; forms lane; P-156 (1), P156-2; C2.6): Find again and "Check against canada.ca" against an
// edited copy of the recorded canada.ca pages, US$0 (saved AI answers replayed; no live AI, no network). Proves the fixes
// the review of 521bc9c4 found unguarded by any failing test:
//   M16  a file Find again downloads (or finds byte-identical) gets the index date read before the download as its
//        baseline, so a page edited after the PDF's printed month reads Ready, not "Newer edition on canada.ca";
//   m46  Find again on canada.ca's own bytes clears a stale "new file" marker;
//   no-file  a check on a form with no approved file answers before downloading (its PDF missing on canada.ca: 201, not 409).
// The copy reads this test's own folder of recorded copies (STUDIO_CANADA_FIXTURES=fx, inside its working folder); the
// test edits it and restarts its own copy between variants (the recorded index is read once per process).
//   zsh studio/tools/isolated.sh forms_x5f 4451 start STUDIO_CANADA_FIXTURES=fx && tsx studio/tests/check_forms_x5_finder_baseline.ts 4451 xr_studio_forms_x5f
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_x5f", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const OFFICIAL = join(STUDIO, "..", "..", "official-sources", "ircc"), VAR = join(STUDIO, "var", `isolated-${NAME}`), FX = join(VAR, "fx");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

// ── the test's own recorded copies: every recorded item copied, then edited with its checksum re-recorded
type Item = { url: string; path: string; sha256: string; status: number };
const INDEX = join(FX, "canada", "index.json");
function freshCopies() {
  const idx = JSON.parse(readFileSync(join(OFFICIAL, "canada", "index.json"), "utf8")) as { items: Item[] };
  for (const it of idx.items) { const dst = join(FX, it.path); mkdirSync(dirname(dst), { recursive: true }); copyFileSync(join(OFFICIAL, it.path), dst); }
  writeFileSync(INDEX, JSON.stringify(idx, null, 1));
}
function edit(rel: string, change: (t: string) => string) {
  const idx = JSON.parse(readFileSync(INDEX, "utf8")) as { items: Item[] };
  const p = join(FX, rel), t = readFileSync(p, "utf8"), t2 = change(t);
  if (t2 === t) throw new Error(`edit of ${rel} changed nothing`);
  writeFileSync(p, t2);
  for (const it of idx.items) if (it.path === rel) it.sha256 = sha(Buffer.from(t2, "utf8"));
  writeFileSync(INDEX, JSON.stringify(idx, null, 1));
}
const indexDate = (code: string, date: string) => edit("canada/pages/application-forms-guides.html", (t) =>
  t.replace(new RegExp(`(<td class="col-md-2">${code}</td>\\s*<td class="col-md-8">[\\s\\S]*?</td>\\s*<td class="col-md-2">)([^<]*)(</td>)`), `$1${date}$3`));
function status404(urlEnd: string) {
  const idx = JSON.parse(readFileSync(INDEX, "utf8")) as { items: Item[] };
  for (const it of idx.items) if (it.url.endsWith(urlEnd)) it.status = 404;
  writeFileSync(INDEX, JSON.stringify(idx, null, 1));
}
const restart = async () => {
  try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", "STUDIO_CANADA_FIXTURES=fx"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch { /* waited for below */ }
  for (let i = 0; i < 240; i++) { if ((await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).catch(() => null))?.status === 200) return; await sleep(500); }
  throw new Error("the copy did not come back after a restart");
};

/** Find again in replay mode (saved AI answers, US$0) on a combination, to the end of the run. */
async function findAgain(label: string): Promise<string> {
  const id = sql(`select id from combination where label = '${label}' limit 1`);
  const plan = await call("POST", `/combinations/${id}/forms/find/plan`, { mode: "replay" });
  const run = await call("POST", `/combinations/${id}/forms/find`, { mode: "replay", planSha256: plan.body?.plan_sha256, idempotencyKey: `x5f-${Date.now()}-${Math.random()}` });
  if (!run.body?.id) throw new Error(`Find again did not start: ${JSON.stringify(run.body).slice(0, 200)}`);
  for (let i = 0; i < 240; i++) {
    const s = (await call("GET", `/form-finder/runs/${run.body.id}`)).body;
    if (!/^(RUNNING|QUEUED)$/i.test(String(s?.status))) return String(s?.status);
    await sleep(500);
  }
  throw new Error("Find again did not finish within 2 minutes");
}
const rowOf = async (code: string) => ((await call("GET", `/library/forms/list?q=${encodeURIComponent(code)}`)).body.rows as any[]).find((x) => x.code === code); // eslint-disable-line @typescript-eslint/no-explicit-any
const C = "IMM 5645", VV = "Visitor visa";

(async () => {
  if (!existsSync(VAR)) throw new Error(`start the copy first (see the usage line): ${VAR} is missing`);
  // ── M16 (a): the page edited after the PDF's printed month (01-2021 → March 2025), the index at 2025-03-12; the form has
  // no file until Find again downloads canada.ca's PDF.
  freshCopies();
  edit("canada/pages/imm5645.html", (t) => t.replace("January 2021", "March 2025"));
  indexDate(C, "2025-03-12");
  await restart();
  await call("POST", "/demo/reset", { confirm: "RESET" }); await call("POST", "/demo/load");
  await call("POST", "/library/forms/fill-from-index");
  const before = await rowOf(C);
  const r1 = await findAgain(VV);
  const after = await rowOf(C);
  const base = () => sql(`select coalesce(e.index_date_seen_current, '') from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = '${C}' and e.channel <> 'ONLINE' order by e.edition_label desc limit 1`);
  ok("C2.6 X5 break (0796fc0c) M16 fail: a file Find again just downloaded from canada.ca reads Ready under a page edited after its printed month, with the index date as its baseline (before: 'Newer edition on canada.ca' at once)", before?.status === "no_file" && /^(COMPLETED|PARTIAL)$/.test(r1) && after?.status === "ready" && base() === "2025-03-12", { before: before?.status, run: r1, after: after?.status, baseline: base() });
  ok("C2.6 X5 US$0: the replayed Find again made no live AI call", sql("select count(*) from ai_batch where mode = 'LIVE'") === "0");

  // ── M16 (b): IRCC's index moves on (same PDF): the fill reads it newer; Find again finds canada.ca's same bytes and
  // records them as current at the index date (never lowered).
  indexDate(C, "2025-06-02");
  await restart();
  await call("POST", "/library/forms/fill-from-index");
  const newer = await rowOf(C);
  const r2 = await findAgain(VV);
  const same = await rowOf(C);
  ok("C2.6 X5 break (0796fc0c) M16 fail: Find again on canada.ca's same bytes answers 'newer': Ready, baseline at the index date (before: the row stayed Newer)", newer?.status === "newer_file" && /^(COMPLETED|PARTIAL)$/.test(r2) && same?.status === "ready" && base() === "2025-06-02", { newer: newer?.status, run: r2, after: same?.status, baseline: base() });

  // ── m46: a stale "new file" marker (planted) on canada.ca's own bytes is cleared by Find again.
  sql(`update form_edition set newer_file_sha256 = 'c' || repeat('0', 63) where gov_form_def_id = (select id from gov_form_def where form_key = '${C}') and channel <> 'ONLINE'`);
  const marked = await rowOf(C);
  await findAgain(VV);
  const cleared = await rowOf(C);
  ok("C2.6 X5 break (0796fc0c) m46 fail: Find again on canada.ca's own bytes clears a stale new-file marker (before: the row stayed 'Newer file on canada.ca')", marked?.status === "newer_file" && cleared?.status === "ready" && sql(`select count(*) from form_edition where newer_file_sha256 is not null`) === "0", { marked: marked?.status, after: cleared?.status });

  // ── the index moved back: neither Find again nor a check lowers the baseline.
  indexDate(C, "2025-04-01");
  await restart();
  await call("POST", "/library/forms/fill-from-index");
  await findAgain(VV);
  const chk = await call("POST", `/library/forms/${encodeURIComponent(C)}/check-canada`);
  ok("C2.6 X5 break m36 pass: with the index moved back, Find again and a check keep the later baseline (2025-06-02)", chk.body?.outcome === "current" && base() === "2025-06-02", { outcome: chk.body?.outcome, baseline: base() });

  // ── no-file and m39: canada.ca cannot serve IMM 5645's PDF (no file in the library) nor IMM 5257's (the sample's file).
  freshCopies();
  status404("imm5645e.pdf"); status404("/imm5257e.pdf");
  await restart();
  await call("POST", "/demo/reset", { confirm: "RESET" }); await call("POST", "/demo/load");
  await call("POST", "/library/forms/fill-from-index");
  const checkedBefore = sql("select count(*) from audit_event where action = 'checked'");
  const nf = await call("POST", `/library/forms/${encodeURIComponent(C)}/check-canada`);
  ok("C2.6 X5 outside check (0796fc0c) fail: a form with no approved file is answered before downloading: 'no approved file' even when its PDF is missing on canada.ca (before: 409 'canada.ca's PDF could not be read')", nf.status === 201 && nf.body?.outcome === "check" && /no approved file in the library to compare/.test(nf.body?.message ?? ""), { status: nf.status, m: nf.body?.message ?? nf.body?.detail });
  const F = "IMM 5257";
  const stamp = () => sql(`select coalesce(max(e.checked_at)::text, '') from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = '${F}'`);
  const s0 = stamp(), hasFile = (await rowOf(F))?.status;
  const gone = await call("POST", `/library/forms/${encodeURIComponent(F)}/check-canada`);
  ok("C2.6 X5 break (6bc5eb72) m39 fail: a form with a file whose canada.ca PDF cannot be read gets 409 in words, is not stamped checked, and no check is audited", hasFile === "ready" && gone.status === 409 && /could not be downloaded/.test(gone.body?.detail ?? "") && stamp() === s0 && sql("select count(*) from audit_event where action = 'checked'") === checkedBefore, { hasFile, status: gone.status, d: gone.body?.detail });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
