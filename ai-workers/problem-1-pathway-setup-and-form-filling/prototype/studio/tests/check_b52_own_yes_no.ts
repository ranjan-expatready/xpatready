// B52 (tech lead's ruling P-334 (5)) and QA-227 (Major) on the configured checkpoint, US$0, no SQL write, no live AI:
// * IMM 5257's three Yes/No form fields worked out from other answers ("Have you ever used any other name…?", "Do you
//   have a national identity document?", "Are you a lawful Permanent Resident of the United States…?") are asked as their
//   own questions through To review › Form fields (POST /editions/:id/form-fields/own-question), in the form's words
//   (page, quote, saved date), with the library's field of the same name; the shared placement step then asks them;
// * IMM 5476 and IMM 5475 apply to a represented case (their deciding questions answered Yes) and to no other (No), and
//   are "cannot tell yet" (listed, asked) before anyone answers; on main their "exists" rule made them never apply;
// * the route's refusals, each in words, and a new field waiting for a second person.
//   zsh studio/tools/isolated.sh s9_yesno 4440 start && tsx studio/tests/check_b52_own_yes_no.ts 4440 xr_studio_s9_yesno
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { printedQuestion } from "../api/src/own-question.ts";

const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_s9_yesno";
const AUTHOR = "user-A", APPROVER = "user-B", OFFICER = "user-O", CLIENT = "user-P";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !c ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
// node:http, not fetch: the load can take more than fetch's 300 s header wait on a busy Mac.
const call = (method: string, path: string, body?: unknown, actor: string | null = AUTHOR) => new Promise<{ status: number; body: any }>((done, failed) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "localhost", port: PORT, path: `/api${path}`, method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b: any = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", failed); if (data) rq.write(data); rq.end();
});
const words = (r: { body: any }) => String(r.body?.message ?? r.body?.detail ?? "");
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
const ALIAS = "form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]";
const NATID = "form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]", USCARD = "form1[0].Page2[0].USCard[0].q1[0].usCardIndicator[0]";

