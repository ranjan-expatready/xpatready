# Review C11.14-near (QA-159 retest) — commit 4ad9e25f4, base 8eead4d39

Verdict: **Approve** (no Blocker, no Major; 3 Minors)

Journey score (reviewer): 8/10. After Reset to the six, the three QA-159 pairs are named on the later item (person.email_address ~ person.email, person.citizenship_country ~ person.citizenship, person.given_names ~ person.given_name). 466 of 560 items carry no near, 94 do.

## (1) False positives at scale (isolated copy, Reset to six, 560 items, 493 distinct field labels)
Old vs new rule over all field keys and meanings: 338 -> 397 near pairs counted from both sides. The added pairs are few (about 12 distinct): given_name/given_names family (plural and contained), email/email_address, citizenship/citizenship_country, uci/uci_number, organisation.name/employer_name. Common one-word fields (name, address, sex, phone, date) do not flood: cross-group one-word names are blocked (oneWord:false), same-group one-word keys are rare.
Wrong ones:
- person.subject_of_citizenship_revocation ~ person.citizenship (near.ts:34): a yes/no about revocation is not the citizenship field. False positive, makes that item Check.
- person.given_name_at_permanent_residence and person.other_given_name ~ person.given_names: a longer name holding a one-word name after singular(). The second is arguably right, the first is a different field.
- organisation.name ~ organisation.employer_name: same group, plausible but weak.
All are reviewable (the person gives a reason, R3), not blocking.

## (2) singular() and order of reasons
Checked by reading: countries->country, addresses->address, names->name, address/status/boxes ok. "series"->"sery", "news"->"new" are wrong but no real key hits them. Order meaning > plural > order > contained is right. sameOrder compares singularised words in the same order but different raw text, so "Name of family"/"Family name" stay "order" (correct). Pre-existing quirk: "Date of birth" vs "Date birth" returns "another order" for identical word lists (stop words removed). Not new.

## (3) Pass and fail cases
Present for each: one-word contained (pass, key and name), plural (pass), single shared word between longer names (fail), address/status not plural (fail), cross-group one-word (fail) plus same group (pass). The "Statu" case is contrived but harmless. No test for the false positives above.

## (4) Dependencies on NEAR_WHY texts
Only api/src/library-changes.ts:11,92 uses isRuleWhy, via Object.values(NEAR_WHY), so the new "plural" value counts as a rule reason automatically (given:false). No other api/src or web/src code matches the literal texts. Safe.

## Issues
- Minor: near.ts:34 one-word containment flags subject_of_citizenship_revocation ~ citizenship. Fix later by also requiring the one word to be the head word (first or last) or leaving such pairs to meaning.
- Minor: given_name_at_permanent_residence ~ given_names (same cause).
- Minor: add a fail test for the above once decided.

Not checked: UI rendering of the queue, only the engine and stored identity.near.
