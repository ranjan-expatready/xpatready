# Review SH3-M1 (commit 11b4637d1): render.ts takes each_applicant and the filing from the resolver

Refactor, no UI, no concept. No journey test (no screen); journey score: n/a.

## 1. Equivalence
- `"case"` to `FILING`: FILING is "case" (contracts/resolver.ts), so all literal swaps (ageGate, label, form rule, keepAnswered, question subject, checks, people list) are identical.
- `applicants`: old `people.filter(applies && role !== "representative").map(id)` equals the first lines of `subjectsFor(people, "each_applicant")` (same filter and map, same order, no subjectKind). Equivalent.
- Rule subjects: old `kind === "CASE" ? ["case"] : subjectsFor(people, for_whom, k)` where k is undefined for EACH_APPLICANT/EACH_PERSON, else kind. New passes k straight in. For kind CASE, k = "CASE" and `subjectsFor` returns [FILING] first, before the `who` switch, so same result for every for_whom, including unknown ones. DOCUMENT, unknown or undefined kinds were never CASE and take the same path as before. No difference found.

## 2. Missed copies
None that can move without a behaviour change. In render.ts the only remaining people filters are the checks line (everyone who applies, representative included; deferred (a), correctly left) and the pass-through to the resolver. grep of render.ts, people.ts, fact-sources.ts and form-lines.ts finds no `"case"` literal and no `role !== "representative"` copy. The contract comment edit is accurate.

## 3. Guard
Sound: no false pass on the current file (it passes), and the failing-case line proves both patterns fire. Minor, not blocking:
- `/"case"/` also fails on any future `"case"` in render.ts, including in a comment or a user-facing string. Over-strict, but the message names the cause.
- The copy regex only matches the exact `x.applies && x.role !== "representative"` shape. A reordered, `!=`, or `ROLE.representative` variant would slip past. Acceptable as a tripwire.

## Tests run (at 11b4637d1)
check_sh3_resolver 65/65, check_line_holders 19/19, check_vv_checklist 60/60. No server started.

Verdict: Approve (no Blocker, no Major; two Minor guard notes above).
