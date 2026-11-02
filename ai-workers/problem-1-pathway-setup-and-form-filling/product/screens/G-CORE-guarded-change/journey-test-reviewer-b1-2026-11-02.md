# Journey test: G-CORE B1, the rules check and preview (reviewer, 2 Nov 2026)

Commit: **b5f5180d** against 74bbb717. B1 has no screen: the panel "What this change touches" comes in B2. The journeys were walked through `POST /api/change-sets/check` on the isolated copy `forms_gcore_rv` (:4457, forms ports; never :4400), with the sample loaded and rows planted by SQL where a state was needed. US$0, no model call. The findings are in `review-b1.md`.

## Journeys (persona · goal · steps · expected → got)
1. **Main path, author.** "Rename Family name to Last name: what does it touch, and who has to agree?"
   * Steps: check `rename person.family_name → "Last name (Sample)"`.
   * Expected: ok, before → after in names, sections, forms, rules, combinations, releases, open cases per release, and the tier "second person (P-266)" because a release carries the field.
   * Got: all of that. The open case created in setup shows as `release: 1, cases: 1`. **Held.**
2. **Alternate, author, a name another field already has.**
   * Expected: refused in today's words.
   * Got: R3 "is already the name of … in this group. If they mean the same, merge them". **Held**, for a field with one version.
3. **Alternate, author, the same name, but the other field has a draft rename over a published row.**
   * Expected: refused, as `PATCH …/name` does (409).
   * Got: **ok: true** (Major 1).
4. **Alternate, reviewer, a merge whose rewritten rule would ask one fact for two values.**
   * Expected: refused with R5 and where it happens.
   * Got: refused when the rule has one version. With a draft over a published rule: **ok: true** (Major 2).
5. **Alternate, reviewer, a merge that makes a question decide itself.**
   * Expected: R8 "Questions decide each other in a loop".
   * Got: **ok: true**. The same condition set directly is refused with R8 (Major 3).
6. **Empty and malformed:** `items: []`, a rename with no key, a tree that is a string.
   * Got: 400 Problem Details with field errors, and R1 "The condition is empty or not a condition". **Held.**
7. **Held path:** a field or document type made by hand.
   * Got: 410 with where items come from (P-251, P-252 (3)). **Held.**
8. **Wrong role:** no actor, and a case officer (`user-O`).
   * Got: 401, and 403 "works on cases; the configuration is read in the Product Studio". **Held.**
9. **Recovery and repeat:** the same check twice, then after a no-op row update.
   * Got: the same fingerprint twice. **After the no-op update the fingerprint changed** (m1), which would be a false "look again" in B2.
10. **Across the boundary (to B2's confirm):**
    * The tier words say who acts next: "Waits for a second person to approve.", plus "The immigration expert signs it at release" when the expert does.
    * For a person's question condition, that expert line is **not** true at release review today (Major 5).

## Data underneath
* After every check, the counts of `change_set`, `canonical_field`, `logical_section` and `library_change` did not change (suite and probes). The check writes nothing.
* Roles are enforced on the server (`readerOf`). There is no audit line, as expected, because nothing is written.

## Break it
* A 5,000-character name gets "Keep the name under 80 characters". A Chinese name passes R1 (`\p{L}`). "<script>…</script>" as a title is accepted as text; there is no HTML output in B1.
* A tree 4,000 levels deep (76 kB) answers 200 in 0.76 s, and the server stays up.
* Two renames in different groups to one name are refused as "given twice", though each alone passes (m5).
* A 50-item set answers in about 0.25 s.

## Score

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Renames and the preview work. Merge anomalies are missed on draft rows and for loops (journeys 4–5) |
| Next step obvious | ½ | R3 and R4 say what to do, but the chain refusal advises an impossible step (m6) |
| Plain words | ½ | Mostly names. A condition's before → after is JSON with codes, and merge R4 messages print keys (m11) |
| Feedback and state | 1 | `ok`, the problems per item and rule, the tier in words and the "Not checked" line are always returned |
| Correct data | ½ | Writes nothing (verified). Passes a never-true merge and a weaker duplicate (Majors 1–2) |
| Error recovery | 1 | 400 Problem Details, 410 for held paths, 401 and 403 by role |
| Accessibility and screen sizes | ½ | No screen in B1. Not walkable |
| Speed | 1 | 45–120 ms for one item, about 250 ms for 50 |
| Visual quality | ½ | No screen in B1 |
| Trust and sources | ½ | The expert claim is wrong for question conditions (Major 5). The fingerprint is unstable (m1) |

**6.5/10, below the pass line** (8 or more, with no criterion at 0). Fixes that raise it, most valuable first:
1. Read the current version in the merge rewrite and run R8 on merges (task completed, correct data).
2. Make R3 keep today's version scope (correct data).
3. Give the expert words per target, and sort the preview lists before the fingerprint (trust).
4. Use names in the condition preview and the merge messages, and correct the chain advice (plain words, next step).

Could not test: a browser walk, keyboard use, 1024 px and 200 % zoom (no UI until B2), and a real screen reader. D17/D20 stay with the founder.

## Re-score on a21393c2
I walked journeys 1–10 again through the API on a fresh isolated copy, with the same planted rows.
* Journeys 3, 4 and 5 now refuse, with R3, R5 and R8, in names and with where each problem is.
* Journey 9 keeps the same fingerprint after a no-op row update.
* Journey 10: a person's question condition no longer claims the expert step.
* The break-it probe of two renames in different groups to one name now passes.
* A condition's before → after now reads in words ("Always asked" → "Applying For Pgwp is true").

| Criterion | Was | Now | Evidence |
|---|---|---|---|
| Task completed | ½ | 1 | Renames, merges (draft rows, loops) and question conditions are all checked |
| Next step obvious | ½ | 1 | The chain message says what is followed. R3 and R4 say what to do |
| Plain words | ½ | 1 | Condition words and merge messages use names |
| Correct data | ½ | 1 | The review probes give the expected answers. Nothing is written |
| Trust and sources | ½ | 1 | The expert step follows today's release diff. The fingerprint is canonical |
| Feedback · errors · speed | 1 · 1 · 1 | unchanged | 0.10–0.22 s per check |
| Accessibility · visual quality | ½ · ½ | unchanged | No screen in B1 |

**8.5/10, pass** (8 or more, no 0). To raise the two halves: walk B2's panel at 1024 px and 200 % zoom with the keyboard only, and run axe on it.
