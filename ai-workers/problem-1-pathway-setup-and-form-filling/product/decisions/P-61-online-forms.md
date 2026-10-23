# P-61 — Online forms: one form, two channels (founder agreed 23 Oct; end-to-end model in P-62)

Founder request R-76: combinations are filed on paper (PDF), online, or both; online forms must be a source for the combination's fields just like PDFs; say per combination what applies; find the simplest design.

## Facts checked (official IRCC pages, 23 Oct; immigration expert to confirm per program)
* **Most applications are online now; paper is the exception** (disability, certain travel documents, technical failure). Example: sponsorship of adopted children and other relatives became online-only on 23 Sep 2022. Source: IRCC guides 5196, 5553, 5552.
* **The same form can exist in both channels.** In the Permanent Residence Portal the applicant fills IMM 0008, IMM 5669, IMM 5406 and IMM 5562 as *digital forms*; IMM 0008 also has a PDF version for paper. Source: IRCC PR portal and IMM 0008 pages.
* **Mixed applications are normal.** In spousal sponsorship the sponsor still downloads, completes and uploads IMM 1344 and IMM 5532; forms needing a third-party signature (sponsorship forms, IMM 5476) are printed, signed by hand, scanned and uploaded. Source: IRCC spousal sponsorship and PR portal notice (10 Aug 2021).
* **Representatives file through several portals**: IRCC Portal (study, visitor), Authorized Paid Representatives Portal (visitor, study, work, Express Entry, IEC, eTA), Representative PR Portal (most permanent residence). The client signs the declaration in the client side; the representative submits. Source: IRCC representative portal pages.
* **There is no public link per online form.** An application lives in the representative's portal account; after submission it has an **application number** and the client's **UCI**, which is how it is found and linked. Source: IRCC APR portal user guide.
* **The team already decided the output side** (SA-01B redesign, 18 Oct): each program row states how it is filed and which portal (16b); online answers are shown as a "portal sheet" in the portal's order with copy buttons, and a browser extension fills the current screen under strict guardrails (16). What is missing is **ingestion**: how online questions get into the configuration and shared library.
* Known conflict for the founder: SA-01 non-goal AG16-41 ("no portal extension") vs redesign decision 16 (extension). The 18 Oct redesign is newer.

## Design (minimum that covers every case)
1. **One form, two channels.** A government form in the library (code, title) can have a **PDF edition** (file, box map; today) and an **online version** (portal, screens, question order). Both map to the **same shared facts**. Nothing is defined twice.
2. **Each form line in a combination says how it is filed: PDF upload, Online (with portal), or Signed PDF upload** (print, sign by hand, scan). The combination's filing method (online only · online + PDF · PDF only) is **worked out from its lines**, never typed, so it cannot contradict them.
3. **Ingestion, cheapest first:**
   a. Online version of a form that also has a PDF (IMM 0008, 5669, 5406, 5257…): **reuse the PDF's map** (no AI); a person or AI only checks the portal screens for added, removed or reworded questions.
   b. Online-only form (Express Entry profile, portal-only questionnaires): a person uploads **IRCC's instructions or the portal screens saved as web pages** (read by code, like a PDF; corrected 23 Oct, see P-62 §8) as the source → AI drafts the questions and maps them to existing facts → a person reviews. Same review path as PDFs.
   Saved pages come from a **blank or test application**, and code strips any values before storing them (a real page holds a client's data, P-65). With AI off, a person enters or maps the screen's questions by hand.
   c. Later (team, with the extension): **capture mode** records screen labels once while a representative fills a real case.
4. **Default source for fields = the channel the line is filed in** (online by default where it is filed online, per the founder), pre-filled from the PDF map of the same form code when one exists.
5. **Online versions change silently** (no printed edition). A captured version carries its capture date; when screens differ from it (re-capture, or the extension's version check), it is held for **impact review like a new PDF edition** (P-32).
6. **Case side (M3):** the case records, per filing, the **portal** and, once known, the **application number** and the client's **UCI**. Output per line: filled PDF + Validate, or the portal sheet (and later the extension).

## What this changes
* M2 (Screens 02–04): channel per form line, online versions in the Forms library, ingestion paths a and b. M3: portal sheet output and the case's portal reference.
* Demo: combination 3 (spousal sponsorship) becomes the mixed proof (IMM 0008/5669/5406 online + IMM 1344/5532 signed PDF uploads); combination 6 (Express Entry) the online-only proof.
* Not built: logging into portals, scraping, unattended filling (team's guardrails stand).

Unconfirmed: no counsel. Program-by-program channels are Sample until the immigration expert confirms them.
