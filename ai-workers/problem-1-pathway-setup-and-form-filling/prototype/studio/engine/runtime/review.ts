// C8.3 Representative review (screens lane, B144; P-406, P-412, P-155 (1); concept screens/B144/concept.md r2, challenge
// B1, B2, M1-M7, m1-m8; AG-07 AG-7-29 r1-r10, SA-01B SA-1B-221): pure rules, no database, no route, no clock. The case
// officer sends one or more filings for review; the representative of record opens each, ticks its checklist, and
// approves it (each form stamped with the facts it read and its file) or sends it back with reasons. A later fact change
// withdraws a form's approval (P-412 F1): the representative then sees only the changed forms and re-approves them in
// one click. Only the representative of record decides (P-412 F2). The routes are api/src/review-rounds.ts.
// Three ways this differs from AG-7-29 (concept §1, decided by the founder in P-412): a fact change withdraws the
// approval (r10 keeps it); only the representative of record decides (not any holder of review-approve); "Changed since
// review" counts form facts. Legal points: Unconfirmed: no counsel. Checks: tests/runtime/check_review_rounds.ts.
import { factChanges, type ChangeWords, type FactChange } from "./out-of-date.ts";
import type { FormFact } from "./forms.ts";

export type RowStatus = "sent" | "under_review" | "approved" | "sent_back";
export type Move = "open" | "approve" | "send_back";
export type Problem = { status: 400 | 403 | 404 | 409; detail: string; field?: string };

// ------------------------------------------------------------------ BR-3, BR-4, BR-5, M4: the allowed moves

/** The one allowed move per decision (M4): Sent → Under review on open; Under review → Approved or Sent back. Anything
 *  else is null (the route answers 409 "decided meanwhile"). The database trigger allows the same moves only. */
export function nextStatus(from: RowStatus, move: Move): RowStatus | null {
  if (move === "open") return from === "sent" ? "under_review" : null;
  if (from !== "under_review") return null;
  return move === "approve" ? "approved" : "sent_back";
}
export const isOpen = (s: RowStatus) => s === "sent" || s === "under_review";

// ------------------------------------------------------------------ F2 (P-412, P-155 (1)): the one permission check

export const READ_ONLY_WORDS = "Only the representative of record approves or sends back. You can read this review.";
/** Who opens, ticks, approves, sends back and re-approves: the representative of record of the case now, nobody else
 *  (P-412 F2; reassigning the representative, C6.11, covers absences). Null: allowed. */
export function mayDecide(actor: string, representativeNow: string | null): string | null {
  return representativeNow && actor === representativeNow ? null : READ_ONLY_WORDS;
}

// ------------------------------------------------------------------ F1 (P-412), BR-7, M2: the one rule function

/** A stamp (an approved form's facts hash and the representative of record who approved it) and the form today. */
export type StampNow = { hash: string | null; representative: string | null };
export type Withdrawn = "none" | "representative" | "facts" | "superseded" | "file";
/** Whether an approval still counts: only while the form's facts hash and the representative of record are both
 *  unchanged (P-412 F1: a fact change withdraws it; M2: the same rule as C7.6, readiness-inputs.ts), and while no newer
 *  round of the filing exists (`superseded`, break B1: a filing sent for review again, or sent back, is no longer
 *  approved). `why` says what withdrew it. Used by the Review page, the re-approve route, C7.6's filing review line and
 *  so C8.2's "Reviewed by". */
export type StampFile = { kind: string | null; sha256: string | null };
export function stampCurrent(stamp: { hash: string | null; by: string | null; superseded?: boolean; file?: StampFile } | null, now: StampNow & { validatedSha?: string | null }): { current: boolean; why: Withdrawn | null } {
  if (!stamp?.hash || !stamp.by) return { current: false, why: "none" };
  if (stamp.superseded) return { current: false, why: "superseded" };
  if (stamp.by !== now.representative) return { current: false, why: "representative" };
  if (stamp.hash !== now.hash) return { current: false, why: "facts" };
  if (stamp.file !== undefined && !fileStampCurrent(stamp.file, now.validatedSha ?? null)) return { current: false, why: "file" };
  return { current: true, why: null };
}

