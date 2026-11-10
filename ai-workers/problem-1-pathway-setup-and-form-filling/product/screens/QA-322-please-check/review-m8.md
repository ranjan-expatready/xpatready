# Review of PR #1409 (QA-322 pack, review m8) at 5fe6b4415, 9 Nov 2026

**Reviewer:** the same independent reviewer as #1404. **Scope:** `git diff 87e0d200b 5fe6b4415`, which changes only `acceptance/C6.5.test.ts`. It adds step C6.5-12d and an `answerId` on C6.5-15's resolve; Lead 39 approved both lines under P-400.

**Run:** the isolated copy `rv_q322` on :4438, at US$0 with live AI off. It is now stopped, and no tracked file was changed or left behind. The temporary mutations and the old-pack copy were removed (`git status` is clean).

## Results
| Run | Result |
|---|---|
| Fixture (fresh copy, then `setup_visitor_visa.ts` 15/15 and `setup_vv_m3.ts` 44/46) | **34/36**, red only 19b and 20 (FQ-10). The name's typist is the officer, so 12b and 12d both expect and get no note (`noteChanged: []`, `noteBack: []`). |
| Configured checkpoint | **34/36**, red only 19b and 20. 12d passes: "It has changed since…" after SAMPLEDX, then "It did not match…" again after SAMPLEDE. |
| Mutation V on the checkpoint (`documentCheckNote` changed to "changed whenever an answer exists") | **33/36**: **12d red**, 12b green. The step fails without the rule, as the builder said. |
| Mutation H on the fixture (resolve overwrites the current answer in place) | New pack 33/36 and old pack (87e0d200b) 32/35: **C6.5-15 red in both.** The append-only trigger `trg_answer_append_only` rolls the resolve back. |

## What was checked
* **Is 12d right on both data sets?** Yes.
  * On the checkpoint it asserts the changed words and then the "did not match" words.
  * On the fixture the client is not asked the name, so it asserts that no note appears. That is the same branch as 12b, and nothing leaks.
* **Does C6.5-15 still test what it tested?** Yes, for its rule.
  * Keeping the document's value with a reason gives 200 and makes `SAMPLED` the current answer.
  * Sending `answerId: nameNow()` mirrors the drawer, which sends the answer the officer sees. That is needed now that 12d made newer versions, and it is the documented contract (case-documents.ts `resolve`, break M1).
  * The default path (no `answerId`, so the check's own answer is used) is still covered elsewhere: `acceptance/C6.5-counts.test.ts:80` and `tests/check_c65_documents_api.ts:125-177`.
* **Did anything else in the pack move?** No. The diff is the 12d block (C6.5.test.ts:105-112) and the one resolve line (C6.5.test.ts:119). C6.5-13, -14, -15b and -16 onwards are byte-identical.

## Findings
**Block:** none. **Major:** none.

**Minor (Should; fix or list in the PR)**
* **m10. C6.5-15's count is now met before the resolve** (C6.5.test.ts:120). Its `count(*) >= 2` ("the client's value stays on record") was meaningful when only one version existed before resolve. After 12d there are already 3 versions, so this part no longer proves anything. The rule is still guarded: the database refuses an in-place overwrite (mutation H: C6.5-15 red), so nothing is unprotected today. A stronger line, under P-400, would check that the version the officer resolved over is superseded and still holds `SAMPLEDE`.
* **m11. 12d's title says "the client saves"** (C6.5.test.ts:112). On the fixture the officer saves, and the step checks that no note appears. 12b's title switches on `typist`; 12d's could do the same. This changes words only, and needs P-400.

Verdict: Approve 5fe6b4415
