# Best in class for the M3 case screens: study and scorecard (7 Nov 2026)

**Who and why.** The M3 UX lane wrote this study under P-407 (founder, 7 Nov, about 15:45 IST). It is a records-only study, with no app run, no AI call and a cost of US$0. It sets the bar for the complex case screens and gives a scorecard that skills can check again and again. Step 2 turns the scorecard into `EXPERIENCE.md` §6. Step 3 applies it to seven screens already on `main`: C6.9, C7.6, C6.4, C6.11, C11.6, C7.7 and C8.2.

**The founder's words (quoted, 7 Nov):**
* The bar is best in class for "our special complex situation": "what are the best way to elicit the requirements or to auto-populate from OCR? One case, multiple application, one application, multiple principal, different filing options. So very complicated screens."
* "functionality is complete, best in class as per your research and layout, and visually also very important. Visually, it should be appealing, it should be low cognitive load"
* "Best in class aesthetic, best in class capabilities, organization of the capabilities, intuitive, user friendly, tool tips, completeness, non-ambiguity, efficiency."
* He wants these to be "repeatedly checked".

**Method.** Only primary sources were used: vendors' own product and help pages, open-source code and its decision records, published design systems, and the research firms' own articles. Each source has a link, the date it was read, and a strength mark:
* **P (primary text read in full).** The page was read in full on 7 Nov 2026. For a design system or open-source project, that means the source of its public page, read from its public GitHub repository at the commit dated in the source list.
* **X (search-engine extract only).** The claim rests only on a search-engine extract of the primary page, because this cloud session's network refused the vendor's site. Treat X as **Unverified** until the page is read in full.

What the network allowed decided the strength:
* Readable: GitHub (repositories and raw files).
* Refused: every vendor site (Docketwise, Mitratech, Equifax, Clio, Filevine, Migrawise, Visto, Intuit), nngroup.com, baymard.com, canada.ca, design-system.service.gov.uk, designsystem.digital.gov, docs.aws.amazon.com, learn.microsoft.com and cloud.google.com.

