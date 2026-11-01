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
  const wp = T.combo("wp.family");
  const rule = (await call("GET", `/combinations/${wp}/config?mode=draft`)).body?.snapshot?.rules?.[0];
  const key = rule?.key ?? rule?.id;
  ok("setup: Work permit (family) has a rule to name", !!key, key);
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
  ok("C3.6 pass: it says it was not meaning-checked (P-95: the AI check is off by default)", /not meaning-checked/i.test(JSON.stringify(r.body ?? {})) || sql(`select count(*) from proposal_item where payload->>'label'='${fact.label}' and rules::text ilike '%meaning%'`) !== "0");
  ok("C3.6 pass: the key is built by the system as subject.attribute (never typed)", /^person\.[a-z0-9_]+$/.test(String(r.body?.key ?? r.body?.proposedKey ?? "")), r.body);
  ok("C3.6 pass: nothing is in the library yet (a second person approves after acceptance)", r.status === 201 && sql(`select count(*) from canonical_field where label='${fact.label}'`) === "0");
  // Same duplicate rules as an AI item (P-149 (2)): the exact name of a live field is refused, saying which.
  r = await call("POST", ROUTE, { ...fact, label: sql("select label from canonical_field where canonical_field_key='person.family_name'") }, AUTHOR);
  ok("C3.6 fail: a fact whose name is a live library field is refused (409, naming person.family_name)", r.status === 409 && /person\.family_name/.test(words(r)), words(r));
  r = await call("POST", ROUTE, fact, AUTHOR);
  ok("C3.6 fail: the same fact twice is one item (409)", r.status === 409, words(r));
  ok("C3.6 pass: US$0", T.spent() === before);
  T.done();
});
