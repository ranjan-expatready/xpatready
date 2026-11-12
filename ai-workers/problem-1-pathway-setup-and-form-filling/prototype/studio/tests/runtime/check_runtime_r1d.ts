// R1d checks (runtime lane, plan §8 RT-13…RT-17): a case's IMM 5257 filled from declared and confirmed answers (P-411; was confirmed facts only, P-72), through the
// shared filler (read back, signatures checked); a new copy only when the officer asks; out of date and stale after a
// fact changes; a locked copy never changes (service and database); audit without values. Every rule with a passing and
// a failing case, on an isolated copy where setup_visitor_visa.ts released the visitor visa. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
//   tsx studio/tests/runtime/check_runtime_r1d.ts 4430 xr_studio_runtime_r1
import { asValidated } from "./validated.ts"; // QA-165: the form's own Validate result, not bytes appended
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { request } from "node:http";
import { join } from "node:path";
import { client, recorder } from "./api.ts";
import { trialFor, readTrials } from "../../api/src/fill-trials.ts";

const PORT = Number(process.argv[2] ?? 4430), DB = process.argv[3] ?? "xr_studio_runtime_r1";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", CLIENT_B = "user-Q", AUTHOR = "user-A";
const ROOT = join(import.meta.dirname, "..", "..", "..", "..", "..", "..");
const STUDIO = join(import.meta.dirname, "..", "..");
const run = Date.now().toString(36);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const bytes = (path: string, actor: string) => new Promise<{ status: number; body: Buffer; name: string }>((resolve, reject) => {
  const req = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, headers: { "x-actor": actor }, agent: false }, (res) => { const c: Buffer[] = []; res.on("data", (x: Buffer) => c.push(x)); res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(c), name: /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? "" })); });
  req.on("error", reject); req.end();
});
type Copy = { id: string; status: string; locked: { kind: string } | null; validated?: { current: boolean; words: string } | null; out_of_date: boolean; stale: boolean; changed: string[]; counts: { written: number; not_written: number } | null; intact: boolean | null; file_ok: boolean };
type Q = { subjectId: string; fact: string; value_type: string; shape: { datePrecision: string; phone: boolean }; options: { key: string }[] | null; required: boolean; hidden: boolean; group: string | null; fills: { form: string; person: string }[]; answer: { confirmed: boolean } | null };
type Form = { form: string; subject_id: string; applies: boolean; person: string; draft: { written_now: number; mapped: number; to_fix: number }; readiness: { ready: boolean; missing: { fact: string; reason: string }[] }; copies: Copy[] };

