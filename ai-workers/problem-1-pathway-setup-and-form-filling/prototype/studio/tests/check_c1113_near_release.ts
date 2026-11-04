// C11.13 (forms lane; P-120: "a near duplicate needs a one-line reason, shown to the second person at release"): a field
// added close to an existing library field, with its one-line reason, is shown to the second person with what it is
// close to (the library's name and key) and the reason: on the decision they approve (GET /review/changes?group=batch)
// and on Review and release (GET /draft), first as waiting for a second person (never released, never counted), then,
// once approved, as released with the combination. Through the API as people do it (the rule-fact add, the queue's
// accept), on an isolated copy with the sample inputs loaded. No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh c1113_near 4482 start && tsx studio/tests/check_c1113_near_release.ts 4482 xr_studio_c1113_near
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4482), DB = process.argv[3] ?? "xr_studio_c1113_near";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", ACCEPTER = "user-C", APPROVER = "user-B";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
type Lib = { id: string; key: string; label: string; status: string; will_release: boolean; reason: string | null; near: { items: { key: string | null; name: string }[]; reason: string; given?: boolean; by?: string } | null };

(async () => {
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  // A combination with a rule (the add names the rule that needs the fact), and a two-word library name to be close to.
  let rk = sql(`select combination_id || '|' || predicate_key from predicate where status <> 'RETIRED' order by predicate_key limit 1`);
  if (!rk) {
    const combo = sql("select c.id from combination c join sqr_section_selection s on s.combination_id = c.id order by c.label limit 1");
    sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, when_plain, then_plain, for_whom, version, status, origin, updated_by) values (gen_random_uuid(), (select workspace_id from combination where id='${combo}'), '${combo}', 'r_c1113_near', '{"field":"person.family_name","op":"exists"}', 'when the test says so', 'nothing new', 'principal_applicant', 1, 'DRAFT', 'HUMAN', 'user-A')`);
    rk = `${combo}|r_c1113_near`;
  }
  const [combo, rule] = rk.split("|");
  const [existingKey, existingName] = sql(`select canonical_field_key || '|' || label from canonical_field where canonical_field_key = 'person.family_name' order by version desc limit 1`).split("|");
  ok("setup: the library has a two-word field to be close to", existingKey === "person.family_name" && !!existingName && existingName.trim().includes(" "), existingName);
  const before = (await call("GET", "/draft", undefined, APPROVER)).body;
  const F = { label: `${existingName} at birth`, meaning: "The family name this person was given at birth (Sample).", valueType: "text", subject: "person" };
  const REASON = "The name given at birth, which can differ from the family name used now.";

  // ─────────────────── the reason is needed (the rule-fact add, P-120)
  let r = await call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rule)}/fact`, F, AUTHOR);
  ok("C11.13 P-120 fail: a field close to an existing one, with no reason, is refused, naming the close field", r.status === 400 && words(r).includes(existingName) && /say why it is not the same/.test(words(r)), [r.status, words(r)]);
  r = await call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rule)}/fact`, { ...F, nearReason: REASON }, AUTHOR);
  ok("setup: with its one-line reason it is proposed", r.status === 201 && !!r.body?.proposalId, [r.status, words(r)]);
  const pid = r.body?.proposalId;
  // An item close to nothing, accepted in its own decision: its rows carry no near line (the fail case below).
  const plain = await call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rule)}/fact`, { ...F, label: "Hobby collected for a test", meaning: "A hobby, collected only by this test (Sample)." }, AUTHOR);
  // One the one door finds close by itself (the same meaning as the first) with no reason from a person.
  const found = await call("POST", `/combinations/${combo}/rules/${encodeURIComponent(rule)}/fact`, { ...F, label: "Surname given at birth" }, AUTHOR);
  r = await call("POST", "/review/proposals/decide", { ids: [pid], action: "accept" }, ACCEPTER);
  ok("setup: a person accepts it on To review (a draft field and its addition waiting for a second person)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  const r2 = await call("POST", "/review/proposals/decide", { ids: [plain.body?.proposalId], action: "accept" }, ACCEPTER);
  ok("setup: the plain item is accepted too", plain.status === 201 && r2.status < 300, [plain.status, r2.status]);
  // QA-192 (P-120, P-149 (2)): the one door found it close and no person said why it is not the same, so the decider must.
  const r3no = await call("POST", "/review/proposals/decide", { ids: [found.body?.proposalId], action: "accept" }, ACCEPTER);
  ok("QA-192 fail: a near item with no person's reason is not accepted without one: 400, naming the close field; it stays waiting", found.status === 201 && r3no.status === 400 && words(r3no).includes(existingName) && /say in one line why it is not the same/.test(words(r3no)) && sql(`select status from proposal_item where id = '${found.body?.proposalId}'`) === "waiting", [found.status, r3no.status, words(r3no)]);
  const FOUND_REASON = "Surname at birth is kept apart from the family name used now.";
  const r3 = await call("POST", "/review/proposals/decide", { ids: [found.body?.proposalId], action: "accept", reason: FOUND_REASON }, ACCEPTER);
  ok("QA-192 pass: with the decider's one-line reason it is accepted, and the reason is kept as a person's", r3.status < 300 && sql(`select identity->>'nearReason' || '|' || coalesce(identity->>'nearReasonBy', '-') from proposal_item where id = '${found.body?.proposalId}'`) === `${FOUND_REASON}|person`, [r3.status, words(r3)]);
  const foundKey = sql(`select key from library_change where proposal_item_id = '${found.body?.proposalId}' limit 1`);
  const key = sql(`select key from library_change where proposal_item_id = '${pid}' limit 1`);
  const plainKey = sql(`select key from library_change where proposal_item_id = '${plain.body?.proposalId}' limit 1`);

  // ─────────────────── the second person's decision shows it
  const batches = (await call("GET", "/review/changes?group=batch", undefined, APPROVER)).body?.batches ?? [];
  const inBatch = batches.flatMap((b: { items: Lib[] }) => b.items).find((x: Lib) => x.key === key) as Lib | undefined;
  ok("C11.13 P-120 pass: the decision the second person approves shows what it is close to (name and key) and the reason", inBatch?.near?.reason === REASON && inBatch.near.items.some((n) => n.key === existingKey && n.name === existingName), inBatch?.near);
  const batchId = sql(`select batch_id from library_change where key = '${key}' limit 1`);
  const one = (await call("GET", `/review/changes/batch/${batchId}`, undefined, APPROVER)).body;
  ok("C11.13 P-120 pass: the decision's own page carries the same near line", (one?.items ?? []).some((x: Lib) => x.key === key && x.near?.reason === REASON));

  // ─────────────────── Review and release, while it waits
  let d = (await call("GET", "/draft", undefined, APPROVER)).body;
  let row = (d?.library ?? []).find((x: Lib) => x.key === key) as Lib | undefined;
  ok("C11.13 P-120 pass: Review and release lists it as waiting for a second person, with what it is close to and why", row?.status === "WAITING" && row.will_release === false && row.near?.reason === REASON && row.near.items.some((n) => n.key === existingKey), row && { status: row.status, will_release: row.will_release, near: row.near });
  ok("C11.13 fail: a waiting change is never counted as a change to release, and is said apart", d.changes === before.changes && d.waiting_library >= 3, { before: before.changes, now: d.changes, waiting: d.waiting_library });
  const plainRow = (d?.library ?? []).find((x: Lib) => x.key === plainKey) as Lib | undefined;
  ok("C11.13 fail: an item close to nothing has no near line", !!plainRow && plainRow.near === null, plainRow?.near);
  ok("C11.13 P-120 pass: a reason a person wrote is marked as given, by a person", row?.near?.given === true && (row?.near as { by?: string })?.by === "person", row?.near);
  // Review m1: an AI-drafted item's near reason is the AI's words: marked as the AI's, never as a person's.
  const aiItem = sql(`select proposal_item_id from library_change where key = '${foundKey}' limit 1`);
  sql(`update proposal_item set origin = 'ai', identity = (jsonb_set(identity::jsonb, '{nearReason}', '"An AI sentence: these differ."') - 'nearReasonBy')::json where id = '${aiItem}'`);
  const aiRow = ((await call("GET", "/draft", undefined, APPROVER)).body?.library ?? []).find((x: Lib) => x.key === foundKey) as (Lib & { near: { given: boolean; by: string } | null }) | undefined;
  ok("C11.13 P-120 fail (review m1): an AI-drafted near reason is marked as the AI's words, not a person's", aiRow?.near?.given === true && aiRow.near.by === "ai", aiRow?.near);
  const foundRow = (d?.library ?? []).find((x: Lib & { near: { given?: boolean; by?: string } | null }) => x.key === foundKey) as (Lib & { near: { given: boolean; by: string; reason: string } | null }) | undefined;
  ok("QA-192 pass: the decider's reason for a match the rules found reaches the second person at release, as given by a person", foundRow?.near?.reason === FOUND_REASON && foundRow.near.given === true && foundRow.near.by === "person", foundRow?.near);
  // An item accepted before QA-192 carries only the rule's own words: still shown, and marked not given (never as a reason).
  sql(`update proposal_item set origin = 'rules', identity = (jsonb_set(identity::jsonb, '{nearReason}', '"one name holds the other"') - 'nearReasonBy')::json where id = '${aiItem}'`);
  const ruleRow = ((await call("GET", "/draft", undefined, APPROVER)).body?.library ?? []).find((x: Lib) => x.key === foundKey) as (Lib & { near: { given: boolean } | null }) | undefined;
  ok("C11.13 P-120 fail: a match the rules found with only the rule's words is shown, and marked not given (never as a reason)", !!ruleRow?.near && ruleRow.near.given === false && ruleRow.near.items.length > 0, ruleRow?.near);
  const bar = (await call("GET", "/draft?summary=1", undefined, APPROVER)).body;
  ok("C11.13 fail: the draft bar (summary) counts and lists only what will be released", bar.changes === before.changes && !(bar.library ?? []).some((x: Lib) => x.status === "WAITING"), { changes: bar.changes, library: (bar.library ?? []).length });

  // ─────────────────── a release now leaves it waiting
  const rel = await call("POST", "/pack/release", { expectedChanges: d.changes }, APPROVER);
  ok("C11.13 fail: releasing now does not release a change still waiting (it stays WAITING)", sql(`select status from library_change where key = '${key}' and action = 'ADD' order by proposed_at desc limit 1`) === "WAITING", [rel.status, words(rel)]);

  // ─────────────────── approved: released with the near line
  r = await call("POST", `/review/changes/batch/${batchId}`, { decision: "approve" }, APPROVER);
  ok("setup: the second person approves the decision", r.status < 300, r.status >= 300 ? words(r) : undefined);
  d = (await call("GET", "/draft", undefined, APPROVER)).body;
  row = (d?.library ?? []).find((x: Lib) => x.key === key) as Lib | undefined;
  ok("C11.13 P-120 pass: once approved it reads Will be released, still with what it is close to and why", row?.status === "APPROVED" && row.will_release === true && row.near?.reason === REASON, row && { status: row.status, near: row.near });
  ok("C11.13 pass: once approved it counts as a change to release", d.changes >= 1 && (d.library as Lib[]).filter((x) => x.will_release).length <= d.changes, d.changes);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
