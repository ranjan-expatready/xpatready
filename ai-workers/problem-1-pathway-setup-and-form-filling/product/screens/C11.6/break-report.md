# C11.6 break report: "How each form is filed" on the case page (PR #1056, ef188a489)

Breaker: isolated copy `fm_c116k` on :4453 (`xr_studio_fm_c116k`), 5 Nov. Setup: `setup_visitor_visa.ts` 15/15 and
`setup_vv_m3.ts` 44/46 (S7a fails on main as well, ignored). Cases opened with `acceptance/lib/m3.ts` (`openCase`, FAMILY;
a two-person case taken to Ready to file with `readyToFile` and recorded through `PATCH /runtime/groups/:gid/record`).
Playwright on Chromium, acting as user-O unless stated. Live AI off, no priced button, US$0. Nothing fixed.
Scope: the screen part only (`web/src/runtime/item-channels.tsx`, its place in `cases.tsx`) on the existing routes.

## Findings

**M1 (Major): a hidden "Why on paper" text is saved on a form that is not on paper.**
Steps: an item on Paper (Client A, IMM 5257) → Change channel → the dialog opens on Paper with an empty "Why on paper" →
type "Needs paper: cannot use a computer" → choose PDF upload (the field disappears) → Save.
Expected: only what the person can see is sent; a PDF upload item keeps no accommodation reason.
Actual: the PATCH body is `{"channel":"PDF_UPLOAD","version":…,"reason":"Needs paper: cannot use a computer"}`; it is saved,
the audit line says "(reason given)" and the row reads "Changed from PDF upload (the combination's default) by Case officer
(Sample), …: “Needs paper: cannot use a computer”" on a PDF upload form. The text may hold health details the person meant to
throw away. Cause: `reason` state is kept when the radio changes (item-channels.tsx:131) and sent whenever non-empty
(item-channels.tsx:104), while the field is hidden (item-channels.tsx:143).

