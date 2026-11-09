# B155 brothers and sisters (IMM 5645 Section C): break report, storage side

**Target:** PR #1367, branch `claude/pensive-bell-7ko7fb`, commit 0dd8397ee. The copy was `brk155` on :4481 (`tools/isolated.sh`, TTL 60). It was set up with Reset, then Load configured as user-A (119 s), and stopped at the end (database removed). Visitor visa release 2, the pack's FAMILY (Sample Client A, Sample Spouse A, Sample Child A1 aged 10, Sample Child A2 aged 15), opened with `acceptance/lib/m3.ts`. Copies were read back from their own PDFs with the E5 reader, as `check_b155_siblings.ts` does. Live AI off, US$0.
**Scope:** the row as built: the sibling key `<person>/sibling`, its group, "none apply", entries, answers, Confirm section, readiness, the IMM 5645 copy, and the Section B second-child fix. No concept.md exists for B155; the scope comes from the PR and `walk/walk.md`.

## Findings

| # | Attempt | Expected | Actual | Sev | Evidence |
|---|---|---|---|---|---|
| 1 | Rows past the form's 7. Eight entries on Sample Client A's sibling key: entries 1–7 complete, entry 8 with a name only. Then `fillEverything`, GET …/forms, GET …/prepare, and a copy of IMM 5645. | Entry 8 is not on the form, so the filing path says so: IMM 5645 waits, or Prepare or the copy names entry 8 for an extra sheet. IMM 5645 p. 1 says "Include ALL family members". The client is told: "Keep it here: your officer adds it on an extra sheet." | Entry 8 is accepted (201, then 200). It shows `fits:false` on every fact, and only the Agent view entry carries the "Does not fit on the form" pill. The section's `missing` is `[]` while entry 8 has a name only. IMM 5645 readiness is **`ready: true, missing: []`** with 8 entries. The copy holds 7 names in Section C. Nothing in the copy's `result_json` or in Prepare mentions entry 8 or an extra sheet (regex `SIB8\|extra sheet\|does not fit\|8 entries`: no match). The 8th brother or sister can reach filing on no form, with every check green. Before B155, a group's rows that did not fit were still waited on. This row filters them out for lists. | **Major** | engine/runtime/forms.ts:196–197 (`filter(x => !isListRelative … \|\| x.fits)`); engine/runtime/case.ts:434–435 (same filter on `missing`); web/src/runtime/questionnaire.tsx:571 (the client's promise) |
| 2 | "Accompanies" (`relationship.accompanies_subject_to_canada`, mapped on row 7 only) answered on entry 1: `PUT …/answers/<P>/sibling/relationship.accompanies_subject_to_canada {value:true,row:<entry 1>}` as user-P. | Refused (422: the form has no box for it in this entry), or at least never confirmed unseen. | **200** "Saved. It fills IMM 5645 for Sample Client A (2 form fields)." It is stored DECLARED. Both screens hide it, because `inEntry` drops a question whose own row does not fit while the entry fits (shown indexes: 6 and 7 only). Confirm section with only the ids the screen shows gives **409**, naming `relationship.accompanies_subject_to_canada`, a question the officer cannot see. The screen's Confirm sends every row answer's id, `inEntry` not applied, so the same click returns **201** and the hidden answer becomes VERIFIED by `confirm_section` (user-O). That is "confirmed unseen" (STANDARDS §4). It can be reached without the API too: entry 7 answers "accompanies", an earlier entry is removed, and the answer slides to row 6, where it is hidden (seen in run F: `[5,false,false]`). | Minor | api/src/runtime.ts:434–435 (no per-row fit check); web/src/runtime/questionnaire.tsx:808 vs :651, :572, :887 |
| 3 | Save message on an entry the form has no row for: entry 8's name, as user-P. | "Saved." plus words saying it is not on the form. | "Saved. It fills IMM 5645 for Sample Client A (7 form fields)." It fills none. Entry 1's "accompanies" says "(2 form fields)", and it fills none either. The message counts the fact's boxes on every row, not this entry's. | Minor | api/src/runtime.ts:466 (`fills = q?.fills`) |
| 4 | A child's sibling key (IMM 5645 is not the children's on release 2): `POST …/groups/<K1>/sibling/rows`, `PUT …/groups/<K2>/sibling/sibling/none-apply {noneApply:true}`, then `PUT …/answers/<K1>/sibling/person.full_name {row}` as user-P. | 404: no form of this case describes that person's brothers and sisters. | 201, 200 `saved:true` and 200 "Saved.". Each child's party gets a new `answer_subject` (kind `sibling`) holding a row, a "none apply" and an answer. No view shows them: the Agent view has no `<K1>/sibling` section. `POST …/sections/sibling/confirm {subjectId:"<K1>/sibling"}` gives 201 `confirmed:0`. These are hidden stored answers that would appear if IMM 5645 ever applied to that person. `subjectFor` checks only that *some* form maps `subject_sibling`, not one that applies to this person. The same was already true for a child's `parent_1` (200 "Saved."), so B155 extends an existing gap to lists. | Minor | api/src/runtime.ts:135 |

