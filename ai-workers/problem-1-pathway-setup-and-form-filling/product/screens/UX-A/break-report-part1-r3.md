# UX-A part 1: break report, round 3 (head 2c877d10)

Breaker, 2 Nov 2026. What I tested:
* **Copy:** isolated `brk_uxa1c` on :4447, restarted with `tools/isolated.sh` on 2c877d10.
* **Web build:** `index-CIsedw8p.js` from 15:55:28; I did not rebuild it.
* **Data:** the demo sample (`reset` + `load`) and the six (`reset-to-six`).
* **Cost:** US$0. No priced button, no `*_LIVE`.

Probes, as in round 2: `/summary`, `/workspace?tab=forms`, `/combinations/:id` (attachments) and `/catalogue`. They apply the new `attachedNotSetUp` rule: every `kind: "Form"` file, keyed by `edition ?? officialFile ?? id`. A Playwright read of the Forms and Review tabs is in `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/shots2/r3-*.png` (not committed). Round 2: `break-report-part1-r2.md`.

## Verdict
**N1 is fixed, and the new rule held every attack.** One finding remains: round 2's N2 (Minor). The builder's test for keeping it in this row was whether it makes two screens disagree on a count, and it does (below). N3 and N4 can go to follow-up rows as proposed: neither puts two screens at odds on the same count. On N3, the Preview's footer now says its number can differ by family.

No Blocker and no Major is open. Whether N2 is fixed here or becomes a follow-up row is the reviewer's call.

## N1 re-run: fixed
Steps (demo Visitor visa): user-A uploads byte-changed copies of `imm5645e.pdf` and `imm5710e.pdf` through `POST /intake`; both are held. user-A records each IRCC page and user-B approves each one (P-80). Each answer: "… added to the library as a new form (read from the file). Attached to Visitor visa." (`recognised: false`, RECOGNISED).

Result:
* The count, the card list, the Overview line and the filing line all say "4 forms · 0 set up" (IMM 5257, 5645, 5707, 5710).
* The tab draws 4 rows. IMM 5645 and IMM 5710 show "Recognised: ready to read".
* Its sentence reads "1 form can be added from the library now; 3 forms need reading and drafting with AI".
* Screen: `r3-vv-two-p80-forms-1440.png`.

## Attacks on the new rule
| Attack | Result | Held? |
|---|---|---|
| Two P-80 forms of different numbers (IMM 5645, IMM 5710) | Counted and listed separately: 4 = 4 | Yes |
| P-80 form then added from the library (`POST /forms {"formKey":"IMM 5645"}`) | 4 forms · 1 set up. Its row moves from pending to the lines; card list and rows agree | Yes |
| … then removed in this draft, then Undo | 3 · 0 with "Removed in this draft: IMM 5645" and no pending row, then back to 4 · 1 | Yes |
| The same approved file uploaded to a second combination (Super visa) | "Already in the library … Attached to Super visa": 3 · 0, 3 rows, IMM 5710 included | Yes |
| The same approved file uploaded again to Visitor visa | "Already attached", no second row, count unchanged | Yes |
| A Form file with no edition | Not reachable: see below | Not reached |
| The six after the rule change | Unchanged and in agreement: 8·7, 6·0, 5·0, 6·0, 8·0, 0·0 (count = card list = lines + rows) | Yes |
| Round-2 B3 race (6 parallel sample attaches of imm5409e.pdf) | 3 · 0, 3 rows; user-A, user-B and user-C read the same result | Yes |
| Round-2 B2 (remove IMM 1295 on LMIA, release) | 7 · 7, no pending row, IMM 1295 in `removedEver` | Yes |

Why a Form with no edition is not reachable:
* An official-list file always has an edition: every manifest form item carries one (api/src/sources.ts:139).
* A P-80 file takes the held file's `editionLabel` (sources.ts:149). Approval is refused without an edition: "Its form code and edition could not be read from the file…" (api/src/intake.ts:225).
* An unknown file is stored as "Unrecognised file", never as `Form`.
* I found no other route that stores `kind: "Form"`; guide links store "Instructions" (api/src/guide-sources.ts:23).

One note for later, not a finding: if a Form ever had no edition and no official file, the Programs card would show its id as the form code (api/src/programs.ts:198, `x.edition ?? x.officialFile ?? x.id`). UX-A's backlog row puts internal identifiers behind Details.

## Still open

**N2: Minor. The Forms tab says "Removed in this draft (1)" while Review says "0 draft changes".** Re-checked on 2c877d10.

Steps (demo LMIA):
1. `DELETE /forms/IMM 1295`, then submit as user-A and approve as user-B (Release 2).
2. `POST /forms {"formKey":"IMM 1295"}`.
3. `POST /forms/undo`.

Actual:
* The counts are right: 7 · 7, and `/summary` gives `changes` 0.
* The Forms tab shows "Removed in this draft (1): IMM 1295 · Add back" and "Undo above reverses the last change", but there is no Undo bar.
* The Review tab says "0 draft changes; 0 problems to fix".

On the builder's test: two screens give different numbers for the same draft (1 removed in it, against 0 changes), so it is not outside this row's definitions. The rule at fault is the one contracts/counts.ts owns, `removedInDraft` (counts.ts:30): it dates a removal by the line's `updatedAt`, which Undo rewrites (api/src/workspace.ts:95; web/src/pages/workspace/forms.tsx:214-216).

Screens: `r3-lmia-undo-forms-1440.png`, `r3-lmia-undo-review-1440.png`.

**N3 and N4: follow-up rows, as proposed.**
* N3: the Preview has no family with a single parent. Its words now say "a person's number can differ with the family chosen here", so no screen claims the same count.
* N4: the form facts keep counting a role removed with "Save anyway". That is a different count from questions, and it is reached only after an explicit confirmation.

## What held
* P-80 forms are counted and listed on every forms surface:
  * the card list;
  * the Overview line;
  * the filing line;
  * the tab rows and their sentence.
* Re-add, remove and Undo keep the count and rows together.
* A cross-combination upload and a same-combination duplicate are handled.
* The six is unchanged.
* The B2 and B3 re-runs held.
* user-A, user-B and user-C read identical numbers.
