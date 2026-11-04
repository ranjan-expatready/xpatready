// C3.4 acceptance (P-220 pack 2; P-138, P-149, P-158, P-134): AI drafts a form edition's library masters (sections,
// answer lists, document types, form checks) from the official file, as proposals in the one review queue, once per
// edition and only on a click; a saved draft replays at US$0. Visitor visa's IMM 5257 (09-2023) first.
// Today only fields are drafted from a form (field map); there is no producer for the other kinds, so this fails.
// ROUTE (proposed; Question for the tech lead): POST /attachments/:id/draft-masters {mode: "replay" | "rules" | "live"},
// beside the existing /attachments/:id/draft (fields) and /attachments/:id/draft-checklist. The builder may rename it
// with the tech lead's OK; the assertions on the queue stay.
// Needs first: the saved run of this step for IMM 5257 (and guide 5256), recorded in the founder-approved live trial of
// Visitor visa (P-131) and committed with the build; until then the replay is refused and this stays red.
// Rules from P-158: an answer list comes only from a PDF box's choices or an IRCC code list; sections from the form's
// parts. P-134: an identity document is never read by AI vision. Every value Sample until the immigration expert confirms.
// QA-196 (P-149 (1)): an accepted form check and guide check land as DRAFT checks of Visitor visa (Library › Checks).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C3.4.test.ts 4440 xr_studio_accept
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  // Live is never asked here (a copy with a live switch on would spend money).
  let r: Awaited<ReturnType<typeof call>>;
  r = await call("POST", ROUTE(att), { mode: "replay" }, AUTHOR);
  ok("C3.4 pass: the edition's masters are drafted from the saved run (replay)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  const again = await call("POST", ROUTE(att), { mode: "replay" }, AUTHOR);
  ok("C3.4 pass: a second click reuses the edition's one draft (P-138: drafted once per edition)", r.status < 300 && again.body?.id === r.body?.id);

  const q = await call("GET", "/review/proposals");
  // The edition itself, not IMM 5257 SCH1 (its own group, listed first after the field maps; C3.4 builder, 2 Nov).
  const group = (q.body?.groups ?? []).find((g: any) => g.kind === "edition" && /^IMM 5257 \(/.test(g.title));
  ok("C3.4 pass: an edition group for IMM 5257 waits in the one review queue", !!group, (q.body?.groups ?? []).map((g: any) => g.title));
  const v = group ? await call("GET", `/review/proposals?group=${encodeURIComponent(group.id)}`) : { body: null };
  const b = v.body?.group?.bands ?? {};
  const items: any[] = [...(b.ready ?? []), ...(b.check ?? []), ...(b.decide ?? [])];
  const of = (k: string) => items.filter((x) => x.kind === k);
  ok("C3.4 pass: it proposes sections, answer lists and form checks from the form (not only fields)", ["section", "answer_list", "form_check"].every((k) => of(k).length > 0), Object.fromEntries(["section", "answer_list", "form_check", "document_type"].map((k) => [k, of(k).length])));
  // qa-1 G2: one answer list per drop-down list of IMM 5257 (13 lists in the official form; tests/runtime/setup_visitor_visa.ts LIST_NAMES).
  ok("C3.4 pass (G2): one answer list per drop-down list of IMM 5257 (at least 13), each resting on the form", of("answer_list").length >= 13 && of("answer_list").every((x) => /imm5257/i.test(x.source?.file ?? "")), of("answer_list").length);
  ok("C3.4 pass: every item lands on the library and rests on the IMM 5257 file with its quote found", items.length > 0 && items.every((x) => x.lands_on === "library" && /imm5257/i.test(x.source?.file ?? "") && x.source?.quote_found === true));
  // P-158 (b): an answer list comes only from a PDF box's choices. IMM 5257's marital-status box lists
  // Married, Single, Common-Law, Divorced, Widowed (the form's own drop-down, read from the official PDF).
  const marital = of("answer_list").find((x) => /marital/i.test(x.title));
  const codes = (marital?.readings?.draft?.payload?.values ?? []).map((x: any) => String(x.label).toLowerCase());
  ok("C3.4 pass: the marital-status answer list carries the form's own 8 choices (IRCC-P2-25)", codes.length === 8 && ["annulled", "common", "divorced", "separated", "married", "single", "unknown", "widowed"].every((w) => codes.some((c: string) => c.includes(w))), codes);
  ok("C3.4 pass: every section names the form fields it groups (from the form's parts)", of("section").length > 0 && of("section").every((x) => (x.readings?.draft?.payload?.fieldKeys ?? []).length > 0));
  // Document types: P-158 has them drafted from a checklist, P-120 and W1-ai-drafting [C1] keep them with the form — a
  // conflict for the founder (PR question). So no document type is required from the form here; when one is proposed
  // it says what it proves and an identity document is never read by AI vision (P-134). The checklist's are in C2.6.
  const docTypes = of("document_type");
  ok("C3.4 pass: any document type proposed says what it proves; an identity document is read by its coded lines or layout, never AI vision", docTypes.every((x) => String(x.meaning ?? "").length >= 3 && (!x.readings?.draft?.payload?.identityDocument || ["coded_lines", "printed_layout", "person_only"].includes(x.readings?.draft?.payload?.readerKind))), docTypes.map((x) => x.title));
  ok("C3.4 pass: every form check carries 2–3 worked examples, unconfirmed until the expert confirms (P-149 (5))", of("form_check").length > 0 && of("form_check").every((x) => { const e = x.readings?.draft?.payload?.examples ?? []; return e.length >= 2 && e.length <= 3 && e.every((c: any) => c.confirmedBy === null); }));
  // P-120: a "new" item never has the exact name of a live library item of its kind (it would be "reuse").
  const live = (q: string) => new Set(sql(q).split("\n").filter(Boolean).map((x) => x.trim().toLowerCase()));
  const names: Record<string, Set<string>> = { section: live("select title from logical_section where status in ('DRAFT','PUBLISHED')"), answer_list: live("select label from answer_list where status in ('DRAFT','PUBLISHED')"), document_type: live("select name from document_type where status in ('DRAFT','PUBLISHED')") };
  ok("C3.4 pass: no 'new' item has the exact name of a live library item of its kind (it is proposed as reuse)", items.length > 0 && items.every((x) => x.reuse?.match === "reuse" || !names[x.kind]?.has(String(x.title).trim().toLowerCase())), items.filter((x) => x.reuse?.match === "new" && names[x.kind]?.has(String(x.title).trim().toLowerCase())).map((x) => x.title));
  ok("C3.4 data: every item is Sample", items.length > 0 && items.every((x) => x.basis === "SAMPLE"));

  // Accepting a section writes a DRAFT library row and a waiting change for a second person (the lander exists today).
  const waitingSections = () => Number(sql(`select count(*) from library_change where status='WAITING' and kind='section'`));
  const w0 = waitingSections();
  // QA-206: a section with no printed heading is accepted only once a person names it, so this accepts one named from the form.
  const sec = of("section").find((x) => !/^Unnamed section /.test(String(x.title)));
  r = await call("POST", "/review/proposals/decide", { ids: [sec?.id ?? "00000000-0000-4000-8000-000000000000"], action: "accept" }, AUTHOR);
  ok("C3.4 pass: an accepted section lands as a DRAFT section waiting for a second person", !!sec && r.status < 300 && waitingSections() === w0 + 1, r.status >= 300 ? words(r) : undefined);
  // "From sources": the rules (conditions, checks) also come from the combination's guide, not only from a form.
  const guide = T.attachment(vv, "guide-5256.html");
  r = await call("POST", ROUTE(guide), { mode: "replay" }, AUTHOR);
  const fromGuide = ((await call("GET", "/review/proposals")).body?.groups ?? []).length ? (await T.queued(vv)).filter((x: any) => ["condition", "form_check", "cross_check"].includes(x.kind) && /5256/.test(x.source?.file ?? "")) : [];
  ok("C3.4 pass: drafting from Visitor visa's guide 5256 proposes rules (conditions or checks) resting on the guide's words", !!guide && r.status < 300 && fromGuide.length > 0 && fromGuide.every((x: any) => x.source?.quote_found === true), r.status >= 300 ? words(r) : fromGuide.length);
  // QA-196 (P-149 (1) one door, P-120): a check is accepted on To review like every other kind and lands where checks
  // live, on a combination (Library › Checks lists it, used in each). A form check reads IMM 5257's own fields, so it
  // needs them mapped to shared fields first; a guide check lands on its own combination.
  const NONE = "00000000-0000-4000-8000-000000000000";
  const fc = of("form_check").find((x) => (x.readings?.draft?.payload?.reads ?? []).some((p: string) => /BackgroundInfo3\[0\]\.Choice/.test(p))) ?? of("form_check")[0];
  const checkRows = () => Number(sql("select count(*) from check_def"));
  const c0 = checkRows();
  r = await call("POST", "/review/proposals/decide", { ids: [fc?.id ?? NONE], action: "accept" }, AUTHOR);
  ok("QA-196 fail: IMM 5257's form check is refused in plain words while the form fields it reads are not mapped to shared fields yet; nothing is written", !!fc && r.status === 409 && /not mapped to a shared field yet/.test(words(r)) && checkRows() === c0, words(r));
  // Setup: IMM 5257's field map maps those form fields to the facts (and the yes/no transform) its saved field-map answer
  // gives them, as applying that draft on the form-field page leaves them; deciding its 84 items is C3.2's journey, not
  // this one. A row already there is kept (review m5).
  const fieldMap = JSON.parse(JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "p2", "runs", "studio-fieldmap-imm5257e-live-20261021t060247723z.json"), "utf8")).raw_output) as { entries: { data_path: string; outcome: string; fact: string | null; transform: string | null }[] };
  const reads: string[] = fc?.readings?.draft?.payload?.reads ?? [];
  const mapped = reads.map((p) => fieldMap.entries.find((e) => e.data_path === p && e.outcome === "mapped") ?? null);
  const facts = mapped.map((e) => e?.fact ?? null);
  for (const [i, p] of reads.entries()) if (facts[i]) sql(`insert into form_field_map (id, workspace_id, form_edition_id, data_path, outcome, canonical_field_key, transform, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, id, '${p}', 'mapped', '${facts[i]}', ${mapped[i]!.transform ? `'${mapped[i]!.transform}'` : "null"}, 1, 'DRAFT', 'HUMAN', '${AUTHOR}' from form_edition where edition_label='IMM 5257 (09-2023)' on conflict do nothing`);
  r = await call("POST", "/review/proposals/decide", { ids: [fc?.id ?? NONE], action: "accept" }, AUTHOR);
  const fcKey = r.body?.items?.[0]?.landedAs as string | undefined;
  const fcTree = fcKey ? sql(`select predicate_json::text from check_def where check_key='${fcKey}' and combination_id='${vv}'`) : "";
  ok("QA-196 pass: once mapped, accepting IMM 5257's form check lands it as a DRAFT check of Visitor visa (which files IMM 5257), reading the shared fields and their answers", r.status < 300 && facts.every(Boolean) && !!fcTree && facts.every((f) => fcTree.includes(f!)) && !fcTree.includes("form1[0]") && !/"\* ?Yes"/.test(fcTree), r.status >= 300 ? words(r) : { facts, tree: fcTree.slice(0, 160) });
  const gc = fromGuide.find((x: any) => x.kind === "cross_check") ?? fromGuide.find((x: any) => x.kind === "form_check");
  r = await call("POST", "/review/proposals/decide", { ids: [gc?.id ?? NONE], action: "accept" }, AUTHOR);
  const gcKey = r.body?.items?.[0]?.landedAs as string | undefined;
  const gcRow = gcKey ? sql(`select check_group || '|' || severity || '|' || status || '|' || origin from check_def where check_key='${gcKey}' and combination_id='${vv}'`) : "";
  ok("QA-196 pass: accepting a guide 5256 check lands it as a DRAFT check of Visitor visa, made by AI (one over two answers only warns)", r.status < 300 && /\|DRAFT\|AI_PROPOSAL$/.test(gcRow) && (gc?.kind !== "cross_check" || gcRow.startsWith("cross_record|warn")), r.status >= 300 ? words(r) : gcRow);
  const listed = ((await call("GET", "/library/checks")).body ?? []) as { key: string; used_in: { id: string }[] }[];
  ok("QA-196 pass: after a reload, Library › Checks lists both, each used in Visitor visa", [fcKey, gcKey].every((k) => !!k && listed.some((c) => c.key === k && c.used_in.some((u) => u.id === vv))), listed.filter((c) => c.key === fcKey || c.key === gcKey).map((c) => c.key));
  ok("C3.4 pass: the whole test spent US$0", items.length > 0 && T.spent() === before);
  T.done();
});
