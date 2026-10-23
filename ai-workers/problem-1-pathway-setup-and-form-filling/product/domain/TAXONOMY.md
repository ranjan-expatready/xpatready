# How Canadian immigration maps to Pathway › Program › Category › Sub-category

Status: **Lead analysis, 21 Oct 2026 — the immigration expert confirms the actual lists.** Purpose: prove the structure captures every kind of case before we configure it, and name the two places where it needs explicit links. Program and form names below are examples labelled for testing the model, not authored pack content.

## 1. The definitions (each level answers one question)

| Level | Question it answers | Test to apply | Source |
|---|---|---|---|
| **Pathway** | Who is the applicant on the government application: a person, or an employer/organisation? | Who signs and is named as applicant on the IRCC/ESDC form | SA-1B-50 |
| **Program** | Which area of immigration? | Groups applications staff think of together | SA-1B-50 |
| **Category** | Which application does the firm open? | One government application type: its own forms, fee and decision | SA-1B-50, 64 |
| **Sub-category** | Which variant changes the questions, documents or forms? | Only if content really differs; otherwise "Not applicable" | SA-1B-50 |
| **Combination** | The last level present — one filing type | Owns one configuration, released as versions | SA-1B-55 |

**Not levels:** family members (roles on lines, each person gets their own filing — D19, SA-1B-74), stage of a multi-step route (linked combinations, §3), and inside/outside Canada (a per-person condition on one row — D13 — unless IRCC treats them as different applications, e.g. spousal sponsorship, where the expert makes separate sub-categories).

## 2. Are Individual and Corporate really separate? Yes — with one explicit link

* **Configuration is fully isolated.** An employer's application (e.g. an LMIA) asks employer facts and uses employer forms; a worker's application asks the worker's facts and uses the worker's forms. No question, form or rule is shared by inheritance across pathways.
* **"LMIA-based" under Individual is correct, but the label confused you, so it changes.** That row is the *worker's* work permit application that relies on an LMIA; the LMIA itself is the *employer's* application under Corporate. New labels: Individual › Work permits › Employer-specific work permit › **With an LMIA** / **LMIA-exempt (employer offer)**; Corporate › LMIA › High-wage / Low-wage …
* **The link that must be modelled:** the worker's combination is **supported by** the employer's combination. On a case, the employer's LMIA (number, decision letter, position) becomes a fact and document on each linked worker's case, instead of being retyped. SA-1B-54 ("categories that usually follow or support each other") and SA-1B-70 (one LMIA case = one occupation at one location, positions linked to workers' cases) already allow it; we make it a master (domain/MASTERS.md "Linked combinations").
* **Open naming question:** a household hiring a caregiver files an LMIA but is not a corporation. Recommendation: keep the data value "Corporate" (team spec), label it **"Corporate and employers"** in the workspace switch; the expert confirms.

## 3. Multi-step journeys — linked combinations, one case

A journey with several government applications is either a **route** inside one category (Express Entry: Profile → Permanent residence application, SA-1B-66, P-24) or **separate categories joined by a "follows" suggestion** (study permit → post-graduation work permit; provincial nomination → federal PR), worked as **one case with filings in sequence** (SA-1B-65..68, D10). Answers carry forward; each filing pins its own release (D18). The tree does not get a "stage" level.

## 4. Validation — 20 real kinds of case

| # | Case | Maps to | Holds? |
|---|---|---|---|
| 1 | Family of four visiting from outside Canada | Individual › Visitors › Visitor visa; one case, a filing per person, roles on lines | Yes |
| 2 | Student abroad, spouse needs a work permit, child comes too | Three combinations in one case: Study permit (principal), Open work permit › Spouse of a student (spouse), Visitor or study (child) | Yes (D19) |
| 3 | Graduate applies for a post-graduation work permit | Individual › Work permits › Open work permit › Post-graduation; **follows** Study permit | Yes |
| 4 | Worker with a job offer backed by an LMIA | Individual › … › Employer-specific › With an LMIA; **supported by** Corporate › LMIA | Yes, with the link |
| 5 | Employer needs an LMIA for one high-wage role | Corporate › LMIA › High-wage | Yes |
| 6 | Employer needs 10 workers, same occupation and location | One Corporate LMIA case with 10 positions, each optionally linked to a worker's case; a different occupation is a different case | Yes (SA-1B-70) |
| 7 | Worker hired without an LMIA (employer offer via Employer Portal) | Individual › … › LMIA-exempt; **supported by** Corporate › Employer offers › Offer of employment | Yes, with the link |
| 8 | Express Entry from profile to PR | One category "Express Entry"; sub-categories Profile and Permanent residence application as route steps 1 → 2; stream differences are conditions (P-24) | Yes (route) |
| 9 | Provincial nomination via an employer stream, then federal PR | Provincial nominee combinations per province and stream (category = province, sub-category = stream) **followed by** the federal PR combination; employer side, where a province requires it, is a supporting Corporate combination | Yes; expert confirms per province |
| 10 | Spouse sponsorship, applicant abroad vs in Canada | Two sub-categories (IRCC treats them as different applications); sponsor is a role on the same case | Yes (D13 exception) |
| 11 | Parent visiting for long stays | Individual › Visitors › Super visa (sub-category: parent or grandparent) | Yes |
| 12 | Adult and child apply for citizenship together | One combination; the minor's form chosen by an age condition on the line | Yes (not a level) |
| 13 | Visitor extends stay from inside Canada | Separate category (a different application from a visa) | Yes |
| 14 | Person who lost status applies for restoration | A condition/option inside the extension combination | Yes |
| 15 | PR card renewal; travel document abroad | Individual › PR status documents › … | Yes |
| 16 | Visitor changes to student inside Canada | Study permit combination with an inside-Canada condition (or its own category if the expert says the application differs) | Yes |
| 17 | Start-up founder needing a designated organisation's letter | Individual; the letter is a document — the organisation is not the firm's client | Yes |
| 18 | Household hiring a caregiver | Corporate (employer) LMIA **supports** the caregiver's Individual work permit | Yes; label question in §2 |
| 19 | Employer answers a compliance inspection | Corporate › Compliance › Inspection response | Yes |
| 20 | Same family member on two programs over time | Separate filings in one case or linked cases; profile facts reused | Yes |

**Outside Release 1 unless the expert adds them:** Quebec-selected programs (SA-1-65), refugee claims and appeals before the IRB.

## 5. Where the model could still break, and the guard

| Risk | Guard |
|---|---|
| Sub-categories created for things that are really conditions (location, family size) | Rule BR-5; the concept and review check every new sub-category has a content reason |
| Same label means different things in different programs | Uniqueness only within a parent; stable keys; never merge by label |
| Four levels not enough for province × stream × stage | Stage is a link, not a level; province is the category, stream the sub-category |
| Employer data retyped on worker cases | "Supported by" link carries named facts and documents |
| A combination edited while cases run on it | Releases are frozen; filings pin their release (D18) |
