// C8.3 checks (B144, screens lane): engine/runtime/review.ts, the rules of the representative's review rounds. Each
// business rule has a passing and a failing case (BR-1 to BR-10 and P-412's one-click re-approve). No database, no
// server, no model call (US$0). Sample values only.
//   tsx studio/tests/runtime/check_review_rounds.ts
import { changedBy, changesOf, checklistOf, valuesOf, valuesWords, fileOf, fileStampCurrent, formStateOf, hashesProblem, isOpen, mayDecide, nextStatus, READ_ONLY_WORDS, readBackStamps, reasonsOf, selfReviewOf, sendProblem, stampCurrent, tickedByDefault, untickedProblem, untickedWords, withdrawnForms, withdrawnWords, typedSince, type SendFiling } from "../../engine/runtime/review.ts";
import { factPerson, type ChangeWords } from "../../engine/runtime/out-of-date.ts";
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
ok("C8.3 BR-1 fail: a recorded or removed filing → 409; an unknown one → 404; a listed-twice one → 400", sendProblem(["f3"], fs)?.status === 409 && sendProblem(["f4"], fs)?.status === 409 && sendProblem(["fx"], fs)?.status === 404 && sendProblem(["f1", "f1"], fs)?.status === 400);
ok("C8.3 BR-1 pass (B2): the barcode form is stamped with its validated copy read back", fileOf({ waits: false, inputHash: H1, validated: { id: "v", sha256: H2, current: true }, generated: { id: "g", sha256: H1, hash: H1 } }).kind === "validated_copy");
ok("C8.3 BR-1 pass (B2): else the generated copy whose facts match; an Online form with no copy: none (still frozen)", fileOf({ waits: false, inputHash: H1, validated: null, generated: { id: "g", sha256: H2, hash: H1 } }).kind === "generated_copy" && fileOf({ waits: false, inputHash: H1, validated: null, generated: null }).kind === "none");
ok("C8.3 BR-1 fail (B2): a stale generated copy or an out-of-date validated copy is never the file", fileOf({ waits: false, inputHash: H1, validated: { id: "v", sha256: H2, current: false }, generated: { id: "g", sha256: H2, hash: H2 } }).kind === "none");
ok("C8.3 BR-1 fail (m8): a form that cannot start yet is not stamped: waits", fileOf({ waits: true, inputHash: H1, validated: null, generated: null }).kind === "waits");

// BR-2 Checklist
const cl = checklistOf({ critical: 0, documents: { verified: 5, required: 5 }, program: [{ key: "purpose", wording: "Purpose of travel matches the invitation and itinerary" }], values: { declared: [{ by: "Client A", facts: 40 }], confirmed: [{ by: "the case officer", facts: 12 }], toConfirm: 0, waitsClient: 0 }, forms: [{ item: "i1", label: "IMM 5257 · Sample Client A" }] });
ok("C8.3 BR-2 pass: default items with live state, the program's item, the values with who stands behind them, a mark per form", cl.map((c) => c.key).join() === "default:no_critical,default:documents,program:purpose,confirmations,form:i1" && (cl[1].live as { verified: number }).verified === 5 && cl[3].wording === "Values: 52 facts, 40 declared by Client A · 12 confirmed by the case officer · 0 to confirm", cl[3].wording);
const cl0 = checklistOf({ critical: 2, documents: { verified: 0, required: 3 }, program: [], values: { declared: [], confirmed: [], toConfirm: 0, waitsClient: 0 }, forms: [] });
ok("C8.3 BR-2 fail: with no program items and no answers, only the defaults and \"none answered yet\" (never an invented item)", cl0.length === 3 && cl0[2].wording === "Values: none answered yet" && (cl0[0].live as { open: number }).open === 2);
// QA-446 (P-510 (2)): declared answers are named by who gave them, never as not confirmed; only the Confirm list is "to confirm".
const vb = valuesOf([{ confirmed: true, mark: "declared", by: "user-P" }, { confirmed: true, mark: "declared", by: "user-P" }, { confirmed: true, mark: "confirmed", by: "user-O" }, { confirmed: false, mark: "by_principal", by: "user-P" }], (id) => ({ "user-P": "Client A", "user-O": "Case officer" } as Record<string, string>)[id]);
ok("QA-446 pass: a declared answer counts as declared by who gave it; an officer's confirmation as confirmed by them; one on the Confirm list as to confirm", JSON.stringify(vb) === JSON.stringify({ declared: [{ by: "Client A", facts: 2 }], confirmed: [{ by: "Case officer", facts: 1 }], toConfirm: 1, waitsClient: 0 }) && valuesWords(vb) === "Values: 4 facts, 2 declared by Client A · 1 confirmed by Case officer · 1 to confirm (the officer's Confirm section)", [vb, valuesWords(vb)]);
ok("QA-446 fail: answers that are all declared never read \"none yet\" or \"not confirmed\"", !/none|not confirmed/.test(valuesWords(valuesOf([{ confirmed: true, mark: "declared", by: "x" }], () => "Client A"))));

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

