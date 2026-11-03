# V1 follow-up — draft capabilities for the gaps (3 Nov 2026)

For the tech lead to approve (P-291 (1); asked by Lead 2 on 3 Nov). These are **drafts**, not capabilities: nothing here edits `qa/CAPABILITIES.md`, `BACKLOG.md`, `DECISIONS.md` or `STATE.md`. Read-only, US$0, Sonnet drafters checked by the V1 tester. The gaps come from `V1-completeness.md` (tables G1 and G2).

**What this covers**
* **Every M2 gap (29).** 21 are closed by a draft below: D-1 to D-7, D-20 to D-27, and D-49, which also closes the cross-person part of SA-1B-195. That includes 3 records gaps, D-28 to D-30: built and tested, only missing from the capability list. The other 8 need a product decision first and are in "Needs the founder", with no text.
* **The top 10 M3 gaps**, as D-40 to D-49, chosen for impact on M3's goal (the Visitor visa and the six combinations end to end) and for being foundations the others need. The remaining M3 gaps are listed at the end with the reason each waits.
* **Each draft has:** the capability in plain words; milestone; what it extends; the decisions it rests on, quoted; a numbered "Done when" that a test can check at US$0, with a passing and a failing case; what it leaves out (held parts of P-251, later parts, the team's parts); and where its values come from.
* Every immigration value in a test is **Sample** unless a source is cited. Legal points: **Unconfirmed: no counsel**. Sizes are guesses.

## The drafts at a glance (build order within each milestone)

| Draft | What a person can do | Closes | M | Size | Needs first |
|---|---|---|---|---|---|
| D-1 | The content publisher defines, fills (by hand or a CSV or JSON upload with preview), approves and retires a reference table, with no developer | SA-1B-190, 191 (part) | M2 | M | — (R2's fee table ships first, unchanged) |
| D-2 | The immigration expert confirms a large table's source file once, then only what changed | SA-1B-295, 191 rule 3 | M2 | M | D-1 |
| D-3 | Table versions with in-force dates, a lookup for a named date, old-to-new code maps | SA-1B-192 | M2 | M | D-1, R2 |
| D-4 | A condition compares an answer with a table value, or tests "is in a table"; a missing entry is "can't check", never zero | SA-1B-195 rules 1–3, 6 | M2 | M | D-1, D-3 |
| D-5 | Field groups (address, job…) defined once, as one set or a list, with tags and "driven by" | SA-1B-6, 10 (definition) | M2 | M | founder item 4 |
| D-6 | Form lines and rules ask for "the current address" or "the latest job" by purpose; a missing one is shown, never guessed | SA-1B-11 | M2 | M | D-5 |
| D-7 | A list is asked once per person; the other adult can follow ("Same as") or copy the current address | SA-1B-10 rules 3–4 | M3 | M | D-5, D-6, founder item 4 |
| D-20 | Named sets of acceptable documents ("any one of" or "all of", in order, with when each is acceptable); a line picks a set | SA-1B-19 (part), 20 | M2 | M | — |
| D-21 | A document type says which dates it captures; the case records them at upload, confirmed on accept, never defaulted | SA-1B-153 | M2 | M | — |
| D-22 | Upload size limit and file-name pattern per document type (warns, never blocks) | SA-1B-106 | M2 | S | — |
| D-23 | Past-review list, a release warning, and a preview of the weekly content-team digest (nothing sent: the team's) | SA-1B-40 | M2 | S–M | — |
| D-24 | Completeness view for the country, each count opening its list, calculated on open | SA-1B-92 | M2 | M | D-23 |
| D-25 | Retire a published release, with a reason, after seeing the open cases pinned to it; nothing new uses it | SA-1B-301 (studio part) | M2 | M | tech lead word point 1 |
| D-26 | Named line sets that many combinations include, with the affected combinations listed before approval, and Detach | SA-1B-210 | M2 | L | G-CORE where-used |
| D-27 | Export a form's field map as CSV and re-import it, all or nothing, with a preview | SA-1-31 | M2 | S–M | — |
| D-28 | (Built) the left menu in setup order, with To review's count | P-04 | M2 | built | — |
| D-29 | (Built) the shared-draft line on every page, with one way to release | P-58 | M2 | built | — |
| D-30 | (Built) Stand-in chips match the register, kept equal by a check | P-165 | M2 | built | — |
| D-40 | One target filing date per case; every fee is read for the date in force, "as at" shown; no value means "can't check", never zero | SA-1B-251, 252 | M3 | M | R2, S3 |
| D-41 | A document type says how its end date is known and what it must outlive; the case warns, for example passport before the requested end of stay | SA-1B-21, 22, 156 | M3 | L | D-21, D-40 |
| D-42 | A resolved checklist item keeps its identity: approvals, "not applicable" and uploads survive; each re-work lists what changed | SA-1B-217, BR-18 | M3 | M | SH3 (on main) |
| D-43 | "What changes for this case" before an open case moves to a newer release; one-click move that keeps what was decided | SA-1B-254 | M3 | L | D-42, founder item 9 |
| D-44 | An open case on a retired release shows a warning and moves in one click | SA-1B-257 | M3 | S | D-25, D-43 |
| D-45 | The client says "I don't have this" and picks an alternative; the officer sees "Alternative used" | SA-1B-152 | M3 | M | D-20, D-42 |
| D-46 | A document needed once with several providers, approved once, reused when already on file | SA-1B-214 | M3 | M | D-42, D-41; tech lead point 3 |
| D-47 | Review items per programme on the representative's checklist, ticked before filing, never blocking | SA-1B-221 | M3 | M | founder item 10 |
| D-48 | A library form added to one filing: mapped fills, unmapped gives the blank official PDF | SA-1B-177 | M3 | M | — |
| D-49 | A condition reads the principal's occupation level through an approved short list; withdrawing a filing warns the filings that depend on it | SA-1B-219, 195 rules 4–5 | M3 | L | SH3 (on main) |

## Needs the founder (no text until decided; each with a recommendation)
1. **Scoring content** (SA-1B-197, 200, and the scoring parts of 196, 199 and 204). Does the POC author points grids, language conversions, caps and Canada's scoring content (CRS, federal skilled worker, provincial calculators), and in which milestone?
   * No decision settles it. P-164 (1) and stand-in SI-2 leave score grids with the team's AG-03. P-271 and BR-29 make the assessment the team's. P-251 holds the assessment area. P-236 limits our case check to gates with three outcomes. P-70 puts all of SA-01B in scope.
   * **Recommend:** the team keeps scoring for the POC, and we keep gates (C6.9) and the answer-key runner (C5.7). Revisit one thin slice after the product owner rules. This saves a size-L build plus paid AI and expert signing.
2. **"Copy on emails"** (SA-1B-107, 108, 110: the group, a section on every individual combination, a release check). No decision sets the milestone; email itself is the team's (P-167).
   * **Recommend:** later (M4), recorded for the team to read once their copy list exists. Nothing in the POC uses the answer, so building it now adds a section and a check with nothing visible to show. Saves about a builder-day.
3. **Change watch** (SA-1B-299, 300). This conflicts with P-65, whose table line 7 allows "an optional listing alert … never download", and sits uneasily with P-103 (the system downloads forms after a person approves). AGENTS rule 2 sends it to the founder.
   * **Recommend:** a listing alert only. A person records a source page and its review date, and a To review item appears when the date passes, with no fetching and no automatic draft. D-23 already gives the review-date list, so this costs almost nothing.
4. **Field groups, lists and purposes inside the P-251 hold?** (D-5, D-6, D-7.) The held list names guarded Add and L-SA6 to L-SA10, but P-251 words the hold as whole areas (the product owner's "C2" and "C3").
   * **Recommend:** not held for D-5 and D-6 (B1 is already M2 and S9 is done). Ask the product owner before D-7, because it touches the family link and the held household-scope design.
5. **Text per language** (SA-1-42, B20). Release 1 is English only (SA-01 SA-1-44), translator tooling is Release 2 (SA1B-D102), and P-34 says translations are not built.
   * **Recommend:** record it as Release 2, keeping every text in one place so French can be added later.
6. **The "Ask" co-pilot panel** (P-159, B47). Its backlog milestone "W2" maps to no M-milestone. Step 1 needs live AI; step 2 overlaps the guarded pipeline and the held C2 area.
   * **Recommend:** M3, step 1 only (explain and find), after G-CORE. Test at US$0 with saved answers, live only on a Go with its cost. Step 2 waits for P-251.
7. **Workspace snapshots** (P-160, B48). Also "W2". It overlaps G-CORE's versioned release with roll-back (P-253).
   * **Recommend:** fold it into G-CORE as one added check: an automatic named copy before release and reset. Drop it as a separate capability; saves a medium item.
8. **AI-drafted table entries and spreadsheet upload** (SA-1B-191 rules 2 and 6). One needs paid AI, the other a new library through the STANDARDS §1 gate.
   * **Recommend:** CSV and JSON only, entries by hand or upload. Revisit AI drafting once tables exist, on a Go.
9. **Moving an open case to a newer release** (D-43, D-44): ours as a stand-in (SI-11), or the team's adoption (P-169 puts "firm adoption and roll-back" with the team)?
   * **Recommend:** ours as a stand-in, per case, with the pin staying on the case. The finished-story demo (C10.2) needs it; the team's screen replaces ours later.
10. **The stored representative review** (who, when, "Self-reviewed", ticks) for D-47, built ahead of L-SA3's held ready-to-file warnings?
    * **Recommend:** yes, with nothing wired into "Ready to file". P-155 (1) is not held; L-SA3 later only reads the record.
11. **Milestone and owner without a decision**, from the V1 report (questions 2 and 3):
    * government steps and deadlines (B11), "Still true?" (B13) and country-specific requirements (B14), which are M4 only by proposal;
    * the firm overlay, scale work and migration import, which are the team's only by a standards line.
    * **Recommend:** one decision line each, as written in V1.

## For the tech lead (not product decisions)
1. **Words.**
   * SA-1B-301 says "Withdraw a version", but P-116 reserves "Withdraw" on screen for cancelling a waiting delete or retire. P-116's "Retire" ("hidden from new use; open cases and releases keep it") is exactly the meaning wanted, so D-25 and D-44 say **"Retire a release"**.
   * D-49 keeps **"withdraw a filing"**, because withdrawing an application is IRCC's own word; it clashes with P-116's on-screen sense.
   * Please confirm both, or pick other words.
2. **D-28 to D-30 are built.** Approve them as capabilities, or fold D-28 into C11.16 and D-29 into C5.3. Their "Done when" names only existing tests.
3. **D-46 needs two document-line fields not drafted here:** "needed once for the application" and default provider roles. They are the uncovered parts of SA-1B-57 and SA-1B-151, which V1 scored "part". Draft them with D-20 or as a small M2 item.
4. **No case has a target filing date today.** Only an answered application date and a hidden "today" exist (S3). D-40 adds the date; D-41 and the existing age checks then read it.

---

# Part 1 — M2 drafts

### D-1. Define, fill, upload and retire a reference table in the console, with no developer (closes SA-1B-190, SA-1B-191 except the file confirmation and the AI part)
* **Capability (persona: what they can do):** The author (content publisher) creates a reference table with a name, columns (text, number with a unit, date, yes/no, a choice from an answer list, a code that must exist in another table) and key columns; adds or corrects entries by hand or by uploading a CSV or JSON file with a preview of how many entries will be created, changed or refused before anything is saved; and a second person approves the table before it is released. A table that a gate, condition or fee reads cannot be retired until nobody reads it. (Code words: `ReferenceTable`, columns, `isKey`, upload job with created, updated, error counts, `lane` FILE or HAND_BUILT.)
* **Milestone:** M2 · **Extends:** C3.7 (retire blocked while in use), C3.13/C3.14 (where used), C5.4 (source entry gate) · **Backlog:** B17 (R2 independent, see above) · **Size guess:** M (guess)
* **Rests on:** SA-1B-190 "creates, changes and retires any reference table ... with no developer"; SA-1B-191 rules 1, 2, 5, 7; P-70 (all SA-01B in scope); P-240/P-279 (source-register gate stands); STANDARDS 3.1 "Content is data, never constants".
* **Done when** (US$0, no live AI, isolated copy):
  1. Given the author defines "Medical exam countries" (country: choice from the countries list, key; exam required: yes/no) and a different person approves it, then the table appears in a Reference tables list with its version, status and "where used: nothing yet"; a second table with the same key is refused "A table with this key already exists".
  2. Given a "Proof of funds" table (family size: whole number, key, at least 1; amount: money in CAD, at least 0; all values Sample), when an entry is added with text in the amount, then it is refused "amount must be a number"; a second entry for family size 3 is refused "Duplicate key: family size 3"; family size 0 is refused with the minimum in words.
  3. Given a CSV with 12 lines (10 new, 1 changed, 1 with a bad number), when it is uploaded, then the preview shows "10 create · 1 update · 1 error" and the bad line with its reason; committing saves nothing while any line fails (all or nothing); the same file with the bad line fixed saves 11 and shows a result report. A JSON file of the same content gives the same counts. A file with a column that the table does not have is refused before the preview.
  4. Given a published table, when the author changes a column's kind, then it happens only in a new draft version and submit is refused listing every entry that breaks the new kind; the published version is unchanged.
  5. Given a gate or condition reads "Proof of funds", when the author retires the table, then it is refused "Still read by: <the gate>" (the same where-used list the library shows); with no reader it retires and stays readable in old releases.
  6. Given an entry added by upload and another typed by hand, then each shows its origin (uploaded or by a person) and its source reference; releasing a table version that holds a number with neither a source-register entry nor "None published – set by ExpatReady" is refused naming the table (the existing source gate).
  7. Roles: a firm user and an author without the permission get 403 on every table write; the author who made a table version cannot approve it; a published table version cannot be edited, only replaced by a new draft.
* **Leaves out:** AI-drafted entries from a government page (paid AI, see "Needs the founder"); XLSX upload (no spreadsheet reader in the stack, STANDARDS section 1 gate, see "Needs the founder"); confirming a file once then only changes (D-2); dates and versions in force (D-3); fee amounts, fee basis and the fee table itself (R2); the Province time zones and Province sales-tax tables (read by the team's firm and billing modules, outside the POC); the five built-in domain types recreated as starter tables (the POC has none to move; the Language conversion and Wage starters wait for the founder's answer on scoring, and any starter is Sample); number-by-number confirmation of hand-built tables (SA-1B-294, its own capability).
* **Values:** all amounts and countries in tests are Sample. Legal points: Unconfirmed: no counsel.

### D-2. Confirm a large table's source file once, then only what changed (closes SA-1B-295 and SA-1B-191 rule 3)
* **Capability (persona: what they can do):** For a table marked "file" (a government file such as a language conversion or proof-of-funds list), the immigration expert sees automatic checks on first load (entry count equals the source's count, no duplicate keys, every value in range), checks a sample of entries beside the source, and confirms the file by name, version and date. When a new file arrives, the expert sees only the added, removed and changed entries, old beside new, and confirms those; unchanged entries keep their confirmation. A table marked "hand-built" never offers this flow. (Code words: `lane` FILE or HAND_BUILT, `sourceFile {name, version, date, sha256}`, `entryCount`, `sampleSize`, `changedEntries[]`.)
* **Milestone:** M2 · **Extends:** D-1 (new) and C5.4 (source entry) · **Backlog:** B17 · **Size guess:** M (guess)
* **Rests on:** SA-1B-295 "confirm the source file once. Every later update shows only the changed" (SA1B-D98); SA-1B-191 rules 3 and 5; P-240.
* **Done when:**
  1. Given a 12-entry Proof of funds file whose entries are unique and in range, when it is loaded, then the screen shows "12 of 12 · 0 duplicate keys · 0 out of range" and the file waits at "Sample check" (state Loaded, then Checks passed).
  2. Given the source states 13 entries but the file holds 12, then confirmation is refused with the difference ("The file has 12 entries; the source says 13"). Given a duplicate key, the check fails and lists the entries; the file cannot move on while a check fails.
  3. Given the sample is 25 entries or all of them when fewer (here all 12), when the expert marks each "Matches" or "Edit" and confirms, then the file is recorded with name, version, date and checksum, the expert's id and the time; confirming with an entry unmarked is refused "1 entry not checked".
  4. Given a new file that changes one entry (family size 3, Sample amounts), then exactly one entry shows old and new with the source; confirming it completes the update; the other 11 keep their confirmation. An entry missing from the new file shows as Removed and is confirmed as removed.
  5. Given a table marked hand-built, then no file confirmation is offered and the lane is shown on the table; changing a table's lane needs a new draft version.
  6. Roles and audit: only the author role confirms; the audit shows "table file confirmed" with table, file and who, and never any number; a firm user gets 403; nothing publishes by itself (a different person still approves the version, D-1).
* **Leaves out:** automatic acceptance of a file, and confirming every unchanged entry one by one (non-goals of the card); AI drafting of changed entries (paid AI, founder); the choice of sample size by the founder (card open question Q1-3; default 25 as written).
* **Values:** Sample amounts; no real government file is loaded in tests. Legal points: Unconfirmed: no counsel.

### D-3. Give every reference table versions with in-force dates, a lookup for a named date, and a map between old and new code systems (closes SA-1B-192)
* **Capability (persona: what they can do):** The author enters a table change that was announced in advance with its start date; it takes effect by itself for assessments on or after that date and stays "scheduled" before. Anyone reading a table value must name the date; the answer is the entry of the version in force on that date, or "can't check: no <table> version in force on <date>". The author sees what each new version added, removed or changed. When the authority replaces a code system (for example NOC 2021 by NOC 2026), the author adds an old-to-new mapping; a code with several new codes or none is shown as "needs a person". (Code words: `effectiveFrom`, `effectiveTo`, `entryDiff`, mapping table.)
* **Milestone:** M2 · **Extends:** D-1, C6.9 ("rules as at") · **Backlog:** B17, R2 (shares the dated-table idea, builds after R2's fee table) · **Size guess:** M (guess)
* **Rests on:** SA-1B-192 rules 1 to 5 and 7 (SA1B-D70, SA1B-D92(5), SA1B-D92(6)); P-251 (the move of open filings is held, see Leaves out); S3 "no hidden today".
* **Done when:**
  1. Given Proof of funds version 7 (Sample $22,000, in force from 1 Jun 2026) and version 8 (Sample $23,840, from 1 Dec 2026, entered 16 Nov), then a lookup for 20 Nov 2026 returns version 7's entry and a lookup for 2 Dec 2026 returns version 8's. A lookup with no date is refused "Name the date".
  2. Given two published versions both in force on 15 Jan, then publishing is blocked "overlap 1 Dec – 31 Dec"; a gap between versions is allowed; given no version covers 1 May 2026, the answer is "can't check: no Proof of funds version in force on 1 May 2026", never the nearest version.
  3. Given version 8 is approved before its start date, then it shows "Scheduled" and results before 1 Dec 2026 do not change; a version approved by its own maker is refused; the successor's start ends the previous version when no end is entered.
  4. Given version 8 differs from version 7, then it stores and shows added, removed and changed entries with old and new values (family size 3: 22,000 to 23,840) before it goes for approval.
  5. Given a code column names its code system and version ("NOC 2021 v1.0 – Sample"), when the author adds the new system and a mapping table, then a code with exactly one new code maps itself and a code with two new codes or none shows "needs a person" and is never mapped silently.
  6. Roles: author only writes; firm users read results only; published versions never change.
* **Leaves out:** the comparison for open filings and the "Use newer rules?" move (SA-1B-192 rule 6 and 8, SA-1B-253; needs the pin per filing design, held under P-251, and SA-1B-250); government fees read on the submission day (R2 and C6.12); pushed alerts (withdrawn, SA1B-D117); a global recompute at publish (SA1B-D94(5)).
* **Values:** Sample amounts and codes. Legal points: Unconfirmed: no counsel.

### D-4. A condition can compare an answer with a value from a reference table, or test that a value is in a table (closes SA-1B-195 rules 1 to 3 and 6)
* **Capability (persona: what they can do):** The author writes a gate or "only if" condition such as "funds are at least the Proof of funds amount where family size = the size of the family on the filing", or "country of residence is in Visa-required countries", by picking the table, the column and the key inputs. When the table has no entry for the key the condition says "can't check: no entry for family size 9 in Proof of funds"; it never counts as zero or as yes. The condition and the table's where-used list show each other. (Code words: `tableRef {tableKey, column, keyInputs}`.)
* **Milestone:** M2 (authoring and dry run; the case check C6.9 already evaluates conditions) · **Extends:** C3.14, C6.9, C4.4 · **Backlog:** B16 (the gate part only), B17 · **Size guess:** M (guess)
* **Rests on:** SA-1B-195 "compare an answer with a value taken from a reference table"; P-236 (three outcomes Qualifies, Can't tell yet, Does not qualify); SA-1B-192 rule 2 (the caller names the date); builds after D-1 and D-3.
* **Done when:**
  1. Given family size 3, Proof of funds amount $22,000 (Sample) and funds of $20,000, when the gate runs, then the result is "no – needs $22,000"; with funds of $23,000 it is yes.
  2. Given "country is in Visa-required countries" and a country that has an entry, then yes; one without an entry, no.
  3. Given no entry for family size 9, then "can't check: no entry for family size 9 in Proof of funds" and the case check says Can't tell yet, never Qualifies or Does not qualify on that gate alone.
  4. Given two table versions (D-3) and an as-at date of 20 Nov and of 2 Dec, then the condition reads version 7 and version 8 in turn; the result shows the date it used.
  5. Save is refused in plain words when the table, column or key input does not exist, when a text column is compared with "at least", or when the key input kind does not fit the key column; publishing is refused while the condition names a retired table.
  6. Where used: the table's where-used list names the gate; the condition shows the table and its version.
  7. Roles: only the author role saves a condition; no condition can change a table (no write path exists, a write attempt returns 405 or 403).
* **Leaves out:** points grids, conversions and pass marks that read tables (scoring, see "Needs the founder"); the operators "at least", "between" and "age on a date" themselves (SA-1B-194, another capability); reading another person's fact (D-8).
* **Values:** Sample table values. Legal points: Unconfirmed: no counsel.

### D-5. Define a group of fields that travel together once, with a list or single shape and tags (closes SA-1B-6, and SA-1B-10 rules 1, 2 and 5 on the definition side)
* **Capability (persona: what they can do):** The author defines a field group (address, job, education, travel) once: a key, whether it holds one set or a list of entries, the ordered shared fields that belong to it (each keeps its own checks), the tags its list entries may carry ("lives here now", "send post here"), and which member drives another (country drives the province list). A group needs one scope for all members. A second person approves it. (Code words: `FieldGroup {key, shape, scope, members[ {fieldKey, order, drivenBy?} ], tags[], sameAs}`; replaces the unusable COMPOSITE type.)
* **Milestone:** M2 · **Extends:** C3.5, C3.7, C3.13 (library lists), C4.4 (renderer groups) · **Backlog:** none yet (sibling of B1) · **Size guess:** M (guess)
* **Rests on:** SA-1B-6 "defines a group of fields that always travel together ... once"; SA-1B-10 rule 1; P-70. Old note in `screens/W1-shared-library/research-end-to-end-masters.md` ("Decided not built") predates P-70 and is superseded for SA-01B items. See the hold question in "Needs the founder".
* **Done when:**
  1. Given the author defines group `address` (list) with street, city, province, postal code, country, from date, to date (existing shared fields) and tags "lives here now" and "send post here", and a different person approves it, then the Field groups list shows it with its members, tags and where used.
  2. Given members whose scopes differ (person and filing), then save is refused "All fields in a group must have the same scope."; household and organisation scope are refused while held (P-251).
  3. Given `province` is driven by `country`, when Client A picks Canada in the preview, then the province choices are Canada's provinces and territories (Sample list); a driver that is not a member of the group, or a member driven by itself, is refused in words.
  4. Each member keeps its own check; "complete" means every required member has a value, so an address without a postal code is reported incomplete and names the member.
  5. Given a published group, when a member is removed, then a new group version is made and facts already recorded keep their members; a shared field used by a group cannot be retired ("Still used by group address").
  6. A group cannot contain a group, a group has no value of its own, and no new COMPOSITE field can be created (refused with the reason).
  7. Roles: author writes, a different person approves; firm users read only.
* **Leaves out:** AI drafting of groups from the forms and any guarded free-standing Add (held, C2, P-251/P-252); nested groups and group-level values (non-goals); moving existing questions off the old composite type (listed in the PR, done later); asking the group once per person at run time (D-7); entry identity fields (SA-1B-134, with C3.16).
* **Values:** field and tag names Sample. Legal points: Unconfirmed: no counsel.

### D-6. A form line or rule asks for "the current address" or "the latest job" by purpose, and a missing one is shown, not guessed (closes SA-1B-11)
* **Capability (persona: what they can do):** The author sets on a list group the purposes that can be asked of it: the entry tagged current, the entry tagged for post, all entries, the latest entry, or entries overlapping a date range, chosen from a fixed list and never typed as an expression. Form lines, rules and coverage checks name a purpose, never a section, so reorganising sections changes nothing. When a purpose returns nothing the form shows "Can't fill: no current address" and a check shows "Can't check: no current address". (Code words: `Purpose {key, groupKey, kind, tag?, dateRange?}`; the form-field list purpose and overflow built under F1-P become a choice from the group's purposes.)
* **Milestone:** M2 · **Extends:** F1-P (`SetListPurpose`, `check_forms_f1p.ts`), S9 · **Backlog:** B1, S9 · **Size guess:** M (guess)
* **Rests on:** SA-1B-11 rules 1 to 4 "Unknown is visible"; SA-1B-12; S9 (for post = mailing address, never the job applied for); depends on D-5.
* **Done when:**
  1. Given group `address` with the tag "lives here now" and Client B's made-up entry carrying it, then purpose `current_address` returns that entry; for `mailing_address` (tag "send post here") it returns the entry carrying that tag, not the job applied for.
  2. Given no entry carries the tag, then the filled form shows "Can't fill: no current address" and a rule reading it shows "Can't check: no current address"; the form is still produced (warn, never block) and the box is not guessed.
  3. Given two entries tagged current, then the one with the later start date wins and the warning "Two current addresses" is shown.
  4. Given a form line mapped to `current_address` and the section holding the address moved to a later position, then the same value fills the box.
  5. Kinds: "all" returns every entry, "latest" the entry with the latest start, "date range" the entries overlapping the stated range (a 10-year range returns an entry that ended 9 years ago and not one that ended 11 years ago).
  6. Publishing is refused when a form line or rule names a purpose that does not exist, or a purpose whose group is retired; a free-text purpose expression is refused.
  7. Overflow words stay as built (extra sheet or flag for the officer, never a silent cut); roles as D-5.
* **Leaves out:** whose fact it is (stays on the box-map entry or the condition, SA-1B-11 rule 3); tagging entries in the client's and officer's screens (D-7); coverage rules over purposes beyond the form and check readers that exist today.
* **Values:** Sample tags and entries. Legal points: Unconfirmed: no counsel.

### D-7. An address (or any list) is asked once per person with dates and tags, and the other adult can follow or copy the current address (closes SA-1B-10 rules 3 and 4)
* **Capability (persona: what they can do):** Client A and Client B answer a list such as addresses once; each entry has from and to dates and tags from the group. On the family link, Client A can tap "Same as Client B" for their current address, which then follows Client B's later changes until Client A edits it, or "Copy from Client B" for a past address, which never changes afterwards. No other list has a link or a copy, and a person who lives apart types their own. Entries end with a date and are never deleted. (Code words: `sameAs: LIVE | COPY | NONE`, entry state Active then Ended.)
* **Milestone:** M3 (V1 table lists the card as M2; the family link is runtime, C6.2) · **Extends:** C6.2, C3.16 (entry ids) · **Backlog:** none yet · **Size guess:** M (guess)
* **Rests on:** SA-1B-10 rules 3 to 6 (SA1B-D65 "Same as"); SA-1B-134 for ids (`rowKey` already stable); SH3 resolver; depends on D-5 and D-6.
* **Done when:**
  1. Given Client B's "lives here now" entry is 12 Maple Rd, Calgary (made-up), when Client A taps "Same as Client B", then Client A's current entry shows it and follows a later change by Client B.
  2. Given Client A edits their linked entry, then the link ends and Client B's later changes do not reach Client A.
  3. Given Client A taps "Copy from Client B" on a past address and Client B later edits theirs, then Client A's copy does not change.
  4. Given a group marked neither (job, passport), then no "Same as" or "Copy" is offered; given Client A lives apart, they type their own and no link exists.
  5. Ending an entry gives it a "to" date; it stays in the list and in the history; nothing is deleted.
  6. Audit: "Address entry copied from Client B by Client A" is written without any address text; roles: only the adult, for their own entry, a firm user cannot link people.
* **Leaves out:** answers for a person under 18 given by a parent (SA-1B-75, its own capability); no sync of any other fact and no automatic "Same as" (non-goals); household and organisation scopes (held, P-251).
* **Values:** made-up addresses (Sample).

D-8 (a gate reads one fact about another person) is folded into D-49 below, which closes SA-1B-195 rules 4 and 5 as well.

### D-20. A publisher defines named sets of acceptable documents once, and a document line picks one by name (closes SA-1B-19 part, SA-1B-20; backlog B3)
* **Capability (persona: what they can do):** The content publisher gives a document type one or more named sets in the shared library ("Standard", "Sponsor-funded"), each either "any one of these counts" or "all of these together", with the members in the order the client is shown them and, for each alternative, the wording that says when it is acceptable. An author setting up a combination's document line picks a set by name instead of listing substitutes on the line; the case checklist shows the standard first, then the alternatives in order, and counts the item as met by the rule of the chosen set. (`DocumentType` gains `sets[]`; `DocumentRequirement` gains `setName`; today's unordered `alternatives` list on a line stays readable.)
* **Milestone:** M2 · **Extends:** C6.4 (the checklist already shows an unordered alternatives list and "provided by"), C3.13 (document type list), C3.7 and C11.9 (retired members refused), C1.5 (a copied line carries its set name) · **Backlog:** B3 · **Size guess:** M (a guess)
* **Rests on:** SA-1B-19 ("its ordered alternatives, each with when it is acceptable"); SA-1B-20 (a line picks, never defines); B3 ("a combination picks its set; any valid member satisfies the checklist"); P-70 (all SA-01B in scope).
* **Done when** (US$0, no live AI, an isolated copy):
  1. Data/API: a document type saves a set with a name, a mode (any one, all together) and ordered members that are library document types; the first set is named "Standard"; a type with no set is its own only member. Fail case: a member that is not in the library, a type listed twice in one set, or a set inside a set is refused in plain words naming the member.
  2. Data/API: every alternative needs client wording in English (staff wording optional); a set with no member, an alternative without client wording, or a retired member is refused at save and at submit for release, naming the member ("Add the client wording for Baptism record.").
  3. Data/API: a line picks a set by name; no pick means "Standard". Fail case: a line naming a set the type does not have is saved as unresolved and the combination shows the plain reason ("Line 'Proof of funds' names set 'Sponsor-funded', which does not exist") and is listed as not startable (extends the existing startable check). A line cannot add, remove or reorder members.
  4. Checklist (C6.4 suites): with an any-one set, the case checklist item lists the standard first, then the alternatives in set order, each with its wording; accepting any member meets the item. With an all-together set, one accepted member leaves the item unmet, and all members accepted meets it.
  5. Compatibility: a line saved before this change, with the old unordered alternatives list, still resolves exactly as before until a person picks a set; saving a line with a set picked clears the line's own list (one place only). The existing C6.4 tests stay green.
  6. Release pin: changing the set a line picks, or editing a set, is a change that is part of the next release; a case pinned to an earlier release keeps its earlier set (proved on a case opened before the edit).
  7. Roles: the content publisher authors; a second person approves through the usual release; a case officer and a client cannot edit a set (403, plain words). The screen shows where each set is used (existing where-used).
  8. Renaming a set lists the lines that name it before it can be released.
* **Leaves out:** the structured "when acceptable" condition in the library's condition language (SA-1B-19 rule 3 says optional; nothing in the POC evaluates it and the officer decides on the case). AI drafting of a set (SA-1B-159; paid AI, later). Moving the old `primacy` and `alternativeGroupKey` fields out of the team's pack is the team's retrofit. The guarded Add of a new document type stays held (X3, P-251).
* **Values:** all test sets are Sample ("Birth certificate", "Proof of funds" are the card's examples, pending the immigration expert). No immigration values.

---

### D-21. A publisher says which dates a document type captures, and the case records them at upload and confirms them when accepting (closes SA-1B-153)
* **Capability (persona: what they can do):** The content publisher sets on a document type which dates it captures (an issue date, an expiry date, or both, each with the client's label such as "Date of the exam"). When a document is uploaded on a case, the person typing the upload enters those dates, the case officer confirms or corrects them in the same step as accepting, a blank is never filled with a default, and a document accepted with no date shows "No expiry date recorded". (`DocumentType.datesCaptured[]`; values kept on the case document with who set them.)
* **Milestone:** M2 · **Extends:** C6.4 (case checklist upload and accept; `issuedWithin` in `engine/runtime/case-checklist.ts` takes two dates today but nothing stores an issue date), C3.13 · **Backlog:** new · **Size guess:** M (a guess)
* **Rests on:** SA-1B-153 ("A blank is never filled with a default"); P-70; the validity rule already in C6.4 needs a real date.
* **Done when** (US$0, no live AI):
  1. Data/API: a type saves 0, 1 or 2 captured dates, each with a role (issue or expiry, at most one of each) and a client label. Fail case: two issue dates, or a role other than those two, is refused in plain words.
  2. Publish check: a type that carries a validity rule ("issued within N months") and captures no issue date is refused at release, naming the type.
  3. Upload (API and screen): a document upload for a type with captured dates asks for each; a date not in year-month-day form is refused with "Give the date as year-month-day." Fail case: leaving a date blank stores nothing (no default, no upload date used in its place).
  4. Accept: the officer sees the entered dates and confirms or corrects them in the same step as accepting; where the officer's date differs from the entered one, both are shown and the officer's is kept with the entered one visible in history.
  5. A document accepted with no expiry date shows "No expiry date recorded" as advice and does not block; the existing validity check shows "Can't check" for it, not "fresh".
  6. The existing "issued within N months" check reads the confirmed issue date, a passing case (issued inside the window) and a failing one (outside), both with Sample months.
  7. Roles: the publisher defines; the client or case officer enters; a person without a role on the case cannot (403). No date text is written to logs (checked on the audit entry).
* **Leaves out:** the Reader pre-filling dates from the image (AI; C6.5 is M3 and paid; nothing is proposed by AI here). Validity warnings at upload with an override reason (B4, M3, SA-1B-23/155). The family-link and client-portal upload screens (the SQR and portal are later waves).
* **Values:** months and dates in tests are Sample. The six-month police-certificate rule keeps its existing label "Sample until the immigration expert confirms (P-171)".

---

### D-22. A publisher sets an upload size limit and a file-name pattern per document type (closes SA-1B-106)
* **Capability (persona: what they can do):** The content publisher sets, on a document type, an optional upload size limit and an optional file-name pattern built only from the document type, the person, the case number and the date. The studio stores them with the release, previews the file name a given case would get, and warns (never blocks) when an uploaded file is over the type's limit. (`DocumentType.maxUploadBytes`, `uploadFileNamePattern`; the global 20 MB case limit in `contracts/documents.ts` stays the hard limit.)
* **Milestone:** M2 · **Extends:** C3.13 (document type page), C6.4 (case upload) · **Backlog:** B38 names "formats and upload size" as W4; this draft takes the two SA-1B-106 values only · **Size guess:** S (a guess)
* **Rests on:** SA-1B-106 ("an upload size limit and a file-name pattern"); P-70.
* **Done when** (US$0):
  1. Data/API: a limit is a whole number of bytes above 0, shown as MB with 1 MB = 1,000,000 bytes; fail case: 0 or a negative number is refused with "Enter a size above 0, or leave it empty."; leaving it empty is valid and raises no warning.
  2. A pattern may use only `{documentType}`, `{person}`, `{caseNumber}` and `{date}`; fail case: `{documentType}_{passport}` is refused with "Use only {documentType}, {person}, {caseNumber} and {date}."
  3. Pure function with tests: `{documentType}_{person}_{date}` for "Pay stubs", Client B, on a fixed Sample date gives `Pay-stubs_Client-B_2026-11-12.pdf` (spaces in a piece become "-", pieces joined by "_"); with no pattern the name is `Pay-stubs_Client-B.pdf`; a piece with no value (no case number) is left out with its separator, with no double "_".
  4. Case upload: a file over the type's limit shows a warning in plain words and is still stored; a file over the global 20 MB is refused as today. A type with no limit warns about nothing.
  5. A change in draft is not used by a case until released: a case uses the last released value.
  6. Roles: the publisher edits; a second person approves the release; case officers and clients cannot edit either value.
* **Leaves out:** compressing and combining files, and "Prepare for upload" itself (the team's PDF Studio, AG-19; nothing in the POC builds it). Accepted formats (SA-1B-18, unchanged). Any firm setting (the card says none).
* **Values:** none from official sources; limits and names are Sample.

---

### D-23. The content team sees what is past its review date, is warned at release, and can preview the weekly content-team digest (closes SA-1B-40; backlog B22, B45 part)
* **Capability (persona: what they can do):** The content publisher sees, in one sortable list, every combination and every source entry that is past its next-review date (today: the oldest official source plus 12 months, shown in orange); the release review lists the same items as a warning that never blocks; and a "This week's digest" view shows exactly what the weekly content-team email would contain, and is empty when nothing is waiting. Nothing is sent by the studio (email sending is the team's, P-167). (Uses `checkedOf` in `engine/programs.ts` and `SourceEntry.citationDate`.)
* **Milestone:** M2 · **Extends:** C1.4 / C11.10 (the "Checked" and next-review dates on the combination cards), C5.4 (source entries), C5.1 (release warnings) · **Backlog:** B22 · **Size guess:** S to M (a guess)
* **Rests on:** SA-1B-40 ("Nothing expires silently"; "an email with nothing to act on is not sent"); P-167 (communication is the team's); P-165 (a stand-in to the team's shape where the demo needs it).
* **Done when** (US$0):
  1. API: the list returns each item with its next-review date and a flag for past; sorted by date; fail case: an item reviewed inside the year is not listed.
  2. Screen: the list is sortable by next-review date and each item opens its combination or source entry; no overdue queue screen is added (the card's non-goal).
  3. Release review: with 3 items past review the release review shows a warning naming the 3, and Release is still allowed. Fail case: no warning when none is past.
  4. Digest: with 3 items past review the digest view lists the 3; with nothing waiting it shows "Nothing waiting. No email would be sent." An item stays in the digest every week until it is re-checked (a test with two successive dates).
  5. The digest names items only, never client data (checked on a copy with a case loaded).
  6. The digest carries a "Stand-in" chip registered in `STAND-INS.md` (guard `tests/check_stand_ins.ts` stays green) saying the team's AG-10 sends it.
  7. Roles: the content publisher and the immigration expert see the list; case officers and clients do not.
* **Leaves out:** sending any email, the fixed weekday and time, and disabled-account handling (the team's AG-10, P-167). Change-watch entries and "page changed" items in the digest (SA-1B-299, 300: founder decision, see list). Unreadable sources and new letter patterns in the digest (no feed or letter-pattern reader exists in the POC; add when a capability needs them). The 12-month period is BR-11 as built, Sample until the immigration expert confirms.
* **Values:** the 12-month period and all dates are Sample.

---

### D-24. A content publisher sees how complete the pack is, with a count that opens its list (closes SA-1B-92)
* **Capability (persona: what they can do):** The content publisher opens a completeness view that shows, for the workspace's country (Canada), how many combinations are startable, how many forms on startable combinations have no field map, how many items are past their review date and how many numbers or items have no source, and each count opens the list behind it. It is calculated when the page opens; nothing is stored.
* **Milestone:** M2 · **Extends:** C1.4 / C11.10 (the startable check and the setup bar), C3.8 (validator), C5.4 (source entries), D-23 (past review) · **Backlog:** new (B45 is the nearest) · **Size guess:** M (a guess)
* **Rests on:** SA-1B-92 ("Calculated when the page opens; no stored report"); P-70; P-240 (sources).
* **Done when** (US$0):
  1. API: counts equal the lists: with 3 items past review the count is 3 and the list has those 3 (and 0 and an empty list when none).
  2. Startable: a combination released and passing the startable check (SA-1B-90, as built in `engine/programs.ts`) counts once; a combination that fails it does not; the list says why.
  3. Forms without a field map: a form on a startable combination with no map counts as a warning, not a block; a mapped form does not count.
  4. No source: after a release in which every published number has a source entry or "None published – set by ExpatReady", the count is 0; with one number lacking it, the count is 1 and opens that number.
  5. A workspace with no released combination shows "—" for every count, not 0.
  6. Roles: content publisher and immigration expert see it; case officers and clients do not; the page never changes data (a test compares the database before and after opening).
* **Leaves out:** "programmes scorable" (scoring and cut-off bands are the team's AG-03 and a Deferred stand-in, SI-2). "Text present in each language" (Release 1 is English only, SA-01 SA-1-44; see the languages item in the founder list). The launch check for form-viewer trials (SA1B-D113, depends on answer-key and trial records for many forms; add after G4/G2). Multiple countries (the POC holds one).
* **Values:** all counts in tests are from Sample data.

---

### D-25. A publisher retires a published release so nothing new uses it (closes SA-1B-301 studio part; the case-side warning is M3 SA-1B-257 and is left out)
* **Capability (persona: what they can do):** The content publisher or immigration expert retires a released version of the shared pack with a required reason, after the screen shows how many open cases are pinned to it. New cases never pick it, it cannot be restored, cases already on it keep reading it, and a version that is the current one for any combination cannot be retired until a replacement is released. (Card name: "Withdraw a version"; here "Retire a release", see the word note at the top. Built on `PackVersion` and `ConfigRelease`.)
* **Milestone:** M2 · **Extends:** C5.1 to C5.4 (release), L-SA13 / SH4 (pin per case, to be agreed) and C3.7 (retire wording) · **Backlog:** B9 (adopt a published update, M3) is the nearest; this is only the retire part · **Size guess:** M (a guess)
* **Rests on:** SA-1B-301 ("New filings never use it"); P-65 (a published item stays readable for cases pinned to it); P-251 (corrections reaching open filings, SA1B-D100, is held).
* **Done when** (US$0):
  1. API: retiring a non-current version with a reason succeeds and is audited with who and why; fail case: no reason is refused in plain words; a version that is the latest release of any combination is refused with "Release a replacement before retiring it."
  2. Before confirming, the screen and API give the count of open cases pinned to the version (0 and more than 0 both tested).
  3. A new case opened on a combination never selects a retired release; a case opened earlier on it still opens and reads its own pinned release unchanged (hash equal before and after).
  4. Retiring is not reversible: there is no restore for a retired release; a corrected version is released instead.
  5. A retired release is marked on the Releases page and is not offered as a target anywhere.
  6. Roles: the content publisher and the immigration expert may; the person who authored the release may retire it only through the same second-person rule as other release steps (decide: see Leaves out); case officers and clients cannot (403).
  7. Nothing on any open case is changed: a test compares every case's answers, drafts and filings before and after.
* **Leaves out:** the warning on open cases and the one-click move to a replacement (M3, SA-1B-257, B9). Automatic retire. Item-level warning on cases. Roll-back as a separate button (P-253's versioned roll-back is G-CORE). Whether retiring needs a second person is not stated by the card; the draft assumes the existing release rule and the tech lead may tighten it.
* **Values:** none.

---

### D-26. A publisher writes a named set of lines once and many combinations include it (closes SA-1B-210)
* **Capability (persona: what they can do):** The content publisher groups form lines and document lines into a named line set ("Adult police and medical, outside Canada"), and many combinations include it at a position. Editing the set lists every combination that includes it before the change goes for approval, and after release all of them hold the new line. A combination can detach a set, which copies its lines in and stops following the set. (C1.5 copies one line to other combinations; this adds the shared group.)
* **Milestone:** M2 · **Extends:** C1.5 (copy a line, add or remove one line across many, with preview and Undo), C11.13 / G-CORE (where-used and impact preview, to be built; this reuses it) · **Backlog:** new · **Size guess:** L (a guess)
* **Rests on:** SA-1B-210 ("a government change to a shared requirement is made in one place"); P-70.
* **Done when** (US$0):
  1. Data/API: a set has a stable key, a name and ordered lines of the same shape as a combination's lines; fail case: a set that includes another set, an empty set, or a line pointing to a missing document type or form is refused naming the line.
  2. A combination includes a set at a position; at release its stored list is expanded, so the preview, the checklist and the fill see a complete list (the existing combination tests stay green on an expanded combination).
  3. A combination cannot edit an included line; Detach copies the set's lines into the combination and removes the include; after a later edit of the set the detached combination is unchanged.
  4. Edit preview: with a set included by 14 combinations (Sample), adding a 5th line lists the 14 before approval; after release all 14 hold the line (counts asserted). Undo of the batch restores all 14 (same as C1.5).
  5. A set line whose condition names a role the including combination does not use is flagged at release (existing startable check).
  6. Where-used for a set is computed from the combinations that include it, with no stored index.
  7. Roles: the content publisher authors; a second person approves; case officers cannot. Cases pinned to earlier releases keep their lines.
* **Leaves out:** nested sets and per-combination overrides (card non-goals); firm-made sets; a global index of cases (SA1B-D94(5)). "Alternative sets" of documents are D-20, a different thing (SA-1B-210 rule 7).
* **Values:** the set name and counts are Sample.

---

### D-27. A publisher exports a form's field map to a spreadsheet and imports an edited one, all or nothing (closes SA-1-31; backlog B27)
* **Capability (persona: what they can do):** On a draft form edition, the content publisher downloads the field map as a spreadsheet file, edits it offline, and imports it. The import is checked first and shown as a preview; if any line is invalid nothing changes and a report names each bad line, otherwise the publisher commits and the whole map is replaced in the draft in one step. (`FormFieldMap` columns: form field path, caption, outcome, person, list position, shared field, transform, condition, purpose, option map.)
* **Milestone:** M2 · **Extends:** C3.1 (field-map drafting), C3.8 (validator), C11.13 (guarded change pipeline for the preview), C5.5 (answer-key gate unchanged) · **Backlog:** B27 · **Size guess:** S to M (a guess)
* **Rests on:** SA-1-31 ("one invalid entry leaves the draft unchanged"); P-70; STANDARDS section 1 (no new technology: a CSV file is written and read with code already in the project).
* **Done when** (US$0, no live AI):
  1. Export: the file has one line per map entry with the columns above, in a stable order; exporting twice gives the same file.
  2. Import, pass: a file of 212 Sample lines with a valid shared field on every mapped line previews as "212 lines, 0 problems" and, on commit, the draft map equals the file (a round trip of an unchanged export changes nothing).
  3. Import, fail: a file of 212 lines with one unknown shared field or one form field path that is not on the edition is refused whole, nothing is imported, and the report names the line number and the reason; the draft is byte-equal before and after.
  4. The same checks as editing by hand apply (shared field exists, transform allowed, option map complete); a macro-enabled file or any file that is not the allowed type is refused in plain words.
  5. Import into a released edition is refused ("Edit the draft, not a released map"); a released map stays as it was.
  6. Commit is a separate step by a person; the import is a draft change that goes through the usual review and the answer-key gate (C5.5) before release.
  7. Roles: the content publisher only; the immigration expert may view; case officers and clients cannot (403).
* **Leaves out:** an Excel (.xlsx) file, because reading it needs a new library (STANDARDS section 1 gate; CSV opens in any spreadsheet); the tech lead may open the gate if the founder wants .xlsx. Importing into a published map (card non-goal). AI-drafted entries (separate capability C3.1).
* **Values:** form field paths and shared fields in tests are those of the Sample form; no immigration values.

---

### D-28. (Built, not on the list) The left menu shows this studio's pages in setup order, with a count of what waits for the person (closes P-04, P-79 menu part, P-125 menu part)
* **Capability (persona: what they can do):** A configuration person sees one left menu in setup order: Configure (Program structure, Immigration programs, To review with the count of items waiting for them), Shared library (Fields, Sections, Document types, Forms, Checks, Rules) and History (AI work, Releases, Activity). The browser tab names the page ("<page> · Product Studio"), a link reached by keyboard shows a focus ring, and a case person sees no menu and is pointed to Cases. (`web/src/App.tsx`.)
* **Milestone:** M2 · **Extends:** new (the tech lead may instead fold this into C11.10 or C11.16) · **Backlog:** none · **Size guess:** already built
* **Rests on:** P-04 ("Left menu shows only this prototype's screens"); P-79 (To review is first under Configure); P-125 (menu in setup order).
* **Done when** (existing tests that prove it, run at US$0 on an isolated copy):
  1. `tests/check_c1116_one_way_in_browser.cjs`: the menu reads Program structure, Immigration programs, To review, in that order, first.
  2. `tests/check_screens_qa_1029_browser.cjs`: QA-70 (a keyboard-focused link shows a ring, an unfocused one does not) and QA-80 (the browser tab names the page, including Review and release reached from the draft bar).
  3. `tests/check_uxa2_to_review_browser.cjs`: the To review count shows what waits for the person.
  4. `tests/check_screen01_browser.cjs`: no Program menu entry and no Browser extension entry (P-102).
  5. Failing case to keep: any of these checks fails if a page is added to or removed from the menu without the test changing.
* **Leaves out:** nothing is added; this only records what is built. The tech lead decides whether it becomes its own capability.
* **Values:** none.

---

### D-29. (Built, not on the list) A shared-draft line on every page says what is unreleased and gives one way to release (closes P-58)
* **Capability (persona: what they can do):** On every configuration page, a line under the header says "No unreleased changes. Firms use Release N." or "Draft · N changes across M combinations" (plus the shared library's own count), with one link "Review and release (N)". It reads counts only from the draft summary and counts only what will be released. (`DraftBar` in `web/src/App.tsx`, `GET /draft?summary=1`, words in `contracts/status-words.ts`.)
* **Milestone:** M2 · **Extends:** C5.1 to C5.3 (the release review it links to) · **Backlog:** none · **Size guess:** already built
* **Rests on:** P-58 ("The global banner reports total changes and affected combination count"); P-273 (words).
* **Done when** (existing tests that prove it):
  1. `tests/check_uxa3_words_rules.ts`: the bar's words, pass and fail cases (one combination, library-only, a library change never counted into the combinations' number).
  2. `tests/check_screen01_browser.cjs` (item 6): the bar shows total changes and affected combination count with one release-review link.
  3. `tests/check_uxa3_status_words_browser.cjs`: with nothing configured the bar says "No unreleased changes" and the Review tab lists none (bar and list agree).
  4. `tests/check_c1113_near_release.ts`: the summary counts and lists only what will be released, not waiting library items.
  5. `tests/qa/check_qa_m2_journeys.cjs` (J7): the bar offers "Review and release" to everyone.
* **Leaves out:** nothing is added.
* **Values:** none.

---

### D-30. (Built, not on the list) Every stand-in is marked on screen and listed in one register, and a check keeps the two equal (closes P-165; backlog B49)
* **Capability (persona: what they can do):** A person looking at a place where the studio stands in for a module the team owns sees a small "Stand-in" chip whose tip says what it does today and which module replaces it; each chip has its entry in `STAND-INS.md` (SI-n), and the check fails when a chip and an entry do not match. (`web/src/components/stand-in.tsx`, `tests/check_stand_ins.ts`, `P/STAND-INS.md`.)
* **Milestone:** M2 · **Extends:** new · **Backlog:** B49 · **Size guess:** already built
* **Rests on:** P-165 ("Every place where our build stands in for another module"); P-153 (the guard).
* **Done when** (existing tests that prove it):
  1. `tests/check_stand_ins.ts`: a chip whose entry is a Stand-in entry, and every Stand-in entry with a chip, match (pass).
  2. The same suite: a chip with no entry, an entry with status Stand-in and its screen built but no chip, and a listed "not on screen yet" entry that already has a chip each fail with a plain message.
  3. The same suite reads the real register and the web source: all chips and entries match today (reported as `STAND-INS.md (N rows) and the chips on screen (M) match`).
* **Leaves out:** nothing is added; D-23's digest adds one chip when built.
* **Values:** none.

---

# Part 2 — the top 10 M3 drafts

### D-40. The case has one target filing date, and fees are read for the date in force (closes SA-1B-251, SA-1B-252)
* **Capability (persona: what they can do):** The case officer sets one target filing date for the case. Every fee line of every filing is read from the fee-table entry in force on that date and shown "as at <date>"; with no date set the fee is read as at today and says so. The content publisher enters each fee amount with an "in force from" date (and an optional "to" date); where no entry is in force on the date the screen says "Can't check: no value in force on <date>" and never prices the line as nothing (dated fee table, `target_filing_date`).
* **Milestone:** M3 · **Extends:** C6.12, R2 (the dated fee table), S3 (no hidden today) · **Backlog:** R2, S3, B17 (look-up by date) · **Size guess:** M (a guess)
* **Rests on:** SA-1B-251 and SA-1B-252 (rule 1 "Every filing in the case uses that one date"); P-230 (7) "Fees live in a dated data table, never in code"; P-171; P-251 keeps the pin on the case (BR-15 and pin per filing are design-only, P-246 (2), L-SA13): the case's pinned release is not changed by this draft.
* **Done when** (US$0, no live AI, an isolated copy):
  1. A fee line holds dated amounts (Sample: CAD 100 until 30 Nov 2026 and CAD 105 from 1 Dec 2026). With the target date 28 Nov the filing's fee is 100, with 2 Dec it is 105; each shown "as at" its date. The failing case: an amount read for 2 Dec never uses the 28 Nov entry.
  2. No target date set: the fee is read as at today (a fixed test clock), the screen says "as at today", and the same inputs give the same totals on another day only when the table changes. A date before the first entry shows "Can't check: no value in force on <date>", the line has no amount, and the case total is not shown as complete (never zero).
  3. The case holds one date. The API refuses a date on a filing (400, "The date is set once for the whole case"). Moving the case's date re-reads every filing of the case, including the family maximum and the biometrics age exemption (S3), and shows the new "as at" date.
  4. Fee table save by the content publisher refuses, in plain words naming the line: two entries with the same "from" date, overlapping ranges, an "in force to" before its "from", an amount without a source entry (G1 rule). A gap is allowed and reads as in check 2.
  5. Regression: with no dated change in the table, the Visitor visa totals (CAD 100 per person, 500 maximum; biometrics 85, 170 maximum; none under 14 or over 79) are exactly those of today, and the other five combinations still answer "not derived yet" where they did.
  6. The pin does not move: with a newer release published after the case opened, setting a later target date changes no pin, no release number on the case and no rule value; the case page states "Rules from release N" beside the date.
  7. Roles: only the case officer and the representative of that case set the date (the client and a configuration-only person get 403; staff of another firm get "not found"). Each change is audited with who, when, old and new date.
  8. A code scan finds no `new Date()` left in the fee, age and checklist engines outside the one place that supplies the case date (S3).
* **Leaves out:** the "Use newer rules?" comparison and CRITICAL warning on a rule change (SA-1B-253 is part of L-SA3, held, P-251; this draft supplies the date and the date-pick function it will use); re-reading at submission day (needs the submission record, SA-1B-259, held with L-SA3); corrections reaching open filings (SA1B-D100, held); pin per filing (design-only); a retainer estimate before any case exists (the card says its display is pending the product owner); the receipt date of a paper filing (card Q8-6); reference tables other than fees (B17 reuses the date-pick function); portal screens "never pinned" (C7.3's own rule, not changed here).
* **Values:** all amounts and dates in tests are Sample. The current fee table cites canada.ca pages with quote and date (P-170); this draft adds no new immigration value.

### D-41. A document knows when it ends, what it must outlive, and the passport must outlast the permit (closes SA-1B-21, SA-1B-22, SA-1B-156; generalises SA-1B-155 and SA-1B-105 where C6.4 holds one check)
* **Capability (persona: what they can do):** The content publisher says, for each document type, whether it expires, how the end date is known (printed on it, or counted as a number of months from the issue or exam date) and which day it must outlive (the submission day, or the end of the stay the filing asks for). On the case, the case officer sees for each document the end date, the day it was compared with and the result; before a work permit, study permit or visitor record is filed the officer also sees a warning when the passport ends before the requested stay (document types, `expires`, `endDateRule`, `mustOutlive`).
* **Milestone:** M3 · **Extends:** C6.4 (its "issued within N months" check becomes one case of the general rule), C3.13 · **Backlog:** new (P-230 (8) defers it to after the M2 gate; the V1 report found no backlog item) · **Size guess:** L (a guess: library fields, release, case check, screen)
* **Rests on:** SA-1B-21 "(b) Counted from a date"; SA-1B-22 "Passport = requested end of stay"; SA-1B-156 "IRCC can't issue the permit beyond that"; P-230 (8) "need fields the document model lacks"; P-171 (police certificate no older than 6 months); P-170 (a period needs a cited source); G1 (a number without a source entry cannot be released). Needs the M2 draft that adds "dates a document type captures" (SA-1B-153) and the reference day of D-40.
* **Done when:**
  1. A document type saves `expires` (default no), the end-date rule printed or counted-from-a-date with a whole number of months from 1 to 120, and the day it must outlive. Pass: Passport printed and outlive requested end of stay; Medical exam counted from the exam date, 12 months (Sample).
  2. Refusals in plain words at save or release: counted from a date with no issue date captured ("Add the issue date to 'Dates captured'"); a day to outlive chosen while `expires` is no ("Turn on 'expires' first"); months 0 or 121; a period without a source entry (G1).
  3. End date known: passport printed expiry 20 Nov 2027 gives 20 Nov 2027; exam date 5 Dec 2025 plus 12 months gives 5 Dec 2026; a 31 August date plus 6 months falls on the last day of February (the existing month rule).
  4. Case check: the reference day is the target filing date of D-40, else today ("as at today"). End date before the reference day gives an Advisory naming person, document, end date and reference day; on or after it is silent; a missing date gives "Can't check: issue date missing" and never a pass. The check runs when a captured date is confirmed, when the case date or requested end changes, and when the filing is opened; never over all cases on a publish.
  5. Passport and permit: passport ends 20 Nov 2027, requested end of stay 14 Jan 2029 gives the fixed warning "Passport expires 20 Nov 2027 — IRCC can't issue the permit beyond that (requested to 14 Jan 2029). Renew first?"; changing the request to 15 Nov 2027 clears it; with no requested end the warning says "Can't check: requested end of stay missing", and the passport is still compared with the reference day. Where two passports exist, the one marked current is used.
  6. Regression: the Visitor visa police-certificate check gives the same fresh/not-fresh answers for the same dates as C6.4 gives today, now read from the type's fields, and the existing citation (page, quote, date) is kept.
  7. Roles and words: the publisher edits the fields (the case officer cannot); the warning never blocks an upload, an approval or a filing and is never sent to the client; client-facing text names no regulator.
  8. Never changed: a case keeps the validity rules of its pinned release; a type changed in a newer release reaches an open case only by the move of D-43.
* **Leaves out:** capturing dates at upload and reading them from documents (the M2 dates draft and C6.5); the CRITICAL-at-submission with pass-with-reason (SA-1B-155 rule 5) because it belongs to the warning family held with L-SA3 (P-251): this draft shows an Advisory, and says in the plan that the same message becomes CRITICAL when L-SA3 is released; a programme's own period for one line (SA-1B-105, later); reminders and key dates from end dates (B24, the reminder engine is the team's); which library field holds the requested stay is named per combination by the immigration expert (card Q3-3).
* **Values:** periods (police certificate 6 months, permanent-residence medical 12 months, biometrics 10 years) are "Researched (source, date): may change" in P-230 (8); the passport rule is Sample here until a canada.ca page is quoted with page, quote and date. Unconfirmed: no counsel.

### D-42. A resolved checklist item keeps its identity, so approvals and marks survive and changes are listed (closes SA-1B-217, BR-18)
* **Capability (persona: what they can do):** When the case's lists of documents, forms and steps are worked out again after an answer changes, each item keeps its identity: an approved passport stays approved, a "not applicable" mark with its reason stays until the officer clears it, and an item that stops applying shows "No longer required" with its uploads kept and comes back with its earlier approval if it applies again. The officer sees what each re-work changed: added, no longer required, reason changed, still waiting on an answer (resolved items, `ResolvedItem` identity).
* **Milestone:** M3 · **Extends:** C6.4 (`ChecklistLine`), C6.12 (`FilingItem`) · **Backlog:** SH3 (the resolver contract states the identity rule first) · **Size guess:** M (a guess; the storage mostly exists)
* **Rests on:** SA-1B-217 and BR-18 ("approvals, waivers and alternatives chosen survive"); SH3 and P-258 (one resolver contract); P-65 (a change never alters an approved or uploaded item). Identity here is case, person, line lineage and an occurrence key.
* **Done when:**
  1. Identity: a line has case, person, line lineage and an occurrence key (empty when the line occurs once; for example "country:2" for a document asked per country of residence, tested with a Sample repeating line). Same identity updates the same line; a new identity adds one; the database refuses a duplicate.
  2. Approved item, unrelated answer changed (an address): the item is unchanged and approved, and the difference reads "nothing removed, nothing added". Failing case: a changed answer that the line's own condition reads changes the line's reason and the difference says "reason changed".
  3. A line whose condition stops applying shows state "No longer required"; its uploaded file stays, downloadable; it is not deleted. When it applies again it is active with its earlier state (approved stays approved, not reset to not requested).
  4. "Not applicable" with a reason survives every re-work until the officer clears it; clearing records who and when; a second officer's clear is also audited.
  5. Every re-work returns {added, no longer required, reason changed, waiting on an answer changed} and writes one audit line naming field keys and document types only, never answer values or file contents.
  6. Two re-works at the same moment write each identity once (a parallel-request test), and a repeated re-work with no change writes nothing new.
  7. Forms and steps (`FilingItem`) report in the same difference; a form already filled or signed is never changed by a re-work (stale mark only, P-65).
  8. Roles: the case officer and the representative read the difference; the client sees only their own lines; no one can hard-delete a stored line (API 405 or absent) and the count of stored lines of a case never goes down.
* **Leaves out:** carrying identities through a release move (D-43 uses this draft); family members on different programmes and a case holding several combinations (design-only, P-251); a firm's hidden items (firm overlay, B23).
* **Values:** none; document names in tests are Sample.

### D-43. Before an open case moves to a newer release, "What changes for this case" lists the effect, and the move keeps what was decided (closes SA-1B-254)
* **Capability (persona: what they can do):** The case officer opens "What changes for this case" and reads, without anything being saved, what a newer release of the case's combination would change for this case: questions added or removed, documents per person, forms and editions, steps, and fee amounts old against new with their dates. The officer then moves the case with one click and one reason (pre-filled, editable); approvals, "not applicable" marks and uploads stay, answers are re-read against the new release, and a move that cannot carry an answer is refused naming it (move a case to a newer release, `PackWorkPin` revision).
* **Milestone:** M3 · **Extends:** C6.1 (the pin), C6.4, C6.12 · **Backlog:** B9, SH4 · **Size guess:** L (a guess)
* **Rests on:** SA-1B-254 "a list shows what would change for that case"; P-65 "a changed fact marks ... items stale and never changes them"; P-246 (2) and SI-11 (our release pin is a stand-in for the team's adoption, shaped to SA-1): the pin stays on the case, so the move is per case, not per filing (L-SA13 is design-only). See the founder list for the ownership check.
* **Done when:**
  1. The list is computed without writing: for a Visitor visa case on release 3 where release 4 adds one document and changes one fee, the list shows exactly those two items, the fee old against new with both dates, and nothing is stored: the count of every case table's entries is equal before and after. With identical releases it says "Nothing changes for this case".
  2. Targets: the same combination, released, newer than the case's pin, not retired. Moving back to an earlier release is refused in plain words ("A case never moves back"), except the retired-release move of D-44.
  3. The move writes one new pin revision for the whole case in one transaction, with the reason, who and when audited; other cases and their pins are untouched.
  4. Survives: an approved document, a "not applicable" mark and an upload keep their state through the move (identity by line lineage, D-42); an item the new release no longer lists becomes "No longer required" and keeps its uploads.
  5. Refused, with the answer or combination named in plain words, and the case still works on its old release with nothing changed: an answer that no longer fits a field type in the new release; a required field of the new release that cannot be re-read; the case's combination missing in the target. A new required question with no answer yet is not a refusal; it appears as a new question.
  6. Forms are never rewritten by the move: forms whose map or edition changed are listed ("map changed: run Autofill"), the officer fills as usual, and signed, uploaded or submitted items stay as they are (stale mark only).
  7. Roles: the case officer and the representative move; the client and a configuration-only person get 403 and see no list; a list read before another officer moved the case is refused on the move with "The case changed after you read the list" (409).
  8. The answer snapshot is renewed so forms filled after the move read the new release; forms filled before it stay on theirs.
* **Leaves out:** the automatic warning when a rule change reaches the target filing date (SA-1B-253, held with L-SA3, P-251); corrections reaching open filings (SA1B-D100, held); hidden items and requested documents surviving the move (SA-1B-258, needs the firm overlay B23); pin per filing (design-only); the team's SA-1 adoption screens and firm-wide adoption (SI-11).
* **Values:** fee and document changes in tests are Sample.

### D-44. An open case on a retired release shows a warning and moves in one click (closes SA-1B-257)
* **Capability (persona: what they can do):** When ExpatReady retires a published release, every open case pinned to it shows a CRITICAL warning on the case page and on Prepare application ("Release 5 was retired: Wrong fee. Move to release 4?"), and the case officer moves it to the current release with one click and a pre-filled reason. The case keeps working on the retired release until moved. A case already filed on it shows a note "Filed on retired release 5" and no warning (warning on a retired release, `retiredAt`).
* **Milestone:** M3 · **Extends:** C6.1, C6.12 · **Backlog:** B9 (move), depends on the M2 draft D-25 "retire a release" (SA-1B-301, which also shows the count of open cases pinned to the release) and on D-43 · **Size guess:** S (a guess)
* **Rests on:** SA-1B-257 "every open filing pinned to it shows a CRITICAL warning"; SA-1B-254 rule 8 (the one move to an earlier release); P-246 (2): the pin stays on the case. Not covered by L-SA3 as written (V1 note).
* **Done when:**
  1. Release 5 retired with a reason while not the current one: an open case on 5 shows the warning naming release 5 and the reason; a case on release 3 shows nothing. Failing case: retiring the currently effective release is refused by the M2 draft, so no case is left with no release to move to.
  2. The warning is computed on every read of the case, so a case opened after the retirement shows it too; no background job is needed.
  3. "Use release 4" moves the case through the D-43 move (all its refusals apply), pre-fills "ExpatReady retired release 5", and the warning disappears. This is the only allowed move to an earlier release.
  4. A person without the right to move (the client, a configuration-only person) is not offered the button and the API answers 403; the warning stays.
  5. Pass with a reason: a permitted person may pass the warning, recorded with who, when, reason and the release it covered; it does not move the case, and it does not return for the same release but does for the next one retired.
  6. Reads continue: a case on a retired release still opens, shows its questionnaire, checklist and filings; the retired release stays readable (no 404).
  7. A filing with a recorded application number (C8.2) gets the staff note "Filed on retired release 5" and no warning.
  8. Quiet: no email, no notification, no client message; nothing blocks upload, fill or approval. It shows how the other warnings show; when L-SA3 is released the same line joins its warnings list.
* **Leaves out:** the retire action and its confirmation screen (the M2 draft D-25, SA-1B-301); a request for a document being refused on a retired pin (not built, would conflict with "warn, never block"); an item-level warning; restoring a retired release (not allowed by the card).
* **Values:** none.

### D-45. A client without a document says "I don't have this" and picks an alternative; the officer sees "Alternative used" (closes SA-1B-152)
* **Capability (persona: what they can do):** On the client's document list, for a line where any one of several documents counts, the client presses "I don't have this — I'll provide the alternative" and picks one; the line then asks for it. The case officer sees "Alternative used: Baptism record" with the guidance that member carries, can pick on the client's behalf, and accepts the alternative or sends it back. The client can switch back; nothing is sent to anyone when the client picks (client picks an alternative, `satisfiedByTypeKey`).
* **Milestone:** M3 · **Extends:** C6.4 (the line's `alternatives`), C6.2 · **Backlog:** new; depends on the M2 draft for named alternative sets (SA-1B-20, B3) and on D-42 · **Size guess:** M (a guess)
* **Rests on:** SA-1B-152 "the officer sees 'Alternative used'"; BR-18 (the choice survives re-resolution and a release move); P-271: the client questionnaire runtime is ours (the simulated client login here), the secure link and the real login are the team's.
* **Done when:**
  1. A client of the case picks the alternative on an any-one line: the line now asks for the chosen document and the officer's view shows "Alternative used: <name>" with who chose and when. Failing case: a document not among the line's alternatives is refused (400) in plain words; a line with no alternatives shows no button.
  2. A file already uploaded for the standard document stays, downloadable, marked "no longer required". Switching back restores "Standard asked", removes the flag and keeps the alternative's upload.
  3. Where the chosen member carries a condition (arrives with named sets) and an input it reads is missing, the officer sees "Can't check: country of birth missing" and never a pass; the alternative stays offered either way. Tested with a Sample member condition.
  4. The choice persists: re-working the list (D-42) keeps it while the member is in the line; after a release move (D-43) that removes the member, the line shows the standard again with "The alternative you chose is no longer in the list" and the file is kept.
  5. Roles: the case's own client logins pick for their own lines (and the principal for a minor, C6.10); a client of another case gets 403; the case officer picks for the client with "entered by officer"; accepting or sending back uses the existing approved and rejected states.
  6. Quiet: no message is created by the pick; the audit line names document types and the person's role, never file contents.
  7. Several alternatives uploaded: all are kept and the officer accepts one.
* **Leaves out:** authoring named sets and their order (M2, B3, SA-1B-19/20); the all-together set (chosen by the combination, not by the client, card rule 2); an automatic choice; the real secure link, login and portal wording (the team, P-271).
* **Values:** document names and conditions are Sample.

### D-46. A document needed once, with several providers, is approved once and reused when already on file (closes SA-1B-214)
* **Capability (persona: what they can do):** A document needed once for the application (a marriage certificate) appears as one item with its default providers by role (the principal and the spouse). Uploads from either land on the item with who provided each; the case officer approves it once. If a provider already has an accepted, still-valid document of that type on another filing of the same case, the item offers "Already on file from Client B's filing — use it?" and the officer decides with one click (shared document, `providers`).
* **Milestone:** M3 · **Extends:** C6.4 · **Backlog:** new; depends on the M2 line fields "needed once" and provider roles (SA-1B-57, SA-1B-151) and on D-42 · **Size guess:** M (a guess)
* **Rests on:** SA-1B-214 "the officer approves it once"; BR-18; P-171 (checklist per person is kept for all other lines).
* **Done when:**
  1. A line marked "once for the application" with providers principal and spouse gives one item on the case (not one per person) reading "Received from Client B · nothing yet from Client A". Failing case: a line not marked once still gives one line per person (Visitor visa checklist unchanged).
  2. An upload by either provider lands on the item and shows who provided it; one approval approves the item for all; a send-back lists which upload.
  3. Providers are matched by role among all people on the case, including someone not on this filing; if no one matches, the filing's first applicant provides; a person under 18 is never a provider (a 16-year-old case goes to the first applicant).
  4. The case officer may reassign or add providers (audited); the client may not (403).
  5. "Already on file": offered only for an accepted document of the same type on another filing of the same case that is still valid by D-41 (or has no validity rule); nothing is reused until the officer clicks; the click links the file with an audit line; a document from another case is never offered.
  6. Two different versions uploaded by two providers: both are kept, the officer picks the accepted one; files are never merged.
  7. A client sees only their own upload slot and the item's status; staff see every provider.
* **Leaves out:** the per-adult "keep private from the principal" setting and the family-link visibility rule (the team's AG-02 and CP-01); automatic reuse and merging (card non-goals).
* **Values:** none; document names Sample.

### D-47. Review items per programme join the representative's checklist and are ticked before filing (closes SA-1B-221)
* **Capability (persona: what they can do):** The content publisher adds review items to a combination (for example "Profile matches this application: work history, education, language scores, family members" on the Express Entry application), each with staff wording and a stable key. When the representative reviews a filing, the checklist shows the default items plus that combination's review items; the representative ticks each, and finishing with an item unticked asks one confirmation that is recorded. It never blocks filing (review items, `REVIEW_ITEM`).
* **Milestone:** M3 · **Extends:** C7.7 (Prepare application), C1.6 combination lines (new list on the combination) · **Backlog:** new · **Size guess:** M (a guess)
* **Rests on:** SA-1B-221 "the reviewer ticks it at review"; P-155 (1) the representative reviews, "Self-reviewed" for a solo firm; P-154 roles; L-SA3 (ready-to-file warnings) is held, P-251.
* **How it shows without L-SA3:** each filing on Prepare application shows "Review items: 1 of 2 ticked" and the review screen lists them; it is not a Needs-you entry, a notification or a to-do, and the "Ready to file" result is identical with items unticked. When L-SA3 is released, the same count becomes one line in its warnings list, passed with a reason like the others. This draft does not make it block.
* **Done when:**
  1. The publisher adds a review item (key, English wording, optional condition) to the Express Entry combination; it is part of the next release. Refused in plain words: empty wording, a duplicate key, wording over the length limit.
  2. A case reads the items of its pinned release: editing the item after release changes nothing on a case pinned earlier; a combination without items shows only the default checklist.
  3. The review of a filing lists the default checklist (Sample: "Values marked 'checked against the document' are reviewed", P-155 (2)) and the items under that filing's name; an item with an unmet condition is not shown.
  4. The representative ticks an item; who and when are stored; an untick before completion is allowed. The case officer reads but cannot complete the review (403); a solo representative completes it as "Self-reviewed".
  5. Completing with an item unticked is refused until one confirmation is given (409, "1 review item is not ticked: confirm to finish"); the confirmation names the items, who and when. All ticked: no confirmation asked.
  6. The unticked count shows on Prepare application as in "How it shows"; a test proves the readiness result does not change with items unticked.
  7. Staff only: no client endpoint returns review items; no message or to-do is created.
  8. After a release move (D-43), the next review shows the new release's items; earlier completed reviews keep what was ticked.
* **Leaves out:** wiring the review into "Ready to file" (L-SA3, held); the automatic comparison of profile with application (Release 2); review items written by a firm; the AI review of a filled form (C7.5). The stored review record itself (who, when, "Self-reviewed") does not exist yet and is built here; see the founder list.
* **Values:** wording in tests is Sample.

### D-48. A library form is added to one filing (closes SA-1B-177)
* **Capability (persona: what they can do):** The case officer adds a form from the shared form library to one filing for one person ("Add form"). The list shows published forms searchable by number and name, each badged "Fills from the case" or "Blank form — fill by hand and upload". A mapped form opens pre-filled; an unmapped form gives the blank official PDF; the addition belongs to that filing only (add a library form to a filing, `FilingItem`).
* **Milestone:** M3 · **Extends:** C7.7, C11.6, C7.1 · **Backlog:** new · **Size guess:** M (a guess)
* **Rests on:** SA-1B-177 "an unmapped form is the blank official PDF"; SA1B-D81; S1 (a new form line needs a signature unless set otherwise); open for the builder's concept: a mapped form outside the case's release must have its edition and map version frozen on the filing item when added, because the release does not hold it.
* **Done when:**
  1. The list shows only published library forms, searchable by number and name, with the badge; a draft or retired form is not offered.
  2. Adding a mapped form for a person creates the item on that filing only, and Prepare application lists it; it opens pre-filled by its fill-trial status (PDF fill, or the answer sheet when the trial has not passed, S2); other filings and other cases are unchanged.
  3. Adding an unmapped form offers the official blank file of its edition; reading it back shows no value written; the officer uploads the completed copy through the existing upload path.
  4. The same form for the same person twice on a filing is refused ("Already on this filing", 409).
  5. An added form has no combination line, so its signature rule is the default: needs a signature; a test proves it is never filed unsigned.
  6. The officer may remove an added form that has no work on it; it becomes inactive and keeps its id; one with a filled or signed copy is refused ("Remove the copy first").
  7. Roles: the case officer and the representative add; the client gets 403; audit "form added: number, person, by".
* **Leaves out:** counting additions across firms for "Form box signals" (SA-1B-178 is M4 and needs many firms); firm-wide additions; maps built by firms; the permission key `agent/form:create` (open in the card, Q9; here case officer and representative); the warning when a library edition changes after adding (joins the L-SA3 list).
* **Values:** forms in tests come from the Sample library.

### D-49. A spouse's filing can read the principal's occupation level, and withdrawing a filing others depend on warns the rest (closes SA-1B-219)
* **Capability (persona: what they can do):** The content publisher defines a short named list of cross-person inputs, for example "principal's occupation level" read from the case's principal. A condition on another person's line can use it; the value is the principal's recorded fact (client answer, staff entry or confirmed document value) and a value still waiting for "Confirm & use" counts as missing. The representative or case officer can withdraw a filing with a reason; every filing that depends on it gets an Advisory "Client B's filing was withdrawn; Client A's application depends on it" (cross-person input, `dependsOnRole`).
* **Milestone:** M3 · **Extends:** C6.3, C11.12 (roles), C6.12 · **Backlog:** SH3 (the contract reads the input; no second copy) · **Size guess:** L (a guess)
* **Also closes:** SA-1B-195 rules 4 and 5 (a condition reads another person's fact only through the approved list); the M2 draft D-8 is folded in here.
* **Rests on:** SA-1B-219 "the case warns when a filing others depend on is withdrawn"; SA-1B-195 and SA-1B-72 (M2 drafts: a condition may read an input; a role may name the role it depends on); P-258 (resolver contract); P-251: the relationship record ("whose fact", `PartyRelationship`) is design-only, so this draft uses the relation "the case's principal" only.
* **Done when:**
  1. The publisher defines an input (key, relation "case principal", field). Refused in plain words: a field not in the library, a relation not in the contract's list, a condition that names another person's field directly. Publishing warns above 20 inputs.
  2. A Sample line on the spouse applies when the principal's recorded occupation level is at least 1 and does not apply at 0 (pass and fail).
  3. No principal recorded, or the value is a document proposal not yet confirmed: the line shows "waiting for: principal's occupation level" and neither applies nor fails.
  4. "Make principal" on the case: the input reads the new principal on the next re-work.
  5. Withdrawing a filing records reason, who and when and marks it withdrawn; it cannot be un-withdrawn here and a filing with a recorded application number asks for a second confirmation.
  6. Withdrawing the principal's filing raises one Advisory on each filing whose role depends on the principal's role, once for the event, kept until acknowledged (who, when); filings that do not depend get nothing; withdrawing a dependent's filing raises nothing for the principal.
  7. Quiet: no notification, no client message, nothing blocks.
  8. An input still in draft cannot be used by a condition (save refused "This input is not approved"); the client's own questionnaire and any client-facing view never return the principal's value (API check).
  9. Regression: a Visitor visa case with no cross-person input gives identical outputs; the input is read through the SH3 resolver contract function (a test fails if a second reader exists).
* **Leaves out:** relations other than the case's principal (spouse, parent: need the relationship record, design-only under P-251); an organisation subject for employer facts (design-only); a "refused" filing outcome and decisions per filing (B10, SA-1B-68); the questionnaire-order publish check for these inputs (M2, SA-1B-111).
* **Values:** occupation levels and thresholds in tests are Sample.

---

## Next M3 gaps, not in the top 10, and why
* SA-1B-67, SA-1B-68, SA-1B-212 (multi-stage, B10): size L, needs pin per filing (design-only, P-246 (2)) and B11 deadlines; the Visitor visa and the six combinations are one stage each.
* SA-1B-258 (hidden items and requested documents survive a move): nothing to survive until the firm overlay (B23) exists.
* BR-24 (what a firm may change): the firm overlay B23; ownership by the team is not recorded in a decision (V1 question 3).
* SA-1B-233, SA-1B-104, SA-1B-157 (key-date types, status documents): need D-41's end dates first; the reminder engine is the team's (B24).
* SA-1B-180 (form accuracy record): the open-notices part depends on SA-1B-179 (held); the test-date part waits for G4.
* SA-1B-204 (staff-only score): needs scoring definitions (B16, size L); not part of the Visitor visa.
* SA-1B-46 (platform delivery steps with client labels): needs government steps (B11) and B26, M4.
* BR-25 (quiet by default) and BR-38 (real value, not nudging): constraints, no feature of their own; D-44, D-45, D-47 and D-49 each test "no message sent", which covers them for now.
* BR-41 (copy on emails): email is the team's (P-167) and needs the field-group type (SA-1B-6, M2).
* BR-43 (programme pre-selected from the most binding source): the retainer, consultation and assessment sources are the team's or the held PQR area (P-271, P-251), so nothing exists to pre-select from.