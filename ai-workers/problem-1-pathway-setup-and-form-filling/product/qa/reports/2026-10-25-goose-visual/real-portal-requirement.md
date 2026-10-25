# Real-portal proof — requirement and demo plan (founder, 25 Oct)

This note records a founder requirement so the Lead builds for it. Status: **requirement captured; gated on the
immigration expert + counsel (do not skip).**

## The requirement
1. **Demo = 3–4 combinations (or one hero combination + releases) that cover the channel matrix:**
   - PDF only · Online only · Online + PDF (Mixed) · Online + Signed PDF upload.
   (This is capability C1.6/C1.7 — channel per form line, filing method per combination — already Works on Sample.)
2. **Online ingestion and auto-fill must be proven against the REAL IRCC portal, not only the Sample screens.**
   Today the extension's manifest only allows `.invalid` Sample hosts (`extension/hosts.json`); a production build
   cannot reach a real site. The founder wants this opened to the real portal.
3. **The run flow must be:** select the combination → select the real portal → the system asks for the portal login →
   the founder provides the credentials → the agent (Goose Playwright, or Claude Code's browser) logs in and does the
   capture / fill by itself.
4. **The twin + auto-fill mechanisms must be proven on the real portal too:** a changed portal screen opens
   "Re-capture needed" (C9.3/C9.4) and the extension fills the open screen from confirmed facts (C7.4).

## Gates that must hold first (already in DECISIONS/expert questions — do not shortcut)
- **Immigration expert** confirms the exact portal hosts and which forms file online per combination
  (P-61; expert questions 3, 6, 13).
- **Legal counsel** on automating a government portal. The product labels this "Unconfirmed: no counsel on using
  automation on IRCC or ESDC portals"; the label flips only after counsel signs off.
- Runs on the **Mac** (real browser + founder's credentials); never in a cloud lane.

## Recommended first target (for discussion)
**Individual › Visitors › Visitor visa › IMM 5257 online on the IRCC Portal.** Reason: it is the demo hero
(DEMO.md Combination A), IMM 5257 is online-eligible, and the extension's F2 journey already targets IMM 5257
online — so the Sample proof maps 1:1 onto the real form. The exact portal host still needs the expert.

## What changes in code (for the Lead, once the gates clear)
- `extension/hosts.json`: add the confirmed real portal host(s) and the real API origin (no wildcard, https only).
- The Studio `/extension` page + panel: a "Connect to the real portal" step that prompts for the portal login and
  hands the authenticated tab to the capture/fill flow (today it assumes the Sample screens on :4459).
- A Mac-only demo path (Goose task or `scout.sh`-style) that runs the capture/fill against the live portal.
