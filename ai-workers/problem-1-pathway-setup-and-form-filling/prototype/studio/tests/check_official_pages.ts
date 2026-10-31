// F2 (forms lane, N8; P-156 (2), P-176, P-161 (3); C11.10 step 1): a combination's official page. The rules propose from
// what is attached (one apply page → the configuration author confirms; none or several → the immigration expert chooses);
// POST /combinations/:id/official-pages/confirm stores who confirmed which page and on which tier, refused by the setup
// checklist's own duty rule; the checklist (GET /combinations/:id/summary, the catalogue) reads it. A passing and a failing
// case per rule, on an isolated copy with the sample loaded. No AI (US$0).
//   zsh studio/tools/isolated.sh forms_op 4450 start && tsx studio/tests/check_official_pages.ts 4450 xr_studio_forms_op
import { execFileSync } from "node:child_process";
import { confirmationOf, officialPagesFrom } from "../engine/official-pages.ts";

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
  ok("C11.10 F2 pass: a confirmation counts while its page is attached", officialPagesFrom([web("a")], { attachmentId: "a", confirmedBy: "user-A", confirmedAs: "author" }).state === "confirmed");
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
  for (const [who, name] of [["user-B", "approver"], ["user-O", "case officer"], ["user-P", "client"]]) {
    r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, who);
    ok(`C11.10 F2 fail: the ${name} cannot confirm the official page (403), nothing stored`, r.status === 403 && sql(`select count(*) from combination_official_pages where combination_id='${wp}'`) === "0", { status: r.status, m: msg(r) });
  }
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: other.id }, "user-A");
  ok("C11.10 F2 fail (P-176): the author cannot pass over the rules' one match for another page: that is the expert's choice (403)", r.status === 403 && /immigration expert chooses it/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: sql(`select id from source_attachment where combination_id='${sp}' limit 1`) }, "user-A");
  ok("C11.10 F2 fail: a page of another combination is refused (400), nothing stored", r.status === 400 && /not one of this combination's attached pages/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id, extra: 1 }, "user-A");
  ok("C11.10 F2 fail: an unknown field or no page is refused in words (400)", r.status === 400 && /field the server does not know/.test(msg(r)) && (await call("POST", `/combinations/${wp}/official-pages/confirm`, {}, "user-A")).status === 400, msg(r));
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, null);
  ok("C11.10 F2 fail: nobody (no person named) cannot confirm (401)", r.status === 401, r.status);
  r = await call("POST", `/combinations/${wp}/official-pages/confirm`, { attachmentId: match.id }, "user-A");
  const row = sql(`select confirmed_by || '|' || confirmed_as || '|' || matches || '|' || attachment_id from combination_official_pages where combination_id='${wp}'`);
  ok("C11.10 F2 pass: the author confirms the rules' one match: stored with who, the tier (author) and the page", r.status === 201 && r.body.pages.state === "confirmed" && row === `user-A|author|1|${match.id}`, { status: r.status, row });
  ok("C11.10 F2 pass: the confirmation is in the audit trail with the page and the tier", /confirmed the official page of .*Work permit outside: forms and documents page.*configuration author tier, sure/.test(sql(`select summary from audit_event where action='confirmed' and entity='official page' and entity_key='${wp}'`)));
  sum = await call("GET", `/combinations/${wp}/summary`);
  ok("C11.10 F2 pass: step 1 is done on the checklist, confirmed by the author tier", step1(sum)?.state === "done" && step1(sum)?.confirmed?.as === "author" && !step1(sum)?.open?.length, step1(sum));
  // The expert's choice where the rules are not sure.
  r = await call("GET", `/combinations/${sp}/official-pages`);
  const spPage = r.body?.candidates?.[0];
  ok("C11.10 F2 pass: no apply page on Study permit → proposed with 0 matches, the expert's item on the checklist", r.body?.pages?.state === "proposed" && r.body.pages.matches === 0 && step1(await call("GET", `/combinations/${sp}/summary`))?.open?.some((i: any) => i.kind === "choose_pages" && i.tier === "expert"), r.body); // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await call("POST", `/combinations/${sp}/official-pages/confirm`, { attachmentId: spPage.id }, "user-A");
  ok("C11.10 F2 fail (P-176): the author cannot choose where the rules are not sure (403, nothing stored)", r.status === 403 && sql(`select count(*) from combination_official_pages where combination_id='${sp}'`) === "0", { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${sp}/official-pages/confirm`, { attachmentId: spPage.id }, "user-C");
  ok("C11.10 F2 pass: the immigration expert chooses it: stored on the expert tier", r.status === 201 && sql(`select confirmed_by || '|' || confirmed_as || '|' || matches from combination_official_pages where combination_id='${sp}'`) === "user-C|expert|0", { status: r.status, m: msg(r) });
  // A confirmed page removed from the combination: the record no longer counts.
  sql(`delete from source_attachment where id='${match.id}'`);
  r = await call("GET", `/combinations/${wp}/official-pages`);
  ok("C11.10 F2 fail: once the confirmed page is no longer attached, step 1 is open again (never confirmed on a missing page)", r.body?.pages?.state === "proposed" && r.body.record === null, r.body?.pages);
  r = await call("GET", "/combinations/00000000-0000-0000-0000-000000000000/official-pages");
  ok("C11.10 F2 fail: an unknown combination is 404", r.status === 404, r.status);
  // A demo reset clears the records.
  const before = sql("select count(*) from combination_official_pages");
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("C11.10 F2 pass: a demo reset clears the confirmations", before === "2" && r.status < 300 && sql("select count(*) from combination_official_pages") === "0", { before, status: r.status, m: msg(r) });
  await call("POST", "/demo/load");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