/** QA-345 (the tech lead's ruling (a), 9 Nov): an approval stamps the file it approved. A form whose validated copy
 *  counts for filing now (`validatedSha`, the fingerprint of the barcode form's file that goes to IRCC) is covered only
 *  by a stamp of that very validated copy; a stamp of no file, of the generated copy, or of another validated copy (a
 *  second read-back of the same facts, review M1) then asks for re-approval. A form with no validated copy for filing (an
 *  Online form, a form not read back yet) is covered by its stamp as it is. */
export const fileStampCurrent = (stamp: StampFile, validatedSha: string | null) => !validatedSha || (stamp.kind === "validated_copy" && stamp.sha256 === validatedSha);

/** QA-345 (ruling (a)): whether a validated copy read back now is stamped, once, to an earlier approval of its form: the
 *  approval stamped no validated copy (none, or the generated copy it was made from), it is the newest row of its filing
 *  and still approved, by the representative of record now, and the copy holds the facts the approval stamped (its
 *  input fingerprint equals the stamped snapshot's). Else the approval stays as it was, and fileStampCurrent asks for
 *  re-approval when that copy counts for filing. */
export function readBackStamps(x: { stampKind: string | null; approved: boolean; latest: boolean; by: string | null; representative: string | null; stampedFacts: string | null; readFacts: string }): boolean {
  return (x.stampKind === "none" || x.stampKind === "generated_copy") && x.approved && x.latest && !!x.by && x.by === x.representative && !!x.stampedFacts && x.stampedFacts === x.readFacts;
}

// ------------------------------------------------------------------ BR-1 Send

export type SendFiling = { id: string; label: string; active: boolean; recorded: boolean; inOpenRound: boolean; openBlocks: number };
/** BR-1: filings with no open block are ticked by default in the dialog; one whose approval still counts is not (break
 *  B1: sending it again withdraws that approval, so it is a person's choice). */
export const tickedByDefault = (filings: (Pick<SendFiling, "id" | "active" | "openBlocks" | "recorded" | "inOpenRound"> & { approved?: boolean })[]) => filings.filter((f) => f.active && !f.openBlocks && !f.recorded && !f.inOpenRound && !f.approved).map((f) => f.id);
/** BR-1, BR-9: why a send is refused (null: it may go). None ticked: 400; not on this case: 404; removed (C6.13) or
 *  recorded as submitted: 409; already in an open round: 409 naming it. */
export function sendProblem(asked: unknown, filings: SendFiling[]): Problem | null {
  if (!Array.isArray(asked) || !asked.length) return { status: 400, field: "filings", detail: "Tick at least one filing to send for review." };
  if (asked.some((x) => typeof x !== "string")) return { status: 400, field: "filings", detail: "Send filings as a list of filing ids." };
  if (new Set(asked).size !== asked.length) return { status: 400, field: "filings", detail: "A filing is listed twice: list each once." };
  for (const id of asked as string[]) {
    const f = filings.find((x) => x.id === id);
    if (!f) return { status: 404, detail: "That filing is not on this case. Reload." };
    if (!f.active) return { status: 409, detail: `${f.label} was removed from the application (Remove filing): add it back before it is reviewed.` };
    if (f.recorded) return { status: 409, detail: `${f.label} is recorded as submitted: its review is closed. Correct the record instead.` };
    if (f.inOpenRound) return { status: 409, detail: `${f.label} is already sent for review and not decided yet: open that review instead.` };
  }
  return null;
}

/** B2: the file a form is stamped with: its validated copy read back for today's facts (the barcode form's file that
 *  goes to IRCC), else the newest generated copy whose facts equal the form's facts now, else none (an Online form);
 *  "waits" for a form that cannot start yet (m8: "Not stamped: waits for an answer"). */
export type FileStamp = { kind: "validated_copy" | "generated_copy" | "none" | "waits"; id: string | null; sha256: string | null };
export function fileOf(x: { waits: boolean; inputHash: string; validated: { id: string; sha256: string | null; current: boolean } | null; generated: { id: string; sha256: string | null; hash: string } | null }): FileStamp {
  if (x.waits) return { kind: "waits", id: null, sha256: null };
  if (x.validated?.current && x.validated.sha256) return { kind: "validated_copy", id: x.validated.id, sha256: x.validated.sha256 };
  if (x.generated && x.generated.hash === x.inputHash && x.generated.sha256) return { kind: "generated_copy", id: x.generated.id, sha256: x.generated.sha256 };
  return { kind: "none", id: null, sha256: null };
}