// Round 1 (review and break of 09e660220)
ok("C8.3 B1 pass (break B1): the newest round's own approval still counts", stampCurrent({ hash: H1, by: REP, superseded: false }, { hash: H1, representative: REP }).current);
ok("C8.3 B1 fail (break B1): a newer round of the filing (sent again, or sent back) withdraws the earlier approval, in words", stampCurrent({ hash: H1, by: REP, superseded: true }, { hash: H1, representative: REP }).why === "superseded" && withdrawnWords("superseded", null, () => null) === "Approval withdrawn: the filing was sent for review again.");
ok("C8.3 B1 fail (break B1): an approved, current filing is not ticked by default in the Send dialog", tickedByDefault([{ id: "a", active: true, openBlocks: 0, recorded: false, inOpenRound: false, approved: true }, { id: "b", active: true, openBlocks: 0, recorded: false, inOpenRound: false }]).join() === "b");
const pw = { person: (s: string) => (s === "s1" ? "Sample Client A" : s) };
ok("C8.3 review M3 pass: a person's own fact is named as theirs", factPerson("s1", null, pw) === "Sample Client A");
ok("C8.3 review M3 fail: a parent's fact on the client's form is named as the parent's, never as the client's", factPerson("s1/parent_1", null, pw) === "Sample Client A's parent 1");
const typed = changesOf(then, now, words, () => ({ by: REP, at: "x" }));
ok("C8.3 break m1 pass: after an approval, the 409 says what can be done (ask the case officer to send it again)", /Ask the case officer to send it for review again/.test(((selfReviewOf({ actor: REP, officers: new Set([OFF]), solo: false, changedByReviewer: changedBy(typed, REP), self: true, after: "approval" }) as { problem: { detail: string } }).problem.detail)));
ok("C8.3 break M1 fail: a changed fact with no typist (the firm record's, after a change of representative) never makes the representative an author", !changedBy(changesOf(then, now, words, () => null), REP));
ok("C8.3 review BIC-13 fail: no API field name shown to a person in the self-review words", !/self: true/.test(JSON.stringify(selfReviewOf({ actor: "user-S", officers: new Set(["user-S"]), solo: true, changedByReviewer: false, self: undefined }))));

// CI on #1247 (gate B, configured checkpoint): an answer typed but not confirmed yet still counts for BR-8
const reads = new Set(["s1|person.birth_city", "representative|person.email"]);
ok("C8.3 CI pass: an answer the representative typed after the round before, on a fact a form reads, makes them an author (confirmed or not)", typedSince([{ key: "s1|person.birth_city", by: REP, at: "2026-11-09T10:00:00Z" }], reads, REP, "2026-11-09T09:00:00Z"));
ok("C8.3 CI fail: typed before that round, typed by someone else, on a fact no form reads, or the firm record's: not an author", !typedSince([{ key: "s1|person.birth_city", by: REP, at: "2026-11-09T08:00:00Z" }, { key: "s1|person.birth_city", by: OFF, at: "2026-11-09T10:00:00Z" }, { key: "s1|person.hobby", by: REP, at: "2026-11-09T10:00:00Z" }, { key: "representative|person.email", by: REP, at: "2026-11-09T10:00:00Z" }], reads, REP, "2026-11-09T09:00:00Z"));

// QA-345 (the tech lead's ruling (a), 9 Nov): an approval stamps the file it approved
const RB = { stampKind: "none", approved: true, latest: true, by: REP, representative: REP, stampedFacts: H1, readFacts: H1 };
ok("C8.3 QA-345 read-back pass: an approval that stamped no file (or the generated copy) is stamped with the first validated copy read back for the facts it approved",
  readBackStamps(RB) && readBackStamps({ ...RB, stampKind: "generated_copy" }));
