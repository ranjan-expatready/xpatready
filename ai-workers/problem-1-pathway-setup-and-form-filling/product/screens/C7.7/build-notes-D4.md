# D4 (BACKLOG; P-229 (3), #357 m3): a worked-out Yes over the client's No is a check to the officer

* **Rule:** `engine/runtime/case.ts` `caseView`, officer view only. For each person whose "has any children" is worked out as Yes (the case holds a child: `hasChildrenOf`), when that person's own stored answer is **No**, one check is added: id `derived.person.has_children.overrides_no`, severity warning, on that person, with no section.
* **The words:** "<Name>'s answer to "Whether the person has any children (natural, adopted or step)" is No, but a child is on this case, so the forms say Yes. Check with the client before filing. This note stays while the child is on the case: the forms take the Yes from the case, so there is no answer to change (a step-child counts as a child of the family: Unconfirmed, waiting for the immigration expert)." The question's words are the library's meaning, without its internal note on how the value is worked out.
* **Where it shows:** the officer's case page, the person's tab, as a "Check" notice (existing `AgentView` rendering of section-less checks, `questionnaire.tsx`). Never in the client's questionnaire. Screenshot: `screenshots/D4-derived-yes-check-1280.png`.
* **No check when:** the answer is Yes or missing, no child is on the case (the No stands), or the view is the client's.
* **Not changed:** the derived Yes still fills the forms (C7.7); the check asks the officer to confirm with the client. Step-children stay Unconfirmed (#357 m4, the immigration expert).
* **Tests:**
  * `check_case_engine` has 6 new lines (pass; fail for Yes or no answer, no child and the client's view; the spouse's own check; severity "warn", never blocking filing): 69/69;
  * `check_vv_prepare_api` has 1 end-to-end line (none before the child, one after, none for the client): 38/38.

## Review (0d5589a4): Approve, 8.5/10, and the minors fixed
1. **The note could not be closed** (EXPERIENCE §2.5): it now says that it stays while the child is on the case, and why (the forms take the Yes from the case). It no longer points to an action the app has no screen for.
2. **The spouse path had no test:** a line for a spouse who answered No.
3. **Severity:** now "warn", as every other check (it never blocks filing: `blocksFiling` reads `section_check` only).
4. **The form's own words for the question**, from the library's meaning.
* For information (C7.7, approved there): the API still accepts a `PUT` of has_children on a person for whom the question is hidden.

## Devin on #501 (head 42d48907), both fixed
1. **The note said "<Name> answered No"** even when staff entered the No: the words no longer say who gave the answer ("<Name>'s answer to … is No").
2. **"Unconfirmed, the immigration expert confirms"** could read as confirmed: now "Unconfirmed, waiting for the immigration expert". Which children count is an immigration value (AGENTS.md rule 4: official source or the immigration expert), not a legal point, so not "no counsel".
* The screenshot `screenshots/D4-derived-yes-check-1280.png` shows the words before this change (same place, same notice).
