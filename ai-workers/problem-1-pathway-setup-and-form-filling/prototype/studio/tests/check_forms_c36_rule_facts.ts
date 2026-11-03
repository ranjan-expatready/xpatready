// C3.6 (P-158 (5), plan-p158.md §5; forms lane): "Add the fact this rule needs". A fact a rule reads that no form asks and
// the library lacks is listed with its rules; a person names the rule, the fact's name, meaning and answer type, and the
// rules write one `field` proposal through the one door. Accepting it lands the field under the key the rule reads, with
// "Needed by rule …" as its source and an ADD waiting for a second person. A passing and a failing check per rule.
// On an isolated copy with the sample inputs loaded (the demo is never touched). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c36 4461 start && tsx studio/tests/check_forms_c36_rule_facts.ts 4461 xr_studio_forms_c36
import { execFileSync } from "node:child_process";
import { factsRead, missingRuleFacts, type RuleRef } from "../api/src/rule-facts.ts";

const PORT = Number(process.argv[2] ?? 4461), DB = process.argv[3] ?? "xr_studio_forms_c36";
let pass = 0, failed = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const msg = (r: Res) => String(r.body?.message ?? r.body?.detail ?? r.body);

(async () => {
  // ─────────────────── the pure part: which facts a rule reads, and which of them are missing
  const tree = { op: "and", args: [{ field: "person.a", op: "eq", value: 1 }, { op: "not", arg: { field: "person.b", op: "eq", value: true } }] };
  ok("C3.6 pass: a rule's facts are read through and, or and not", JSON.stringify(factsRead(tree).sort()) === JSON.stringify(["person.a", "person.b"]), factsRead(tree));
  const rr: RuleRef[] = [{ kind: "rule", key: "r1", sentence: "Rule r1: test", tree }, { kind: "check", key: "k1", sentence: "Check k1: test", tree: { field: "person.c", op: "eq", value: 1 } }];
  const m = missingRuleFacts(rr, new Set(["person.a"]), new Set(["person.c"]));
  ok("C3.6 fail: a fact in the library or a derived fact is not missing; only person.b is", m.length === 1 && m[0].fact === "person.b" && m[0].rules[0].key === "r1", m);

  await call("POST", "/demo/reset", { confirm: "RESET" }); // its own copy only: a re-run starts from the sample inputs
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  const combo = sql("select c.id from combination c join sqr_section_selection s on s.combination_id = c.id order by c.label limit 1");
  const ws = `(select workspace_id from combination where id='${combo}')`;
  const derived = sql("select derived_key from derived_field order by derived_key limit 1");
  const rule = (key: string, json: string, then: string) => sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, when_plain, then_plain, for_whom, version, status, origin, updated_by) values (gen_random_uuid(), ${ws}, '${combo}', '${key}', '${json}', 'when the test says so', '${then}', 'principal', 1, 'PUBLISHED', 'HUMAN', 'user-A')`);
  rule("r_c36_refusal", `{"op":"and","args":[{"field":"person.c36_refused_visa","op":"eq","value":true},{"field":"person.family_name","op":"exists"}]}`, "ask for the refusal letter");
  rule("r_c36_other", `{"field":"person.family_name","op":"exists"}`, "nothing new");
  if (derived) rule("r_c36_derived", `{"field":"${derived}","op":"gte","value":18}`, "a derived test");

  // ─────────────────── the list: facts a rule needs that no form asks
  let r = await call("GET", `/combinations/${combo}/rule-facts`);
  const row = (r.body?.facts ?? []).find((f: { fact: string }) => f.fact === "person.c36_refused_visa");
  ok("C3.6 pass: a fact a rule reads and the library lacks is listed, with the rule's key and sentence", r.status === 200 && row?.rules?.[0]?.key === "r_c36_refusal" && /^Rule r_c36_refusal: when the test says so, then ask for the refusal letter$/.test(row.rules[0].sentence) && row.waitingProposal === null, row);
  ok("C3.6 fail: a fact the library has (person.family_name) is not listed", !(r.body?.facts ?? []).some((f: { fact: string }) => f.fact === "person.family_name"));
  ok("C3.6 fail: a derived fact is not listed (it is worked out, not asked)", !derived || !(r.body?.facts ?? []).some((f: { fact: string }) => f.fact === derived), derived);
  ok("C3.6 pass: the list offers the library's answer types", Array.isArray(r.body?.types) && r.body.types.includes("yes_no"));
  r = await call("GET", `/combinations/00000000-0000-0000-0000-000000000000/rule-facts`);
  ok("C3.6 fail: an unknown combination is 404", r.status === 404, r.status);

  // ─────────────────── the add: only by naming a rule that reads the fact
  const good = { fact: "person.c36_refused_visa", rule: "r_c36_refusal", label: "Refused a visa before", meaning: "Whether this person was ever refused a visa or permit by any country.", valueType: "yes_no" };
  const before = Number(sql("select count(*) from proposal_item"));
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, rule: undefined });
  ok("C3.6 fail: with no rule named the add is refused (400), saying why", r.status === 400 && /Name the rule that needs this fact/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, rule: "r_no_such_rule" });
  ok("C3.6 fail: a rule this combination does not have is refused (400)", r.status === 400 && /No condition, rule or check "r_no_such_rule"/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, rule: "r_c36_other" });
  ok("C3.6 fail: a rule that does not read the fact is refused (400)", r.status === 400 && /does not read person\.c36_refused_visa/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, fact: "person.family_name", rule: "r_c36_refusal" });
  ok("C3.6 fail: a fact already in the library is refused (409)", r.status === 409 && /already in the library/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, valueType: "colour" });
  ok("C3.6 fail: an answer type outside the library's is refused (400)", r.status === 400 && /Choose the answer type/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, meaning: "short" });
  ok("C3.6 fail: a meaning shorter than a sentence is refused (400)", r.status === 400 && /Say what the fact means/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, key: "person.typed" });
  ok("C3.6 fail: a typed key is refused (keys are never typed, P-34)", r.status === 400, [r.status, msg(r)]);
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, label: "Family name" });
  ok("C3.6 fail: a name the library already has (identity rule) is refused (409)", r.status === 409 && /already in the library as/.test(msg(r)), [r.status, msg(r)]);
  r = await call("POST", `/combinations/${combo}/rule-facts`, good, "user-B");
  ok("C3.6 fail: a person without the author duty cannot add (403)", r.status === 403, [r.status, msg(r)]);
  ok("C3.6 fail: every refused add wrote nothing", Number(sql("select count(*) from proposal_item")) === before);

  // Review c36 M2: three adds of the same fact at once make one proposal; the other two are refused (409).
  const three = await Promise.all([0, 1, 2].map(() => call("POST", `/combinations/${combo}/rule-facts`, good)));
  r = three.find((x) => x.status === 201) ?? three[0];
  const pid = r.body?.proposalId;
  ok("C3.6 pass: naming the rule writes one proposal (201)", r.status === 201 && typeof pid === "string" && r.body.rule?.key === "r_c36_refusal", [r.status, r.body]);
  ok("C3.6 fail (M2): three parallel adds of one fact leave one waiting proposal; the others are 409", three.filter((x) => x.status === 201).length === 1 && three.filter((x) => x.status === 409).length === 2 && Number(sql("select count(*) from proposal_item where step='rule_fact' and status='waiting'")) === 1, three.map((x) => x.status));
  const p = JSON.parse(sql(`select row_to_json(x) from (select kind, step, origin, lands_on, confidence, basis, source, payload, work from proposal_item where id='${pid}') x`) || "{}");
  ok("C3.6 pass: it is a rules item for the library, Check and Sample, its source the rule (key and sentence)", p.kind === "field" && p.step === "rule_fact" && p.origin === "rules" && p.lands_on === "library" && p.confidence === "check" && p.basis === "SAMPLE" && p.source?.rule?.key === "r_c36_refusal" && /^Rule r_c36_refusal/.test(p.source?.quote) && p.work?.ruleFact === "person.c36_refused_visa", p);
  ok("C3.6 pass: the proposal carries the name, meaning and type the person gave, and no key", p.payload?.label === good.label && p.payload?.meaning === good.meaning && p.payload?.valueType === "yes_no" && p.payload?.subject === "person" && !("key" in (p.payload ?? {})), p.payload);
  ok("C3.6 pass: the activity log says who proposed which fact for which rule", /proposed the fact person\.c36_refused_visa .* for Rule r_c36_refusal/.test(sql(`select summary from audit_event where entity='rule fact' order by at desc limit 1`)));
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, label: "Refused a visa (again)" });
  ok("C3.6 fail: a second add of the same fact while one waits is refused (409)", r.status === 409 && /already waiting/.test(msg(r)), [r.status, msg(r)]);
  r = await call("GET", `/combinations/${combo}/rule-facts`);
  ok("C3.6 pass: the list shows the waiting proposal on its fact", (r.body?.facts ?? []).find((f: { fact: string }) => f.fact === "person.c36_refused_visa")?.waitingProposal === pid);
  r = await call("GET", "/review/proposals");
  let listed = false;
  for (const g of (r.body?.groups ?? []) as { id: string; kind: string }[]) if (g.kind === "combination" && !listed) listed = JSON.stringify((await call("GET", `/review/proposals?group=${encodeURIComponent(g.id)}`)).body?.group?.bands?.check ?? []).includes(pid);
  ok("C3.6 pass: it waits on To review › Proposals under its combination, in Check (one door)", r.status === 200 && listed, r.body?.groups?.length);

  // ─────────────────── accepting it: the rule's own key, "Needed by rule", a second person still approves
  r = await call("POST", "/review/proposals/decide", { ids: [pid], action: "accept" }, "user-C");
  ok("C3.6 pass: accepting lands the field under the key the rule reads", r.status === 201 && r.body?.items?.[0]?.landedAs === "person.c36_refused_visa", [r.status, r.body]);
  const f = sql("select status || '|' || value_type || '|' || coalesce(label,'') from canonical_field where canonical_field_key='person.c36_refused_visa'");
  ok("C3.6 pass: the field is a draft of the given type and name", f === "DRAFT|yes_no|Refused a visa before", f);
  ok("C3.6 pass: a second person still approves it (an ADD waits)", sql("select status from library_change where key='person.c36_refused_visa' and kind='field'") === "WAITING");
  r = await call("GET", "/library/fields/person.c36_refused_visa/sources");
  ok("C3.6 pass: its source reads \"Needed by Rule r_c36_refusal: …\" (the key once)", r.status === 200 && r.body.sources?.some((s: { kind: string; text: string }) => s.kind === "rule" && /^Needed by Rule r_c36_refusal: when the test says so/.test(s.text)) && r.body.unsourced === false, r.body.sources);
  r = await call("GET", `/combinations/${combo}/rule-facts`);
  ok("C3.6 fail: once in the library the fact is no longer listed", !(r.body?.facts ?? []).some((x: { fact: string }) => x.fact === "person.c36_refused_visa"));
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...good, label: "Refused a visa (third)" });
  ok("C3.6 fail: adding it again is refused: it is in the library (409)", r.status === 409 && /already in the library/.test(msg(r)), [r.status, msg(r)]);

  // ─────────────────── P-223 option (a): a draft rule saved through the product may read a fact the library lacks
  r = await call("POST", `/combinations/${combo}/rules`, { condition: { subjectKind: "EACH_APPLICANT", op: "and", args: [{ field: "person.c36_new_fact", op: "eq", value: true }] }, whenPlain: "the person has the new fact", thenPlain: "ask for its proof", forWhom: "principal_applicant" });
  ok("C3.6 pass (P-223 a): a draft rule reading a fact the library lacks saves through the product (no SQL)", r.status < 300, [r.status, msg(r)]);
  r = await call("GET", `/combinations/${combo}/rule-facts`);
  ok("C3.6 pass (P-223 a): that fact is then listed under Facts a rule needs", (r.body?.facts ?? []).some((x: { fact: string }) => x.fact === "person.c36_new_fact"));
  r = await call("GET", `/combinations/${combo}`);
  const flagged = (r.body?.draft?.problems ?? []).find((x: { level: string; message: string }) => /person\.c36_new_fact, which is not in the library/.test(x.message));
  ok("C3.6 pass (P-223 a): release validation still flags it as an error that blocks release", flagged?.level === "error", flagged ?? r.status);
  r = await call("POST", `/combinations/${combo}/rules`, { condition: { subjectKind: "EACH_APPLICANT", op: "and", args: [{ field: "person.family_name", op: "gt", value: 3 }] }, whenPlain: "x", thenPlain: "y", forWhom: "principal_applicant" });
  ok("C3.6 fail (P-223 a): any other condition error still refuses the save (a text field compared with >)", r.status === 400 && /compares person\.family_name/.test(msg(r)), [r.status, msg(r)]);

  // ─────────────────── review c36 r2 MA1: the Day-0 add builds its key at landing, from the item as decided
  const rk = sql(`select predicate_key from predicate where combination_id='${combo}' and status <> 'RETIRED' order by predicate_key limit 1`);
  const F = { meaning: "A fact a test needs, in a sentence (Sample).", valueType: "text", subject: "person" };
  // QA-192 (P-120, P-149 (2)): two facts with one meaning are near duplicates and need a person's reason, so each fact
  // below says what it means in its own words.
  const own = (label: string) => ({ ...F, label, meaning: `Whether the applicant has a ${label.toLowerCase()} (Sample).` });
  const retired = sql(`select canonical_field_key || '|' || label from canonical_field where status in ('DRAFT','PUBLISHED') and label is not null and canonical_field_key like 'person.%' and canonical_field_key <> 'person.family_name' order by canonical_field_key limit 1`).split("|");
  sql(`update canonical_field set status='RETIRED' where canonical_field_key='${retired[0]}'`);
  r = await call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rk)}/fact`, { ...F, label: retired[1] });
  ok("C3.6 fail (MA1): a retired field's name is refused now, in words, naming the field to restore (409)", r.status === 409 && msg(r).includes(retired[0]) && /restore/i.test(msg(r)), [r.status, msg(r)]);
  const a1 = await call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rk)}/fact`, own("Résumé gap"));
  const a2 = await call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rk)}/fact`, own("Resume gap"));
  const d2 = [await call("POST", "/review/proposals/decide", { ids: [a1.body?.proposalId], action: "accept" }, "user-C"), await call("POST", "/review/proposals/decide", { ids: [a2.body?.proposalId], action: "accept" }, "user-C")];
  const keys = d2.map((d) => d.body?.items?.[0]?.landedAs);
  ok("C3.6 pass (MA1): two names that build one key both land, under two keys", d2.every((d) => d.status === 201) && keys[0] && keys[1] && keys[0] !== keys[1], [d2.map((d) => d.status), keys, d2.map(msg)]);
  const e = await call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rk)}/fact`, own("Visa refused before"));
  const ep = sql(`select payload from proposal_item where id='${e.body?.proposalId}'`);
  r = await call("POST", "/review/proposals/decide", { ids: [e.body?.proposalId], action: "edit", payload: { ...JSON.parse(ep), label: "Sponsor earlier refusal", meaning: "Whether the sponsor was refused before (Sample).", subject: "sponsor" } }, "user-C");
  ok("C3.6 pass (MA1): an edit at accept lands under the edited name and subject", r.status === 201 && /^sponsor\.sponsor_earlier_refusal/.test(r.body?.items?.[0]?.landedAs ?? ""), [r.status, r.body?.items?.[0]?.landedAs ?? msg(r)]);

  // ─────────────────── review c36 r3 MA3: a rule reading a retired field is offered no add that can never land
  const ret = sql(`select canonical_field_key from canonical_field where status in ('DRAFT','PUBLISHED') and canonical_field_key like 'person.%' and canonical_field_key not in ('person.family_name') order by canonical_field_key desc limit 1`);
  r = await call("POST", `/combinations/${combo}/rules`, { condition: { subjectKind: "EACH_APPLICANT", op: "and", args: [{ field: ret, op: "exists" }] }, whenPlain: "the retired fact is given", thenPlain: "a test", forWhom: "principal_applicant" });
  const rkRet = r.body?.key ?? r.body?.predicate_key ?? sql(`select predicate_key from predicate where combination_id='${combo}' and then_plain='a test' limit 1`);
  sql(`update canonical_field set status='RETIRED' where canonical_field_key='${ret}'`);
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: ret, rule: rkRet, label: "A retired fact c36", meaning: "A fact that was retired, for a test (Sample).", valueType: "text" });
  ok("C3.6 fail (MA3): adding a retired field a rule reads is refused, saying to restore it (409)", r.status === 409 && /retired/.test(msg(r)) && /restore/i.test(msg(r)), [r.status, msg(r)]);
  sql(`update canonical_field set status='DRAFT' where canonical_field_key='${ret}'`);

  // ─────────────────── review c36 r2 MA2: one waiting item per name across the workspace, even in parallel
  const other = sql(`select id from combination where id <> '${combo}' order by label limit 1`);
  const made = await call("POST", `/combinations/${other}/rules`, { condition: { subjectKind: "EACH_APPLICANT", op: "and", args: [{ field: "person.family_name", op: "exists" }] }, whenPlain: "a family name is given", thenPlain: "nothing new", forWhom: "principal_applicant" });
  ok("setup (MA2): a second combination has a rule, saved through the product", made.status < 300, [made.status, msg(made)]);
  const ok2 = sql(`select predicate_key from predicate where combination_id='${other}' and status <> 'RETIRED' order by predicate_key limit 1`);
  const par = await Promise.all([call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rk)}/fact`, { ...F, label: "Parallel fact c36" }), call("POST", `/combinations/${other}/rules/${encodeURIComponent(ok2)}/fact`, { ...F, label: "Parallel fact c36" })]);
  ok("C3.6 fail (MA2): the same name added at once on two combinations makes one waiting item (201 + 409)", !!other && par.map((x) => x.status).sort().join(",") === "201,409" && sql(`select count(*) from proposal_item where status='waiting' and payload->>'label'='Parallel fact c36'`) === "1", [other, par.map((x) => x.status)]);

  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
