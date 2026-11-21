# R1.47 reader verdict (fresh reader, P-339; ran nothing; main caee4edb1, 21 Nov)

Read only: files, git, `gh api`. No app, test or server run; US$0. Paths: S = `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio`.
Evidence checked myself: queue run 44900458199 = success on ca0db960a ("merged #2633, #2800"); the nine suites read from their job logs at the stated counts (pf13b_images 32, pf13_branding 30, pf19b_sending 42, pf19b2_ses 44, pf19p_platform_mail 68, pf19r_every_sender 21, pf19r_senders 27, pf12_walls 100, pf12b_bypass_audit 56; 0 failed each). walks run 44903737606 = success on caee4edb1. `git diff ca0db960a caee4edb1 -- S` = 11 files, all FO-5s retainer (screens, routes, j_53); `retainers/service.ts` `send()` sends no email ("FO-6 adds … the one email", :548) and holds no mail or message port, so the CI proof stands for main.

## 1 Per clause

| Clause | How met | Evidence |
|---|---|---|
| "every email" | Route only (structural, checked by a scanner) | `send/messages.ts:116-117` firm path: `emailBrandOf` then `emailLayout` on every stored message; `:153` platform account path uses the same `emailLayout` (ExpatReady, neutral, not replyable). `check_pf19r_every_sender.ts:44-59` classifies all 14 holder files (invitation, reset notice, identity-provider codes, complaint reminder, support, storage notices, plan notice, booking ×3, sign-up ×2, case side link/code) through MessagePort with exact counts; unlisted sender or stand-in binding fails. 21/21. |
| "both sides" | Screens (front office, staff) + Route (case side) | Front office booking and Team invitation by screens (qa walk B1, B2; j_48 W1, W2). Case side: `person-link.ts:95-103` `mail()` calls `MessagePort.send` with the case's firm; `demo_message` copies (`:215,227,342`) are written only after it answers QUEUED and are not sends; j_48 W3 checks the case link email arrives "from the firm" with "Sent by". |
| "one layout" | Route | One renderer, `layout/email-layout.ts:16-34` (react-email tables, inline styles). `ports/messages.ts:117` `layout()` is the fake's plain string, replaced before storing (`messages.ts:117,153`). pf13_branding DW12 checks tables/inline styles. |
| "the firm's branding" | Route + by-API set; panel absent | `branding.ts:81-88`: sender name (else operating name), colour (else neutral #1f4e79), footer, logo stable link sized 48 px high, cap 300 wide. Drawn at `email-layout.ts:20,21,28,31,32`. Tagline, banner, favicon never drawn (P-629; pf13 DW10, pf13b DW9). |
| "checked on every send path" | Met for routing; content checked on 4 paths | Routing: every_sender (all paths). Content: booking, invitation, case link (j_48 "Sent by", From name, DW4); logo/colour/footer on the MessagePort path (pf13 DW5/DW8, pf13b DW5) and on booking + invitation (qa walk). Other paths share the one `send()`, so the same code draws them. |

Bypasses: none found. Sign-up's two emails are platform account mail from ExpatReady in the same layout with neutral branding: no firm exists yet, so "the firm's branding" cannot apply; in scope and consistent with AG-16-2 ("neutral until set"). The identity provider's emails go through `session/email-sender.ts:40` (firm's MailPort, so firm-branded); its deployed wiring is outside the repository (Not verified, stated in PF-19r). `demo_message` writes are copies, not a send path.

## 2 Branding
In the email: logo (stable public link, width/height attributes), brand colour (header rule), footer (address, phone, licence text), sender name (From display name and header, "Sent by"). Email signature is stored but applied by templates (PF-19c, R1.45), not by the layout: outside R1.47's done-when. The settings panel is PF-13 part 2 (R1.23; AG-16-70's "one layout area" and AG-1-9's live preview are that screen). R1.47's done-when is about what the email carries, so setting the values by API (`PUT /api/platform/branding`, `/branding/logo`, Owner) is an acceptable stand-in for its proof; until R1.23 lands a firm cannot brand itself by any screen.

## 3 Gate A
`tests/qa/check_qa_r147_brand_walk.ts` tests what it claims: B0 sets colour, footer, PNG logo by API (:83-88); B1 books through the public page in a browser (:98-109) and asserts logo `<img>` on `/api/public/firms/sample-firm/branding/logo?v=` with width and height, `3px solid #0b5394`, the run-unique footer, "Sent by" (:90-95,111), then fetches the logo (200, image/png, nosniff, PNG bytes, :112-114); B2 invites from the Team screen and asserts the same layout and the same logo link (:117-123); B3 firm B carries nothing of A and its own "Sent by" (:127-130); B4 opens the lead page and reads `[data-messages-panel]` with a state word and "from <firm>" (:133-138), axe (:139), no page errors (:140). 9 checks, matching 9/9. Reading the HTML from `GET /api/demo/platform-inbox` is sound: an email's HTML is on no screen. Ending at R1.48's first step (Messages box reads the email's state) is correct. Limits: case side and sign-up emails are not in the walk (covered by j_48 W3 and pf19r/pf19p); finally-block resets the logo but not colour/footer (isolated copy, harmless). I could not verify the two runs.

## 4 Parts merged (P-606)
Parts named earlier: PF-19b part 2 (merged; pf19b2_ses 44/44 on main's queue run), PF-19r parts 1-3 incl. the case side's move QA-495 (merged; `built/PF-19r.md`), PF-13 part 1a (merged; pf13_branding) and 1b #2633 (merged in ca0db960a). Open PRs: 47, none names R1.47, PF-13, PF-19 or email layout. BUGS.md: no row names R1.47 or row 47. BACKLOG: no open part names R1.47 (PF-13 part 2 is R1.23's).

## 5 Findings
1. Minor · Ambiguity: P-629's words "Emails and PDFs keep only the logo and the firm's name" read literally exclude colour and footer, which the layout draws per AG-16-2 and the Lead B brief (`design/lead-b-briefs/PF-13.md:10,25`). The intent (no tagline, banner, favicon) is met; worth one line from the Lead so the record does not conflict.
2. Minor · Gap (records): `MVP-CHECKLIST.md:98` row 47 still "Shaped", names PF-19b only; `BACKLOG.md:657` PF-13 "not built"; CAPABILITIES R1.47 row still Partial (16 Nov). Update with this verdict.
3. Minor · Gap (test): logo, colour and footer are asserted on booking, invitation and the direct MessagePort path, not on the case side's link email; it uses the same `send()` (`person-link.ts:97-98`), so risk is low.
4. Minor · Gap (outside the repository): the deployed identity provider's custom email sender wiring is Not verified (PF-19r already says so).

## 6 Verdict
**Works**, confidence high (about 85%). Every send path found reaches the one react-email layout, the firm's logo, colour, footer and sender name are drawn and checked, the walk is sound, and no part remains open. The branding panel is R1.23's, not a missing part of R1.47.
