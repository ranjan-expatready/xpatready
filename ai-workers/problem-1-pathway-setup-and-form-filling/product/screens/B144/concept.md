# B144 · C8.3 Representative review: concept

Status: **DESIGN, revision 2 after the fresh challenge** (`challenge.md`: "Build after these changes", 2 Blockers, 7 Majors, 8 Minors; answered in §9). The tech lead approves case screens after the challenge (P-223 (4), P-316 (3)). Branch `claude/intelligent-noether-qkzc6a-b144` from `origin/main` 1e1ca443e, screens lane, 7 Nov 2026. No code.

Board: `design/draft-representative-review.html` (intent, not pixels, P-44). It starts from the founder's boards `screens/M3-agent-view/design/draft-agent-view.html` (P-164, the row "Representative's review · 3 filings … checked values, findings, corrections · solo firm: Self-reviewed") and `screens/M3-prepare-application/design/draft-prepare-application-v2.html` (P-122). The UX lane's study (P-407) is not on `main` yet; its scorecard is answered when it lands.

Row (BACKLOG B144, P-406, on `lead/2026-11-07-lead30`): send for review; a checklist with each program's items; approve or send back with reasons; rounds; "Changed since review"; each approved form stamped (fingerprint, answer snapshot) and withdrawn by a later fact change (C9.2). Pack exit 0; Opus review; breaker (permissions). It extends the built C7.6 review (`api/src/readiness.ts` review, table `filing_review`).

## 1. Job and journey
**Job.** The case officer hands the prepared filings to the representative of record. The representative checks each form against its facts and the program's own points, then approves (each form stamped) or sends the filing back with reasons. The officer fixes and sends round 2, which shows only what changed.

* **Who:**
  * Send: case staff of the firm.
  * Decide: the representative of record only, as today's C7.6 (P-155 (1); founder question F2).
  * "Self-reviewed" stays exactly as today's rule (`readiness.ts:63-71`).
  * Client and configuration: 403.
* **When:** after Prepare the filing; before Ready to file (C7.6) and Record (C8.2).
* **Team requirements:**
  * AG-07 AG-7-29 rules 1-10.
  * SA-01B SA-1B-221: program review items, under each filing's name, never blocking.
  * The founder's row B6 / one-pager 9.3: each form stamped; a later fact change withdraws it.
* **Three ways this differs from AG-7-29.** Each goes to the founder (AGENTS rule 2; §7):
  * (a) a fact change **withdraws** a form's approval, where AG-7-29 r10 keeps it and flags it;
  * (b) the **representative of record** decides, where the team lets any holder of `review-approve` decide;
  * (c) "Changed since review" counts **form facts** (form regenerated, answers, entered sections). A checklist document's change shows on the default checklist item's live state, not as a form change.

## 2. Ten layers
| Layer | In the app | New here |
|---|---|---|
| Data | `filing_review` (one stamp per filing, `facts_hash`); per-form facts hash (`readiness-inputs.ts:70`); `answer_snapshot` (allows a row with no copy); `validated_copy` (sha256, read-back); `form_instance.sha256` | **Migration, new tables only (B1):**<br>• `review_round` (case, number, sent by and at)<br>• `review_round_filing` (round, filing, status, opened by and at, decided by and at, reasons json, confirmed unticked, representative at decision, self-review statement)<br>• `review_round_form` (round, filing, filing item, own `answer_snapshot` id, facts hash, file kind and sha256: validated copy, else generated copy matching the facts, else none)<br>• `review_check` (round, filing, item key, wording, ticked by and at)<br>On Approve, `filing_review` is still written, so C7.6 and C8.2 read it unchanged |
| Rules | C7.6 `representative_review` line; C9.2 out of date | `engine/runtime/review.ts` (pure): checklist merge, legal state moves, stamp currency, the changed-since diff |
| Content | none | Program review items: **scaffolding** (P-33), `samples/review-items.json` per combination key, Sample, read through one port `reviewItemsOf(release, combinationKey)`. SA-1B-221's `REVIEW_ITEM` line kind replaces it (follow-up row) |
| API | `POST /runtime/filings/:id/review` | `POST /runtime/cases/:id/reviews` (send) · `GET /runtime/reviews/:id` (safe read) · `POST …/open` · `POST …/checks` · `POST …/decision`. The old route stays as **a one-step round through the same code** (M1), so `readyToFile` in `acceptance/lib/m3.ts:384` keeps working |
| UI | Review button in the readiness panel | Review page in the **Change set** pattern (EXPERIENCE §3) + "Send for review" dialog; the inline review form becomes "Open the review" |
| AI | none | none (identical with AI off) |

## 3. Business rules
* **BR-1 Send** (AG-7-29 r1).
  * One action covers one or more filings of the case.
  * Filings with no open block are ticked by default. If none is ticked: 400.
  * A filing already in an open round: 409 naming it.
  * Sending **freezes each form**: a `review_round_form` row with its own answer snapshot (the facts the form reads now), its facts hash, and its file. This applies whatever the channel, including an Online form with no copy (B2).
  * A form that cannot start yet is listed as "Not stamped: waits for an answer" (m8).
  * On a solo firm, "Review now" sends and opens in one step (m3).