## What held (with reproduction)
* **Concurrent first entries:** 12 parallel `POST …/groups/<SP>/sibling/rows` (user-O and user-P alternating) on a person with nothing stored gave 12 × 201. There is exactly **one** `answer_subject` of kind `sibling` on the spouse's party, with 12 live rows and 12 distinct `order` values. The view reads 12. No row landed on another person.
* **Concurrent "none apply":** 8 parallel `PUT …/none-apply {noneApply:true,expectedId:null}` (both roles) gave one `saved:true` and seven `saved:false`. That is one subject and one live `client_group_answer`.
* **"None apply" against add-row, raced** (4 fresh cases, 2 + 2 parallel calls): every time, either "none apply" stands with 0 rows (the adds get 409), or 2 rows stand with no "none apply" (the "none apply" calls get 409). Never both, and always one subject.
* **Two sessions, same first answer** (entry 3's date of birth, user-P and user-O at once): one 200 and one 409 "Someone answered this at the same moment". There is one live answer.
* **Remove an entry while answering it** (20 races, DELETE ∥ PUT): no answer is stored after the tombstone. Once both returned 200, because the answer committed first and the removal then hid it. No "Race" value is read afterwards.
* **Wrong keys** (all refused in words):
  * Another case's person on this case, and this case's person on another case: 404 "That person is not on this case".
  * The application's `/sibling`: 404. `cousin`, `SIBLING` and `<P>%2Fsibling%2Fx`: 404.
  * `parent_1` as a list, or with group `sibling`: 404 "That section has no repeating group". Group `personal_details` on the sibling key: 404. The person's own route with group `sibling`: 404.
  * A row of P's siblings used on the spouse's siblings: 404. On P's own fact or on P's `parent_1`: 422 "one answer, not rows". DELETE through the spouse's key, P's own key or another case: 404.
  * A row that is a random uuid: 404. A row that is not a uuid: 400. No row: 422.
  * `%2F`-encoded `<P>%2Fsibling` behaves exactly like the two-part route, on the same subject.
* **Roles:**
  * Author (user-A) on add-row or PUT: 403. Another client (user-Q): 404 "No such case". No actor: 401. Client Confirm section: 403.
  * A fact no form reads about a sibling (`person.passport_number`): 404 "…about a brother or sister". Every sibling fact on release 2 is a client field, so there is no officer-only sibling fact to write.
* **Confirm section:**
  * With another person's sibling answer id, with P's own answer id, or with a stale id (a newer answer saved since): each gives 409 naming the fact, and nothing is confirmed.
  * Section `personal_details` on the sibling key: 404 in words. Section `sibling` on P's own key: 404.
* **The copy** (3 entries with marked values, the middle one removed, then `fillEverything`, then IMM 5645 for P):
  * Section C row 0 holds entry 1's values (name, address, occupation, date of birth 1971-01-01). Row 1 holds the third entry's values (date of birth 1973-03-03).
  * The removed entry's values appear nowhere.
  * No sibling value is in Section A (applicant, spouse, mother, father) or in Section B. The applicant's boxes hold only the principal's values.
  * The spouse's IMM 5645 holds none of P's siblings.
* **Second-child fix:**
  * Section B row 0 holds Sample Child A1 entirely: name, address, occupation, Son, Yes=1.
  * Row 1 holds Sample Child A2 entirely: name, address, occupation, Daughter, No=1.
  * There are no crossed values.
  * Each child's IMM 5257 holds that child's own values and none of the other child's or the siblings'.
* **Values:** "Ñandú 李小龙 مريم" is saved and read back. 5000 characters: 400 "at most 4000". "Entries apply" while entries exist: 200 `saved:false` (no change).
* **Budgets:** with 100 sibling entries, the Agent view takes 102 ms, the client view 73 ms and GET …/forms 308 ms.
* **Storage without a migration:** `answer_subject` has no unique index on (party, kind). One subject per party and relation rests on the advisory lock in `subjectFor` (runtime.ts:139), and `relativesOf` takes the lowest id. Under the races above, a second subject never appeared.

## Not tried
* Screen checks: reload or back mid-action, keyboard only, 1024 px, 200 % zoom. This pass was storage-side, as asked.
* Uploads: none in this row.
* Moving a case with sibling subjects to another release: no second release with sibling maps exists for the Visitor visa.
* More than 500 answer ids in one Confirm (about 63 complete entries): the `seen` cap.
