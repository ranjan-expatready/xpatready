// Screen 01 fix pass (P-74): the forms decisions made visible on Screen 01, on the F1 back end, through the API and the
// database, with a passing and a failing case per rule. C1.6 each line's channel and the derived filing method, set by
// the author per line; C1.7 the combination's portal and each line's default channel for it; C2.7 "Add an online form"
// from saved blank portal pages, "Awaiting a second person" until approved, then usable as a line; C2.10 which source
// drafting reads per form, with the per-form choice honoured by screen-map drafting. Portal screens are the Sample
// fixtures in tests/fixtures/portal. No browser, no model call.
//   zsh studio/tools/isolated.sh screens_ch 4447 start && tsx studio/tests/check_screen01_channels.ts 4447 xr_studio_screens_ch
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_screens_ch";
const FIX = join(import.meta.dirname, "fixtures", "portal");
const log: unknown[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const screens = async (id: string, files: string[], actor = "user-A") => {
  const fd = new FormData(); for (const f of files) fd.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, f)))]), f);
  const r = await fetch(`http://localhost:${PORT}/api/captures/${id}/screens`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: r.status, body: await r.json() };
};
const S = ["imm5257-online-s1-personal.html", "imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"];
const rowOf = async (key: string) => ((await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows as any[]).find((r) => r.nodeKey === key);

(async () => {
  // The database this check reads by SQL must be the server's own (Lead check L1: a run whose database argument named
  // another copy's database looked up stale ids and failed with a 404). Stop with the reason instead.
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })(); // a database that does not exist is "not it" too
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses (its workspace ${served ?? "unknown"} is not in it). Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  let r = await call("POST", "/demo/load");
  ok("setup: sample inputs load", r.status === 201, r.body?.seconds);
  const wp = (await rowOf("individual.work_permits.employer_specific.with_lmia")).combinationId as string;
  const vv = (await rowOf("individual.visitors.visitor_visa")).combinationId as string;
  const sum = async (id = wp) => (await call("GET", `/combinations/${id}/summary`)).body;

  // ---------------------------------------------------------------- C1.6 channel per line, filing method
  let s = await sum();
  ok("C1.6 pass: every line shows its channel (PDF upload today) and the combination its filing method", s.forms.every((f: any) => f.channel === "PDF_UPLOAD" && f.channelWords === "PDF upload") && s.filing === "PDF only", s.filing);
  ok("C1.6 pass: the Programs row says how it is filed", (await rowOf("individual.work_permits.employer_specific.with_lmia")).filing === "PDF only");
  ok("C1.6: a row with no form lines has no filing method (not \"PDF only\")", (await rowOf("individual.visitors.extend_stay")).filing === null);
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 1295")}/channel`, { channel: "PAPER" });
  s = await sum();
  // C11.11: the sample's checklists (IMM 5488, IMM 5905) are no longer always-filed PDF lines, so with IMM 1295 on paper
  // the always-filed lines are paper and the PDF uploads are the "when needed" ones (before: "PDF uploads + paper forms").
  ok("C1.6 pass: the author sets one line's channel; the line, its signature and the filing method follow", r.status === 200 && s.forms.find((f: any) => f.code === "IMM 1295").channelWords === "Paper" && /in pen/.test(s.forms.find((f: any) => f.code === "IMM 1295").signature) && s.filing === "Mixed: PDF and paper" && /^Paper only; plus PDF upload when needed/.test(s.filingDetail), [s.filing, s.filingDetail]);
  ok("C1.6: the change is a draft change of the combination (released content unchanged until release)", (await call("GET", "/draft")).body.rows.some((x: any) => x.combinationId === wp) && sql(`select count(*) from combination_form where combination_id='${wp}' and lineage_key='IMM 1295' and status='PUBLISHED' and channel='PDF_UPLOAD'`) === "1");
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 1295")}/channel`, { channel: "FAX" });
  ok("C1.6 fail: a channel that is not one of the four is refused on its field", r.status === 400 && r.body.errors?.[0]?.field === "channel", r.body.errors);
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 1295")}/channel`, { channel: "ONLINE" }, "user-B");
  ok("C1.6 fail: only an author sets a channel (the approver is refused by the server)", r.status === 403);
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 1295")}/channel`, { channel: "ONLINE", from: "PDF_UPLOAD" });
  ok("round 2 M2 fail: a save from a screen that still showed PDF upload (now Paper) is refused, not a silent overwrite", r.status === 409 && /was changed to Paper/.test(r.body.message) && (await sum()).forms.find((f: any) => f.code === "IMM 1295").channel === "PAPER", r.body.message);
  // C11.11: no route makes a checklist a form line any more; a line kept from before (test input, planted by SQL) still has
  // no channel.
  sql(`insert into combination_form select (jsonb_populate_record(null::combination_form, to_jsonb(cf) || jsonb_build_object('id', gen_random_uuid(), 'lineage_key', 'IMM 5488', 'gov_form_def_id', (select id from gov_form_def where form_key='IMM 5488'), 'version', 1, 'status', 'DRAFT', 'supersedes_id', null))).* from combination_form cf where cf.combination_id='${wp}' and cf.lineage_key='IMM 5707' order by cf.version desc limit 1`);
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5488")}/channel`, { channel: "ONLINE" });
  sql(`delete from combination_form where combination_id='${wp}' and lineage_key='IMM 5488'`);
  ok("review 2 should 4 fail: a checklist is not filed, so it has no channel", r.status === 400 && /checklist/.test(r.body.message), r.body.message);
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 1295")}/channel`, { channel: "PDF_UPLOAD", from: "PAPER" });
  ok("round 2 M2 pass: a save from an up-to-date screen goes through", r.status === 200 && (await sum()).forms.find((f: any) => f.code === "IMM 1295").channel === "PDF_UPLOAD");

  // ---------------------------------------------------------------- C1.7 portal, default channel
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5707")}/channel`, { channel: "ONLINE" });
  s = await sum();
  ok("C1.7 fail: a line filed Online with no portal blocks release, in plain words", s.channelProblems.some((p: any) => p.level === "error" && p.item === "IMM 5707" && /no portal yet/.test(p.message)), s.channelProblems.map((p: any) => p.message));
  const lmiaRow = (await rowOf("individual.work_permits.employer_specific.with_lmia"));
  const before = lmiaRow.release ? (await call("GET", "/draft")).body.rows.find((x: any) => x.combinationId === wp)?.changes ?? 0 : 0;
  r = await call("PATCH", `/combinations/${wp}/portal`, { portal: "ircc_portal", from: null });
  s = await sum();
  ok("C1.7 pass: the author picks the combination's portal; the page names it", r.status === 200 && s.portal === "ircc_portal" && s.portalLabel === "IRCC Portal");
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  ok("round 2 M1 pass: on a Live combination the portal change is a draft change, listed for review (\"Row details\")", ((await call("GET", "/draft")).body.rows.find((x: any) => x.combinationId === wp)?.changes ?? 0) === before + 1 && review.draft.changes.some((c: any) => c.kind === "Row details" && /portal/.test(c.label)), review.draft.changes.filter((c: any) => c.kind === "Row details"));
  r = await call("PATCH", `/combinations/${wp}/portal`, { portal: "apr_portal", from: null });
  ok("round 2 M2 fail: a portal save from a screen that still showed no portal is refused", r.status === 409 && (await sum()).portal === "ircc_portal", r.body.message);
  ok("C1.7 fail: Online with the portal but no approved online version still blocks release, saying what to do", s.channelProblems.some((p: any) => p.item === "IMM 5707" && /no approved online version/.test(p.message)), s.channelProblems.map((p: any) => p.message));
  ok("C1.7: with no approved online version the default stays PDF upload", s.forms.find((f: any) => f.code === "IMM 5707").defaultChannel === "PDF_UPLOAD");
  r = await call("PATCH", `/combinations/${wp}/portal`, { portal: "fax_portal" });
  ok("C1.7 fail: a portal not on the list is refused", r.status === 400);
  r = await call("PATCH", `/combinations/${wp}/portal`, { portal: "apr_portal" }, "user-C");
  ok("C1.7 fail: only an author picks the portal", r.status === 403 && (await sum()).portal === "ircc_portal");
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5707")}/channel`, { channel: "PDF_UPLOAD" });

  // ---------------------------------------------------------------- C2.7 add an online form from the combination
  r = await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5707", title: "Family information (online)", combinationId: "00000000-0000-4000-8000-000000000000" });
  ok("C2.7 fail: an online form is only added from an existing combination", r.status === 404, r.body?.message);
  const c1 = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5707", title: "Family information (online)", combinationId: wp })).body;
  const bad = await screens(c1.id, ["imm5257-online-s1-personal-with-answers.html"]);
  s = await sum();
  ok("C2.7 fail: a screen holding an answer is refused and not kept; the online form shows as still being captured", bad.body.results[0].outcome === "refused" && s.onlineForms[0]?.status === "OPEN" && /Being captured/.test(s.onlineForms[0].statusWords), s.onlineForms[0]?.statusWords);
  const good = await screens(c1.id, S);
  r = await call("POST", `/captures/${c1.id}/finish`);
  s = await sum();
  ok("C2.7 pass: blank screens added and finished from the combination show \"Awaiting a second person\" there", good.body.results.every((x: any) => x.outcome === "added") && r.status === 201 && s.onlineForms[0].statusWords === "Awaiting a second person" && sql(`select combination_id from portal_capture where id='${c1.id}'`) === wp, s.onlineForms[0]);
  ok("C2.7: while it waits it is not an online version (nothing in the library yet)", sql("select count(*) from form_edition where channel='ONLINE'") === "0");
  r = await call("POST", `/captures/${c1.id}/approve`, undefined, "user-A");
  ok("C2.7 fail: the person who added it cannot approve it", r.status === 403);
  r = await call("POST", `/captures/${c1.id}/approve`, undefined, "user-C");
  s = await sum();
  ok("C2.7 pass: a second person approves it; the combination shows it approved, as an online version in the library", r.status === 201 && /^Approved/.test(s.onlineForms[0].statusWords) && sql("select count(*) from form_edition where channel='ONLINE' and portal_key='ircc_portal'") === "1", s.onlineForms[0].statusWords);

  // ---------------------------------------------------------------- C1.7 default channel now Online for that form
  s = await sum();
  ok("C1.7 pass: with an approved online version from its portal, the line's default channel is Online", s.forms.find((f: any) => f.code === "IMM 5707").defaultChannel === "ONLINE" && s.forms.find((f: any) => f.code === "IMM 1295").defaultChannel === "PDF_UPLOAD");
  ok("C1.7: the default is shown, never applied silently (the line stays PDF upload until the author chooses)", s.forms.find((f: any) => f.code === "IMM 5707").channel === "PDF_UPLOAD");
  r = await call("POST", `/combinations/${wp}/channels/use-defaults`, { lines: [{ line: "IMM 5707", from: "PDF_UPLOAD" }, { line: "IMM 1295", from: "PDF_UPLOAD" }] });
  ok("C1.7 fail: \"use the default\" for a line whose default is not Online changes nothing at all (one transaction)", r.status === 409 && (await sum()).forms.find((f: any) => f.code === "IMM 5707").channel === "PDF_UPLOAD", r.body.message);
  r = await call("POST", `/combinations/${wp}/channels/use-defaults`, { lines: [{ line: "IMM 5707", from: "SIGNED_PDF_UPLOAD" }] });
  ok("C1.7 fail: \"use the default\" from an out-of-date screen is refused", r.status === 409);
  r = await call("POST", `/combinations/${wp}/channels/use-defaults`, { lines: [{ line: "IMM 5707", from: "PDF_UPLOAD" }] });
  s = await sum();
  ok("C1.7 pass: the author applies the default: the line is filed Online and the filing method is Mixed", r.status === 201 && s.forms.find((f: any) => f.code === "IMM 5707").channel === "ONLINE" && s.filing === "Mixed: online and PDF" && (await rowOf("individual.work_permits.employer_specific.with_lmia")).filing === "Mixed: online and PDF", s.filing);
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5707")}/channel`, { channel: "PDF_UPLOAD" });

  // ---------------------------------------------------------------- C2.7 a form the library has only online
  const c2 = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 9101", title: "Online-only sample form", combinationId: vv })).body;
  await screens(c2.id, S); await call("POST", `/captures/${c2.id}/finish`); await call("POST", `/captures/${c2.id}/approve`, undefined, "user-C");
  r = await call("POST", `/combinations/${vv}/lines`, { kind: "FORM", formKey: "IMM 9101" });
  ok("C2.7 fail: a form the library has only online cannot be added to a combination without a portal, and the message says to choose the portal", r.status === 409 && /Choose this combination's portal first/.test(r.body?.detail), r.body?.detail);
  await call("PATCH", `/combinations/${vv}/portal`, { portal: "ircc_portal" });
  r = await call("POST", `/combinations/${vv}/lines`, { kind: "FORM", formKey: "IMM 9101" });
  ok("C2.7 pass: with the portal set, \"+ Add\" makes it a form line filed Online", r.status === 201 && sql(`select channel from combination_form where combination_id='${vv}' and lineage_key='IMM 9101'`) === "ONLINE", r.body);
  const vvMissing = ((await rowOf("individual.visitors.visitor_visa")).missing as any[]);
  ok("review 2 should 2: an Online line without its screen map is one filing line in the missing list, with its own step (not \"map the PDF\" or \"fix a rule\")", vvMissing.some((m) => m.code === "filing_problem" && m.step === "Change how it is filed" && /IMM 9101/.test(m.text)) && !vvMissing.some((m) => (m.code === "rule_problem" && /screen map/.test(m.text)) || (m.code === "form_without_edition" && /IMM 9101/.test(m.text))), vvMissing.map((m) => m.text));

  // ---------------------------------------------------------------- C2.10 what drafting reads, per form
  let ds = (await call("GET", `/combinations/${wp}/drafting-sources`)).body;
  let f = ds.forms.find((x: any) => x.code === "IMM 5707");
  ok("C2.10 pass: by default drafting reads the PDF version first, then the portal's screens for what differs", f.draft_from === "PDF_FIRST" && /^Reads the PDF version \(IMM 5707 .*\) first, then the IRCC Portal screens for what differs\.$/.test(f.reads), f.reads);
  const ed = sql("select id from form_edition where channel='ONLINE' and portal_key='ircc_portal' and edition_label like 'IMM 5707%'");
  const pdfFirst = (await call("POST", `/online-versions/${ed}/screen-map/draft`)).body;
  r = await call("PATCH", `/library/forms/${encodeURIComponent("IMM 5707")}/draft-from`, { draftFrom: "ONLINE_ONLY" });
  ds = (await call("GET", `/combinations/${wp}/drafting-sources`)).body; f = ds.forms.find((x: any) => x.code === "IMM 5707");
  const onlineOnly = (await call("POST", `/online-versions/${ed}/screen-map/draft`)).body;
  ok("C2.10 pass: the author changes it per form; the page says so and screen-map drafting no longer reuses the PDF version", r.status === 200 && f.draft_from === "ONLINE_ONLY" && /alone; the PDF version is not reused/.test(f.reads) && onlineOnly.pdf_edition === null && onlineOnly.counts.pdf_twin === 0 && pdfFirst.pdf_edition !== null, { pdfFirst: pdfFirst.pdf_edition, pdfTwin: pdfFirst.counts?.pdf_twin, onlineOnly: onlineOnly.counts });
  const vvRead = (await call("GET", `/combinations/${(await rowOf("individual.visitors.super_visa")).combinationId}/drafting-sources`)).body.forms.find((x: any) => x.code === "IMM 5707");
  ok("round 2 m4: on a combination without a portal the words say so (never another portal's screens)", !vvRead || /no portal yet/.test(vvRead.reads), vvRead?.reads);
  r = await call("PATCH", `/library/forms/${encodeURIComponent("imm-5707")}/draft-from`, { draftFrom: "ONLINE_ONLY", from: "ONLINE_ONLY" });
  ok("round 2 m4 pass: a code written another way is the library's form", r.status === 200 && r.body.form === "IMM 5707");
  r = await call("PATCH", `/library/forms/${encodeURIComponent("IMM 5707")}/draft-from`, { draftFrom: "PDF_FIRST", from: "PDF_FIRST" });
  ok("round 2 M2 fail: a drafting-source save from an out-of-date screen is refused", r.status === 409 && sql("select draft_from from gov_form_def where form_key='IMM 5707'") === "ONLINE_ONLY", r.body.message);
  r = await call("PATCH", `/library/forms/${encodeURIComponent("IMM 5488")}/draft-from`, { draftFrom: "ONLINE_ONLY" });
  ok("review 2 should 4 fail: nothing is drafted from a checklist, so it has no drafting choice", r.status === 400 && /checklist/.test(r.body.message));
  r = await call("PATCH", `/library/forms/${encodeURIComponent("IMM 5707")}/draft-from`, { draftFrom: "PDF_ONLY" });
  ok("C2.10 fail: a choice that is not one of the two is refused on its field", r.status === 400 && r.body.errors?.[0]?.field === "draftFrom");
  r = await call("PATCH", `/library/forms/${encodeURIComponent("IMM 5707")}/draft-from`, { draftFrom: "PDF_FIRST" }, "user-B");
  ok("C2.10 fail: only an author changes it", r.status === 403 && sql("select draft_from from gov_form_def where form_key='IMM 5707'") === "ONLINE_ONLY");
  r = await call("PATCH", `/library/forms/${encodeURIComponent("IMM 0000")}/draft-from`, { draftFrom: "PDF_FIRST" });
  ok("C2.10 fail: a form that is not in the library has no choice to make", r.status === 404);

  const out = join(import.meta.dirname, "..", "evidence", "screen01"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "channels-checks.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