// ------------------------------------------------------------------ BR-2 Checklist

export type CheckItem = { key: string; source: "default" | "program" | "confirmations" | "form"; wording: string; live: Record<string, unknown> | null };
export type ProgramItem = { key: string; wording: string };
/** QA-446 (P-510 (2): P-242 and P-411 stand): a filing's answers by who stands behind them, counted exactly as the
 *  officer's Agent view counts them (the same sections, engine/runtime/case.ts sectionAnswers), so the household line,
 *  the tabs, the sections and this checklist agree. An answer off the officer's Confirm list is either Declared by the
 *  person who gave it (the client's own, a minor's typed by the parent, a person's own on their link: no officer
 *  confirmation needed) or Confirmed by the officer; one still on the list is "to confirm". `nameOf` names who gave it. */
export type ValuesBy = { declared: { by: string; facts: number }[]; confirmed: { by: string; facts: number }[]; toConfirm: number; waitsClient: number };
/** Review m2: an answer staff recorded that waits for the client's re-confirmation (C6.18) is not the officer's to
 *  confirm, so it is counted apart. Review m3: an answer saved on a person's own link is named by that person (`about`),
 *  never by the link's actor. `nameOf` names a person or staff member by their actor id. */
export function valuesOf(answers: { confirmed: boolean; mark: string; by: string; channel?: string; about?: string; awaits_client?: boolean }[], nameOf: (actor: string) => string): ValuesBy {
  const add = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const declared = new Map<string, number>(), confirmed = new Map<string, number>();
  let toConfirm = 0, waitsClient = 0;
  for (const a of answers) {
    if (a.awaits_client) waitsClient++;
    else if (!a.confirmed) toConfirm++;
    else add(a.mark === "confirmed" ? confirmed : declared, a.channel === "own_link" && a.about ? a.about : nameOf(a.by));
  }
  const list = (m: Map<string, number>) => [...m].map(([by, facts]) => ({ by, facts }));
  return { declared: list(declared), confirmed: list(confirmed), toConfirm, waitsClient };
}
const facts = (n: number) => `${n} fact${n === 1 ? "" : "s"}`;
const totalOf = (v: ValuesBy) => [...v.declared, ...v.confirmed].reduce((n, c) => n + c.facts, 0) + v.toConfirm + v.waitsClient;
/** The checklist's values item in words: "Values: 93 facts, 93 declared by Client A · 0 to confirm" (QA-446). */
export function valuesWords(v: ValuesBy): string {
  if (!totalOf(v)) return "Values: none answered yet";
  const parts = [...v.declared.map((c) => `${c.facts} declared by ${c.by}`), ...v.confirmed.map((c) => `${c.facts} confirmed by ${c.by}`), `${v.toConfirm} to confirm${v.toConfirm ? " (the officer's Confirm section)" : ""}`,
    ...(v.waitsClient ? [`${v.waitsClient} wait${v.waitsClient === 1 ? "s" : ""} for the client to re-confirm`] : [])];
  return `Values: ${facts(totalOf(v))}, ${parts.join(" · ")}`;
}

/** BR-2: the checklist copied into the round for one filing: the two default items with their live state from C7.6,
 *  the program's items for the filing's combination (the scaffolding port), the values with who stands behind them
 *  (QA-446: declared by whom, confirmed by whom, still to confirm; M6: a "checked against the document" record does not
 *  exist yet), and one "checked" mark per form (GitHub's "Viewed"). */
export function checklistOf(x: { critical: number; documents: { verified: number; required: number }; program: ProgramItem[]; values: ValuesBy; forms: { item: string; label: string }[] }): CheckItem[] {
  const v = x.values;
  return [
    { key: "default:no_critical", source: "default", wording: "No open critical warnings", live: { open: x.critical } },
    { key: "default:documents", source: "default", wording: "All required documents verified", live: { verified: x.documents.verified, required: x.documents.required } },
    ...x.program.map((p) => ({ key: `program:${p.key}`, source: "program" as const, wording: p.wording, live: null })),
    { key: "confirmations", source: "confirmations", wording: valuesWords(v), live: { facts: totalOf(v), declared: v.declared, confirmed: v.confirmed, to_confirm: v.toConfirm, waits_client: v.waitsClient } },
    ...x.forms.map((f) => ({ key: `form:${f.item}`, source: "form" as const, wording: `${f.label} checked`, live: null })),
  ];
}

