// C3.4 (P-158, P-138, P-149; forms lane): a form edition's sections and answer lists drafted from the official file by
// the rules (no AI, US$0) into the one review queue: POST /attachments/:id/draft-masters {mode:"rules"}. Adopted from the
// Day-0 acceptance test acceptance/C3.4.test.ts (pack 2) for the parts the rules pass covers; its form-check and guide
// parts stay red there until the founder-approved live trial records the AI step's saved run (P-131). A passing and a
// failing check per rule. On an isolated copy with the six loaded (Demo load). No browser, no model call.
//   zsh studio/tools/isolated.sh forms_c34 4459 start && tsx studio/tests/check_forms_c34_masters.ts 4459 xr_studio_forms_c34
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR, APPROVER, pack2, run } from "../acceptance/lib/pack2.ts";
import { codeOf, draftFromInventory, words as wordsOfName } from "../api/src/form-masters.ts";

// The C3.4 v2 rerun (3 Nov) committed the Mac paid runner's real C3.4 runs. This check proves the rules pass and Saved's
// refusal when nothing is recorded (the saved result itself is acceptance/C3.4.test.ts), so the real runs are set aside in
// the copy's var folder while it runs and put back when it exits, also on Ctrl-C or a stop; a folder a killed check left
// is put back first. As tests/check_forms_c34_ai.ts.
const STUDIO = join(import.meta.dirname, ".."), RUNS = join(STUDIO, "..", "p2", "runs");
const MASTERS_LIVE = /^studio-masters-.+-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/;
const aside = join(STUDIO, "var", `c34-real-runs-${process.pid}`);
const putBack = (dir = aside) => { if (!existsSync(dir)) return; for (const f of readdirSync(dir)) renameSync(join(dir, f), join(RUNS, f)); rmSync(dir, { recursive: true, force: true }); };
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
for (const d of existsSync(join(STUDIO, "var")) ? readdirSync(join(STUDIO, "var")).filter((x) => /^c34-real-runs-\d+$/.test(x)) : []) if (!alive(Number(d.slice(14)))) putBack(join(STUDIO, "var", d));
mkdirSync(aside, { recursive: true });
for (const f of readdirSync(RUNS).filter((x) => MASTERS_LIVE.test(x) && !x.includes("pacheck"))) renameSync(join(RUNS, f), join(aside, f));
process.on("exit", () => putBack());
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]] as const) process.on(sig, () => process.exit(code));

const T = pack2("C3.4");
const { call, sql, ok, words } = T;
const ROUTE = (att: string) => `/attachments/${att}/draft-masters`;

