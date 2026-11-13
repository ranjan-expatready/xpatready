// QA-439 (P-498): engine/runtime/case.ts decidersFirst, the questionnaire's order rule, on small made-up lists: people in
// the case's order, each person's parts that hold a deciding question first, a part after the parts that decide it
// (another person's too), a question after the questions in its part that decide it; nothing else moves; a circle keeps
// its order. Pure: no server, no database.
//   tsx studio/tests/check_qa439_deciders_first.ts
import { decidersFirst, inPartOrder } from "../engine/runtime/case.ts";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  QA-439 rule: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d)}` : ""}`); };
type Q = { subjectId: string; section: string; fact: string };
const q = (subjectId: string, section: string, fact: string): Q => ({ subjectId, section, fact });
const show = (qs: Q[]) => qs.map((x) => `${x.subjectId}:${x.section}:${x.fact}`);
const rule = (deps: Record<string, string[]>) => (x: Q) => new Set(deps[`${x.subjectId}|${x.fact}`] ?? []);

// A child: military first (label order), personal details last; the birth date decides military.
const child = [q("k", "military", "served"), q("k", "military", "where"), q("k", "contact", "email"), q("k", "personal", "name"), q("k", "personal", "born")];
const childRule = rule({ "k|served": ["k|born"], "k|where": ["k|born"] });
ok("pass: the part that holds the birth date comes before the part it decides, and before the person's other parts",
  JSON.stringify(show(decidersFirst(child, childRule))) === JSON.stringify(["k:personal:name", "k:personal:born", "k:military:served", "k:military:where", "k:contact:email"]), show(decidersFirst(child, childRule)));
ok("fail: with no deciding question nothing moves", JSON.stringify(show(decidersFirst(child, () => new Set()))) === JSON.stringify(show(child)));

// Inside a part: "other" before the purpose it depends on moves after it; the rest keeps its place.
const visit = [q("c", "visit", "from"), q("c", "visit", "purpose_other"), q("c", "visit", "to"), q("c", "visit", "purpose")];
const v = show(decidersFirst(visit, rule({ "c|purpose_other": ["c|purpose"] })));
ok("pass: inside a part, a question moves only to just before the first question it decides", JSON.stringify(v) === JSON.stringify(["c:visit:from", "c:visit:purpose", "c:visit:purpose_other", "c:visit:to"]), v);

// Another person's answer: the application's custodianship part is decided by the student's birth date.
const two = [q("c", "custody", "host"), q("p", "work", "job"), q("p", "personal", "born")];
const t = show(decidersFirst(two, rule({ "c|host": ["p|born"] }), (id) => (id === "c" ? -1 : 0)));
ok("pass: a part decided by another person's answer comes after the part that holds it", JSON.stringify(t) === JSON.stringify(["p:personal:born", "c:custody:host", "p:work:job"]), t);

// People in the case's order, never by id; a relative right after the person they belong to.
const ids = [q("z-child", "a", "x"), q("a-principal/parent_1", "a", "x"), q("m-spouse", "a", "x"), q("a-principal", "a", "x")];
const rank = (id: string) => ({ "a-principal": 0, "m-spouse": 1, "z-child": 2 } as Record<string, number>)[id.split("/")[0]] + (id.includes("/") ? 0.5 : 0);
const r = show(decidersFirst(ids, () => new Set(), rank));
ok("pass: people come in the case's order, a relative after their person", JSON.stringify(r) === JSON.stringify(["a-principal:a:x", "a-principal/parent_1:a:x", "m-spouse:a:x", "z-child:a:x"]), r);

// The author's order (C4.1) first; a deciding part next; a part the author put before its decider still moves after it.
const auth = [q("k", "contact", "email"), q("k", "consent", "sign"), q("k", "military", "served"), q("k", "personal", "born")];
const a1 = show(decidersFirst(auth, rule({ "k|served": ["k|born"] }), () => 0, (sec) => sec === "consent"));
ok("pass: the author's chosen sections keep their order and come first; then the deciding part, then the rest", JSON.stringify(a1) === JSON.stringify(["k:consent:sign", "k:personal:born", "k:contact:email", "k:military:served"]), a1);
const a2 = show(decidersFirst(auth, rule({ "k|sign": ["k|born"] }), () => 0, (sec) => sec === "consent"));
ok("fail: a chosen section decided by another part's answer is never asked before it", JSON.stringify(a2) === JSON.stringify(["k:personal:born", "k:consent:sign", "k:contact:email", "k:military:served"]), a2);

// A circle (each decides the other) keeps its order and loses nothing.
const circle = [q("k", "s1", "a"), q("k", "s2", "b")];
const c = show(decidersFirst(circle, rule({ "k|a": ["k|b"], "k|b": ["k|a"] })));
ok("fail: a circle of deciders keeps its order, every question once", JSON.stringify(c) === JSON.stringify(["k:s1:a", "k:s2:b"]), c);
ok("fail: a decider no question holds (answered elsewhere, not asked) moves nothing", JSON.stringify(show(decidersFirst(child, rule({ "k|served": ["k|gone"] })))) === JSON.stringify(show(child)));

// One order while the client answers: parts follow the given order; a part it does not name stays after its predecessor.
const now = [q("k", "b", "1"), q("k", "new", "1"), q("k", "a", "1"), q("k", "a", "2")];
const o = show(inPartOrder(now, ["k|a", "k|b"]));
ok("pass: parts follow the order given (the questions inside a part keep theirs); a part it does not name stays after the part before it", JSON.stringify(o) === JSON.stringify(["k:a:1", "k:a:2", "k:b:1", "k:new:1"]), o);

// Lead 28 (#1643, CI on the merge with main): a part's screening questions (answers a form waits for: the date of birth,
// the marital status) come together before the first question of the part any of them takes away. The residence country
// is taken away by the marital status only (the common-law form), yet the birth date that comes later in the part must
// not come after it; the rest of the part keeps its place.
const spouse = [q("s", "personal", "name"), q("s", "personal", "marital"), q("s", "personal", "residence"), q("s", "personal", "other"), q("s", "personal", "born"), q("s", "personal", "city")];
const spouseRule = rule({ "s|residence": ["s|marital"] });
const screens = (x: Q) => x.fact === "marital" || x.fact === "born";
const sp = show(decidersFirst(spouse, spouseRule, () => 0, () => false, screens));
ok("pass: the part's screening questions (marital status, birth date) come together before the first question either takes away",
  JSON.stringify(sp) === JSON.stringify(["s:personal:name", "s:personal:marital", "s:personal:born", "s:personal:residence", "s:personal:other", "s:personal:city"]), sp);
const sp0 = show(decidersFirst(spouse, spouseRule));
ok("fail-before: without the screening rule the birth date stays after the residence the marital status takes away", sp0.indexOf("s:personal:born") > sp0.indexOf("s:personal:residence"), sp0);
ok("pass: a part none of whose questions a screening question takes away keeps its order", JSON.stringify(show(decidersFirst(spouse, () => new Set(), () => 0, () => false, screens))) === JSON.stringify(show(spouse)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
