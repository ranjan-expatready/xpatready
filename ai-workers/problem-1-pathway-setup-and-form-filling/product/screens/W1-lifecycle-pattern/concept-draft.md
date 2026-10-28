# W1-lifecycle-pattern — one way to edit, delete, retire and restore (concept draft, 28 Oct)

Draft by the screen-designer for the Lead. Founder's ask (28 Oct): industry practice for every delete, remove and edit on masters and reusable parts, one message set, the same everywhere. Board: `design/draft-lifecycle.html` (1440 px; rule table, components in every state, 3 worked examples, the audit). Marks: **[F]** follows a decision · **[M]** missing, Lead settles (recommendation given) · **[C]** two sources conflict. Every Sample value is labelled; no immigration value is new here.

## 1. Job and journey
Content publisher (author) and second person (approver) change any master safely: see where it is used, act, and know what stays. Activities 3.1, 3.4, 4.4, 5.1, 10.1; SA-1B-38..40; capabilities C11.9, C3.7, C3.13, C3.15, C4.9, C9.1, C6.1 (retired combination refuses a case). Not a new screen: a shared mechanism every screen uses (P-116 "one shared mechanism") [F].

## 2. Industry practice, in short (sources by name only)
| Pattern | Who does it | Our rule |
|---|---|---|
| "Where is this used" before acting | Salesforce fields and picklists, HubSpot property "Used in", Sanity references | Where used opens before every action, grouped "stops this" vs "kept" [F] P-116 |
| Hard delete only when unused | Contentful content types, Jira workflows and schemes, Stripe products with no prices | Delete = never released and used nowhere [F] P-52 L1 |
| Archive/retire when used: hidden from new use, kept for existing records, restorable | Stripe archived prices, Shopify archived products, Salesforce inactive picklist values, ServiceNow Active flag | Retire / Restore [F] P-52 L2, L4 |
| Soft delete + time-boxed bin | Salesforce Deleted Fields (15 days), Jira trash (60), HubSpot (90), Linear (30) | Not built: we delete only what nothing ever used; the Activity line stays (P-52 L1) |
| Undo instead of "Are you sure?" | Gmail, Linear, Nielsen heuristic 3, Raskin "never use a warning when you mean undo" | Undo toast on every reversible step; confirm only where it costs something [M2] |
| Blocking message says why and links each use | Jira "used by N projects", Contentful "linked in N entries", Salesforce dependency list | "Can't delete: used by 3 combinations" + list + links [F] P-52 L3 |
| Replace on delete (pick the substitute) | Salesforce picklist replace, Jira status/priority replace, Linear label merge | Form editions only (Replace edition); for other masters Not built (P-52) → Q3 |
| Safe edits in place; meaning edits make a version; live config frozen | Stripe (price amount immutable: new price), Salesforce Flow versions, Jira draft workflow, Contentful field ID fixed | Wording direct; meaning = new version + impact + second person; releases frozen, cases pinned [F] P-34 §4, P-96, P-97, STANDARDS §3.7 |
| Remove vs Delete as two words | Carbon, PatternFly, Salesforce Lightning content guides | "Remove from …" takes it out of one place; "Delete" ends it [F] P-123, P-128 (3) |
| Second person, audit trail | ServiceNow change approval, Salesforce Setup Audit Trail | Different person approves (server); one History line per step [F] P-52 L4, P-79 |
| Check again at commit (a use added after the preview) | optimistic locking, ETag/If-Match | Approval re-checks; "Changed since it was proposed" [F] built in `lifecycle.ts checkApprove` |
| Bulk actions with a preview | Jira bulk change, Salesforce mass delete | Not built (P-26); bulk accept of AI proposals stays (P-121) |

## 3. The pattern
**Words (one set, PRODUCT §4 candidate):** **Delete** ends an item that was never released and is used nowhere. **Remove from <place>** takes a line out of one combination, section or questionnaire; the item stays in the library. **Retire** hides a released item from pickers, AI and new setups; releases and open cases keep it. **Restore** brings a retired item back. **Withdraw** the author takes back their own waiting change. **Replace edition** a newer IRCC edition takes over through impact review; the earlier one is kept. Not used: Archive, Deactivate, Disable, Trash, Discard, and "Remove" alone [F] P-128 (3) [C1].
**States (calculated, never set by hand):** A never released, used nowhere · B never released, used by a draft · C released, no current use (only earlier releases and open cases keep it) · D released and used by a current draft or latest release · E retired · F a change waiting. "Used" = P-52 list (section placement, field map, condition, check, document line, form line, structure child, combination).

