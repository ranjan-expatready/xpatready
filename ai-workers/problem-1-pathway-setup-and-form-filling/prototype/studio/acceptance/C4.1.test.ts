// C4.1 acceptance (P-220 pack 2; P-130, P-216 (1)(2)): the SQR is built per person role from the facts the forms and
// documents need; a fact a document supplies is not asked; each combination orders its sections with Move up / Move down,
// the order goes out with its next review and release; the library's one section title is used everywhere.
// Today the SQR per role and the fromDocuments skip work (Questionnaires tab, Preview); there is no section move, so this
// fails. ROUTE (proposed; Question for the tech lead): POST /combinations/:id/sections/:key/move {direction: "up"|"down"}.
// IRCC: every family member completes their own forms (G5256, trace IRCC-P2-02) — so each applying role has its own
// questions; all background questions must be answered (IRCC-P2-19). Rules only (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.1.test.ts 4440 xr_studio_accept
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.1");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const wp = T.combo(T.key("wp.family"));
  const q = (await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body;
  const roles = q?.questionnaire?.roles ?? [];
  const applying = (q?.people?.lines ?? []).filter((l: any) => l.applies).map((l: any) => l.role);
  ok("C4.1 pass: each applying person role has its own questions (IRCC: family members complete their own forms)", applying.length >= 2 && applying.every((r: string) => (roles.find((x: any) => x.role === r)?.questions ?? 0) > 0), roles.map((r: any) => `${r.role}:${r.questions}`));
  ok("C4.1 pass: no role has a gap (every fact a form needs is asked or comes from a document or the case officer)", roles.every((r: any) => r.gaps === 0));
  const pv = (await call("GET", `/combinations/${wp}/workspace?tab=preview&person=principal`)).body?.preview;
  const fromDocs = (pv?.sets?.sqr?.fromDocuments ?? []).flatMap((d: any) => d.facts);
  const askedLabels = new Set((pv?.questionnaire?.sections ?? []).flatMap((s: any) => (s.questions ?? []).flatMap((x: any) => [x.label, x.meaning])));
  ok("C4.1 pass: a fact the passport supplies is not asked of the principal in the SQR", fromDocs.length > 0 && askedLabels.size > 0 && !fromDocs.some((f: string) => askedLabels.has(f)), fromDocs.slice(0, 3));

  // ---------------------------------------------------------------- section order per combination (P-216 (1))
  const order = () => sql(`select string_agg(section_key, ',' order by section_order) from sqr_section_selection where combination_id='${wp}'`).split(",").filter(Boolean);
  const o0 = order();
  ok("setup: Work permit (family) has at least three chosen sections", o0.length >= 3, o0);
  const second = o0[1];
  let r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(second)}/move`, { direction: "up" }, AUTHOR);
  ok("C4.1 pass: Move up puts the second section first", r.status < 300 && order()[0] === second, r.status >= 300 ? words(r) : order().slice(0, 3));
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(second)}/move`, { direction: "up" }, AUTHOR);
  ok("C4.1 fail: the first section cannot move up (409, in words)", r.status === 409 && words(r).length > 10, words(r));
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(o0.at(-1)!)}/move`, { direction: "down" }, AUTHOR);
  ok("C4.1 fail: the last section cannot move down (409)", r.status === 409, words(r));
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(second)}/move`, { direction: "sideways" }, AUTHOR);
  ok("C4.1 fail: a direction other than up or down is refused (400, in words)", r.status === 400, words(r));
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(second)}/move`, { direction: "down" }, "user-B");
  ok("C4.1 fail: only an author moves sections (approver 403)", r.status === 403, r.status);
  const sections = (await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body?.questionnaire?.sections ?? [];
  ok("C4.1 pass: the Questionnaires tab shows the new order", sections.length > 0 && sections[0]?.id === second, sections.map((s: any) => s.id).slice(0, 3));
  const lib = sql(`select title from logical_section where section_key='${second}' order by version desc limit 1`);
  ok("C4.1 pass: the section keeps the library's one title (P-216 (2))", sections[0]?.title === lib, { tab: sections[0]?.title, library: lib });
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  ok("C4.1 pass: the new order is a change of the combination's draft, in words, for its next review (C4.8)", /order|moved/i.test(JSON.stringify(review?.draft?.changes ?? review?.changes ?? review ?? {})));
  const released = sql(`select (select string_agg(x->>'id', ',' order by n) from jsonb_array_elements(snapshot->'sections') with ordinality as t(x, n)) from config_release where combination_id='${wp}' order by version desc limit 1`).split(",");
  ok("C4.1 data: the released snapshot still has the old order until the next release", released.indexOf(o0[0]) >= 0 && released.indexOf(o0[0]) < released.indexOf(second), released.slice(0, 3));
  T.done();
});
