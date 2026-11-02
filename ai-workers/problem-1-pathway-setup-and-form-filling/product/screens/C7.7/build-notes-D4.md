# D4 (BACKLOG; P-229 (3), #357 m3): a worked-out Yes over the client's No is a check to the officer

* **Rule:** `engine/runtime/case.ts` `caseView`, officer view only. For each person whose "has any children" is worked out as Yes (the case holds a child: `hasChildrenOf`), when that person's own stored answer is **No**, one check is added: id `derived.person.has_children.overrides_no`, severity warning, on that person, with no section.
* **The words:** "<Name> answered No to "has any children", but a child is on this case, so the forms say Yes. Check with the client before filing (a step-child counts as a child of the family: Unconfirmed, the immigration expert confirms)."
* **Where it shows:** the officer's case page, the person's tab, as a "Check" notice (existing `AgentView` rendering of section-less checks, `questionnaire.tsx`). Never in the client's questionnaire. Screenshot: `screenshots/D4-derived-yes-check-1280.png`.
* **No check when:** the answer is Yes or missing, no child is on the case (the No stands), or the view is the client's.
* **Not changed:** the derived Yes still fills the forms (C7.7); the check asks the officer to confirm with the client. Step-children stay Unconfirmed (#357 m4, the immigration expert).
* **Tests:**
  * `check_case_engine` has 4 new lines (pass, and fail for Yes or no answer, no child, the client's view): 67/67;
  * `check_vv_prepare_api` has 1 end-to-end line (none before the child, one after, none for the client): 38/38.
