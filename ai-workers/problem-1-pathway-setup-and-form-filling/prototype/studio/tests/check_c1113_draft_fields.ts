// C11.13 "Draft fields" (S6 plan slice 1b item 6, P-138, P-120, P-121; forms lane): the route and the queue items of the
// one AI step of field-drafts.ts. First the pure conversion of two readings into field proposals (a passing and a
// failing case per rule), then the route on an isolated copy with the sample inputs loaded: what it offers, the refusals,
// a saved draft (both rounds, then the draft round alone) onto To review › Proposals once per edition, and accepting one.
// Saved readings are written for this check into p2/runs and removed after. NO model call (US$0): live is refused.
//   C11.13 drafted once per edition, matched reuse or new · C11.8 replay at US$0 · P-138 live only on a click (off here)
//   zsh studio/tools/isolated.sh forms_c1113df 4451 start && tsx studio/tests/check_c1113_draft_fields.ts 4451
import { sampleEditions, type FieldMapOutput } from "../api/src/field-drafts.ts";
import { fieldItems, fieldRule, labelOf, uniqueLabel, type ReadingOf } from "../api/src/field-draft-items.ts";
import { normalizeLabel } from "../contracts/programs.ts";
import { fieldMap, savedReadings } from "./field_draft_fixtures.ts";

const PORT = Number(process.argv[2] ?? 4451);
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
type F = FieldMapOutput["canonical_fields"][number];
const out = fieldMap;
const reading = (o: FieldMapOutput, runFile = "prototype/p2/runs/x.json"): ReadingOf => ({ output: o, from: "replay", runFile, costUsd: 0 });
const ED = { printed: "IMM 0000 (01-2026)", file: "imm0000e.pdf", sha256: "a".repeat(64), formText: "Family name · Given name(s) · Date of birth (YYYY-MM-DD) · Country of birth" };