**M2 (Major): after "Changed since you read it" → Reload, the dialog keeps its old read; a revert then closes without saving.**
Steps: open Change channel on Spouse A's IMM 5257 (PDF upload) → a second session sets it to Paper → in the first dialog choose
Paper, Save → "Changed since you read it" → Reload → the row behind now says Paper → choose PDF upload (to undo the other
session's change) → Save.
Expected: the dialog reflects the reloaded item and PDF upload is saved (or the dialog says it is already so).
Actual: no request is sent (0 PATCH), the dialog closes, no message; the item stays on Paper. The officer believes it was
reverted. Cause: the dialog gets the `editing` snapshot taken at open (item-channels.tsx:39, 87); Reload refreshes only
`version`; Save compares with the stale `item.channel` (item-channels.tsx:101). The dialog's checked "current" channel, its
description and the leftover `to` are all from the old read.

**M3 (Major): a very long reason without spaces pushes the whole case page sideways (1440, 1024 and 720 px / 200 % zoom).**
Steps: save Paper with a 400-character reason that has no space (the server accepts it: 400 is the limit) → open /cases/:id.
Expected: the reason wraps inside its row; no sideways scroll (the PR's own check claims none at 1024 and 1440).
Actual: `document.documentElement.scrollWidth` 2969 at 1440, 2913 at 1024, 2905 at 720; the `[data-channel-why]` paragraph is
2859 px wide and runs out of the card past the "Change channel" buttons. Cause: item-channels.tsx:74 has no
`[overflow-wrap:anywhere]` (the person heading at :61 does). The builder's check used short reasons only.

**m1 (Minor): a Paper reason cannot be seen or corrected in the dialog; typed text is dropped without a word.**
Steps: an item on Paper with a saved reason → Change channel → "Why on paper" is empty (not the saved reason) → type
"Corrected reason: uses a screen reader." → Save. Expected: the correction is saved, or the dialog says a reason is changed
by first changing the channel. Actual: 0 PATCH, the dialog closes, the old reason stays. item-channels.tsx:95, 101.

**m2 (Minor): after a stale Reload, a Save the server treats as "same" reports success and drops this session's reason.**
Steps: dialog open on PDF upload → a second session sets Paper with "Set by the other session" → first session chooses Paper,
writes "My own reason from session one", Save → stale → Reload → Save. Actual: toast "… is now filed as Paper. The
combination's line is unchanged."; the server answered `changed: false`; the row keeps the other session's reason and the
first person's reason is lost silently. item-channels.tsx:105 ignores the response's `changed`.

**m3 (Minor): back on the default, the row still says "Changed from PDF upload (the combination's default) by …".**
Steps: Paper → PDF upload (the line's channel). Actual: pill "PDF upload", text "Changed from PDF upload (the combination's
default) by Case officer (Sample), Nov 5, 03:32 a.m.." (also a double full stop when no reason). It reads as if the form is
on something else. Expected: e.g. "Back on the combination's default (changed by …)". item-channels.tsx:75.

**m4 (Minor): Enter in "Why on paper" makes a refusal that names a "hidden or control character".**
Steps: choose Paper → type "Cannot use a computer." Enter "Has a visual impairment." → Save. Actual: 400, the field says
"Write the reason as plain text: it holds a hidden or control character." The person typed no hidden character; a textarea
invites a new line and its hint does not say one line only. Focus does go to the field (held). item-channels.tsx:145 (rows=2
textarea), api/src/case-prepare.ts:55 (newline is in the C0 range refused).

**m5 (Minor): a filing recorded while the dialog is open is shown as "Changed since you read it"; focus is then lost.**
Steps: open Change channel on Client A's IMM 5257, choose Paper with a reason → another session records the group's submission
→ Save. Actual: title "Changed since you read it" with a Reload button over the correct detail ("recorded as submitted to
IRCC, so it is read-only …"); Reload leaves the dialog open with Save still enabled; Escape closes it and focus lands on
`<body>` because the row's button is now disabled. Expected: the C8.2-9 words as the title, no Reload-and-try-again, focus on
a reachable element (the row or the section heading). item-channels.tsx:42, 109, 122.

**m6 (Minor): screen reader names in the dialog repeat the long note.** Each radio's note is inside its `<label>` and also its
`aria-describedby` (item-channels.tsx:129–136), so the name is "Online IRCC does not accept it here: the Form library records
PDF upload · Paper for IMM 5257 (“Set by a person: Sample …”)." and the same text is read again as the description. In the
row, the channel pill and the signature have no label ("IMM 5707 Online Typed name IRCC accepts: …", item-channels.tsx:67–70):
"Typed name" is not announced as the signature.

## What held
* Roles: user-P and user-Q PATCH → 403 "Only the case officer can do this."; GET /prepare as user-P → 403; user-S (other
  firm) PATCH and GET → 404 "No such case."; configuration user-A → 403; no actor → 401. On /cases/:id user-P sees "Your
  application" notice and user-S no panel (0 `[data-item-channels]`). (user-T, same firm, not on the case team, can change
  a channel: firm-wide reach is C6.11's existing rule, not this PR, so not a finding.)
* Stale versions: two concurrent PATCHes with the same version → one 200, one 409; the UI shows "Changed since you read it" with
  Reload and saves after it for a different item.
* Paper reason (FQ-3): none, spaces only, punctuation only, 401 characters, a direction override → 400 on the reason field,
  shown on the field with focus on it; Arabic with digits and emoji, and HTML text, saved and shown as text (no markup run).
* Submitted filing (C8.2-9): after recording, every Change channel button is disabled with "Submitted to IRCC: how it is filed
  no longer changes."; a PATCH is refused 409.
* Rapid double Save (dblclick) → exactly 1 PATCH; the dialog closes once.
* Keyboard: Tab reaches the first Change channel (13 stops from the top); Enter opens; focus starts on the current way;
  ArrowDown skips greyed ways; Enter in the textarea does not submit; Save returns focus to the row's button; Escape with
  changes asks "Discard your unsaved changes?" then returns focus to the row's button.
* IRCC account said once, read-only, no control beside it; IMM 5476 offers PDF upload only, Online and Not needed greyed with
  the Form library's line; the section sits above "Prepare application".
* 1024/1440 px with ordinary data: no sideways scroll; the Arabic reason renders in order inside its quotes.

Not tested: the red "IRCC does not accept … choose a way it accepts" state (needs the Form library's record to change under
a saved item); a form with no accepts record at all.
