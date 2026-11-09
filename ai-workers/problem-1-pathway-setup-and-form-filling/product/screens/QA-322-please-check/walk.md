# QA-322: the client's "please check" (P-142 D6), the walk and the build — 9 Nov 2026

**Row:** QA-322 (Gap · Major, C6.5), from qa's #1401. P-142 D6: "a typed-versus-document mismatch shows the client 'please check'; the agent resolves it with a reason". The officer's half (BR-7: one open check, Confirm section refused, resolved with a reason) was built in C6.5 part 2 and is unchanged here.

## Step 1: the walk as the client on main 60235a001, before any change
On an isolated copy with the configured checkpoint, where the client answers the family name themselves (`collected_from: client_questionnaire`):
1. The client typed "SAMPLEDE" (Declared).
2. The officer uploaded a synthetic passport reading "SAMPLED", read it, and used it with Confirm & use. One open check on `person.family_name`.
3. The client opened their questionnaire at 1440 px.

What the client saw:
* The overview row for Sample Client A's "Personal details" said "28 to answer", with nothing about the check.
* The part showed "SAMPLEDE" in the family name box, with no note.
* The client's questionnaire API carried nothing for the check on that answer.
* `GET /runtime/cases/:id/checks` refused the client (403, staff only).

So qa's code search held: the client's half was missing. Screenshots from that walk were not kept in this folder; the walk is repeated below on the built change.

## Step 2: what was built
* **`api/src/runtime.ts`:** the questionnaire view adds each open typed-versus-document check as a warn check (`id: document_check.<check>`, `group: document`) on the question it concerns. This happens in the client's view only (`mode !== "agent"`).
  * The client page already draws these checks under the field: a warn border and icon. It also marks the part "Check answers" on the overview, and names the field in the summary after Save and continue. That summary still lets the client leave the part for now.
  * The words: "Please check this answer: it did not match the {document type} on file when your case officer read it. If your answer is wrong, change it here; your case officer settles the difference with you."
  * The document's value is not shown to the client (see the question for the tech lead).
  * A check on a question the client is not asked (an answer staff enter from the document, as on the fixture) is not shown.
* **Not changed:**
  * The officer's half: the drawer, resolve with a reason, Confirm section refused while open.
  * The Agent view.
  * Who marks a value checked: staff only, P-142 D3.
  * The note goes as soon as the officer resolves the check.

## Walk at 1440 px on the built change (configured checkpoint, isolated copy, US$0)
| Shot | What it shows |
|---|---|
| `screenshots/01-client-overview-check-answers-1440.png` | The overview: Sample Client A's "Personal details" reads "Check answers" |
| `screenshots/02-client-part-please-check-1440.png` | The part: the family name "SAMPLEDE" with the "Please check this answer" note (warn border and icon; the input's `aria-describedby` points at it) |
| `screenshots/03-client-save-summary-1440.png` | After Save and continue: "Check these answers" names the family name with the note, among the unanswered questions; "leave them for now and continue" is offered further down |
| `screenshots/04-client-part-after-resolve-1440.png` | After the officer resolved the check with a reason: the note is gone |

No browser errors.

## Checks
* `acceptance/C6.5.test.ts`, 33/35 on both the configured checkpoint and the fixture; red only C6.5-19b and -20 (the saved letter read, FQ-10). New steps:
  * **C6.5-12b:**
    * on the checkpoint, the client sees "please check" on the family name while its check is open, naming the document and never its value;
    * on the fixture, the client is not asked the name, so nothing is shown.
  * **C6.5-12c:** the officer's Agent view carries no such entry.
  * **C6.5-15b:** once the officer resolves the check, the client's note is gone.
* `tests/runtime/check_runtime_r1a.ts` 98/98 and `check_runtime_r1c.cjs` 140/140 (the client questionnaire's checks and screens) on a fresh copy. One earlier r1c run stopped at 18/19; it did not repeat, with or without the change.
* Type check: no new errors.

## After the review (Approve on a5eb5a9da, journey 8.5/10; `review.md`)
* **m1:** once the answer holds another value than the one the check compared, the note says so instead of asking again: "Please check this answer. It has changed since it was compared with the {document} on file. Your case officer checks it again and settles any difference with you." The check stays open for the officer.
  * Re-review M1 on 673f0794d: "changed" is decided by value, never by answer row. The same value saved again, or changed back, keeps the "did not match" words.
  * The words never say who changed it, because staff may have.
* **m2, m7:** every sentence is under 20 words (BIC-20), even with the release's longest document name, "Passport or travel document information page photocopy".
* **m3:** the document keeps its own name, with only its first letter in lower case ("letter of invitation (Sample)").
* The words are one function, `pleaseCheckWords` in `api/src/runtime.ts`, tested in `tests/check_c65_document_rules.ts`, along with `documentCheckNote`, which decides "changed" by value: 8 new checks, 25/25.
* The re-reviewer's five cases, run against the fix on a fresh checkpoint copy:
  * a fresh check gives "did not match";
  * the same value saved again gives "did not match";
  * a change to the document's spelling gives "has changed";
  * a change back gives "did not match";
  * the officer's change to the spouse's answer gives "has changed", which is neutral.

New shots:

| Shot | What it shows |
|---|---|
| `screenshots/05-client-after-own-change-1440.png` | After the client changed the answer to the document's spelling, the note says it has changed since the comparison and that the officer checks it again |
| `screenshots/06-client-part-please-check-390.png` | The note at 390 px, with no sideways scroll |

Not changed, for the tech lead:
* **m4:** the note is in `checks`, not in `sections[].problems`. No client screen reads `problems`.
* **m5:** while a check is open, the part is never Done.
* **m6:** answered by the 390 px shot.

Re-run on the checkpoint: `C6.5.test.ts` 33/35 (19b and 20 only).

## After the re-review on 01d12b6b7 (Approve)
* **m9:** the two doc comments are in order, and the `pleaseCheckWords` comment no longer says "once the client changed the answer". Comment only.
* **m8, not changed, for the tech lead:** no pack step shows that the view calls the value rule; the unit tests cover the rule itself. A step where the client saves another value, then the compared one, before C6.5-15 would make C6.5-15's resolve refuse with 409 `changed`, because it names no answer. Adding that step means changing C6.5-15 to send the current answer: a pack line under P-400, asked on the PR. The re-reviewer's script `rv-q322-rr.mts` shows the view's words right in all five cases on a fresh checkpoint copy.