| State | Edit wording | Edit meaning | Delete | Retire | Restore |
|---|---|---|---|---|---|
| A | direct, versioned | direct (still a draft) | **Allowed** → second person (Q1) | greyed: "Never released: delete it instead" | — |
| B | direct | new draft version, impact list | **Blocked**: "Can't delete: used by 2 drafts" + list | greyed (never released) | — |
| C | direct; firms see it at each next release | new version + impact + second person | **Blocked**: "Released items are kept. Retire it instead." | **Allowed** → second person | — |
| D | as C | as C | Blocked | **Blocked**: "Can't retire yet: 2 current setups use it" + list | — |
| E | read-only: "Restore it to change it" | read-only | never | — | **Allowed** → second person; blocked while the level above is retired |
| F | the waiting action greyed: "A change is waiting for a second person" | as left | author sees **Withdraw** | | |
**Remove from** works in every state of the line's combination: a draft change with Undo, approved inside that combination's one review and release [F] P-76, P-116. **Reorder** applies at once with a History line [F] Lead 26 Oct.
**Exceptions:** a combination's own releases do not stop its retire; retiring a Live one stops new cases, open cases keep their release [F] addendum A2. A combination row retires its name and combination in one approval [F] challenge #1 (Lead decides). A Pathway or Program deletes as a whole branch only when nothing in it is used, with the exact list approved [F] P-128 (3), challenge #2. An approved official form file is never deleted [F] P-51, P-116.
**While a Delete or Retire waits,** pickers show the item "Being retired" and refuse new uses (built for forms only) [M3]. **When it takes effect:** Delete at approval (built); Retire and Restore with the next release (built) → Q2.
**Edit rules:** (1) Wording (name, help text, tooltip, order): direct, versioned, exact-duplicate check, shows in setup at once, firms see it at each combination's next release, open cases keep their words [F] P-96, BR-6. (2) Meaning (answer type, answer list, subject, filled by, split, merge, a check's condition, a document type's rules, a form's edition): new version; impact preview names every section, rule, form field and combination; second person on To review; drafts take it on approval, released combinations at their next release [F] P-34 §4, P-97. (3) Identity (system name, form number, Pathway type) never edited: add new and retire the old. (4) Releases are frozen; cases pin theirs [F] STANDARDS §3.7.
**Four standard messages** (exact copy on the board): Delete confirm · Can't delete · Retire confirm · Can't retire yet; plus Restore confirm, "Changed since it was proposed", "Changed meanwhile: Reload". No rule codes such as "(L3)" on screen [F] PRODUCT §4 [C2].
**Shared components** (web `components/lifecycle/`, API `lifecycle.ts` one guard): RowAction (Edit + one written action from the state; greyed with the reason as visible text, not tooltip only) · WherePanel (stops / kept / waiting, counts say what they count, each use links) · ImpactPanel (right panel, never a centred modal for a reason field: TEAM-PATTERNS) · BlockedLine · UndoToast (10 s; Undo = Withdraw with "Undone at once") [M2] · ReviewCard (approver: Approve / Return; author: Waiting + Withdraw; re-check result) · Show retired switch · History.

