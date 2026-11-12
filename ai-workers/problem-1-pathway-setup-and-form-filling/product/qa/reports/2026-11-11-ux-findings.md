# qa: confirming the UX lane's two findings (11 Nov)

qa lane, Lead 17's ask. The UX planner's round 1 (`design/ux-2026-11-11/02-baseline-score.md`, on fbfb263c7) is confirmed on main **03dff193d**, on a fresh configured checkpoint (:4475, US$0, live AI off). Check: `prototype/studio/tests/qa/check_ux_uxf25_edition_axe.cjs` (fails 8 lines today; its setup lines and axe at 1440 px pass).

| Finding | qa | Evidence |
|---|---|---|
| **UXF-25 → QA-393** (UX · Minor), part (a) | **Confirmed**: an unknown review round on SAMPLE-VV-FAMILY-1, as the Representative, reads "This review could not be loaded · No such case. · Retry" | `uxf25-unknown-round-1440.png` |
| part (b) | **Confirmed** on 5 pages, none with a heading at any level (their title is a `<p class=font-semibold>`): unknown round, case not found, case page as Client A, Studio page as the case officer, unknown Studio address. Control: the normal case page has its h1 | check lines UXF-25b |
| part (c) | **Confirmed**: Client A's blocked page says "This page is for the case officer"; the case's team has a representative of record too | `uxf25-client-blocked-1440.png` |
| **Edition review axe at 375 px → QA-394** (UX · Minor) | **Confirmed**: To review › New edition (IMM 5476 (11-2025)), default tab, `scrollable-region-focusable` (serious, 1 node): `div.overflow-x-auto` is 770 px wide in 341, with 0 focusable inside and no tabindex. 1440 px: 0 violations | `edition-review-375.png`, `edition-review-1440.png` |

Severity: Minor for both, since neither gives a wrong result. (a) is reached only by a stale or typed address. QA-394 is a WCAG 2.1.1 (A) failure on a staff page at phone width; touch and mouse still scroll it. The Lead may raise either.
Lanes: screens (the shared Notice component and the edition table), tech lead assigns.
