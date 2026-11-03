// C1.8 copies per form line (screens, F1; Screen 03 concept "Who and copies"): an author sets how many copies of a form
// each person it names files, 1 to 9 (Sample). A passing and a failing case per rule, on an isolated copy with the
// sample loaded. No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh screens_c18 4441 start && tsx studio/tests/check_c18_copies.ts 4441 xr_studio_screens_c18
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { copiesWords, DocumentLineEdit, FormLineEdit } from "../contracts/workspace.ts";
import { lineSig } from "../api/src/form-uses.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (C5.4): a release needs every number sourced

const PORT = Number(process.argv[2] ?? 4441), DB = process.argv[3] ?? "xr_studio_screens_c18";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const field = (r: { body: any }, f: string) => (r.body?.errors ?? []).find((e: any) => e.field === f)?.message as string | undefined;

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  if (!(await call("GET", "/demo/status")).body?.loaded) { const l = await call("POST", "/demo/load", {}); if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); } }

  // ---------------------------------------------------------------- pure rules
  ok("C1.8 pass (contract): 1, 2 and 9 copies are accepted", [1, 2, 9].every((n) => FormLineEdit.safeParse({ copies: n }).success));
  ok("C1.8 fail (contract): 0, 10, 1.5 and null copies are refused with the words", [0, 10, 1.5, null].every((n) => { const r = FormLineEdit.safeParse({ copies: n }); return !r.success && r.error.issues[0].message === "Copies is a whole number from 1 to 9."; }));
  ok("C1.8 pass (words): more than one copy is said; one copy says nothing, so most rows stay quiet", copiesWords(3) === "3 copies each" && copiesWords(1) === "" && copiesWords(null) === "");
  const base = { who: "each_applicant", attachMode: "COMBINATION_MANDATORY", conditionPlain: null, origin: "HUMAN", predicateJson: null, minAge: null, signedBy: null, channel: "PDF_UPLOAD", sourceQuote: null, govFormDefId: "x" } as any;
  ok("C1.8 pass (Undo signature): one copy keeps the signature a step recorded before copies existed", lineSig({ ...base, copies: 1 }) === lineSig(base));
  ok("C1.8 fail (Undo signature): two copies change it, so Undo never puts back a line someone has changed since", lineSig({ ...base, copies: 2 }) !== lineSig(base));

  // ---------------------------------------------------------------- API on a released sample combination
  const cat = (await call("GET", "/catalogue")).body;
  const leaves: any[] = []; const walk = (x: any) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x.combinationId && x.kind === "combination") leaves.push(x); Object.values(x).forEach(walk); } }; walk(cat);
  const wp = leaves.find((l) => l.status === "READY");
  if (!wp) { console.error("STOP  no released sample combination"); process.exit(2); }
  const C = wp.combinationId;
  const forms = async () => (await call("GET", `/combinations/${C}/workspace?tab=forms`)).body;
  const snapForm = async (code: string) => ((await call("GET", `/combinations/${C}/config`)).body.snapshot.forms as any[]).find((f) => f.form_number === code);
  let f0 = await forms();
  const line = (code: string) => f0.lines.find((l: any) => l.code === code);
  const F = f0.lines.find((l: any) => !l.document)?.code as string;
  ok("C1.8 read: every line on the Forms tab says its copies, 1 by default", f0.lines.length > 0 && f0.lines.every((l: any) => l.copies === 1), f0.lines.map((l: any) => `${l.code}:${l.copies}`));
  const sha0 = (await call("GET", `/combinations/${C}/config`)).body.sha256;
  ok("C1.8 pass: the default single copy is not written into the snapshot, so a released combination's fingerprint is unchanged", !("copies" in (await snapForm(F))));

  let r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, { copies: 2, baseRevision: line(F).revision }, "user-B");
  ok("C1.8 fail: only the author sets copies (403 for the approver)", r.status === 403, r.status);
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, { copies: 2, baseRevision: line(F).revision });
  f0 = await forms();
  ok("C1.8 pass: 2 copies are saved to the draft and shown on the line", r.status === 200 && r.body.copies === 2 && line(F).copies === 2, { status: r.status, copies: line(F)?.copies });
  ok("C1.8 pass: the draft snapshot carries copies: 2 for that form, so a case can read it", (await snapForm(F))?.copies === 2);
  ok("C1.8 pass: the change shows as a draft change (the fingerprint moved)", (await call("GET", `/combinations/${C}/config`)).body.sha256 !== sha0);
  for (const bad of [0, 10, 2.5, "two"]) {
    r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, { copies: bad, baseRevision: line(F).revision });
    ok(`C1.8 fail: copies ${JSON.stringify(bad)} is refused on its field with the fix in words`, r.status === 400 && field(r, "copies") === "Copies is a whole number from 1 to 9.", { status: r.status, msg: field(r, "copies") });
  }
  ok("C1.8: a refused value leaves the saved 2 in place", (await forms()).lines.find((l: any) => l.code === F).copies === 2);
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, { copies: 3, baseRevision: "2020-01-01T00:00:00.000Z" });
  ok("C1.8 fail: copies saved from an old revision is a 409 naming who changed it", r.status === 409 && /Changed by/.test(r.body.detail ?? r.body.message), r.body.detail ?? r.body.message);
  const guard = (() => { try { sql(`update combination_form set copies = 12 where combination_id='${C}' and lineage_key='${F}'`); return false; } catch { return true; } })();
  ok("C1.8 fail (database): 12 copies are refused by the database check too", guard);

  // C11.11 (QA-101): no route makes a checklist a form line any more (the sample's IMM 5488 is a source), so the check plants
  // one kept from before (test input, SQL, Sample) and removes it after the two checks that use it.
  sql(`insert into combination_form select (jsonb_populate_record(null::combination_form, to_jsonb(cf) || jsonb_build_object('id', gen_random_uuid(), 'lineage_key', 'IMM 5488', 'gov_form_def_id', (select id from gov_form_def d where d.form_key='IMM 5488' and d.workspace_id=cf.workspace_id), 'version', 1, 'status', 'DRAFT', 'supersedes_id', null, 'copies', 1))).* from combination_form cf where cf.combination_id='${C}' and cf.lineage_key='IMM 5707' order by cf.version desc limit 1`);
  f0 = await forms();
  const D = f0.lines.find((l: any) => l.document)?.code as string;
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(D)}`, { copies: 2, baseRevision: line(D)?.revision });
  ok("C1.8 fail (review m2): a checklist line is never filed, so 2 copies on it are refused on the field", !!D && r.status === 400 && field(r, "copies") === "A checklist is not filed, so it has no copies.", { line: D, status: r.status, msg: field(r, "copies") });
  ok("C1.8 pass: the checklist line keeps 1 copy", (await forms()).lines.find((l: any) => l.code === D).copies === 1);
  sql(`delete from combination_form where combination_id='${C}' and lineage_key='IMM 5488'`);
  ok("C1.8 pass (contract): 1 copy on a checklist line is accepted (it is the default), more is refused", DocumentLineEdit.safeParse({ copies: 1 }).success && !DocumentLineEdit.safeParse({ copies: 2 }).success);
  r = await call("POST", `/combinations/${C}/forms/undo`, {});
  f0 = await forms();
  ok("C1.8 pass: Undo last change puts the line back to 1 copy", r.status < 300 && line(F).copies === 1, { status: r.status, copies: line(F)?.copies });
  ok("C1.8 pass: back at 1 copy the snapshot has no copies key again and the fingerprint is the released one", !("copies" in (await snapForm(F))) && (await call("GET", `/combinations/${C}/config`)).body.sha256 === sha0);

  // ---------------------------------------------------------------- break m4, m3, M1 (break-report-c18.md)
  const huge = FormLineEdit.safeParse({ copies: 1e308 });
  ok("C1.8 m4: a huge number is refused with the sentence once", !huge.success && huge.error.issues.length === 1, !huge.success && huge.error.issues.map((i) => i.message));
  const release = async () => {
    await sourceEveryNumber(PORT, C); // G1 (C5.4): "From age 18" and the release's other numbers need a source first
    const s = await call("POST", `/combinations/${C}/submit`, {});
    const changes = ((await call("GET", `/combinations/${C}/review`)).body.submission?.changeSummary ?? []) as any[];
    const sme = changes.filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
    if (sme.length) await call("POST", `/combinations/${C}/signoff`, { items: sme, action: "signed" }, "user-C");
    const a = await call("POST", `/combinations/${C}/approve`, {}, "user-B");
    return s.status === 201 && a.status === 201;
  };
  f0 = await forms();
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, { copies: 6, minAge: 18, signedBy: "person", baseRevision: line(F).revision });
  ok("setup M1: 6 copies, from age 18, signed by the person, then released", r.status === 200 && await release(), r.status);
  f0 = await forms();
  r = await call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, { retire: true, copies: 9, baseRevision: line(F).revision });
  const removed = sql(`select copies from combination_form where combination_id='${C}' and lineage_key='${F}' order by version desc limit 1`);
  ok("C1.8 m3 fail: copies sent with a removal are not stored on the removed line (it keeps 6)", r.status === 200 && removed === "6", { status: r.status, removed });
  ok("setup M1: the removal is released", await release());
  r = await call("POST", `/combinations/${C}/forms`, { formKey: F });
  f0 = await forms();
  ok("C1.8 M1: a form added back after a released removal comes back with its 6 copies, from age 18 and signed by the person", r.status < 300 && line(F)?.copies === 6 && line(F)?.minAge === 18 && line(F)?.signedBy === "person", { status: r.status, copies: line(F)?.copies, minAge: line(F)?.minAge, signedBy: line(F)?.signedBy });

  const out = join(import.meta.dirname, "..", "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_c18_copies.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
