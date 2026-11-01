// C3.12 (Partial) — A content publisher adds forms to the library alone (one or many, through the shared intake), and
// sees the Forms list: code, title, edition as printed, published, field map, used by, status, with every edition.
// Decisions: P-123 (one lean list, filters not groups), P-32 (editions), P-103 (number + edition + checksum), P-116.
// Missing per CAPABILITIES: "field map not in the list" — out of date: GET /library/forms/list now carries field_map.
// Still missing: a "published" value per row (the date IRCC printed or published the edition: the intake reads it, e.g.
// IMM 5476 11-2025 → 2025-12-15, but the list does not return it).
// API and data level only (the screen is journey J1). Official IRCC PDFs only. US$0: rules read official files, no model.
//   zsh tools/isolated.sh acc_b3 4566 start && ./node_modules/.bin/tsx acceptance/C3.12.test.ts 4566 xr_studio_acc_b3
// Expected today (main 25cefb67): 14 pass, 1 fail — failing: AT-3 (no row of GET /library/forms/list has a "published"
// value; the intake knows it, the list drops it), because the Forms list has no Published column yet.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4566), DB = process.argv[3] ?? "xr_studio_acc_b3";
const IRCC = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type R = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const stop = (why: string) => { console.error(`STOP  ${why}`); process.exit(2); };
const words = (b: any) => `${b?.detail ?? ""} ${b?.message ?? ""}`; // eslint-disable-line @typescript-eslint/no-explicit-any
const spend = () => sql("select coalesce(sum(cost_usd),0) from drafting_job");
type Row = { code: string; title: string; type: string; edition: string | null; published?: string | null; field_map: { kind: string; decided: number; total: number; words: string }; used_by: { id: string; label: string }[]; status: string; older_editions: unknown[] };
const list = async (qs = "") => (await call("GET", `/library/forms/list${qs}`)).body as { rows: Row[]; counts: Record<string, number> };
/** Upload PDF in the Form library (no combination): one run per file, each followed to its end. */
const upload = async (names: string[], actor: string | null = "user-A") => {
  const fd = new FormData(); for (const n of names) fd.append("files", new Blob([new Uint8Array(readFileSync(join(IRCC, "forms", n)))], { type: "application/pdf" }), n);
  const u = await fetch(`http://localhost:${PORT}/api/library/forms/upload`, { method: "POST", headers: actor ? { "x-actor": actor } : {}, body: fd });
  const t = await u.text(); let j: any = t; try { j = JSON.parse(t); } catch { /* not JSON */ } // eslint-disable-line @typescript-eslint/no-explicit-any
  const ends: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const id of (j?.runIds ?? []) as string[]) {
    let end = null; for (let i = 0; i < 240 && !end; i++) { const r = await call("GET", `/runs/${id}`); if (!["queued", "running", "stopping"].includes(r.body?.status)) end = r.body; else await new Promise((res) => setTimeout(res, 250)); }
    ends.push(end);
  }
  return { status: u.status, body: j, ends };
};

