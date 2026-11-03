// Screen 01 fix pass (P-74): the forms decisions made visible on Screen 01, on the F1 back end, through the API and the
// database, with a passing and a failing case per rule. C1.6 each line's channel and the derived filing method, set by
// the author per line; P-107 Online stays a choice with a warning that it needs the browser extension (later wave).
// W1-02 (P-102): C1.7 the portal and default channel, C2.7 "Add an online form" and C2.10 what drafting reads online
// are parked with the browser extension, and their routes are gone. No browser, no model call.
//   zsh studio/tools/isolated.sh screens_ch 4447 start && tsx studio/tests/check_screen01_channels.ts 4447 xr_studio_screens_ch
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_screens_ch";
const log: unknown[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
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

  // ---------------------------------------------------------------- P-107 Online stays a choice (W1-02, P-102)
  r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5707")}/channel`, { channel: "ONLINE" });
  s = await sum();
  const later = s.channelProblems.find((p: any) => p.item === "IMM 5707");
  ok("C1.6 P-107 pass: a line filed Online is saved and says it needs the browser extension (later wave): a warning, never \"no portal\" or an error", r.status === 200 && s.forms.find((f: any) => f.code === "IMM 5707").channel === "ONLINE" && later?.level === "warning" && /later wave/.test(later.message) && !s.channelProblems.some((p: any) => p.level === "error"), s.channelProblems.map((p: any) => p.message));
  ok("C1.6 P-107: the filing method follows (Mixed: online and PDF) on the page and the Programs row", s.filing === "Mixed: online and PDF" && (await rowOf("individual.work_permits.employer_specific.with_lmia")).filing === "Mixed: online and PDF", s.filing);
  const lmiaMissing = ((await rowOf("individual.work_permits.employer_specific.with_lmia")).missing as any[]) ?? [];
  ok("C1.6 P-107 fail case: an Online line is never a \"cannot be filed\" line in the missing list (the warning does not block)", !lmiaMissing.some((m) => m.code === "filing_problem"), lmiaMissing.map((m) => m.code));
  ok("C1.6 P-102: the summary carries no portal, no default channel and no online forms", s.portal === undefined && s.portalLabel === undefined && s.onlineForms === undefined && s.forms.every((f: any) => f.defaultChannel === undefined));
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5707")}/channel`, { channel: "PDF_UPLOAD" });
  const parked = await Promise.all([["PATCH", `/combinations/${wp}/portal`, { portal: "ircc_portal" }], ["POST", `/combinations/${wp}/channels/use-defaults`, { lines: [{ line: "IMM 5707", from: "PDF_UPLOAD" }] }], ["POST", "/captures", { portal: "ircc_portal", form: "IMM 5707", title: "Family information (online)", combinationId: wp }], ["GET", `/combinations/${wp}/drafting-sources`], ["PATCH", `/library/forms/${encodeURIComponent("IMM 5707")}/draft-from`, { draftFrom: "ONLINE_ONLY" }]].map(([m, p, b]) => call(m as string, p as string, b)));
  ok("C1.6 P-102 fail: the parked portal choice, \"use the default\", \"Add an online form\" and what drafting reads online answer 404; nothing changes", parked.every((x) => x.status === 404) && sql(`select coalesce(portal_key,'') from combination where id='${wp}'`) === "" && sql("select count(*) from portal_capture") === "0", parked.map((x) => x.status));

  const out = join(import.meta.dirname, "..", "evidence", "screen01"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "channels-checks.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