// ------------------------------------------------------------------ BR-4 Approve

export const untickedWords = (n: number) => `${n} checklist item${n === 1 ? " is" : "s are"} not ticked. Approve anyway? This is recorded.`;
/** BR-4 (r6, AG17-D78): the checklist items not ticked (form marks are not checklist items) need ONE confirmation,
 *  recorded, with no reason asked. */
export function untickedProblem(checks: { key: string; source: string; ticked: boolean }[], confirm: unknown): { unticked: string[]; problem: Problem | null } {
  const unticked = checks.filter((c) => c.source !== "form" && !c.ticked).map((c) => c.key);
  return { unticked, problem: unticked.length && confirm !== true ? { status: 400, field: "confirm_unticked", detail: untickedWords(unticked.length) } : null };
}

/** BR-4, M4: the decision carries, per form, the facts hash the page loaded; any form that reads otherwise now is a 409
 *  and nothing is stamped. A missing or malformed hash is a 400. */
export function hashesProblem(sent: unknown, live: { item: string; hash: string | null }[]): Problem | null {
  if (!sent || typeof sent !== "object" || Array.isArray(sent)) return { status: 400, field: "form_hashes", detail: "Send form_hashes: each form's facts hash as the page loaded it (Reload)." };
  const s = sent as Record<string, unknown>;
  for (const f of live) {
    const v = s[f.item];
    if (f.hash === null) { if (v !== null && v !== undefined && v !== "waits") return { status: 409, detail: "Changed while you were reading: reload. Nothing was stamped." }; continue; }
    if (typeof v !== "string") return { status: 400, field: "form_hashes", detail: "Send form_hashes for every form of the filing, as the page loaded them (Reload)." };
    if (v !== f.hash) return { status: 409, detail: "Changed while you were reading: reload. Nothing was stamped." };
  }
  return null;
}

// ------------------------------------------------------------------ BR-5 Send back

export type Reason = { text: string; item?: string; check?: string };
const hex = (a: number, b?: number) => (b === undefined ? `\\u${a.toString(16).padStart(4, "0")}` : `\\u${a.toString(16).padStart(4, "0")}-\\u${b.toString(16).padStart(4, "0")}`);
/** Control and invisible characters (the same set as readiness.ts passProblem), never accepted in a reason. */
const BAD_TEXT = new RegExp(`[${[hex(0, 8), hex(0xb), hex(0xc), hex(0xe, 0x1f), hex(0x7f, 0x9f), hex(0x200b), hex(0x200e), hex(0x200f), hex(0x2028, 0x202e), hex(0x2066, 0x2069), hex(0xfeff)].join("")}]`);
/** BR-5 (r7): at least one reason, each 5 to 500 characters with words, optionally pinned to one form of the filing
 *  (its item) or one checklist item of the round. */
export function reasonsOf(reasons: unknown, forms: Set<string>, checks: Set<string>): { reasons: Reason[] } | { problem: Problem } {
  const no = (detail: string): { problem: Problem } => ({ problem: { status: 400, field: "reasons", detail } });
  if (!Array.isArray(reasons) || !reasons.length) return no("Say what should change, and on which form: at least one reason.");
  if (reasons.length > 20) return no("Keep it to 20 reasons.");
  const out: Reason[] = [];
  for (const r of reasons) {
    const x = (r ?? {}) as { text?: unknown; item?: unknown; check?: unknown };
    const t = typeof x.text === "string" ? x.text.trim() : "";
    if ([...t.replace(/\s/g, "")].length < 5 || !/[\p{L}\p{N}]/u.test(t)) return no("Say what should change, and on which form (at least 5 characters, with words).");
    if (t.length > 500) return no("Keep each reason to 500 characters.");
    if (BAD_TEXT.test(t)) return no("Remove the control or invisible characters from the reason.");
    if (x.item !== undefined && x.item !== null && (typeof x.item !== "string" || !forms.has(x.item))) return no("Pin the reason to a form of this filing, or to none.");
    if (x.check !== undefined && x.check !== null && (typeof x.check !== "string" || !checks.has(x.check))) return no("Pin the reason to a checklist item of this filing, or to none.");
    out.push({ text: t, ...(typeof x.item === "string" ? { item: x.item } : {}), ...(typeof x.check === "string" ? { check: x.check } : {}) });
  }
  return { reasons: out };
}