* **BR-2 Checklist** for each filing, copied into the round when sent:
  * the default items "No open critical warnings" and "All required documents verified", each with its live state from C7.6;
  * the program's items for the filing's combination (scaffolding port);
  * "Values confirmed, with who": the section confirmations that exist. A "checked against the document" record does not exist yet (M6).
* **BR-3 Open** (r8): `POST …/open` by the representative of record moves that filing's row to Under review, with who and when. The GET never changes state (m1). Anyone else opening it changes nothing.
* **BR-4 Approve**, per filing in the round (B1):
  * Only the representative of record at that moment, with the facts hashes the page loaded. Under the case row lock, the only allowed move is Under review → Approved (M4). A hash that differs: 409 "Changed while you were reading: reload", and nothing is stamped.
  * Unticked items need **one** confirmation, recorded, with no reason asked (r6).
  * Open CRITICAL warnings are listed and stay C7.6's to pass with a reason.
  * Approving copies each form's frozen stamp as approved and writes `filing_review` (reviewed or self-reviewed, licence) as today.
* **BR-5 Send back** (r7):
  * Reasons are required, at least one per filing; each may be pinned to a form or a checklist item.
  * That filing's row becomes Sent back; the officer sees the reasons on the filing.
  * The next send is round n+1, with its own frozen stamps.
