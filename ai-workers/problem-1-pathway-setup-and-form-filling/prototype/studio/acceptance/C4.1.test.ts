// C4.1 acceptance (P-220 pack 2; P-130, P-216 (1)(2)): the SQR is built per person role from the facts the forms and
// documents need; a fact a document supplies is not asked; each combination orders its sections with Move up / Move down,
// the order goes out with its next review and release; the library's one section title is used everywhere.
// Today the SQR per role and the fromDocuments skip work (Smart questionnaire (SQR) tab, Preview); there is no section move, so this
// failed. ROUTE (built, #284): POST /combinations/:id/sections/:key/move {direction: "up"|"down", seen: [the order read]}; the move is
// checked against the order the author was looking at (GET /combinations/:id/section-order), so a stale move is a 409.
// IRCC: every family member completes their own forms (G5256, trace IRCC-P2-02) — so each applying role has its own
// questions. Rules only (US$0). P-279 (source gate): before the submit, Submit is checked refused while a published number
// has no source entry, then every number is answered "None published" (test words) through the API, as the suites do.
// Runs on Visitor visa of the six (qa-1 gaps G4, G5, G10 / QA-133 there). Needs first: Visitor visa has questions (J3 /
// C4.11); until then it stops with exit 2, and runs meanwhile on the suites' fixture: add `wp.family` as 4th argument.
//   zsh studio/tools/isolated.sh accept 4433 start && tsx studio/acceptance/C4.1.test.ts 4433 xr_studio_accept [wp.family]
import { AUTHOR, pack2, run } from "./lib/pack2.ts";
import { kkey, render, type Known, type Person } from "../engine/render.ts";

