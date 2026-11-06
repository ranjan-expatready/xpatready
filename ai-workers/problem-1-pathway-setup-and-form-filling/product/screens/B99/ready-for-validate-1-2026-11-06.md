# B99 round 1: Ready for Validate (record; the PR comment could not be posted from the builder's session)

The builder's sandbox refused the GitHub comment (`gh`: certificate check fails; a direct API call was refused), so the tech lead asked for the text to be kept here as the record (6 Nov). The outcome: the tech lead's Validate stopped at Background 1 a); the founder ruled the questions be added (B116). Round 2 follows.

## As handed over (B99 final four, head `47c0229de`, 6 Nov 02:53 IST)

The checkpoint loader on this branch (stacked on #1052 and #1125) made four IMM 5257 copies of the fixed Sample family's case, using test copy `b99t` on :4454. US$0, live AI off. On each copy every written value reads back, and DocMDP and UR3 verify.

Folder: `~/Library/Application Support/Claude/side-session-notes/local_8acced9f-c0a1-4b80-b010-d655c20778fe/b99-final-2026-11-06/`

| Copy | Absolute path | Written | SHA-256 |
|---|---|---|---|
| Client A | `~/Library/Application Support/Claude/side-session-notes/local_8acced9f-c0a1-4b80-b010-d655c20778fe/b99-final-2026-11-06/imm5257-client-a.pdf` | 63 | `4624ac696e6ea21ca3ce5d1fd07ebc68bb44924bcb87b2c5bd209eef09b49427` |
| Partner | `~/Library/Application Support/Claude/side-session-notes/local_8acced9f-c0a1-4b80-b010-d655c20778fe/b99-final-2026-11-06/imm5257-partner.pdf` | 63 | `a6d75c5cd1ba62622555f33e1a375489c3e1a0c32fb7e13adaeadc5c07f85ca8` |
| Child | `~/Library/Application Support/Claude/side-session-notes/local_8acced9f-c0a1-4b80-b010-d655c20778fe/b99-final-2026-11-06/imm5257-child.pdf` | 60 | `b3e19a12ad0497433b91fe30d7dfc15fab5b42e23c074fe657c9dc224ecf1dfa` |
| Child 18 or over | `~/Library/Application Support/Claude/side-session-notes/local_8acced9f-c0a1-4b80-b010-d655c20778fe/b99-final-2026-11-06/imm5257-child-18-or-over.pdf` | 60 | `21346f383d692b63f3cdbdb384c3c8bbe9f62477733a424a9eaecd9bb13c8c26` |

**Please save each validated file beside its copy as `imm5257-<who>.adobe.pdf`, in the same folder, then comment.** This session cannot write to the rehearsal folder (`lead10-saved-2026-11-05/`), so the four copies are in this session group's shared notes folder. `tools/read_validated.py` reads the `.request.json` next to each PDF.

### Why the rehearsal's three values came back empty (from the form's own scripts in its template)
| Field | Product wrote | Form's rule | Fix |
|---|---|---|---|
| Same as current country of residence? (`SameAsCORIndicator`) | Y | `validateCWA` empties a Yes when "country where applying" holds anything. The field is required, so Validate fails | **Product:** `engine/form-values.ts` `sameAsLeavesRowEmpty`. When a "Same as" field is written Yes, the rows of its own fact are left empty, and the reason is given in words. `tests/check_forms_b99_same_as.ts` has a pass test and a fail test; the test fails without the rule |
| Residential address same as mailing? (`SameAsMailingIndicator`) | Y | `validateResidentialAddress` does the same when the residential rows hold anything | Same rule |
| Most at ease (`languages.lov`) | 01 | `validateLanguageSection` keeps it only when "able to communicate" is Both (`enableField(false)` sets it to null). It is not required, so it does not fail Validate | **Sample:** left unanswered, because the family speaks English |

**Stored copies are no longer blank.** `api/src/sample-case.ts` now:
* saves `samples/sample-family-imm5257.json` through the officer's own steps;
* adds a job row per person;
* sets "none apply" on the other empty groups;
* confirms every section;
* and only **then** generates the copies.

Client A's copy now has 63 values written, where it had 0.

**Against E1's passed file (67 values):** 62 fields carry the same values. Only E1 has the five boxes below. Only the copy has `CanadaUS` 0.

#1125's Minor 2 does not apply: the checkpoint's status question lists all nine choices, and Citizen is written as 01.

## Question for the tech lead
**Validate will stop at three mandatory boxes the release has no question for.** It happens on all four copies:
* Taiwan passport Yes/No
* Israel passport Yes/No
* research-contact consent

The product's own list says "no question asks it yet, nothing in this release fills it". Background 1A and 6 are also empty, but they are not mandatory.

**Recommendation:** in Acrobat, before Validate, a person ticks **No** on all five (Sample, as E1 did). The read-back then records them as values Adobe holds that the product did not write. Adding questions for them would change release 1, so they go to the hardening list (P-358), not this row. If you'd rather not, say so and I'll hold.

**Test copies:**
* A stray server from my first test copy is still on :4453 (database `xr_studio_b99s`). The sandbox refuses `kill` from this session. Please stop it, or leave it for `tools/prune-test-dbs.sh`.
* Keep `b99t` on :4454 running: the upload door needs its copy ids.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
