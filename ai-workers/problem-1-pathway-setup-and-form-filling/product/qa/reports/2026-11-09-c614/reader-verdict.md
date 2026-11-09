# C6.14: the fresh reader's verdict, word for word (P-303)

A new Opus subagent that ran nothing read only the GitHub job excerpt, the walk script, its output, the 23 screenshots, the probe and the row (9 Nov 2026, ~18:25 IST). Its reply follows unchanged.

---

**Verdict: Works. Gate A: PASS.** Read-only review: I ran nothing.

**Why it works**
- **Pack on GitHub:** `github-C6.14-42616655752.txt` shows nightly run 42616655752, job 129158118360, on main cfaa199f4, data = checkpoint. C6.14.test.ts exit 0, 35/35, Gate B passed.
- **Author proposes, second person approves:** the drawer starts at "Not set" (02). The editor gets two roles and a reason (04). The drawer then says the change waits (05). It shows on To review (06b), and the approver sees before and after (07). 3b confirms underneath that the type carries principal,spouse_or_partner.
- **Release by screens:** the expert's line names the roles (09) and v3 is released (10).
- **One item:** a family of four gets one "Marriage certificate copy", "Once for the couple · Shared · Provided by Sample Client A and Sample Spouse A · Default from the document type" (11). Only one line is marked Shared.
- **Change with a reason:** the children are disabled and their ages are given in words (12). Saving with no reason is refused on the field (13). The principal alone is saved with the reason shown on the line (14). "Use the defaults" with a reason restores both providers (15, 16).
- **Next step (C6.4/C6.5):** Request, then Upload, on the one item (18, 19, 20). State goes Received, the file is named, "1 of 4 received", providers are still shown.
- **Helpers (named):** cases were opened and marital status answered by m3.ts helpers. That setup is not under test, so it is acceptable.
- **Correction to the brief:** the final walk did catch a file chooser. `walk-output.txt` has no "headless: no file-chooser event" note. The chooser failure is from the older script in `run1.log` only. `probe.log` shows a chooser for mouse, keyboard and direct click, but it tried the Passport line, not the shared line.

**F18: as built.** Principal of unknown age plus spouse of 17 gives "Provided by Sample Spouse C", the person whose list carries the item (17). The dialog gives the reasons (17b). The words match concept BR-5's slice wording.

**Findings**
1. **Minor, but close to Major; the founder should decide.** The line (17) says only "The person the item is for", the same words as the no-roles case (01). Concept BR-4 and BR-5 say the line itself should give the reason ("No provider role matched…", "the line says why"). The reasons appear only inside "Change providers…" (17b). Walk check 7a claims "with the reasons in words", but it only matched the provider's name, so that PASS overstates. Doesn't hold the row if the founder accepts it as Minor.
2. **Question for the founder: a 17-year-old is named.** F18 names Spouse C, who is 17. The same dialog says "Nobody under 18 provides a document" and greys Spouse C out (17b). Concept Q3 (first applicant or principal) is still open. Doesn't hold the row.
3. **Minor, two age rules on one screen.** The person header says "Age: answer 'Date the application is submitted' first". The dialog works ages out "on 2026-11-09", today's date (11, 12). Doesn't hold the row.
4. **Minor, error messages.** After an empty Send, the reason error shows twice (03). It stays red after valid text is typed (04). Doesn't hold the row.
5. **Minor, two "provided by" labels in one drawer.** "Provided by: The client" sits near "Who provides it when shared: Not set" (02). Doesn't hold the row.
6. **Minor, cut-off line.** The release line the expert signs is cut off with "…" on screen (08, 09). The walk read the full text from the page. Doesn't hold the row.

**What this evidence does not prove**
- **"Once for the application" items** (Filing scope, such as a sponsor's proof of funds). Only "once for the couple" was walked. The concept says no release uses the Filing scope yet.
- **Which commit the walk ran on.** Neither the walk script nor its output records it. Main has since changed C6.5's upload code, which the next step uses, so neither the pack nor the walk is proven on d8fddc328.
- **That the expert's signature was needed or stored.** Nothing checks it. v3's column lists no Content reviewer, and "Demo release" is shown.
- **The file chooser on the shared line**, by the probe. The walk's chooser does cover it.
- **Sharing in practice:** a provider uploading for themselves, "Received from <person>" (BR-7, not built), a second change while one is open (409 through the screen), and a stale version through the screen.
- **Screen sizes:** only 1024 px was checked; no phone width.
- **Immigration rules:** all Sample, and Unconfirmed: no counsel.

---
File names since: `run1.log`, `run2.log` and `probe.log` were renamed `run1-output.txt`, `run2-output.txt` and `probe-output.txt` (the push guard keeps logs out); contents unchanged.
