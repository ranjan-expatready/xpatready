# Journey test (reviewer role), W1-10 slice 1 filing channels, 29 Oct

Isolated copy `fx_rev` on :4480, Load sample, fake launcher, US$0. Playwright (headless Chrome) driven by what a person sees; data read back by API and SQL after each journey. Scratch screenshots only (not committed).

## Journeys
1. **Main (author):** on With an LMIA's Forms tab, set IMM 1295 to Paper and see the signature follow; keyboard-only change of "Filed as". Expected: Paper → "Signed in pen", no picker; refused ways greyed with reasons. **Held** (browser check 25/25 rerun; keyboard ArrowDown saved, focus kept).
2. **Alternate (author → approver):** Shared library › Forms › IMM 5707 drawer → Set what IRCC accepts → PR Portal, Not needed, reason → Send for a second person; approver on To review → Approve; back on the Forms tab Not needed is offered and saved. **Held** (row greyed "The IRCC account asks these questions itself: nothing to file"; data: one `form_edition_accept` row PR_PORTAL {NOT_NEEDED}, change RELEASED, audit lines).
3. **Empty:** Applicant outside Canada, no lines yet. "No form find yet", account shown read-only, step per row. **Held.**
4. **Error (bad input):** old spelling `SIGNED_PDF_UPLOAD` → 400 in words; Paper with no signature → 400 in words; Not needed with no record → refused in words; account "ANY" → 400. **Held.**
5. **Error (AI proposal):** a finder change "Not needed, any account" (schema allows it) approved → 409 "Nothing was deleted: the database refused it", stays WAITING for ever. **Failed** (Blocker for that path; review M1).
6. **Wrong role:** approver, officer, client PATCH channel/account → 403; no actor → 401. **Held.**
7. **Recovery (double click / two tabs):** two saves on one line with the same claim → 200 + 409 "changed at the same moment" (DRAFT and PUBLISHED lines). **Held.**
8. **Account change after lines set:** With an LMIA moved to PR Portal: IMM 5475 Not needed keeps its value and shows why it cannot stay. **Held.**
9. **Across the boundary (setting the account):** a publisher wants their combination filed through the APR Portal. No screen sets it; only Load sample or the API. **Failed** (review M2).
10. **Find cost (QA-98):** Find button tip lists each AI step's reserve (2.20 + 1.70 + 1.70 = 5.60); with a chosen page the page step is "no AI round" and the total is 3.40. **Held.**

## Findings (detail and fixes in review.md)
- Blocker: M1 un-approvable finder proposal (`api/src/filing.ts:79`, `api/src/lifecycle.ts:372`).
- Major: M2 account has no screen (`api/src/forms.ts:117`, no web caller).
- Major: filing kind "Mixed: online and PDF" with Paper lines present (`engine/channels.ts:104`).
- Major: "Ready to file" pill without a current validated copy (`web/src/runtime/forms.tsx:126`); the lock itself is refused.
- Minor: library tip words (`web/src/pages/library-forms.tsx:42`); "rules" pill on a no-AI page step (`finder.tsx:87`); 1024 px table scrolls inside its card.

## Score (each 0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1, J2 done; J9 cannot be done on screen |
| Next step obvious | ½ | each refused way says why; Not needed refusal points to an account nobody can set |
| Plain words | ½ | good refusals; stale library tip; "Nothing was deleted" on an approval |
| Feedback and state | 1 | greyed Not needed with reason; stale value flagged, never changed silently |
| Correct data | ½ | records, versions, audit right; filing kind wrong with three channels |
| Error recovery | ½ | 409 on races, old spelling explained; M1 change stuck with no way through |
| Accessibility and screen sizes | 1 | axe 0 on 6 states; 1024, 720, 400 px no page scroll; keyboard path |
| Speed | 1 | Forms 0.4–1.2 s, library 0.3–2.0 s under heavy load |
| Visual quality | 1 | team table, drawer, pills |
| Trust and sources | 1 | basis per record, quotes, Sample, Check with both readings |
| **Total** | **7.5 / 10** | **Fail** (below 8) |

To raise it, most valuable first: fix M1 (error recovery, plain words), give the account a place to be set or reword the refusal (task, next step), name Paper in the filing kind (correct data).

## Not tested
A real screen reader; an unaided intended user (D17, D20 stay with the founder); live AI; the runtime case Forms panel in a browser (code read only); two real browser tabs (simulated by parallel requests).
