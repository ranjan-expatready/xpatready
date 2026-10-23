# P-66 — Portal capture and form health (founder direction 23 Oct: the browser extension for both capture and filling; design by the Lead)

Founder request R-80: how do we get every portal form's fields reliably (screenshots, a template, an AI agent, an extension?), what is the routine when a portal form changes, how do we know autofill is broken, and can the back office show which forms agents cannot fill. Builds on P-61, P-62, P-65 and the F1 challenge.

## 0. Founder direction and the Lead's design (23 Oct)
* **One browser extension, two modes.** *Fill mode* (agents): fills the current portal screen from our case data, one screen per click, reads back (team decision 16 guardrails). *Capture mode* (content team): guides a person screen by screen through a whole application ("Screen 3 captured · continue to the next screen") and sends each screen's structure.
* **Structure only, never values (Lead's addition).** Capture reads labels, element ids, types, options, required flags, rules and help text and **never reads what is typed**. So it can run during real case work by a licensed representative: no dummy applications in IRCC's system, no client data in our library.
* **Who can capture:** IRCC's representative portals need a licensed representative's account (membership ID; APR and PR portal pages). So capture is done by the immigration expert or the design-partner firm's representative, not by a Super Admin without an account.
* **"Finish capture" builds the portal twin:** the structured definition of the whole application (screens, questions, types, options with codes, required flags, rules), plus a readable review document (PDF) for the immigration expert. Shared fields are then found or drafted from the twin (reuse first, AI for leftovers, a person accepts), approved by a second person, released by a different person.
* **Branches:** a portal shows screens and questions depending on earlier answers, so one walk-through does not see everything. The twin records which screens were seen and when; each later capture during real work adds what was missing; the expert fills known gaps.
* **Self-healing:** every fill doubles as a structure check; a different screen attaches its new structure (no values) to an automatic "Re-capture needed" task (§2, §3).

## 1. One capture format, four ways to fill it (best first)
Every portal screen becomes the same **capture record**: portal, application type, screen title and order, and per input its label, the page's own element id or name, type, required flag, length or pattern rules, help text and dropdown options (value + label). **Never any answer**: a capture with a value, a tick or a non-default choice is refused.
| Way | How | Quality | When |
|---|---|---|---|
| **A. Extension "Capture this screen"** | A person with portal access opens a blank application screen and clicks; the extension reads the screen's inputs and sends the record | Exact, includes codes and rules, two minutes per form, repeatable | Product (the same extension that later fills, team decision 16) |
| **B. Saved web page** | The person saves each blank screen ("Save page as"); code reads it into the same record | Exact; no install | Prototype now (F1 slice 1) and fallback |
| C. Spreadsheet template | Columns: screen, order, label, type, required, options, help, rule | As good as the typing; works with AI off | Manual fallback |
| D. Screenshots | AI reads labels from images and drafts the record; a person checks every line | Weakest: no element ids, no option codes, no rules | Last resort, never the only source |
An AI agent taking screenshots is way D: useful once to bootstrap, never as the maintained source. Every capture is held until a **second person approves it** (P-57 amended for this source kind), then becomes an online version (an edition with channel Online, identified by its content fingerprint).

## 2. Business as usual when a portal form changes
1. **Signal** (the product never logs in or browses the portal itself):
   * the extension compares each screen with the approved version before filling; a different fingerprint → it fills nothing on that screen and reports which inputs were added, removed, reworded or have changed options (no client values);
   * read-back after filling shows a value the screen did not accept;
   * an agent clicks "This screen looks different" on the portal sheet;
   * the online version passes its re-check date; an IRCC notice in the change watch (team decision 17).
2. **Task:** one signal is enough to open "Re-capture needed" for that form version, listing the differing inputs and every combination and open case affected.
3. **Re-capture** (way A or B) → the system shows the field-by-field difference → reuse and AI drafting for changed inputs only → a person accepts → an immigration expert approves → a different person releases (P-32).
4. **Open cases:** the portal sheet marks the changed screen "changed on <date>, check these answers"; nothing already entered, signed or submitted is touched (P-65).

## 3. Form health (Super Admin)
* Every fill attempt records an event with **no client data**: form version, channel, screen, input id, outcome (filled · not accepted · screen mismatch · skipped by person), firm, time.
* **Form health view:** per form version and screen: attempts, fill success rate, mismatches, the inputs that fail most, firms affected, last capture and re-check date; PDFs alongside (fill trial status, Validate failures reported by agents).
* **Rule:** any screen mismatch, or a fill failure rate above a set level (Sample: 5 % over 20 attempts), opens "Re-capture needed" automatically and alerts the content team. AI may summarise the pattern; people decide.

## 4. Where it is built
* **F1 slice 1 (M2, forms lane):** the capture record format (versioned contract), way B reader, way C template import, refusal of captures with values, second-person approval, fingerprint identity, re-check date, the portal twin and its review document.
* **F2 (forms lane, after F1 slice 1):** a working extension (both modes) proven on saved copies of portal screens; a real-portal capture needs a licensed representative's account (immigration expert or design-partner firm).
* **M3:** fill events, the Form health view and its rule, "This screen looks different", changed-screen marks on open cases; the team hardens and publishes the extension.
* **Not built:** the product logging into portals, crawling them, or capturing from a real case.

Unconfirmed: no counsel; IRCC terms on saving portal pages unread (not public). The 5 % threshold is Sample.
