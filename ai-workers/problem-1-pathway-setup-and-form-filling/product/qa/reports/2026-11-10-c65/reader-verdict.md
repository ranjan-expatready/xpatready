# Reader verdict: C6.5 after #1444 (QA-352), main 2cfdad961, 10 Nov 2026

A fresh reader (Opus) that ran nothing (P-303). I only read files: the row, P-437, P-133 (and its page), P-134, P-153, ASSUMPTIONS C11 (Lead branch), the qa skill, the M3 plan, BUGS rows, #1444's reviewer record, the code named below, every text file in this folder and screenshots 01–05, 07–11c, 12b, 13–15.

## 1. Verdict for the C6.5 row
**Works once a GitHub run is green. Until then the row stays Partial, held only by P-339 (no green run on a commit that includes #1444). No product gap holds it.** Confidence: high (about 85%). The rest of the doubt is the facts I could not check (section 6).

## 2. Gate A: PASS
* The walk is by screens: upload, "Fill this from documents", Replay at US$0, the tick, Confirm & use, then the answer-sheet link. The setup that is not by screens (opening the case, writing the files) is named and is not C6.5.
* The screenshots match walk.md. 02/08 show the cost cards. 03 shows "CAD 14,200 … 1 left". 05 and 10 show "Used · Confirmed and used by Case officer". 15 shows "read by a person". 11a shows the four answer-sheet links.
* The walk ends at the next capability's first step (C7.3, the IMM 5257 answer sheet). 11b shows "2019-06-14 · Document" for Spouse A in Client A's sheet. 11c shows "14200" under Details of visit to Canada, with Copy. `sheet-spouse.txt` carries the funds too.
* So the output of C6.5 can be used at the next step. The wrong Source label (QA-379) and the missing second-spouse date (QA-380) do not stop the next step from using what C6.5 produced.
* Caveat: the walk ran headless only. The skill asks for headed first, plus a read-only look at :4400. Neither is possible in a cloud copy, and qa says so. I accept that for gate A, as the 9 Nov round did.

## 3. P-437 test: no document that offers "Fill this from documents" is left unread
* **Facts I checked.**
  * `readerOf` (`api/src/case-documents.ts:86-96`) gives the passport to MRZ rules, the letter of invitation to AI vision (CASE_KINDS), and any type the library reads as a letter or record with `supplies_facts` to AI vision. Identity documents go to a person.
  * `samples/document-supplies-read.json` sets the funds and the marriage date for those two types.
  * `reader-coverage.txt` shows release v2's nine types. Only the passport, proof of funds and the marriage certificate supply facts, and all three have a machine reader. The walk shows the two new ones read and used.
* **The minor's birth certificate.**
  * The code list (`engine/identity-documents.ts`, the `birth … certificate` pattern) makes it an identity document. That is P-134 ("AI never reads identity documents"), with P-153 (1): code is the guard.
  * P-437 itself says "No bar lowered: the reading rules stay", and P-134 is one of those rules. So P-437 cannot require AI on it. Its only other machine reader would be Textract, which P-437 (2) puts outside Works.
  * On release v2 the type supplies no fact. So there is nothing to fill, and the drawer correctly names it "read by a person" (15). C11 records the same.
  * **Judgement: P-437 is met.**
* **Sharper than qa puts it:** P-133's own page (`decisions/P-133-document-reading-technology.md`, the "Foreign civil records" row) names "birth, marriage and divorce certificates" under AI vision *by name*. So P-133 and P-134 really do disagree about birth certificates. That is a founder pair (AGENTS rule 2), qa's Question 2. It is a records conflict, not a C6.5 gap, because what is built follows the stricter founder rule.
* One consequence nobody states: a minor's city and country of birth are not on the passport's coded lines, so they are typed by hand. That is expected under P-134 and is not a P-437 failure.

## 4. P-339: what moves the row
The row cannot be Works now. Nightly 42619403776 ran on d8fddc328, before #1444. #1444 changed C6.5's own code, its pack (36 → 57 steps) and the checkpoint's step 335. So P-437's "Works on 42619403776 with no re-run" no longer holds, and qa is right to say so. qa's local 57/57 · 33/33 · 13/13 on its own checkpoint copies is evidence, but it is not P-339 evidence.

**What moves it:** a GitHub run of `nightly.yml` with capabilities=C6.5 and data=checkpoint, on main's head at a commit that includes #1444 (2cfdad961 or later). All three packs must be green: `C6.5.test.ts`, `C6.5-screen.test.ts` and `C6.5-counts.test.ts`. The row then records that run id and its job id.

Records condition: P-437 is only on `lead/2026-11-07-lead31`. It should reach main's DECISIONS.md before or with the Works row, because the row rests on it.

## 5. Bugs
* **QA-352 (Gap · Major): close.**
  * The gap as filed is fixed and walked by screens: the funds are read by AI vision and used (01–05, probe). The marriage certificate is read too (07–10).
  * The third document is settled by P-134 and C11 (section 3).
  * Carry the P-133/P-134 pair as a question to the founder, not as this bug.
* **QA-379 (Bug · Minor, C7.3): severity agreed; it does not hold C6.5.**
  * Cause confirmed in the code. `sheetOf` (`api/src/case-prepare.ts`, `origin`) looks the answer up by `x.subjectId === subject`. For application facts, `subject` is the word "case". `markOf` maps "case" to the filing subject, but `origin` does not, so `sourceOf` falls back to "Case officer".
  * The value and Copy are right. It is the same class as QA-348 (Minor).
* **QA-380 (Gap · Minor, C6.5): Minor agreed, on the edge; it does not hold C6.5.**
  * The certificate is read, the value is right, and P-437's test is about reading.
  * The risk is real, though. The two spouses' IMM 5257s could carry different marriage dates, and the officer gets no check. That last point is inferred from `supplies_about` "holder" in `readerOf`; it was not tested.
  * The code filters out any supply that is not "holder". So qa's fix option "the supply names the couple" needs a code change, not data alone.
  * The Lead should rule on qa's Question 3 (couple supply versus Household scope, C3.16) as a follow-up row. If such a mismatch is ever found to reach a filed form unseen, raise it to Major.
* **QA-353 (UX · Minor): severity agreed; it does not hold C6.5.** But "seen again" has no evidence in this folder (no probe line, no script quotes it). Either add the probe output or say it was not re-checked this round.
* **QA-348:** not retested. It stays open as it is.

## 6. What qa missed or overstated, and what I did not verify
* **Overstated or missing evidence.**
  * QA-380 and walk.md cite 12b for Client A's open marriage date. 12b shows only sections 4–6. The line "Date the person married … · Sample Client A" is in `sheet-spouse.txt`, not in the screenshot.
  * QA-353 has no artifact (above).
* **Can't check.** `reader-coverage.txt` comes from a query that is not in `scripts/`, and its JSON is cut off. I cannot confirm it lists every line of release v2, the conditional lines included.
* **Missed (trivial):** the toast "1 value now fill the forms" (05, 10). #1444's reviewer noted it; it is still there. It is a wording nit.
* **I did not verify any of these** (I ran nothing, so they are qa's word):
  * the pack results and step counts;
  * `ai_batch` 7 → 7;
  * the database rows in `probe-output.txt`;
  * the headless replay;
  * the GitHub run facts (42619403776, 42738773981, the 403 on dispatch);
  * that Confirm & use was enabled in 04 (the image cannot show it).