const T = pack2("C4.1");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const KEY = T.key("vv.single");
  const wp = T.combo(KEY);
  await T.needQuestions(wp);
  const q = (await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body;
  const roles = q?.questionnaire?.roles ?? [];
  const applying = (q?.people?.lines ?? []).filter((l: any) => l.applies).map((l: any) => l.role);
  ok("C4.1 pass: each applying person role has its own questions (IRCC: family members complete their own forms)", applying.length >= 2 && applying.every((r: string) => (roles.find((x: any) => x.role === r)?.questions ?? 0) > 0), roles.map((r: any) => `${r.role}:${r.questions}`));
  ok("C4.1 pass: no role has a gap (every fact a form needs is asked or comes from a document or the case officer)", roles.length > 0 && roles.every((r: any) => r.gaps === 0));
  // qa-1 G5: no "…is needed by IMM …, but nobody is asked for it" error on the draft, for any role.
  const nobody = ((await call("GET", `/combinations/${wp}`)).body?.draft?.problems ?? []).filter((p: any) => /nobody is asked for it/.test(p.message));
  ok("C4.1 pass (G5): no fact a form needs is asked of nobody, for any role", nobody.length === 0, { count: nobody.length, first: nobody[0]?.message?.slice(0, 120) });
  const allSections = q?.questionnaire?.sections ?? [];
  // qa-1 G10 / QA-133: every section header is the library's title in words, never a system key.
  ok("C4.1 pass (G10, QA-133): every section header is a title in words, never a system key", allSections.length > 0 && allSections.every((x: any) => !!x.title && !/^[a-z0-9]+(_[a-z0-9]+)+$/.test(x.title) && x.title !== x.id), allSections.map((x: any) => x.title).slice(0, 6));
  // qa-1 G4: IMM 5257's own parts "Your visit" and "Previous countries of residence" are sections of Visitor visa (from the
  // form's parts, P-158: never added by hand). Visitor visa only.
  if (KEY === "vv.single") ok("C4.1 pass (G4): Visitor visa's questionnaire has the sections Your visit and Previous countries of residence", ["your visit", "previous countries of residence"].every((t) => allSections.some((x: any) => String(x.title).toLowerCase().includes(t))), allSections.map((x: any) => x.title));
  const pv = (await call("GET", `/combinations/${wp}/workspace?tab=preview&person=principal`)).body?.preview;
  const fromDocs = (pv?.sets?.sqr?.fromDocuments ?? []).flatMap((d: any) => d.facts);
  const askedLabels = new Set((pv?.questionnaire?.sections ?? []).flatMap((s: any) => (s.questions ?? []).flatMap((x: any) => [x.label, x.meaning])));
  ok("C4.1 pass: a fact the passport supplies is not asked of the principal in the SQR", fromDocs.length > 0 && askedLabels.size > 0 && !fromDocs.some((f: string) => askedLabels.has(f)), fromDocs.slice(0, 3));

  // ---------------------------------------------------------------- section order per combination (P-216 (1))
  const order = () => sql(`select string_agg(section_key, ',' order by section_order) from sqr_section_selection where combination_id='${wp}'`).split(",").filter(Boolean);
  const o0 = order();
  ok("setup: the combination has at least three chosen sections", o0.length >= 3, o0);
  const second = o0[1];
  const seenNow = async () => ((await call("GET", `/combinations/${wp}/section-order`)).body?.order ?? []).map((x: any) => x.key);
  let r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(second)}/move`, { direction: "up", seen: await seenNow() }, AUTHOR);
  ok("C4.1 pass: Move up puts the second section first", r.status < 300 && order()[0] === second, r.status >= 300 ? words(r) : order().slice(0, 3));
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(second)}/move`, { direction: "up", seen: await seenNow() }, AUTHOR);
  ok("C4.1 fail: the first section cannot move up (409, in words)", r.status === 409 && words(r).length > 10, words(r));
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(o0.at(-1)!)}/move`, { direction: "down", seen: await seenNow() }, AUTHOR);
  ok("C4.1 fail: the last section cannot move down (409)", r.status === 409, words(r));
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(second)}/move`, { direction: "sideways", seen: await seenNow() }, AUTHOR);
  ok("C4.1 fail: a direction other than up or down is refused (400, in words)", r.status === 400, words(r));
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(second)}/move`, { direction: "down", seen: await seenNow() }, "user-B");
  const stale = await call("POST", `/combinations/${wp}/sections/${second}/move`, { direction: "down", seen: o0 }, AUTHOR);
  ok("C4.1 fail: a move from an older order is refused (409, in words); nothing moves", stale.status === 409 && words(stale).length > 10 && (await seenNow())[0] === second, words(stale));
  ok("C4.1 fail: only an author moves sections (approver 403)", r.status === 403, r.status);
  const sections = (await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body?.questionnaire?.sections ?? [];
  ok("C4.1 pass: the Smart questionnaire (SQR) tab shows the new order", sections.length > 0 && sections[0]?.id === second, sections.map((s: any) => s.id).slice(0, 3));
  const lib = sql(`select title from logical_section where section_key='${second}' order by version desc limit 1`);
  ok("C4.1 pass: the section keeps the library's one title (P-216 (2))", !!lib && sections[0]?.title === lib, { tab: sections[0]?.title, library: lib });
  const released = sql(`select (select string_agg(x->>'id', ',' order by n) from jsonb_array_elements(snapshot->'sections') with ordinality as t(x, n)) from config_release where combination_id='${wp}' order by version desc limit 1`).split(",");
  if (released[0]) ok("C4.1 data: the released snapshot still has the old order until the next release", released.indexOf(o0[0]) >= 0 && released.indexOf(o0[0]) < released.indexOf(second), released.slice(0, 3));
  // QA-221 (tech lead's ruling C, 4 Nov; AGENTS rule 4): IMM 5257 SCH1 (09-2023) p. 1: "The principal applicant, his or
  // her spouse or common-law partner, if applicable, and all dependent children aged 18 years or older listed in the
  // application for temporary residence must complete their own copy of this form." The checkpoint's loader sets that
  // line; on the six the author adds it from the Form library and sets it as the Forms tab does. Then the engine's own
  // render reads this draft for chosen people and birth dates (Sample dates). Taken off again on the six afterwards.
  const SCH1 = "IMM 5257 SCH1", WHO_SCH1 = "principal_partner_adult_children";
  const had = sql(`select count(*) from combination_form f join gov_form_def g on g.id=f.gov_form_def_id where f.combination_id='${wp}' and g.form_key='${SCH1}' and f.status<>'RETIRED'`) !== "0";
  if (!had) await call("POST", `/combinations/${wp}/forms`, { formKey: SCH1 }, AUTHOR);
  const lineNow = () => sql(`select f.who || '|' || coalesce(f.min_age::text, '') from combination_form f join gov_form_def g on g.id=f.gov_form_def_id where f.combination_id='${wp}' and g.form_key='${SCH1}' order by f.version desc limit 1`);
  const before = lineNow();
  // On the six the line arrives with its field map as "each applicant" (the default); the author sets who fills it on the
  // Forms tab, as a person does from the form's own words. The checkpoint's loader sets it itself (demo.ts VV_FORM_RULES).
  const byAuthor = before !== `${WHO_SCH1}|18`;
  const childAsked = async () => ((await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body?.questionnaire?.roles ?? []).find((x: any) => x.role === "child")?.questions ?? null;
  const childBefore = byAuthor ? await childAsked() : null;
  if (byAuthor) r = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(SCH1)}`, { attachMode: "COMBINATION_MANDATORY", who: WHO_SCH1, minAge: 18 }, AUTHOR);
  const sch1Line = lineNow();
  ok("C4.1-Q221a (QA-221) the SCH1 line names whom IMM 5257 SCH1's own words name (the principal, a spouse or partner, each child 18 or older, from 18)", sch1Line === `${WHO_SCH1}|18`, byAuthor ? { before, set_by_author: r.status, words: r.status >= 300 ? words(r) : undefined, line: sch1Line } : { set_by_loader: sch1Line });
  // What the author sees (Smart questionnaire tab, the Child chip; its sample child is under 18): fewer questions once
  // SCH1 is no longer the child's. On the checkpoint the line was right before the pack, so there is no before.
  // Q221b runs wherever the line is set (on the six the people's steps set it from IRCC's words since #993; on the
  // checkpoint the loader does): the author widens SCH1 to "each applicant" on the Forms tab, the Child's questions are
  // counted, and the line is put back as its own words set it. The Child loses SCH1's questions only with its own who.
  const sch1Patch = (body: object) => call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(SCH1)}`, body, AUTHOR);
  const childRight = await childAsked();
  const widen = await sch1Patch({ who: "each_applicant", minAge: null });
  const childWide = await childAsked();
  const back = await sch1Patch({ attachMode: "COMBINATION_MANDATORY", who: WHO_SCH1, minAge: 18 });
  ok("C4.1-Q221b (QA-221) fail: the Child's questionnaire loses SCH1's questions once SCH1 names its own people (the Smart questionnaire tab)", widen.status < 300 && back.status < 300 && childRight !== null && childWide !== null && childRight < childWide && lineNow() === `${WHO_SCH1}|18`, { each_applicant: childWide, own_who: childRight, ...(byAuthor ? { set_by_author_before: childBefore } : {}) });
  const snap = (await call("GET", `/combinations/${wp}/config?mode=draft`)).body?.snapshot;
  const today = new Date("2026-11-04T00:00:00Z");
  const born = (age: number) => `${2026 - age}-01-15`;
  const fills = (people: Person[], ages: Record<string, number>, form = SCH1, s = snap) => {
    const known: Known = new Map(Object.entries(ages).map(([id, age]) => [kkey(id, "person.date_of_birth"), { value: born(age), status: "confirmed" as const, source: "acceptance C4.1 (Sample)" }]));
    const out = render(s, people, known, { today });
    return Object.fromEntries(people.map((p) => [p.id, out.forms.find((f: any) => f.form === form && f.person === p.id)?.applies ?? "no line"]));
  };
  const person = (id: string, role: string): Person => ({ id, role, label: id, applies: true });
  const family = [person("principal", "principal"), person("spouse", "spouse_or_partner"), person("child-1", "child"), person("child-2", "child")];
  const f1 = snap ? fills(family, { principal: 40, spouse: 38, "child-1": 10, "child-2": 19 }) : {};
  ok("C4.1-Q221c (QA-221) fail: a dependent child under 18 (10) does not fill IMM 5257 SCH1, so is not asked its facts", f1["child-1"] === false, f1);
  ok("C4.1-Q221d (QA-221) pass: a dependent child of 18 or older (19) fills IMM 5257 SCH1", f1["child-2"] === true, f1);
  ok("C4.1-Q221e (QA-221) pass: the spouse or partner fills IMM 5257 SCH1", f1.spouse === true && f1.principal === true, f1);
  const f2 = snap ? fills([person("principal", "principal")], { principal: 16 }) : {};
  ok("C4.1-Q221f (QA-221) pass: a principal applicant under 18 (16) still fills IMM 5257 SCH1 (the form names the principal at any age)", f2.principal === true, f2);
  // IMM 5707's own words: "each person, 18 years of age or older, or a minor (less than 18 years of age) travelling alone":
  // its line stays "each applicant, from 18", so the age gates every person as before (travelling alone: a follow-up row).
  const fam = snap ? { ...snap, forms: [...snap.forms.filter((f: any) => f.form_number !== "IMM 5707"), { ...(snap.forms.find((f: any) => f.form_number === "IMM 5707") ?? { form_number: "IMM 5707", title: "Family information", status: "always", condition: null }), who: "each_applicant", status: "always", condition: null, min_age: 18 }] } : null;
  const f3 = fam ? fills(family, { principal: 40, spouse: 38, "child-1": 10, "child-2": 19 }, "IMM 5707", fam) : {};
  const f4 = fam ? fills([person("principal", "principal")], { principal: 16 }, "IMM 5707", fam) : {};
  ok("C4.1-Q221g (QA-221) the engine keeps 'each applicant, from 18' as before, as IMM 5707's line on the checkpoint uses it (a child of 10 not, adults and a child of 19 yes, a principal of 16 not)", f3["child-1"] === false && f3["child-2"] === true && f3.principal === true && f3.spouse === true && f4.principal === false, { f3, f4 });
  if (!had) await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(SCH1)}`, { retire: true }, AUTHOR);

  // The move is one named change line of the next review (C4.8): submitted last, so nothing after it depends on it.
  // P-279: the source gate refuses Submit while a published number (a date counts) has no source entry; answered first.
  await T.sourceGate(wp);
  r = await call("POST", `/combinations/${wp}/submit`, { note: "section order (acceptance C4.1)" }, AUTHOR);
  const summary = (r.body?.changeSummary ?? []) as any[];
  const line = summary.find((c) => /section/i.test(String(c.kind)) && /reordered/i.test(String(c.label)));
  // B71 (P-341): on a combination never released (Visitor visa of the six) the review has no released order to compare
  // with, so it lists each section as added, in the draft's order; the moved section is then the first one.
  const firstAdded = summary.find((c) => String(c.kind) === "Section");
  if (released[0]) ok("C4.1-B71a pass: Submit goes through and the review names the move as one change line, in words (the section's title and its new place, now 1st)", r.status < 300 && !!line && String(line.label).includes(`"${lib}" now 1st`), r.status >= 300 ? words(r) : line);
  else ok("C4.1-B71a pass: Submit goes through, and on a combination never released the review lists its sections as added in the new order, the moved one first", r.status < 300 && firstAdded?.key === second && firstAdded?.change === "added", r.status >= 300 ? words(r) : { first: firstAdded, moved: second });
  T.done();
});