// ------------------------------------------------------------------ BR-8, M3: approver ≠ author (C7.6's rule unchanged)

/** BR-8 with C7.6's self-review rule (api/src/readiness.ts: P-155 (1), breaks B9 and N4): the representative is an
 *  author of the filing when they prepared it — when the case's own work record names them (`prepared`,
 *  engine/runtime/preparers.ts: who opened the case, who typed or confirmed its facts), or when they typed a fact a form
 *  of it reads after it was sent for review (`changedByReviewer`, M3). An author on a firm that is not solo, with
 *  another person who also prepared it, cannot review it as a second person (409); an author confirms "I prepared and
 *  reviewed this filing myself" (400 without it), logged as Self-reviewed, never as a second person.
 *  BK-18 (QA-448, P-525 (1)): `prepared` is who did the work, never who is named on the case team. A case officer
 *  assigned to the case who did nothing neither makes the representative's own work a second person's review (walk 1
 *  step S8: the record read as two people) nor blocks it; a person who really worked on it still does. */
export function selfReviewOf(x: { actor: string; prepared: Set<string>; solo: boolean; changedByReviewer: boolean; self: unknown; after?: "send" | "approval" }): { kind: "reviewed" | "self_reviewed" } | { problem: Problem } {
  const prepared = x.prepared.has(x.actor), author = prepared || x.changedByReviewer;
  const authors = new Set([...x.prepared, ...(x.changedByReviewer ? [x.actor] : [])]);
  if (author && !x.solo && authors.size > 1) return { problem: { status: 409, detail: prepared
    ? "You worked on this filing and so did somebody else at the firm: a review by you would read as a second person's. Hand the review to a representative who did not work on it (change the representative of record), or pass the review warning with a reason."
    : x.after === "approval"
      ? "You changed a fact on this filing after it was approved, so a re-approval by you would read as a second person's. Ask the case officer to send it for review again, hand the review to another representative, or pass the review warning with a reason."
      : "You changed a fact on this filing after it was sent for review, so an approval by you would read as a second person's. Send it back to the case officer, hand the review to another representative, or pass the review warning with a reason." } };
  if (author && x.self !== true) return { problem: { status: 400, field: "self", detail: prepared
    ? "You prepared this filing yourself: confirm \"I prepared and reviewed this filing myself\". It is logged as Self-reviewed, never as a second person."
    : x.after === "approval" ? "You changed a fact on this filing after it was approved: confirm \"I prepared and reviewed this filing myself\". It is logged as Self-reviewed."
    : "You changed a fact on this filing after it was sent: confirm \"I prepared and reviewed this filing myself\", or send it back. It is logged as Self-reviewed." } };
  return { kind: author ? "self_reviewed" : "reviewed" };
}
export const SELF_STATEMENT = "I prepared and reviewed this filing myself.";

// ------------------------------------------------------------------ BR-6, BR-7: what each form shows

export type FormState = "to_check" | "checked" | "changed_since_review" | "approved" | "approval_withdrawn" | "sent_back" | "not_stamped_waits";
/** BR-6, BR-7, m5, m8: one form's state on the Review page. An open row: "Changed since review" when its facts differ
 *  from the filing's previous round, or changed after this round was sent (a check mark clears on change, as GitHub's
 *  "Viewed"); else Checked when its mark is ticked; else To check. An approved row: Approved while its stamp is current
 *  (stampCurrent), else "Approval withdrawn". A form that waits is never stamped. */
export function formStateOf(x: { status: RowStatus; waits: boolean; checked: boolean; frozenHash: string | null; previousHash: string | null | undefined; liveHash: string | null; stamp: { hash: string | null; by: string | null; superseded?: boolean; file?: StampFile } | null; representative: string | null; validatedSha?: string | null }): { state: FormState; why: Withdrawn | null } {
  if (x.waits) return { state: "not_stamped_waits", why: null };
  if (x.status === "approved") { const c = stampCurrent(x.stamp, { hash: x.liveHash, representative: x.representative, validatedSha: x.validatedSha }); return c.current ? { state: "approved", why: null } : { state: "approval_withdrawn", why: c.why }; }
  if (x.status === "sent_back") return { state: "sent_back", why: null };
  if (x.liveHash !== x.frozenHash) return { state: "changed_since_review", why: "facts" };
  if (x.checked) return { state: "checked", why: null };
  if (x.previousHash !== undefined && x.previousHash !== x.frozenHash) return { state: "changed_since_review", why: "facts" };
  return { state: "to_check", why: null };
}
export const STATE_WORDS: Record<FormState, string> = {
  to_check: "To check", checked: "Checked", changed_since_review: "Changed since review", approved: "Approved, still current",
  approval_withdrawn: "Approval withdrawn", sent_back: "Sent back", not_stamped_waits: "Not stamped: waits for an answer",
};

