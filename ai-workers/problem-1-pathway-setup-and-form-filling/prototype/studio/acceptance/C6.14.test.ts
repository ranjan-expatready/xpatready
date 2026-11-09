// C6.14 One document for the whole application (row B136, P-406; SA-1B-151, SA-1B-214; concept
// product/screens/B136/concept.md r2). A line asked once for the couple ("couple_once", C3.16's Household) or once for
// the application ("case", Filing) is one checklist item with providers: the document type's default roles (a library
// change a second person approves, released with the next release), matched among everyone on the case, nobody under 18
// or of unknown age; none set or none left, the person the item is for provides it; the case officer changes them with a
// reason. Visitor visa's "Marriage certificate copy" on the configured checkpoint (the roles are Sample, Unconfirmed:
// expert; AGENTS rule 4: they show the mechanism, not what IRCC asks). No AI (US$0). Every step through the product's
// own routes; no SQL write.
// Needs first (else it stops with exit 2, "Setup missing"): Demo › Load the configured checkpoint on a fresh copy, or
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept
//   tsx studio/acceptance/lib/setup_vv_m3.ts 4440 xr_studio_accept      (exits 1 on its own known gaps; fine)
//   tsx studio/acceptance/C6.14.test.ts 4440 xr_studio_accept
import { APPROVER, AUTHOR, CLIENT, FAMILY, REVIEWER, answer, call, main, needVisitorVisa, ok, openCase, sql, yearsAgo, type Person } from "./lib/m3.ts";

type Provider = { subject: string; label: string; role: string; why: string };
type Line = { id: string; label: string; version: number; document: { key: string }; who: string; shared: string | null; providers: Provider[]; providers_rule: string | null; providers_words: string | null;
  providers_change: { reason: string; by: string | null; defaults: boolean } | null };
type Checklist = { people: { subject: string; label: string; lines: Line[]; waiting: Line[] }[] };
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? JSON.stringify(r.body ?? "")).slice(0, 240); // eslint-disable-line @typescript-eslint/no-explicit-any -- responses read loosely

/** Submit, the expert's sign-off and approval: the combination's next release (as C6.15's pack). */
async function release(vv: string, note: string): Promise<{ version: number | null; why: string; signed?: string }> {
  const s = await call("POST", `/combinations/${vv}/submit`, { note }, AUTHOR);
  if (s.status >= 300) return { version: null, why: ((s.body?.errors ?? []) as { message?: string }[]).map((e) => e.message).join(" | ").slice(0, 400) || words(s) };
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
  const signed = JSON.stringify(sub?.changeSummary ?? sub?.change_summary ?? []); // what the expert reads and signs
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? sub?.change_summary ?? []).filter((x: { needs_sme?: boolean }) => x.needs_sme !== false).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
  const a = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  return a.status < 300 ? { version: Number(a.body?.version ?? 0) || null, why: "", signed } : { version: null, why: words(a), signed };
}

