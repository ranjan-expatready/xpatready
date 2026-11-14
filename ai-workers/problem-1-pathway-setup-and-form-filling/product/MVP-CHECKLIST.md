# MVP checklist: what we are tracking toward the first real firm

**What this page is.** One checklist that answers "what are we tracking toward the MVP?": (A) every capability in the agreed scope and where it stands, (B) what "done" means for one row, (C) what must be true before the first real firm's data goes in.
**Where the numbers come from.** Scope: the capability map, draft 6 (baseline P-586: 112 rows, Build 101, Optional 8, Held 3). Rows that build it: `BACKLOG.md`, section "Full MVP: platform (PF) and front office (FO)" (rev 14.1) and the Bake rows (BK-). Proof: `qa/CAPABILITIES.md` on `main` 4eec4ed2 (93 of 98 Works; M2 60/60, M3 27/29, T 6/8). Open pull requests: GitHub API, read 12:3x IST. Launch conditions: `RULES.md` (as of P-590).
**Date.** 14 Nov 2026, 12:3x IST. Draft for the tech lead's review; not a decision.

---

## A. Scope to build (from the map)

**How a row's status is set.** *Not shaped*: no BACKLOG row with a Done when for all of it (a row that is only named counts here). *Shaped*: every part has a BACKLOG row with a Done when. *In PR*: every part has an open pull request. *Merged*: built on `main`, not yet Works. *qa Works*: qa's independent Works verdict on `main`. **A row takes the status of its least advanced part**; the line names the parts that are further on. \* = proven in the reference app for the one Sample firm; the work to make it run for many firms is in map row 3 (walls) and has no row of its own yet.

**Counts (101 Build rows):**

