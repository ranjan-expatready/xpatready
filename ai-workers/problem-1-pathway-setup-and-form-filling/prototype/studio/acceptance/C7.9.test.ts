// C7.9 Must verify before filing (row B142 = L-SA8; P-242, P-237; SA-1B-1 rule 9, SA-1B-260 rule 3, SA-1B-261 rule 7;
// P-406). The immigration expert marks a library field "must verify before filing"; the flag shows in the library; on a
// case, a value of it that the client gave and no one on staff has checked raises a CRITICAL warning on Ready to file,
// passable with a reason, never a block; a staff confirmation or a staff entry counts as verified. Visitor visa's
// passport number (SA-1B-1's own example) on the configured checkpoint. Which fields carry the flag is Sample
// (Unconfirmed: expert; AGENTS rule 4). No AI (US$0).
// Needs first (else it stops with exit 2, "Setup missing"): Demo › Load the configured checkpoint on a fresh copy, or
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept
//   tsx studio/acceptance/lib/setup_vv_m3.ts 4440 xr_studio_accept      (exits 1 on its own known gaps; fine)
//   tsx studio/acceptance/C7.9.test.ts 4440 xr_studio_accept
import { APPROVER, AUTHOR, CLIENT, REVIEWER, call, confirmAll, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo } from "./lib/m3.ts";

const FACT = "person.passport_number";
type W = { code: string; severity: string; words: string; subject?: string; key: string };
type Q = { subjectId: string; fact: string; answer: { id: string; status?: string; channel?: string } | null };
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? JSON.stringify(r.body ?? "")).slice(0, 220); // eslint-disable-line @typescript-eslint/no-explicit-any -- responses read loosely

async function release(vv: string, note: string): Promise<{ version: number | null; why: string }> {
  const s = await call("POST", `/combinations/${vv}/submit`, { note }, AUTHOR);
  if (s.status >= 300) return { version: null, why: ((s.body?.errors ?? []) as { message?: string }[]).map((e) => e.message).join(" | ").slice(0, 400) || words(s) };
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
  const a = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  return a.status < 300 ? { version: Number(a.body?.version ?? 0) || null, why: "" } : { version: null, why: words(a) };
}