await main("C6.14", "One document for the whole application: one item, default providers, nobody under 18, the officer changes them with a reason", async () => {
  const vv = needVisitorVisa();
  const MARRIAGE = sql(`select document_type_key from document_requirement where combination_id = '${vv}' and applies_to_roles = 'couple_once' and status <> 'RETIRED' order by version desc limit 1`);
  const PASSPORT = sql(`select document_type_key from document_requirement where combination_id = '${vv}' and applies_to_roles = 'each_applicant' and attach_mode = 'COMBINATION_MANDATORY' and document_type_key ~* 'passport' and status <> 'RETIRED' order by document_type_key, version desc limit 1`); // the always-needed passport line (never the conditional absent parent's one)
  if (!MARRIAGE || !PASSPORT) { console.log("Setup missing: Visitor visa has no line asked once for the couple, or no passport line (load the configured checkpoint)."); process.exit(2); }

  /** A case of these people, each married (the marriage line's condition), and its checklist reader. */
  const marriedCase = async (people: Person[]) => {
    const c = await openCase(vv, people);
    for (const p of people) if (c.subjects[p.name] && p.role !== "child") await answer(c.id, c.subjects[p.name], "person.marital_status", "married");
    return c;
  };
  const list = async (caseId: string, actor: string) => (await call("GET", `/runtime/cases/${caseId}/checklist`, undefined, actor)).body as Checklist;
  const linesOf = (l: Checklist, key: string) => (l?.people ?? []).flatMap((p) => p.lines.filter((x) => x.document.key === key).map((x) => ({ ...x, on: p.label })));
  const names = (xs: Provider[] | undefined) => (xs ?? []).map((x) => x.label).join("|");

  // ------------------------------------------------------------------ before: a case on the checkpoint's release
  const A = await marriedCase(FAMILY.slice(0, 2));
  let m = linesOf(await list(A.id, A.officer), MARRIAGE);
  ok("C6.14-1 pass (BR-2, BR-5; SA-1B-151 r1): before any roles, the marriage certificate is one item, on the spouse's list, provided by the person it is for",
    m.length === 1 && m[0].on === "Sample Spouse A" && m[0].shared === "couple" && names(m[0].providers) === "Sample Spouse A" && m[0].providers_rule === "first_applicant" && /names no provider/.test(m[0].providers_words ?? ""), m);

  // ------------------------------------------------------------------ BR-1: the library change, refusals first
  const propose = (key: string, roles: string[], actor = AUTHOR, reason = "C6.14 pack: SA-1B-151 r5's example (Sample).") => call("POST", `/library/document-types/${key}/providers`, { roles, reason }, actor);
  let r = await propose(MARRIAGE, ["principal", "spouse_or_partner"], APPROVER);
  ok("C6.14-2 fail (BR-1): someone without the author duty cannot propose provider roles (403)", r.status === 403, r.status);
  r = await propose(MARRIAGE, ["representative"]);
  ok("C6.14-3 fail (BR-1): the representative is not a provider role; the refusal lists the roles that are", r.status === 400 && /not a role that provides documents/.test(words(r)) && /Principal applicant/.test(words(r)), words(r));
  r = await propose(MARRIAGE, ["principal", "principal"]);
  ok("C6.14-4 fail (BR-1): a role twice is refused", r.status === 400 && /Each role once/.test(words(r)), words(r));
  r = await propose(MARRIAGE, ["principal"], AUTHOR, "x");
  ok("C6.14-5 fail (BR-1): a change without a reason is refused", r.status === 400 && /Say why/.test(words(r)), words(r));
  r = await propose(MARRIAGE, ["principal", "spouse_or_partner"]);
  const id = r.body?.id;
  ok("C6.14-6 pass (BR-1): the author proposes \"Principal applicant, then Spouse or partner\" for the marriage certificate; it waits for a second person",
    r.status < 300 && sql(`select status from library_change where id = '${id}'`) === "WAITING" && sql(`select array_to_string(default_provider_roles, ',') from document_type where document_type_key = '${MARRIAGE}' order by version desc limit 1`) === "", r.status >= 300 ? words(r) : r.body?.label);
  const seen = (await call("GET", `/library/changes/${id}`, undefined, APPROVER)).body;
  ok("C6.14-7 pass: the second person reads before → after in words, under a heading in words", seen?.providers?.after?.join("|") === "Principal applicant|Spouse or partner" && (seen?.providers?.before ?? []).length === 0 && seen?.kind_word === "who provides a shared document" && seen?.action_word === "Change", { providers: seen?.providers, kind: seen?.kind_word, action: seen?.action_word });
  r = await call("POST", `/library/changes/${id}/approve`, { note: "C6.14 pack: the proposer approves." }, AUTHOR);
  ok("C6.14-8 fail (P-253): the proposer cannot approve their own change", r.status === 403, r.status);
  r = await call("POST", `/library/changes/${id}/approve`, { note: "C6.14 pack: second person." }, APPROVER);
  ok("C6.14-9 pass: at approval the type's draft carries the roles in order", r.status < 300 && sql(`select status || '|' || array_to_string(default_provider_roles, ',') from document_type where document_type_key = '${MARRIAGE}' order by version desc limit 1`) === "DRAFT|principal,spouse_or_partner", r.status >= 300 ? words(r) : r.status);
  // BR-2's fail case: a per-person line never gets providers, even when its type has roles.
  r = await propose(PASSPORT, ["principal"], AUTHOR, "C6.14 pack: a per-person line keeps no providers (BR-2).");
  const pid = r.body?.id;
  const p2 = pid ? await call("POST", `/library/changes/${pid}/approve`, { note: "C6.14 pack: second person." }, APPROVER) : r;
  ok("setup: the passport type also gets a role (to show BR-2: a per-person line ignores it)", p2.status < 300, words(p2));
  const one = await release(vv, "C6.14 pack: provider roles");
  ok("C6.14-10 pass: the next release goes out with the roles, and both changes are released", !!one.version && sql(`select string_agg(status, ',') from library_change where id in ('${id}', '${pid}')`) === "RELEASED,RELEASED", one);
  ok("C6.14-10b pass (break M2): the release line the expert signed names the roles in words: \"provided by (when shared): principal applicant, then spouse or partner\"", /provided by \(when shared\): principal applicant, then spouse or partner/.test(one.signed ?? ""), (one.signed ?? "").slice(0, 400));
  if (!one.version) return;
  const rel = JSON.parse(sql(`select snapshot::text from config_release where combination_id = '${vv}' and version = ${one.version}`) || "{}");
  ok("C6.14-11 data: the release's marriage certificate type carries default_provider_roles; a type without roles carries no key (an unmarked snapshot is unchanged)",
    (rel.document_types ?? []).find((t: { key: string }) => t.key === MARRIAGE)?.default_provider_roles?.join() === "principal,spouse_or_partner" && (rel.document_types ?? []).filter((t: { key: string }) => ![MARRIAGE, PASSPORT].includes(t.key)).every((t: object) => !("default_provider_roles" in t)));

  // ------------------------------------------------------------------ a case pinned to the earlier release keeps its fallback
  m = linesOf(await list(A.id, A.officer), MARRIAGE);
  ok("C6.14-12 pass (challenge M3): the case pinned to the earlier release still has the person it is for as provider", m.length === 1 && names(m[0].providers) === "Sample Spouse A" && m[0].providers_rule === "first_applicant", m.map((x) => [x.on, names(x.providers)]));

  // ------------------------------------------------------------------ BR-2, BR-3: a new case: one item, two providers
  const B = await marriedCase(FAMILY);
  let L = await list(B.id, B.officer);
  m = linesOf(L, MARRIAGE);
  ok("C6.14-13 pass (BR-2, BR-3; SA-1B-214 r1): on a new case the marriage certificate is ONE item (on the spouse's list) provided by Sample Client A and Sample Spouse A, in the type's order",
    m.length === 1 && m[0].on === "Sample Spouse A" && names(m[0].providers) === "Sample Client A|Sample Spouse A" && m[0].providers_rule === "type_roles" && /Default from the document type/.test(m[0].providers[0]?.why ?? ""), m.map((x) => [x.on, names(x.providers), x.providers_rule]));
  ok("C6.14-14 pass (BR-3, SA1B-D73(a)): the principal is named though the item is on the spouse's list (on Visitor visa each person files their own application)", m[0]?.providers.some((p) => p.role === "principal") && !(L.people.find((p) => p.label === "Sample Client A")?.lines ?? []).some((x) => x.document.key === MARRIAGE));
  const pass = linesOf(L, PASSPORT);
  ok("C6.14-15 fail (BR-2): the passport stays one line per person, with no providers, although its type now has a role", pass.length === 4 && pass.every((x) => x.shared === null && x.providers.length === 0 && x.providers_rule === null), pass.map((x) => [x.on, x.shared, x.providers.length]));
  ok("C6.14-16 fail (BR-4): the children (10 and 15) are never providers", !m[0]?.providers.some((p) => p.role === "child"));

  // ------------------------------------------------------------------ BR-4, BR-5: under 18 and unknown age are skipped
  const C = await marriedCase([{ role: "principal", name: "Sample Client C", dob: null }, { role: "spouse_or_partner", name: "Sample Spouse C", dob: yearsAgo(17) }]);
  m = linesOf(await list(C.id, C.officer), MARRIAGE);
  ok("C6.14-17 fail → fallback (BR-4, BR-5; SA-1B-151 r3): a principal of unknown age and a spouse of 17 are both skipped, so the person the item is for provides it, and the words say why",
    m.length === 1 && names(m[0].providers) === "Sample Spouse C" && m[0].providers_rule === "first_applicant" && /cannot be checked/.test(m[0].providers_words ?? "") && /is 17 on/.test(m[0].providers_words ?? ""), m.map((x) => x.providers_words));
  await answer(C.id, C.subjects["Sample Client C"], "person.date_of_birth", yearsAgo(18), C.officer);
  m = linesOf(await list(C.id, C.officer), MARRIAGE);
  ok("C6.14-18 pass (BR-4): once the principal's birth date shows 18 today, the principal is named and the spouse of 17 still is not", names(m[0]?.providers) === "Sample Client C" && m[0]?.providers_rule === "type_roles", names(m[0]?.providers));

  // ------------------------------------------------------------------ BR-6: the officer changes the providers with a reason
  const item = m.length ? linesOf(await list(B.id, B.officer), MARRIAGE)[0] : undefined;
  const P = B.subjects["Sample Client A"], S = B.subjects["Sample Spouse A"], K = B.subjects["Sample Child A1"];
  const change = (body: Record<string, unknown>, actor = B.officer, line: string | undefined = item?.id) => call("POST", `/runtime/checklist-lines/${line}/providers`, body, actor);
  r = await change({ providers: [P], reason: "" });
  ok("C6.14-19 fail (BR-6): no reason is refused (400)", r.status === 400 && /reason/i.test(words(r)), words(r));
  r = await change({ providers: [K], reason: "The child has the certificate." });
  ok("C6.14-20 fail (BR-4, BR-6): a child of 10 cannot be chosen (400, in words)", r.status === 400 && /nobody under 18/.test(words(r)), words(r));
  r = await change({ providers: [C.subjects["Sample Client C"]], reason: "Someone from another case." });
  ok("C6.14-21 fail (BR-6): a person not on this case cannot be chosen (400)", r.status === 400 && /person on this case/.test(words(r)), words(r));
  r = await change({ providers: [P, P], reason: "Twice." });
  ok("C6.14-22 fail (BR-6): the same person twice is refused (400)", r.status === 400 && /Each person once/.test(words(r)), words(r));
  r = await change({ providers: [P], reason: "Only the principal holds the original." }, CLIENT);
  ok("C6.14-23 fail (BR-6): the client cannot change providers (403 or 404)", [403, 404].includes(r.status), r.status);
  r = await change({ providers: [P], reason: "Stale.", version: (item?.version ?? 0) + 5 });
  ok("C6.14-24 fail (BR-6): a stale version is refused (409)", r.status === 409, r.status);
  // A line still waiting for an answer (marital status not answered yet) has no stored row: nothing to change (404).
  const W = await openCase(vv, FAMILY.slice(0, 2));
  const waitingLine = ((await list(W.id, W.officer))?.people ?? []).flatMap((p) => p.waiting).find((x) => x.document.key === MARRIAGE);
  const wr = waitingLine ? await call("POST", `/runtime/checklist-lines/${waitingLine.id}/providers`, { providers: [W.subjects["Sample Client A"]], reason: "Before the answer." }, W.officer) : { status: 0, body: "no waiting marriage line" };
  ok("C6.14-24b fail (BR-6, review minor 2): a line still waiting for an answer has no providers to change (404 in words)", wr.status === 404 && /No such checklist line/.test(words(wr)), [wr.status, words(wr)]);
  const passLine = linesOf(await list(B.id, B.officer), PASSPORT)[0];
  r = passLine ? await change({ providers: [P], reason: "Per person." }, B.officer, passLine.id) : { status: 0, body: "no passport line" };
  ok("C6.14-25 fail (BR-2, BR-6): a per-person line has no providers to change (422)", r.status === 422 && /asked of each person/.test(words(r)), words(r));
  r = await change({ providers: [P], reason: "Spouse \ud83d only", version: item?.version });
  ok("C6.14-25b fail (break M1): a reason with half an emoji is refused in words (400) and nothing is stored", r.status === 400 && /cannot be stored/.test(words(r)) && sql(`select array_length(providers, 1) is null from checklist_line where id = '${item?.id}'`) === "t", words(r));
  r = await change({ providers: [P], reason: "Only the principal holds the original (Sample).", version: item?.version });
  ok("C6.14-26 pass (BR-6; SA-1B-214 r2): the case officer makes Sample Client A the only provider, with a reason", r.status === 200 && names(r.body?.providers) === "Sample Client A" && r.body?.providers_rule === "changed" && r.body?.providers_change?.reason === "Only the principal holds the original (Sample).", r.status === 200 ? r.body?.providers_words : words(r));
  const again = await change({ providers: [P], reason: "Same again.", version: r.body?.version });
  ok("C6.14-26b fail (break m5): the same people again is refused (409), nothing audited twice", again.status === 409 && /already provided by exactly these people/.test(words(again)), words(again));
  ok("C6.14-27 data (BR-6): stored on the item's row with the reason, and audited", sql(`select array_length(providers, 1) || '|' || providers_reason from checklist_line where id = '${item?.id}'`) === "1|Only the principal holds the original (Sample)." && Number(sql(`select count(*) from audit_event where entity = 'checklist line' and entity_key = '${item?.id}' and action = 'providers changed'`)) === 1);

  // A chosen person later shown to be under 18 is dropped on read, and the line says so (challenge M2).
  L = await list(B.id, B.officer);
  r = await change({ providers: [S], reason: "The spouse has it now.", version: linesOf(L, MARRIAGE)[0]?.version });
  await answer(B.id, S, "person.date_of_birth", yearsAgo(16), B.officer);
  m = linesOf(await list(B.id, B.officer), MARRIAGE);
  ok("C6.14-28 fail (BR-4, BR-6): a chosen provider whose corrected birth date shows 16 is dropped on read; the defaults apply and the line says the choice no longer applies",
    r.status === 200 && names(m[0]?.providers) === "Sample Client A" && m[0]?.providers_rule === "type_roles" && /no longer applies/.test(m[0]?.providers_words ?? ""), m.map((x) => x.providers_words));
  await answer(B.id, S, "person.date_of_birth", yearsAgo(38), B.officer);
  r = await change({ providers: null, reason: "Back to the document type's defaults.", version: linesOf(await list(B.id, B.officer), MARRIAGE)[0]?.version });
  ok("C6.14-29 pass (BR-6): the officer goes back to the defaults with a reason; both providers again", r.status === 200 && names(r.body?.providers) === "Sample Client A|Sample Spouse A" && r.body?.providers_rule === "type_roles" && r.body?.providers_change?.defaults === true, r.status === 200 ? r.body?.providers_words : words(r));
  r = await change({ providers: null, reason: "Again.", version: r.body?.version });
  ok("C6.14-30 fail (BR-6): going back to the defaults twice is refused (409, nothing to change)", r.status === 409, r.status);
});