| Status | Rows |
|---|---|
| qa Works\* | 6 |
| Merged | 8 |
| In PR (the whole row) | 0 (6 rows have a part in PR: 5, 6, 27, 29, 37, 41, through #1741, #1742, #1744) |
| Shaped | 44 |
| Not shaped | 43 (19 with no BACKLOG row at all, 5 with a part that has none, the rest only named) |

Module names follow P-575 and P-584: **Platform** (sign-in, firms, billing, messages, automation, portal login, complaints), **Front office** (leads, booking, retainers, signing, compliance checks), **Client money**, **Case side** (the release Lead's: cases, documents, forms, the configurator), **Audit**.

### A. Foundations
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 1 | Hosting, data, backups and logs in Canada | Platform (running it) | PF-7 merged; PF-8 cloud deploy named only | Not shaped (needs the founder's AWS account) |
| 2 | Database | Platform | PF-3 (#1728) | Merged |
| 3 | Walls between firms | Platform + case side | PF-12; case-side tables: **none yet** | Shaped (PF/FO only); **gap: case-side walls** |
| 4 | Each query runs inside its firm | Platform | PF-12 | Shaped |
| 5 | Staff sign-in with two-step, passkeys, lock-out on leaving | Platform | PF-4 (In PR #1744), PF-4b, PF-4s | Shaped |
| 6 | Permissions: deny by default, own versus all, money and licence apart | Platform | PF-4 (In PR #1744), PF-6 | Shaped |
| 8 | Audit trail nobody can edit | Audit | AUD-1, AUD-2 named only | Not shaped |
| 9 | Background jobs, schedules, reminders | Platform | PF-14 | Shaped |
| 10 | Checking every input | All | **none yet** (Zod is in the app; each row's own tests) | Not shaped (**gap**) |
| 11 | Server framework | Platform | PF-7 | Merged |
| 12 | Screen framework, one UI kit | Platform | PF-1 | Merged |
| 13 | Logs, metrics, error reports, alerts | Platform (running it) | **none yet** | Not shaped (**gap**) |
| 14 | Backups with a tested restore | Platform (running it) | PF-8 named only | Not shaped |
| 15 | Secrets in a managed store | Platform (running it) | **none yet** (PF-7's committed-key check is merged) | Not shaped (**gap**) |
| 16 | Automated testing | Platform | PF-7 | Merged |

### B. The firm as our customer (self-serve SaaS)
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 19 | A firm is created once, with plan, trial and owner | Platform | PF-3 merged; PF-5 | Shaped |
| 20 | One entitlement check; seat and plan limits; downgrade check; invite many at once | Platform | PF-5, PF-15, PF-4c, PF-6 | Shaped |
| 21 | Our own invoices with sales tax | Platform | PF-5 (Stripe Tax) | Shaped |
| 22 | Suspend, cancel, failed-payment hold, data download on exit | Platform | PF-5; PF-11 named only | Not shaped |
| 23 | Firm logo, colour, sender name, favicon, banner | Platform | PF-13 | Shaped |
| 24 | Each firm's own web address | Platform | **none yet** (sub-domain or one address: open, map item 8) | Not shaped (**gap**) |
| 89 | Public pricing page | Platform | PF-5s | Shaped |
| 90 | Self-serve sign-up, email check, trial with no card, private links, trial banners | Platform | PF-5, PF-5s, PF-16 | Shaped |
| 91 | Plans, change, cancel, invoices, card update, yearly plans, refunds, billing emails | Platform | PF-5, PF-5s, PF-16 | Shaped |
| 92 | Firm profile, offices and time zones, licence-number check | Platform | PF-5s, PF-18a, PF-18s, PF-4c | Shaped |
| 93 | Our team's console; health per firm; support button | Platform | PF-4s, PF-17, PF-18b, PF-18s | Shaped |
| 100 | Recorded acceptance of our terms, privacy notice and data agreement | Platform | PF-5 | Shaped |

### C. Enquiries, leads and pipeline
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 26 | Public enquiry form, hardened against abuse | Front office | FO-2, FO-4, FO-4b | Shaped |
| 27 | Every lead carries a source | Front office | FO-1a (In PR #1742), FO-2 | Shaped |
| 28 | Consent recorded per purpose | Platform + front office | PF-19a, FO-2 | Shaped |
| 29 | One person record; duplicate warning; safe merge | Front office | FO-1a (In PR #1742), FO-9a, FO-9b, FO-9s | Shaped |
| 30 | Lead lists, filters and board | Front office | FO-4 | Shaped |
| 31 | Stage kinds; won by signature; totals per currency | Front office | FO-2, FO-4 | Shaped |
| 32 | Assign, take, reassign; Unassigned; assignment rules | Front office | FO-4, FO-10 | Shaped |
| 33 | Phone numbers | Front office | FO-2, FO-9a | Shaped |
| 34 | One person's data as an export, logged | Front office (privacy) | **none yet** | Not shaped (**gap**) |
| 35 | Contacts import from a spreadsheet | Platform | PF-10 named only | Not shaped |
| 36 | Simple automation, message many with consent | Platform + front office | PF-20, PF-20s, FO-10, FO-12b, FO-12c, FO-12s | Shaped |
| 95 | Custom fields and saved views | Platform | PF-22 named only | Not shaped |
| 98 | Corporate clients, employers, LMIA | Front office + case side | FO-2b; LMIA work on the case side: **none yet** | Not shaped (**gap: case-side part**) |
| 108 | Conflict-of-interest check | Front office | FO-13, FO-13c, FO-13s | Shaped |
| 110 | Client identity check | Front office | FO-13, FO-13i, FO-13s | Shaped |

### D. Booking
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 37 | Public booking page; no double booking | Front office | FO-1b (In PR #1741), FO-3 (API); booking screens: **none yet** | Not shaped (**gap: screens**) |
| 38 | Time zones from booking page to invite | Front office | FO-3 | Shaped |
| 39 | Staff calendar screen | Front office | **none yet** | Not shaped (**gap**) |
| 40 | Calendar invite files | Front office | FO-3 | Shaped |
| 41 | Staff hours and time off | Front office | FO-1b (In PR #1741), FO-3; screen: **none yet** | Not shaped (**gap: screen**) |
| 42 | Reschedule or cancel by link; outcomes; consult record | Front office | FO-3; staff screen: **none yet** | Not shaped (**gap: screen**) |
| 43 | Two-way Google or Outlook calendar sync | Front office | FO-3s named only | Not shaped (Google review is an outside clock) |
| 104 | Consultation agreement signed before the first consult | Front office | FO-3c, FO-5, FO-5s | Shaped |
| 112 | Video meeting links on bookings | Front office | FO-3v (Meet and Teams through FO-3s) | Shaped |

### E. Templates and messages
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 45 | Firm templates, field picker, preview with a real record | Platform | PF-19c, PF-19s, FO-5p | Shaped |
| 46 | Template text editor (a plain text box) | Platform | PF-19s | Shaped |
| 47 | One email layout | Platform | PF-19b | Shaped |
| 48 | Sending, delivery state, bounces, the firm's sender name | Platform | PF-19b, PF-L | Shaped |
| 49 | Consent gate before every send; unsubscribe | Platform | PF-19a, PF-19b | Shaped |
| 50 | In-app notifications; personal notification settings | Platform | PF-18a, PF-18s (settings); the notification list itself: **none yet** | Not shaped (**gap: part**) |
| 52 | Connected mailbox; WhatsApp (no SMS) | Platform + front office | FO-11 (WhatsApp); PF-19m named only | Not shaped (Google mail review: weeks) |

### F. Retainer and e-signature
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 53 | Retainer with the regulator's 26 items; versioned until sent | Front office | FO-5, FO-5b, FO-5s (FO-5r research) | Shaped |
| 54 | E-signature with evidence; send any document for signature | Front office | FO-6, FO-6v (held for the BoldSign sandbox, P-561), FO-6d, FO-6ds | Shaped |
| 55 | Withdraw, re-issue, decline, signed offline | Front office | FO-6, FO-5s | Shaped |

### G. Client money
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 56 | Client invoices, tax by province, government-fee line | Client money | FO-7a, FO-7b; screens FO-7s named only | Not shaped (screens) |
| 57 | Card payment of invoiced fees into the firm's operating account | Client money | FO-7c; FO-7s named only | Not shaped (screens) |
| 58 | Trust or operating on every payment; per-client ledger; "to move" list | Client money | FO-7a, FO-7t; FO-7s named only | Not shaped (screens) |
| 59 | Money arithmetic | Client money | FO-7a | Shaped |
| 60 | Deposit invoice prepared on signature | Client money | FO-7b | Shaped |
| 96 | Reversals, refunds, credit notes, payment plans, write-offs | Client money | FO-7b, FO-7p, FO-7r; FO-7s named only | Not shaped (screens) |
| 111 | Client statement and period exports for the accountant | Client money | FO-7r; FO-7s named only | Not shaped (screens) |

### H. Client links and portal
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 61 | Sign and pay by single-use link | Front office + client money | FO-6, FO-7c | Shaped |
| 62 | Client login portal; progress stream with "last update" | Platform | PF-4p named only; FO-14 | Not shaped |
| 101 | Client answers and uploads through a secure link | Case side | C6.2, C6.16 Works | qa Works\* |

### I. Documents
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 63 | Per-person checklist with status words; reject with reason | Case side | C6.4 Works | qa Works\* |
| 64 | Upload that resumes after a dropped connection | Not named | **none yet** | Not shaped (**gap**) |
| 65 | Private storage in Canada: firm-prefixed keys, versions, encryption | Not named | **none yet** (FO-5's `FilesPort` is a local folder only) | Not shaped (**gap**) |
| 66 | Virus scan; nothing served while scanning | Not named | **none yet** | Not shaped (**gap**) |
| 67 | File-type check | Not named | **none yet** | Not shaped (**gap**) |
| 68 | Preview for staff review | Not named | **none yet** | Not shaped (**gap**) |
| 69 | Read log, fingerprint, keep-period reminder | Not named | **none yet** | Not shaped (**gap**) |
| 70 | Expiry, translation and notarisation flags | Not named | **none yet** | Not shaped (**gap**) |

### J. Case work
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 72 | Case with applicants, representative, pinned release | Case side | FO-8 (hand-over from a won prospect); C6.1 Works | Shaped |
| 73 | Stages moved by events | Case side | C6.17 Works | qa Works\* |
| 74 | Government deadlines that remind; working days with holidays | Case side | built (map); no qa capability row | Merged |
| 75 | Tasks: My Tasks, Unassigned, handover | Case side | **none yet** | Not shaped (**gap**) |
| 76 | Notes; one timeline per record | Case side | built (map); no qa capability row | Merged |
| 77 | Submission number and UCI; decision, close, reopen | Case side | C8.2 Partial; BK-17, B5-filings | Merged |
| 79 | Firm dashboards and reports | Not named | **none yet** | Not shaped (**gap**) |
| 102 | Find a person or case by name, email or file number | Case side | **none yet** | Not shaped (**gap**) |

### K. Government forms, the pathway set-up, AI on top
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 80 | IRCC forms per applicant from one set of answers | Case side | C7.1, C7.8 Works; C7.2 Partial; BK-10, BK-16, BK-22 to BK-24 | Merged |
| 82 | Readiness check; staff approval per form | Case side | C7.6, C7.10, C8.3 Works | qa Works\* |
| 83 | Conditional questions and fields | Configurator | C4.4 Works | qa Works\* |
| 84 | Pathway set-up: hierarchy, versioned releases, cited rules | Configurator | M2 60/60 Works | qa Works\* |
| 99 | AI on top of the guardrails: proposed values, document reading | Case side | C3.1, C6.5, C7.5 Works; BK-14; model choice open (founder) | Shaped |
| 106 | Pathway assessment AS-1: Express Entry and FSW scores | Front office + configurator | FO-15, AS-1 named only | Not shaped |
| 107 | Pathway assessment AS-2: five provincial streams, client copy | Front office + configurator | AS-2 named only | Not shaped |

### L. Privacy registers and audit views
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 85 | Data-request register with legal hold | Not named | **none yet** | Not shaped (**gap**) |
| 86 | Breach register with firm notices | Not named | **none yet** | Not shaped (**gap**) |
| 87 | Our access to a firm's data, logged and shown to the firm | Audit | AUD-1 named only (PF-12's bypass role is audited) | Not shaped |
| 88 | The firm reads its own audit log | Audit | AUD-1 named only | Not shaped |
| 97 | Tamper-evident audit chain | Audit | AUD-1, AUD-2 named only | Not shaped |
| 105 | Keep periods; a leaving firm is closed, not deleted | Audit + platform | AUD-2 named only; PF-5 closes at 90 days | Not shaped |
| 109 | Complaints record | Platform | PF-21, PF-21s | Shaped |

**Optional (8, out of the first build, P-572; kept as BACKLOG X-1 to X-8):** 7 custom roles · 17 feature switches · 18 French and Quebec tax · 25 demo firm · 51 outgoing webhooks and API keys · 71 reading text from scans · 78 full-text search · 81 ordinary PDF form filling.
**Held (3, BACKLOG X-22):** 44 pay when booking · 94 card payment into trust (P-567) · 103 our own signer (only if BoldSign fails a P-561 condition).

### Flags
**Map rows with no BACKLOG row at all (19):** 10, 13, 15, 24, 34, 39, 50 (the list), 64, 65, 66, 67, 68, 69, 70, 75, 79, 85, 86, 102. Most sit where no module owner is named yet (documents, dashboards, privacy registers, running the service).
**Map rows with a part that has no row (5):** 3 (walls on case-side tables, before the first real firm, P-575), 37, 41, 42 (booking screens: FO-3 is API only and FO-4 has no booking screen), 98 (LMIA on the case side; after the first five firms, P-568).
**Map rows only named, not shaped (15):** 1 and 14 (PF-8), 8, 87, 88, 97, 105 (AUD-1, AUD-2), 22 (PF-11), 35 (PF-10), 43 (FO-3s), 52 (PF-19m), 62 (PF-4p), 95 (PF-22), 106 (FO-15, AS-1), 107 (AS-2); plus the money screens FO-7s (rows 56, 57, 58, 96, 111).
**BACKLOG MVP rows with no map row:** PF-9 (firm set-up checklist; nearest map row 92) and FO-3b (paid consults, which touches Held row 44 except where the fee is earned at booking). PF-2 (technology gate) and PF-L (libraries) are enablers, not capabilities. The case-side BK- rows serve map rows 77, 80 and 99.
**Built in the map but with no qa capability row:** 74 and 76. The case-side "touch-up" for many firms (rows 63, 73, 74, 76, 77, 80, 82 to 84) has no row of its own.

---

## B. Done for one row

A row is done only when all of these hold, in this order:
1. **Shaped first.** A duplicate check line (P-526); a Done when with a pass and a fail test per business rule; one row, one PR, under about 800 lines, split schema → API → screen (P-436 (4)). A new screen has an approved concept with a best-in-class section (P-223 (4), P-392) and a walk by screens before the first review (P-352).
2. **Done-when tests pass**, each business rule with a passing and a failing test (BACKLOG standard; QUALITY D16). US$0 unless the founder approves a stated cost (P-175).
3. **Reviewer Approve on the exact head sha**: a fresh Opus reviewer posts `Reviewer: Approve <sha>` (P-303, P-277, P-385); at most two rounds, then the Lead decides (P-293 (3)).
4. **Breaker** for money, schema, permissions or a new screen (P-278); the Lead reads the diff itself before labelling anything touching money, permissions, schema, a migration or the pipeline (P-423).
5. **Green CI on GitHub's runners** on that sha, then the label `review: approved` (P-385).
6. **Merged through the queue**, never by hand (P-189, P-384).
7. **qa's independent Works verdict**: the pack is green on `main`'s head on GitHub's runners, re-run independently, judged by a fresh Opus reader that ran nothing (P-290, P-303, P-339, P-432). No pack, no server or a fixture-only run is Not tested, never green (P-405).
8. **Gate A**: qa walks it by screens to the next capability's first step (P-348 (3)); journey score 8 or more out of 10 with no criterion at 0 (QUALITY).
9. **Gate B**: no open Major or Critical on the capability; a Major keeps it Partial (P-305 (3), P-317).

---

## C. Ready to launch to the first real firm (production readiness)

Drawn from Google's production readiness review, the AWS Well-Architected pillars (security, reliability, operational excellence, cost, performance), OWASP ASVS level 2 and Canada's PIPEDA fair information principles; only items that apply to about 100 Canadian firms (P-562). Status: **Done** · **In progress** (work open or partly merged) · **Decided, not built** · **Not started**. Legal points are **Unconfirmed: no counsel**.

### Security
| # | Item | Status | Decision |
|---|---|---|---|
| C1 | Walls between firms in the database, with a cross-firm test as a release gate (PF/FO tables, money tables) | Decided, not built (PF-12 shaped) | P-575, P-584 |
| C2 | The same walls on the case-side tables | Not started (no row) | P-575 |
| C3 | Two-step sign-in for every staff member; passkeys proven on a real pool | In progress (PF-4 #1744; PF-4b needs the AWS account) | P-566, P-567 |
| C4 | Our own staff on a separate sign-in pool; their access to a firm's data logged and shown | Decided, not built (PF-4s, PF-12, AUD-1) | P-581, P-571 |
| C5 | Outside security test (penetration test) before the first firm | Not started (founder to book) | P-551 |
| C6 | OWASP ASVS level 2 self-check: sign-in, sessions, access control, input, files, errors | Not started | no decision yet |
| C7 | GitHub safety settings (secret scanning, push protection, Dependabot alerts, no bypass) | In progress (steps 1-7 on; 8-11 by PRs) | P-583 |
| C8 | Known vulnerable libraries fixed (28 Dependabot alerts, 8 high in the app) and gold-class code only | Not started (SEC-1 to shape) | P-587; SEC-1 no decision yet |
| C9 | Secrets in a managed store; no secret in the repository | Not started (no row; PF-7's key check merged) | no decision yet |
| C10 | Uploads scanned for viruses and checked by type before anyone opens them | Not started (rows 66, 67 have no row) | no decision yet |
| C11 | Private repository before the first real firm's data; private backup copy | In progress (backup copy Done 12:03 IST; notice and SECURITY.md Done, #1737; switch to private at the gate) | P-589, P-590 |

### Reliability and performance
| # | Item | Status | Decision |
|---|---|---|---|
| C12 | Hosting, database, files and logs in Canada on managed services (AWS ca-central-1) | Not started (PF-8 named; AWS account not opened) | P-559, P-586 |
| C13 | Backups with point-in-time restore, a copy in ca-west-1, targets 15 minutes of data loss and 4 hours to recover, one restore drill passed | Not started (PF-8 named) | P-586 (map row 14) |
| C14 | Background jobs that retry and never run twice | Decided, not built (PF-14) | P-586 |
| C15 | Speed for about 100 firms within the STANDARDS §9 budgets, checked under load | Not started | P-562 |

### Operational excellence
| # | Item | Status | Decision |
|---|---|---|---|
| C16 | Logs, metrics and alerts that wake a person | Not started (row 13 has no row) | no decision yet |
| C17 | Named people for on call | Not started | P-551 |
| C18 | Incident and breach response with named roles; a breach register; notices to firms and, where required, to the Privacy Commissioner (Unconfirmed: no counsel) | Not started (row 86 has no row) | P-551 |
| C19 | Support route: help button and tickets, a support inbox, a named support person | Decided, not built (PF-18b, PF-17); named person not started | P-551, P-581 |
| C20 | Deploy to the cloud with a way back to the last good version | Not started (PF-8 named) | no decision yet |
| C21 | Outside accounts with review clocks opened (AWS, SES production access, Google, Stripe, BoldSign sandbox; Meta and Zoom pages read) | Not started (founder; start 16 Nov) | P-580, P-586 |

### Cost
| # | Item | Status | Decision |
|---|---|---|---|
| C22 | Running cost sized for about 100 firms, with a budget alarm on the cloud account | Not started | P-562 |

### Privacy and legal (PIPEDA principles)
| # | Item | Status | Decision |
|---|---|---|---|
| C23 | Counsel reads the retainer, trust handling, terms, data location and licences (Unconfirmed: no counsel) | Not started (founder engages) | P-551 |
| C24 | Privacy policy, terms of service and data-processing agreement written, and each firm's acceptance recorded (Unconfirmed: no counsel) | Recording decided, not built (PF-5); documents not started | P-566; documents no decision yet |
| C25 | A named privacy officer (accountability) | Not started | no decision yet |
| C26 | Data in Canada, and a written statement of what leaves (Stripe, BoldSign's details, AI unless the Canada model is chosen) (Unconfirmed: no counsel) | Not started (statement not written; AI choice open) | P-559, P-561 |
| C27 | Consent per purpose and a consent gate before every message | Decided, not built (PF-19a, PF-19b, FO-2) | P-574, P-584 |
| C28 | A person's access request answered: export of their data and a data-request register | Not started (rows 34, 85 have no row) | no decision yet |
| C29 | Keep periods; a leaving firm closed at 90 days, exported to the archive before data leaves; data download (PF-11) before any real firm | Decided, not built (AUD-2, PF-11 named) | P-571, P-586 |
| C30 | Audit chain exported daily to S3 Object Lock (compliance mode, ca-central-1) | Decided, not built (AUD-1, AUD-2 named) | P-571 |
| C31 | Trust ledger's outside review and the accountant's read (Unconfirmed: no counsel) | Not started (founder books) | no decision yet (map open item 4) |
| C32 | The College's rules read for the conflict, complaints and identity checks (Unconfirmed: no counsel) | Not started | P-579 |
| C33 | A narrow launch scope written for the first firm | Not started | P-551 |
