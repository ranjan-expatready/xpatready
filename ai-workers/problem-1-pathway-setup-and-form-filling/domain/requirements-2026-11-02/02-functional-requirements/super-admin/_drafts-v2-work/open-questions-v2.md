# SA-01B v2.0 — open questions after harmonising (26 Oct)

Collected from the open-question lists of chapters 1 – 11 after the harmonising pass. Questions a G-ruling (G16 – G35) or the harmonising list (H1 – H19) answered are closed in their chapters and left out here. Where two chapters ask the same question, one row carries both IDs.

## For the product owner

None open. Every question routed to the product owner was answered by G16 – G35 or settled by the harmonising list: ch1 Q1-11 (H10), ch2 Q9 (H11), ch7 Q13 (H3), ch8 Q8-8 (H4), ch8 Q8-9 (H5), ch11 Q9 (H1).

One action carried from a closed question (ch5 Q10, SA1B-D61b): refresh `Release-1-Configuration/scoring-reference/` from the practice engine before the content session.

## For the immigration expert

| ID | Ch | Question | Recommended default |
|---|---|---|---|
| Q1-3 / ch5 Q8 | 1, 5 | Spot-check sample size when a large file-based table is first loaded. | 25 rows drawn at random, or every row if fewer than 25. |
| Q1-7 | 1 | Which 3 – 5 sample families the second person sees before and after a change. | The four answer-key families: Client E, a single applicant, someone with 6 past addresses, accented names. |
| ch2 Q6 | 2 | Which list groups carry identity fields (to recognise the same entry). | Passport (country + number) and status documents (type + number) only; addresses and jobs none. |
| ch2 Q7 | 2 | Which yes/no questions form a background block ("None of these apply"). | The government form's own background and declaration sections. |
| Q3-3 | 3 | Which filing-scope field holds the "requested end of stay" on each row. | One filing-scope date field, entered by the officer at case opening, on work-permit, study-permit and visitor-record rows. |
| Q3-6 | 3 | Which country selects a country-specific entry, and what fields an entry holds. | Country of issue; fields: country, attached items, client text, staff text, source link, date checked, next review. |
| Q3-14 | 3 | Which category holds the new document type "Proof of fee exemption". | Financial; source kind employer. |
| ch4 Q5 | 4 | Is a signature-date box of kind `SIGNATURE`? | The expert marks it per form; ExpatReady leaves it empty. |
| ch4 Q6 | 4 | Does the authority accept two editions on one day (grace period)? | Model it with the optional "accepted until"; filled per edition. |
| ch4 Q14 | 4 | Does IRCC accept barcodes made outside Adobe? | Ask IRCC through its web form in parallel; record the answer when it arrives (a suggestion, not a condition). |
| ch5 Q3 | 5 | (a) Which dates a condition may name; (b) how a 29 Feb birthday counts in a non-leap year. | (a) The case's target filing date, the submission date, the invitation date, any date field on the file, "today"; (b) one year older from 1 March. |
| ch5 Q4 | 5 | The short list of cross-person inputs. | Principal's occupation level, plus the spouse's education, language results and Canadian work years; each addition second-person approved. |
| ch6 Q7 | 6 | Which roles others depend on (dependent-filing warning). | The principal applicant role only. |
| ch7 Q7 | 7 | Is biometrics validity a key-date type? | Yes, as a `DOCUMENT` type: a check, no reminders. |
| ch7 Q12 | 7 | Which government steps are `orderFixed`. | Only steps whose order the authority's own process fixes (for example submission before decision). |
| Q8-6 | 8 | For a filing sent by post or courier, which date is "the date the authority receives the application"? | The officer records the expected receipt date at submission; the fee check uses it and the record stores it. |
| ch11 Q4 | 11 | What starts the LMIA validity clock. | The decision date recorded on the file; the officer edits it when the letter states another valid-from date. |

## For the developers / backend lead

