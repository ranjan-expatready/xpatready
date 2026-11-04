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
  else ok("C4.1-B71a pass: Submit goes through, and on a combination never released the review lists its sections as added in the new order, the moved one first", r.status < 300 && firstAdded?.label === lib && firstAdded?.change === "added", r.status >= 300 ? words(r) : { first: firstAdded, moved: lib });
  T.done();
});