/** One changed fact for the page: before → after, and the person who typed the new value (its answer's origin, not its
 *  confirmer, m4) and when. */
export type ChangeLine = FactChange & { typed_by: string | null; typed_at: string | null };
/** BR-6 (r10): a form's facts then (a frozen snapshot) against now, each change with its typist. One call per form over
 *  answers already read in one batch (m6). */
export function changesOf(then: Pick<FormFact, "fact" | "about" | "row" | "value">[], now: Pick<FormFact, "fact" | "about" | "row" | "value">[], words: ChangeWords, typist: (about: string, fact: string) => { by: string; at: string } | null): ChangeLine[] {
  return factChanges(then, now, words).map((c) => { const t = typist(c.relation ? `${c.about}/${c.relation}` : c.about, c.fact); return { ...c, typed_by: t?.by ?? null, typed_at: t?.at ?? null }; });
}

/** BR-8 (M3): whether the representative typed any of these changed facts (the changes since the round was sent). */
export const changedBy = (changes: ChangeLine[], actor: string) => changes.some((c) => c.typed_by === actor);

/** BR-8 (CI on #1247, gate B on the configured checkpoint): whether the representative typed, after `since`, an answer
 *  a form of the filing reads, confirmed or not. An answer typed but not confirmed yet is not among a form's confirmed
 *  facts, so a before → after of confirmed facts cannot see it (on the checkpoint every fact is collected in the client
 *  questionnaire, and an answer staff type there waits to be confirmed); the answers themselves do. `reads`: the
 *  forms' "<subject>|<fact>" keys; `answers`: each current answer's key, its typist and when it was typed. Facts of the
 *  firm record (the representative's own details) are nobody's typing. */
export function typedSince(answers: { key: string; by: string | null; at: string | null }[], reads: Set<string>, actor: string, since: string): boolean {
  return answers.some((a) => a.by === actor && !!a.at && a.at > since && reads.has(a.key) && !a.key.startsWith("representative"));
}

/** P-412 F1: the forms whose approval a later change withdrew (the change-only view lists only these). */
export function withdrawnForms<T extends { item: string; waits: boolean; stamp: { hash: string | null; by: string | null; superseded?: boolean; file?: StampFile } | null; liveHash: string | null; validatedSha?: string | null }>(forms: T[], representative: string | null): T[] {
  return forms.filter((f) => !f.waits && !stampCurrent(f.stamp, { hash: f.liveHash, representative, validatedSha: f.validatedSha }).current);
}

/** "Approval withdrawn: Date of birth changed by the case officer, 8 Nov." (§5); the representative's change (M2) and
 *  a change with no fact to name have their own words. */
export function withdrawnWords(why: Withdrawn | null, first: { label: string; by: string | null; at: string | null } | null, day: (at: string | null) => string | null): string {
  if (why === "representative") return "Approval withdrawn: the representative of record changed.";
  if (why === "superseded") return "Approval withdrawn: the filing was sent for review again.";
  if (why === "file") return FILE_WITHDRAWN;
  if (!first) return "Approval withdrawn: a fact it reads changed.";
  const when = day(first.at);
  return `Approval withdrawn: ${first.label} changed${first.by ? ` by ${first.by}` : ""}${when ? `, ${when}` : ""}.`;
}
/** QA-345: the words when the validated copy that is filed is not the file the approval stamped (also C7.6's line). */
export const FILE_WITHDRAWN = "Approval withdrawn: the validated copy read back since is not the file this approval stamped. Re-approve to stamp the file that is filed.";
export const WITHDRAWN_TOOLTIP = "Approved earlier; a fact on it changed since, so the representative checks it again.";
export const CHANGED_TOOLTIP = "Its facts differ from the round before (or changed after this round was sent): check it again.";
