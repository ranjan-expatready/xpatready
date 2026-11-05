# B83 break report, re-check: undo and withdraw only (PR #1036)

Independent breaker, 5 Nov. Diff-only, by the tech lead's ruling. The earlier report (head 0aff0e0b4) is in git history. Paths are under `prototype/studio/`. US$0: no `*_LIVE`, no priced button. **Ran** = seen on the copy. **SQL state** = I built the starting state in the database; the attack after it went through the routes. **Read** = code only, not run by me.

## Which code this is
Asked for 689804c9c. While I waited for load, the worktree moved to 091eff3bc (review N1, N2, minors) and then becb7c81b (tests and walks only). **Everything Ran is on 091eff3bc's app code, the same as becb7c81b's.** I never ran 689804c9c. Read there: a gate reading a withdrawn field lost its validator line and gained no named one, so it could release. 091eff3bc closes that (Ran, held). Copy `brk83r` on :4442, restored from the dump, stopped and dropped at the end.

## Verdict: not ready. 0 Blockers, 2 Majors, 5 Minors.
Undo, the withdraw path and the release race held every attack that went at them. The ruling's condition holds on every reader I built, with two gaps. Re-asking under the same name escapes it (M1). The hold also lands on a combination that reads nothing, with a remedy that does not work (M2).

## Majors

**M1. Re-asking under the same name lifts the hold with the reader unchanged, and it releases on the new meaning.**
* **Did (Ran; the rule is SQL state, the rest routes):** asked a new field "Breaker re ask", meaning "ever been refused a visa". A rule "Ask for the refusal letter" reads it. To review's withdraw: the rule is named, and Submit refuses by name. Asked again, same name, meaning "holds a valid licence to drive a car".
* **Expected:** the rule stays held until a person changes it, or the re-ask is told it inherits a reader.
* **Actual:** the same key is reused (`person.breaker_re_ask`). The hold is gone at once, with no words at the re-ask. The second person's change view shows `matches: []` and no reader. Approved 201, Submit 201, approve 201 (`version 2`). Released rule: `when person.breaker_re_ask = true`, released field meaning "licence to drive a car", rule row never edited. By the rule's own words, a client who drives would be asked for a refusal letter (not run on a case).
* **Cause:** `keyFor`'s taken set holds only canonical field rows, and withdrawal deletes them (`api/src/own-question.ts:166`). `gone` drops any key live again (`api/src/studio.ts:474-475`).
* **Fix:** count withdrawn keys as taken, so a re-ask gets a new key and the hold stays. Fail test: as above, and Submit still refuses by the rule's name.

**M2. A false Submit block on a combination that reads nothing of the field, and the line's remedy is refused.**
* **Did (Ran, routes):** new field on Visitor visa. Propose that the shared type "Fee payment receipt" supplies it; second person approves. Withdraw the field. `sp.outside` (a study permit) uses that type. Its forms, document lines, rules, checks and form fields name the field 0 times.
* **Expected:** nothing on `sp.outside`, or a line whose remedy works.
* **Actual:** Submit on `sp.outside` answers 400: `The document type "Fee payment receipt": It reads "Breaker doc fact two", a new field that was withdrawn. Point it at another field, or remove it.`
  * The remedy, proposing the facts without it: 409 "A change of the facts … is approved and waits for the next release".
  * Another person withdrawing that change: 403.
  * Only the proposer's own withdraw clears it (201, lines 0). No line says so, or says who that is.
  * The words are also wrong: a supplied fact is not "read", and nothing on that combination can be "pointed".
* **Cause:** `engine/validate.ts:75` holds every combination whose checklist lists the type. The message at `:62` is one sentence for all readers.
* **Fix:** the withdrawal also ends an approved, unreleased supplies change naming the field, or this line gets words naming the real step and its proposer. Do not simply drop the line: unreleased, that approved change would publish a fact that does not exist. Fail test: as above.

## Minors
* **n1 A reader type the list misses: a proposed merge (Ran, routes).** Merge keeping the waiting field: `readers: []`, Undo `withdrew: true`, `kept: null`, nothing said. Damage is guarded: approving answers 409, but says the field "was retired", which is false (it was withdrawn; `api/src/forms.ts:348`). The published field stays locked meanwhile: a new merge answers 409 "that one is decided first" (`:314`) until someone rejects the dead one.
* **n2 A reader type the list misses: a waiting document type draft (SQL state).** `suppliesFacts` naming the field: `readers: []`, Undo withdrew it. `document_type` is not in `READING_DRAFTS` (`api/src/where-used.ts:113`). Read: accepting it lands those facts as written (`api/src/proposals.ts:638`), and M2's line then holds.
* **n3 Words that are false (Read).** "Each holds its combination's Submit until it is changed" (`web/src/pages/review-items.tsx:223`) covers every reader. A waiting change or waiting draft holds nothing until accepted (the suite gives them no `submit` line), and a worked-out value holds only if the combination reads it (`engine/validate.ts`, `read.has`).
* **n4 The after-press words are brief, and a long list is clipped (Ran, browser).** The only "after" words on a person's screen are a 4.4 s toast (`web/src/lib/api.ts:61`), landing on `/review`. The change's own record does not name them. Four readers at 512 px: a 180 px paragraph, gone in 4.4 s. Twelve long readers at 1024 px: the toast's top, with its Dismiss button, is above the viewport with no scroll (`ui-withdraw-after.png`). Before the press all 12 are named in full, so the loss is the reminder only. Activity has them (Read, `library-changes.ts:280`).
* **n5 Focus lost (Ran, keyboard, 1024 and 512 px).** Enter on "Withdraw it instead…" removes the button; focus falls to `BODY`, top of the page. `web/src/pages/review-items.tsx:229`.