(async () => {
  // ------------------------------------------------------------ B52 review M2: the form's own question, never a neighbour's words
  ok("B52 pass: the heading is the question when it is one (IMM 5257's US card box, whose caption repeats the national identity question)", printedQuestion({ heading: "Are you a lawful Permanent Resident of the United States with a valid alien registration card (green card)?", caption: "National Identity Document Section Question 1. Do you have a national identity document?" }) === "Are you a lawful Permanent Resident of the United States with a valid alien registration card (green card)?");
  ok("B52 pass: a heading that is not a question (Question 8 A's \"* Date of birth\") gives way to the caption's question, without its number", printedQuestion({ heading: "* Date of birth", caption: "Question 8 A. During the past 5 years have you lived in any country other than your country of citizenship?" }) === "During the past 5 years have you lived in any country other than your country of citizenship?");
  ok("B52 fail: neither a question (\"YYYY-MM-DD\", \"Family name\") → no question, so the box is refused", printedQuestion({ heading: "YYYY-MM-DD", caption: "Family name" }) === null && printedQuestion(undefined) === null);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const before = ledger();
  const l = await call("POST", "/demo/load", { sample: "configured" });
  if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  const row7 = (l.body.checkpoint as { row: string; status: string; why: string | null }[]).find((x) => x.row === "7");
  ok("B52/QA-227: the checkpoint's sections and questions step is done, nothing refused", row7?.status === "done", row7);
  const vv = sql("select id from combination where combination_key = 'vv.single'");
  const ed = sql("select e.id from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = 'IMM 5257' and e.channel = 'PDF' order by e.edition_label desc limit 1");
  const box = (p: string) => sql(`select canonical_field_key || '|' || origin || '|' || coalesce(reason, '') || '|' || transform || '|' || coalesce(evidence_quote, '') from form_field_map where form_edition_id = '${ed}' and data_path = '${p}' order by version desc limit 1`).split("|");

  // ------------------------------------------------------------ B52: the three Yes/No form fields
  const want: [string, string, RegExp][] = [[ALIAS, "person.has_used_other_name", /p\. 1: "Have you ever used any other name/], [NATID, "person.has_national_id", /p\. 2: "Do you have a national identity document\?"/], [USCARD, "person.us_permanent_resident", /p\. 2: "Are you a lawful Permanent Resident of the United States/]];
  for (const [p, key, quote] of want) {
    const [fact, origin, cite, transform, evidence] = box(p);
    ok(`B52 pass: IMM 5257's ${key} form field reads its own question, decided by a person, the form's words cited (page, quote, saved date)`, fact === key && origin === "HUMAN" && quote.test(cite) && /IMM 5257 \(09-2023\)/.test(cite) && /saved 2026-\d\d-\d\d/.test(cite), { fact, origin, cite });
    ok(`B52 pass (review m1): ${key}'s form field keeps only the printed question as its words (the list before the file shows them), never a file path`, quote.test(`p. 1: "${evidence}"`) || quote.test(`p. 2: "${evidence}"`) ? !/official-sources|IMM 5257 \(/.test(evidence) : false, evidence);
    ok(`B52 pass: ${key}'s form field keeps its "worked out" step as the cross-check (QA-165)`, /^derived:.*recorded/.test(transform ?? ""), transform);
  }
  ok("B52 pass: the library's field of the same name is used (IMM 0008's, IMM 1294's), never a second one", sql("select count(*) from canonical_field where canonical_field_key in ('person.used_other_name', 'person.national_id', 'person.us_permanent_resident_2', 'person.has_used_other_name_2', 'person.has_national_id_2')") === "0");
  const prev = (await call("GET", `/combinations/${vv}/preview`)).body;
  const q = new Map((prev.questions as { fact: string; why: string; about: string }[]).map((x) => [x.fact, x]));
  ok("B52 pass: the shared placement step asks all three on the Visitor visa, each because IMM 5257 reads it", want.every(([, k]) => /read by IMM 5257/.test(q.get(k)?.why ?? "")), want.map(([, k]) => q.get(k)));
  const list = (await call("GET", `/editions/${ed}/form-fields/own-questions`)).body;
  ok("B52 pass: To review › Form fields lists the worked-out Yes/No form fields with the form's question; the three are asked", [ALIAS, NATID, USCARD].every((p) => list.fields.find((f: { dataPath: string; asked: boolean }) => f.dataPath === p)?.asked === true) && list.fields.every((f: { question: string | null }) => f.question === null || (/\?$/.test(f.question) && !/Date of birth/.test(f.question))), list.fields?.slice(0, 4));

  // ------------------------------------------------------------ B52: the route's refusals, each in words
  const ask = (b: unknown, actor: string | null = AUTHOR, edition = ed) => call("POST", `/editions/${edition}/form-fields/own-question`, b, actor);
  const why = "The form asks this Yes/No itself (B52 check)";
  const open = list.fields.find((f: { dataPath: string; asked: boolean }) => !f.asked && /PCRIndicator/.test(f.dataPath)) as { dataPath: string; question: string } | undefined;
  ok("B52 pass (review M2): Question 8 A is offered with its own words, never its neighbour's heading (\"* Date of birth\")", /^During the past 5 years have you lived in any country other than your country of citizenship/.test(open?.question ?? ""), open);
  let r = await ask({ dataPath: open?.dataPath, label: "B52 check lived elsewhere", meaning: "Whether the person lived elsewhere (B52 check, Sample).", reason: why }, null);
  ok("B52 fail: with no person it is refused (401)", r.status === 401, r);
  r = await ask({ dataPath: open?.dataPath, label: "B52 check lived elsewhere", meaning: "Whether the person lived elsewhere (B52 check, Sample).", reason: why }, APPROVER);
  ok("B52 fail: the Approver cannot (403: the author's step)", r.status === 403, r);
  r = await ask({ dataPath: ALIAS, field: "person.has_used_other_name", reason: why }, AUTHOR, "00000000-0000-0000-0000-000000000000");
  ok("B52 fail: an unknown edition is 404 in words", r.status === 404 && /does not exist/.test(words(r)), r);
  r = await ask({ dataPath: "form1[0].Nope[0]", field: "person.has_used_other_name", reason: why });
  ok("B52 fail: an unknown form field is 404 in words", r.status === 404 && /has no form field/.test(words(r)), r);
  const plain = sql(`select data_path from form_field_map where form_edition_id = '${ed}' and outcome = 'mapped' and transform = 'as_is' order by data_path limit 1`);
  r = await ask({ dataPath: plain, field: "person.has_used_other_name", reason: why });
  ok("B52 fail: a form field that is not a worked-out Yes/No is refused (409), nothing changed", r.status === 409 && /not a Yes\/No form field worked out/.test(words(r)), r);
  r = await ask({ dataPath: ALIAS, field: "person.has_used_other_name", reason: why });
  ok("B52 fail: a form field already asked as its own question is refused (409)", r.status === 409 && /already asked as its own question/.test(words(r)), r);
  r = await ask({ dataPath: open?.dataPath, field: "person.has_national_id", label: "x", meaning: "Whether something is so.", reason: why });
  ok("B52 fail: a library field and a new name at once are refused (400)", r.status === 400 && /not both/.test(words(r)), r);
  r = await ask({ dataPath: open?.dataPath, reason: why });
  ok("B52 fail: neither a library field nor a new name is refused (400)", r.status === 400 && /Choose the library Yes\/No field/.test(words(r)), r);
  r = await ask({ dataPath: open?.dataPath, field: "person.has_national_id", reason: "short" });
  ok("B52 fail: a reason under 8 characters is refused (400)", r.status === 400 && /at least 8/.test(words(r)), r);
  r = await ask({ dataPath: open?.dataPath, field: "person.national_id_number", reason: why });
  ok("B52 fail: a field not answered Yes or No is refused (400), in words", r.status === 400 && /not Yes or No/.test(words(r)), r);
  r = await ask({ dataPath: open?.dataPath, label: "Has national ID", meaning: "Whether the person has a national identity document (B52 check).", reason: why });
  ok("B52 fail: a new name the library already has is refused (409): choose that field", r.status === 409 && /already a shared field/.test(words(r)), r);
  r = await ask({ dataPath: open?.dataPath, field: "case.uses_representative", reason: why });
  ok("B52 fail: a field about the application on a person's form field is refused (400), in words", r.status === 400 && /is about case, but this form field is about person/.test(words(r)), r);
  r = await ask({ dataPath: open?.dataPath, label: "B52 check lived elsewhere", meaning: "Too short", reason: why });
  ok("B52 fail: a meaning under 10 characters is refused (400)", r.status === 400 && /10 characters or more/.test(words(r)), r);
  r = await ask({ dataPath: open?.dataPath, label: "!!!", meaning: "Whether the person lived elsewhere (B52 check, Sample).", reason: why });
  ok("B52 fail: a name with no letters or digits is refused (400)", r.status === 400 && /letters or digits/.test(words(r)), r);
  const online = sql("select id from form_edition where channel = 'ONLINE' limit 1");
  if (online) { r = await ask({ dataPath: ALIAS, field: "person.has_used_other_name", reason: why }, AUTHOR, online); ok("B52 fail: an online edition has no PDF form fields to ask (400)", r.status === 400 && /PDF edition/.test(words(r)), r); }
  ok("B52 fail: none of the refusals changed a form field or added a field", sql(`select count(*) from form_field_map where form_edition_id = '${ed}' and origin = 'HUMAN' and reason like '%B52 check%'`) === "0" && sql("select count(*) from canonical_field where label like 'B52 check%'") === "0");

  // ------------------------------------------------------------ B52: a new field, a second person, then asked
  if (!open) ok("B52: a worked-out Yes/No form field not asked yet to try a new field on", false, list.fields);
  else {
    r = await ask({ dataPath: open.dataPath, label: "B52 check lived elsewhere", meaning: "Whether the person lived in another country in the past five years (B52 check, Sample).", reason: why });
    const k = r.body?.field as string;
    ok("B52 pass: a new field is named by the person, its key built (never typed), the form's words its source", r.status === 201 || r.status === 200 ? r.body.created === true && k === "person.b52_check_lived_elsewhere" && r.body.question === open.question : false, r);
    const [status, origin, src] = sql(`select status || '|' || origin || '|' || coalesce(source_ref, '') from canonical_field where canonical_field_key = '${k}'`).split("|");
    ok("B52 pass: the new field is a draft by a person, its source the edition, page and printed question", status === "DRAFT" && origin === "HUMAN" && src.includes(`"${open.question}"`) && src.includes("IMM 5257 (09-2023)"), { status, origin, src });
    const change = sql(`select id || '|' || status || '|' || proposed_by from library_change where kind = 'field' and key = '${k}'`).split("|");
    ok("B52 pass: it waits for a second person on To review (proposed by the author)", change[1] === "WAITING" && change[2] === AUTHOR, change);
    r = await call("POST", `/library/changes/${change[0]}/approve`, { note: "Approved by the B52 check as the second person." }, AUTHOR);
    ok("B52 fail: the author cannot approve their own new field", r.status >= 400, r);
    r = await call("POST", `/library/changes/${change[0]}/approve`, { note: "Approved by the B52 check as the second person." }, APPROVER);
    ok("B52 pass: the Approver approves it", r.status < 300, r);
    const placed = await call("POST", `/combinations/${vv}/place-from-form-parts`, {});
    ok("B52 pass: the Smart questionnaire's step then asks it in the section of its form field", placed.status < 300 && (placed.body?.placed ?? []).some((p: { fact: string }) => p.fact === k), placed.body);
  }

  // ------------------------------------------------------------ QA-227: IMM 5476 and IMM 5475 on a represented case
  const formsOf = (p: { forms: { form: string; applies: unknown; missing: string[] }[] }, f: string) => p.forms.find((x) => x.form === f);
  for (const [f, fact] of [["IMM 5476", "case.uses_representative"], ["IMM 5475", "case.authorizes_release_to_designated_individual"]] as const) {
    const x = formsOf(prev, f);
    ok(`QA-227 pass: before anyone answers, ${f} is "cannot tell yet" on the Visitor visa, waiting for ${fact}`, x?.applies === "cannot_tell" && x.missing.includes(fact), x);
    ok(`QA-227 pass: ${fact} is a deciding question asked once for the application`, (prev.deciders as { fact: string; decides: string[] }[]).some((d) => d.fact === fact && d.decides.some((w) => w.includes(f))) && q.get(fact)?.about === "case", q.get(fact));
  }
  const lmia = sql("select id from combination where combination_key = 'wp.lmia_inside'");
  const lp = (await call("GET", `/combinations/${lmia}/preview`)).body;
  ok("QA-227 pass: With an LMIA's IMM 5476 and IMM 5475 wait for the same two questions", !!formsOf(lp, "IMM 5476")?.missing.includes("case.uses_representative") && !!formsOf(lp, "IMM 5475")?.missing.includes("case.authorizes_release_to_designated_individual"), [formsOf(lp, "IMM 5476"), formsOf(lp, "IMM 5475")]);
  ok("QA-227 pass: both facts came through C3.6's door for their rule (a rules proposal, approved), never SQL", sql("select count(*) from canonical_field where canonical_field_key in ('case.uses_representative', 'case.authorizes_release_to_designated_individual') and status = 'PUBLISHED' and source_ref like 'Needed by Form condition IMM 547%'") === "2");

  const caseFor = async (ref: string, answer: boolean | null, combinationId = vv) => {
    const id = (await call("POST", "/runtime/cases", { combinationId, reference: `B52-${ref}-${Date.now()}`, clientActor: CLIENT, principal: { displayName: `Sample Client ${ref}` } }, OFFICER)).body?.id as string;
    const people = (await call("GET", `/runtime/cases/${id}`, undefined, OFFICER)).body.people as { role: string; subject_id: string }[];
    const subject = people.find((p) => p.role === "case")!.subject_id;
    if (answer !== null) for (const fact of ["case.uses_representative", "case.authorizes_release_to_designated_individual"]) {
      const w = await call("PUT", `/runtime/cases/${id}/answers/${subject}/${fact}`, { value: answer, expectedId: null }, OFFICER);
      if (w.status !== 200) ok(`QA-227: answer ${fact} on case ${ref}`, false, w);
    }
    return new Set(((await call("GET", `/runtime/cases/${id}/forms`, undefined, OFFICER)).body.forms as { form: string; applies: boolean }[]).filter((f) => f.applies).map((f) => f.form));
  };
  const represented = await caseFor("represented", true), unrepresented = await caseFor("unrepresented", false), unanswered = await caseFor("unanswered", null);
  ok("QA-227 pass: a represented case (uses a representative, authorizes a release: Yes) lists IMM 5476 and IMM 5475", represented.has("IMM 5476") && represented.has("IMM 5475"), [...represented]);
  ok("QA-227 fail: a case answering No lists neither", !unrepresented.has("IMM 5476") && !unrepresented.has("IMM 5475"), [...unrepresented]);
  ok("QA-227 pass: a case nobody answered yet lists both as not decided yet (asked, never silently missing)", unanswered.has("IMM 5476") && unanswered.has("IMM 5475"), [...unanswered]);
  // Review m4: the same on With an LMIA – inside Canada and Study permit – outside Canada (their releases).
  for (const key of ["wp.lmia_inside", "sp.outside"]) {
    const c = sql(`select id from combination where combination_key = '${key}'`);
    const [y, n] = [await caseFor(`${key}-yes`, true, c), await caseFor(`${key}-no`, false, c)];
    ok(`QA-227 pass: on ${key} a represented case lists IMM 5476 and IMM 5475, a No lists neither`, y.has("IMM 5476") && y.has("IMM 5475") && !n.has("IMM 5476") && !n.has("IMM 5475"), { yes: [...y], no: [...n] });
  }

  // ------------------------------------------------------------ B52: the box reading its own question, on a case (QA-165 kept)
  {
    const id = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `B52-box-${Date.now()}`, clientActor: CLIENT, principal: { displayName: "Sample Client D" } }, OFFICER)).body?.id as string;
    const P = ((await call("GET", `/runtime/cases/${id}`, undefined, OFFICER)).body.people as { role: string; subject_id: string }[]).find((p) => p.role === "principal")!.subject_id;
    const open5257 = async () => (((await call("GET", `/runtime/cases/${id}/forms`, undefined, OFFICER)).body.forms as { form: string; subject_id: string; fields_open: { box: string; reason: string; why: string }[] }[]).find((f) => f.form === "IMM 5257" && f.subject_id === P)?.fields_open ?? []);
    const before5257 = (await open5257()).find((o) => o.box === ALIAS);
    ok("B52 pass: before an answer, the list before the file says the Yes/No box needs its own question's answer, naming it (never \"no question asks it yet\")", before5257?.reason === "needs an answer" && /^answer "/.test(before5257?.why ?? ""), before5257);
    type Sec = { section: string; subjectId: string; questions: { fact: string; answer: { id: string } | null; rows: { answer: { id: string } | null }[] }[]; group?: { none_apply?: { id: string } | null } | null };
    const view = async () => (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`, undefined, OFFICER)).body.sections as Sec[];
    const put = async (fact: string, value: unknown) => { const q = (await view()).flatMap((x) => x.questions.map((y) => ({ ...y, subjectId: x.subjectId }))).find((x) => x.subjectId === P && x.fact === fact); return call("PUT", `/runtime/cases/${id}/answers/${P}/${fact}`, { value, expectedId: q?.answer?.id ?? null }, OFFICER); };
    const confirmAll = async () => { for (const x of await view()) { const seen = [...x.questions.flatMap((y) => [y.answer?.id, ...y.rows.map((r) => r.answer?.id)]), x.group?.none_apply?.id].filter(Boolean); if (seen.length) await call("POST", `/runtime/cases/${id}/sections/${x.section}/confirm`, { subjectId: x.subjectId, seen }, OFFICER); } };
    const w1 = await put("person.has_national_id", false), w2 = await put("person.national_id_number", "SAMPLEID1"); await confirmAll();
    const clash = (await open5257()).find((o) => o.box === NATID);
    ok("B52 fail (QA-165 kept): a confirmed No to \"Has national ID\" while a number is recorded is never written; the list says to correct one", w1.status === 200 && w2.status === 200 && clash?.reason === "needs an answer" && /answered No, but .* is recorded: correct one/.test(clash?.why ?? ""), { w1: w1.status, w2: w2.status, clash });
  }

  ok("B52/QA-227: no paid call (the spend ledger is unchanged)", ledger() === before);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
