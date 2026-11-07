# B144 · C8.3 Representative review: concept

Status: **DESIGN** (screen-concept; P-223 (4): the tech lead approves case screens after a fresh challenge, P-316 (3)). Branch `claude/intelligent-noether-qkzc6a-b144` from `origin/main` 1e1ca443e, screens lane, 7 Nov 2026. No code. Board: `design/draft-representative-review.html` (intent, not pixels, P-44), from the founder's boards `screens/M3-agent-view/design/draft-agent-view.html` (P-164: the row "Representative's review · 3 filings … checked values, findings, corrections · solo firm: Self-reviewed") and `screens/M3-prepare-application/design/draft-prepare-application-v2.html` (P-122). The UX lane's study (P-407) is not on `main` yet: its scorecard is answered when it lands.

Row (BACKLOG B144, P-406, on `lead/2026-11-07-lead30`): send for review, checklist with program items, approve or send back with reasons, rounds, "Changed since review", each approved form stamped (fingerprint, answer snapshot) and withdrawn by a later fact change (C9.2); pack exit 0; Opus review, breaker (permissions). Extends P-155 and the built C7.6 review (`api/src/readiness.ts` review, table `filing_review`).

## 1. Job and journey
**Job.** The case officer hands the prepared filings to the representative of record; the representative checks each form against its facts and the program's own points, then approves (each form stamped) or sends it back with reasons; the officer fixes and sends round 2, seeing only what changed.
* **Who:** sends: case staff (`agent/case:edit`); decides: the representative of record only (P-155 (1); "Self-reviewed" when they prepared it themself, solo firm, kept). Client and configuration: 403.
* **When:** after Prepare the filing, before Ready to file (C7.6) and Record (C8.2).
* **Team requirements:** AG-07 AG-7-29 rules 1-10 (send several filings, checklist kept from `DEFAULT_REVIEW_CHECKLIST`, PENDING → UNDER_REVIEW on first open, approve with one confirmation for unticked items, reject needs reasons, per-filing status and rounds, "Changed since review: <what>, <who>, <date>"); SA-01B SA-1B-221 (review items per program, shown under each filing's name, never block); one-pager 9.3 / requirement row B6 (each form stamped, a later fact change withdraws it).

## 2. Ten layers
| Layer | In the app | New here |
|---|---|---|
| Data | `filing_review` (one stamp per filing, `facts_hash`), `form_instance.sha256` (the filled file), `answer_snapshot.facts_json` (facts a form read) | **migration** (new tables only): `review_round` (case, round, filings[], sent by/at, opened by/at, status, decided by/at, reasons json, confirmed_unticked), `review_check` (round, filing, item key, ticked by/at), `form_approval` (round, filing, form instance, file sha256, snapshot id, facts hash). `filing_review` keeps being written on Approve, so C7.6 and C8.2 read it unchanged |
| Rules | C7.6 `representative_review` CRITICAL line; C9.2 out-of-date | `engine/runtime/review.ts` (pure): checklist merge, verdict rules, stamp currency, "changed since" diff |
| Content | none | program review items as data, `samples/review-items.json` per combination key, each Sample with source (**Q1**) |
| API | `POST /runtime/filings/:id/review` | `POST /runtime/cases/:id/reviews` (send), `GET /runtime/reviews/:id` (opens it), `POST /runtime/reviews/:id/checks`, `POST /runtime/reviews/:id/decision` |
| UI | Review button in the readiness panel | "Review" page in the **Change set** pattern (EXPERIENCE §3: grouped, before/after, impact, approver ≠ author) + the officer's "Send for review" dialog |
| AI | none | none (identical with AI off) |

## 3. Business rules
* **BR-1 Send for review** (AG-7-29 r1): one action covers one or more filings of the case; filings with no open block are ticked by default, any can be unticked; none ticked → 400. A filing already in an open round → 409 naming it.
* **BR-2 Checklist** = the default items (team's `DEFAULT_REVIEW_CHECKLIST` intent: "No open critical warnings", "All required documents verified"; each shows its live state from C7.6) + the program's items of each filing's combination, under that filing's name (SA-1B-221 r3) + P-155 (2)'s "values checked against the document, with who". Items are copied into the round when sent (a later data edit never changes an open round).
* **BR-3 Opened**: the first open by the representative moves the round to Under review with who and when (r8); anyone else opening it changes nothing.
* **BR-4 Approve** (representative of record only): unticked items ask **one** confirmation, recorded, no reason (r6, AG17-D78); open CRITICAL warnings are listed and stay C7.6's to pass with a reason (r5, P-237); approving writes one `form_approval` per form in each filing (file sha256 of the filled copy when one exists, the answer snapshot it was filled from) and the `filing_review` row (kind reviewed / self_reviewed, licence) as today.
* **BR-5 Send back**: reasons required, one per filing at least, optionally pinned to a form or checklist item; the round is Sent back; the officer sees the reasons on the filing (r7). The next send is round n+1.
* **BR-6 Changed since review** (r10, derived on read, nothing stored): per filing, the forms whose answer snapshot or file differ from their stamp, each with the facts changed (before → after), who changed them and when (from the answer history). Notes, tasks and messages never count.
* **BR-7 A later fact change withdraws the form's approval** (row B6, C9.2): a stamp counts only while its facts and file match; then the form shows "Approval withdrawn: <fact> changed by <who>, <date>", the filing's review line in C7.6 is open again (as today's `facts_hash` rule), and round n+1 shows only those forms as "Changed since review". **Conflict to note:** AG-7-29 r10 keeps the approval and only flags; our P-155 / break B2 and row B6 withdraw it. This concept follows ours (Q2).
* **BR-8 Permissions** (breaker): send = case staff of the firm; open-as-reviewer, tick, approve, send back = the representative of record of that case only; self-review only as P-155 (1) (solo firm, logged statement); another firm 404; client 403; a forged decision on a closed or recorded filing 409 (C8.2 record lock).
* **BR-9 Rounds**: each round keeps its checklist, ticks, decision, reasons and stamps (append-only, as `filing_review`); the page shows round history and compares round n with n-1.

## 4. Layout
**Officer:** a "Send for review" action at the head of the readiness panel; dialog lists the filings (ticked, with any open warning count), one button "Send N filings for review". **Representative:** the Review page, Change set pattern: left, filings → forms (each with its state: To check · Checked · Changed since review · Approval withdrawn), checklist under each filing; right, the selected form's facts as filled (value, source, "checked against document by <who>") with before → after for changed facts; footer: Approve · Send back (reasons) · round selector. States: empty (nothing sent: teaches "Send for review"), loading skeleton, conflict (facts changed while open: reload, nothing stamped, as today's 409), read-only (recorded or not the representative: "Only the representative of record decides; you can read it"), long names wrap, keyboard path for ticks and both decisions.

## 4b. Best in class
All read 7 Nov 2026 from each project's published source (doc sites and vendor help centres are blocked from this session; immigration and tax vendors not opened, so not cited). Evidence file: `best-in-class-sources-2026-11-07.md` (this folder).
| Who | Best at | Source and quote |
|---|---|---|
| GitHub protected branches | Approval tied to the content; stale when it changes | `github.com/github/docs/…/about-protected-branches.md`: "the approving review is dismissed as stale, and the pull request cannot be merged until someone approves the work again" |
| GitHub reviews | Clear verdicts; per-file "Viewed" that clears on change | `…/giving-reviews.md`: "Request changes flags feedback that the author should address"; `…/reviewing-proposed-changes-in-a-pull-request.md`: "If the file changes after you view the file, it will be unmarked as viewed." |
| GitLab approvals | Reset on change by default; no self-approval by default | `gitlab.com/gitlab-org/gitlab/-/blob/master/doc/user/project/merge_requests/approvals/settings.md`: "an approval on a merge request is removed when you add more changes after the approval" |
| GitLab versions · Gerrit | Rounds compared; outdated votes named | `…/merge_requests/versions.md`: "the diff version from each previous push is available for comparison"; Gerrit `config-labels.txt`: "Votes that are not copied to the new patch set, are called `outdated`." |
**Copied:** content-bound approval that goes stale (GitHub, GitLab); per-form "checked" that clears on change (GitHub Viewed); rounds compared (GitLab); "withdrawn" named, not hidden (Gerrit). **Beaten:** code review stamps a whole change; here each **form** is stamped with its filled file and the facts it read, so a change to one fact withdraws only the forms that read it, and round 2 shows only those, with before → after and who. Solo firms get "Self-reviewed", never a fake second person.

## 5. Copy
Send: "Send for review — the representative of record checks each form and approves or sends it back." · Unticked confirm: "2 checklist items are not ticked. Approve anyway? This is recorded." · Send back reason placeholder: "What should change, and on which form?" · Withdrawn: "Approval withdrawn: Date of birth changed by the case officer, 8 Nov." · Not the representative: "Only the representative of record approves or sends back. You can read this review."

## 6. Contract and tests
Shapes in `contracts/runtime.ts` (additive): `ReviewRound`, `ReviewCheck`, `FormStamp`, `ChangedSinceReview`. Pack `acceptance/C8.3.test.ts` on the checkpoint (VV family, as C8.2): 1 pass send 2 filings → one round, both Sent · 2 fail none ticked 400 · 3 fail filing already in a round 409 · 4 pass representative opens → Under review with who; officer opening changes nothing · 5 pass checklist = default + the program's items under each filing · 6 fail send back without reasons 400 · 7 pass send back → officer sees reasons; next send is round 2 · 8 pass approve with unticked items needs the one confirmation (400 without, 200 with, recorded) · 9 pass approve stamps each form (sha256, snapshot) and writes `filing_review`; C7.6 review line closed · 10 pass a fact change → that form "Approval withdrawn", others keep their stamp, review line open again · 11 pass round 2 lists only changed forms with before → after · 12 fail officer approves 403; client 403; other firm 404 · 13 fail decision on a recorded filing 409 · 14 screen walk at 1440 px. Breaker: permissions.

## 6b. Capability or scaffolding · proof
All capability, *Needed for the proof*. Not built: Needs-you items and notifications (AG-11, AG-7-39 r8); `waive-deficiency` as its own key (C7.6's pass stays); a library screen for review items (Q1).

## 7. Questions for the tech lead (recommendation first)
* **Q1** Program review items: **recommend a data file per combination now** (`samples/review-items.json`, Sample, copied into each round), a library line kind (SA-1B-221) later with the fees and roles library tables (P-319 order). Visitor visa items are Sample, Unconfirmed: expert.
* **Q2** AG-7-29 r10 (flag, approval kept) vs ours (P-155, break B2, row B6: withdrawn): **recommend ours**, told to the team as a knock-on; a conflict between the team's requirement and the founder's decision goes to the founder if the tech lead wants it confirmed (AGENTS rule 2).
* **Q3** Files under build: `readiness-inputs.ts`, `readiness.ts` (C4 moves C7.6, P-404) and `fill-case.ts` (C3/C4): **build after those PRs merge**, reading their stamps; the migration (new tables only) is read by the tech lead.

## 8. Ready
Acceptance test `acceptance/C8.3.test.ts` (C8.3-1…14). Row text: BACKLOG B144. Decisions: P-406, P-155, P-168/P-237; open: Q1-Q3.
