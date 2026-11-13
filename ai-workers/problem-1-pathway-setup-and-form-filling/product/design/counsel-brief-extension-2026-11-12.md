# Counsel brief and expert ask — the portal-filling Chrome extension, 12 Nov 2026

Written by a read-only Fable planner for Lead 24, after the founder's answers recorded as P-495 (three lanes from 16 Nov; book counsel now; we package, the team publishes). Sizing behind it: `design/chrome-extension-sizing-2026-11-12.md` §5. Part A is for the founder to send to counsel. Part B is for the founder to send to the immigration expert. Both use roles, not names.

---

## Part A — Brief for counsel (one page)

**Who we are and what we ask.** Expat Ready builds software for Canadian immigration firms. We plan a Chrome browser extension that helps a licensed representative (an RCIC, a lawyer or paralegal, or a Quebec notary) complete IRCC's online portal screens from the firm's own case file. We ask five yes/no questions, each with a short reason. Every point below is **Unconfirmed: no counsel** until you answer.

**What the extension does.** The representative signs in to the portal themselves. On each screen they click "Fill this screen". The extension fills that one screen with the case's answers, which the firm's staff have already checked, and highlights anything it could not fill. The representative reviews the screen and clicks Next and, at the end, Submit themselves.

**What it never does.** It never signs in or sees a password or security code. It never clicks Next or Submit. It never fills a declaration or a signature. It never works on many files unattended. It keeps no client data in the browser. It never puts client values in logs; the record of each fill holds only screen, person, time and a count. If a portal screen has changed since we last mapped it, it fills nothing.

**What we have found ourselves (read 12 Nov 2026).**
* The IRCC Portal's terms and conditions (ircc-services.canada.ca, terms-and-conditions page, seen through a search excerpt because the page would not load for us) say: "IRCC can revoke access if you fail to abide by the Terms and Conditions of Use". They also require users to keep identification numbers confidential and to certify that information is true, accurate and complete.
* We found no public IRCC, Canada.ca or GCKey clause on automated or assisted filling. IRCC's general terms page (canada.ca, dated 2024-11-01) does not mention it. The terms a representative accepts at sign-in are not public.
* IRCC's notice on the Permanent Residence portal for representatives (canada.ca, 2021-08-10) says representatives "fill out the forms (digital and PDF formats) and upload the supporting documentation".
* Our own product decision P-152 (29 Oct 2026) lets a person save portal screens to build our form library. It is a business decision, not a legal reading.
* Other vendors advertise portal autofill for Canadian immigration, according to our team's research of 18 Oct 2026. We have not verified how they comply.

**The five questions (each Unconfirmed: no counsel)**

1. **IRCC's terms.** Do IRCC's portal terms, including the terms shown at sign-in, allow a representative to use a browser tool that fills screen fields from their own case file, if the representative signs in themselves, checks every screen and clicks Next and Submit? *Yes / No / Yes with conditions (which).* If you can, please read the sign-in terms in a representative's account.
2. **Professional duty.** Does working this way meet the representative's duties: the College of Immigration and Citizenship Consultants' Code of Professional Conduct for RCICs, and the law-society rules for lawyers and paralegals? *Yes / No / Yes with conditions.*
3. **Client data.** (a) May a client's answers pass through the representative's browser on the firm's computer to fill the portal, under the firm's usual client consent, with nothing kept in the browser? *Yes / No / Yes with added consent wording (please give it).* (b) Where the page cannot be read directly, may we send a screenshot of an empty or masked screen, with no client values, to an AI provider in the US that keeps no data? *Yes / No / Canada only.* This links to our earlier open point on processing outside Canada (P-133).
4. **Saving portal screens.** May a representative save empty portal screens from their own account (the portal's labels and layout, with no client data) and give them to us to build screen maps? Does Crown copyright or anything in the portal terms stop us keeping those labels in our product? *Yes / No / Yes with conditions.*
5. **Liability.** If a value the tool filled is wrong and the representative does not catch it before Submit, does the responsibility rest with the representative alone, or could the software provider share it? What must our terms with firms and our on-screen wording say? *Representative alone / Shared / Depends (on what).*

**What depends on your answers.** We build and test only on sample screens with test data until you answer; that work is not waiting on you. Your answers decide three things: whether the extension may be used on IRCC's real portal with a client's data, whether it may be shipped to any firm, and whether the AI screenshot fallback may run on real portal screens.

**Please reply with:** yes, no or conditions for each question, any wording we must show, and anything we have not asked that you think matters.

---

## Part B — Ask to the immigration expert (spike SP-2, about 1 hour)

**Why.** Before we write the extension's code, we need to see how IRCC's portal pages are built: whether their fields keep the same internal names each time a page loads, and whether parts of the page are hidden from ordinary reading. Three empty screens from each portal tell us. No client data is needed, and none should be in the files.

**Which portals** (the ones our six sample pathways use; please correct the list if a pathway is filed elsewhere today):
1. **The portal you use for temporary residence for clients:** visitor visa, study permit from outside Canada, work permit with an LMIA from inside Canada. Please tell us which portal this is today and its web address as the address bar shows it after you sign in.
2. **The Authorized Paid Representatives Portal**, for Express Entry, including a provincial nomination through Express Entry.
3. **The Permanent Residence Portal for representatives**, for spouse or common-law partner sponsorship.
4. *Optional, only if you use it:* ESDC's LMIA Online, for an employer's LMIA (high-wage position).

**Which 3 screens in each portal:**
1. The first screen after you start a **new, blank** application or profile. It usually has drop-down questions.
2. A **personal details** screen for the principal applicant (names, date of birth, country of birth).
3. A screen that **repeats per person or per row**: family members, addresses, education or work history, whichever you reach first.

**How to save them with no client data:**
* Sign in yourself, as usual. Never share your password, security code or representative ID with anyone, including us.
* Start a new, blank application. **Type nothing into any field.** If a screen can only be reached by answering an earlier one, stop there and write down which screen it was. That tells us enough.
* Never submit. If the portal lets you, delete the empty draft afterwards.
* For each screen, save it **twice**: load it and save it, then reload the page and save it again (we compare the two saves). In Chrome use *File > Save page as… > "Webpage, Complete"*. Then also use *Print > Save as PDF* once.
* Name each file `<portal>-<screen>-<1 or 2>.html`, for example `aprportal-personal-details-1.html` and `aprportal-personal-details-2.html`.
* Write down the sign-in page's web address and the address after sign-in (addresses only, no screenshots of sign-in).
* The page header may show your own name or account details. That is fine for this purpose; the files stay on the founder's Mac and are never shared or committed.

**Where to put them.** Send the files to the founder by the firm's usual secure way of sharing files. The founder places them on the Mac in `sources/portal-screens-2026-11/<portal>/`. That folder is never pushed to GitHub (AGENTS rule 1). Please add a short note with the portal names, the addresses and any screen you could not reach.

**Time.** About 1 hour in total. Your time has not been measured; please tell us how long it took.

**Legal note.** Saving empty screens from your own account is covered by our decision P-152, but counsel is asked to confirm it (Part A, question 4). **Unconfirmed: no counsel.**