## 4. Audit of today (main c541347; forms branch 26b1c40; screens branch bdcf23e)
| Item | Edit | Delete / Remove | Retire · Restore | Where used | Gap against the pattern |
|---|---|---|---|---|---|
| Pathway type | fixed two | none | none | counts on tabs | none (read-only by design) |
| Pathway, Program, Category, Sub-category | rename, versioned, duplicate check | "Remove" (should be Delete), second person, applied at approval; no branch delete | yes, second person, at release | panel, links, kept vs blocks | word; "(L1)/(L3)/(L6)" in messages; reason only in tooltip; branch delete; QA-52 message |
| Combination | setup edits | API only | API only; Live leaf refused on Structure | API `combinations/:id/uses` (no reader check) | no page (QA-48); one action per row (challenge #1) |
| Field | meaning, type direct, new draft version | none | `PATCH retire:true`: no where-used check, no second person, no Restore | drawer: form fields, placements, conditions, documents | breaks P-52 L3/L4, P-34 §4, P-96 (S6 M8) |
| Section | none | none | none | "Used by combinations" count | no lifecycle, no list of uses |
| Document type | none (made silently from a line) | none | none | none | no lifecycle, silent create (P-53 break) |
| Check · Rule (per combination) | dialog | "Remove", no confirm, no Undo | — | Checks list Not built (C3.14) | word, Undo |
| Form (library) · checklist · guide | What IRCC accepts (second person) | forms branch: Delete when unused, second person | forms branch: Retire / Restore, "Being retired" lock | releases, drafts, source files, held files | ⋯ menu, not a written row action; greyed Delete without reason; not on main |
| Form edition | Replace edition (canada.ca check) | never (approved file) | — | impact lists combinations | open cases and releases on the old edition not named; C9.1 Not built on main |
| Form line on a combination | who files, when | main: "Remove from combination", no confirm or Undo; forms branch: Remove + Undo | — | — | Undo only on forms branch |
| Document line · section in questionnaire · question placement | dialog | "Remove", "Remove from questionnaire": at once, no Undo | — | — | Undo, words |
| "Who can be in this application" row | inline | trash icon, no confirm | — | — | no case count; Undo |
| Release | frozen | none | none | cases pin it | none (by design) |
| Case-facing | — | runtime "remove a row" with History | retired combination refuses a new case (plain) | — | none |
| To review cards | — | "Remove the …" | Withdraw needs a reason | snapshot only | words; re-check shown only on failure |

## 5. Who fixes what
**screens:** the shared components and guard kinds `field`, `section`, `document_type`, `check` (S6), Structure rows (Delete word, combination row, branch delete, Show retired), To review and approval wording. **forms:** form library on the shared components (written row action, greyed reasons), edition "kept by" line, merge S4 first (it already extends `lifecycle.ts`). **runtime:** S5 line removes (form, document, rule, section, person role) with Undo and words. **qa:** regexes that say "Remove structure name" (challenge #3), pass and fail per BR. **Lead:** word set into PRODUCT §4, Q1–Q3 into DECISIONS.

## 6. Business rules, contract and tests
BR-1 Delete only state A [P-52 L1] · BR-2 Retire only C (and a Live combination) [L2, L3, A2] · BR-3 Restore only E, not under a retired parent [L4] · BR-4 author ≠ approver, server-side [L4, STANDARDS §6] · BR-5 approval re-checks uses and refuses on change [built] · BR-6 meaning edit = version + second person [P-34 §4, P-96, P-97] · BR-7 Remove from = draft change, Undo, released with the combination [P-76] · BR-8 approved form file never deleted [P-51] · BR-9 one word set, no rule codes on screen [P-128, PRODUCT §4].
Contract: one `GET /lifecycle/:kind/:key/uses` → `UsesView` (exists per kind; add the reader check on combinations), `DELETE|POST …/retire|/restore` per kind (exist for structure, combination, library form), `POST /library/changes/:id/withdraw` (exists). Tests: a pass and a fail per BR; keyboard (Delete key or Shift+F10 opens the row action), axe on each component state, 1024 and 200 % zoom.

## 7. Capability or scaffolding
**Capability, Needed for the proof:** RowAction, WherePanel, ImpactPanel, BlockedLine, UndoToast, ReviewCard, Show retired, History, the guard and its kinds, Replace edition. **Scaffolding:** "Acting as" switch to play the second person, Load sample, Reset. **Not built (team, P-26):** bulk lifecycle, Replace with… for non-form masters (Q3), deleted-items bin, move (P-116), release rollback, translations. Legal: how long retired items and case records must be kept — Unconfirmed: no counsel.

## 8. Questions for the founder (recommendation first)
1. **Delete your own never-approved draft item at once, with Undo** (recommended: nothing reached a second person or firms; the History line stays; Linear, Contentful) — or keep a second person for every delete (P-52 L4, today).
2. **Retire and Restore of a library item take effect at approval; a combination or a name firms see still waits for its release** (recommended: the guard already proves no current setup uses it, and "next release" for an unused field confuses people, QA-52) — or every retire waits for a release (today).
3. **Keep "Replace with…" (swap every draft use to a substitute in one step) Not built for fields, sections and document types** (recommended for the proof: the block lists each use with a link; form editions already have Replace) — or build it now (Salesforce, Jira).
Lead settles: [C1] "Remove" in code vs Delete (P-128) → Delete for masters, "Remove from …" for lines. [C2] rule codes in messages → plain words. [M2] Undo toast without a reason. [M3] "Being retired" lock on every master.

## Definition of Ready
- [ ] Board agreed by the founder (`design/draft-lifecycle.html`)
- [x] Every element labelled Capability or Scaffolding and Needed or Not built
- [x] Data and API needs known (guard kinds to add; one uses route per kind)
- [ ] Every decision relied on agreed: Q1–Q3 open; C1, C2, M2, M3 for the Lead
- [ ] No open questions

## Founder picks (28 Oct) — Agreed (P-116 amended)
Q1 **own never-approved draft: delete at once with Undo** · Q2 **library retire at approval; structure names and combinations at release** · Q3 **Replace with… not now**. Lead: C1 Delete for masters, "Remove from …" for lines; C2 plain words, no rule codes; M2 Undo toast as drawn; M3 "Being retired" lock on every master. Word set in PRODUCT §4. Lanes per §5.
