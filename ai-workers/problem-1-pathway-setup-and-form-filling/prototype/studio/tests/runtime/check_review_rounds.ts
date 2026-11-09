// C8.3 checks (B144, screens lane): engine/runtime/review.ts, the rules of the representative's review rounds. Each
// business rule has a passing and a failing case (BR-1 to BR-10 and P-412's one-click re-approve). No database, no
// server, no model call (US$0). Sample values only.
//   tsx studio/tests/runtime/check_review_rounds.ts
import { changedBy, changesOf, checklistOf, fileOf, formStateOf, hashesProblem, isOpen, mayDecide, nextStatus, READ_ONLY_WORDS, reasonsOf, selfReviewOf, sendProblem, stampCurrent, tickedByDefault, untickedProblem, untickedWords, withdrawnForms, withdrawnWords, type SendFiling } from "../../engine/runtime/review.ts";
import type { ChangeWords } from "../../engine/runtime/out-of-date.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const H1 = "a".repeat(64), H2 = "b".repeat(64), REP = "user-R", OFF = "user-O", REP2 = "user-T";

// BR-1 Send
const fs: SendFiling[] = [
  { id: "f1", label: "Sample Client A's filing", active: true, recorded: false, inOpenRound: false, openBlocks: 0 },
  { id: "f2", label: "Sample Spouse A's filing", active: true, recorded: false, inOpenRound: true, openBlocks: 0 },
  { id: "f3", label: "Sample Child A2's filing", active: true, recorded: true, inOpenRound: false, openBlocks: 1 },
  { id: "f4", label: "Sample Child A3's filing", active: false, recorded: false, inOpenRound: false, openBlocks: 0 },
  { id: "f5", label: "Sample Child A4's filing", active: true, recorded: false, inOpenRound: false, openBlocks: 2 },
];
ok("C8.3 BR-1 pass: a filing with no open block, not in a round, may be sent; it is ticked by default", sendProblem(["f1"], fs) === null && tickedByDefault(fs).join() === "f1");
ok("C8.3 BR-1 fail: none ticked → 400 on the filings field", sendProblem([], fs)?.status === 400 && sendProblem([], fs)?.field === "filings");
ok("C8.3 BR-1 fail: a filing already in an open round → 409 naming it", sendProblem(["f1", "f2"], fs)?.status === 409 && /Sample Spouse A's filing/.test(sendProblem(["f2"], fs)!.detail));
ok("C8.3 BR-1 fail: a recorded filing → 409; a removed one → 404; a listed-twice one → 400", sendProblem(["f3"], fs)?.status === 409 && sendProblem(["f4"], fs)?.status === 404 && sendProblem(["f1", "f1"], fs)?.status === 400);
ok("C8.3 BR-1 pass (B2): the barcode form is stamped with its validated copy read back", fileOf({ waits: false, inputHash: H1, validated: { id: "v", sha256: H2, current: true }, generated: { id: "g", sha256: H1, hash: H1 } }).kind === "validated_copy");
ok("C8.3 BR-1 pass (B2): else the generated copy whose facts match; an Online form with no copy: none (still frozen)", fileOf({ waits: false, inputHash: H1, validated: null, generated: { id: "g", sha256: H2, hash: H1 } }).kind === "generated_copy" && fileOf({ waits: false, inputHash: H1, validated: null, generated: null }).kind === "none");
ok("C8.3 BR-1 fail (B2): a stale generated copy or an out-of-date validated copy is never the file", fileOf({ waits: false, inputHash: H1, validated: { id: "v", sha256: H2, current: false }, generated: { id: "g", sha256: H2, hash: H2 } }).kind === "none");
ok("C8.3 BR-1 fail (m8): a form that cannot start yet is not stamped: waits", fileOf({ waits: true, inputHash: H1, validated: null, generated: null }).kind === "waits");

// BR-2 Checklist
const cl = checklistOf({ critical: 0, documents: { verified: 5, required: 5 }, program: [{ key: "purpose", wording: "Purpose of travel matches the invitation and itinerary" }], confirmed: [{ by: "the case officer", facts: 12 }], forms: [{ item: "i1", label: "IMM 5257 · Sample Client A" }] });
ok("C8.3 BR-2 pass: default items with live state, the program's item, confirmations with who, a mark per form", cl.map((c) => c.key).join() === "default:no_critical,default:documents,program:purpose,confirmations,form:i1" && (cl[1].live as { verified: number }).verified === 5 && /12 facts, by the case officer/.test(cl[3].wording));
const cl0 = checklistOf({ critical: 2, documents: { verified: 0, required: 3 }, program: [], confirmed: [], forms: [] });
ok("C8.3 BR-2 fail: with no program items and no confirmations, only the defaults and \"none yet\" (never an invented item)", cl0.length === 3 && cl0[2].wording === "Values confirmed: none yet" && (cl0[0].live as { open: number }).open === 2);

// BR-3 Open
ok("C8.3 BR-3 pass: open moves Sent → Under review", nextStatus("sent", "open") === "under_review");
ok("C8.3 BR-3 fail: opening an Under review or decided row moves nothing", nextStatus("under_review", "open") === null && nextStatus("approved", "open") === null);

// BR-4 Approve
ok("C8.3 BR-4 pass: approve moves Under review → Approved only", nextStatus("under_review", "approve") === "approved");
ok("C8.3 BR-4 fail (M4): approving a Sent, Approved or Sent back row is refused (double approve, approve after send back)", [nextStatus("sent", "approve"), nextStatus("approved", "approve"), nextStatus("sent_back", "approve")].every((x) => x === null));
const checks = [{ key: "default:no_critical", source: "default", ticked: true }, { key: "program:purpose", source: "program", ticked: false }, { key: "confirmations", source: "confirmations", ticked: false }, { key: "form:i1", source: "form", ticked: false }];
ok("C8.3 BR-4 fail: 2 checklist items not ticked and no confirmation → 400 in the concept's words (form marks not counted)", untickedProblem(checks, undefined).problem?.detail === untickedWords(2) && untickedWords(2) === "2 checklist items are not ticked. Approve anyway? This is recorded.");
ok("C8.3 BR-4 pass: with the one confirmation it passes, and the unticked items are listed to record", untickedProblem(checks, true).problem === null && untickedProblem(checks, true).unticked.join() === "program:purpose,confirmations");
ok("C8.3 BR-4 pass: the hashes the page loaded equal today's", hashesProblem({ i1: H1, i2: "waits" }, [{ item: "i1", hash: H1 }, { item: "i2", hash: null }]) === null);
ok("C8.3 BR-4 fail (M4): a stale hash → 409 \"Changed while you were reading: reload\"; a missing one → 400", hashesProblem({ i1: H2 }, [{ item: "i1", hash: H1 }])?.status === 409 && /Changed while you were reading: reload/.test(hashesProblem({ i1: H2 }, [{ item: "i1", hash: H1 }])!.detail) && hashesProblem({}, [{ item: "i1", hash: H1 }])?.status === 400 && hashesProblem(null, [])?.status === 400);

// BR-5 Send back
const forms = new Set(["i1"]), cks = new Set(["program:purpose"]);
const rs = reasonsOf([{ text: "IMM 5257: date of birth does not match the passport.", item: "i1" }], forms, cks);
ok("C8.3 BR-5 pass: a reason pinned to a form is kept", "reasons" in rs && rs.reasons[0].item === "i1");
ok("C8.3 BR-5 fail: no reason, a blank one, or one pinned to another filing's form → 400", ["problem" in reasonsOf([], forms, cks), "problem" in reasonsOf([{ text: "   " }], forms, cks), "problem" in reasonsOf([{ text: "Fix the date please", item: "other" }], forms, cks), "problem" in reasonsOf(undefined, forms, cks)].every(Boolean));
ok("C8.3 BR-5 pass: send back moves Under review → Sent back", nextStatus("under_review", "send_back") === "sent_back" && !isOpen("sent_back") && isOpen("under_review"));

// BR-6 Changed since review
const words: ChangeWords = { label: (f) => (f === "person.date_of_birth" ? "Date of birth" : f), person: () => "Sample Client A", at: () => "2026-11-08T10:00:00Z" };
const then = [{ fact: "person.date_of_birth", about: "s1", row: null, value: "1986-04-12" }, { fact: "person.family_name", about: "s1", row: null, value: "SAMPLE" }];
const now = [{ fact: "person.date_of_birth", about: "s1", row: null, value: "1986-04-21" }, { fact: "person.family_name", about: "s1", row: null, value: "SAMPLE" }];
const ch = changesOf(then, now, words, () => ({ by: OFF, at: "2026-11-08T10:00:00Z" }));
ok("C8.3 BR-6 pass: only the changed fact, before → after, with who typed it", ch.length === 1 && ch[0].was === "1986-04-12" && ch[0].now === "1986-04-21" && ch[0].typed_by === OFF);
ok("C8.3 BR-6 fail: the same facts give no change", changesOf(then, then, words, () => null).length === 0);

// BR-7 / F1: the one rule function
ok("C8.3 BR-7 pass (F1): a stamp counts while the facts hash and the representative of record are unchanged", stampCurrent({ hash: H1, by: REP }, { hash: H1, representative: REP }).current);
ok("C8.3 BR-7 fail (F1): a fact change withdraws it", stampCurrent({ hash: H1, by: REP }, { hash: H2, representative: REP }).why === "facts");
ok("C8.3 BR-7 fail (M2): a new representative of record withdraws it", stampCurrent({ hash: H1, by: REP }, { hash: H1, representative: REP2 }).why === "representative");
ok("C8.3 BR-7 pass: the words name the fact, the typist and the day (§5)", withdrawnWords("facts", { label: "Date of birth", by: "the case officer", at: "x" }, () => "8 Nov") === "Approval withdrawn: Date of birth changed by the case officer, 8 Nov.");
const st = (o: Partial<Parameters<typeof formStateOf>[0]>) => formStateOf({ status: "under_review", waits: false, checked: false, frozenHash: H1, previousHash: undefined, liveHash: H1, stamp: null, representative: REP, ...o }).state;
ok("C8.3 BR-7 pass: the page states (To check, Checked, Changed since review, Approved, Approval withdrawn, Not stamped: waits)", st({}) === "to_check" && st({ checked: true }) === "checked" && st({ previousHash: H2 }) === "changed_since_review" && st({ status: "approved", stamp: { hash: H1, by: REP } }) === "approved" && st({ status: "approved", stamp: { hash: H2, by: REP } }) === "approval_withdrawn" && st({ waits: true }) === "not_stamped_waits");
ok("C8.3 BR-7 fail: a check mark clears when the form changes after it was sent (GitHub \"Viewed\")", st({ checked: true, liveHash: H2 }) === "changed_since_review");

// BR-8 Approver ≠ author (C7.6's rule unchanged)
ok("C8.3 BR-8 pass: the representative who did not prepare it and typed nothing reviews it as a second person", JSON.stringify(selfReviewOf({ actor: REP, officers: new Set([OFF]), solo: false, changedByReviewer: false, self: undefined })) === JSON.stringify({ kind: "reviewed" }));
const typedByRep = changesOf(then, now, words, () => ({ by: REP, at: "2026-11-08T10:00:00Z" }));
ok("C8.3 BR-8 fail: the representative typed a changed fact after the send → on a firm with another officer, 409 (send back)", changedBy(typedByRep, REP) && "problem" in selfReviewOf({ actor: REP, officers: new Set([OFF]), solo: false, changedByReviewer: changedBy(typedByRep, REP), self: true }) && (selfReviewOf({ actor: REP, officers: new Set([OFF]), solo: false, changedByReviewer: true, self: true }) as { problem: { status: number } }).problem.status === 409);
ok("C8.3 BR-8 fail: on a solo firm, without the statement → 400; with it → Self-reviewed", (selfReviewOf({ actor: "user-S", officers: new Set(["user-S"]), solo: true, changedByReviewer: false, self: undefined }) as { problem: { status: number } }).problem.status === 400 && JSON.stringify(selfReviewOf({ actor: "user-S", officers: new Set(["user-S"]), solo: true, changedByReviewer: false, self: true })) === JSON.stringify({ kind: "self_reviewed" }));

// BR-9 / F2: the one permission check
ok("C8.3 BR-9 pass (F2): the representative of record decides", mayDecide(REP, REP) === null);
ok("C8.3 BR-9 fail (F2): the case officer, a former representative or nobody set: read only, in the concept's words", mayDecide(OFF, REP) === READ_ONLY_WORDS && mayDecide(REP, REP2) === READ_ONLY_WORDS && mayDecide(REP, null) === READ_ONLY_WORDS);

// BR-10 Rounds (the moves the trigger allows, from the engine's side)
ok("C8.3 BR-10 pass: the open states are Sent and Under review only", isOpen("sent") && isOpen("under_review"));
ok("C8.3 BR-10 fail: a decided row never moves again", (["open", "approve", "send_back"] as const).every((m) => nextStatus("approved", m) === null && nextStatus("sent_back", m) === null));

// P-412: the change-only view and the one-click re-approve
const fm = [{ item: "i1", waits: false, stamp: { hash: H1, by: REP }, liveHash: H2 }, { item: "i2", waits: false, stamp: { hash: H1, by: REP }, liveHash: H1 }, { item: "i3", waits: true, stamp: null, liveHash: null }];
ok("C8.3 P-412 pass: only the form whose facts changed is listed for re-approval", withdrawnForms(fm, REP).map((f) => f.item).join() === "i1");
ok("C8.3 P-412 fail: with nothing changed there is nothing to re-approve", withdrawnForms(fm.filter((f) => f.item !== "i1"), REP).length === 0);

process.exit(summary() ? 1 : 0);
