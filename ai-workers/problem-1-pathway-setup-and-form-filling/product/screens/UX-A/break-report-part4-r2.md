# UX-A part 4: break report, round 2 (commit 35f7349e)

Breaker, 2 Nov 2026. Fix under test: `git diff cb85bd7e 35f7349e` (M1, M2, M3 and m5 of `break-report-part4.md`).
Setup: an isolated copy `brk_uxa4` on :4471, with the demo sample freshly loaded and the web build of 35f7349e.
Spend was US$0. I made no draft start, no priced click and no `*_LIVE` change.

What I changed in that copy, and only there:
- one rename, `case.service_language` to "Email", to get two fields with one name;
- saved placement drafts on Citizenship, through the field page.

The builder's `check_uxa4_details_browser.cjs` passes 37/37 on my copy, with its screenshots sent to scratch.

## Breaks

**R2-M1 (Major): typing a field's full name by hand turns it into a different, unknown field.**
Steps:
1. Open Citizenship › Condition on the question › "Show only when…".
2. In Field, type "Email address" one key at a time.

Expected: the box keeps "Email address" and the condition stores `person.email_address`.
Actual:
- The box shows "Emailaddress" and the condition stores the field "Emailaddress".
- The editor says '"Emailaddress" is not a library field yet … The draft saves; release waits …'.
- The server answers "reads Emailaddress, which is not in the library".
- "Criminal history details" becomes "Criminal historydetails", and "Military service country" becomes "Military servicecountry".

Why: once the text typed so far matches a whole name ("Email", "Criminal history"), `keyOf` swaps it for that field's key. The box then shows that name again, trimmed, so the space just typed is lost.
- This hits 16 of the 164 sample fields: Email address, Mailing address ×7, Criminal history details, Military service ×6, Representative category other.
- Picking from the suggestion list (simulated with `fill`) and pasting both work. I could not drive the browser's suggestion pop-up by keyboard in headless Chromium.

Where: `web/src/components/conditions.tsx:72` (`keyOf`) and `:93` (controlled `value={shownField(r.field)}`). Before the fix, keys had no spaces, so this could not happen.

**R2-M2 (Major): a derived value such as age can only be written as its key, and it is shown as one.**
Steps: in the same editor, type "age", as the note "derived values such as age are allowed" invites.

Expected: the derived value can be chosen by name, as library fields now are.
Actual:
- The derived values (`derived_field`: `person.age_years`, `person.passport_days_until_expiry`, …) are not offered in the suggestions.
- "age" is stored as written, and the server says "reads age, which is not in the library", so release waits for good.
- Typing the key `person.age_years` works: the server's check finds no error. The box then shows the raw `person.age_years` on the main path, and the note under it wrongly says '"person.age_years" is not a library field yet … release waits until the fact is added'.
- So the only working way to write an age condition is to type a key, and the editor then misdescribes it.

Where: `conditions.tsx:71` (`shownField` falls back to the key) and the warning line under it. The editor gets library fields only: `library.tsx:154` passes `fields.list`. The Questionnaires rules editor uses the same component.

**r2-m3 (Minor): two fields with one name.**
After the rename, the suggestions list "Email (case)" and "Email (person)", which is good. But:
- the bare name "Email" is stored as written, and the editor calls it "not a library field yet", when the real problem is that two fields share the name;
- the brackets name the field's group (case, person), not whom it is about as the code comment says ("Date of birth (spouse)"). Two fields in one group cannot share a name, because rename refuses it, so this holds for now.

**r2-m4 (Minor, from the code): a condition that reads a retired field shows its key.**
The editor's list leaves retired fields out (`useLibraryFields().list`). An existing condition that reads one therefore shows the raw key and is called "not a library field yet". I could not build this case: every sample field is in use, so none could be retired quickly.

**r2-m5 (Minor): a form field path is still on the field page.**
The Format panel's "From" column prints the form field path for a form field with no label. On Residence status other details it reads `IMM 1295 (09-2023), "Row2[0].Other[0]" (the PDF form field)`. Since m5 moved this same path under Details in "Form fields that read it", the page now hides it in one place and prints it in another (`library.tsx` Format table, `x.box`).

**r2-m6 (Minor, outside this item's screens): the M2 mislabel is still on four other AI start panels.**
The same `remaining_usd`, which is the smaller of the cap's room and Wave 1's, is named as the cap's room on:
- Draft setup: "Experiment cap US$120: US$60.00 left" (`components/ai-launch.tsx:97`);
- questionnaire drafting: "inside the AI spending cap (US$60.00 left)" (`components/qd-draft.tsx:113`);
- pre-qualification drafting, same words (`components/pqr-draft.tsx:97`);
- Questionnaires' people draft, same words (`pages/workspace/questionnaires.tsx:283`).

The server's refusal text says "what is left of the experiment cap" (`api/src/ai.ts:279`), already listed as m10. The new word "this round's AI budget" appears only in this dialog. The cost warning says "Wave 1" and "Wave limit", so there are three names for one limit.

## What held
**The money-left line.** It now reads "US$60.00 left in this round's AI budget (US$120.00 before the AI spending cap)." With US$0 spent, that is true.
- `spendLeftWords` names the limit that sets the figure.
- At the edges I traced in the code: a tie names the cap; spend past the cap gives "US$0.00 left before the AI spending cap"; an overspent round gives US$0.00 left in the round's budget with the cap's room in brackets.
- Details reads "US$0.00 of the US$120.00 AI spending cap (the experiment cap) · this round's budget (Wave 1): US$0.00 of US$60.00", followed by "AI model (Live): claude-opus-5-5" and the job.
- None of these are on the main path. The saved-answer names ("· cost US$0.33") are distinct for IMM 5707's five runs.

**M1.** I checked 164 of 164 field pages: "Where it comes from" is in words ("From the reviewed work-permit release · proposed by AI"), and the hash, run files and person ids are only under Details.
The remaining hits on the main path are:
- keys inside rule text (m4, already known);
- the form's own quoted number limits ("6000000 … A9999999");
- r2-m5.

**M3 (the parts that work).**
- No key appears as a suggestion value: all 164 suggestions are names.
- The placeholder reads "field, e.g. Marital status", and the box is no longer monospaced.
- Typing "Marital status", "marital status" or the key `person.marital_status` all store `person.marital_status` and show "Marital status".
- A partial name ("Marit"), "État civil" and a 300-character string are kept as typed and flagged.
- "Email (person)" and "Email (case)" each store the right key.

**Edit as JSON round trip.** The JSON shows keys; that is the expert path. JSON with two keys goes back to the simple editor as "Email address" and "Email (case)".

**Saving a placement condition.** The request carries keys. After a reload the condition shows by name. The stored draft holds `person.email_address` and `case.service_language`.

**m5.** The tooltip is gone, and the path sits under a row Details.

## Verdict
Not ready.
- The money-left line and M1 are fixed.
- The condition editor's move to names brings two new Major breaks:
  - typing a full name by hand corrupts 16 fields (R2-M1);
  - derived values have no name and show their key with a false warning (R2-M2).
- Fix both, each with a fail test: typing "Email address" and "Criminal history details" key by key, and choosing an age condition.
- List r2-m3 to r2-m6 in the PR.