(async () => {
  const served = (await call("GET", "/session").catch(() => ({ status: 0, body: null }))).body?.workspace?.id;
  if (!served) stop(`no copy answers on port ${PORT}: start it with zsh tools/isolated.sh acc_b3 ${PORT} start`);
  try { if (!sql(`select id from workspace where id='${served}'`)) throw new Error(); } catch { stop(`the database ${DB} is not the one the server on port ${PORT} uses`); }
  if ((await call("POST", "/demo/reset", { confirm: "RESET" })).status >= 300) stop("demo reset refused");
  if ((await call("POST", "/demo/load")).status !== 201) stop("the sample did not load");
  const spend0 = spend();
  const all = await list();
  if (all.rows.length < 10) stop(`the sample library has only ${all.rows.length} rows`);
  const forms = all.rows.filter((r) => r.type === "form" && r.edition);

  // ── The columns.
  ok("C3.12 AT-1 pass: every row has code, title, type, edition, field map (kind and words), used by, status and its older editions", all.rows.every((r) => r.code && r.title && ["form", "guide", "checklist"].includes(r.type) && "edition" in r && r.field_map?.kind && typeof r.field_map.words === "string" && Array.isArray(r.used_by) && r.status && Array.isArray(r.older_editions)), all.rows.filter((r) => !r.field_map || !Array.isArray(r.older_editions)).map((r) => r.code));
  ok("C3.12 AT-2 [IRCC-F03] pass: each IRCC form's edition is shown as printed on it: its number and (MM-YYYY)", forms.length >= 6 && forms.every((r) => new RegExp(`^${r.code} \\(\\d\\d-\\d{4}\\)$`).test(r.edition!)), forms.map((r) => r.edition));
  ok("C3.12 AT-2 [IRCC-F03] fail case: a form listed by IRCC with no file has no edition (never guessed) and status no_file", all.rows.filter((r) => r.status === "no_file").every((r) => r.edition === null && r.field_map.kind === "no_edition") && all.rows.some((r) => r.status === "no_file"), all.rows.filter((r) => r.status === "no_file"));
  const pubRow = forms.find((r) => r.code === "IMM 5476");
  ok("C3.12 AT-3 pass: each IRCC form row says when its edition was published (IMM 5476 11-2025: 2025-12-15, as the intake reads it)", forms.every((r) => typeof r.published === "string" && /\d{4}-\d\d(-\d\d)?/.test(r.published)) && /^2025-12/.test(pubRow?.published ?? ""), forms.map((r) => [r.code, r.published]));

  // ── Field map column agrees with the records underneath.
  const fm = (code: string) => sql(`select count(*) || '|' || count(*) filter (where m.outcome <> 'unresolved') from form_field_map m join form_edition e on e.id=m.form_edition_id join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${code}' and e.edition_label=(select edition from (select '${all.rows.find((r) => r.code === code)?.edition}' as edition) x) and m.version=(select max(v.version) from form_field_map v where v.form_edition_id=m.form_edition_id and v.data_path=m.data_path)`).split("|").map(Number);
  const r1295 = all.rows.find((r) => r.code === "IMM 1295")!, [tot, dec] = fm("IMM 1295");
  ok("C3.12 AT-4 pass: IMM 1295's field map says 'n of m form fields decided' as its records say", r1295.field_map.total === tot && r1295.field_map.decided === dec && r1295.field_map.words === `${dec} of ${tot} form fields decided`, { list: r1295.field_map, db: { tot, dec } });
  ok("C3.12 AT-4 [IRCC-F06] fail case: guides and checklists show no field map ('not filled'), never a count", all.rows.filter((r) => r.type !== "form").every((r) => r.field_map.kind === "not_filled" && r.field_map.total === 0), all.rows.filter((r) => r.type !== "form").map((r) => r.field_map.kind));

  // ── Used by agrees with the combinations' form lines.
  const lineCombos = (code: string) => sql(`select distinct cf.combination_id from combination_form cf where cf.lineage_key='${code}' and cf.version=(select max(v.version) from combination_form v where v.combination_id=cf.combination_id and v.lineage_key=cf.lineage_key) and cf.status<>'RETIRED'`).split("\n").filter(Boolean);
  const r5707 = all.rows.find((r) => r.code === "IMM 5707")!;
  ok("C3.12 AT-5 pass: Used by lists every combination with an IMM 5707 form line", lineCombos("IMM 5707").length > 0 && lineCombos("IMM 5707").every((id) => r5707.used_by.some((u) => u.id === id)), { lines: lineCombos("IMM 5707"), used_by: r5707.used_by.map((u) => u.id) });
  const unused = all.rows.find((r) => r.code === "IMM 5802");
  ok("C3.12 AT-5 fail case: a form no combination uses has an empty Used by", !!unused && unused.used_by.length === 0, unused?.used_by);

  // ── Filters, not groups (P-123).
  const chk = await list("?type=checklist"), nf = await list("?status=no_file"), q = await list("?q=5257");
  ok("C3.12 AT-6 pass: filters narrow the one list: type=checklist only checklists; status=no_file only forms with no file; q=5257 finds IMM 5257 and its schedule", chk.rows.length > 0 && chk.rows.every((r) => r.type === "checklist") && nf.rows.every((r) => r.status === "no_file") && ["IMM 5257", "IMM 5257 SCH1"].every((c) => q.rows.some((r) => r.code === c)), { chk: chk.rows.length, nf: nf.rows.map((r) => r.code), q: q.rows.map((r) => r.code) });
  const bad = await call("GET", "/library/forms/list?type=letters");
  ok("C3.12 AT-6 fail case: an unknown filter is 400 in words, not an empty list", bad.status === 400 && words(bad.body).trim().length > 5, bad);

  // ── A content publisher adds forms alone, one or many (no combination).
  const before = Number(sql("select count(*) from form_edition"));
  const up = await upload(["imm1294e.pdf", "imm5645e.pdf"]);
  const inLib = (code: string) => sql(`select e.edition_label from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${code}'`);
  ok("C3.12 AT-7 [IRCC-F01] pass: two official PDFs in one upload: one run each, both join the library with the edition printed on them", up.status < 300 && up.ends.length === 2 && /^IMM 1294 \(\d\d-\d{4}\)$/.test(inLib("IMM 1294")) && /^IMM 5645 \(\d\d-\d{4}\)$/.test(inLib("IMM 5645")) && Number(sql("select count(*) from form_edition")) === before + 2, { status: up.status, ends: up.ends.map((e) => e?.message), editions: [inLib("IMM 1294"), inLib("IMM 5645")] });
  const after = await list("?q=1294");
  ok("C3.12 AT-7 pass: the new form is in the Forms list with no combination using it", after.rows.some((r) => r.code === "IMM 1294" && r.used_by.length === 0), after.rows.map((r) => [r.code, r.used_by.length]));
  const n1 = Number(sql("select count(*) from form_edition"));
  const asClient = await upload(["imm5710e.pdf"], "user-P"), asNobody = await upload(["imm5710e.pdf"], null);
  ok("C3.12 AT-8 roles: a client is 403 and nobody named is 401; nothing added", asClient.status === 403 && asNobody.status === 401 && Number(sql("select count(*) from form_edition")) === n1, [asClient.status, asNobody.status]);
  const fd = new FormData(); fd.append("files", new Blob([new TextEncoder().encode("not a pdf")], { type: "text/plain" }), "notes.txt");
  const txt = await fetch(`http://localhost:${PORT}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  const txtRun = ((await txt.json().catch(() => ({}))) as { runId?: string }).runId;
  let txtEnd: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (let i = 0; txtRun && i < 120 && !txtEnd; i++) { const r = await call("GET", `/runs/${txtRun}`); if (!["queued", "running", "stopping"].includes(r.body?.status)) txtEnd = r.body; else await new Promise((res) => setTimeout(res, 250)); }
  ok("C3.12 AT-8 fail case: a file that is not a PDF is refused by the rules in words ('This is not a PDF file'), US$0; nothing added", (txt.status === 400 || (txtEnd?.status === "failed" && (txtEnd.steps ?? []).some((s: { message?: string; usd?: number }) => /not a PDF/.test(s.message ?? "")) && (txtEnd.steps ?? []).every((s: { usd?: number }) => !s.usd))) && Number(sql("select count(*) from form_edition")) === n1, { status: txt.status, end: txtEnd?.status, steps: txtEnd?.steps?.map((s: { message?: string }) => s.message) });
  ok("C3.12 AT-9 US$0: no spend in this file", spend() === spend0, [spend0, spend()]);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