run(async () => {
  // ─────────────────── the pure rules
  ok("C3.4 pass: a list's name comes from the form's own list name", wordsOfName("MaritalStatusList") === "Marital status" && wordsOfName("PersonalDetails") === "Personal details");
  ok("C3.4 pass: a value code is built from the printed words (lowercase, starts with a letter)", codeOf("Common-Law") === "common_law" && codeOf("10 years") === "v_10_years");
  const d = draftFromInventory([
    { data_path: "a", section: "Page1.Marital.A", caption: "* Status", options_from: "xfa.LOV.StatusList.S[*]", options_resolved: "[['', ''], ['Married', '01'], ['Single', '02']]" },
    { data_path: "b", section: "Page1.Marital.B", caption: "Status of spouse", options_from: "xfa.LOV.StatusList.S[*]", options_resolved: "[['', ''], ['Married', '01'], ['Single', '02']]" },
    { data_path: "c", section: "Page2.Contact.A", caption: "Email" },
  ]);
  ok("C3.4 pass: two boxes with the same choices make one answer list (P-120: one meaning, one item)", d.lists.length === 1 && d.lists[0].boxes.length === 2 && d.lists[0].label === "Status", d.lists);
  ok("C3.4 fail: a box without choices makes no answer list (P-158: only a box's choices)", !d.lists.some((l) => l.boxes.includes("c")));
  ok("C3.4 pass: sections come from the form's parts, each naming its fields", d.sections.length === 2 && d.sections.every((s) => s.fieldKeys.length > 0), d.sections);
  const h = draftFromInventory([
    { data_path: "x1", section: "Page1.ButtonsHeader.A", caption: "", presence: "invisible" },
    { data_path: "x2", section: "Page1.Header.A", caption: "CRC" },
    { data_path: "x3", section: "Page1.Details.A", caption: "Barcode 1" },
    { data_path: "x4", section: "Page1.Details.B", caption: "* Family name" },
    { data_path: "x5", section: "Page1.Quiet.A", caption: "" },
  ]);
  ok("C3.4 fail (review M1): hidden boxes, barcodes and machine parts make no section; a part with no printed words makes none", h.sections.length === 1 && h.sections[0].label === "Details" && h.sections[0].fieldKeys.join() === "x4" && h.sections[0].quote === "Family name", h.sections);

  const five = draftFromInventory([
    { data_path: "y1", section: "Page1.Five.A", caption: "Family name (Surname)" },
    { data_path: "y2", section: "Page1.Seven.A", caption: "Signature of applicant" },
  ]);
  ok("C3.4 fail→pass (re-review M2): a part named by a number word (IMM 5475's Five, Seven) is a real section, kept for a person to rename", five.sections.length === 2 && five.sections.some((x) => x.label === "Five" && x.quote === "Family name (Surname)"), five.sections);

  await T.ready();
  const vv = T.combo("vv.single");
  const att = T.attachment(vv, "imm5257e.pdf");
  ok("setup: Visitor visa carries IMM 5257 (09-2023)", !!att);
  const before = T.spent();

  // ─────────────────── refusals
  let r = await call("POST", ROUTE(att), { mode: "rules" }, APPROVER);
  ok("C3.4 fail: only an author drafts (approver 403)", r.status === 403, r.status);
  r = await call("POST", ROUTE("00000000-0000-4000-8000-000000000000"), { mode: "rules" }, AUTHOR);
  ok("C3.4 fail: an unknown source is 404, in words", r.status === 404 && words(r).length > 3, words(r));
  r = await call("POST", ROUTE(att), { mode: "sometimes" }, AUTHOR);
  ok("C3.4 fail: an unknown mode is 400, naming the three", r.status === 400 && /rules/.test(words(r)) && /replay/.test(words(r)), words(r));
  r = await call("POST", ROUTE(att), { mode: "replay" }, AUTHOR);
  ok("C3.4 fail: replay without a saved AI run is refused in words (409), pointing to the rules pass", r.status === 409 && /rules pass/.test(words(r)), words(r));
  const checklist = sql(`select id from source_attachment where combination_id='${vv}' and kind='Document checklist' limit 1`);
  if (checklist) { r = await call("POST", ROUTE(checklist), { mode: "rules" }, AUTHOR); ok("C3.4 fail: a checklist is refused (drafted into document requirements instead)", r.status === 400 && /checklist/.test(words(r)), words(r)); }

  // ─────────────────── the rules pass
  r = await call("POST", ROUTE(att), { mode: "rules" }, AUTHOR);
  ok("C3.4 pass: the edition's sections and answer lists are drafted by the rules (201)", r.status === 201 && r.body?.proposals > 0, r.status >= 300 ? words(r) : r.body?.proposals);
  const again = await call("POST", ROUTE(att), { mode: "rules" }, AUTHOR);
  ok("C3.4 fail→pass: a second click reuses the edition's one draft and proposes nothing more (P-138)", again.status === 201 && again.body?.id === r.body?.id && again.body?.proposals === 0, again.body);
  const par = await Promise.all([call("POST", ROUTE(att), { mode: "rules" }, AUTHOR), call("POST", ROUTE(att), { mode: "rules" }, AUTHOR)]);
  ok("C3.4 pass: two clicks at once still share the one draft", par.every((x) => x.body?.id === r.body?.id), par.map((x) => x.body?.id));

  const q = await call("GET", "/review/proposals");
  const group = (q.body?.groups ?? []).find((g: any) => g.kind === "edition" && /^edition:IMM 5257 \(/.test(g.id)); // IMM 5257 itself, never IMM 5257 SCH1 (since D3 its proposals carry the library's label, not the model's "Schedule 1" text)
  ok("C3.4 pass: an edition group for IMM 5257 waits in the one review queue", !!group, (q.body?.groups ?? []).map((g: any) => g.title));
  const v = group ? await call("GET", `/review/proposals?group=${encodeURIComponent(group.id)}`) : { body: null };
  ok("C3.4 fail→pass (review Minor 1): the draft names its queue group, so \"Open Proposals\" opens IMM 5257's group, not the oldest", !!group && r.body?.group === group.id && again.body?.group === group.id, { said: r.body?.group, queue: group?.id });
  const b = v.body?.group?.bands ?? {};
  const items: any[] = [...(b.ready ?? []), ...(b.check ?? []), ...(b.decide ?? [])].filter((x) => x.step === "masters_edition");
  const of = (k: string) => items.filter((x) => x.kind === k);
  ok("C3.4 pass (G2): one answer list per drop-down list of IMM 5257 (at least 13), each resting on the form", of("answer_list").length >= 13 && of("answer_list").every((x) => /imm5257/i.test(x.source?.file ?? "")), of("answer_list").length);
  ok("C3.4 pass: every item lands on the library and rests on the IMM 5257 file with its quote found", items.length > 0 && items.every((x) => x.lands_on === "library" && /imm5257/i.test(x.source?.file ?? "") && x.source?.quote_found === true));
  // IMM 5257 has two lists named for marital status ("Marital status", "Marital status history"), drafted in the same
  // instant, so their order in the queue is not fixed: the check names the list it means.
  const marital = of("answer_list").find((x) => /^marital status$/i.test(String(x.title).trim()));
  const labels = (marital?.readings?.draft?.payload?.values ?? []).map((x: any) => String(x.label).toLowerCase());
  ok("C3.4 pass: the marital-status answer list carries the form's own 8 choices (IRCC-P2-25)", labels.length === 8 && ["annulled", "common", "divorced", "separated", "married", "single", "unknown", "widowed"].every((w) => labels.some((c: string) => c.includes(w))), labels);
  ok("C3.4 pass: every section names the form fields it groups (from the form's parts)", of("section").length > 0 && of("section").every((x) => (x.readings?.draft?.payload?.fieldKeys ?? []).length > 0));
  ok("C3.4 pass: every item is a rules item in Check, never Ready (a person checks each name; P-121)", items.every((x) => x.origin === "rules" && x.band === "check"));
  const live = (qq: string) => new Set(sql(qq).split("\n").filter(Boolean).map((x) => x.trim().toLowerCase()));
  const names: Record<string, Set<string>> = { section: live("select title from logical_section where status in ('DRAFT','PUBLISHED')"), answer_list: live("select label from answer_list where status in ('DRAFT','PUBLISHED')") };
  ok("C3.4 pass: no 'new' item has the exact name of a live library item of its kind (it is proposed as reuse)", items.every((x) => x.reuse?.match === "reuse" || x.kind !== "section" || !names.section.has(String(x.title).trim().toLowerCase())));
  ok("C3.4 data: every item is Sample", items.length > 0 && items.every((x) => x.basis === "SAMPLE"));

  // ─────────────────── accepting: a DRAFT library row and a waiting change for a second person
  const waiting = (k: string) => Number(sql(`select count(*) from library_change where status='WAITING' and kind='${k}'`));
  const s0 = waiting("section"), l0 = waiting("answer_list");
  const sec = of("section").find((x) => x.reuse?.match === "new"), lst = of("answer_list").find((x) => x.reuse?.match === "new");
  r = await call("POST", "/review/proposals/decide", { ids: [sec?.id ?? "00000000-0000-4000-8000-000000000000"], action: "accept" }, AUTHOR);
  ok("C3.4 pass: an accepted section lands as a DRAFT section waiting for a second person", !!sec && r.status < 300 && waiting("section") === s0 + 1, r.status >= 300 ? words(r) : undefined);
  r = await call("POST", "/review/proposals/decide", { ids: [lst?.id ?? "00000000-0000-4000-8000-000000000000"], action: "accept" }, AUTHOR);
  ok("C3.4 pass: an accepted answer list lands as a DRAFT list waiting for a second person", !!lst && r.status < 300 && waiting("answer_list") === l0 + 1, r.status >= 300 ? words(r) : undefined);
  // Review Minor 5: a 409 names an answer list by its name, never by its code list or hash.
  const lst2 = of("answer_list").find((x) => x.reuse?.match === "new" && x.id !== lst?.id);
  const lstPayload = lst?.readings?.draft?.payload, p2 = lst2?.readings?.draft?.payload;
  r = await call("POST", "/review/proposals/decide", { ids: [lst2?.id ?? "00000000-0000-4000-8000-000000000000"], action: "edit", payload: { ...p2, label: "Edited twin list", values: lstPayload?.values } }, AUTHOR);
  ok("C3.4 fail→pass (review Minor 5): an edited list that is already in the library is refused (409) by its name, not its codes", !!lst2 && r.status === 409 && words(r).includes('"Edited twin list"') && !/codes:\d+:/.test(words(r)) && !words(r).includes(String(lstPayload?.values?.map((x: any) => x.code).sort().join(","))), words(r));
  ok("C3.4 pass: the whole check spent US$0", T.spent() === before);
  T.done();
});