As a result:
* **P:** the government design systems, IRS Direct File, docassemble and the Assembly Line, SurveyJS, and the AWS documentation (from AWS's own GitHub copy).
* **X:** every immigration vendor, TurboTax, Nielsen Norman Group, Baymard, Form.io's submission features, and IRCC's help pages.

The study says this plainly rather than present an X as read. A session on the Mac, whose network can reach these sites, can raise any X to P by reading the page.

Immigration values: this study names no fee, threshold or document rule. The IRCC portal behaviour quoted in (d) is X and is **Unconfirmed: no counsel**. It must be read on canada.ca, with page and date, before any screen relies on it (AGENTS rule 4, P-170).

## Summary
1. **In what we could see, nobody shows the hard half of our problem.** In the vendor material available to this session (search extracts only, X), no immigration product describes:
   * a confidence score or source region on an AI-read value;
   * changing who is the principal applicant on a live case;
   * a filing channel chosen per form, with its own signing and submission record.

   This is Unverified until the vendor pages are read in full, on the Mac. If it holds, these are the places where we must lead rather than copy (see "Where no one shows the way").
2. **The best "ask once" engine is the fact store, not the questionnaire.**
   * IRS Direct File keeps one Fact Graph: facts the person writes, facts derived from them, and collections per person (`/filers/*/…`). "Incomplete" is a normal state; malformed values (such as an invalid address) never enter [2][1].
   * Docketwise and INSZoom (X) say one questionnaire feeds the forms, so a change "is reflected on all forms" [44][49].
   * For us: each fact keeps its scope: person, filing, household or organisation (P-316 (2)). A person fact belongs to the **person** on the case, never to a role, and follows them across roles and applications; a filing fact stays with its application; household and organisation facts keep their own owner. Forms and applications read person facts by role. That makes a principal change a re-mapping of roles, not a re-entry of facts.
3. **Document reading: propose, show the source, confirm, then write.**
   * Docketwise (X) writes AI-read values only "after clicking the Confirm & Import button" [45]. Direct File pre-fills a preview that a single confirm button accepts (`button.yesThisIsCorrect`) [5].
   * Routing by confidence is documented by AWS (thresholds per field, and a missing key is itself a reason for review) [12][13].
   * No case tool's extract (X) mentions showing the page region beside the value. Textract returns a bounding box and polygon for each item [83], and Azure returns bounding regions [16] (X), so we can.
4. **The case home is a task list, not a stepper.**
   * GOV.UK's "Complete multiple tasks" [22] and Direct File's checklist hub [6] fit work done in any order, over many sessions, by several people. Canada.ca's subway navigation shows stages without numbers [35].
   * USWDS says a step indicator is wrong when "the number of steps might change" or progression is nonlinear [28]. Ours is both.
5. **Summary cards per person and per application** suit "case working systems" in GOV.UK's own words [21]. IRCC's own group model is "an application for each family member, but you can submit them all at once" [39] (X, Unconfirmed: no counsel).
6. **Help must not hide what is needed.**
   * USWDS: "Don't hide information necessary for completing a task behind an tooltip interaction" [27].
   * The GC Design System has no tooltip component at all. It uses Details for secondary help, warns to "reduce cognitive load – not add to it" [31], and Direct File pairs "Why do we ask?" with "How do I know?" [7].
   * Our rule: a tooltip for icons, statuses and numbers that need context (`EXPERIENCE.md` §2.10). A visible hint or Details for anything a person needs in order to act.
7. **Filing is a chain of recorded events, not one button.** IRCC separates these steps (X, Unconfirmed: no counsel):
   * the representative fills in and signs;
   * the client reviews and e-signs in the client portal;
   * the representative submits;
   * a confirmation page appears;
   * later, an acknowledgement of receipt arrives [37][41].

   GOV.UK and USWDS want a saveable record of what was sent [25][29]. Each state needs its own who, when and record.

The scorecard at the end has 20 checks, BIC-01 to BIC-20. Each one can be tested on a screen and has a source.

## Our special complex situation
Five structural facts make our screens harder than any product studied. Each check below must hold under all five.

| # | Situation | What it means for a screen |
|---|---|---|
| S1 | One case, many applications (for example a work permit, the spouse's open work permit, a child's study permit) | The case home must show each application with its people, status and next step, and say which facts are shared |
| S2 | One application, several people (principal applicant, spouse or partner, dependent children) | Each person fact is asked once per person and shown with that person's name and role; filing, household and organisation facts keep their own scope (P-316 (2)); forms are per person or per application |
| S3 | The principal can change (for example the spouse becomes the principal on a later application) | Roles move, facts stay; the screen previews what moves before it happens |
| S4 | Different filing options per form (IRCC online portal, PDF upload in a portal, paper) | Each form shows its channel and what that channel needs; signatures and records differ per channel |
| S5 | Facts come from three sources (Document, Client, Case officer; `PRODUCT.md` §4) with AI proposals | Every value shows its source and whether a person confirmed it; a conflict is shown, never overwritten |

## (a) Eliciting facts from a family
| What the best do | Source | What we copy or adapt | Why |
|---|---|---|---|
| One store of facts: writable facts, derived facts, collections per person; "incomplete" is a normal state; malformed values ("an invalid address") never enter | Direct File Fact Graph [2], optional facts [1], fact modules [3] (P) | Facts stored with their scope (person facts per person; filing, household and organisation facts with their own owner, P-316 (2)); a form reads them; "Not answered yet" is a state, not an error; a malformed value is refused at the field | Asking once is only possible if the store, not the screen, owns the fact (S1, S2) |
| "Make sure to only ask for a piece of information once within a single journey"; pre-populate or offer the carried-forward answer | GOV.UK question pages [19] (P) | A person fact known for this person shows pre-filled with its source; never a blank second question | Efficiency; the founder's "nothing typed twice" (screen-concept 4b) |
| One questionnaire feeds many forms (X); "change is reflected on all forms"; do not correct inside the form, fix the fact and refresh | Docketwise Smart Form Collections [44], INSZoom [49] (X) | Forms are views of facts; edits on a form screen edit the fact (with a "used on N forms" note) | One truth per fact, so forms never disagree |
| The engine asks only what is needed: "does all the thinking about which questions need to be asked and in what order"; "automatically refrains from asking unnecessary questions" | docassemble logic [71] (P); SurveyJS `visibleIf`/`requiredIf` re-evaluated on change [74] (P); Direct File `Gate condition` [5] (P); NN/g: show the primary options by default, defer the rest [59] (X) | A question not needed by any selected form for this person is absent; each asked question can say why ("Asked because Marital status is Married", `EXPERIENCE.md` §2.7) | Low cognitive load: fewer questions, each with a reason |
| Gather people with "is there another?" loops; per-person titles | docassemble groups [72] (P); SurveyJS dynamic panels [77] (X); INSZoom "save and add new relative" [51] (X) | Add family members once at case level; each person's facts are a card titled with name and role | S2: people first, then applications |
| Save on every change; restore data and place | SurveyJS "store survey data and UI state … whenever users change a value" [75] (P); USWDS "allow users to save and resume long and potentially stress-inducing forms" [29] (P); Clio "Save Progress" [53] (X); Form.io drafts that "restore a draft submission if the user leaves the page, and then comes back" [78] (X) | Autosave per answer with a visible "Saved" state; on return the task list shows where they left off | Families answer over days; losing work destroys trust |
| One question per page for the public; grouped pages allowed for internal users "who need to repeat and switch between tasks quickly"; about five fields per screen as a start | GOV.UK question pages [19] (P); Assembly Line "Our magic number '5' fields per screen" [80] (P); Direct File one question per screen "to manage cognitive load" [6] (P) | Client questionnaire: one topic per page, about five fields. Agent view (staff): dense, grouped per person, with sections | Two personas, two densities; both are best practice |
| Mark in words, never by an asterisk alone. GOV.UK marks optional ("(optional)", "Never mark mandatory fields with asterisks"), and "I do not know" is allowed where valid. The GC Design System does the opposite: it adds "required" after the label | GOV.UK question pages [19] (P); GC Design System input [84] (P); Direct File optional facts [1] (P); Baymard: marking both reduces missed required fields [69] (X) | Client pages (public, Canadian) mark both, in words: "required" (GC Design System) and "(optional)". Staff pages mark "(optional)" only, because every unanswered staff field already shows "Not answered yet". "Not known" is offered where IRCC accepts it | The two government systems disagree; marking both serves Canadian clients, and staff screens stay quiet |
| A short screener first; at most 7 questions per sequence; "Always summarize the choices people have made" | Canada.ca interactive questions [34] (P); GOV.UK check a service is suitable [19] (P); Direct File screener ADR [6] (P) | The PQR stays short. Only personal details carry from the PQR into the client questionnaire, marked "please confirm"; everything else is asked fresh, because PQR answers are often what-ifs (P-235) | No re-typing of personal details, and no hypothetical answer filling a real application |

## (b) Document reading that proposes values
| What the best do | Source | What we copy or adapt | Why |
|---|---|---|---|
| Ways in, best first: import from the source; if not, "snap a photo"; then upload a PDF or image; typing by hand last. After a photo, "compare the information entered with your W-2 and … make changes" | TurboTax help [10] (X); community thread [11] (X, weakest) | The documents panel offers "Upload a document" before "Type it in"; after reading, the values are compared with the document before anything is kept | Typing is the slowest and most error-prone way in |
| Review every extracted value, edit or ignore it, write only on "Confirm & Import" | Docketwise IQ Data Capture [45] (X); LawLogix Notice AI flags AI-extracted values for review [52] (X); Migrawise "fills 80% of the questionnaire, so they only review and confirm" [56] (X) | Nothing from a document becomes a fact until a person accepts it (`PRODUCT.md` §4 "Nothing applies until accepted"); bulk Accept only for high-confidence items | HAX: support correction; trust |
| A pre-filled preview accepted by one confirm button (`button.yesThisIsCorrect`); the heading changes if edited; imported data "needs to be validated by the user" | Direct File data import ADR [4] and `about-you-data-import` screen [5] (P) | Per document: one preview of the values read, per person, with Accept all (if every value is high confidence) or per-value Accept / Edit / Reject | Efficient on clean scans; careful on poor ones |
| Confidence is "a number between 0 and 100 that indicates the probability that a given prediction is correct"; the threshold "depends on the application", "90% or higher" for financial decisions; "consider incorporating human review" | AWS Textract best practices [12] (P); Azure: confidence used "to determine whether to automatically accept the prediction or flag it for human review" [15] (X); NN/g: explanations and disclaimers help users "calibrate their trust" [67] (X) | Show confidence in words ("Check this", "Read clearly"), not raw percentages; identity fields (name, date of birth, passport number) always need a person's look | HAX 2: match precision to real performance [18] (X) |
| Review triggered when confidence is low, when an important key is missing, or by random sample | Amazon A2I activation conditions [13] (P); Google Document AI field-level thresholds, now deprecated [17] (X) | "Not found on the document" is its own proposal state; low-confidence and missing items sort first | The person checks the risky items, not every item |
| The engine returns each value with its page and region: "a fine-grained polygon around the recognized item" inside a bounding box | Textract Block geometry [83] (P); Azure bounding regions [16] (X); A2I identification versus qualification confidence [14] (P) | Show the document thumbnail with the region highlighted beside the value; where no region exists, the page number | No case tool's extract (X) mentions it: a likely lead for us |
| Differences between a document and data on file are flagged and the preparer chooses | Filevine ImmigrationAI [55] (X). Direct File merges several imports into one best guess because several sets "will be very difficult/confusing" [4] (P) | A document value that differs from a **confirmed** fact is shown as a conflict (both values, both sources) and never overwrites; between unconfirmed proposals, show one best value and list the others under Details | Combines both: no silent overwrite, no wall of duplicates |
| Notices triaged into Matched, Unmatched, Unsupported; "Mark for Rescan" | INSZoom GovNoticeIDP [50] (X) | Documents panel groups: Read, Needs a person, Could not read (with "Upload a clearer copy") | Honest about what AI could not do |

## (c) One case, many applications, several people, principal changes
| What the best do | Source | What we copy or adapt | Why |
|---|---|---|---|
| Summary cards for "multiple summary lists that all describe the same type of thing, such as people"; "often used in case working systems"; card title is "the name of a specific person"; card-level actions | GOV.UK summary list [21] (P) | Case home: one card per application (people with roles, status, next step); person view: one card per person (applications they are in) | S1, S2 at a glance |
| IRCC: "You must complete an application for each family member, but you can submit them all at once" (Manage group, Add member) | IRCC family members [39] (X, Unconfirmed: no counsel) | Model applications per person grouped for one submission where the channel allows it | Mirror the channel the representative will use |
| Per-applicant document gap lists | Migrawise [56] (X); Visto lists by "age, country of residence, citizenship, family members" [58] (X) | The documents panel filters by person and by application; a gap names the person | S2 |
| Roles set per form, "Apply to all Forms", changeable later; DS-260 per applicant with principal or derivative | Docketwise [47] (X) | Roles live on the application's people list; forms inherit; a role change is one action | Closest any product comes to a principal change |
| Ask before removing; name exactly what is affected; never default to Yes | MOJ add to a list [26] (P); NN/g confirmation dialogs [66] (X) | **Principal change** and **Remove from the case** open a preview: "Moves: 3 forms, 2 documents now read as Spouse or partner; person facts stay with each person, filing facts with their application"; confirm names the people; history records it | Not found in the vendor extracts (X); it is high-risk, so make it explicit and reversible |

## (d) Filing channels, signing and submission records
| What the best do | Source | What we copy or adapt | Why |
|---|---|---|---|
| Representative portal (as these pages describe it; X, Unconfirmed: no counsel): the representative enters the client's name and email, and the portal emails the client; the representative fills in and signs; the client logs in "to review and electronically sign"; the representative then submits | IRCC representative portal [37] (X) | Separate recorded states per application: Prepared · Signed by representative · Sent to client to sign · Signed by client · Submitted · Acknowledgement received | IRCC itself separates them; a single "Filed" hides who did what |
| The submit button "will turn blue" when signatures and validations are complete; a submitted application leaves the working list | IRCC portal user guide [38] (X) | "Ready to file" lists exactly what is missing per application; once submitted the item moves to a filed list with its record | Matches what the representative sees next in the portal |
| E-signature by typing the name, "for the overall application and all digital forms" | IRCC help 740 [40] (X) | The signing step says which signature the channel needs, from a cited IRCC source. Until read on canada.ca, the kinds seen in extracts (a typed name in the portal [40]; third-party forms hand-signed and uploaded, in a 2021 notice extract [37]) are Sample, **Unconfirmed: no counsel** | S4 |
| A Use of a Representative form (IMM 5476) goes with an application not yet submitted, or by IRCC's web form after applying | IRCC IMM 5476 pages [43] (X, Unconfirmed: no counsel) | The signing step shows the representative named for that application and whether the form is in the package | The representative must be on record before filing |
| After submission, a confirmation page and email; the acknowledgement of receipt with a number comes later | IRCC help 028 [41] (X) | "Submitted" and "Acknowledgement received" are two events; the second asks for the number and the letter | Submitted is not received |
| Confirmation page: reference number, "details of what happens next and when", and "a way for users to save a record of the transaction, for example, as a PDF" | GOV.UK confirmation pages [25] (P); USWDS keep a record: answers, questions skipped, URL and date stamp [29] (P) | Each filing record keeps the exact files sent (or printed), who sent them, when, by which channel, and the receipt | Audit and the client's own copy |
| E-file tab validates and lists errors "with links that take you directly to each question", then "Re-Validate"; a submitted draft cannot be changed | Docketwise e-filing [46] (X) | Pre-filing check with linked errors; after Submitted, the application is read-only with "Record a correction" | Prevents a wrong filing |
| Upload limits "vary depending on which online application account you use" | IRCC help 1123 [42] (X); GC file uploader hint states "the types of files and … maximum file size" [33] (P) | Each channel shows its own limits at the upload, read from a cited source, or labelled Sample | S4 |
| Portal autofill by browser extension | INSZoom e-Filing add-on [49] (X); Migrawise and Visto extensions [56][58] (X) | Not copied now (new technology gate, `STANDARDS.md` §1); the per-screen answer sheet stays | Noted for later; no build |

## (e) Review and approval
| What the best do | Source | What we copy or adapt | Why |
|---|---|---|---|
| Check answers before sending; for large transactions, check per section "valuable for services where different users might be completing each section"; Change returns to the check page; skipped optional answers say "Not provided" | GOV.UK check answers [20] (P); SurveyJS `showPreviewBeforeComplete` [76] (P); docassemble `review` screen [73] (P) | Per application, a check view grouped by person; every row has Change that returns to the check; "Not provided" shown | The representative reviews what the client and the case officer entered |
| Data views summarise only visited sections, with edit links; errors force, warnings do not; "All alerts should come before the question text"; alerts roll up to the checklist | Direct File Design System Wiki [6] and Tax-Logic [9] (P); TurboTax final review: some flags are warnings that let you continue [11] (X, community) | Blocking errors and warnings are split and counted on the task list (blocking at filing: a barcode form's own Validate and the Express Entry exception only; P-237, P-315 (2)); each links to the field | `EXPERIENCE.md` §2.9 Warn, don't block |
| Flag incomplete questions and "reshare only flagged questions" | Docketwise [48] (X) | Return to the client only the flagged items, not the whole questionnaire | Efficiency for the family |
| States Not started · In progress · Needs review; answers lock once staff accept them; only locked answers feed forms | Clio Draft live questionnaires [54] (X) | Confirmed facts feed forms; an unconfirmed fact on a form is marked | Matches our confirmed/unconfirmed model (C6.9 BR-9, F3) |
| Revision history: "who has updated a submission, when a change was made, and any notes", restorable | Form.io submission revisions [79] (X) | Every fact change keeps who, when, from which source, and the note; the reviewer sees changes since their last look | Review needs the trail, not just the latest value |
| A qualified practitioner reviews AI output before anything is signed or sent | Migrawise terms [57] (X) | The representative reviews before the filing is recorded, shown as "Prepared by · Reviewed by"; when the representative prepared it themself (a solo firm), they record the logged "I prepared and reviewed this filing myself" step ("Self-reviewed"), and the client's re-confirmation of changed declarations stays the second check (P-155 (1)). A missing review is a CRITICAL warning that firm staff may pass with a recorded reason (who, when, reason; P-237 (4), P-342; Unconfirmed: no counsel), never a hard stop. For configuration change sets the approver is never the author (`EXPERIENCE.md` §3) | Licensing (Representative named on IMM 5476) |

## (f) Layout, hierarchy, low cognitive load, help, states, accessibility
| What the best do | Source | What we copy or adapt | Why |
|---|---|---|---|
| Task list: verbs, few statuses, "Cannot start yet" not linked, any order where possible, shown at the start of each returning session | GOV.UK complete multiple tasks [22] (P); Direct File checklist hub that can relock a section [6] (P); NN/g: wizards suit novices and infrequent tasks, and repeat users find them controlling [60] (X) | Case home and Prepare application are task lists; statuses calculated (`EXPERIENCE.md` §2.5) | Nonlinear, multi-session, multi-person work |
| No step indicator for nonlinear or conditional flows (USWDS); Canada.ca's subway navigation, a pattern for sequenced steps, drops numbers ("Canadians are less likely to get to the section they need if the elements are numbered") | USWDS step indicator [28] (P); Canada.ca subway [35] (P) | No numbered stepper on case screens | The number of steps changes with the family |
| Tooltips: only on interactive elements, brief, keyboard reachable, never task-critical; "If content can fit outside a tooltip, don't use a tooltip" | USWDS tooltip [27] (P); NN/g tooltip guidelines [61] (X) | Tooltip on every icon, status chip and number that needs context (`EXPERIENCE.md` §2.10); task-critical help inline | The founder's "tool tips" without hiding the needed |
| Details for help only some need; specific titles, never "Read more"; no Details inside Details | GCDS details [31] (P); GOV.UK details [24] (P); USWDS: "Accordions increase cognitive load and interaction cost" [30] (P); Assembly Line help in context [81] (P); Direct File "Why do we ask?" / "How do I know?" [7] (P) | Each question: one hint line (if most need it) plus "Why we ask" / "How do I know" Details where useful | Help in place, low load |
| Errors: summary at top titled "There is a problem", focus moves there, links to fields, same words inline; "Only provide one reason for the error"; one or two fixes; keep what was typed | GOV.UK error summary and message [23] (P); GCDS error message [32] (P); Baymard adaptive errors [70] (X) | As stated; no "invalid" or "required" alone | Non-ambiguity |
| Validate on Continue, not on leaving a field (GOV.UK [23], P) versus validate on leaving the field (Baymard [68], NN/g [64], X) | — | Format errors on leaving a field once a value is typed; missing-answer errors only at the check step | Resolves the conflict: no premature errors, quick format feedback |
| Empty states show status, teach, and link to the first action; never "No records" before data loads | NN/g empty states [63] (X); `EXPERIENCE.md` §4 | As stated | Teaches the first step |
| "if everything is contrasted, then nothing stands out"; about three type sizes; proximity and white space for grouping; "Reduce clutter without reducing capability" | NN/g visual hierarchy [65], complex applications [62] (X); summary boxes hold "3-5 key details" [29] (P) | One focal point and one primary action per panel; team type scale only; red only for errors | Founder's "visually appealing … low cognitive load" |
| Plain language "is a requirement of the Directive on the Management of Communications"; "almost 50% of Canadians have literacy challenges"; 6th-grade target; sentences under 20 words; one question per sentence | Canada.ca content style guide [36] (P); Assembly Line readability [82] (P); Direct File: "lead with the 'if' statement", "Define even the most simple term" [7] (P) | Client-facing copy to these targets; staff copy plain, with IRCC's own terms | Clients read in a second language |
| WCAG 2.2 AA target, tested continuously | Direct File a11y ADR [8] (P); `EXPERIENCE.md` §2.12 | Unchanged bar (already WCAG 2.2 AA) | Same bar as the best government services |

## Where no one shows the way (we lead, and must get it right)
1. **Principal change on a live case.** None of the search extracts (X) from Docketwise, INSZoom, LawLogix, Clio, Filevine, Migrawise or Visto describes it; Unverified until their pages are read in full. BIC-09 sets our own bar: person facts stay with people, filing facts stay with their application, roles move, the screen previews the move, a confirmation names the people, and history records it.
2. **The source region and confidence beside an AI-read value.** Engines return it [83][16], but no case tool's extract (X) mentions it on screen. BIC-05 and BIC-06 set the bar.
3. **One filing channel per form, with its own signature and record.** Only the IRCC pages describe the chain (X). Vendors describe autofill and PDF export only. BIC-15 and BIC-16 set the bar.

## Scorecard: BIC-01 to BIC-20
How to use:
* Score each check on the running screen at 1440 and 1024 px as **Met**, **Partly**, **Not met** or **N/A**, with evidence (a screenshot or a step).
* "Applies when" says when a check is N/A.
* The founder's words each check serves are in brackets.

| Id | Check (testable on a screen) | How to test | Applies when | Sources |
|---|---|---|---|---|
| BIC-01 | **Ask once.** A fact already known in its scope (a person fact for this person; a filing, household or organisation fact for its owner; P-316 (2)), answered on this case or accepted from a document, is never asked again on another screen, form or application that shares that scope; it shows pre-filled with its source. From the PQR only personal details carry, marked "please confirm" (P-235). [efficiency, completeness] | Answer a fact in one place, open every other screen and form that uses it: shown, not asked. A filing fact on a second application is asked again; a non-personal PQR answer is asked fresh in the client questionnaire, and carried personal details show "please confirm" | The screen asks or shows facts | [19][44][49][2] |
| BIC-02 | **Asked for a reason.** Every question on screen is needed by a selected form or rule for this person, and can say why ("Asked because …"); a question whose condition is false is absent, not disabled. [non-ambiguity, low cognitive load] | Change the deciding answer: the question appears or disappears; the reason names the deciding fact | The screen asks questions | [71][74][5]; `EXPERIENCE.md` §2.7 |
| BIC-03 | **No stale answers.** Changing an answer that other answers depend on flags the dependent answers ("Check again" or "No longer needed"), and no check, signature or filing uses a flagged answer until a person settles it. [completeness, non-ambiguity] | Change Marital status from Married to Single: the spouse's answers are flagged "No longer needed" and leave the forms | The screen edits facts used by others | [71][6] (relock) |
| BIC-04 | **Incomplete is normal; invalid is refused.** "Not answered yet" is a visible state, not an error; inputs are marked in words, never by an asterisk alone (client pages: "required" and "(optional)"; staff pages: "(optional)"); "Not known" is offered where valid; a malformed value is refused at the field with its fix. [user friendly, non-ambiguity] | Leave a required fact blank and save: saved, shown as Not answered yet; type an impossible date: refused at the field | The screen accepts input | [1][2][19][84] |
| BIC-05 | **Every value from a document shows its source and a confirm action.** Document name, page (and region where available), and Accept / Edit / Reject; nothing becomes a fact until accepted. [capabilities, non-ambiguity] | Open a proposal: source visible; the fact stays unconfirmed until Accept; Reject leaves it unchanged | The screen shows AI or document values | [45][5][83][16]; `EXPERIENCE.md` §2.6 |
| BIC-06 | **Confidence is honest and routes attention.** Low-confidence and "not found on the document" items are shown first and in words; bulk Accept never includes them by default; identity fields always need a person's look. [efficiency, non-ambiguity] | Load a document with one low-confidence value: it sorts first; Accept all skips it, and never accepts name, date of birth or passport number | The screen shows AI proposals | [12][13][18] |
| BIC-07 | **Conflicts are shown, never overwritten.** A document value that differs from a confirmed fact shows both values and both sources, and the person picks; history records the choice. [non-ambiguity, completeness] | Upload a passport with a different expiry from the confirmed one: conflict shown; the confirmed value stays until chosen | The screen writes facts from more than one source | [55][4] |
| BIC-08 | **Case structure at a glance.** Each application shows as a card with its people by name and role, its status and its next step; each person shows which applications they are in. [organization, intuitive] | Case with 3 applications and 4 people: every pairing readable without opening anything | The screen shows more than one application or person | [21][39][56] |
| BIC-09 | **Principal change and Remove from the case are explicit and safe.** One named action; a preview of what moves (forms, roles, documents) and what stays (facts, each in its scope); a confirmation that names the people and does not default to Yes; a history entry; undo or a reverse path. [completeness, non-ambiguity] | Make the spouse the principal: preview lists moves; cancel changes nothing; confirm moves roles only | The screen can change roles or people | [26][66][47]; we lead |
| BIC-10 | **Task list, not stepper.** Work spanning sections shows as a list of verb-led tasks with calculated statuses (Not started, In progress, Needs you, Done, Cannot start yet with the reason, not linked), doable in any order where the rules allow; no numbered step indicator on nonlinear work. [organization, intuitive] | Read the statuses against the data; try a task out of order | The screen holds several tasks | [22][6][28][35] |
| BIC-11 | **One primary action per panel, named for what it does.** At most one filled (primary) button per panel or card; its label names the action ("Send to the client to sign"), never "Next" or "Submit" alone; it is the next step the status calls for. [intuitive, efficiency, aesthetic] | Count primary buttons per panel; read labels | Always | [20][34]; `EXPERIENCE.md` §1, §2.5 |
| BIC-12 | **Check before it leaves.** Before a signature or filing step, a check view per application lists every answer grouped by person, "Not provided" for skipped optional answers, Change links that open the edit in a drawer or dialog (§2.3) and return to the check, and errors apart from warnings, each linked to its field; only a barcode form's own Validate blocks, plus, on an Express Entry filing, a missing police certificate or medical exam (P-172, P-315 (2)); every other filing check is a CRITICAL warning passed with who, when and a reason (§2.9; P-237, P-238). [completeness, non-ambiguity] | Open the check, follow a Change link, come back; count errors vs warnings | The screen leads to signing or filing | [20][6][76][73][46] |
| BIC-13 | **Errors say what and how to fix, where it happened.** Inline on the field and in a summary at the top ("There is a problem") with the same words and links; one reason and one or two fixes; no "invalid" or "required" alone; what was typed is kept; format errors appear only after a value is typed. [non-ambiguity, user friendly] | Trigger each error the screen can raise; read the words; check focus and kept input | The screen accepts input | [23][32][70][68] |
| BIC-14 | **Help in place, tooltips where they belong.** Every status chip, icon-only button and number that needs context has a tooltip that opens on hover and keyboard focus and holds nothing needed to act; help needed to act is a visible hint or a specifically titled Details ("Why we ask", "How do I know"). [tool tips, user friendly] | Tab to every icon and chip; read each tooltip; find any task-critical text hidden in one | Always | [27][31][24][7][61] |
| BIC-15 | **Filing channel per form is explicit.** Each form shows its channel (online portal, PDF upload, paper), what that channel needs (signature kind, file types and size from a cited source or marked Sample) and the next step for that channel. [completeness, non-ambiguity] | Open an application with forms on two channels: each shows its own needs and step | The screen shows forms for filing | [37][40][42][33] (IRCC chain: X, Unconfirmed: no counsel) |
| BIC-16 | **Signing and submission are recorded events.** Signed by representative, Signed by client, Submitted and Acknowledgement received are separate, each with who, when, channel and a saved record of exactly what was sent (and the receipt or number); after Submitted the application is read-only with a correction path. [completeness, capabilities] | Walk one application to Submitted: each event recorded; the record downloads; editing is blocked | The screen signs, files or records filing | [37][41][25][29][46] (IRCC chain: X, Unconfirmed: no counsel) |
| BIC-17 | **Review returns only what needs work.** A reviewer approves, or returns with a comment per item; only the flagged items go back to the person who answered; a configuration change set is never approved by its author; a filing is reviewed by the representative before it is recorded, and when the representative prepared it themself they record the logged self-review step ("Self-reviewed", P-155 (1)); a missing review is a CRITICAL warning that firm staff may pass with a recorded reason (P-237 (4), P-342; Unconfirmed: no counsel); the next viewer sees what changed since their last look. [efficiency, organization] | Return two items to the client: the client sees those two only; a change set's author cannot approve it; a filing the representative prepared themself shows "Self-reviewed" with the logged step; one prepared by the case officer shows "Prepared by: Case officer · Reviewed by: Representative", never Self-reviewed; a filing with neither a review nor a passed warning is not recorded; a passed warning records who, when and the reason, and the Reviewed by line says `Not reviewed: warning passed by <role>, <when>` with the reason, never "Self-reviewed" | The screen has a review or approval step | [48][54][57]; `EXPERIENCE.md` §3 |
| BIC-18 | **States drawn and teaching.** Empty states say what will appear and offer the first action; loading uses skeletons, never "No records" before data; saved, saving and failed-to-save are visible; read-only says why. [user friendly, completeness] | Open with no data, slow data, failed save, no permission | Always | [63][75]; `EXPERIENCE.md` §4 |
| BIC-19 | **Low cognitive load by layout.** At 1440 and 1024 px each panel has one heading and at most one primary button; at most three type sizes per panel, all from the team scale; red only for errors; status by shape and text; client pages hold at most five inputs per page; staff pages group by person with sections, not tabs in tabs; no internal ids on the main path; counts say what they count. [aesthetic, low cognitive load, organization] | Screenshots at both widths; count headings, primary buttons, type sizes, reds and inputs per panel; read every count | Always | [65][62][80][19][21]; `EXPERIENCE.md` §1, §2.2, §5 |
| BIC-20 | **Accessible and keyboard-complete.** Every task can be done by keyboard with visible focus; 4.5:1 contrast; 1024 px and 200 % zoom with no sideways page scroll; headings in order; plain words (client copy at about grade 6-8, sentences under 20 words). [user friendly, completeness] | Keyboard-only walk; zoom to 200 %; heading outline; read the copy | Always | [8][36][82]; `EXPERIENCE.md` §2.12 |

**Conflicts between sources, and how the scorecard settles them:**
* *Validate on leaving a field versus on Continue.* Settled in BIC-13: format errors show once a value is typed; missing-answer errors show only at the check step.
* *Required or optional marking.* GOV.UK marks optional and forbids asterisks; the GC Design System adds "required" after the label; Baymard (X) marks both. Settled in BIC-04: client pages mark both in words; staff pages mark "(optional)", since unanswered staff fields already show "Not answered yet".
* *One question per page versus several fields per page.* Settled in BIC-19: clients get one topic and about five fields per page; staff get grouped screens, which GOV.UK allows for internal users.
* *Merge imports versus show conflicts.* Settled in BIC-07: a conflict with a confirmed fact is shown; unconfirmed proposals are merged.

## Where each check bites on the seven screens (applicability, not scores)
Step 3 scores each screen on a fresh copy and writes its own `concept-ux-<date>.md`. This table only says which checks can apply. All screens get BIC-11, 13, 14, 18, 19 and 20.

| Screen | Checks that also apply |
|---|---|
| C6.9 case check | 02, 04, 08, 10 (how the outcome is reached), 12 |
| C7.6 Ready to file | 08, 10, 12, 15, 16 |
| C6.4 documents panel | 05, 06, 07, 08 (per person), 15 (file limits) |
| C6.11 case team tab | 09 (roles), 17 |
| C11.6 channel per form | 15, 16 |
| C7.7 Prepare application | 01, 02, 03, 05, 08, 09, 10, 12, 17 |
| C8.2 filing record | 15, 16 |

## Sources
All read on 7 Nov 2026. "P (repo)" means the public page's own source was read from the named GitHub repository at the commit date given. "X" means only a search-engine extract was available, because the network refused the site; treat it as Unverified.

**IRS Direct File and Fact Graph (P, repo `IRS-Public/direct-file` and `IRS-Public/fact-graph`)**
1. Optional facts ADR, 2023-11-14 — https://github.com/IRS-Public/direct-file/blob/main/docs/adr/adr-optional-facts.md
2. Fact Graph 3.1 ADR (created 06/05/25, published 08/15/25) — https://github.com/IRS-Public/fact-graph/blob/main/docs/fact-graph-3.1-adr.md
3. Fact modules ADR, 11/27/2023 — https://github.com/IRS-Public/direct-file/blob/main/docs/adr/adr-fact-modules.md
4. Data import system ADR, 7/3/2024 (Pending) — https://github.com/IRS-Public/direct-file/blob/main/docs/adr/data-import-system.md
5. About-you flow, gates and the data-import preview (`yesThisIsCorrect`) — https://github.com/IRS-Public/direct-file/blob/main/direct-file/df-client/df-client-app/src/flow/flow-chunks/you-and-your-family/AboutYouSubcategory.tsx
6. Direct File Design System Wiki (checklist hub, data views, question screens, knockouts, alerts); screener config ADR 2023-08-08 — https://github.com/IRS-Public/direct-file/blob/main/docs/design/Direct%20File%20Design%20System%20Wiki.md , https://github.com/IRS-Public/direct-file/blob/main/docs/adr/adr-screener-config.md
7. Direct File Content Style Guide — https://github.com/IRS-Public/direct-file/blob/main/docs/design/Direct%20File%20Content%20Style%20Guide.md
8. Accessibility target ADR (WCAG 2.2 AA, Accepted) — https://github.com/IRS-Public/direct-file/blob/main/docs/adr/adr_a11y-target.md
9. Tax logic engineering notes — https://github.com/IRS-Public/direct-file/blob/main/docs/engineering/Tax-Logic.md

**TurboTax (X)**
10. "How do I import or enter my W-2?" — https://ttlc.intuit.com/turbotax-support/en-us/help-article/import-export-data-files/import-enter-w-2/L55HzdeDr_US_en_US
11. Review after a W-2 photo, and final-review warnings (community threads, weakest) — https://ttlc.intuit.com/community/taxes/discussion/how-do-i-snapshot/00/720283 , https://ttlc.intuit.com/community/taxes/discussion/final-review-prevents-e-filing/00/2599122

**Document reading engines and AI guidance**
12. AWS Textract best practices (P, AWS's GitHub copy `awsdocs/amazon-textract-developer-guide`, which may lag the live page) — https://github.com/awsdocs/amazon-textract-developer-guide/blob/master/doc_source/textract-best-practices.md
13. Amazon A2I activation conditions for Textract (P, `awsdocs/amazon-sagemaker-developer-guide`) — https://github.com/awsdocs/amazon-sagemaker-developer-guide/blob/master/doc_source/a2i-json-humantaskactivationconditions-textract-example.md
14. Amazon A2I Textract task type (identification versus qualification confidence) (P, same repo) — https://github.com/awsdocs/amazon-sagemaker-developer-guide/blob/master/doc_source/a2i-textract-task-type.md
15. Azure Document Intelligence, accuracy and confidence (X) — https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-accuracy-confidence
16. Azure Document Intelligence, analyze response (bounding regions) (X) — https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept/analyze-document-response?view=doc-intel-4.0.0
17. Google Document AI human-in-the-loop (deprecated, no longer available after 16 Jan 2025) (X) — https://docs.cloud.google.com/document-ai/docs/hitl/concepts
18. Microsoft HAX guidelines 2 and 11 (X) — https://www.microsoft.com/en-us/haxtoolkit/library/pattern/

**GOV.UK Design System (P, repo `alphagov/govuk-design-system`, commit 6 Nov 2026)**
19. Question pages; check a service is suitable — https://design-system.service.gov.uk/patterns/question-pages/ , https://design-system.service.gov.uk/patterns/check-a-service-is-suitable/
20. Check answers — https://design-system.service.gov.uk/patterns/check-answers/
21. Summary list and summary cards — https://design-system.service.gov.uk/components/summary-list/
22. Complete multiple tasks (task list) — https://design-system.service.gov.uk/patterns/complete-multiple-tasks/
23. Validation, error summary, error message — https://design-system.service.gov.uk/patterns/validation/ , https://design-system.service.gov.uk/components/error-summary/ , https://design-system.service.gov.uk/components/error-message/
24. Details — https://design-system.service.gov.uk/components/details/
25. Confirmation pages — https://design-system.service.gov.uk/patterns/confirmation-pages/
26. MOJ Design System, add to a list ("If you use a 'remove' link, you should ask the user to confirm") (P, repo `ministryofjustice/moj-frontend`) — https://design-patterns.service.justice.gov.uk/patterns/add-to-a-list/

**USWDS (P, repo `uswds/uswds-site`, commit 19 Oct 2026)**
27. Tooltip (when to use, when to consider something else, accessibility) — https://designsystem.digital.gov/components/tooltip/
28. Step indicator (when to use and not) — https://designsystem.digital.gov/components/step-indicator/
29. Complete a complex form (save and resume, summary before submit, keep a record); summary box "3-5 key details" — https://designsystem.digital.gov/patterns/complete-a-complex-form/ , https://designsystem.digital.gov/components/summary-box/
30. Alert and accordion ("Accordions increase cognitive load and interaction cost") — https://designsystem.digital.gov/components/alert/ , https://designsystem.digital.gov/components/accordion/

**Government of Canada (P, repos `cds-snc/gcds-docs` commit 5 Nov 2026 and `canada-ca/design-system` commit 21 Oct 2026)**
31. GC Design System, Details — https://design-system.canada.ca/en/components/details/
32. GC Design System, Error message and Error summary — https://design-system.canada.ca/en/components/error-message/ , https://design-system.canada.ca/en/components/error-summary/
33. GC Design System, File uploader — https://design-system.canada.ca/en/components/file-uploader/
34. Canada.ca interactive questions (dateModified 2021-04-22) — https://design.canada.ca/common-design-patterns/interactive-questions.html
35. Canada.ca subway navigation (dateModified 2026-02-19) — https://design.canada.ca/common-design-patterns/subway-navigation.html
36. Canada.ca Content Style Guide (dateModified 2026-03-09) — https://design.canada.ca/style-guide/

**IRCC (X; all Unconfirmed: no counsel; to be read on canada.ca before any screen relies on them)**
37. Representatives: PR applications online, and the new representative PR portal notice — https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/pr-representatives-online.html , https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/new-rep-pr-portal.html
38. IRCC Portal user guide for representatives (PDF) — https://www.canada.ca/content/dam/ircc/documents/pdf/english/corporate/partners-service-providers/ircc_portal_user_guide_en.pdf
39. Family members, Manage group — https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit/h1b/apply/family-members.html
40. Help Centre: electronic signature — https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=740
41. Help Centre: confirmation after submission — https://www.ircc.canada.ca/english/helpcentre/answer.asp?qnum=028
42. Help Centre: upload file size per account — https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1123
43. IMM 5476 Use of a Representative, and change or cancel — https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5476.html , https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/change-cancel.html

**Immigration and legal case tools (X; vendor pages refused by the network)**
44. Docketwise Smart Form Collections; immigration forms — https://supportcenter.docketwise.com/en/articles/9372029-smart-form-collections , https://www.docketwise.com/features/immigration-forms/
45. Docketwise IQ Data Capture — https://supportcenter.docketwise.com/en/articles/10247778-docketwise-iq-data-capture
46. Docketwise e-filing with USCIS — https://support.docketwise.com/en/articles/8038875-e-filing-forms-with-uscis
47. Docketwise roles per form; DS-260 principal or derivative — https://support.docketwise.com/en/articles/4731838-smart-form-collections , https://supportcenter.docketwise.com/en/articles/9371976-e-filing-form-ds-260
48. Docketwise smart forms (flag and reshare); Smart Forms 3 — https://www.docketwise.com/blog/smart-forms/ , https://support.docketwise.com/en/articles/5791576-smart-forms-version-3-with-packet-assembly-custom-questions-and-templated-intakes
49. INSZoom (Mitratech): questionnaire maps to form; Getting Started step 4 ("Do not correct anything inside the form"); e-Filing Desktop Add-on — https://success.mitratech.com/INSZoom/Help_Articles/E-File_Settings/e-Filing_Desktop_Add-On (help centre; other article URLs in the help centre's Getting Started and Knowledge Base)
50. INSZoom GovNoticeIDP user guide — https://success.mitratech.com/INSZoom/Help_Articles/Support/GovNoticeIDP_User_Guide
51. INSZoom, add another family member — https://success.mitratech.com/INSZoom/Help_Articles/Knowledge_Base/INSZoom_-_How_to_add_another_family_member_when_%E2%80%9C__Add_New_Relation%E2%80%9D_is_not_available
52. LawLogix (Equifax) Notice AI user guide (PDF) — https://assets.equifax.com/ews/lawlogix/assets/Automated-USCIS-Notice-AI-Transcription_User-Guide.pdf
53. Clio Grow, Save Progress — https://support.clio.com/hc/en-us/articles/360043793353
54. Clio Draft Live Questionnaires — https://help.clio.com/hc/en-us/articles/33309999460891-Clio-Draft-Live-Questionnaires
55. Filevine ImmigrationAI help — https://support.filevine.com/hc/en-us/articles/17586153704859-ImmigrationAI
56. Migrawise home, for RCICs, pricing (per-applicant) — https://migrawise.ca/ , https://migrawise.ca/for-rcics/ , https://migrawise.ca/pricing/
57. Migrawise terms of service (practitioner review of AI output) — https://migrawise.ca/terms-of-service/
58. Visto home — https://visto.ai/

**Research (X; nngroup.com and baymard.com refused)**
59. NN/g, progressive disclosure — https://www.nngroup.com/articles/progressive-disclosure/
60. NN/g, wizards — https://www.nngroup.com/articles/wizards/
61. NN/g, tooltip guidelines (27 Jan 2019) — https://www.nngroup.com/articles/tooltip-guidelines/
62. NN/g, 8 design guidelines for complex applications (Nov 2020) — https://www.nngroup.com/articles/complex-application-design/
63. NN/g, empty states in complex applications (19 Sep 2021) — https://www.nngroup.com/articles/empty-state-interface-design/
64. NN/g, error-message guidelines; errors in forms (3 Feb 2019) — https://www.nngroup.com/articles/error-message-guidelines/ , https://www.nngroup.com/articles/errors-forms-design-guidelines/
65. NN/g, visual hierarchy — https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
66. NN/g, confirmation dialogs — https://www.nngroup.com/articles/confirmation-dialog/
67. NN/g, explainable AI — https://www.nngroup.com/articles/explainable-ai/
68. Baymard, inline form validation — https://baymard.com/blog/inline-form-validation
69. Baymard, required and optional fields — https://baymard.com/blog/required-optional-form-fields
70. Baymard, adaptive validation error messages — https://baymard.com/research-articles/adaptive-validation-error-messages

**Open-source form engines**
71. docassemble, logic and dependency satisfaction (P, repo `jhpyle/docassemble` branch gh-pages, `_docs/logic.md`) — https://docassemble.org/docs/logic.html
72. docassemble, groups ("there_is_another") (P, `_docs/groups.md`) — https://docassemble.org/docs/groups.html
73. docassemble, review screens (P, `_docs/fields.md`) — https://docassemble.org/docs/fields.html#review
74. SurveyJS, conditional logic (P, repo `surveyjs/survey-library`, `docs/design-survey-conditional-logic.md`) — https://surveyjs.io/form-library/documentation/design-survey/conditional-logic
75. SurveyJS, save and restore incomplete survey (P, `docs/how-to-save-and-restore-incomplete-survey.md`) — https://surveyjs.io/form-library/documentation/how-to-save-and-restore-incomplete-survey
76. SurveyJS, `showPreviewBeforeComplete` (P, `docs/api-reference/surveymodel.md`) — https://surveyjs.io/form-library/documentation/api-reference/survey-data-model
77. SurveyJS, dynamic panels (X) — https://surveyjs.io/form-library/examples/duplicate-group-of-fields-in-form/documentation
78. Form.io, save as draft (X; the help.form.io repository's copy, last commit 11 May 2023, has no page on this, so it stays X) — https://help.form.io/how/save-as-draft
79. Form.io, submission revisions (X) — https://help.form.io/userguide/submissions
80. Assembly Line style guide, organize fields ("magic number '5'") (P, repo `SuffolkLITLab/docassemble-AssemblyLine-documentation`) — https://assemblyline.suffolklitlab.org/docs/style_guide/question_style_organize_fields/
81. Assembly Line, help in context (P, same repo) — https://assemblyline.suffolklitlab.org/docs/style_guide/question_style_help_your_user/
82. Assembly Line, readability (6th grade, under 20 words) (P, same repo) — https://assemblyline.suffolklitlab.org/docs/style_guide/style_guide_readability/

**Added after review (P)**
83. AWS Textract, item location on a page and the Geometry type (BoundingBox, Polygon) (P, `awsdocs/amazon-textract-developer-guide`) — https://github.com/awsdocs/amazon-textract-developer-guide/blob/master/doc_source/text-location.md , https://github.com/awsdocs/amazon-textract-developer-guide/blob/master/doc_source/API_Geometry.md
84. GC Design System, Input `required` ("adds 'required' after the label") (P, `cds-snc/gcds-docs`, `src/en/components/input/code.md`, commit 5 Nov 2026) — https://design-system.canada.ca/en/components/input/

**Internal:** `reports/verify-2026-11-03/V4-best-in-class.md` (vendor scoring, 3 Nov); `reports/best-in-class-C6.9-A4-2026-11-07.md` (C6.9 rules study); `EXPERIENCE.md`; `PRODUCT.md` §4.

## Drift audit from the tech lead
Kept for the tech lead's drift audit of these seven screens, if one is posted on this PR. It will be taken in here and in each screen's `concept-ux` file.