async function main() {
  const vv = sql("select id from combination where combination_key='vv.single'");
  if (!vv) { console.log("Run setup_visitor_visa.ts first."); process.exitCode = 2; return; }
  const open = async (ref: string) => (await call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: CLIENT, principal: { displayName: "Sample Applicant D" } }, OFFICER)).body;
  const c = await open(`R1D-${run}`), caseId: string = c.id;
  const P: string = c.people.find((p: { role: string }) => p.role === "principal").subject_id;
  const caseSubject: string = c.people.find((p: { role: string }) => p.role === "case").subject_id;
  const spouse = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse D" }, OFFICER)).body.subject_id as string;
  const agent = async () => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body;
  const answer = async (subject: string, fact: string, value: unknown, actor = OFFICER) => {
    const v = await agent(); const q = v.sections.flatMap((s: { questions: { subjectId: string; fact: string; answer: { id: string } | null }[] }) => s.questions).find((x: { subjectId: string; fact: string }) => x.subjectId === subject && x.fact === fact);
    return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId: q?.answer?.id ?? null }, actor);
  };
  // P-244 (B140): a background answer the officer recorded waits for the client; the client re-confirms it (as on their questionnaire, "This is right") before the officer confirms the section.
  type Ans = { id: string; awaits_client?: boolean } | null;
  const reconfirm = async (subject: string) => { for (const s of (await agent()).sections.filter((x: { subjectId: string }) => x.subjectId === subject)) for (const q of s.questions as { answer: Ans; rows: { answer: Ans }[] }[]) for (const a of [q.answer, ...q.rows.map((r) => r.answer)]) if (a?.awaits_client) await call("POST", `/runtime/cases/${caseId}/answers/${a.id}/reconfirm`, {}, CLIENT); };
  const confirmAll = async (subject: string) => { await reconfirm(subject); const v = await agent(); for (const s of v.sections.filter((x: { subjectId: string }) => x.subjectId === subject)) { const seen = [...s.questions.flatMap((q: { answer: { id: string } | null; rows: { answer: { id: string } | null }[] }) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter(Boolean); if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${s.section}/confirm`, { subjectId: subject, seen }, OFFICER); } };
  for (const [s, f, v] of [[P, "person.family_name", "SAMPLED"], [P, "person.given_names", "APPLICANT"], [P, "person.date_of_birth", "1990-04-13"], [P, "person.passport_number", "SAMPLEP123"], [spouse, "person.family_name", "SAMPLES"], [spouse, "person.date_of_birth", "1991-05-14"]] as const) await answer(s, f, v);
  await confirmAll(P); await confirmAll(spouse);
  await answer(P, "person.other_family_name", "SAMPLE-UNCONFIRMED", CLIENT); // a client field the client answered: counts as confirmed (principal)
  await answer(spouse, "person.marital_status", "married", CLIENT);          // the principal for an adult spouse: not confirmed (P-78), fills at once (P-411)
  const forms = async (actor = OFFICER) => call("GET", `/runtime/cases/${caseId}/forms`, undefined, actor);
  const formOf = async (form: string, subject: string): Promise<Form> => (await forms()).body.forms.find((f: Form) => f.form === form && f.subject_id === subject);

  // ── RT-12 roles on forms
  ok("roles fail: the client, another client and configuration people cannot see or make copies (403/404); a malformed id is 404", (await forms(CLIENT)).status === 403 && (await forms(CLIENT_B)).status === 403 && (await forms(AUTHOR)).status === 403
    && (await call("GET", "/runtime/cases/not-a-case/forms", undefined, OFFICER)).status === 404 && (await call("GET", "/runtime/form-copies/abc", undefined, OFFICER)).status === 404);
  ok("roles fail: the client cannot generate a copy (403)", (await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, {}, CLIENT)).status === 403);

  // ── RT-13 generate: confirmed facts only, through the shared filler, as a job
  let f = await formOf("IMM 5257", P);
  ok("RT-13 pass: the draft says how many form fields a copy made now writes, from confirmed facts only", !!f && f.draft.written_now >= 4 && f.draft.mapped > f.draft.written_now, f?.draft);
  let r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-1` }, OFFICER);
  ok("RT-13 pass: generating is a job: accepted (202) and queued, not written inside the request", r.status === 202 && r.body.status === "QUEUED", r.body);
  const first: string = r.body.id;
  const done = (id: string) => until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${id}`, undefined, OFFICER)).body?.status));
  ok("RT-13 pass: the copy is generated, read back and checked (intact)", await done(first) && (await call("GET", `/runtime/form-copies/${first}`, undefined, OFFICER)).body.intact === true);
  const row = JSON.parse(sql(`select json_build_object('path', path, 'sha', sha256, 'result', result_json, 'facts', (select facts_json from answer_snapshot where id = snapshot_id)) from form_instance where id='${first}'`));
  const written = (row.result.boxes as { fact: string | null; result: string }[]).filter((b) => b.result === "written").map((b) => b.fact);
  // C7.2 cause 3: a "lived elsewhere?" or "education?" Yes/No is written "N" from a confirmed "none apply" (a group answer,
  // kept with the copy's groups), not from a fact: those boxes say so, and every other written box is a confirmed fact.
  // Review of #414 m1: found by the copy's own flag, and each one is an "N" whose fact the copy did not read.
  const noneBoxes = (row.result.boxes as { box: string; fact: string | null; result: string; nothing_recorded?: true }[]).filter((b) => b.result === "written" && b.nothing_recorded);
  const readFacts = new Set((row.facts.facts as { box: string }[]).map((f) => f.box));
  const req = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "..", "..", row.path.replace(/\.pdf$/, ".request.json")), "utf8")).values as Record<string, string>;
  const fromNone = noneBoxes.every((b) => req[b.box] === "N" && !readFacts.has(b.box)) ? noneBoxes.length : -1;
  ok("RT-13 pass: exactly the confirmed facts were written (principal's names, birth date, passport; the application's facts), plus any Yes/No from a confirmed \"none apply\"", ["person.family_name", "person.given_names", "person.date_of_birth", "person.passport_number"].every((x) => written.includes(x)) && row.facts.facts.length === row.result.counts.written - fromNone + row.result.counts.by_hand + row.result.counts.blank, { written: written.length, fromNone, facts: row.facts.facts.length });
  { // P-411 (1), row B150 (before: P-72 kept it out of the copy until confirmed).
    const sf = await formOf("IMM 5257", spouse);
    ok("RT-13 pass (P-411 (1)): the spouse's marital status answered by the principal fills the spouse's copy at once (nothing answered is left blank to confirm)", sf.draft.to_fix === 0 && sf.draft.written_now > 0, sf.draft);
    ok("RT-13 fail (P-411 (1)): it is still not confirmed: the spouse's IMM 5257 lists it \"not confirmed\" before filing", sf.readiness.missing.some((m: { fact: string; reason: string }) => m.fact === "person.marital_status" && m.reason === "not confirmed"), sf.readiness.missing);
  }
  ok("RT-13 pass: the file on disk is the one recorded (sha256), and only the officer downloads it", await (async () => { const d = await bytes(`/runtime/form-copies/${first}/file`, OFFICER); return d.status === 200 && sha(d.body) === row.sha && sha(readFileSync(join(ROOT, row.path))) === row.sha && d.body.subarray(0, 5).toString() === "%PDF-"; })() && (await bytes(`/runtime/form-copies/${first}/file`, CLIENT)).status === 403);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-1` }, OFFICER);
  ok("RT-13 pass: the same key again answers with the same copy (nothing new)", r.body.id === first && r.body.created === false && sql(`select count(*) from form_instance where case_id='${caseId}'`) === "1");
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${spouse}/generate`, { idempotencyKey: `gen-${run}-1` }, OFFICER);
  ok("RT-13 fail: the same key for another person is refused (409)", r.status === 409, r.body?.detail);
  const twice = await Promise.all([0, 1].map(() => call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${spouse}/generate`, { idempotencyKey: `gen-${run}-2` }, OFFICER)));
  ok("RT-13 pass: two simultaneous presses with one key make one copy", twice.every((x) => x.status === 202 && x.body.id === twice[0].body.id) && sql(`select count(*) from form_instance where case_id='${caseId}' and subject_id='${spouse}'`) === "1", twice.map((x) => x.status));
  const spouseCopy: string = twice[0].body.id; await done(spouseCopy);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%209999/${P}/generate`, {}, OFFICER);
  ok("RT-13 fail: a form with no PDF in the case's release is refused (404), nothing queued", r.status === 404, r.body?.detail);

  // ── RT-14 ready to file (P-71)
  f = await formOf("IMM 5257", P);
  ok("RT-14 fail: with required facts unconfirmed, IMM 5257 is not ready to file and they are listed", !f.readiness.ready && f.readiness.missing.length > 0, f.readiness.missing.length);

  // ── Lead answer to break M3 (P-71/P-72): a required repeating group with no entries blocks until "none apply" is
  // answered and confirmed for it; "none apply" is a fact like any other.
  type G = { subjectId: string; section: string; group: { required: boolean; client: boolean; rows: number; none_apply: { id: string; value: boolean; confirmed: boolean; status: string } | null } | null };
  const blockedGroups = (x: Form) => x.readiness.missing.filter((m) => m.fact.startsWith("group:")).map((m) => m.fact.slice(6));
  const groupsP = blockedGroups(f);
  ok("M3 fail: IMM 5257 for the principal is blocked by its required groups with no entries, each named and \"not answered\"", groupsP.length >= 2 && f.readiness.missing.filter((m) => m.fact.startsWith("group:")).every((m) => m.reason === "not answered"), groupsP);
  const sqrGroups = async (actor = CLIENT): Promise<G[]> => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, actor)).body.sections as G[]).filter((x) => x.subjectId === P && x.group);
  const gc = (await sqrGroups()).find((x) => groupsP.includes(x.section) && x.group!.client)!.section;
  const put = (g: string, noneApply: boolean, expectedId: string | null, actor = CLIENT, subject = P) => call("PUT", `/runtime/cases/${caseId}/groups/${subject}/${g}/none-apply`, { noneApply, expectedId }, actor);
  r = await put(gc, true, null);
  ok("M3 pass (P-72, P-242): the principal says none apply on their own questionnaire; it is Declared and needs no officer confirmation", r.status === 200 && r.body.saved === true && r.body.group?.none_apply?.value === true && r.body.group.none_apply.confirmed === true, r.body);
  const naId: string = r.body.group?.none_apply?.id;
  r = await put(gc, true, naId);
  ok("M3 pass: the same answer again saves nothing new", r.status === 200 && r.body.saved === false && sql(`select count(*) from client_group_answer where subject_id='${P}' and group_key='${gc}'`) === "1", r.body);
  r = await put(gc, false, null);
  ok("M3 fail: an answer based on an older view (expectedId) is refused (409), nothing saved", r.status === 409 && /same moment/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: gc }, CLIENT);
  ok("M3 fail: an entry is not added beside \"none apply\" (409, change it first)", r.status === 409 && /change it to "entries apply" first/.test(r.body?.detail ?? ""), r.body?.detail);
  f = await formOf("IMM 5257", P);
  ok("M3 pass: with none apply confirmed, that group no longer blocks IMM 5257; the others still do", !blockedGroups(f).includes(gc) && blockedGroups(f).length === groupsP.length - 1, blockedGroups(f));
  // Entries apply after all: the change back is a new version; entries may be added; none apply is refused beside them.
  r = await put(gc, false, naId);
  const back: string = r.body.group?.none_apply?.id;
  const entry = await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: gc }, CLIENT);
  r = await put(gc, true, back);
  ok("M3 pass/fail: \"entries apply\" is saved as a new version; an entry can then be added, and none apply is refused while it exists (409)", !!back && back !== naId && entry.status === 201 && r.status === 409 && /has 1 entry; remove it first/.test(r.body?.detail ?? ""), { back: !!back, row: entry.status, again: r.body?.detail });
  await call("DELETE", `/runtime/cases/${caseId}/groups/${P}/rows/${entry.body.row}`, undefined, CLIENT);
  r = await put(gc, true, back);
  ok("M3 pass: with the entry removed, none apply is said again (history kept: three versions)", r.status === 200 && r.body.group?.none_apply?.value === true && sql(`select count(*) from client_group_answer where subject_id='${P}' and group_key='${gc}'`) === "3", r.body?.detail ?? r.status);
  // The officer's "none apply" waits for Confirm section, and is confirmed only when seen (never unseen).
  // QA-439: another of the principal's own groups (the list also names the application's, e.g. "Your visit", which comes
  // first now that the application's parts lead the questionnaire; it is not the principal's to answer).
  const go = f.readiness.missing.filter((m) => m.fact.startsWith("group:") && (m as { subject?: string }).subject === P).map((m) => m.fact.slice(6)).find((x) => x !== gc)!;
  r = await put(go, true, null, OFFICER);
  const goId: string = r.body.group?.none_apply?.id;
  f = await formOf("IMM 5257", P);
  ok("M3 fail (P-72): none apply entered by the officer is \"not confirmed\" until Confirm section", r.body.group?.none_apply?.confirmed === false && f.readiness.missing.some((m) => m.fact === `group:${go}` && m.reason === "not confirmed"), f.readiness.missing.filter((m) => m.fact.startsWith("group:")));
  r = await call("POST", `/runtime/cases/${caseId}/sections/${go}/confirm`, { subjectId: P, seen: [] }, OFFICER);
  ok("M3 fail: Confirm section without having seen the group's answer is refused (409) and names it", r.status === 409 && (r.body?.changed ?? []).includes(`group:${go}`), r.body);
  r = await call("POST", `/runtime/cases/${caseId}/sections/${go}/confirm`, { subjectId: P, seen: [goId] }, OFFICER);
  f = await formOf("IMM 5257", P);
  ok("M3 pass: with it seen, Confirm section confirms it (VERIFIED, a new version) and the group no longer blocks", r.status === 201 && r.body.confirmed >= 1 && !blockedGroups(f).includes(go) && sql(`select status from client_group_answer where subject_id='${P}' and group_key='${go}' and superseded_by_id is null`) === "VERIFIED", r.body);
  // Refusals in plain words, and the database rule.
  const bad = await put(gc, "yes" as unknown as boolean, null);
  const otherClient = await put(gc, true, null, CLIENT_B), noGroup = await put("no_such_group", true, null), caseGroup = await put(groupsP.find((g) => g === "your_visit") ?? gc, true, null, OFFICER);
  ok("M3 fail: a body that is not true or false is a 400 in plain words; another client cannot reach the case (404, as every case route); no such group 404; a group of the application asked for a person 422",
    bad.status === 400 && /none apply \(true\) or entries apply \(false\)/.test(JSON.stringify(bad.body)) && otherClient.status === 404 && noGroup.status === 404 && /no repeating group/.test(noGroup.body?.detail ?? "") && (!groupsP.includes("your_visit") || caseGroup.status === 422), { bad: bad.status, otherClient: otherClient.status, noGroup: noGroup.body?.detail, caseGroup: caseGroup.status });
  ok("M3 fail (database): a group answer is never changed in place", (() => { try { sql(`update client_group_answer set none_apply = false where subject_id='${P}' and group_key='${go}'`); return false; } catch (e) { return /append_only/.test((e as Error).message); } })());
  // P-78 (review m7): the principal's "none apply" for the adult spouse is "answered by the principal", not confirmed.
  const spouseGroup = ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, CLIENT)).body.sections as G[]).find((x) => x.subjectId === spouse && x.group?.client && x.group.rows === 0)!;
  r = await put(spouseGroup.section, true, null, CLIENT, spouse);
  ok("review m7 pass (P-78): the principal says none apply for the adult spouse: saved, \"answered by the principal\", not confirmed", r.status === 200 && r.body.group?.none_apply?.confirmed === false && /principal/.test(r.body.group?.none_apply?.why ?? ""), r.body?.group?.none_apply);
  // review m6: with entries, the group's earlier "entries apply" answers nothing; Confirm section neither needs nor confirms it.
  const withEntry = (await sqrGroups()).find((x) => x.section !== gc && x.section !== go && x.group!.rows === 0)!.section;
  const na1 = await put(withEntry, true, null, OFFICER);
  const ea = await put(withEntry, false, na1.body.group?.none_apply?.id ?? null, OFFICER);
  const e1 = await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: withEntry }, OFFICER);
  r = await call("POST", `/runtime/cases/${caseId}/sections/${withEntry}/confirm`, { subjectId: P, seen: [] }, OFFICER);
  const r2 = await call("POST", `/runtime/cases/${caseId}/sections/${withEntry}/confirm`, { subjectId: P, seen: [ea.body.group?.none_apply?.id] }, OFFICER);
  ok("review m6 pass: with an entry in the group, Confirm section neither asks for the hidden \"entries apply\" answer nor refuses it when sent; it stays as it was", ea.status === 200 && ea.body.saved === true && e1.status === 201 && r.status === 201 && r2.status === 201 && sql(`select status from client_group_answer where subject_id='${P}' and group_key='${withEntry}' and superseded_by_id is null`) === "DECLARED", r.body?.detail ?? r.body);
  await call("DELETE", `/runtime/cases/${caseId}/groups/${P}/rows/${e1.body.row}`, undefined, OFFICER);
  ok("M3 pass: the audit records none apply without names or values", /recorded that no entries apply in /.test(sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity = 'group'`)));

  // ── P-71 (Lead, R1d early look): a copy is locked only when its form is ready to file (a copy made now: the
  // first one is out of date after the groups above changed)
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-p71` }, OFFICER);
  const p71: string = r.body.id; await done(p71);
  r = await call("POST", `/runtime/form-copies/${p71}/lock`, { kind: "filed" }, OFFICER);
  ok("P-71 fail: a copy of a form not ready to file cannot be filed or locked (409), with the reason", r.status === 409 && /facts? to answer or confirm before filing: do that, then generate a new copy/.test(r.body?.detail ?? ""), r.body?.detail);
  // Confirm every required fact IMM 5257 reads for the principal (Sample values by type), then make a new copy.
  const sample = (q: { value_type: string; shape: { datePrecision: string; phone: boolean }; options: { key: string }[] | null; fact: string }) => q.options?.length ? q.options[0].key : q.shape.phone ? { country_code: "1", number: "5550100" }
    : q.value_type === "yes_no" ? false : q.value_type === "date" ? (q.shape.datePrecision === "month" ? "1990-01" : "1990-01-01") : q.value_type === "number" ? "1000"
    : q.value_type === "address" ? { street_name: "Sample Road", city: "Sample City", country: "Canada" } : /email/.test(q.fact) ? "client.d@example.com" : "SAMPLE";
  // QA-165 (#1318): readiness also lists the mandatory boxes a copy would leave empty ("left empty on the form"); this fixture's
  // Sample answers ("SAMPLE" where a box wants a code) leave some, and they hold no lock back (blocksLock). Facts done = none else.
  const factsDone = (f: { readiness: { missing: { reason: string }[] } }) => f.readiness.missing.every((m) => m.reason === "left empty on the form");
  const makeReady = async (subject: string, form: string) => {
    for (let pass = 0; pass < 3; pass++) {
      const f0 = await formOf(form, subject); if (factsDone(f0)) return true;
      const v = await agent();
      const todo = v.sections.flatMap((x: { questions: Q[] }) => x.questions).filter((q: Q) => q.required && !q.hidden && !q.group && q.fills.some((x) => x.form === form && x.person === f0.person) && !q.answer?.confirmed);
      for (const q of todo) await answer(q.subjectId, q.fact, sample(q));
      // A required group with no entries (Lead, break M3): "none apply", then Confirm section.
      const groups = f0.readiness.missing.filter((m) => m.fact.startsWith("group:")).map((m) => m.fact.slice(6));
      // A group asked once for the application (the visit) is answered for the case, not the person.
      const secs = groups.map((g) => v.sections.find((x: { subjectId: string; section: string; group: unknown }) => x.section === g && x.group && (x.subjectId === subject || x.subjectId === caseSubject)));
      for (const sec of secs) if (sec) await call("PUT", `/runtime/cases/${caseId}/groups/${sec.subjectId}/${sec.section}/none-apply`, { noneApply: true, expectedId: sec.group?.none_apply?.id ?? null }, OFFICER);
      for (const subj of [...new Set([...todo.map((q: Q) => q.subjectId), ...secs.filter(Boolean).map((x: { subjectId: string }) => x.subjectId)])] as string[]) await confirmAll(subj);
    }
    return factsDone(await formOf(form, subject));
  };
  ok("P-71 pass: with every required fact confirmed, IMM 5257 for the principal waits on no fact (QA-165, #1318: only on mandatory boxes this fixture's Sample answers leave empty, which hold no lock back)", await makeReady(P, "IMM 5257"));
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-ready` }, OFFICER);
  const locked1: string = r.body.id; await done(locked1);
  const row1 = JSON.parse(sql(`select json_build_object('path', path, 'sha', sha256) from form_instance where id='${locked1}'`));
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${spouse}/generate`, { idempotencyKey: `gen-${run}-spouse2` }, OFFICER);
  const spouse2: string = r.body.id; await done(spouse2);

  // ── RT-16 lock, before anything changes
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "filed" }, CLIENT);
  ok("RT-16 fail: the client cannot lock a copy (403)", r.status === 403, r.status);
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "printed" }, OFFICER);
  ok("RT-16 fail: an unknown lock kind is a 400 in plain words", r.status === 400 && /validated copy uploaded back, or filed/.test(r.body?.detail ?? ""), r.body?.detail);
  // ── W1-10 slice 1 C-9 (P-144, P-171 (1)): IMM 5257 is a barcode form on a PDF upload line: Validate is the last step.
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "validated_copy_uploaded" }, OFFICER);
  ok("C11.6 C-9 fail: a barcode form with no validated copy read back is not filed or uploaded (409, in words)", r.status === 409 && /Validate it in Adobe/.test(r.body?.detail ?? ""), r.body?.detail);
  const sendValidated = async (copy: string, file: Buffer, name: string, actor = OFFICER) => {
    const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(file)]), name);
    const path = `/runtime/form-copies/${copy}/validated`; // POST, multipart: the one validated PDF
    const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": actor }, body: fd });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const copyFile = readFileSync(join(ROOT, row1.path));
  // Break M1: Adobe's Validate adds the barcode and saves, so the validated file never has the copy's bytes. QA-165:
  // simulated by writing the form's own Validate result into the copy (the values stay as written); the unchanged copy is
  // refused, and so is a changed file whose own result does not say Validate passed.
  const validatedFile = asValidated(copyFile);
  // Nothing recorded = no validated_copy row and no file kept (fill-case.ts names the file by the sent bytes' checksum,
  // in this isolated copy's var folder, tools/isolated.sh VARDIR).
  const caseVar = join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`, "workspaces", "demo", "cases", caseId, "validated");
  const keptNoFile = (sent: Buffer) => existsSync(join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`)) && (!existsSync(caseVar) || !readdirSync(caseVar).some((f) => f.includes(sha(sent).slice(0, 12))));
  const refusedAsUnvalidated = (x: { status: number; body: { detail?: string } | null }, sent: Buffer) => x.status === 422 && /Validate has not (passed|finished)/.test(x.body?.detail ?? "") && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "0" && keptNoFile(sent);
  let sent = Buffer.concat([copyFile, Buffer.from("\n% Saved after Validate (simulated in this check)\n")]);
  r = await sendValidated(locked1, sent, "imm5257-validated.pdf");
  ok("QA-165 fail: a copy with bytes appended but no Validate result of the form's own (qa's golden journey 1) is not taken as validated (422), nothing recorded, no file kept", refusedAsUnvalidated(r, sent), r.body?.detail);
  r = await sendValidated(locked1, sent = asValidated(copyFile, "No"), "imm5257-validated.pdf");
  ok("QA-165 fail: the form's own mark says No (Validate found it incomplete): refused in words naming the mark, nothing recorded, no file kept", refusedAsUnvalidated(r, sent) && /"No"/.test(r.body?.detail ?? "") && !/date last validated/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await sendValidated(locked1, sent = asValidated(copyFile, "Yes", false), "imm5257-validated.pdf");
  ok("QA-165 fail: the mark says Yes but the form kept no date last validated (its script sets both): refused, nothing recorded, no file kept", refusedAsUnvalidated(r, sent) && /has not finished/.test(r.body?.detail ?? "") && /no date last validated/.test(r.body?.detail ?? "") && !/has not passed/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/form-copies/${locked1}/validated`, {}, OFFICER);
  ok("C11.6 C-9 fail: sending no file is refused in words (400), nothing recorded", r.status === 400 && /validated PDF/.test(r.body?.detail ?? "") && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "0", r.body?.detail);
  r = await sendValidated(locked1, Buffer.from("not a pdf"), "notes.txt");
  ok("C11.6 C-9 fail: a file that is not the validated PDF is refused and nothing is recorded", r.status === 422 && /not a PDF/.test(r.body?.detail ?? "") && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "0", r.body?.detail);
  r = await sendValidated(locked1, readFileSync(join(ROOT, "ai-workers", "problem-1-pathway-setup-and-form-filling", "official-sources", "ircc", "forms", "imm5257e.pdf")), "imm5257e.pdf");
  ok("C11.6 C-9 fail: IRCC's blank form (none of the copy's values) does not read back, nothing recorded", r.status === 422 && /values the product wrote differ|could not be read/.test(r.body?.detail ?? "") && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "0", r.body?.detail);
  ok("C11.6 C-9 QA-127 fail-guard: a file that does not read back names the values in the form's words, never a field path", !/form1\[|\[0\]\./.test(r.body?.detail ?? "") && (!/values the product wrote differ/.test(r.body?.detail ?? "") || /should say /.test(r.body?.detail ?? "")), r.body?.detail);
  // QA-126: this upload takes one PDF of up to 20 MB; the refusals say so (they said the intake's 25 MB and 20 files).
  r = await sendValidated(locked1, Buffer.concat([validatedFile, Buffer.alloc(20 * 1024 * 1024)]), "imm5257-validated.pdf");
  ok("C11.6 C-9 QA-126 fail: a validated copy over 20 MB is refused with this upload's own limit (413, \"20 MB\", never the intake's 25 MB), nothing recorded", r.status === 413 && /larger than 20 MB/.test(r.body?.detail ?? "") && !/25 MB/.test(r.body?.detail ?? "") && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "0", r.body?.detail);
  {
    const fd = new FormData(); for (const n of ["a.pdf", "b.pdf"]) fd.append("file", new Blob([new Uint8Array(validatedFile)]), n);
    const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-copies/${locked1}/validated`, { method: "POST", headers: { "x-actor": OFFICER }, body: fd });
    const detail = ((await res.json().catch(() => null)) as { detail?: string } | null)?.detail ?? "";
    ok("C11.6 C-9 QA-126 fail: two files at once are refused as \"only the one validated PDF\" (never \"at most 20 files\"), nothing recorded", res.status === 413 && /only the one validated PDF/.test(detail) && !/20 files/.test(detail) && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "0", `${res.status} ${detail}`);
  }
  // QA-127: one value changed after Validate is refused, naming that value (the form's words), what the copy wrote and what the file holds.
  {
    const changedPdf = join(tmpdir(), `qa127-${run}.pdf`);
    const py = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
    const one = JSON.parse(execFileSync(py, ["-I", join(STUDIO, "tests", "fixtures", "change_one_value.py"), join(ROOT, row1.path), join(ROOT, row1.path.replace(/\.pdf$/, ".request.json")), changedPdf], { encoding: "utf8" }).trim().split("\n").pop()!) as { path: string; wrote: string; now: string };
    const boxes = JSON.parse(sql(`select s.facts_json->'boxes' from form_instance x join answer_snapshot s on s.id = x.snapshot_id where x.id='${locked1}'`)) as { box: string; caption?: string; meaning?: string }[];
    const words = (boxes.find((b) => b.box === one.path)?.caption || boxes.find((b) => b.box === one.path)?.meaning || "").trim();
    r = await sendValidated(locked1, readFileSync(changedPdf), "imm5257-validated.pdf"); rmSync(changedPdf, { force: true });
    const d = r.body?.detail ?? "";
    ok("C11.6 C-9 QA-127 pass: one value changed after Validate is refused (422) and the refusal names it, with what the copy wrote and what the file holds", r.status === 422 && /1 of the \d+ values/.test(d) && /The value that differs: /.test(d) && words.length > 0 && d.includes(`"${words.slice(0, 80)}"`) && d.includes(`should say "${one.wrote.slice(0, 60)}" but says "${one.now}"`) && !d.includes(one.path), `${words} | ${d}`);
    ok("C11.6 C-9 QA-127: nothing is recorded for it", sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "0");
  }
  r = await sendValidated(locked1, copyFile, "imm5257-validated.pdf");
  ok("C11.6 C-9 fail (break M1): the product's own copy sent back unchanged is not validated: refused in words (422) and nothing recorded", r.status === 422 && /unchanged: it was not validated/.test(r.body?.detail ?? "") && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "0", r.body?.detail);
  r = await sendValidated(locked1, validatedFile, "imm5257-validated.pdf", CLIENT);
  ok("C11.6 C-9 fail: the client cannot send a validated copy (officer only)", r.status === 403, r.status);
  // QA-128 (P-65, kept once): the same validated file sent twice at once (a double click) is kept once, with one audit line.
  const auditBefore = Number(sql(`select count(*) from audit_event where summary like '%read back a validated copy%'`));
  const doubleSend = await Promise.all([sendValidated(locked1, validatedFile, "imm5257-validated.pdf"), sendValidated(locked1, validatedFile, "imm5257-validated.pdf")]);
  r = doubleSend.find((x) => x.status === 201) ?? doubleSend[0];
  const other = doubleSend.find((x) => x !== r)!;
  ok("C11.6 C-9 QA-128 fail: the same validated file sent twice at once is kept once: one answers 201, the other 409 in words naming the kept one; one validated copy and one audit line", doubleSend.filter((x) => x.status === 201).length === 1 && other.status === 409 && /already read back and kept/.test(other.body?.detail ?? "") && other.body?.existingId === r.body?.id
    && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === "1" && Number(sql(`select count(*) from audit_event where summary like '%read back a validated copy%'`)) === auditBefore + 1, doubleSend.map((x) => `${x.status} ${x.body?.detail ?? x.body?.id ?? ""}`));
  ok("C11.6 C-9 pass: the validated and saved copy reads back with every value the product wrote; its checksum and the facts' fingerprint are kept", r.status === 201 && r.body?.copy?.validated?.current === true && r.body.copy.validated.read_back.equal === r.body.copy.validated.read_back.written && r.body.copy.validated.read_back.written > 0
    && sql(`select sha256 from validated_copy where form_instance_id='${locked1}'`) === sha(validatedFile), r.body);
  // C-9 (Devin on PR #121): the copy marked ready for filing downloads in its validated form, checked like the copy.
  const vPath = join(ROOT, sql(`select path from validated_copy where form_instance_id='${locked1}'`));
  let d = await bytes(`/runtime/form-copies/${locked1}/file`, OFFICER);
  ok("C11.6 C-9 pass: a barcode form with a current validated copy downloads the validated file (its recorded checksum, named validated), not the generated copy", d.status === 200 && sha(d.body) === sha(validatedFile) && sha(d.body) !== row1.sha && /^IMM5257-validated-/.test(d.name), d.name);
  d = await bytes(`/runtime/form-copies/${locked1}/file?original=1`, OFFICER);
  ok("C11.6 C-9 pass: the original generated copy stays downloadable on its own (?original=1)", d.status === 200 && sha(d.body) === row1.sha && /^IMM5257-copy-/.test(d.name), d.name);
  ok("C11.6 C-9 fail: the client cannot download the validated file (officer only)", (await bytes(`/runtime/form-copies/${locked1}/file`, CLIENT)).status === 403);
  appendFileSync(vPath, "% changed on disk\n");
  d = await bytes(`/runtime/form-copies/${locked1}/file`, OFFICER);
  ok("C11.6 C-9 fail: a validated file changed on disk since it was read back is refused (409, in words), never swapped for the unbarcoded copy", d.status === 409 && /validated file changed on disk/.test(d.body.toString()), d.body.toString());
  writeFileSync(vPath, validatedFile);
  renameSync(vPath, `${vPath}.away`);
  d = await bytes(`/runtime/form-copies/${locked1}/file`, OFFICER);
  ok("C11.6 C-9 fail: a missing validated file is a 404 in words, not the generated copy", d.status === 404 && /validated file is missing/.test(d.body.toString()), d.body.toString());
  const vOutside = join(tmpdir(), `validated-${run}.pdf`); copyFileSync(`${vPath}.away`, vOutside); symlinkSync(vOutside, vPath);
  d = await bytes(`/runtime/form-copies/${locked1}/file`, OFFICER);
  ok("C11.6 C-9 fail: a validated file that lies outside the working files (a link out, same bytes) is not handed over (409, in words)", d.status === 409 && /validated file is not in the working files/.test(d.body.toString()), d.body.toString());
  rmSync(vPath); rmSync(vOutside);
  renameSync(`${vPath}.away`, vPath);
  ok("C11.6 C-9 pass: with its file back, the validated copy downloads again", sha((await bytes(`/runtime/form-copies/${locked1}/file`, OFFICER)).body) === sha(validatedFile));
  // QA-165 (Devin on #572): a validated copy read back before QA-165 kept no result of the form's own Validate. Such a
  // row never counts: not current on the copy, not lockable, and the download is the product's copy, not that file. The
  // table is append-only (trg_validated_copy_guard), so the old row is added as the latest one, then a passing one after it.
  {
    const again = (keep: string) => sql(`insert into validated_copy (id, workspace_id, form_instance_id, path, sha256, facts_hash, read_back, read_by, read_at)
      select gen_random_uuid(), workspace_id, form_instance_id, path, sha256, facts_hash, ${keep}, read_by, now() from validated_copy where form_instance_id='${locked1}' order by read_at limit 1`);
    again("read_back - 'validation'");
    const view = (await call("GET", `/runtime/form-copies/${locked1}`, undefined, OFFICER)).body as Copy | undefined;
    ok("QA-165 fail (Devin on #572): a validated copy read back before the form's own result was checked is not current, and says to send the validated file again", view?.validated?.current === false && /send the file you validated in Adobe again/.test(view?.validated?.words ?? ""), view?.validated);
    const lk = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "validated_copy_uploaded" }, OFFICER);
    ok("QA-165 fail (Devin on #572): such a copy cannot be locked for filing (409, in words), nothing locked", lk.status === 409 && /before the form's own Validate result was checked/.test(lk.body?.detail ?? "") && sql(`select locked_at is null from form_instance where id='${locked1}'`) === "t", lk.body?.detail);
    const dl = await bytes(`/runtime/form-copies/${locked1}/file`, OFFICER);
    ok("QA-165 fail (Devin on #572): such a copy's file is not handed out as the validated one (the product's copy instead)", dl.status === 200 && sha(dl.body) === row1.sha && sha(dl.body) !== sha(validatedFile), dl.name);
    // Break M2 on #572: re-sending the file of a kept row that does not pass (an old row's: bytes changed, no result of the
    // form's own) is refused, and the kept file stays as it was: the upload is read under its own pending name.
    const oldFile = asValidated(copyFile, "none"), oldSha = sha(oldFile);
    const oldPath = join(caseVar, `IMM5257-${locked1.slice(0, 8)}-${oldSha.slice(0, 12)}.pdf`);
    writeFileSync(oldPath, oldFile);
    sql(`insert into validated_copy (id, workspace_id, form_instance_id, path, sha256, facts_hash, read_back, read_by, read_at)
      select gen_random_uuid(), workspace_id, form_instance_id, '${oldPath.replace(`${ROOT}/`, "")}', '${oldSha}', facts_hash, read_back - 'validation', read_by, now() from validated_copy where form_instance_id='${locked1}' order by read_at limit 1`);
    const re = await sendValidated(locked1, oldFile, "imm5257-validated.pdf");
    ok("QA-165 fail (break M2 on #572): re-sending a kept file that does not pass is refused (422) and the kept file is still there, unchanged; no pending file left", re.status === 422 && existsSync(oldPath) && sha(readFileSync(oldPath)) === oldSha && !readdirSync(caseVar).some((f) => f.endsWith(".pending")), re.body?.detail);
    // Break M1 on #572: doing what the words say (send the validated file again) works when that file passes: a file kept
    // before QA-165 is not "already read back", it is read back and recorded, and the copy is current again.
    const ouiFile = asValidated(copyFile, "Oui"), ouiSha = sha(ouiFile);
    const ouiPath = join(caseVar, `IMM5257-${locked1.slice(0, 8)}-${ouiSha.slice(0, 12)}.pdf`);
    writeFileSync(ouiPath, ouiFile);
    sql(`insert into validated_copy (id, workspace_id, form_instance_id, path, sha256, facts_hash, read_back, read_by, read_at)
      select gen_random_uuid(), workspace_id, form_instance_id, '${ouiPath.replace(`${ROOT}/`, "")}', '${ouiSha}', facts_hash, read_back - 'validation', read_by, now() from validated_copy where form_instance_id='${locked1}' order by read_at limit 1`);
    const stuck = (await call("GET", `/runtime/form-copies/${locked1}`, undefined, OFFICER)).body?.validated?.current;
    const re2 = await sendValidated(locked1, ouiFile, "imm5257-validated.pdf");
    ok("QA-165 pass (break M1 on #572): the same file, kept before QA-165 and passing, sent again is read back and recorded (201), and the copy is current again", stuck === false && re2.status === 201 && re2.body?.copy?.validated?.current === true && existsSync(ouiPath) && sha(readFileSync(ouiPath)) === ouiSha, { stuck, status: re2.status, detail: re2.body?.detail });
    r = await sendValidated(locked1, ouiFile, "imm5257-validated.pdf");
    ok("QA-128 still holds: that file sent once more is \"already read back\" (409), nothing added", r.status === 409 && /already read back/.test(r.body?.detail ?? ""), r.body?.detail);
  }
  const validatedRows = sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`); // the read-back, the three QA-165 rows and the Oui file read back again
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "validated_copy_uploaded" }, OFFICER);
  ok("RT-16 pass: the officer locks an up-to-date generated copy (\"validated copy uploaded back\")", r.status === 201 && r.body.locked?.kind === "validated_copy_uploaded", r.body);
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "filed" }, OFFICER);
  ok("RT-16 fail: a locked copy cannot be locked again (409)", r.status === 409, r.body?.detail);
  const dbRefuses = (q: string) => { try { sql(q); return false; } catch { return true; } };
  ok("RT-16 fail (database): a locked copy's file, hash, result or lock cannot be changed; a generated copy cannot be rewritten or moved back; the facts a copy read cannot change",
    dbRefuses(`update form_instance set path='x' where id='${locked1}'`) && dbRefuses(`update form_instance set locked_kind='filed' where id='${locked1}'`)
    && dbRefuses(`update form_instance set sha256='x' where id='${spouseCopy}'`) && dbRefuses(`update form_instance set status='QUEUED' where id='${spouseCopy}'`)
    && dbRefuses(`update answer_snapshot set facts_json='[]' where id=(select snapshot_id from form_instance where id='${spouseCopy}')`));

  // ── RT-15 out of date and stale; never regenerated on its own
  const before = sql(`select count(*) from form_instance where case_id='${caseId}'`);
  await answer(P, "person.passport_number", "SAMPLEP999");
  await confirmAll(P);
  f = await formOf("IMM 5257", P);
  const locked = f.copies.find((x) => x.id === locked1)!;
  ok("RT-15/16 pass: after the passport number changes, the locked copy is stale and names the fact; its file and row are unchanged", locked.stale && locked.out_of_date && locked.changed.some((x) => /passport/i.test(x)) && sha(readFileSync(join(ROOT, row1.path))) === row1.sha && sql(`select sha256 from form_instance where id='${locked1}'`) === row1.sha, locked);
  ok("RT-15 pass: nothing was regenerated on its own (a new copy only on the officer's request)", sql(`select count(*) from form_instance where case_id='${caseId}'`) === before);
  ok("C11.6 C-10 pass: after a fact on the form changed, its validated copy says \"Out of date: validate again\" and is kept as history", locked.validated?.current === false && locked.validated?.words === "Out of date: validate again" && sql(`select count(*) from validated_copy where form_instance_id='${locked1}'`) === validatedRows, locked.validated);
  ok("C11.6 C-10 pass: once its validated copy is out of date, the download is the copy as made again (the old validated file is not handed over as current)", sha((await bytes(`/runtime/form-copies/${locked1}/file`, OFFICER)).body) === row1.sha);
  ok("RT-15 fail-guard: the spouse's copy, whose facts did not change, is not out of date", !(await formOf("IMM 5257", spouse)).copies.find((x) => x.id === spouse2)!.out_of_date);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-3` }, OFFICER);
  const second: string = r.body.id; await done(second);
  f = await formOf("IMM 5257", P);
  ok("RT-15 pass: a new copy is a new row with today's facts, up to date; the locked one stays stale and unchanged", f.copies[0].id === second && !f.copies[0].out_of_date && f.copies.find((x) => x.id === locked1)!.stale && sql(`select count(*) from form_instance where case_id='${caseId}' and subject_id='${P}'`) === "4");
  await answer(P, "person.given_names", "APPLICANTE"); await confirmAll(P);
  r = await call("POST", `/runtime/form-copies/${second}/lock`, { kind: "filed" }, OFFICER);
  ok("RT-16 fail: an out-of-date copy cannot be locked (409): generate a new one first", r.status === 409 && /out of date/.test(r.body?.detail ?? ""), r.body?.detail);

  // ── RT-17 audit without values
  const audit = sql(`select coalesce(string_agg(summary || ' ' || coalesce(detail::text, ''), ' '), '') from audit_event where entity = 'form copy'`);
  ok("RT-17 pass: queued, generated and locked copies are in the audit trail", /asked for a new copy of IMM 5257/.test(audit) && /generated: \d+ form fields written/.test(audit) && /locked copy/.test(audit));
  ok("RT-17 fail-guard: no answer value or typed name appears in the audit of copies", !["SAMPLED", "SAMPLEP123", "SAMPLEP999", "APPLICANTE", "1990-04-13", "Sample Applicant D", "Sample Spouse D"].some((x) => audit.includes(x)));

  // ── CHECK → FIX (review-r1d.md, break-report-r1d.md): each fix with a test
  const refusedWith = (q: string, why: RegExp) => { try { sql(q); return false; } catch (e) { return why.test((e as Error).message); } };
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%20%3Cb%3Ex%3C%2Fb%3E/${P}/generate`, {}, OFFICER);
  ok("break m6 fail: a malformed form name is 404 and never echoed back", r.status === 404 && !/<b>/.test(JSON.stringify(r.body)), r.body?.detail);
  r = await call("POST", `/runtime/form-copies/${second}/lock`, { kind: "printed" }, CLIENT);
  ok("break m4 fail: the client sending a wrong lock kind is told 403 (who may lock), not 400 (what was sent)", r.status === 403, r.status);
  ok("break M5 fail (database): a copy and the facts it read cannot be deleted while their case exists",
    refusedWith(`delete from form_instance where id='${spouseCopy}'`, /runtime_copy_no_delete/) && refusedWith(`delete from answer_snapshot where id=(select snapshot_id from form_instance where id='${spouseCopy}')`, /runtime_copy_no_delete/));
  ok("break M5 fail (database): a copy cannot be inserted already generated (it starts queued and empty)",
    refusedWith(`insert into form_instance (id, workspace_id, case_id, subject_id, form_number, config_release_id, snapshot_id, status, path, created_by) select gen_random_uuid(), workspace_id, case_id, subject_id, form_number, config_release_id, snapshot_id, 'GENERATED', 'x.pdf', created_by from form_instance where id='${spouseCopy}'`, /runtime_form_instance_insert/));
  ok("break m5 fail (database): a copy keeps its workspace, and a lock cannot be backdated",
    refusedWith(`update form_instance set workspace_id=gen_random_uuid() where id='${spouse2}'`, /keeps what it is a copy of/)
    && refusedWith(`update form_instance set locked_kind='filed', locked_at=now() - interval '1 day', locked_by='user-O' where id='${spouse2}'`, /stamped when it is made/));
  // The file: missing (break m1), outside the working files (break m5), changed on disk.
  const p2 = join(ROOT, sql(`select path from form_instance where id='${second}'`)), aside = `${p2}.aside`;
  renameSync(p2, aside);
  const missingOk = (await bytes(`/runtime/form-copies/${second}/file`, OFFICER)).status === 404 && (await formOf("IMM 5257", P)).copies.find((x) => x.id === second)!.file_ok === false;
  const outside = join(tmpdir(), `r1d-${run}.pdf`); copyFileSync(aside, outside); symlinkSync(outside, p2);
  const outsideOk = (await bytes(`/runtime/form-copies/${second}/file`, OFFICER)).status === 409;
  rmSync(p2); rmSync(outside); renameSync(aside, p2);
  ok("break m1 fail: a copy whose file is missing is 404 to download and shows \"file missing\" (file_ok false)", missingOk);
  ok("break m5 fail: a copy's file that leads outside the working files (a link) is not handed over (409), even with the same bytes", outsideOk);
  ok("break m1 pass: with its file back, the copy downloads again", (await bytes(`/runtime/form-copies/${second}/file`, OFFICER)).status === 200);
  // A person marked not travelling keeps their copies in view (break M4); no new copy for them.
  await call("PATCH", `/runtime/cases/${caseId}/people/${spouse}`, { applies: false }, OFFICER);
  f = await formOf("IMM 5257", spouse);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${spouse}/generate`, { idempotencyKey: `gen-${run}-gone` }, OFFICER);
  ok("break M4 pass: a person marked not travelling still shows the form with its copies, marked as no longer applying; a new copy is refused (422)", !!f && f.applies === false && f.copies.length === 2 && r.status === 422, { applies: f?.applies, copies: f?.copies.length, status: r.status });
  await call("PATCH", `/runtime/cases/${caseId}/people/${spouse}`, { applies: true }, OFFICER);
  // One case cannot fill the queue (break m6), counted under a lock on the case (PR #12 review 3): six simultaneous
  // presses with distinct keys give at most five copies; the others are 429 in plain words.
  const burst: { status: number; body: { id?: string; detail?: string } }[] = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-burst-${i}` }, OFFICER)));
  const accepted = burst.filter((x) => x.status === 202);
  ok("break m6 / PR #12 review 3 fail: six simultaneous presses with distinct keys make at most 5 copies; the rest are 429 in plain words",
    accepted.length <= 5 && burst.every((x) => x.status === 202 || (x.status === 429 && /being generated; wait for them/.test(x.body.detail ?? ""))) && burst.some((x) => x.status === 429)
    && Number(sql(`select count(*) from form_instance where case_id='${caseId}' and idempotency_key like 'gen-${run}-burst-%'`)) === accepted.length, burst.map((x) => x.status));
  for (const x of accepted) await done(x.body.id!);
  // PR #12 review 2: only the file that was made is locked: a missing or changed file is refused (409), the copy stays unlocked.
  const lockMe = accepted[0].body.id!, pl = join(ROOT, sql(`select path from form_instance where id='${lockMe}'`)), keep = `${pl}.keep`;
  copyFileSync(pl, keep); rmSync(pl);
  const lockMissing = await call("POST", `/runtime/form-copies/${lockMe}/lock`, { kind: "filed" }, OFFICER);
  copyFileSync(keep, pl); appendFileSync(pl, "%changed");
  const lockChanged = await call("POST", `/runtime/form-copies/${lockMe}/lock`, { kind: "filed" }, OFFICER);
  copyFileSync(keep, pl); rmSync(keep);
  await sendValidated(lockMe, asValidated(readFileSync(pl)), "validated.pdf"); // C-9: Validate is the last step before filing
  ok("PR #12 review 2 fail: a copy whose file is missing cannot be locked (409 in plain words)", lockMissing.status === 409 && /missing from the working files/.test(lockMissing.body?.detail ?? ""), lockMissing.body?.detail);
  ok("PR #12 review 2 fail: a copy whose file changed on disk cannot be locked (409 in plain words); it stays unlocked", lockChanged.status === 409 && /changed on disk/.test(lockChanged.body?.detail ?? "") && sql(`select locked_at is null from form_instance where id='${lockMe}'`) === "t", lockChanged.body?.detail);
  r = await call("POST", `/runtime/form-copies/${lockMe}/lock`, { kind: "filed" }, OFFICER);
  ok("PR #12 review 2 pass: with its file as it was made, the same copy locks", r.status === 201 && r.body.locked?.kind === "filed", r.body?.detail ?? r.status);

  // break r1d-none-apply M1: a filed copy goes stale when a "none apply" it read is withdrawn, and not when it is said again.
  const naNow = async (g: string) => (await sqrGroups()).find((x) => x.section === g)!.group!.none_apply;
  await put(gc, false, (await naNow(gc))!.id);
  const staleCopy = (await formOf("IMM 5257", P)).copies.find((x) => x.id === lockMe)!;
  await put(gc, true, (await naNow(gc))!.id);
  const backCopy = (await formOf("IMM 5257", P)).copies.find((x) => x.id === lockMe)!;
  ok("break M1 fail/pass: withdrawing a confirmed none apply makes the filed copy stale, naming the group; saying it again (confirmed) makes it current again",
    staleCopy.stale && staleCopy.changed.some((x) => /^Entries in "/.test(x)) && !backCopy.stale && !backCopy.out_of_date, { stale: staleCopy.changed, back: backCopy.changed });
  // break m1, m4, m5: nothing new saved for "entries apply" said first or the same answer from an older view; a rule refusal is not "changed by someone else".
  const fresh = ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, CLIENT)).body.sections as G[]).find((x) => x.subjectId === spouse && x.group && !x.group.none_apply && x.section !== spouseGroup.section)!;
  const firstFalse = await put(fresh.section, false, null, CLIENT, spouse), staleSame = await put(gc, true, null);
  const e2 = await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: gc }, CLIENT);
  ok("break m1/m5/m4: \"entries apply\" said first saves nothing; the same answer from an older view saves nothing (200, not 409); a rule refusal is titled \"Not possible now\"",
    firstFalse.status === 200 && firstFalse.body.saved === false && sql(`select count(*) from client_group_answer where subject_id='${spouse}' and group_key='${fresh.section}'`) === "0"
    && staleSame.status === 200 && staleSame.body.saved === false && e2.status === 409 && e2.body?.title === "Not possible now", { firstFalse: firstFalse.body?.saved, staleSame: staleSame.status, e2: e2.body?.title });
  r = await call("POST", `/runtime/cases/${caseId}/sections/${go}/confirm`, { subjectId: P, seen: [(await naNow(gc))!.id] }, OFFICER);
  ok("break m2: Confirm section names a group only for its own changed answer, never for an id of another group", r.status === 409 && !(r.body?.changed ?? []).includes(`group:${go}`), r.body?.changed);

  // PR 13 review: IMM 5257 filed with one complete previous-residence entry; a blank second entry makes the copy stale.
  const prev = "previous_countries_of_residence";
  type RQ = Q & { section: string; rows: { row: string; answer: { id: string } | null }[] };
  r = await put(prev, false, (await naNow(prev))?.id ?? null, OFFICER);
  const firstRow: string = (await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: prev }, OFFICER)).body.row;
  for (const q of ((await agent()).sections.flatMap((x: { questions: RQ[] }) => x.questions) as RQ[]).filter((q) => q.subjectId === P && q.section === prev && q.group && q.required && !q.hidden))
    await call("PUT", `/runtime/cases/${caseId}/answers/${P}/${q.fact}`, { value: sample(q), expectedId: null, row: firstRow }, OFFICER);
  await confirmAll(P);
  const readyWithEntry = factsDone(await formOf("IMM 5257", P)); // QA-165 (#1318): no fact waiting (boxes left empty aside)
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-pr13` }, OFFICER);
  const pr13: string = r.body.id; await done(pr13);
  await sendValidated(pr13, asValidated(readFileSync(join(ROOT, sql(`select path from form_instance where id='${pr13}'`)))), "validated.pdf");
  const filed13 = await call("POST", `/runtime/form-copies/${pr13}/lock`, { kind: "filed" }, OFFICER);
  await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: prev }, OFFICER);
  f = await formOf("IMM 5257", P);
  const c13 = f.copies.find((x) => x.id === pr13)!;
  ok("PR 13 review fail: filed with one complete previous-residence entry, a blank second entry makes the copy stale, naming the group; readiness says the new entry is not answered",
    readyWithEntry && filed13.status === 201 && c13.stale && c13.changed.includes('Entries in "Previous countries of residence" for Sample Applicant D') && !f.readiness.ready && f.readiness.missing.some((m) => m.reason === "not answered"), { readyWithEntry, filed: filed13.status, changed: c13?.changed, missing: f.readiness.missing.slice(0, 3) });

  // PR #12 review 1: a form the release files Online is not offered as a PDF, even when its PDF form field map exists.
  // Fixture: a copy of this release whose IMM 5257 filing line is Online, pinned by a new case, then moved below the
  // real release (version -1) so later suites keep opening cases on the real one.
  const rel = JSON.parse(sql(`select json_build_object('id', id, 'v', version) from config_release where combination_id='${vv}' order by version desc limit 1`));
  const cols = sql(`select string_agg(quote_ident(column_name), ',' order by ordinal_position) from information_schema.columns where table_name='config_release'`).split(",");
  const pick = cols.map((c) => c === "id" ? "gen_random_uuid()" : c === "version" ? `${rel.v + 1}` : c === "snapshot"
    ? `jsonb_set(snapshot, '{forms}', (select jsonb_agg(case when f->>'form_number' = 'IMM 5257' then f || '{"channel":"ONLINE"}' else f end) from jsonb_array_elements(snapshot->'forms') f))` : c);
  const onlineRel = sql(`insert into config_release (${cols.join(",")}) select ${pick.join(",")} from config_release where id='${rel.id}' returning id`).split("\n")[0];
  const oc = await open(`R1D-ONLINE-${run}`);
  sql(`update config_release set version = -1 where id='${onlineRel}'`);
  const oP: string = oc.people.find((p: { role: string }) => p.role === "principal").subject_id;
  const ol = (await call("GET", `/runtime/cases/${oc.id}/forms`, undefined, OFFICER)).body.forms as Form[];
  r = await call("POST", `/runtime/cases/${oc.id}/forms/IMM%205257/${oP}/generate`, { idempotencyKey: `gen-${run}-online` }, OFFICER);
  // P-145 (W1-10 slice 1) replaces PR #12 review 1's rule: a form filed Online with IRCC's PDF gets a "Copy, not for filing".
  const onlineCopy: string = r.body?.id; if (onlineCopy) await done(onlineCopy);
  const lockOnline = onlineCopy ? await call("POST", `/runtime/form-copies/${onlineCopy}/lock`, { kind: "filed" }, OFFICER) : { status: 0, body: null };
  ok("C11.6 P-145 pass: a case whose release files IMM 5257 Online offers a PDF copy marked not for filing",
    (ol as (Form & { for_filing?: boolean })[]).some((x) => x.form === "IMM 5257" && x.for_filing === false) && r.status === 202, { forms: ol.map((x) => x.form), status: r.status, detail: r.body?.detail });
  const onlineForm = (ol as (Form & { for_filing?: boolean; fields_open?: unknown[] })[]).find((x) => x.form === "IMM 5257" && x.for_filing === false);
  ok("QA-165 part 2 (Devin on #592): the Online form's PDF copy (not for filing, but downloadable) also lists the mandatory fields it leaves empty", (onlineForm?.fields_open?.length ?? 0) > 0, onlineForm?.fields_open?.length);
  ok("C11.6 P-145 fail: that copy is never filed or uploaded (409 in words)", lockOnline.status === 409 && /copy, not for filing/.test(lockOnline.body?.detail ?? ""), [lockOnline.body?.detail, sql(`select status || ' ' || coalesce(error, '') from form_instance where id='${onlineCopy}'`)]);
  ok("PR #12 review 1 pass-guard: the case's other PDF forms are still offered, and the real release is the latest again", ol.length > 0 && sql(`select id from config_release where combination_id='${vv}' order by version desc limit 1`) === rel.id, ol.map((x) => x.form));
  // P-65 (a), review M1: the fill trial verdict gates filing, per form.
  ok("review M1: a form whose fill trial passed is fileable; one with no trial record, or a verdict that the product's file does not pass, is not",
    // S2 (SA-1B-174): by the form edition the copy is made from (its official file's SHA-256), not the form number.
    ((ed) => trialFor({ form_number: "IMM 5257", form_sha256: ed("IMM 5257"), entries: [] }).passed && !trialFor({ form_number: "IMM 9999", form_sha256: "a".repeat(64), entries: [] }).passed && !trialFor({ form_number: "IMM 1344", form_sha256: ed("IMM 1344"), entries: [] }).passed)((f: string) => readTrials().find((t) => t.form === f)!.form_sha256), { imm1344: trialFor({ form_number: "IMM 1344", form_sha256: readTrials().find((t) => t.form === "IMM 1344")!.form_sha256, entries: [] }) });
  process.exitCode = summary() ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