await main("C7.9", "Must verify before filing: the expert's flag, a CRITICAL warning on Ready to file passable with a reason", async () => {
  const vv = needVisitorVisa();
  if (!sql(`select 1 from canonical_field where canonical_field_key = '${FACT}' limit 1`)) { console.log("Setup missing: the library has no passport number field (load the configured checkpoint)."); process.exit(2); }
  // In the library: the author proposes, only the immigration expert decides (SA-1B-1 r9).
  let r = await call("POST", `/library/fields/${FACT}/must-verify`, { on: true, reason: "C7.9 pack: SA-1B-1's example, passport number (Sample)." }, CLIENT);
  ok("C7.9-1 fail: someone without the author duty cannot propose the flag", r.status === 403, r.status);
  r = await call("POST", `/library/fields/${FACT}/must-verify`, { on: true, reason: "x" }, AUTHOR);
  ok("C7.9-2 fail: a proposal needs a reason", r.status === 400, words(r));
  r = await call("POST", `/library/fields/${FACT}/must-verify`, { on: true, reason: "C7.9 pack: SA-1B-1's example, passport number (Sample)." }, AUTHOR);
  const id = r.body?.id;
  ok("C7.9-3 pass: the author proposes \"must verify before filing\" on the passport number; it waits", r.status < 300 && sql(`select status from library_change where id = '${id}'`) === "WAITING", r.status >= 300 ? words(r) : r.body?.label);
  r = await call("POST", `/library/changes/${id}/approve`, { note: "C7.9 pack" }, APPROVER);
  ok("C7.9-4 fail (SA-1B-1 r9): a second person without the immigration expert's duty cannot approve it, in words", r.status === 403 && /immigration expert/.test(words(r)), words(r));
  const itemOf = async (actor: string) => (((await call("GET", "/review-queue", undefined, actor)).body?.items ?? []) as { id: string; state?: string }[]).find((x) => x.id === `change:${id}`);
  const forExpert = await itemOf(REVIEWER), forApprover = await itemOf(APPROVER);
  ok("C7.9-5 pass and fail: To review puts it before the immigration expert as theirs to decide, and not before a second person without that duty", forExpert?.state === "needs" && forApprover?.state !== "needs", { expert: forExpert?.state, approver: forApprover?.state });
  r = await call("POST", `/library/changes/${id}/approve`, { note: "C7.9 pack: the immigration expert approves (Sample)." }, REVIEWER);
  const lib = (await call("GET", `/library/fields/${FACT}/must-verify`, undefined, AUTHOR)).body;
  ok("C7.9-6 pass: the immigration expert approves; the library shows the flag (the field's draft)", r.status < 300 && lib?.on === true && sql(`select must_verify_before_filing::text || '|' || status from canonical_field where canonical_field_key = '${FACT}' order by version desc limit 1`) === "true|DRAFT", { status: r.status, lib: lib?.on, why: r.status >= 300 ? words(r) : undefined });
  // Review M2 on #1282: a returned change is withdrawn by its proposer, then proposed again (never a dead end).
  const DOB = "person.date_of_birth";
  r = await call("POST", `/library/fields/${DOB}/must-verify`, { on: true, reason: "C7.9 pack: dates of birth, for the parent step (Sample)." }, AUTHOR);
  const dobId = r.body?.id;
  r = await call("POST", `/library/changes/${dobId}/return`, { note: "C7.9 pack: say which forms first (Sample)." }, REVIEWER);
  const again = await call("POST", `/library/fields/${DOB}/must-verify`, { on: true, reason: "C7.9 pack: dates of birth, again (Sample)." }, AUTHOR);
  ok("C7.9-6b fail (review M2): a returned change: proposing again is refused in words that say it was returned and to withdraw it first", r.status < 300 && again.status === 409 && /was returned/.test(words(again)) && /withdraws it first/.test(words(again)), { returned: r.status, again: again.status, why: words(again) });
  r = await call("POST", `/library/changes/${dobId}/withdraw`, { note: "C7.9 pack: withdrawn to propose again." }, AUTHOR);
  const dob2 = await call("POST", `/library/fields/${DOB}/must-verify`, { on: true, reason: "C7.9 pack: dates of birth, for the parent step (Sample)." }, AUTHOR);
  const ok2 = dob2.body?.id ? await call("POST", `/library/changes/${dob2.body.id}/approve`, { note: "C7.9 pack: the immigration expert approves (Sample)." }, REVIEWER) : dob2;
  ok("C7.9-6c pass (review M2): withdrawn by its proposer, it is proposed again and the immigration expert approves it", r.status < 300 && dob2.status < 300 && ok2.status < 300, { withdraw: r.status, propose: dob2.status, approve: ok2.status, why: [words(r), words(dob2), words(ok2)].filter((x) => x && x !== "{}") });
  const one = await release(vv, "C7.9 pack: must verify before filing");
  const rel = JSON.parse(sql(`select snapshot::text from config_release where combination_id = '${vv}' and version = ${one.version ?? 0}`) || "{}");
  ok("C7.9-7 pass: the next release carries the flag, and the change is released", !!one.version && (rel.canonical_fields ?? []).some((f: { id: string; must_verify?: boolean }) => f.id === FACT && f.must_verify === true) && sql(`select status from library_change where id = '${id}'`) === "RELEASED", one);
  if (!one.version) return;

  // On a case: the client types the passport number; no one on staff has checked it.
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client A"];
  const q = async (actor: string, mode: string) => ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=${mode}`, undefined, actor)).body?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions).find((x: Q) => x.subjectId === P && x.fact === FACT) as Q | undefined;
  const put = async (value: string, actor: string, mode: string, caseId = c.id, subject = P) => {
    const cur = caseId === c.id ? await q(actor, mode) : undefined;
    return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${FACT}`, { value, expectedId: cur?.answer?.id ?? null }, actor);
  };
  const mv = async (caseId = c.id) => { const p = (await prepare(caseId)).p; return (p?.readiness ?? []).flatMap((x) => ((x as unknown as { warns: W[] }).warns ?? []).filter((w) => w.code === "must_verify").map((w) => ({ ...w, filing: x.filing }))); };
  let lines = await mv();
  ok("C7.9-8 fail: with no passport number answered, there is no must-verify line (a missing fact is its own line)", lines.length === 0, lines);
  r = await put("AB1234567", CLIENT, "sqr");
  lines = await mv();
  ok("C7.9-9 pass (SA-1B-261 r7): the client's own typed passport number, checked by no one on staff: a CRITICAL warning on Ready to file naming it", r.status < 300 && lines.length >= 1 && lines.every((w) => w.severity === "critical" && /^CRITICAL: /.test(w.words) && /passport/i.test(w.words) && /not verified/.test(w.words)), { status: r.status, why: r.status >= 300 ? words(r) : undefined, lines: lines.map((w) => w.words) });
  const filing = (lines[0] as unknown as { filing: string } | undefined)?.filing;
  r = await call("POST", `/runtime/filings/${filing}/warnings/must_verify/pass`, {}, c.officer);
  ok("C7.9-10 fail (P-237): passing it needs a reason", r.status === 400, words(r));
  r = await call("POST", `/runtime/filings/${filing}/warnings/must_verify/pass`, { reason: "Checked against the passport scan by phone (Sample)." }, c.officer);
  const after = (await prepare(c.id)).p?.readiness.find((x) => x.filing === filing) as unknown as { warns: W[]; passed: { code: string; reason: string }[] } | undefined;
  ok("C7.9-11 pass (P-237): with a reason it is passed and recorded, never a block", r.status < 300 && !(after?.warns ?? []).some((w) => w.code === "must_verify") && (after?.passed ?? []).some((x) => x.code === "must_verify" && /passport scan/.test(x.reason)), { status: r.status, why: r.status >= 300 ? words(r) : undefined });
  r = await put("AB7654321", CLIENT, "sqr");
  lines = await mv();
  ok("C7.9-12 fail: a new client-typed value is not covered by the earlier pass: the warning is back", r.status < 300 && lines.some((w) => w.filing === filing), lines.map((w) => w.words));
  await confirmAll(c.id, P);
  lines = await mv();
  ok("C7.9-13 pass (SA-1B-260 r3): once staff confirm the section, the value is verified: no must-verify line", lines.length === 0, lines.map((w) => w.words));

  // Review M1 on #1282: a parent's value is judged on the parent, not on the person whose form it is.
  const c3 = await openCase(vv, [{ role: "principal", name: "Sample Client C", dob: yearsAgo(42) }, { role: "spouse_or_partner", name: "Sample Spouse C", dob: yearsAgo(40) }]);
  const parents = await Promise.all([c3.subjects["Sample Client C"], c3.subjects["Sample Spouse C"]].map((who) => call("PUT", `/runtime/cases/${c3.id}/answers/${who}/parent_1/${DOB}`, { value: "1950-05-05", expectedId: null }, CLIENT)));
  const par = (await mv(c3.id)).filter((w) => /their parent 1/.test(w.words));
  ok("C7.9-16 fail (review M1): a parent's date of birth the client typed (IMM 5645 writes it) raises the line, naming the relative", parents.some((x) => x.status < 300) && par.length >= 1 && par.every((w) => w.severity === "critical"), { put: parents.map((x) => x.status), lines: (await mv(c3.id)).map((w) => w.words.slice(0, 160)) });
  // Break F1, F2, F3 on #1282: a merge never brings a merged field back, and never leaves a change stuck.
  const merge = async (keep: string, gone: string) => { const m = await call("POST", "/library/merges", { keep, merge: gone, reason: "C7.9 pack: the same meaning (Sample)." }, AUTHOR); return m.body?.id ? call("POST", `/library/merges/${m.body.id}/approve`, {}, APPROVER) : m; };
  const [MA, MB, MC, MD] = ["person.family_name_at_permanent_residence", "person.other_family_name", "person.given_name_at_permanent_residence", "person.full_name"];
  const live = (k: string) => !!sql(`select 1 from canonical_field where canonical_field_key = '${k}' limit 1`);
  if (live(MA) && live(MB) && live(MC) && live(MD)) {
    r = await call("POST", `/library/fields/${MA}/must-verify`, { on: true, reason: "C7.9 pack: before a merge (Sample)." }, AUTHOR);
    const f1 = r.body?.id, mergedA = await merge(MB, MA);
    r = f1 ? await call("POST", `/library/changes/${f1}/approve`, { note: "C7.9 pack: the expert (Sample)." }, REVIEWER) : r;
    ok("C7.9-17 fail (break F1): approving the flag after its field was merged is refused in words, and nothing is written over the merge", mergedA.status < 300 && r.status === 409 && /was merged into/.test(words(r)) && sql(`select coalesce(merged_into_key, '') || '|' || status from canonical_field where canonical_field_key = '${MA}' order by version desc limit 1`).startsWith(`${MB}|`), { merge: mergedA.status, approve: r.status, why: words(r), newest: sql(`select version || '|' || status || '|' || coalesce(merged_into_key, '') from canonical_field where canonical_field_key = '${MA}' order by version desc limit 1`) });
    r = await call("POST", `/library/fields/${MA}/must-verify`, { on: true, reason: "C7.9 pack: on a merged field (Sample)." }, AUTHOR);
    ok("C7.9-18 fail (break F3): proposing the flag on a field already merged is refused, naming the field it was merged into", r.status === 409 && words(r).includes(MB), words(r));
    r = await call("POST", `/library/fields/${MC}/must-verify`, { on: true, reason: "C7.9 pack: approved, then merged (Sample)." }, AUTHOR);
    const f2 = r.body?.id; if (f2) await call("POST", `/library/changes/${f2}/approve`, { note: "C7.9 pack: the expert (Sample)." }, REVIEWER);
    const mergedC = await merge(MD, MC);
    r = f2 ? await call("POST", `/library/changes/${f2}/withdraw`, { note: "C7.9 pack: merged after approval." }, AUTHOR) : r;
    ok("C7.9-19 pass (break F2): an approved change whose field was merged since is never stuck: its proposer withdraws it, and it says the flag did not carry over", mergedC.status < 300 && r.status < 300 && sql(`select status from library_change where id = '${f2}'`) === "WITHDRAWN" && /did not carry over/.test(sql(`select decision_note from library_change where id = '${f2}'`) ?? ""), { merge: mergedC.status, withdraw: r.status, why: words(r) });
  } else ok("C7.9-17 setup: the four fields the merge steps use are in the library", false, [MA, MB, MC, MD].filter((k) => !live(k)));
  // A staff entry counts as verified; a field without the flag never raises it.
  const c2 = await openCase(vv, [{ role: "principal", name: "Sample Client B", dob: yearsAgo(35) }]);
  const P2 = c2.subjects["Sample Client B"];
  r = await call("PUT", `/runtime/cases/${c2.id}/answers/${P2}/${FACT}`, { value: "CD1234567", expectedId: null }, c2.officer);
  lines = await mv(c2.id);
  ok("C7.9-14 pass (SA-1B-261 r7): a passport number entered by staff counts as verified: no must-verify line", r.status < 300 && lines.length === 0, { status: r.status, why: r.status >= 300 ? words(r) : undefined, lines: lines.map((w) => w.words) });
  r = await call("PUT", `/runtime/cases/${c2.id}/answers/${P2}/person.family_name`, { value: "Sample", expectedId: null }, CLIENT);
  lines = await mv(c2.id);
  ok("C7.9-15 fail: a client-typed answer of a field without the flag (family name) raises no must-verify line", r.status < 300 && lines.length === 0, { status: r.status, lines: lines.map((w) => w.words) });
});