(async () => {
  // ─────────────────── the conversion (pure)
  const fam: F = { id: "person.family_name", meaning: "The person's family name", value_type: "text" };
  const dob: F = { id: "person.date_of_birth", meaning: "The person's date of birth", value_type: "date" };
  const cob: F = { id: "person.country_of_birth", meaning: "The country the person was born in", value_type: "country" };
  const q = { "person.family_name": "Family name", "person.date_of_birth": "Date of birth (YYYY-MM-DD)", "person.country_of_birth": "Country of birth" };
  ok("C11.13 pass: a field name an area and a name, with a meaning and a type, passes the rules", fieldRule(fam) === null);
  ok("C11.13 fail: a field with no area, or with no meaning, fails the rules with its reason", /not a field name/.test(fieldRule({ ...fam, id: "FamilyName" }) ?? "") && /no meaning/.test(fieldRule({ ...fam, meaning: "" }) ?? ""));
  ok("C11.13 pass: a person's or the case's field is named in words; another area keeps its name", labelOf("person.family_name") === "Family name" && labelOf("sponsor.family_name") === "Family name (sponsor)");

  let r = fieldItems(reading(out(ED.printed, [fam, dob], q)), reading(out(ED.printed, [fam, dob], q)), ED, []);
  const famItem = r.items.find((i) => (i.work as { proposedKey: string }).proposedKey === "person.family_name")!;
  ok("P-121 pass: both rounds read a new field the same way and its words are on the form → Ready, agreed, new, both readings kept", famItem.confidence === "ready" && famItem.agreement === "agreed" && famItem.reuse.match === "new" && !!famItem.rounds.draft && !!famItem.rounds.check && famItem.source?.quoteFound === true && famItem.step === "field_map_edition" && famItem.scope.formEdition === ED.printed, famItem);
  r = fieldItems(reading(out(ED.printed, [fam, dob], q)), reading(out(ED.printed, [fam, { ...dob, value_type: "text" }], q)), ED, []);
  const dobDiffer = r.items.find((i) => (i.work as { proposedKey: string }).proposedKey === "person.date_of_birth")!;
  ok("P-121 fail: the rounds read a field's type differently → Decide, both readings kept, the reason says so", dobDiffer.confidence === "decide" && dobDiffer.agreement === "differ" && /read it differently/.test(dobDiffer.reason ?? "") && /date/.test(dobDiffer.rounds.draft!.reading) && /text/.test(dobDiffer.rounds.check!.reading), dobDiffer);
  r = fieldItems(reading(out(ED.printed, [fam, dob], q)), null, ED, []);
  ok("P-121 fail (N1): with the draft round alone every field waits as Decide (one round), never Ready", r.items.length === 2 && r.items.every((i) => i.confidence === "decide" && i.agreement === "one_round" && i.rounds.check === null && /checker round has not been recorded/.test(i.reason ?? "")), r.items.map((i) => [i.confidence, i.agreement]));
  r = fieldItems(reading(out(ED.printed, [fam, { ...cob, id: "CountryOfBirth" }], q)), reading(out(ED.printed, [fam, { ...cob, id: "CountryOfBirth" }], q)), ED, []);
  ok("C11.13 fail: a reading that fails the rules is never proposed and is listed with its reason", r.items.length === 1 && r.dropped.length === 2 && /not a field name/.test(r.dropped[0].why), r.dropped);
  r = fieldItems(reading(out(ED.printed, [fam], { "person.family_name": "Surname of the sponsor's employer" })), reading(out(ED.printed, [fam], { "person.family_name": "Surname of the sponsor's employer" })), ED, []);
  ok("P-170 fail: the words the AI quoted are not printed on the form → Decide, the quote kept and marked not found", r.items[0].confidence === "decide" && r.items[0].source?.quoteFound === false && r.items[0].rules.some((x) => x.rule === "quote_on_the_form" && !x.passed), r.items[0]);
  const lib = [{ key: "person.family_name", meaning: "The person's family name", valueType: "text", status: "PUBLISHED" }, { key: "person.birth_country", meaning: "Country where the person was born", valueType: "country", status: "PUBLISHED" }];
  r = fieldItems(reading(out(ED.printed, [fam, cob], q)), reading(out(ED.printed, [fam, cob], q)), ED, lib);
  const reuse = r.items.find((i) => (i.work as { proposedKey: string }).proposedKey === "person.family_name")!, close = r.items.find((i) => (i.work as { proposedKey: string }).proposedKey === "person.country_of_birth")!;
  ok("C11.13 pass (P-120): a field the library already holds is matched reuse of that field, and stays Ready", reuse.reuse.match === "reuse" && reuse.reuse.existingKey === "person.family_name" && reuse.confidence === "ready", reuse.reuse);
  ok("C11.13 fail (P-120): a field close to a library field is never Ready; the near match and its one-line reason go with it", close.confidence !== "ready" && (close.identity.near.includes("person.birth_country") || close.reuse.existingKey === "person.birth_country") && !!(close.identity.nearReason ?? close.reason), { c: close.confidence, id: close.identity, reuse: close.reuse, reason: close.reason });
  r = fieldItems(reading(out(ED.printed, [fam, { ...fam, id: "case.family_name", meaning: "The family name the application is filed under" }], q)), null, ED, []);
  ok("C11.13 pass: two fields of one draft whose names would collide stay two items, the second named with its area (no system name)", r.items.length === 2 && new Set(r.items.map((i) => i.identity.key)).size === 2 && r.items.some((i) => i.payload.kind === "field" && i.payload.label === "Family name (case)"), r.items.map((i) => i.payload.kind === "field" && i.payload.label));
  // Break M1: names equal under the identity rule (spaces, dots and underscores do not count) or after the 120-character cut.
  const tricky: F[] = ["person.ab", "person.abpersonab", "person.a_b"].map((id) => ({ id, meaning: `Meaning of ${id}`, value_type: "text" }));
  r = fieldItems(reading(out(ED.printed, tricky, {})), null, ED, []);
  ok("C11.13 fail (break M1): names that differ only in spaces or dots never give two items one identity", r.items.length === 3 && new Set(r.items.map((i) => i.identity.key)).size === 3 && r.items.every((i) => i.payload.kind === "field" && i.payload.label.length <= 120), r.items.map((i) => i.payload.kind === "field" && i.payload.label));
  const longs: F[] = ["a", "b"].map((x) => ({ id: `person.${"x".repeat(70)}_${x}`, meaning: "A long one", value_type: "text" }));
  const t = new Set<string>(); const l1 = uniqueLabel(longs[0].id, t); t.add(normalizeLabel(l1)); const l2 = uniqueLabel(longs[1].id, new Set([...t, normalizeLabel(labelOf(longs[1].id).slice(0, 60))]));
  r = fieldItems(reading(out(ED.printed, longs, {})), null, ED, []);
  ok("C11.13 fail (break M1): two long names cut to the same 120 characters stay two items", r.items.length === 2 && new Set(r.items.map((i) => i.identity.key)).size === 2 && l1 !== l2, r.items.map((i) => i.identity.key.slice(-12)));
  ok("C11.13 fail (break M2): an area longer than 40 letters, a nested name, or an id over 80 characters fails the rules (it never reaches the contract)", !!fieldRule({ ...fam, id: `${"a".repeat(70)}.name` }) && !!fieldRule({ ...fam, id: "person.passport.number" }) && !!fieldRule({ ...fam, id: `person.${"n".repeat(80)}` }) && fieldRule({ ...fam, id: "relationship.date_of_marriage" }) === null);
  // Review M2: a new field close to a library field, kept distinct (another period), is Check, never Ready.
  const lib2 = [{ key: "person.previous_country_of_residence", meaning: "A country where the person lived before", valueType: "country", status: "PUBLISHED" }];
  const cor: F = { id: "person.country_of_residence", meaning: "The country where the person lives now", value_type: "country" };
  r = fieldItems(reading(out(ED.printed, [cor], { [cor.id]: "Country of birth" })), reading(out(ED.printed, [cor], { [cor.id]: "Country of birth" })), ED, lib2);
  ok("C11.13 fail (review M2): a new field with a near library match reads Check, with the match and its reason", r.items[0].reuse.match === "new" && r.items[0].confidence === "check" && r.items[0].identity.near.includes("person.previous_country_of_residence") && /kept distinct/.test(r.items[0].identity.nearReason ?? ""), { c: r.items[0].confidence, id: r.items[0].identity });
  r = fieldItems(reading(out(ED.printed, [cor], { [cor.id]: "Country of birth" })), reading(out(ED.printed, [cor], { [cor.id]: "Country of birth" })), ED, []);
  ok("C11.13 pass (review M2): the same field with nothing near it in the library is Ready", r.items[0].confidence === "ready", r.items[0].confidence);
  // Devin (#427): the checker round's quote counts too.
  r = fieldItems(reading(out(ED.printed, [fam], q)), reading(out(ED.printed, [fam], { "person.family_name": "Employee number" })), ED, []);
  ok("P-170 fail (both rounds): the checker quoted words not on the form → Decide, never Ready, and the reason names the checker round", r.items[0].confidence === "decide" && r.items[0].source?.quoteFound === false && /checker round quoted \("Employee number"\)/.test(r.items[0].reason ?? "") && r.items[0].source?.quote === "Employee number", { reason: r.items[0].reason, source: r.items[0].source });
  r = fieldItems(reading(out(ED.printed, [fam], q)), reading(out(ED.printed, [{ ...fam, meaning: "x" }], {})), ED, []);
  ok("P-170 pass (Devin #427): a checker reading dropped by the rules never fails the good reading's quote (one round, quote found)", r.items.length === 1 && r.items[0].agreement === "one_round" && r.items[0].source?.quoteFound === true && r.items[0].rules.some((x) => x.rule === "quote_on_the_form" && x.passed) && r.dropped.length === 1, { src: r.items[0]?.source, rules: r.items[0]?.rules });

  // ─────────────────── the route, on an isolated copy
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  ok("setup: reset and sample inputs loaded", reset.status < 300 && load.status === 201, [reset.status, load.status]);
  const enc = (c: string) => encodeURIComponent(c);
  const e5409 = sampleEditions().find((e) => e.code === "IMM 5409")!, e5707 = sampleEditions().find((e) => e.code === "IMM 5707")!;
  let g = await call("GET", `/library/forms/${enc("IMM 5409")}/draft-fields`);
  ok("P-138 pass: with no saved draft the form says so with the cost of a live run (about · at most), and nothing runs", g.status === 200 && g.body.state === "no_saved" && /No saved AI draft/.test(g.body.words) && /about US\$\d+\.\d\d · at most US\$\d+\.\d\d/.test(g.body.words) && g.body.live.open === false && g.body.edition === e5409.printed, g.body);
  let p = await call("POST", `/library/forms/${enc("IMM 5409")}/draft-fields`, { mode: "live" });
  ok("P-138 fail: a live run is refused before anything is sent (live AI is off), with its cost in words", p.status === 409 && /live AI is off/.test(p.body.message) && /at most US\$/.test(p.body.message), p.body);
  p = await call("POST", `/library/forms/${enc("IMM 5409")}/draft-fields`, { mode: "replay" });
  ok("C11.8 fail: replay with no saved draft is refused in words, US$0, nothing on the queue", p.status === 409 && /No saved AI draft/.test(p.body.message), p.body);
  p = await call("POST", `/library/forms/${enc("IMM 5409")}/draft-fields`, { mode: "guess" });
  ok("C11.13 fail: an unknown mode is refused with the two choices", p.status === 400 && /"replay"/.test(p.body.message), p.body);
  g = await call("GET", `/library/forms/${enc("IMM 5488")}/draft-fields`);
  ok("C11.13 fail: a checklist is not drafted into fields (it has no boxes): said in words, an ordinary state (200)", g.status === 200 && g.body.state === "cannot" && /has no form fields: only forms are drafted/.test(g.body.words), g.body);
  p = await call("POST", `/library/forms/${enc("IMM 5488")}/draft-fields`, {});
  ok("C11.13 fail: drafting a checklist is refused (409)", p.status === 409 && /has no form fields: only forms are drafted/.test(p.body.message), p.body);
  g = await call("GET", `/library/forms/${enc("IMM 9999")}/draft-fields`);
  ok("C11.13 fail: a form not in the library is 404", g.status === 404, g.status);
  g = await call("GET", `/library/forms/${enc("IMM 5409")}/draft-fields`, undefined, "nobody");
  ok("C11.13 fail: an unknown person cannot read it (401)", g.status === 401, g.status);
  p = await call("POST", `/library/forms/${enc("IMM 5409")}/draft-fields`, { mode: "replay" }, "user-B");
  ok("C11.13 fail: a person without the author duty cannot draft (403)", p.status === 403, p.body);

  // Saved readings of IMM 5409 (both rounds) and IMM 5707 (the draft round only), written for this check.
  const saved = savedReadings("c1113df");
  const save = saved.save;
  try {
    const f5409: F[] = [{ id: "person.declarant_full_name", meaning: "The declarant's full name as shown on the passport", value_type: "text" }, { id: "case.years_together", meaning: "How many years the two people have lived together", value_type: "number" }, { id: "case.common_law_start_date", meaning: "The date the two people began living together", value_type: "date" }];
    const q5409 = { "person.declarant_full_name": "(full name of declarant as shown on passport/travel document)", "case.years_together": "(number of years)", "case.common_law_start_date": "Date (YYYY-MM-DD)" };
    save(e5409, false, fieldMap(e5409.printed, f5409, q5409), 1);
    save(e5409, true, fieldMap(e5409.printed, [f5409[0], f5409[1], { ...f5409[2], value_type: "text" }], q5409), 2);
    g = await call("GET", `/library/forms/${enc("IMM 5409")}/draft-fields`);
    ok("C11.8 pass: a saved draft with its checker round is offered at US$0", g.status === 200 && g.body.state === "saved" && g.body.saved.draft && g.body.saved.check && /US\$0/.test(g.body.words), g.body);
    p = await call("POST", `/library/forms/${enc("IMM 5409")}/draft-fields`, {});
    ok("C11.13 pass: Draft fields puts the saved draft's fields on To review at US$0, in the edition's group", p.status === 201 && p.body.proposals === 3 && p.body.again === false && p.body.group === `edition:${e5409.printed}` && /US\$0/.test(p.body.message), p.body);
    const queue = await call("GET", `/review/proposals?group=${enc(p.body.group)}`);
    const bands = (queue.body.group?.bands ?? {}) as Record<string, { title: string; agreement: string }[]>;
    ok("C11.13 pass: the queue shows the edition's group: the agreed new field Ready, the type the rounds disagree on Decide", queue.status === 200 && queue.body.group?.title === e5409.printed && bands.ready?.some((x) => x.title === "Years together") && bands.decide?.some((x) => x.title === "Common law start date" && x.agreement === "differ"), { status: queue.status, ready: bands.ready?.map((x) => x.title), decide: bands.decide?.map((x) => x.title) });
    const again = await call("POST", `/library/forms/${enc("IMM 5409")}/draft-fields`, { mode: "replay" });
    ok("C11.13 fail (P-138: drafted once): a second click returns the first draft and adds nothing", again.status === 201 && again.body.again === true && again.body.job_id === p.body.job_id && again.body.proposals === 3, again.body);
    g = await call("GET", `/library/forms/${enc("IMM 5409")}/draft-fields`);
    ok("C11.13 pass: the form then says it was drafted, how many fields, how many still wait, and links the group", g.body.state === "drafted" && g.body.drafted.proposals === 3 && g.body.drafted.waiting === 3 && g.body.drafted.group === p.body.group, g.body.drafted);
    const both = await Promise.all([call("POST", `/library/forms/${enc("IMM 5707")}/draft-fields`, {}), call("POST", `/library/forms/${enc("IMM 5707")}/draft-fields`, {})]);
    ok("C11.8 fail: IMM 5707 has no saved reading, so both clicks are refused and nothing is written", both.every((b) => b.status === 409), both.map((b) => b.status));
    save(e5707, false, fieldMap(e5707.printed, [{ id: "person.family_name", meaning: "The person's family name", value_type: "text" }], { "person.family_name": "Family name" }), 3);
    const two = await Promise.all([call("POST", `/library/forms/${enc("IMM 5707")}/draft-fields`, {}), call("POST", `/library/forms/${enc("IMM 5707")}/draft-fields`, {})]);
    ok("C11.13 pass (P-138): two clicks at once share one draft (one job, the second says it was already drafted)", two.every((b) => b.status === 201) && two[0].body.job_id === two[1].body.job_id && two.filter((b) => b.body.again).length === 1, two.map((b) => b.body));
    const q5707 = await call("GET", `/review/proposals?group=${enc(`edition:${e5707.printed}`)}`);
    ok("P-121 fail (N1): from the draft round alone, every field waits as Decide", q5707.status === 200 && q5707.body.group?.counts?.ready === 0 && q5707.body.group?.counts?.decide === 1 && JSON.stringify(q5707.body).includes("checker round has not been recorded"), q5707.body.group);
    // Accepting a Ready field through the queue's own decide: it lands as a library change waiting for a second person.
    const readyIds = ((queue.body.group?.bands?.ready ?? []) as { id: string }[]).map((x) => x.id);
    const acc = readyIds.length ? await call("POST", "/review/proposals/decide", { ids: [readyIds[0]], action: "accept" }) : { status: 0, body: "no ready id found" };
    ok("C11.13 pass (P-120): accepting a Ready drafted field puts it on the library for a second person", acc.status === 201, acc.body);

    // Break M3 and review M1: a library name of another area is never "the same field"; an accepted field keeps its proposed key.
    const e5476 = sampleEditions().find((e) => e.code === "IMM 5476")!;
    const f5476: F[] = [{ id: "person.name", meaning: "The person's full name as on the passport", value_type: "text" }, { id: "relationship.date_of_marriage", meaning: "The date the two people married", value_type: "date" }, { id: "person.start_date", meaning: "The date the person starts the job", value_type: "text" }];
    const q5476 = { "person.name": "Family name (Surname)", "relationship.date_of_marriage": "2. Your date of birth (YYYY-MM-DD)", "person.start_date": "Application number (if known)" };
    save(e5476, false, fieldMap(e5476.printed, f5476, q5476), 4);
    save(e5476, true, fieldMap(e5476.printed, f5476, q5476), 5);
    p = await call("POST", `/library/forms/${enc("IMM 5476")}/draft-fields`, {});
    const g5476 = await call("GET", `/review/proposals?group=${enc(`edition:${e5476.printed}`)}`);
    const all5476 = Object.values((g5476.body.group?.bands ?? {}) as Record<string, { id: string; title: string; reuse: { match: string; existing_key: string | null } }[]>).flat();
    ok("C11.13 fail (break M3): no drafted field is proposed as the reuse of a library field of another area (person.name is not organisation.name)", p.status === 201 && all5476.length === 3 && all5476.every((x) => x.reuse.match === "new" || !/^(organisation|relationship)\./.test(x.reuse.existing_key ?? "") || x.title.includes("marri")), all5476.map((x) => [x.title, x.reuse]));
    const marriage = all5476.find((x) => /marriage/i.test(x.title));
    const accM = marriage ? await call("POST", "/review/proposals/decide", { ids: [marriage.id], action: "accept" }) : { status: 0, body: "no item" };
    ok("C11.13 pass (review M1): an accepted relationship field keeps its proposed key (relationship.date_of_marriage, no area written twice)", accM.status === 201 && accM.body.items?.[0]?.landedAs === "relationship.date_of_marriage", accM.body);
    const pname = all5476.find((x) => /^Name/.test(x.title));
    const accN = pname ? await call("POST", "/review/proposals/decide", { ids: [pname.id], action: "accept", reason: "The person's own name on this form." }) : { status: 0, body: "no item" };
    ok("C11.13 fail (break M3): accepting the person's name lands as person.name, never on organisation.name", accN.status === 201 && accN.body.items?.[0]?.landedAs === "person.name", accN.body);

    // Break m1 and m4: a draft with no usable field, or far more fields than boxes, is refused and does not use up the edition.
    const e1295 = sampleEditions().find((e) => e.code === "IMM 1295")!, eSch1 = sampleEditions().find((e) => e.code === "IMM 5257 SCH1")!;
    save(eSch1, false, fieldMap(eSch1.printed, [{ id: "FamilyName", meaning: "x family name", value_type: "text" }], {}), 6);
    p = await call("POST", `/library/forms/${enc("IMM 5257 SCH1")}/draft-fields`, {});
    g = await call("GET", `/library/forms/${enc("IMM 5257 SCH1")}/draft-fields`);
    ok("C11.13 fail (break m1): no field passing the rules → 409 with the reason, and the edition is not marked drafted", p.status === 409 && /No field of the saved AI draft/.test(p.body.message) && /not a field name/.test(p.body.message) && g.body.state === "saved", [p.body.message, g.body.state]);
    const many: F[] = Array.from({ length: 2 * e1295.fields + 1 }, (_, n) => ({ id: `person.f${n}`, meaning: `Field ${n}`, value_type: "text" }));
    save(e1295, false, fieldMap(e1295.printed, many, {}), 7);
    p = await call("POST", `/library/forms/${enc("IMM 1295")}/draft-fields`, {});
    ok("C11.13 fail (break m4): a draft naming far more fields than the form has boxes is refused before the queue", p.status === 409 && /far more than the form has/.test(p.body.message), p.body);
  } finally { saved.clear(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
