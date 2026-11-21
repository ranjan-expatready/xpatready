# qa capability R1.47 (Q4) — 21 Nov 2026, main caee4edb1

Lane: qa Q4, cloud copy, asked by Lead 15. Opus 5.5, medium effort (P-781). Live AI off, US$0.
Trigger: PF-13 part 1b (#2633, merged 08df1b37f), the last part of R1.47 (STATE). Fresh reader: `2026-11-21-r147-q4/reader-verdict.md` (Opus, ran nothing, P-303): Works, high.

## Verdict
**Works.** Every email the firm sends, and the case side's link and code emails, goes through MessagePort into the one layout (`email-layout.ts`). That layout carries the firm's branding: logo, brand colour, footer and sender name. Sign-up mail, which goes out from ExpatReady before any firm exists, uses the same layout with neutral branding. All parts have merged (PF-19b part 2, PF-19r parts 1-3, PF-13 parts 1a and 1b). No open PR, BACKLOG part or BUGS row names R1.47.

## On GitHub's runners (P-339)
* **Packs:** merge-queue run **44900458199** (success; queue commit ca0db960a, "merged #2633, #2800").
  * Its studio tree differs from main caee4edb1 only by #2802's retainer files (FO-5s part 1, J-53), which send no email. The reader checked this.
| Suite | Result | Job |
|---|---|---|
| check_pf13b_images | 32/32 | 136836009837 |
| check_pf13_branding | 30/30 | 136836009875 |
| check_pf19b_sending | 42/42 | 136836009839 |
| check_pf19b2_ses | 44/44 | 136836009837 |
| check_pf19p_platform_mail | 68/68 | 136836009896 |
| check_pf19r_every_sender | 21/21 | 136836009860 |
| check_pf19r_senders | 27/27 | 136836009831 |
| check_pf12_walls | 100/100 | 136836009941 |
| check_pf12b_bypass_audit | 56/56 | 136836009831 |
* **Journey on main's head:** walks.yml run **44903737606** (j_48 on caee4edb1, success). It covers booking, the staff invitation and the case side's link email, each in the one layout from the firm's name. j_48 checks "Sent by <firm>", not the logo. qa's walk below covers the logo.
* R1.47 has no journey of its own (no `j_47.ts`). j_48 joins the same send paths.

## Gate A by screens (P-317, P-348 (3))
`tests/qa/check_qa_r147_brand_walk.ts`: **9/9 on two fresh isolated copies** (qa_r147 :4471, qa_r147b :4472) of main's app code, headless at 1440 px.
* **B0, setup:** the Owner sets colour #0b5394, a footer and a PNG logo through the API. The panel for this is PF-13 part 2, which belongs to R1.23's row, so this step stands in for that screen.
* **B1:** a visitor books Free consultation on `/book/sample-firm` by screens. The confirmation carries:
  * the logo's stable link `…/api/public/firms/sample-firm/branding/logo?v=…`, with width and height;
  * `3px solid #0b5394`, the footer, and "Sent by Sample immigration firm".
  The link serves the PNG (200, image/png, nosniff) without sign-in.
* **B2:** the Owner invites from the Team screen. The invitation has the same branded layout and the same logo link.
* **B3:** firm B's invitation carries none of firm A's logo, colour, footer or name.
* **B4 (R1.48's first step):** the lead page's Messages box lists the visitor's email as "Delivered", "from Sample immigration firm". Axe is clean.
* No page errors. Screenshots are in `2026-11-21-r147-q4/screenshots/`.
* A firm email's HTML is shown on no screen (people read it in their mail client), so it is read from the demo inbox, as J-48 does.

## Bugs
0 Blocker · 0 Critical · 0 Major · 0 Minor new in BUGS.md. The reader's Minors are records or test-depth notes (below), not defects in the product.

## Not tested
* A headed walk: this cloud copy has no display. The script runs headed with `HEADED=1` on the Mac.
* 400 and 1024 px: the screens walked are J-48's, which J-48 checks at 1024 and 1440 px. The email layout itself is 600 px wide.
* The deployed identity provider's own emails: their wiring is not in the repository (PF-19r note).
* Coverage (c8) was not run: this is a capability round, not a milestone.

## Questions for the Lead
1. **P-629's wording (Minor, Conflict):** P-629 says emails keep "only the logo and the firm's name". The layout also draws the brand colour rule and AG-16-2's footer, as the PF-13 brief asks. Recommendation: one line in P-629 saying the colour and footer stay too.
2. **Stale records (Minor):** `MVP-CHECKLIST.md` row 47 still says "Shaped", and BACKLOG's trace line for PF-13 (around line 657) says "not built". Both are yours to update.
3. **Test depth (Minor, later):** no check asserts the logo on the case side's link email. It goes through the same `Messages.send` → `emailLayout` code as B1 and B2.

## Suggestions
* Add a line to J-48 (or a J-47) that asserts the logo on each of its four send paths, so a regression is caught in the Works set. *Later · Scaffolding.*
