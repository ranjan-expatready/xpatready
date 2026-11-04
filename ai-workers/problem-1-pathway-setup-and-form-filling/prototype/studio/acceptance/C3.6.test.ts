// C3.6 acceptance (P-220 pack 2; P-158 supersedes the free "Describe what you need" add of P-34/P-53; P-95, P-149 (2)):
// nothing enters the library by hand. The one person path left is "Add the fact this rule needs": the person names the
// rule and says the fact in words; the system builds the key (never typed) and the item waits in the one review queue as
// a rules item resting on that rule, with the same duplicate checks as AI items. The AI meaning check stays off by default
// (P-95): the item says "not meaning-checked". No AI (US$0).
// Today the free adds answer 410 (built) but there is no rule-fact add, so this fails.
// ROUTE (proposed; Question for the tech lead): POST /combinations/:id/rules/:key/fact {label, meaning, valueType, subject}.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C3.6.test.ts 4440 xr_studio_accept
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C3.6");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const before = T.spent();
  // ---------------------------------------------------------------- P-158: the free adds stay closed
  for (const [path, body] of [["/library/fields", { key: "person.shoe_size", meaning: "Shoe size" }], ["/library/sections", { title: "Shoes" }], ["/library/answer-lists", { label: "Sizes", values: [{ code: "s", label: "S" }] }]] as const) {
    const r = await call("POST", path, body, AUTHOR);
    ok(`C3.6 pass: ${path} by hand is gone (410, in words)`, r.status === 410 && /by hand/i.test(String(r.body?.title ?? "") + words(r)), r.status);
  }
  // ---------------------------------------------------------------- the rule-fact add
  // A rule to name: on Visitor visa of the six that needs C4.11's conditions first; meanwhile `wp.family` (fixture).
  const wp = T.combo(T.key("vv.single"));
  // B72 (P-318 (6), P-322): on the six the questions, the library's fields and the rule come from people's own steps
  // (acceptance/lib/pack2.ts needQuestions, ruleBySteps); on the fixture they are there already.
  await T.needQuestions(wp);
  await T.ruleBySteps(wp);
  const rule = (await call("GET", `/combinations/${wp}/config?mode=draft`)).body?.snapshot?.rules?.[0];
  const key = rule?.key ?? rule?.id;
  if (!key) { console.error(`STOP  setup missing: the combination has no rule yet (Visitor visa needs C4.11 first). Meanwhile: tsx <test> ${T.PORT} ${T.DB} wp.family on a fresh copy.`); process.exit(2); }
  const ROUTE = `/combinations/${wp}/rules/${encodeURIComponent(key ?? "R-01")}/fact`;
  const fact = { label: "Date the job offer was signed", meaning: "The date the employer and the person signed the offer of employment (Sample).", valueType: "date", subject: "person" };
  let r = await call("POST", ROUTE, { ...fact, key: "person.offer_signed_on" }, AUTHOR);
  ok("C3.6 fail: a typed key is refused (400: the system builds the key, P-34)", r.status === 400 && /key/i.test(words(r)), r.status >= 300 ? words(r) : r.status);
  r = await call("POST", `/combinations/${wp}/rules/no_such_rule/fact`, fact, AUTHOR);
  ok("C3.6 fail: a fact for a rule that does not exist is refused (404, in words)", r.status === 404 && !/^Cannot POST/.test(words(r)), words(r));
  r = await call("POST", ROUTE, fact, "user-B");
  ok("C3.6 fail: only an author adds (approver 403)", r.status === 403, r.status);
  r = await call("POST", ROUTE, fact, AUTHOR);
  ok("C3.6 pass: the fact this rule needs is proposed (201)", r.status === 201, r.status >= 300 ? words(r) : r.status);
  const it = sql(`select origin||'|'||kind||'|'||lands_on||'|'||coalesce(source->'rule'->>'key','')||'|'||status from proposal_item where payload->>'label'='${fact.label}' order by created_at desc limit 1`);
  ok("C3.6 pass: it waits in the one queue as a rules field landing on the library, resting on the rule it names (P-158 (5))", it === `rules|field|library|${key}|waiting`, it);
  ok("C3.6 pass: it says it was not meaning-checked (P-95: the AI check is off by default)", r.status === 201 && r.body?.meaningChecked === false, r.body);
  ok("C3.6 pass: the key is built by the system as subject.attribute (never typed)", /^person\.[a-z0-9_]+$/.test(String(r.body?.key ?? r.body?.proposedKey ?? "")), r.body);
  ok("C3.6 pass: nothing is in the library yet (a second person approves after acceptance)", r.status === 201 && sql(`select count(*) from canonical_field where label='${fact.label}'`) === "0");
  // Same duplicate rules as an AI item (P-149 (2)): the exact name of a live field is refused, saying which; a near one
  // needs its one-line reason.
  const live = sql("select canonical_field_key||'|'||label from canonical_field where status in ('DRAFT','PUBLISHED') and label is not null order by canonical_field_key limit 1").split("|");
  ok("setup: the library has a live field to collide with", !!live[1], live);
  r = await call("POST", ROUTE, { ...fact, label: `${live[1]} at birth` }, AUTHOR);
  ok("C3.6 fail: a near duplicate (a live field's name plus words) without a reason is refused (400, asking why it is not the same)", r.status === 400 && /why|reason|not the same/i.test(words(r)), words(r));
  r = await call("POST", ROUTE, { ...fact, label: `${live[1]} at birth`, nearReason: "The name at birth, which can differ from today's (Sample)." }, AUTHOR);
  ok("C3.6 pass: with its reason the near duplicate is proposed, the reason kept for the second person", r.status === 201 && sql(`select identity->>'nearReason' from proposal_item where payload->>'label'='${live[1]} at birth' limit 1`).length > 3, r.status >= 300 ? words(r) : undefined);
  r = await call("POST", ROUTE, { ...fact, label: live[1] }, AUTHOR);
  ok("C3.6 fail: a fact whose name is a live library field is refused (409, naming the existing field and where it is used)", r.status === 409 && words(r).includes(live[0]) && /used (by|in|on)|combination|IMM \d{4}/i.test(words(r)), words(r));
  r = await call("POST", ROUTE, fact, AUTHOR);
  ok("C3.6 fail: the same fact twice is one item (409)", r.status === 409, words(r));
  // P-158: a document type named while adding a requirement line is proposed to the library, never written by hand.
  // SHAPE (proposed): POST /combinations/:id/requirements {documentTypeName, appliesToRoles, attachMode} with a name the
  // library lacks answers 202 with the waiting proposal's id.
  const types0 = sql("select count(*) from document_type");
  r = await call("POST", `/combinations/${wp}/requirements`, { documentTypeName: "Proof of hotel booking (Sample)", appliesToRoles: "each_applicant", attachMode: "COMBINATION_MANDATORY" }, AUTHOR);
  ok("C3.6 pass: a new document type named while adding a requirement waits as a library proposal; no document type row is written", r.status === 202 && !!r.body?.proposalId && sql("select count(*) from document_type") === types0 && sql(`select count(*) from proposal_item where kind='document_type' and payload->>'name'='Proof of hotel booking (Sample)'`) === "1", { status: r.status, body: words(r) || r.body });
  ok("C3.6 pass: US$0", T.spent() === before);
  T.done();
});