## Attacks by the lead's list
| Attack | Result |
|---|---|
| Release racing undo | Held (below) |
| Undo or withdraw against an ask on another row | Held (below) |
| A reader type the list misses | n1, n2; gate and reference date now caught |
| A new key leak | None found (below) |
| Words that are false | M2, n1, n3 |
| A withdrawn field re-asked under the same name | **M1** |
| A false Submit block | **M2** |
| Escaping the ruling's condition | M1 and the merge in n1. Withdraw after Submit held |

## What held (Ran)
* **Release racing undo:** 8 rounds, 4 on `/approve` and 4 on `/pack/release`, timed from the last measured release (the suite uses fixed delays and `/approve` only). Broken 0 of 8: one live published row each time, equal to the frozen release. 3 rounds both 2xx (undo made a new draft over the release); 5 refused the release in words. No round hit "released just now" itself: that window is held only by the suite's deterministic test, which I read and did not run.
* **Undo or withdraw against an ask on another row:** 16 rounds, picking the field or naming a new one with the same name while the withdrawal frees its key. Dangling rows 0, 5xx 0, change and field out of step 0, false "stays waiting" 0.
* **Withdraw after Submit:** Submit 201 with the field waiting, then withdraw. Approve 409 by the rule's name, no key. `/pack/release` answered 201 but left Visitor visa out: the rule is still DRAFT v1 and no release reads the field.
* **Gate through routes:** named before the press; Undo keeps it in words; the withdraw names it; Submit 400 by the gate's and the field's names.
* **Reference date of a worked-out value (SQL state):** named, kept.
* **Doors on `GET …/readers`:** Client 403, Case officer 403, nobody 401, unknown id and non-uuid 404, approver and reviewer read it.
* **Keys:** after a withdraw, `GET` combination, catalogue and review carry 0 mentions; refusal words and readers carry none. The change view has it only as its data field.
* **Screen:** 12 long Punjabi and Urdu readers wrap, all named, no key. No sideways scroll at 1024 px or a true 512 px viewport (200 %). Tab from the reason reaches the button; Enter withdraws. The toast is in an `aria-live` region.

## Closure of the earlier findings
* **B1** Closed. Ran, as above.
* **M1 (readers)** Closed for what it listed; Ran on rule, gate, document type, supplies change, worked-out value. New misses: n1, n2.
* **M2 (races)** Closed. Ran, 16 rounds.
* **M3 (no-op draft)** Closed by Read (`library-changes.ts:269`) and the suite's fail test. Undo's own delete path Ran in the race.
* **M4 (toast outcome)** Closed by Read (`said` on the row) and the browser check. Not rerun.
* **M5** Not a defect, by the ruling; replaced by the condition above, with M1 here as its gap.
* **m1 retired fact** Closed by Read and the suite.
* **m2 false `kept`** Closed by Read (`whyKept`); no false words in my 16 rounds.
* **m3 "reset" words** Closed by Read. Not raced by me.
* **m4 focus after Undo, m5 stale row** Closed by Read and the browser check. Not rerun.
* **m6** Open; the builder lists it in the PR.
* **m7 success words** Closed. Ran `form_fields_restored: 1`; words Read (`review-items.tsx:217`).
* **m8 history** Closed by Read (`library-changes.ts:280`). The audit path I tried answered 404, so History was not swept for keys.
* **m9 placed question, grammar** Closed. Ran: `still_asked` names the section; "still reads it".
* **m10** Closed by Read (`library-changes.ts:265`).

## Not settled, and limits of this run
* **Dropped, not a finding:** a waiting section draft "reading" the field. Its `fieldKeys` are form data paths, not library keys, so my state was false.
* **Not run:** a form field's own `condition` column as a reader (my setup found no row to use; Read only). M1 with a gate as the reader (same key path, Read). Answer keys holding the field as a reader: not tried.
* **Read, not run:** Undo onto a named fact that was withdrawn rather than retired: `refuseRetired` would pass it. A step naming a waiting field needs SQL state, so I left it.
* **Load rule breach, mine:** the first gate attack started at a 1-minute load of 20.37 (I read `uptime` in the same command), and a shell fallback of mine ran it twice. After that every run went through a gate script that refuses above 16; each started at 7 to 13.5. A load watcher was killed from outside once (exit 144) and restarted. Nothing stopped by me but my own copy.
* Scripts and screenshots are in the scratchpad of this run, not in the repository. Nothing committed.
