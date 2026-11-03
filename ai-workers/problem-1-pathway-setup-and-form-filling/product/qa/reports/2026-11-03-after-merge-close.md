# qa after-merge, close — 3 Nov 04:40 UTC (main 4ca3d396)

The founder's decision (via Lead 5, 03:55 UTC): all lanes close after the PRs in flight. This is the qa lane's last records PR. US$0, live AI off.

* **#643 (UX-A finding 4) → C11.10 stays Works.** Identifiers are behind Details, saved AI answers are named by form and date, and the condition editor works by name. `check_uxa4_details_browser` 47/47, with no regression in the UX-A part 1–3 checks (56/56, 47/47) or the library pages.
* **P-288 is on main (#646):** C11.10 Works; C11.14 cites it (bulk accept, row G-CORE B5, #647 approved).
* **M2 52/60.** Not Works: C3.4, C4.11, C5.1 (held), C9.1, C10.1, C11.7, C11.8, C11.14. Each row says what it needs; most need paid runs on the founder's Go.
* **Open bugs to carry:** QA-176 (Major, narrowed: checker runs to record), QA-162 (Major, C4.11 step 5), QA-165 (Major, narrowed: 6 fields), Minors QA-173, QA-175, QA-177, QA-178, QA-179.
* **For the next qa session:** #647 (G-CORE B5, C11.14 AT-4) to score when it merges. How to run checks in a cloud copy is in `2026-11-03-after-merge-0030.md`.
