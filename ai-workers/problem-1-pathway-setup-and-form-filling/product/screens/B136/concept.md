# C6.14 One document for the whole application: concept r2 (runtime lane, 9 Nov)

**Status:** r2: takes in the fresh challenge's three Majors and six Minors (`challenge.md`, its Lead response); for the tech lead's approval (P-223 (4)). Read on main fc49dc5a4.
**Capability:** C6.14, row B136 (P-406). Sources: SA-1B-151 (who provides a document), SA-1B-214 (shared documents with providers), AG-7-15 r1 (knock-ons). Uses C3.16's scopes: a line "once for the application" is the Filing scope, "once for the couple" the Household scope.
**Not a new screen.** One panel on the library's document type, one row on a shared checklist line, one small dialog. One migration (two additive columns on two tables). Values are **Sample**; legal points Unconfirmed: no counsel.

## 1. Job, and what is true on main today
* **Job:** the author says once, per document type, who normally provides it when it serves the whole application (a marriage certificate, a sponsor's proof of funds). A case then shows that document **once**, names its providers among the case's people, and the case officer can change them with a reason.
* **Today (measured on a fresh copy, Demo › Load the configured checkpoint, port 4431):**
  * Visitor visa's release has "Marriage certificate copy" with whose document `couple_once` (conditional); the LMIA work permit has two `couple_once` lines. `case` ("the application, once") exists as a choice; no release line uses it yet.
  * `engine/runtime/case-checklist.ts` already puts a `couple_once` line once, on the spouse's list, and a `case` line once, on the principal's. Nothing says **who provides it**: `provided_by` is "client" on every line. So the marriage certificate reads as the spouse's alone.
  * `DocumentType` has no provider field; `ChecklistLine` has no providers.

## 2. Business rules
* **BR-1 Default provider roles on the type** (SA-1B-151 r1, §7 `defaultProviderRoles`). An ordered list of person-role keys from the workspace's roles that take part in a case (the representative excluded: source kind client; parent excluded: never on a case). Empty = not set. No repeats. **A library change (challenge M1, P-253):** the author proposes the whole list with a reason (403 others); a second person approves on To review (never the proposer); at approval the type gets a draft version; it goes out with each combination's next release; an approved change not yet released can be withdrawn by its proposer. One open change per type (409). A retired type refuses (409). A release whose types carry no roles is byte-identical to today (the snapshot adds the key only when the list is not empty).
* **BR-2 Shared lines** (SA-1B-214 r1; C3.16 scopes; the team's `ONCE_FOR_APPLICATION` is our `case` and `couple_once`, its `providers[].personId` our `providers[].subject`). A line whose "whose document" is `case` (Filing) or `couple_once` (Household) is one item for the application: it stays once, on the list it is on today (principal for `case`, spouse for `couple_once`), and carries `providers`. A per-person line (`each_applicant` and the rest) never gets providers, even if its type has roles: the line's shape decides, not the type. Limit (challenge m1): a `case` line is once per case (on the principal's list), not once per filing as SA-1B-215 r2 says; no release uses `case` yet.
* **BR-3 Matching** (SA-1B-151 r1, SA-1B-214 r1). Each role in order is matched among **all** the people on the case by their role, including a person not applying or not on that filing (SA1B-D73(a)): on Visitor visa each person files their own application, and the principal provides the marriage certificate that sits on the spouse's filing.
* **BR-4 Nobody under 18 provides** (SA-1B-151 r3, SA-1B-214 r5, SA-1B-75 r4; challenge M2). Age on the day the checklist is read (UTC), not the application date. A person whose age cannot be worked out (no valid date of birth) cannot be checked, so is not named (AG-7-15 r6: "can't check" is never a pass); the line says why.
* **BR-5 Fallback** (SA-1B-151 r1, r3). No roles set, or nobody left: the provider is the filing's first applicant, which on this slice is the person whose list carries the line. The line says which rule chose ("Default from the document type" or "No provider role matched: the person the item is for provides it").
* **BR-6 The officer changes providers with a reason** (SA-1B-214 r2, SA-1B-151 §10 "Person decides"; BACKLOG B136). One or more people on the case, each 18 or over (BR-4), no repeats, a reason of 3-500 characters; `version` as C6.4's other actions (409 when stale). Stored on the item's `checklist_line` row; audited "providers changed: <roles> on <document> for case <id>". A per-person line refuses (422). Clearing the change ("Use the defaults") also needs a reason. A stored provider who leaves the case, or whose corrected birth date shows under 18, is dropped on read and named; if none remain, the defaults apply and the line says so. A line still waiting for an answer has no stored row yet, so no providers to change: 404 "No such checklist line." (as C6.4's other actions; the screen offers no action there; pack C6.14-24b).
* **BR-7 Named stand-ins (P-33).** Uploads still land on the item's holder, as C6.5 stores them; "Received from <person>" per provider (SA-1B-214 r3) and "Already on file from <person>'s filing" (r6) are **Not built** here (AG-09 is the team's; a follow-up row). The line override of the type's roles (SA-1B-151 r2, open Q3-7) is **Not built**. Approval once (r4) is C6.4's existing single state.

## 3. Layout and copy (1440 px, the team's brand; patterns of C4.5's supplies panel and C6.4's line)
* **Combination › Documents tab › a line's drawer › "Who provides it when shared"** (next to the substitute sets): the ordered roles, whether this line is asked once, and for the author an editor with Up / Down / Remove, "Add a role", a reason and "Send for a second person". **To review › the change:** before → after in words. Help: "Used only on a line asked once for the application or once for the couple. Nobody under 18 provides; if no one matches, the person the item is for provides it." Read-only words for the approver.
* **Case › Documents (C6.4's checklist), a shared line:** under the label, "Shared · once for the couple · Provided by Sample Client A and Sample Spouse A" with the rule in small text, and a "Change providers" button (officer only). The dialog lists the case's people with a checkbox each (under-18s disabled, "under 18"), a reason box, Save and Use the defaults. Errors in the dialog, in words.

## 4. Best in class
Evidence read from primary sources, with quotes and dates: `best-in-class-sources-2026-11-09.md` (this folder). Nothing is claimed here for a product whose page was not opened. What the screen does to save effort and prevent errors: the document is asked once, not once per partner (one request fewer per extra person, SA-1B-214 §12); providers are filled from the type's roles, so the officer types nothing; each provider carries the rule that chose them; a minor can never be chosen, in the dialog or by the API.

## 5. Contract
* `GET /api/library/document-types/:key/providers` → `{ key, name, roles: [{ key, label }], choices, uses, open, help }`.
* `POST /api/library/document-types/:key/providers` `{ roles: string[], reason }` → the waiting change; 400 unknown role / repeats / no reason, 403, 404, 409 nothing changes, already waiting or retired. Approve, return, withdraw: the library change routes (`/library/changes/:id/…`).
* The checklist's people gain `may_provide: { ok, why }` (BR-4 today, for the dialog).
* `GET /api/runtime/cases/:id/checklist`: a shared line gains `shared: "application" | "couple"`, `providers: [{ subject, label, role, why }]`, `providers_rule: "type_roles" | "first_applicant" | "changed"`, `providers_words`, `providers_change: { reason, by, at } | null`. Other lines: `shared: null`, `providers: []` (additive).
* `POST /api/runtime/checklist-lines/:id/providers` `{ providers: string[] | null, reason, version }` → the line; 400, 403, 404, 409, 422.

## 6. Tests (one pass and one fail per rule; engine `tests/runtime/check_c614_providers.ts`, pack `acceptance/C6.14.test.ts` on the checkpoint)
* BR-1: author sets [principal, spouse_or_partner] on "Marriage certificate copy" (pass); approver 403, unknown role 400, repeats 400, stale 409 (fail); unchanged release fingerprint with none set.
* BR-2: the marriage certificate is on one list only, with two providers (pass); the passport stays one line per person with no providers though its type has roles (fail case).
* BR-3: the principal, not on the spouse's filing, is named (pass); a sponsor role on a case with no sponsor matches nobody (fail → BR-5).
* BR-4: a 16-year-old child with role child listed is skipped (fail), an 18-year-old is named (pass).
* BR-5: no roles → the holder provides, words say so (pass); roles matching nobody → the holder (pass), never empty (fail check).
* BR-6: officer changes to the principal alone with a reason (pass, audited); no reason 400, a minor 400, a non-case person 400, client 403, stale 409, a per-person line 422 (fail).

## 7. Questions for the tech lead (recommendation first)
1. ~~Library change path~~: settled by the challenge (M1): a second person approves.
2. "Received from <person>" per provider: **follow-up row with C6.5 (recommended)**, or in this PR (needs a third column on `case_document`).
3. For the founder (challenge, recommendation first): when nobody matches, **the filing's first applicant provides (built)**, or the principal applicant (SA-1B-151 §1 wording). On Visitor visa they differ for a `couple_once` line.

## Definition of ready
Acceptance pack `acceptance/C6.14.test.ts` (new, this PR); row text BACKLOG B136; decisions P-406, P-425 (no combination key in engine code: the rule reads the line's "whose document" and the type's roles, never `vv.single`).
