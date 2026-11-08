# B155 walk (QA-153, Section C): the brothers and sisters on IMM 5645, by screens, 8 Nov 2026

**Branch:** `claude/pensive-bell-7ko7fb` (PR #1367).
**Copy:** an isolated copy on its own port (:4461). Set up with Demo › Reset, then Demo › Load the configured checkpoint as the author (release 2 of the Visitor visa).
**Money:** live AI off, US$0.
**People:** Sample only: the pack's family (Sample Client A, 40; Sample Spouse A, 38; Sample Child A1, 10; Sample Child A2, 15), opened by the API.
**Viewports:** by screens at 1440 px as the case officer, then at 1440 and 390 px as the client. The script is a Playwright walk (no assertions; its lines are quoted below). Page errors: none. Sideways scroll: none at 1440 or 390 px.

## The officer (1440 px)
1. **The tabs.** The case page's Agent view has a tab for each adult's brothers and sisters, right after the parents: "Sample Client A's brothers and sisters · 1 missing" and "Sample Spouse A's brothers and sisters · 1 missing". The children have none, because IMM 5645 is not theirs on release 2. See `1-officer-siblings-tab-1440.jpg`.
2. **The section, before any entry.** It is named once: "Brothers and sisters · 0 answered · 0 to confirm · 1 missing", with Confirm section. The text under it reads: "No entries. The forms need one or the other before filing." Below that are **Add an entry** and **None apply**.
3. **First entry.** Add an entry, then Add on "The person's full name (entry 1)": type "Sample Brother A", Save.
   * The toast says "Saved. It fills IMM 5645 for Sample Client A (7 form fields)."
   * Entry 1 lists the seven questions the form has a box for in its first row.
   * The "accompany to Canada" Yes/No is not asked in entry 1: release 2 maps it on Section C's seventh row only.
   * The section reads "1 answered · 1 to confirm · 6 missing".
   * See `2-officer-entry-1-saved-1440.jpg`.
4. **Prepare application.** It shows "IMM 5645 for Sample Client A · Checked copy, not for filing · 53 facts to answer or confirm before filing". The brothers and sisters' unanswered facts are among those 53; the readiness lines themselves are checked by `tests/check_b155_siblings.ts` (B155-4, -6a, -12a). See `3-officer-prepare-imm5645-1440.jpg`.

## The client (1440 and 390 px)
5. **The overview.** It says "You answer for everyone travelling on this application, and for the parents, brothers and sisters its forms ask about." See `4-client-overview-1440.jpg` and `4-client-overview-390.jpg`.
6. **The brothers and sisters' part** ("Part 33 of 87 · Brothers and sisters"):
   * It says "Answering for **Sample Client A's brothers and sisters** (not on this application)." The words are never "(you)" and never "a parent".
   * The confirmation words read: "Declared: it fills the forms now and waits for the officer's "Confirm section" (a brother or sister has no link of their own)."
   * Entry 1 holds the officer's "Sample Brother A".
   * See `5-client-siblings-part-1440.jpg` and `5-client-siblings-part-390.jpg`.

## Next capability's first step
7. Signing and filing (C8.1) start from the same Prepare application card. This row leaves them unchanged.

## Seen, not changed here
* The group's intro ("Each entry asks: …") still lists "Whether this family member will accompany the subject to Canada", which only entry 7 asks. The view has no per-question room count to word it better without a contract change; this is a question in the PR.
* The question words are the library's meanings ("How this person is related to the form subject (for example son, daughter…)"), because release 2 has no question text for these facts. Configuration, row B158's area.
* The questions follow the release's field map (address first). The form's own visual order needs the form's field list (the inventory), which the case view does not read.