ok("C8.3 QA-345 read-back fail: not when it already holds a validated copy, holds other facts, is not the newest approved row, or is another representative's",
  !readBackStamps({ ...RB, stampKind: "validated_copy" }) && !readBackStamps({ ...RB, readFacts: H2 }) && !readBackStamps({ ...RB, stampedFacts: null }) && !readBackStamps({ ...RB, latest: false })
  && !readBackStamps({ ...RB, approved: false }) && !readBackStamps({ ...RB, representative: REP2 }) && !readBackStamps({ ...RB, by: null }));
const V1 = "1".repeat(64), V2 = "2".repeat(64);
ok("C8.3 QA-345 file pass: a stamp counts with the validated copy it stamped (the one filed), and a stamp of no file counts while no validated copy counts for filing (an Online form, not read back yet)",
  fileStampCurrent({ kind: "validated_copy", sha256: V1 }, V1) && fileStampCurrent({ kind: "none", sha256: null }, null) && fileStampCurrent({ kind: "generated_copy", sha256: H2 }, null)
  && stampCurrent({ hash: H1, by: REP, file: { kind: "none", sha256: null } }, { hash: H1, representative: REP, validatedSha: null }).current
  && formStateOf({ status: "approved", waits: false, checked: true, frozenHash: H1, previousHash: undefined, liveHash: H1, stamp: { hash: H1, by: REP, file: { kind: "validated_copy", sha256: V1 } }, representative: REP, validatedSha: V1 }).state === "approved");
const fileGone = stampCurrent({ hash: H1, by: REP, file: { kind: "none", sha256: null } }, { hash: H1, representative: REP, validatedSha: V1 });
ok("C8.3 QA-345 file fail: a validated copy filed that the approval did not stamp (no file, the generated copy, or another validated copy of the same facts, review M1) → \"Approval withdrawn\" in words, listed for the one-click re-approve",
  !fileStampCurrent({ kind: "none", sha256: null }, V1) && !fileStampCurrent({ kind: "generated_copy", sha256: H2 }, V1) && !fileStampCurrent({ kind: "validated_copy", sha256: V1 }, V2) && fileGone.why === "file"
  && withdrawnWords("file", null, () => null) === "Approval withdrawn: the validated copy read back since is not the file this approval stamped. Re-approve to stamp the file that is filed."
  && withdrawnForms([{ item: "i1", waits: false, liveHash: H1, validatedSha: V2, stamp: { hash: H1, by: REP, file: { kind: "validated_copy", sha256: V1 } } }, { item: "i2", waits: false, liveHash: H1, validatedSha: V1, stamp: { hash: H1, by: REP, file: { kind: "validated_copy", sha256: V1 } } }], REP).map((f) => f.item).join() === "i1",
  fileGone);

// QA-446 review m3: an answer saved on a person's own link is named by that person, never by the link's actor.
const vo = valuesOf([{ confirmed: true, mark: "declared", by: "link-actor-9", channel: "own_link", about: "Sample Spouse A" }, { confirmed: true, mark: "declared", by: "user-P", channel: "questionnaire", about: "Sample Spouse A" }], (id) => (id === "user-P" ? "Client A" : `actor ${id}`));
ok("QA-446 m3 pass: an own-link answer is declared by the person whose link it is; a questionnaire answer by who typed it", JSON.stringify(vo.declared) === JSON.stringify([{ by: "Sample Spouse A", facts: 1 }, { by: "Client A", facts: 1 }]), vo.declared);
// QA-446 review m2: an answer waiting for the client's re-confirmation is not the officer's to confirm; it is counted apart.
const vw = valuesOf([{ confirmed: false, mark: "by_staff", by: "user-O", awaits_client: true }, { confirmed: false, mark: "by_staff", by: "user-O" }], () => "Case officer");
ok("QA-446 m2 pass: a staff answer waiting for the client is counted apart from the officer's Confirm list", vw.toConfirm === 1 && vw.waitsClient === 1 && valuesWords(vw) === "Values: 2 facts, 1 to confirm (the officer's Confirm section) · 1 waits for the client to re-confirm", [vw, valuesWords(vw)]);
process.exit(summary() ? 1 : 0);
