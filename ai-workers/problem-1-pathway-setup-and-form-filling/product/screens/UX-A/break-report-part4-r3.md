# UX-A part 4: break report, round 3 (commit d487119a)

Breaker, 2 Nov 2026. Fix under test: `git diff 9cd221d9 d487119a` (`web/src/components/conditions.tsx`, `GET /library/derived`).
Setup: an isolated copy `brk_uxa4` on :4471, restarted on this commit, with the demo sample freshly loaded and the web build of d487119a. I stopped the copy at the end.
Spend was US$0. No draft start, no priced click, no `*_LIVE` change.
Nothing was saved: every editor was opened, typed in and cancelled, and my walks sent no write requests. The only POSTs were the editor's own `/conditions/check` calls, plus three I sent by hand to that endpoint, which changes nothing.
I did not rerun the builder's test this round.

## Breaks

**R3-M1 (Major): clearing a field box to retype it removes that comparison, and the next typing lands on another one.**
Steps:
1. Open With an LMIA › Forms › Change IMM 5409. Its "Only if" holds two comparisons: Marital status is `common_law`, and Accompanies subject to canada is `true`.
2. Click the first Field box, select all, press Backspace.
3. Type "Citizenship", then Tab.

Expected: the first comparison becomes Citizenship, and the second stays as it was.
Actual:
- After step 2, the first comparison is gone. One box is left: it shows "" but stands for "Accompanies subject to canada" (the condition now holds only `relationship.accompanies_subject_to_canada`).
- After step 3, that comparison becomes the condition `{"subjectKind":"SPOUSE","op":"eq","field":"person.citizenship","value":"true"}`.
- Both original comparisons are lost. The left-over value `true` sits under Citizenship, so the condition can never be true and IMM 5409 would never apply.
- The server check accepts it (`errors: []`), and Save would write it.
- The same thing happens on the field page with three comparisons: clearing row 0 and typing "Citizenship" turns [Marital status, Age years (calculated), Email] into [Citizenship, Email], and the age comparison is gone.

Why:
- `build()` drops every row whose field is empty (`conditions.tsx`, `rs.filter((r) => r.field)`), so the rows after it move up one place.
- The new while-typing text is stored by row position (`typing[i]`). Box 0 keeps showing the typed "" while it now stands for the next row.

Dropping the row is older code. Before this fix, though, box 0 at once showed the next row's name. Now the box looks empty, and the next keys overwrite that other comparison without any sign.
This affects every editor that uses the component: Forms tab line conditions, Questionnaires rules and document conditions, and a field's placement condition.

**R3-M2 (Major, existed before part 4 and not caused by d487119a): "Add a comparison" does nothing.**
Steps: in any simple editor with one comparison, click "Add a comparison".
Expected: a second, empty row.
Actual: still one row. The added empty row is filtered out by the same `rs.filter((r) => r.field)`, so the value never changes.
A second comparison can only be made through Edit as JSON. The button has done nothing since at least 86f88a9c.
Listed for the lead: it is not this item's regression. Fix it together with R3-M1, since both come from that one filter.

**r3-m3 (Minor): seven of the 22 calculated values are offered but never worked out.**
`derived_field.executable` is `false` for:
- `case.applying_country_differs_from_citizenship`
- `case.spouse_or_partner_count`
- `person.employment_history_gap_months`
- `person.passport_years_since_expiry`
- `person.residence_differs_from_citizenship`
- `person.venezuelan_extended_passport_expiry`
- `relationship.cohabitation_years`

The engine skips these values (`engine/render.ts:35`), so a condition on one always comes out "cannot tell". The server check and the release gate both accept them (`studio.ts:670`, which uses the same derived set). The editor offers them like the others, with only "Calculated: …" and no word that they are not worked out yet.

**r3-m4 (Minor): calculated values get the wrong answer box.**
The type is guessed from the key (`/days|age|years|months|count|number/`). So:
- the two yes/no values (… differs from citizenship) get a free-text Value box, and a typed "yes" is stored as the text "yes", never as the yes/no value `true`;
- the date value (… extended passport expiry) gets text, not a date picker.

The server's check does not look at the value's type, so these pass too. Names read awkwardly: "Age years (calculated)".

**r3-m5 (Minor): a key the editor does not know is shown as words.**
Typing `person.foo_bar` and leaving the box shows "Foo bar", with '"Foo bar" is not a library field or a calculated value yet', while the condition stores `person.foo_bar`. For a retired field, this note says to add the fact from Questionnaires, but the server's error says to restore the field in Fields (`studio.ts:670`), so the two advise different things.

## What held

**Typing key by key.** All 16 names from round 2 typed key by key keep exactly the typed text, store the right key and keep it after Tab: Email address, Mailing address ×7, Criminal history details, Military service ×6 and Representative category other (`representative.representative_category_other`).

**Backspacing.**
- Deleting "Email address" back to "Email" stores `person.email` while the box is still focused and after Tab.
- "Crim", then Tab, then refocusing and finishing "…inal history details" ends on `person.criminal_history_details`.

**Removing a row while typing.** Typing in row 1 and then removing row 0 keeps row 1's typed text.

**Calculated values.**
- `GET /library/derived` lists 22 of them.
- "Age years (calculated)" stores `person.age_years`, shows "Calculated: The person's age in whole years…" and gets a number box.
- Plain "age" is flagged, not guessed.
- The server check gives `errors: []` for `person.age_years`.

**Edit as JSON round trip.** Three keys in JSON come back as "Marital status", "Age years (calculated)" and "Email". Nested conditions (R-01 and IMM 5707's age rule) stay in JSON, showing keys, which is the expert path.

**Questionnaires rules editor.** R-03 and R-04 show names; typing "Email address" there stores `person.email_address`.

**Forms tab line panels.** IMM 5409 and IMM 5476 show names. "Mailing address postal code" typed key by key there stores `person.mailing_address_postal_code` and keeps its text after Tab.

**Picking from the suggestion list** (simulated with `fill`) works as before.

## Verdict
Not ready.
- R2-M1 (typing key by key) and R2-M2 (calculated values by name) are fixed.
- But the while-typing text now stored by row position turns an old row-dropping habit into R3-M1: clearing a box to retype it silently deletes that comparison and rewrites another. On the Forms tab this can leave a form's "Only if" impossible to meet, and Save would write it.
- Fix R3-M1, with a fail test (clear and retype the first comparison of IMM 5409, then check both comparisons). Fix R3-M2 with it, since both come from the same filter.
- List r3-m3 to r3-m5 in the PR.
