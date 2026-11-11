// M3-S4 API checks (P-172, P-380, P-425): on the configured checkpoint, the author makes a document line of the Study
// permit (outside Canada), a non-Visitor combination, never waivable through the line's own save; a second and third
// person release it; on a case the line can neither be waived nor marked Not applicable (in words), and Ready to file is
// refused, the block named and not passable, until the document is received; then Ready to file is allowed. Each rule
// has a passing and a failing case. Product routes only (no SQL write), no model call (US$0).
//   zsh studio/tools/isolated.sh rt_m3s4 4431 start && tsx studio/tests/runtime/check_m3s4_blocking_api.ts 4431 xr_studio_rt_m3s4
import { call, filingOf, firms, openCase, PORT, prepare, readinessOf, readyToFile, sql, yearsAgo } from "../../acceptance/lib/m3.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B", CLIENT = "user-P";
const LINE = "letter_of_acceptance:principal_applicant", DOC = "letter_of_acceptance";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? JSON.stringify(r.body?.errors ?? ""));
const codes = (x: { code: string }[] | undefined) => (x ?? []).map((b) => b.code);

let sp = sql("select id from combination where combination_key='sp.outside'");
if (!sp) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } sp = sql("select id from combination where combination_key='sp.outside'"); }
const row = JSON.parse(sql(`select row_to_json(r)::text from (select document_type_key, attach_mode, applies_to_roles, provided_by, predicate_json, condition_plain, source_quote, source_file, note, alternatives from document_requirement where combination_id='${sp}' and lineage_key='${LINE}' order by version desc limit 1) r`) || "null");
if (!row) { console.error(`STOP  no ${LINE} line on the Study permit`); process.exit(2); }
const body = (extra: Record<string, unknown>) => ({ documentTypeKey: row.document_type_key, attachMode: row.attach_mode, appliesToRoles: row.applies_to_roles, providedBy: row.provided_by, condition: row.predicate_json ?? undefined, conditionPlain: row.condition_plain ?? undefined, sourceQuote: row.source_quote ?? undefined, sourceFile: row.source_file ?? undefined, note: row.note ?? undefined, alternatives: row.alternatives ?? [], ...extra });
const path = `/combinations/${sp}/requirements/${encodeURIComponent(LINE)}`;
const waiverNow = () => sql(`select coalesce(waiver, '') from document_requirement where combination_id='${sp}' and lineage_key='${LINE}' order by version desc limit 1`);

// (1) The author's save.
const bad = await call("PATCH", path, body({ waiver: "blocking" }), AUTHOR);
ok("save fail: a waiver other than waivable, never or none is refused in words (400), nothing saved", bad.status === 400 && /Waiver: choose "waivable", "never", or none/.test(words(bad)) && waiverNow() === "", [bad.status, words(bad)]);
const save = await call("PATCH", path, body({ waiver: "never" }), AUTHOR);
ok("save pass: the author makes the letter of acceptance line never waivable (a new draft version)", save.status < 300 && waiverNow() === "never", [save.status, words(save)]);
const kept = await call("PATCH", path, body({ note: row.note ?? undefined }), AUTHOR);
ok("save pass: a later edit that does not send the waiver keeps it", kept.status < 300 && waiverNow() === "never", [kept.status, words(kept)]);