* **BR-6 Changed since review** (r10), derived on read from round n-1's frozen snapshot against round n or today:
  * per form, the facts changed (before → after);
  * **the person who typed the new value** (the answer's origin, not its confirmer, m4) and when;
  * one batched history query per page (m6).
* **BR-7 A later fact change withdraws the form's approval** (row B6; founder question F1):
  * A stamp counts only while the form's facts hash and the representative of record are unchanged (M2, the same rule as C7.6 `readiness-inputs.ts:97-99`).
  * After a change the form shows "Approval withdrawn: <fact> changed by <who>, <date>" (the tooltip says how this differs from "Changed since review", m5), and C7.6's review line reopens as today.
* **BR-8 Approver ≠ author** (M3): a fact changed by the representative after the round was sent makes that filing "Changed by the reviewer". Approve then needs the self-review statement exactly as P-155 (1) and `readiness.ts:63-71`, or a send back.
* **BR-9 Permissions.** The breaker covers each case in the pack (M7):
  * send: case staff;
  * open, tick, approve, send back: the representative of record of that case;
  * the officer ticking, approving or sending back: 403;
  * configuration: 403; client: 403;
  * a former representative: 403;
  * self-review without the statement: 400; with it: 200;
  * prepared with another officer on a non-solo firm: 409 (today's rule);
  * a filing recorded as submitted, or removed (C6.13): 409;
  * another firm's review on every route: 404.
* **BR-10 Rounds** are append-only (trigger). The page shows the round history and compares round n with n-1.

## 4. Layout
* **Officer:** "Send for review" at the head of the readiness panel. The dialog lists the filings (ticked, with any open warning count) and one button, "Send N filings for review".
* **Representative:** the Review page, in the Change set pattern.
  * Left: filings → forms, each with its state: To check · Checked · Changed since review · Approval withdrawn · Not stamped: waits. The checklist sits under each filing.
  * Right: the selected form's facts as frozen (value, source, confirmed by), with before → after for changed facts.
  * Footer: Approve · Send back (reasons) · round selector.
  * Approve dialog: the unticked items, or the self-review statement on a solo firm.
* **States:**
  * empty: teaches "Send for review";
  * loading: skeleton;
  * conflict: changed while reading; reload, nothing stamped;
  * read-only: not the representative: "Only the representative of record approves or sends back. You can read this review.";
  * long names wrap;
  * keyboard path for ticks and both decisions.

## 4b. Best in class
All read 7 Nov 2026 from each project's published source. Doc sites and vendor help centres are blocked from this session; immigration and tax vendors were not opened, so they are not cited. Evidence: `best-in-class-sources-2026-11-07.md` (this folder).

| Who | Best at | Source and quote |
|---|---|---|
| GitHub protected branches | Approval tied to the content; stale when it changes | `github.com/github/docs/…/about-protected-branches.md`: "the approving review is dismissed as stale, and the pull request cannot be merged until someone approves the work again" |
| GitHub reviews | Clear verdicts; a per-file "Viewed" that clears on change | `…/giving-reviews.md`: "Request changes flags feedback that the author should address"; `…/reviewing-proposed-changes-in-a-pull-request.md`: "If the file changes after you view the file, it will be unmarked as viewed." |
| GitLab approvals | Reset on change by default; no self-approval by default | `gitlab.com/gitlab-org/gitlab/-/blob/master/doc/user/project/merge_requests/approvals/settings.md`: "an approval on a merge request is removed when you add more changes after the approval" |
| GitLab versions · Gerrit | Rounds compared; outdated votes named | `…/merge_requests/versions.md`: "the diff version from each previous push is available for comparison"; Gerrit `config-labels.txt`: "Votes that are not copied to the new patch set, are called `outdated`." |

**Copied:**
* an approval bound to the content that goes stale (GitHub, GitLab);
* a per-form "checked" that clears on change (GitHub Viewed);
* rounds compared (GitLab);
* "withdrawn" named, not hidden (Gerrit);
* no silent self-approval (GitLab).

**Beaten:**
* Code review stamps a whole change. Here each **form** is stamped with the facts it read and the file that goes to IRCC (the validated copy for a barcode form). A change to one fact withdraws only the forms that read it, and round 2 shows only those, with before → after and who typed it.
* Solo firms get "Self-reviewed", never a fake second person.

## 5. Copy
* Send: "Send for review: the representative of record checks each form and approves it or sends it back."
* Unticked items: "2 checklist items are not ticked. Approve anyway? This is recorded."
* Send back placeholder: "What should change, and on which form?"
* Withdrawn: "Approval withdrawn: Date of birth changed by the case officer, 8 Nov."
* Withdrawn tooltip: "Approved earlier; a fact on it changed since, so the representative checks it again."
* Not stamped: "Not stamped: waits for an answer."

## 6. Contract and tests
**Contract.** Additive shapes in `contracts/runtime.ts`: `ReviewRound`, `ReviewRoundFiling`, `FormStamp`, `ChangedSinceReview`.

**Pack** `acceptance/C8.3.test.ts`, on the checkpoint (the Visitor visa family, as C8.2):
* 1 pass: send 2 filings → one round, two filing rows Sent, a frozen stamp per form, including IMM 5707 Online with no copy.
* 2 fail: none ticked → 400.
* 3 fail: a filing already in a round → 409.
* 4 pass: the representative's POST open → Under review with who; the officer's open and any GET change nothing.
* 5 pass: the checklist is the default items plus the program's items under each filing.
* 6 fail: send back without reasons → 400.
* 7 pass: send back one filing and approve the other in the same round → statuses per filing; round 2 for the first.
* 8 pass: approving with unticked items needs the one confirmation (400 without, 200 with, recorded).
* 9 pass: approve writes the stamps (the barcode form's file is the validated copy) and `filing_review`; C7.6's review line closes.
* 10 pass: a fact change → that form shows "Approval withdrawn" with the typist; the other forms keep their stamp; C7.6's line reopens.
* 11 pass: round 2 lists only the changed forms, before → after.
* 12 fail: a stale hash at decision → 409, nothing stamped.
* 13 fail: a fact changed by the representative → approve needs the statement or a send back.
* 14 fail: the permission matrix of BR-9.
* 15 pass: the old review route makes a one-step round; `readyToFile` still works.
* 16: a screen walk at 1440 px.

**Breaker:** permissions.

## 6b. Capability or scaffolding · proof
* **Capability,** *Needed for the proof:* everything except the content port.
* **Scaffolding:** program items from `samples/review-items.json` (Q1).
* **Not built:**
  * Needs-you items and notifications (AG-11, AG-7-39 r8);
  * the case stage move to REVIEW (AG-7-29 r4, the team's case stages);
  * `waive-deficiency` as its own key (C7.6's pass stays);
  * a "checked against the document" record (M6).

## 7. Questions
**For the founder, through the tech lead (AGENTS rule 2, conflicts with AG-7-29):**
* **F1.** After a form is approved, a fact on it changes. What happens to the approval?
  * **Recommend: withdrawn** (row B6). It stays a passable CRITICAL line in Ready to file (P-237), so nothing is blocked.
  * The team's alternative, r10: the approval is kept and flagged, with one confirmation at submission.
* **F2.** Who approves or sends back?
  * **Recommend: the representative of record only** (P-155 (1), today's C7.6).
  * The team's alternative: any holder of `review-approve` (Owner, Case Manager).

**For the tech lead:**
* **Q1.** Program review items as a scaffolding data file behind one port, with a follow-up row for the `REVIEW_ITEM` line kind. **Recommend yes** (the challenger agrees).
* **Q3.** Build after C4 (`readiness*.ts`, P-404) and C3/C4 (`fill-case.ts`) merge. The migration (four new tables) is for the tech lead's read.

## 8. Ready
* Acceptance test: `acceptance/C8.3.test.ts` (C8.3-1…16).
* Row text: BACKLOG B144.
* Decisions: P-406, P-155, P-168/P-237.
* Open: F1 and F2 (founder), Q1 and Q3 (tech lead).

## 9. Answers to the challenge
* **Blockers:**
  * B1: the per-filing and per-form round tables and frozen stamps.
  * B2: stamps keyed by filing item, with their own snapshot; the file is the validated copy, else the generated copy that matches, else none.
* **Majors:**
  * M1: the old route becomes a one-step round.
  * M2: the representative is part of stamp currency.
  * M3: BR-8.
  * M4: BR-4's lock, state guard and hashes.
  * M5: §1's three differences, with the sources corrected (row B6 and P-406 for withdrawal; break B2 is build behaviour, not a decision).
  * M6: "Confirmed by".
  * M7: BR-9 and test 14; the self-review rule is today's, unchanged.
* **Minors:** m1-m8, in BR-1, BR-3, BR-6, BR-7, §6b and §5.
