// B88 (QA-239, C4.11; concept BR-1 to BR-5, BR-7, BR-8): on the six through people's steps, with every condition Visitor
// visa's saved run proposes accepted and approved there, each other combination's held conditions are put in force by
// product steps only: B86's door for plain form fields, and B88's for the worked-out Yes/No that prints its condition's
// deciding question (asked as that question, a second person approves). Before that, the conditions are held there (the
// question asked every time, a warning; Bake row 6, QA-239): nothing a form reads is hidden, and nothing refuses Submit.
// Saved answers only: US$0, live AI off. Every condition is Sample.
//   zsh studio/tools/isolated.sh forms_b88 4455 start && tsx studio/tests/check_forms_b88_spread.ts 4455 xr_studio_forms_b88
import { randomUUID } from "node:crypto";
import { APPROVER, AUTHOR, pack2, REVIEWER, run } from "../acceptance/lib/pack2.ts";

const T = pack2("B88");
const { call, sql, ok, words, until } = T;
const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"], AI = new Set(["documents", "conditions", "pqr_picks", "checker"]);
const HIDING = /Hiding a value a form reads/;
// B52's shape (challenge M1): it reads the deciding Yes/No and still vouches for the names in its own block (QA-165).
const ASKED_STEP = "person.has_used_other_name|derived:any(person.other_family_name, person.other_given_names) recorded -> yes_no_code:Y/N";
const FIELDS = (id: string, fact: string) => `/combinations/${id}/questions/${encodeURIComponent(fact)}/form-fields`;
type Row = { form: string; edition: string; form_edition_id: string; data_path: string; caption: string; state: string; why: string | null; asks: { printed: string; deciding: string; writes: string } | null; can_confirm: boolean; can_ask: boolean; can_undo: boolean; change_id: string | null };