// (2) Released by a second and a third person; the review names the change in words.
let r = { status: 0, body: null as any }, named = false;
for (let attempt = 0; attempt < 2; attempt++) {
  for (const c of (await call("GET", "/library/changes?status=WAITING", undefined, REVIEWER)).body ?? []) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
  await call("POST", `/combinations/${sp}/submit`, { note: "M3-S4: the letter of acceptance line is never waivable (Sample check)" }, AUTHOR);
  const sub = (await call("GET", `/combinations/${sp}/review`, undefined, REVIEWER)).body?.submission;
  const summaryRows = (sub?.changeSummary ?? sub?.change_summary ?? []) as { kind: string; key: string; label?: string }[];
  named ||= summaryRows.some((x) => x.key === LINE && /never waivable: it blocks Ready to file until received/.test(x.label ?? ""));
  await call("POST", `/combinations/${sp}/signoff`, { items: summaryRows.map((x) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
  r = await call("POST", `/combinations/${sp}/approve`, undefined, APPROVER);
  if (!/changed while it was being released/.test(words(r))) break;
}
ok("release pass: the second person's review names the line as never waivable, in words", named);
const released = sql(`select r.snapshot::text ~ '"waiver": ?"never"' from config_release r where r.combination_id='${sp}' order by r.version desc limit 1`);
ok("release pass: the new release carries the line's waiver", r.status < 300 && released === "t", [r.status, words(r), released]);

// (3) A case on the new release.
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R";
const c = await openCase(sp!, [{ role: "principal", name: "Sample Student S4", dob: yearsAgo(22) }], { representative: rep, caseOfficers: [officer] }, `M3S4-${Date.now().toString(36)}`);
const P = c.subjects["Sample Student S4"];
type L = { id: string; document_type: string; waivable: boolean; never_waivable: boolean; state: string; required: boolean; version: number };
const lineOf = async (doc: string) => ((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, officer)).body?.people ?? []).find((p: { subject: string }) => p.subject === P)?.lines.find((l: L) => l.document_type === doc) as L | undefined;
const letter = await lineOf(DOC), passport = await lineOf("passport_information_page_copy");
ok("case pass: on the case the letter line is never waivable (and not waivable); the passport line is neither", !!letter && letter.never_waivable === true && letter.waivable === false && letter.required === true && passport?.never_waivable === false, [letter, passport?.never_waivable]);

const waive = await call("POST", `/runtime/checklist-lines/${letter?.id}/waive`, { reason: "The school sends it later (Sample)" }, officer);
ok("waive fail: the never waivable line cannot be waived (422, in words), nothing changed", waive.status === 422 && /cannot be waived: its line in the release is never waivable, so Ready to file waits until it is received/.test(words(waive)) && (await lineOf(DOC))?.state === "not_requested", [waive.status, words(waive)]);
const na = await call("POST", `/runtime/checklist-lines/${letter?.id}/not-applicable`, { reason: "Not needed (Sample)" }, officer);
ok("not applicable fail: nor marked Not applicable (422, in words), nothing changed", na.status === 422 && /cannot be marked not applicable: its line in the release is never waivable/.test(words(na)) && (await lineOf(DOC))?.state === "not_requested", [na.status, words(na)]);
const byClient = await call("POST", `/runtime/checklist-lines/${letter?.id}/not-applicable`, { reason: "Not needed (Sample)" }, CLIENT);
ok("not applicable fail: a client is refused before anything else (403)", byClient.status === 403, byClient.status);
const naOther = await call("POST", `/runtime/checklist-lines/${passport?.id}/not-applicable`, { reason: "Held by the visa office (Sample)" }, officer);
ok("not applicable pass: a line that is not never waivable is still marked Not applicable as before", naOther.status === 200 && (await lineOf("passport_information_page_copy"))?.state === "not_applicable", [naOther.status, words(naOther)]);

// (4) Ready to file: blocked while the letter is not received; the block cannot be passed.
let p = (await prepare(c.id, officer)).p;
const fid = filingOf(p, P)?.id ?? "";
const blocked = await readyToFile(c.id, rep);
p = (await prepare(c.id, officer)).p;
const rd = readinessOf(p, fid);
const block = (rd?.blocks ?? []).find((b: { code: string; words: string }) => b.code === "document_never_waivable");
ok("ready fail: with every warning passed and the review done, Ready to file is still refused while the letter is not received", !!fid && !blocked.includes(fid) && !!block && /Letter of acceptance not received\. Its release says it can never be waived/i.test(block.words), { fid, blocked, blocks: rd?.blocks, warns: codes(rd?.warns) });
const ready1 = await call("POST", `/runtime/filings/${fid}/ready`, {}, officer);
ok("ready fail: the Ready to file route answers 409 and names the block", ready1.status === 409 && codes(ready1.body?.blocks).includes("document_never_waivable") && /block/.test(words(ready1)), [ready1.status, words(ready1), codes(ready1.body?.blocks)]);
const passIt = await call("POST", `/runtime/filings/${fid}/warnings/document_never_waivable/pass`, { reason: "We will send it later (Sample)" }, officer);
ok("pass fail: the block cannot be passed with a reason (409, in words), nothing stored", passIt.status === 409 && /cannot be passed: fix it instead/.test(words(passIt)) && sql(`select count(*) from readiness_pass where filing_id='${fid}' and code='document_never_waivable'`) === "0", [passIt.status, words(passIt)]);

// (5) The letter is received: Ready to file is allowed.
const fd = new FormData(); fd.append("version", String((await lineOf(DOC))?.version ?? 0)); fd.append("file", new Blob([new TextEncoder().encode("%PDF-1.4\n% Sample synthetic letter of acceptance\n")]), "letter.pdf");
const up = await fetch(`http://127.0.0.1:${PORT}/api/runtime/checklist-lines/${letter?.id}/documents`, { method: "POST", headers: { "x-actor": officer }, body: fd });
ok("received pass: the letter is uploaded and the line is Received", up.status === 201 && (await lineOf(DOC))?.state === "received", up.status);
const allowed = await readyToFile(c.id, rep);
p = (await prepare(c.id, officer)).p;
ok("ready pass: once received, the block is gone and Ready to file is allowed", allowed.includes(fid) && !codes(readinessOf(p, fid)?.blocks).includes("document_never_waivable") && filingOf(p, P)?.status === "ready_to_file", { allowed, blocks: readinessOf(p, fid)?.blocks, status: filingOf(p, P)?.status });

process.exitCode = summary() ? 1 : 0;
