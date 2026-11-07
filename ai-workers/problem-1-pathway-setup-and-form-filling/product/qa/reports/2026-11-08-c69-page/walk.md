# qa walk of C6.9's case check page after #1255 (UX revision, P-407) and B148 (#1250), main 8395c0ce1, 7 Nov 2026, 23:36–23:43 IST: facts only (no verdict here)

**Asked by:** the tech lead (Lead 33): walk #1255's page at 1440 px (gate A, P-348 (3)); check B148's words on screen, the new layout and the next step; run `check_c69_page_browser.cjs`. **Commit:** `8395c0ce1` (main's head). **Money:** live AI off, `STUDIO_*_LIVE` vars 0, US$0. "Run case check" is rules only; no priced button was pressed.
**Copy:** qa_c69p on :4473, started 23:36 IST by its absolute path through the untracked `tools/isolated-sb.sh` with `--ttl 45`, so it stops itself at about 00:21 IST. Configured checkpoint loaded by route (`/api/demo/reset` 201, `/api/demo/load {sample:"configured"}` 201, as the author).
**Set-up by route** (scratch script with the packs' helpers `openCase` and `answer`, not committed): two Visitor visa cases with one adult each. The officer answers passport number, passport expiry (in 5 years) and criminal history, none confirmed. (a) `7ae07852…` "Sample Walk A": criminal history No. (b) `afb47f8f…` "Sample Walk B": criminal history Yes.
**Browser:** the built-in browser pane, 1440×900, acting as "Case officer · Sample firm" (`user-O`, read from the page's "Simulated person" select).

## The browser check
`tests/check_c69_page_browser.cjs 4473 xr_studio_qa_c69p`: **exit 1, not run.** "FAIL the check ran to its end — browserType.launch: Failed to create a ProcessSingleton for your profile directory"; Chrome's log: "bootstrap_check_in … Permission denied (1100)"; "kill EPERM". The sandbox refuses Chrome's Mach port, as in earlier rounds. Lines: `check_c69_page_browser-8395c0ce1.txt`.

## By screens
1. **Case page (a):** the card reads "**Case check from confirmed facts (staff only)** · Stand-in · Open case check · Sample Walk A · Not run".
2. **Open case check:** the heading reads "Case check from confirmed facts · ACC-…"; "This application · release 2 · staff only: the client never sees a verdict"; "Run case check"; a People list on the left ("Sample Walk A · Not run · Principal applicant"); on the right: "No case check yet for Sample Walk A. It reads the answers on file against this application's rules; nothing is sent anywhere."
3. **Run case check** (`1-qualifies-3-not-confirmed-1440.jpg`):
   * the People list reads "Qualifies · 3 not yet confirmed"; the card reads "**Qualifies, on 3 answers not yet confirmed**";
   * "“Qualifies” rests on answers not yet confirmed: Passport number, Passport expiry date, Criminal history. Confirm them in the Agent view; this line goes once every deciding answer is confirmed." Each name is a link;
   * "Rules checked": Met, "Passport number and expiry date answered (Sample)", "SAMPLEW1 (not confirmed yet)…"; Met, "Answered no to the criminal history question (Sample)";
   * "Officer's judgement, not checked by rules": 4 items; then the disclaimer; "Run by Case officer · 7 Nov 2026, 23:39 · release 2"; Override result…, Mark reviewed…, History (1 run).
   * The first text read came before the result had drawn; the next read showed it.
4. **"How this result is worked out"** (opened by script, not clicked): "Every rule must be met. When a rule that disqualifies is not met, the result is “Does not qualify”, even if facts are still missing. A fact not answered, or a rule for the representative's review that is not met, gives “Can't tell yet”…"
5. **History (1 run):** "History for Sample Walk A · Every check, newest first; none is ever changed. · Qualifies · 3 not yet confirmed · Case officer · 7 Nov 2026, 23:39".
6. **No "eligib" on the page:** a search of the page's text, `aria-label`, `title` and `aria-description` found none. It stays only in the route `/cases/<id>/eligibility`.
7. **The next step:** the link "Open Passport number in the Agent view, where its section is confirmed" goes to the case page `#…-person-passport_number`: "Number of the passport or travel document · SAMPLEW1 · To confirm", in Personal details ("3 answered · 0 confirmed"). Focus stayed on the page body; 9fd299219's walk recorded focus on the field. **Confirm section** (Personal details) → "3 answered · 3 confirmed".
8. **Back to the case check (no new run):** "**Qualifies, on 1 answer not yet confirmed**"; "rests on an answer not yet confirmed: Criminal history"; the passport values no longer say "(not confirmed yet)".
9. **Case (b), Run case check** (`2-cant-tell-yet-review-1440.jpg`):
   * "**Can't tell yet — the representative reviews this**"; the People list reads "Can't tell yet";
   * "For the representative's review, a rule not met: Answered no to the criminal history question (Sample). A rule like this never gives “Does not qualify” on its own; the representative reviews it, and IRCC decides.";
   * the rule line: "✕ Not met" (with hidden text ": for the representative's review"), "Criminal history: Yes (not confirmed yet)", "The representative reviews this: never “Does not qualify” on its own". No "rests on" line. No "eligib".
10. **Override result… → Keep the override with nothing filled** (`3-override-refused-on-fields-1440.jpg`): the drawer shows "Result being overridden: Can't tell yet — the representative reviews this" (read-only). Refused on both fields: `aria-invalid` on the input and the textarea, "Give a label for the override." and "Give a reason for the override.", with a toast repeating both. After 7 s the toast no longer covers "Keep the override". Escape closed the drawer; nothing was saved.

## Not walked
* "Does not qualify" on screen: no Visitor visa gate can give it (C6.9-19 reads the rule as written).
* Mark reviewed…; Run again with a reason; 400 and 1024 px; keyboard only; 200% zoom; axe (Chrome refused).
* The page as the client or another role by URL.
