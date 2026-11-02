# UX-A part 4 review, round 3: the condition editor keeps what is typed and offers calculated values by name (commit d487119a)

Reviewer agent (did not build it), 2 Nov 2026.

**Scope.** `git diff 9cd221d9 d487119a`: `conditions.tsx`, the new `GET /library/derived` (`main.ts`, `studio.ts` `derivedValues`) and `check_uxa4_details_browser.cjs`. It fixes the breaker's round-2 R2-M1 ("Email address" typed key by key became "Emailaddress") and R2-M2 (calculated values had no name).

**How it was run.**
* The exact commit, in the detached worktree `/home/user/uxa2-rev`. Its web build (`index-CPTbw8E5.js`, 18:41) calls `/library/derived`.
* `isolated.sh rev_uxa4 4448`, fresh database, `demo/load` as user-A. I never touched the breaker's copy on :4471, and never used :4400.
* US$0. Nothing was saved: the condition editor was used in local state only, and the `canonical_field` count was unchanged.
* The check overwrites committed screenshots. I copied the `uxa4-*` shots to `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/r3/` and restored them with `git checkout`. The only file I changed is this one.

## Verdict: Approve
No Blocker or Major. Two Minors (r3-n1 and r3-n2) can go in the PR's Minors.

## What holds
* **Builder's check:** `check_uxa4_details_browser.cjs` passed **42/42, twice**. That includes the new R2-M1 step (typed key by key, the box keeps exactly what was typed) and the two R2-M2 steps (calculated values offered by name, and no warning when one is chosen).
* **Keystroke walk** (`keyboard.type`, 10–25 ms per key, then Tab away). The box keeps exactly what was typed, while typing and after blur, and resolves it:
  * "Email address" → "E-mail address · text". "Email" is a separate field → "The person's e-mail address · text"; the fact that "Email" is the start of another name no longer swaps the text.
  * "Marital status" → its meaning.
  * "Age years (calculated)" and "Passport days until expiry (calculated)" → "Calculated: …" with the plain words.
  * Typing the key `person.age_years` shows "Age years (calculated)" after blur.
  * "zzz" warns that it "is not a library field or a calculated value yet …".
  * axe is clean, and there were no console errors.
* **`GET /library/derived`** carries `@ConfigRead()` and returns 401 with no actor. It lists the workspace's 22 calculated values with their `plain` words, read from the database.
* **The `typing` state is keyed by row index** and cleared on blur. Removing a row means clicking its remove button, which blurs the box first, so a stale entry cannot move to another row.

## Minors (fix, or list in the PR)
* **r3-n1. The value-box hint for a calculated value is a guess from its key.**
  * The regex at `conditions.tsx:55` (`/days|age|years|months|count|number/`) matches "count" inside "country". So "Applying country differs from citizenship (calculated)", which is true or false, gets a "number" hint. Before this diff it got "value".
  * "Residence differs from citizenship" (true or false) and "Venezuelan extended passport expiry" (a date) get a text box.
  * `derived_field` has no type column, so this cannot be read from the data today.
  * Fix: match whole words (`/(^|_)(days|age|years|months|count|number)(_|$)/`), or have `/library/derived` return a type taken from `calculation`. Choosing yes/no for a calculated value was not possible before either.
* **r3-n2. A retired field's key shows as words, but the warning text does not say "retired".**
  * `shownField` (`conditions.tsx:79`) renders the key in words, but the warning is the general "not a library field or a calculated value yet … release waits until the fact is added" message.
  * The comment above it says "its warning says what it is". Only the server's check (`studio.ts` `conditionErrors`) says "a retired field: restore it …".
  * Fix: a retired branch in the warning, or let the server's error text stand alone.

## For the Lead (not from this diff)
* **"Add a comparison" does nothing in the builder.** It appends an empty row, and `build` drops rows with no field, so no second row ever appears. The code is the same at base 86f88a9c (`conditions.tsx` `build`). A second comparison can only be added through the JSON view. This is worth a follow-up row for whoever owns conditions.

## Journey (reviewer, round 3; the rest is unchanged from round 2)
| Journey | Result |
|---|---|
| Author: "show this question only when Email address is answered", typed key by key | Holds. Exact text, field found. |
| Author: "only when the person's age is over 18" | Holds. "Age years (calculated)" from the list, a number hint, and its meaning shown. |
| Author: types an unknown word | Holds. Clear warning; the draft would still save. |

The score stays at **9.5 / 10, Pass**. r3-n1 is a hint, not a wrong value saved.

**Could not test:**
* Two fields with the same name (the demo has none).
* A retired field in a saved condition (that would need a save).
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
