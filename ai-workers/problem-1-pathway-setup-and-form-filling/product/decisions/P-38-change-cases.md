# P-38 — What happens when forms change: every case, and what AI re-runs

Adopted 21 Oct 2026 from the founder's flow (R-46): a person changes the forms of a combination; the system works out what is needed; AI runs only where something changed.

## Principle
* **A person makes the change, in the combination** (upload, replace, remove). The product never fetches forms itself (P-32).
* **Deterministic first, AI only for the difference.** Form code, edition and checksum are read without AI; editions are compared box by box without AI; AI is called only for boxes and passages that are new or changed.
* **Box maps belong to the form edition in the library, not to a combination.** A form used by 120 combinations is analysed once; combinations point to it.
* **Replace, never delete-and-lose.** "Remove, then upload the same form code" is recognised as a new edition and treated as a replacement. The old edition stays for open cases pinned to their release.
* Nothing changes until a person accepts the proposals and the pack is released.

## The cases
| # | What the person does | What the system does (no AI) | What AI does | Scope |
|---|---|---|---|---|
| 1 | Uploads the first forms for a new combination | Identifies each form; finds which are already in the library with box maps | Maps only forms not yet mapped; proposes reuse / new / ambiguous for every field, section, document, rule; drafts requirement lines from the checklist | This combination |
| 2 | Adds one more form to an existing combination | Identifies it; reuses its library box map if one exists | Maps the new form only if unmapped; proposes only fields not already in the library; adds requirement lines | This combination |
| 3 | Uploads a new edition of a form (replace) | Compares old and new editions box by box: unchanged boxes carry their mapping over; lists added, removed and reworded boxes | Maps only added and reworded boxes; checks whether removed boxes leave fields, sections or rules unused; proposes updates | The form once, then every combination using it, by reference |
| 4 | Removes a form from a combination | Removes its requirement lines; flags fields no longer used anywhere (kept, marked unused) | None | This combination |
| 5 | Uploads a new checklist or guide | Compares with the previous one | Re-reads the changed passages; proposes requirement-line changes | This combination |
| 6 | Changes a library item's meaning (P-34) | Lists every section, rule, form box and combination using it | Suggests updates where wording or rules depend on it | All users of the item |
| 7 | Uploads an identical file | "Already in the library" | None | — |

## Shown to people
Each affected combination appears in Programs "Needs you" with the reason ("New edition of IMM 5476: review impact"); the form shows a badge in the library; the impact review lists unchanged (carried over), changed and new boxes, and every combination affected.
