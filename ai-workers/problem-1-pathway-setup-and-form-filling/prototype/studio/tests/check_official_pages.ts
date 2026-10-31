// F2 (forms lane, N8; P-156 (2), P-176, P-161 (3); C11.10 step 1): a combination's official page. The rules propose from
// what is attached (one apply page → the configuration author confirms; none or several → the immigration expert chooses);
// POST /combinations/:id/official-pages/confirm stores who confirmed which page and on which tier, refused by the setup
// checklist's own duty rule; the checklist (GET /combinations/:id/summary, the catalogue) reads it. A passing and a failing
// case per rule, on an isolated copy with the sample loaded. No AI (US$0).
//   zsh studio/tools/isolated.sh forms_op 4450 start && tsx studio/tests/check_official_pages.ts 4450 xr_studio_forms_op
import { execFileSync } from "node:child_process";
import { confirmationOf, officialPagesFrom, recordHolds } from "../engine/official-pages.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_op";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const msg = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");

(async () => {
  // ── the rule, pure
  const web = (id: string) => ({ id, kind: "Web page", title: id, file: `${id}.html` });
  ok("C11.10 F2 pass: no page attached → no record yet", officialPagesFrom([{ id: "f", kind: "Form", title: "IMM 5257", file: "imm5257e.pdf" }], null).state === "no_record");
  ok("C11.10 F2 fail: an office's PDF instructions are not a page (still no record)", officialPagesFrom([{ id: "i", kind: "Instructions", title: "IMM 5905", file: "IMM5905E.pdf" }], null).state === "no_record");
  const one = officialPagesFrom([web("a"), { id: "g", kind: "Instructions", title: "Guide", file: "guide.html" }], null);
  ok("C11.10 F2 pass: one apply page → proposed, 1 match (the author's to confirm)", one.state === "proposed" && one.matches === 1 && confirmationOf([web("a")], "a").tier === "author" && confirmationOf([web("a")], "a").kind === "confirm_pages");
  ok("C11.10 F2 fail: two apply pages → the expert chooses (choose_pages, expert tier)", confirmationOf([web("a"), web("b")], "a").tier === "expert" && confirmationOf([web("a"), web("b")], "a").kind === "choose_pages");
  ok("C11.10 F2 fail: the rules' one match passed over for another page → the expert's choice", confirmationOf([web("a"), { id: "g", kind: "Instructions", title: "Guide", file: "guide.html" }], "g").tier === "expert");
  const formPage = { id: "fp", kind: "Web page", title: "IMM5257 form page", file: "page-imm5257.html" };
  ok("C11.10 F2 N8 re-review M1 fail: a single form's page (\"… form page\") is no apply page: alone it is 0 matches, the expert's choice", officialPagesFrom([formPage], null).state === "proposed" && (officialPagesFrom([formPage], null) as { matches: number }).matches === 0 && confirmationOf([formPage], "fp").tier === "expert");
  ok("C11.10 F2 N8 re-review M1 pass: an application package beside form pages is the one match (the author's)", confirmationOf([web("a"), formPage, { ...formPage, id: "fp2", title: "IMM5409 form page", file: "page-imm5409.html" }], "a").tier === "author");
  ok("C11.10 F2 pass: a confirmation counts while its page is attached", officialPagesFrom([web("a")], { attachmentId: "a", confirmedBy: "user-A", confirmedAs: "author" }).state === "confirmed");
  ok("C11.10 F2 N8 break M2 fail: an author's 'sure' confirmation stops holding once a second apply page is attached (the expert's choice again)", !recordHolds([web("a"), web("b")], { attachmentId: "a", confirmedBy: "user-A", confirmedAs: "author" }) && officialPagesFrom([web("a"), web("b")], { attachmentId: "a", confirmedBy: "user-A", confirmedAs: "author" }).state === "proposed");
  ok("C11.10 F2 N8 break M2 pass: the expert's choice still holds with two apply pages", officialPagesFrom([web("a"), web("b")], { attachmentId: "a", confirmedBy: "user-C", confirmedAs: "expert" }).state === "confirmed");
  ok("C11.10 F2 N8 review M2 fail: over a holding expert's choice, even the rules' one match is the expert's to confirm", confirmationOf([web("a"), { id: "g", kind: "Instructions", title: "Guide", file: "guide.html" }], "a", { attachmentId: "g", confirmedBy: "user-C", confirmedAs: "expert" }).tier === "expert");
  ok("C11.10 F2 fail: a confirmation whose page is gone counts as none (proposed again)", officialPagesFrom([web("b")], { attachmentId: "a", confirmedBy: "user-A", confirmedAs: "author" }).state === "proposed");

  // ── the API on the sample (from a reset, so a run before this one leaves nothing behind)
  await call("POST", "/demo/reset", { confirm: "RESET" });
  await call("POST", "/demo/load");
  const id = (key: string) => sql(`select id from combination where combination_key='${key}'`);
  const wp = id("wp.family"), sp = id("sp.student");
  let r = await call("GET", `/combinations/${wp}/official-pages`);
  const match = r.body?.candidates?.find((c: any) => c.match), other = r.body?.candidates?.find((c: any) => !c.match); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.10 F2 pass: GET answers the rules' proposal (one apply page on Work permit, family) and the pages to choose from, the match first", r.status === 200 && r.body.pages.state === "proposed" && r.body.pages.matches === 1 && r.body.candidates[0].match === true && !!other && !r.body.candidates.some((c: any) => /\.pdf$/i.test(c.title) || /IMM 5905/.test(c.title)), r.body); // eslint-disable-line @typescript-eslint/no-explicit-any
  let sum = await call("GET", `/combinations/${wp}/summary`);
  const step1 = (s: Res) => s.body?.setup?.steps?.find((x: any) => x.key === "pages"); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.10 F2 pass: the checklist reads the record: step 1 open with 'Confirm the checklist page' (before: no record, no item)", step1(sum)?.open?.some((i: any) => i.kind === "confirm_pages" && i.tier === "author"), step1(sum)); // eslint-disable-line @typescript-eslint/no-explicit-any
  // N8 (F2 review M1, break M3): no screen offers Confirm yet (slice C), so it is not "Needs you" for anyone.
  const vw = (s: Res) => s.body?.setup?.viewer;
  const sumC = await call("GET", `/combinations/${sp}/summary`, undefined, "user-C");
  ok("C11.10 F2 N8 review M1 fail: step 1's Confirm/Choose is not 'Needs you' for the author or the expert until a screen offers it", !!vw(sum) && !!vw(sumC) && !/checklist page/.test(vw(sum)?.needsYou?.text ?? "") && !/checklist page/.test(vw(sumC)?.needsYou?.text ?? ""), { a: vw(sum)?.needsYou, c: vw(sumC)?.needsYou });
  for (const [who, name] of [["user-B", "approver"], ["user-O", "case officer"], ["user-P", "client"]]) {
    r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, who);
    ok(`C11.10 F2 fail: the ${name} cannot confirm the official page (403), nothing stored`, r.status === 403 && sql(`select count(*) from combination_official_pages where combination_id='${wp}'`) === "0", { status: r.status, m: msg(r) });
  }
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: other.id }, "user-A");
  ok("C11.10 F2 fail (P-176): the author cannot pass over the rules' one match for another page: that is the expert's choice (403, plain words, no decision code)", r.status === 403 && /choosing a different page is the immigration expert's call/.test(msg(r)) && !/P-\d/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: sql(`select id from source_attachment where combination_id='${sp}' limit 1`) }, "user-A");
  ok("C11.10 F2 fail: a page of another combination is refused (400), nothing stored", r.status === 400 && /not one of this combination's attached pages/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id, extra: 1 }, "user-A");
  ok("C11.10 F2 fail: an unknown field or no page is refused in words (400)", r.status === 400 && /field the server does not know/.test(msg(r)) && (await call("POST", `/combinations/${wp}/official-pages/confirm`, {}, "user-A")).status === 400, msg(r));
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, [], "user-A");
  ok("C11.10 F2 N8 break m7 fail: a body that is not an object is refused in plain words (400)", r.status === 400 && /Send the page to confirm as \{ attachmentId \}/.test(msg(r)), msg(r));
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, null);
  ok("C11.10 F2 fail: nobody (no person named) cannot confirm (401)", r.status === 401, r.status);
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, "user-P");
  ok("C11.10 F2 N8 break m6 fail: a case person (client) gets 'Not for case people', as on reading", r.status === 403 && r.body?.title === "Not for case people", r.body);
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, "user-A");
  const row = sql(`select confirmed_by || '|' || confirmed_as || '|' || matches || '|' || attachment_id from combination_official_pages where combination_id='${wp}'`);
  ok("C11.10 F2 pass: the author confirms the rules' one match: stored with who, the tier (author) and the page", r.status === 201 && r.body.pages.state === "confirmed" && row === `user-A|author|1|${match.id}`, { status: r.status, row });
  ok("C11.10 F2 pass: the confirmation is in the audit trail with the page and the tier", /confirmed the official page of .*Work permit outside: forms and documents page.*configuration author tier, sure/.test(sql(`select summary from audit_event where action='confirmed' and entity='official page' and entity_key='${wp}'`)));
  sum = await call("GET", `/combinations/${wp}/summary`);
  const audits = () => sql(`select count(*) from audit_event where action='confirmed' and entity='official page' and entity_key='${wp}'`);
  const a1 = audits(); r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, "user-A");
  ok("C11.10 F2 N8 break m2 pass: the same confirmation again changes nothing and writes no second audit line", r.status === 201 && r.body?.again === true && audits() === a1, { status: r.status, a1, a2: audits() });
  ok("C11.10 F2 pass: step 1 is done on the checklist, confirmed by the author tier", step1(sum)?.state === "done" && step1(sum)?.confirmed?.as === "author" && !step1(sum)?.open?.length, step1(sum));
  // The expert's choice where the rules are not sure.
  r = await call("GET", `/combinations/${sp}/official-pages`);
  const spPage = r.body?.candidates?.[0];
  ok("C11.10 F2 pass: no apply page on Study permit → proposed with 0 matches, the expert's item on the checklist", r.body?.pages?.state === "proposed" && r.body.pages.matches === 0 && step1(await call("GET", `/combinations/${sp}/summary`))?.open?.some((i: any) => i.kind === "choose_pages" && i.tier === "expert"), r.body); // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await call("POST", `/combinations/${sp}/official-pages/confirm`, { attachmentId: spPage.id }, "user-A");
  ok("C11.10 F2 fail (P-176): the author cannot choose where the rules are not sure (403, nothing stored)", r.status === 403 && sql(`select count(*) from combination_official_pages where combination_id='${sp}'`) === "0", { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${sp}/official-pages/confirm`, { attachmentId: spPage.id }, "user-C");
  ok("C11.10 F2 pass: the immigration expert chooses it: stored on the expert tier", r.status === 201 && sql(`select confirmed_by || '|' || confirmed_as || '|' || matches from combination_official_pages where combination_id='${sp}'`) === "user-C|expert|0", { status: r.status, m: msg(r) });
  // N8 (F2 review M2, break M1): the expert's choice over the rules' one match is not overwritten by the author.
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: other.id }, "user-C");
  ok("C11.10 F2 N8 pass: the expert chooses another page over the author's confirmation; the audit names what it replaces", r.status === 201 && /It replaces Work permit outside: forms and documents page, confirmed by user-A \(author tier\)/.test(sql(`select summary from audit_event where action='confirmed' and entity='official page' and entity_key='${wp}' order by at desc limit 1`)), { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, "user-A");
  ok("C11.10 F2 N8 review M2 fail: the author cannot overwrite the expert's choice, even with the rules' one match (403, the expert's record stays)", r.status === 403 && /only the immigration expert changes it/.test(msg(r)) && sql(`select confirmed_by || '|' || confirmed_as from combination_official_pages where combination_id='${wp}'`) === "user-C|expert", { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, "user-C");
  ok("C11.10 F2 N8 pass: the expert may change their own choice back", r.status === 201 && sql(`select confirmed_by || '|' || confirmed_as from combination_official_pages where combination_id='${wp}'`) === "user-C|expert", { status: r.status, m: msg(r) });
  // N8 break M2: a second apply page attached reopens an author's 'sure' confirmation (sp has none: use wp's record by the author).
  sql(`update combination_official_pages set confirmed_by='user-A', confirmed_as='author' where combination_id='${wp}'`);
  sql(`update source_attachment set kind='Web page' where id='${other.id}'`);
  r = await call("GET", `/combinations/${wp}/official-pages`);
  ok("C11.10 F2 N8 break M2 fail (API): with a second apply page attached, the author's 'sure' confirmation no longer counts: proposed, 2 matches, the expert's choice", r.body?.pages?.state === "proposed" && r.body.pages.matches === 2 && step1(await call("GET", `/combinations/${wp}/summary`))?.open?.some((i: any) => i.kind === "choose_pages"), r.body?.pages); // eslint-disable-line @typescript-eslint/no-explicit-any
  sql(`update source_attachment set kind='Instructions' where id='${other.id}'`);
  // Retired: no confirmation.
  sql(`update combination set retired_at = now() where id='${sp}'`);
  r = await call("POST", `/combinations/${sp}/official-pages/confirm`, { attachmentId: spPage.id }, "user-C");
  ok("C11.10 F2 N8 break m1 fail: a retired combination's official page is not changed (409)", r.status === 409 && /retired/.test(msg(r)), { status: r.status, m: msg(r) });
  sql(`update combination set retired_at = null where id='${sp}'`);
  // N8 re-review M1 (API): a single form's page attached to Study permit is not the rules' match: the author cannot confirm it.
  sql(`delete from combination_official_pages where combination_id='${sp}'`); // the expert's earlier choice there is set aside
  r = await call("POST", `/combinations/${sp}/attachments/sample`, { officialFile: "page-imm5257.html" });
  const fpId = sql(`select id from source_attachment where combination_id='${sp}' and file_name='page-imm5257.html' limit 1`);
  r = await call("GET", `/combinations/${sp}/official-pages`);
  const rf = await call("POST", `/combinations/${sp}/official-pages/confirm`, { attachmentId: fpId }, "user-A");
  ok("C11.10 F2 N8 re-review M1 fail (API): with only IMM 5257's form page attached, there is no match and the author's confirm is 403 (before: 201 'sure', step done)", !!fpId && r.body?.pages?.matches === 0 && rf.status === 403, { id: fpId, pages: r.body?.pages, status: rf.status, m: msg(rf) });
  // N8 re-review 2: an author and the expert at the same moment: whichever runs first, the expert's choice is what stays.
  let kept = 0;
  for (let i = 0; i < 8; i++) {
    sql(`delete from combination_official_pages where combination_id='${wp}'`);
    await Promise.all([call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, "user-A"), call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: other.id }, "user-C")]);
    if (sql(`select confirmed_by || '|' || confirmed_as || '|' || attachment_id from combination_official_pages where combination_id='${wp}'`) === `user-C|expert|${other.id}`) kept++;
  }
  ok("C11.10 F2 N8 re-review 2 fail: in 8 rounds of the author and the expert confirming at once, the expert's choice stays every time (before: the author's write replaced it in some)", kept === 8, kept);
  // N8 break m4: the approved delete of a never-released combination removes its record.
  const fresh = sql(`select c.id from combination c where not exists (select 1 from config_release r where r.combination_id = c.id) and exists (select 1 from source_attachment a where a.combination_id = c.id and (a.kind = 'Web page' or (a.kind = 'Instructions' and a.file_name like '%.html'))) and c.id <> '${wp}' order by c.created_at limit 1`);
  const fpg = (await call("GET", `/combinations/${fresh}/official-pages`)).body?.candidates?.[0]?.id;
  await call("POST", `/combinations/${fresh}/official-pages/confirm`, { attachmentId: fpg }, "user-C");
  const had = sql(`select count(*) from combination_official_pages where combination_id='${fresh}'`);
  const prop = await call("DELETE", `/combinations/${fresh}`, { reason: "Not needed in this demo (check)" }, "user-A");
  const chId = sql(`select id from library_change where kind='combination' and key='${fresh}' and status='WAITING' order by proposed_at desc limit 1`);
  const appr = await call("POST", `/library/changes/${chId}/approve`, { note: "Agreed: never released" }, "user-B");
  ok("C11.10 F2 N8 break m4 pass: the approved delete of a never-released combination removes its official-page record", !!fresh && had === "1" && prop.status < 300 && appr.status < 300 && sql(`select count(*) from combination where id='${fresh}'`) === "0" && sql(`select count(*) from combination_official_pages where combination_id='${fresh}'`) === "0", { fresh, had, prop: [prop.status, msg(prop)], appr: [appr.status, msg(appr)] });
  // A confirmed page removed from the combination: the record no longer counts.
  sql(`delete from source_attachment where id=(select attachment_id from combination_official_pages where combination_id='${wp}')`);
  r = await call("GET", `/combinations/${wp}/official-pages`);
  ok("C11.10 F2 fail: once the confirmed page is no longer attached, step 1 is open again (never confirmed on a missing page)", r.body?.pages?.state === "proposed" && r.body.record === null, r.body?.pages);
  r = await call("GET", "/combinations/00000000-0000-0000-0000-000000000000/official-pages");
  ok("C11.10 F2 fail: an unknown combination is 404", r.status === 404, r.status);
  // A demo reset clears the records.
  const before = sql("select count(*) from combination_official_pages");
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("C11.10 F2 pass: a demo reset clears the confirmations", Number(before) >= 1 && r.status < 300 && sql("select count(*) from combination_official_pages") === "0", { before, status: r.status, m: msg(r) });
  await call("POST", "/demo/load");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
