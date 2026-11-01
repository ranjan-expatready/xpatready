// C3.4 acceptance (P-220 pack 2; P-138, P-149, P-158, P-134): AI drafts a form edition's library masters (sections,
// answer lists, document types, form checks) from the official file, as proposals in the one review queue, once per
// edition and only on a click; a saved draft replays at US$0. Visitor visa's IMM 5257 (09-2023) first.
// Today only fields are drafted from a form (field map); there is no producer for the other kinds, so this fails.
// ROUTE (proposed; Question for the tech lead): POST /attachments/:id/draft-masters {mode: "replay" | "rules" | "live"},
// beside the existing /attachments/:id/draft (fields) and /attachments/:id/draft-checklist. The builder may rename it
// with the tech lead's OK; the assertions on the queue stay.
// Rules from P-158: an answer list comes only from a PDF box's choices or an IRCC code list; sections from the form's
// parts. P-134: an identity document is never read by AI vision. Every value Sample until the immigration expert confirms.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C3.4.test.ts 4440 xr_studio_accept
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C3.4");
const { call, sql, ok, words } = T;
const ROUTE = (att: string) => `/attachments/${att}/draft-masters`;

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  const att = T.attachment(vv, "imm5257e.pdf");
  ok("setup: Visitor visa carries IMM 5257 (09-2023)", !!att);
  const before = T.spent();

  let r = await call("POST", ROUTE(att), { mode: "live" }, AUTHOR);
  ok("C3.4 fail: live drafting is refused on a copy without the founder's Go (409, no call, US$0)", r.status === 409 && T.spent() === before, r.status >= 300 ? words(r) : r.status);
  r = await call("POST", ROUTE(att), { mode: "replay" }, AUTHOR);
  ok("C3.4 pass: the edition's masters are drafted from the saved run (replay)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  const again = await call("POST", ROUTE(att), { mode: "replay" }, AUTHOR);
  ok("C3.4 pass: a second click reuses the edition's one draft (P-138: drafted once per edition)", r.status < 300 && again.body?.id === r.body?.id);

  const q = await call("GET", "/review/proposals");
  const group = (q.body?.groups ?? []).find((g: any) => g.kind === "edition" && /IMM 5257/.test(g.title));
  ok("C3.4 pass: an edition group for IMM 5257 waits in the one review queue", !!group, (q.body?.groups ?? []).map((g: any) => g.title));
  const v = group ? await call("GET", `/review/proposals?group=${encodeURIComponent(group.id)}`) : { body: null };
  const b = v.body?.group?.bands ?? {};
  const items: any[] = [...(b.ready ?? []), ...(b.check ?? []), ...(b.decide ?? [])];
  const of = (k: string) => items.filter((x) => x.kind === k);
  ok("C3.4 pass: it proposes sections, answer lists, document types and form checks (not only fields)", ["section", "answer_list", "document_type", "form_check"].every((k) => of(k).length > 0), Object.fromEntries(["section", "answer_list", "document_type", "form_check"].map((k) => [k, of(k).length])));
  ok("C3.4 pass: every item lands on the library and rests on the IMM 5257 file with its quote found", items.length > 0 && items.every((x) => x.lands_on === "library" && /imm5257/i.test(x.source?.file ?? "") && x.source?.quote_found === true));
  // P-158 (b): an answer list comes only from a PDF box's choices. IMM 5257's marital-status box lists (among others)
  // Married, Single, Common-Law, Divorced, Widowed (the form's own drop-down, read from the official PDF).
  const marital = of("answer_list").find((x) => /marital/i.test(x.title));
  const codes = (marital?.readings?.draft?.payload?.values ?? []).map((x: any) => String(x.label).toLowerCase());
  ok("C3.4 pass: the marital-status answer list carries the form's own choices (Married, Single, Common-law, Divorced, Widowed)", ["married", "single", "common", "divorced", "widowed"].every((w) => codes.some((c: string) => c.includes(w))), codes);
  ok("C3.4 pass: every section names the form fields it groups (from the form's parts)", of("section").length > 0 && of("section").every((x) => (x.readings?.draft?.payload?.fieldKeys ?? []).length > 0));
  const idDocs = of("document_type").filter((x) => x.readings?.draft?.payload?.identityDocument);
  ok("C3.4 pass: a passport is proposed as an identity document read by its coded lines, never AI vision (P-134)", idDocs.some((x) => /passport/i.test(x.title)) && idDocs.every((x) => ["coded_lines", "printed_layout", "person_only"].includes(x.readings?.draft?.payload?.readerKind)), idDocs.map((x) => `${x.title}:${x.readings?.draft?.payload?.readerKind}`));
  ok("C3.4 pass: every document type says what it proves", of("document_type").length > 0 && of("document_type").every((x) => String(x.meaning ?? "").length >= 3));
  ok("C3.4 pass: every form check carries 2–3 worked examples, unconfirmed until the expert confirms (P-149 (5))", of("form_check").length > 0 && of("form_check").every((x) => { const e = x.readings?.draft?.payload?.examples ?? []; return e.length >= 2 && e.length <= 3 && e.every((c: any) => c.confirmedBy === null); }));
  ok("C3.4 pass: an item matching a live library item is proposed as reuse, never as new", items.every((x) => x.reuse?.match === "reuse" || !x.near?.length || !!x.near_reason));
  ok("C3.4 data: every item is Sample", items.length > 0 && items.every((x) => x.basis === "SAMPLE"));

  // Accepting a section writes a DRAFT library row and a waiting change for a second person (the lander exists today).
  const sec = of("section")[0];
  r = await call("POST", "/review/proposals/decide", { ids: [sec?.id ?? "00000000-0000-4000-8000-000000000000"], action: "accept" }, AUTHOR);
  ok("C3.4 pass: an accepted section lands as a DRAFT section waiting for a second person", r.status < 300 && sql(`select count(*) from library_change where status='WAITING' and kind='section'`) !== "0", r.status >= 300 ? words(r) : undefined);
  ok("C3.4 pass: the whole test spent US$0", T.spent() === before);
  T.done();
});
