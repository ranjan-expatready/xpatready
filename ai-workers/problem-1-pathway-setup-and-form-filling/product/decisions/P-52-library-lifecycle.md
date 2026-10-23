# P-52 / P-53 — Removing and adding shared library items

Decided by the founder, 21 Oct 2026 (R-62), both on the Lead's recommendation. One home for this topic. P-34 (`decisions/P-34-library-authoring.md`) still holds, and this page adds to it.
Applies to every reusable component: fields, field groups, sections, document types, conditions and checks. Forms already follow the same rule (P-51: retire, never delete).

## P-52 — Delete or retire ("Delete or retire")
Scenario asked: an author added "Relative's relationship to applicant" by mistake; it is used in 2 combinations and in IMM 5406 boxes.

| # | Rule (enforced on the server; the screen only explains) |
|---|---|
| L1 | **Delete** only an item that was **never released and is used nowhere**. It is really removed, and the audit trail keeps one line. |
| L2 | A **released** item is never deleted. It is **retired**: hidden from pickers, from AI proposals and from "Describe what you need" matches. Earlier releases and open cases keep it. |
| L3 | **Retire is blocked while the item is in use** by any current configuration (draft or latest release). The refusal lists every use, each with a link: remove or replace it there first. Superseded releases and open cases do not count. |
| L4 | Delete and retire are draft changes made by an author. A **different person approves**, and release publishes. **Restore** (un-retire) takes the same path. |
| L5 | The same rules apply whether AI or a person made the item. A retire proposed by AI (new-edition impact, P-32) goes through the same guard. |

| L6 | **The same order applies up the tree** (founder, 21 Oct): a field used in any form box, section or combination cannot be removed until those uses are gone. A program or category with combinations cannot be removed. A combination that was ever released, or has cases, is retired, not deleted. It is removed first; only then can items used only by it be retired. |

What counts as "in use": **field**, a section placement, form box map, condition, check, derived field or document evidence link; **section**, chosen in any combination's questionnaire; **document type**, any requirement line or evidence link; **condition or check**, any rule, line or placement that uses it.
Example: the author removes the field from the 2 combinations and the IMM 5406 boxes. Retire is then allowed, and goes to the approver.

## P-53 — AI advises, the person decides ("AI advises, person decides")
Scenario asked: an author wants "Applicant's country of birth"; AI finds "Place of birth – country" and says it is not needed.

1. **One plain-words box:** "What do you need, and why?" No keys, no technical form.
2. **AI drafts** the item (label, type, answer list, help text, who it is about, where it is asked), shows the closest existing items, and gives a **verdict with its reason**: *Use existing* · *Probably not needed* · *New is justified*.
3. **The person chooses** between two options. **Use existing** takes one click and creates nothing. **Add new** needs a reason whenever AI said *Use existing* or *Probably not needed*.
4. **A different person approves**, seeing AI's verdict, the matches and the author's reason.
5. **AI never blocks** (P-14). The system blocks only exact duplicates (Layer 1, no AI: same generated key, same normalised label within subject and group).
6. **When AI is unavailable**, a short form (label, type, answer list, who it is about) still works, and the item is marked "not meaning-checked".
AI's own "new" proposals get the same verdict check against items people added.

## Built today (21 Oct), and the gap
* **Field:** "Add a field" asks for a typed technical key; only an exact-key duplicate check. *Breaks P-34 / P-53.*
* **Section:** inline title + meaning; only an exact-title check. *Breaks P-53.*
* **Document type:** created silently when a new name is typed on a combination's document line; no check. *Breaks P-53.*
* **Removal:** no delete for library items; a hidden field "retire" in the API has no in-use check. *Breaks L3.* Lines inside a combination (forms, document lines, rules) already have a versioned "Remove" through review and release, which is correct.

## Where it is applied (Capability, P-33)
| Screen | Applies |
|---|---|
| 04 Shared library | "Describe what you need" for **Field, Section and Document type** (P-53). On each item: **Delete** (L1) or **Retire** with its in-use list (L2, L3), and **Restore**. Remove the typed-key "Add a field" dialog and the inline section add. |
| 03 Combination workspace | Document lines pick a document type from the library. A missing type opens "Describe what you need"; no silent creation. Removing a line stays as it is. |
| 02 AI work | AI "retire" proposals obey L3. AI "new" proposals carry the P-53 verdict and the matches. |
| API (all screens) | One guard service for delete, retire and restore, used by every screen and every direct call. One pass test and one fail test per rule, L1–L5 and P-53 items 3, 5 and 6. |

**Not built in the prototype (team, P-26):** **Replace with…** (merge, which rewrites every reference in one step), translations, and the no-AI fallback form. The refusal under L3 still tells the person what to do by hand.
**Not now:** Screen 01 FIX does not change for this.