run(async () => {
  await T.ready();
  const keys = sql(`select combination_key from combination where retired_at is null order by combination_key`).split("\n").filter(Boolean);
  const vv = T.combo("vv.single");
  // Setup, as B86's: Visitor visa's questions first (its saved list replays only on that order), then the others'.
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  await T.needQuestions(vv);
  for (const k of keys.filter((x) => x !== "vv.single")) { const o = await T.questionsBySteps(T.combo(k)); console.log(`SETUP ${k}: ${JSON.stringify({ accepted: o.accepted, placed: o.placed, refused: o.refused.length })}`); }
  const before = T.spent();
  const plan = (await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI.has(step) ? "replay" : "rules" })) }, AUTHOR)).body;
  const r0 = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  await until(async () => ["COMPLETED", "DONE", "FAILED", "STOPPED", "CANCELLED"].includes(String((await call("GET", `/runs/${r0.body?.runId}`)).body?.status ?? "").toUpperCase()), 180_000);
  const errors = async (id: string) => ((await call("POST", `/combinations/${id}/submit`, { note: "B88" }, AUTHOR)).body?.errors ?? []) as { item?: string; message?: string }[];
  const hidingOf = async (id: string) => (await errors(id)).filter((e) => HIDING.test(e.message ?? ""));
  // Bake row 6 (QA-239, PR #1534): a condition another combination cannot honour is held there (a warning, the question asked
  // every time), never a refusal. The doors below still put it in force there.
  const heldOf = async (id: string) => (((await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? []) as { level?: string; item?: string; message?: string }[]).filter((e) => e.level === "warning" && /^Condition not used on this combination: /.test(e.message ?? ""));
  const unreachable = async (id: string) => (await errors(id)).filter((e) => /Unreachable question/.test(e.message ?? ""));
  const others = keys.filter((k) => k !== "vv.single");
  const base = new Map<string, number>();
  for (const k of keys) base.set(k, (await hidingOf(T.combo(k))).length);
  ok("setup: before any condition, no combination of the six holds a Hiding error", [...base.values()].every((n) => n === 0), Object.fromEntries(base));

  // ---------------------------------------------------------------- the conditions, accepted on Visitor visa only
  const queued = (await T.queued(vv)).filter((x: any) => x.kind === "condition" && x.form_fields?.fact);
  const one = new Map<string, string>(); for (const x of queued) if (!one.has(x.form_fields.fact)) one.set(x.form_fields.fact, x.id); // two cards on one question: the first
  for (const id of one.values()) await call("POST", "/review/proposals/decide", { ids: [id], action: "accept", reason: "Accepted by a test as the person deciding (B88)." }, AUTHOR);
  let approved = 0;
  for (const c of sql(`select id from library_change where kind='placement_condition' and status='WAITING' order by proposed_at`).split("\n").filter(Boolean)) if ((await call("POST", `/library/changes/${c}/approve`, { note: "Approved by a test as the second person (B88)." }, APPROVER)).status < 300) approved++;
  ok("setup: Visitor visa's saved run proposes conditions on 7 questions; all accepted there and approved by a second person (the saved list replays, so vv.single-ae2133b8a398 did not move)", one.size === 7 && approved === 7, { questions: [...one.keys()], approved });

  // ---------------------------------------------------------------- QA-239: the spread, by route
  const held = new Map<string, { item?: string; message?: string }[]>(), refusedBy = new Map<string, number>();
  for (const k of others) { held.set(k, await heldOf(T.combo(k))); refusedBy.set(k, (await hidingOf(T.combo(k))).length); }
  const heldCount = Object.fromEntries([...held].map(([k, v]) => [k, v.length]));
  ok("C4.11 B88 pass (QA-239): conditions approved on Visitor visa refuse no other combination: no Hiding error on any of them", [...refusedBy.values()].every((n) => n === 0), Object.fromEntries(refusedBy));
  ok("C4.11 B88 pass (QA-239): instead at least 4 other combinations hold them (the question asked every time), each warning saying how to use it there", [...held.values()].filter((v) => v.length > 0).length >= 4 && [...held.values()].flat().every((e) => /reads its answer/.test(e.message ?? "")), heldCount);
  const unr: Record<string, number> = {}; for (const k of keys) unr[k] = (await unreachable(T.combo(k))).length;
  ok("C4.11 B88: no Unreachable question on any of the six (every deciding question is asked; so none is named)", Object.values(unr).every((n) => n === 0), unr);

  // ---------------------------------------------------------------- the door's refusals, each in words, none writes
  const sp = T.combo("sp.outside"), NAME = "person.other_family_name";
  let rows: Row[] = (await call("GET", FIELDS(sp, NAME), undefined, AUTHOR)).body?.rows ?? [];
  const worked = rows.find((x) => x.state === "worked_out"), plain = rows.find((x) => x.state === "not_confirmed");
  ok("C4.11 B88 BR-2 pass: Study permit's worked-out Yes/No shows the form's printed question beside its deciding question, and can be asked as it", !!worked && worked.can_ask && /used any other name/.test(worked.asks?.printed ?? "") && /other name/i.test(worked.asks?.deciding ?? "") && worked.asks?.writes === "Y when Yes, N when No" && !/person\.|form1\[/.test(`${worked.asks?.printed} ${worked.asks?.deciding} ${worked.why}`), worked);
  const ask = (id: string, fact: string, x: Row, extra: object = {}, who: string | null = AUTHOR) => call("POST", "/library/form-field-conditions", { combinationId: id, fact, formEditionId: x.form_edition_id, dataPath: x.data_path, ask: true, ...extra }, who);
  const count0 = sql(`select count(*) from library_change where kind='form_field_condition'`);
  let r = await ask(sp, NAME, worked!, {}, null);
  ok("C4.11 B88 BR-3 fail: no person: 401", r.status === 401, r.status);
  r = await ask(sp, NAME, worked!, {}, REVIEWER);
  ok("C4.11 B88 BR-3 fail: a reviewer is not an author: 403, in words", r.status === 403 && words(r).length > 10, [r.status, words(r)]);
  r = await ask(sp, NAME, plain!);
  ok("C4.11 B88 BR-2 fail: a plain form field is not asked as a question: 409, in words", r.status === 409 && /worked-out Yes\/No/.test(words(r)), [r.status, words(r)]);
  r = await call("POST", "/library/form-field-conditions", { combinationId: sp, fact: NAME, formEditionId: worked!.form_edition_id, dataPath: worked!.data_path }, AUTHOR);
  ok("C4.11 B88 BR-2 fail: a worked-out Yes/No still cannot hold the condition (B86); the refusal points at asking it instead", r.status === 409 && /ask it as its deciding question instead/.test(words(r)), [r.status, words(r)]);
  r = await ask(sp, NAME, worked!, { clear: true });
  ok("C4.11 B88 fail: ask and undo together: 400", r.status === 400, r.status);
  r = await ask(sp, "person.has_used_other_name", worked!);
  ok("C4.11 B88 BR-1 fail: the deciding question itself has no condition, so nothing is asked: 409", r.status === 409, [r.status, words(r)]);
  ok("C4.11 B88 BR-3: every refusal wrote nothing", sql(`select count(*) from library_change where kind='form_field_condition'`) === count0);

  // ---------------------------------------------------------------- BR-3: a second person, nothing applied before
  r = await ask(sp, NAME, worked!);
  const askId = r.body?.id as string | undefined;
  ok("C4.11 B88 BR-3 pass: the author asks it; it waits for a second person, and says what changes elsewhere (BR-8)", r.status === 201 && !!askId && /asks "/.test(r.body?.label ?? ""), r.body);
  const mapOf = (x: Row) => sql(`select canonical_field_key || '|' || coalesce(transform, '') from form_field_map where form_edition_id='${x.form_edition_id}' and data_path='${x.data_path.replace(/'/g, "''")}' order by version desc limit 1`);
  const was = mapOf(worked!);
  ok("C4.11 B88 BR-3: nothing applied before approval: the form field still reads the hidden answer", was.startsWith(`${NAME}|`), was);
  r = await ask(sp, NAME, worked!);
  ok("C4.11 B88 BR-3 fail: a second proposal while one waits: 409", r.status === 409 && /already waits/.test(words(r)), [r.status, words(r)]);
  r = await call("POST", `/library/changes/${askId}/approve`, { note: "Self-approval (B88 test)." }, AUTHOR);
  ok("C4.11 B88 BR-3 fail: the author cannot approve their own change", r.status >= 400 && sql(`select status from library_change where id='${askId}'`) === "WAITING", [r.status, words(r)]);
  const card = (await call("GET", `/library/changes/${askId}`, undefined, APPROVER)).body;
  ok("C4.11 B88: the second person's card shows the form's printed question, the deciding question, and what it writes", /used any other name/.test(card?.form_field?.ask?.printed ?? "") && /Y when Yes, N when No/.test(card?.form_field?.ask?.writes ?? ""), card?.form_field);
  r = await call("POST", `/library/changes/${askId}/approve`, { note: "Checked against the form's printed question by a test (B88)." }, APPROVER);
  const now = mapOf(worked!);
  ok("C4.11 B88 BR-4 pass: approved by a second person: the form field reads the deciding Yes/No with its own codes, still vouching for its block's names", r.status < 300 && now === ASKED_STEP, [r.status, now]);
  rows = (await call("GET", FIELDS(sp, NAME), undefined, AUTHOR)).body?.rows ?? [];
  const asked = rows.find((x) => x.data_path === worked!.data_path);
  ok("C4.11 B88 BR-7: the panel keeps it under the question it used to read, as asking its deciding question, with Undo", asked?.state === "asked" && asked.can_undo && !asked.can_ask, asked);

  // ---------------------------------------------------------------- BR-7: the way back, then forward again
  r = await ask(sp, NAME, asked!, { ask: undefined, clear: true });
  const undoId = r.body?.id as string | undefined;
  r = undoId ? await call("POST", `/library/changes/${undoId}/approve`, { note: "Undo approved by a test (B88)." }, APPROVER) : r;
  ok("C4.11 B88 BR-7 pass: Undo, approved by a second person, puts its earlier step back exactly", r.status < 300 && mapOf(worked!) === was, [r.status, mapOf(worked!)]);
  r = await ask(sp, NAME, worked!);
  const again = r.body?.id as string | undefined;
  if (again) await call("POST", `/library/changes/${again}/approve`, { note: "Asked again by a test (B88)." }, APPROVER);
  ok("C4.11 B88 BR-7: asked again after Undo (a closed change never blocks a new one)", !!again && mapOf(worked!) === ASKED_STEP, mapOf(worked!));
  const statusOf = (id?: string) => sql(`select status from library_change where id='${id}'`);

  // ---------------------------------------------------------------- review M3: a returned or withdrawn Undo leaves the record true
  r = await ask(sp, NAME, worked!, { ask: undefined, clear: true });
  const u3 = r.body?.id as string | undefined;
  ok("C4.11 B88 BR-7: proposing Undo closes the approved ask it would replace (one open change per form field)", !!u3 && statusOf(again) === "WITHDRAWN", statusOf(again));
  r = await call("POST", `/library/changes/${u3}/return`, { note: "Returned by a test: keep it asked (B88)." }, APPROVER);
  ok("C4.11 B88 review M3 pass: the Undo returned, the ask it closed is approved again, and still waits for the next release", r.status < 300 && statusOf(again) === "APPROVED" && mapOf(worked!) === ASKED_STEP, [r.status, statusOf(again)]);
  r = await call("POST", `/library/changes/${u3}/withdraw`, { note: "Withdrawn by a test (B88)." }, AUTHOR);
  ok("C4.11 B88 review M3 pass: withdrawing the returned Undo changes nothing more", r.status < 300 && statusOf(again) === "APPROVED" && statusOf(u3) === "WITHDRAWN", [r.status, statusOf(again), statusOf(u3)]);
  r = await ask(sp, NAME, worked!, { ask: undefined, clear: true });
  const u4 = r.body?.id as string | undefined;
  r = await call("POST", `/library/changes/${u4}/withdraw`, { note: "Withdrawn while waiting by a test (B88)." }, AUTHOR);
  ok("C4.11 B88 review M3 pass: an Undo withdrawn while it waits puts the ask back too", r.status < 300 && statusOf(again) === "APPROVED", statusOf(again));
  ok("C4.11 B88 review M1: the change's words have no action code", !/\b[A-Z]+(?:_[A-Z]+)+\b/.test(`${(await call("GET", `/library/changes/${again}`, undefined, APPROVER)).body?.action_word} ${(await call("GET", `/library/changes/${again}`, undefined, APPROVER)).body?.kind_word}`));

  // ---------------------------------------------------------------- review M4: checked again at approval (DB: what no route can do between two steps)
  const NID = "person.national_id_number";
  const nidRow = ((await call("GET", FIELDS(sp, NID), undefined, AUTHOR)).body?.rows ?? []).find((x: Row) => x.can_ask) as Row | undefined;
  r = nidRow ? await ask(sp, NID, nidRow) : r;
  const nidAsk = r.body?.id as string | undefined, nidWas = nidRow ? mapOf(nidRow) : "";
  const q = sql(`select id || '|' || predicate_json::text from section_question where lineage_key='${NID}' and status in ('DRAFT','PUBLISHED') order by version desc limit 1`).split("|");
  sql(`update section_question set predicate_json = jsonb_set(predicate_json, '{value}', 'false') where id='${q[0]}'`); // the condition changed meanwhile (DB)
  r = await call("POST", `/library/changes/${nidAsk}/approve`, { note: "Approved by a test (B88)." }, APPROVER);
  ok("C4.11 B88 review M4 fail: the question's condition changed between proposal and approval: 409 \"Changed since\", nothing written", r.status === 409 && /condition changed/.test(words(r)) && mapOf(nidRow!) === nidWas && statusOf(nidAsk) === "WAITING", [r.status, words(r)]);
  sql(`update section_question set predicate_json = '${q.slice(1).join("|").replace(/'/g, "''")}'::jsonb where id='${q[0]}'`);
  const top = sql(`select id from form_field_map where form_edition_id='${nidRow!.form_edition_id}' and data_path='${nidRow!.data_path}' order by version desc limit 1`), step0 = sql(`select transform from form_field_map where id='${top}'`);
  sql(`update form_field_map set transform = 'as_is' where id='${top}'`); // the form field changed meanwhile (DB)
  r = await call("POST", `/library/changes/${nidAsk}/approve`, { note: "Approved by a test (B88)." }, APPROVER);
  ok("C4.11 B88 review M4 fail: the form field changed between proposal and approval: 409 \"Changed since\", nothing written", r.status === 409 && /form field changed/.test(words(r)) && statusOf(nidAsk) === "WAITING", [r.status, words(r)]);
  sql(`update form_field_map set transform = '${step0.replace(/'/g, "''")}' where id='${top}'`);
  r = await call("POST", `/library/changes/${nidAsk}/approve`, { note: "Approved by a test once nothing changed (B88)." }, APPROVER);
  ok("C4.11 B88 review M4 pass: with nothing changed, the same change is approved", r.status < 300 && /^person\.has_national_id\|derived:any\(/.test(mapOf(nidRow!)), [r.status, mapOf(nidRow!)]);

  // ---------------------------------------------------------------- breaker M2: Undo stays reachable once no problem shows the panel
  // B86's one route for Review and release (GET /combinations/:id/form-field-conditions) lists every question with its rows.
  const fol = ((await call("GET", `/combinations/${sp}/form-field-conditions`, undefined, AUTHOR)).body?.questions ?? []) as { fact: string; question: string; rows: Row[] }[];
  const askedIn = (f: string) => fol.find((x) => x.fact === f)?.rows.some((r) => r.state === "asked" && r.can_undo) ?? false;
  ok("C4.11 B88 breaker M2 pass: Review and release's list holds each asked Yes/No with its Undo, so it is reachable once no problem shows it", askedIn(NAME) && askedIn(NID) && !JSON.stringify(fol.map((x) => x.question)).includes("person."), fol.map((x) => ({ fact: x.fact, states: x.rows.map((r) => r.state) })));

  // ---------------------------------------------------------------- breaker M3: a new edition carries the step; its history is found by form and form field (DB)
  const key0 = sql(`select key from library_change where id='${again}'`);
  sql(`update library_change set key = '00000000-0000-0000-0000-000000000000:' || substr(key, 38) where id='${again}'`); // as if asked on an earlier edition
  const carried = ((await call("GET", FIELDS(sp, NAME), undefined, AUTHOR)).body?.rows ?? []).find((x: Row) => x.data_path === worked!.data_path);
  ok("C4.11 B88 breaker M3 pass: asked on an earlier edition, the form field still shows as asking its deciding question, with Undo", carried?.state === "asked" && carried.can_undo, carried?.state);
  sql(`update library_change set key = '${key0.replace(/'/g, "''")}' where id='${again}'`);

  // ---------------------------------------------------------------- BR-10: own words are shown, never parsed (IMM 1344's co-signer)
  const fs = T.combo("fs.spouse");
  const cos = ((await call("GET", FIELDS(fs, NAME), undefined, AUTHOR)).body?.rows ?? []).find((x: Row & { warning?: string | null }) => /CoSigner/.test(x.data_path) && x.can_ask) as (Row & { warning?: string | null }) | undefined;
  ok("C4.11 B88 BR-10 pass: a worked-out Yes/No with words of its own shows them as a warning beside the button, in plain words", !!cos && /^Its own words also say: "Only when co-signer = Y \(Question 3\)"\. Ask it only if/.test(cos.warning ?? "") && !/\.\"\./.test(cos.warning ?? ""), cos?.warning);

  // ---------------------------------------------------------------- Done when: every other combination cleared by product steps
  const through = { confirmed: 0, asked: 0, refused: [] as string[] };
  const clearAll = async (k: string) => {
    const id = T.combo(k);
    for (let pass = 0; pass < 2; pass++) for (const fact of [...new Set((await heldOf(id)).map((e) => e.item!))]) {
      for (const x of ((await call("GET", FIELDS(id, fact), undefined, AUTHOR)).body?.rows ?? []) as Row[]) {
        if (!x.can_confirm && !x.can_ask) continue;
        const p = await call("POST", "/library/form-field-conditions", { combinationId: id, fact, formEditionId: x.form_edition_id, dataPath: x.data_path, ...(x.can_ask ? { ask: true } : {}) }, AUTHOR);
        if (p.status >= 300) { through.refused.push(`${k} ${x.edition} ${x.caption}: ${p.status} ${words(p).slice(0, 120)}`); continue; }
        const a = await call("POST", `/library/changes/${p.body.id}/approve`, { note: "Checked against the form's words by a test as the second person (B88)." }, APPROVER);
        if (a.status >= 300) through.refused.push(`${k} approve ${x.caption}: ${a.status} ${words(a).slice(0, 120)}`); else if (x.can_ask) through.asked++; else through.confirmed++;
      }
    }
  };
  // The person on each other combination first; then Visitor visa's own (it holds the same errors on IMM 5257).
  for (const k of [...others, "vv.single"]) await clearAll(k);
  const left: Record<string, string[]> = {};
  for (const k of keys) { const h = [...await hidingOf(T.combo(k)), ...await heldOf(T.combo(k))]; if (h.length) left[k] = h.map((e) => `${e.item}: ${(e.message ?? "").slice(-160)}`); }
  ok("C4.11 B88 pass (QA-239, Done when): with the conditions accepted on Visitor visa, every other combination's held conditions are put in force through product steps (B86's door and B88's), each by a second person", !Object.keys(left).length && Number(sql(`select count(distinct key) from library_change where kind='form_field_condition' and action='SET_FORM_FIELD_QUESTION' and status='APPROVED'`)) === 11 /* 9, and BK-16 PR 2 (P-490): IMM 1295's two worked-out Yes/Nos on the Study permit */ && !through.refused.length, { ...through, left, asks: Number(sql(`select count(distinct key) from library_change where kind='form_field_condition' and action='SET_FORM_FIELD_QUESTION' and status='APPROVED'`)) });
  ok("C4.11 B88 BR-5: the conditions are still in force: no question lost its condition to get there", sql(`select count(distinct lineage_key) from section_question where predicate_json is not null and lineage_key in (${[...one.keys()].map((f) => `'${f}'`).join(",")}) and status in ('DRAFT','PUBLISHED')`) === "7");
  const unr2: Record<string, number> = {}; for (const k of keys) unr2[k] = (await unreachable(T.combo(k))).length;
  ok("C4.11 B88: still no Unreachable question on any of the six", Object.values(unr2).every((n) => n === 0), unr2);
  ok("C4.11 B88: US$0 (Replay and Rules only; the ledger unchanged)", T.spent() === before, { before, after: T.spent() });
  T.done();
});
