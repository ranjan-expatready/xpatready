# C6.4 on the configured checkpoint: what is red and why (runtime builder, 5 Nov)

Branch `claude/festive-hypatia-f3vcuy` from main ffcfb45c8. Live AI off, US$0.

## Baseline: the pack on a fresh copy of the checkpoint
* **How:** a fresh isolated copy `rt64` on :4430; Demo › Reset, then Load the configured checkpoint as the author (70 s, `cost_usd` 0; Visitor visa released as release 1). Then `tsx studio/acceptance/C6.4.test.ts 4430 xr_studio_rt64` with no fixture setup (qa's method, `qa/verdicts/2026-11-04-M3-on-the-checkpoint-after-891.md`).
* **Result: exit 1 · 18/30** (qa had 6/30 before #868; #868 gave the release its IMM 5484 lines).
* **Green (18):** C6.4-1, -2, -3, -5, -6, -7, -8c, -8f, -8g, -9, -20, -12 to -18. The checklist API, roles, request, upload, history and Not applicable all work on the checkpoint's own lines.
* **Red (12), in three groups:**

| Group | Steps | Why, on the checkpoint |
|---|---|---|
| A. Financial support on the principal only | C6.4-4 | The release carries "Proof of financial support · each applicant". C2.6's saved reading of IMM 5484 says `who: each_applicant`, quoting "Proof of Financial Support. You must include proof that you can support yourself and any family members accompanying you". The pack's principal-only rule is Sample (VV-R06, `lib/setup_vv_m3.ts`). |
| B. The five minor lines | C6.4-8, -8a, -8b, -8d, -8e, -8e2, -8h, -8i, -9a, -9b | No letter of authorization, birth certificate, absent parent's ID, custody documents, or adoption or guardianship papers. The saved reading proposed one combined line, "Minor custody or parental authorization", reading `person.is_minor` and `person.travel_companions`. The loader rejected it: "its condition reads person.is_minor, person.travel_companions, which this library does not hold and ask yet" (`demo.ts` `checklistDocumentLines`). |
| C. "Who do you travel with" never asked | C6.4-19 | `person.travels_with` and `person.custody` are not in the checkpoint's library or questionnaire, so the principal of 15 is not asked, and the answer gets 404. The fixture adds both facts through C3.6 (S6a); the checkpoint's steps do not. |

Proposals on the checkpoint's IMM 5484 replay (from `proposal_item`):
* accepted: fee payment receipt, marriage certificate copy (couple once), passport information page copy, proof of financial support;
* rejected (facts not in the library): minor custody or parental authorization, proof of legal status, US nonimmigrant visa copy, visa application photos;
* rejected (no condition): purpose of travel evidence.

## Why this builder cannot close B and C alone
* The checkpoint's Visitor visa release is built only by the checkpoint loader (`api/src/demo.ts` `loadConfigured`, with data from `api/src/form-setup.ts`).
* `form-setup.ts` has hooks only for **always-needed** cited lines (`documentsCited`) and **yes/no** rule facts. A conditional line and a fact with answer values both need a change in `demo.ts`.
* `demo.ts` is off-limits to this brief and M2-hot, with its queue at #1009 → B78 → B79a → B79b.

## Screen part
* No case screen shows the checklist today (`web/src/runtime/cases.tsx` has no Documents panel).
* The concept is `screens/M3-design-2026-11-04/documents/concept-draft.md` §4 Documents panel, with its fresh challenge `challenge.md` (1 Blocker, 7 Majors, answered in commit 1db4ede64).
* No tech-lead approval is recorded for it: DECISIONS P-340 to P-346 do not name it.
* A second independent Opus challenge, scoped to C6.4 (a) on the checkpoint's lines, is in `challenge-r2.md`.