| ID | Ch | Question | Recommended default |
|---|---|---|---|
| Q1-5 | 1 | How often the newsroom feed is read. | Once a day (code constant). |
| ch2 Q1 | 2 | Default privacy mark on a new field. | "Never" (the most private value). |
| ch2 Q3 | 2 | Defaults for a new field. | Re-confirmation Changeable; no pre-set main source or fallback (the AI draft pre-selects). |
| Q3-1 | 3 | Is "a period before an event" the same calculation as "a period from issue"? | Yes: one way, "counted from a date". |
| Q3-5 | 3 | Where the "issued within N months" number sits. | The type holds the IRCC period; a row line may replace it. |
| Q3-8 | 3 | What happens to the built requirement-level `categoryKey`, `instructionsKey`, `notesKey`. | Type-level category and help are the source; the line keeps an optional programme note; `categoryKey` retired. |
| Q3-12 | 3 | Default accepted formats on a new document type. | All upload types of AG-9-2. |
| Q3-13 | 3 | Client alternatives in an all-together set; nested sets. | No to both; sets stay flat. |
| ch4 Q3 | 4 | Which transforms count as reversible for "Also update <client>'s record". | No transform, whole-date DATE and one-to-one ENUM write back; CONCAT, DECIMAL and many-to-one ENUM stay form-only. |
| ch4 Q4 / ch6 Q5 | 4, 6 | Order of `child n`, `parent n`, `sibling n`. | The officer's order on the case; a new child placed oldest first by date of birth; the officer can reorder. |
| ch4 Q7 | 4 | How the Chrome extension recognises a portal screen. | Portal + screen name + the ordered list of labels, compared exactly. |
| ch4 Q8 | 4 | Permission to fetch a screen's answers for the extension. | `agent/form:create` (SA-06 confirms). |
| ch4 Q9 | 4 | Permission to add a library form to a filing. | `agent/form:create` (SA-06 confirms). |
| ch5 Q6 (b, c) | 5 | Case score: store the result or compute on demand; permission key. | Compute on demand with an audit entry only; `agent/assessment:create` (SA-06 confirms). |
| ch5 Q7 | 5 | Where conversions and grids live. | A conversion used by more than one scheme is a reference table; points grids stay scoring definitions; one list for the content team. |
| ch5 Q12 | 5 | Which prospect fields carry to the case, and where the list lives. | A carry mark on the canonical field, starting with the six personal details of SA1B-D62. |
| ch6 Q1 | 6 | Pre-fill of a person's location. | From the country of the current address (Canada → inside, else outside), blank if unknown; the officer confirms. |
| ch6 Q6 | 6 | Size limit of the cross-person input list. | Publish warns above 20 inputs per pack. |
| ch7 Q1 | 7 | The undefined v1.9 word "gate" on a government step. | Drop it: applicability is the line's "only if"; "done" is the person's click. |
| ch7 Q2 | 7 | Adding months to a date. | Keep the day number; if the month has no such day, use its last day. |
| ch7 Q3 | 7 | The built stage pipeline versus platform-standard delivery steps. | Keep the pipeline only as the carrier of client labels until the Filing record exists; no new content; no firm reorder. |
| ch7 Q10 | 7 | `recordKeepingNoticeKey` in the built regulator body. | Keep the optional label; its text states no retention period (SA1B-D33). |
| ch9 Q1 | 9 | Storage of household and filing facts. | Subjects of their own kind in the facts store, owned by the case's principal. |
| ch9 Q2 | 9 | Confidence threshold below which a read value is flagged. | The reader's per-value confidence under 90%, set from the proof of concept. |
| ch9 Q3 | 9 | Values on a migrated past form about a spouse or child. | Proposals for each family member matched by UCI or name plus date of birth; unmatched members listed. |
| ch9 Q6 | 9 | Canadian-region document reading before the region claim is final. | Test it on Canadian permits in the proof of concept. |
| ch9 Q7 | 9 | Retention of unused or dismissed proposals. | Kept with the document under the firm's keep-period setting. |
| ch10 Q5 | 10 | Which pack changes raise the "updated while hidden" note. | Every published change to the item; the note is quiet and only in the list. |
| ch10 Q6 | 10 | Where a single-filing resolve runs on a save. | Inside the save request; moved to a queued job only if the load test shows write p95 above 600 ms. |
| ch10 Q7 | 10 | How long the IRCC-change job may take per firm after a publish. | Every firm's job finishes within 4 hours. |
| ch10 Q8 | 10 | Does a rename apply to open filings? | Yes, at display time. |
| ch10 Q9 | 10 | Existing `WORKFLOW_OVERRIDE` rows. | The backend lead lists them; deleted by migration if no live firm holds one, else kept read-only until removed. |
| ch10 Q10 | 10 | Fair-queue limit K and job-cursor retention. | K = 2 running jobs per kind per firm; cursors kept 90 days after Done. |

## For counsel

| ID | Ch | Question | Recommended default |
|---|---|---|---|
| ch4 Q10 / ch9 Q5 | 4, 9 | Firm-terms line for de-identified counting of hand-fixes across firms. | Build the counters; switch counting on only after the line is in the firm terms. |
| ch9 Q5 | 9 | Consent wording for reading a firm's past filed forms at migration, and the Quebec and Alberta AI notice. | Ready-made wording in AG-16 / SA-05; counsel confirms before release. |

Counts: the product owner 0 · immigration expert 17 · developers / backend lead 33 · counsel 2.
