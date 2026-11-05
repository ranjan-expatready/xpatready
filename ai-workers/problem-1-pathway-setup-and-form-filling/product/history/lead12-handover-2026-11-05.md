# Lead 12 → Lead 13 hand-over (5 Nov, written about 13:08 IST, at about 410k tokens)

Read word for word: `RULES.md`, `STATE.md`, DECISIONS P-349 to P-353 (all on branch `lead/2026-11-05-lead11c`, yours to continue, with this note). Times only from `TZ=Asia/Kolkata date`.

## The founder's rules from today (he repeated these; do not lose them)
* **Every question or approval goes in AskUserQuestion, one at a time, recommendation first, never inside a report.** He works over Remote Control and misses text questions and the wrap-up box.
* **Do it now, never "at the next check".** He corrected this on B88.
* **Every report carries the factory view:** the queue and whether M2 is first, wait against 1 hour, batch failures, the bottleneck and its mitigation (`tools/factory-board.sh`). Say what is unmeasured.
* **Do not rely on PR updates from cloud lanes; they may halt.** Read claude.ai/code in the built-in browser every check, and open any row showing Awaiting input, Failed or a long idle. `show_pane preview` plus `resize_window` 1440 makes the page render. SendMessage wakes an idle cloud lane; confirm in `ListAgents`. My miss: #1074's questions 1-5 waited over an hour, because I read only each PR's latest question. Read them all.
* Archive finished sessions yourself in the browser (menu, Archive); seven and three done today.

## Critical path at 13:05 IST
**qa `local_7bb326e9`** is running gate A on #1058 at `fca8aa17a` (holds C2.6 and C4.11; needs 8 or more; tell B82 on PASS) and reproducing the founder's bug. qa is about 800k+ tokens with a hand-over note saved: replace it at about 90%.
**Founder's bug (his first test, failed):** Super visa › "Choose the page and find again", Start Up Visa page, Saved: "Too big: expected string to have <=120 characters". Read, not run: `finder.tsx:90` puts the 148-character address in `idempotencyKey`, limit 120 in `contracts/form-library.ts:30`. Cloud fix requested (task_3963f8e1; title "Fix: finder refuses long canada.ca page addresses"). Check it started. He asks how to be sure of quality; see the reply he got, and bring him the answer when qa says whether any walk ever tried another option.
**C4.11:** #1058 → #1036 B83 (`local_6c0fdf86`, last diff-only pass; told at 13:03 to continue) → #1053 B86 (`local_a4308bc5`, merge conflict after #1057, told at 13:03; `C4.11-26` is a failing line naming B82 until it can run; migration read, OK) → #1068 B88 (holds; message it when B86 is approved, it merges B86's final head; one diff-only check).
**C10.1:** #1057 merged. #1062 B78 (`local_c2bbbd2c`) caused its own red check and said so; fix, third Opus check, label. B97: B81 (`local_d798901d`) as a warm lane. #1050 B79a (running), #1052 B79b, stacked. Row 12b (B99, P-349): after C4.11 lands; Acrobat access was granted to Lead 12's session only, so ask him once more (`request_access` with `Acrobat`; the dialog is on the Mac's screen; his first answer came back denied). B105: B86's own small PR after #1053's label.

## M3 (cloud, P-351, at most 3-4 lanes; M2 first on `demo.ts` and the Mac qa)
B104 #1084 running (gates allow-listed; screen is B106) · #1073 C6.4 running (panel) · #1072 C6.11 round 2 on `b1872f158` · B108 design running: when it says "Design ready for the tech lead", bring it to him · Paused: #1075 C7.3, #1054 C3.16, #1074 C6.12 (held; answered; restart after J7 Stage 1) · Cloud qa `qa cloud: M3 re-score` does M3's gate A; not yet told; tell it when B104 is ready.

## Numbers at 13:05 IST
M2 57/60 by #1078, merged (Left: C2.6, C4.11, C10.1). M3 0/17. Weekly 88%, about 6.5%/h since 11:03, limit near 15:00; he should have the new account ready by about 14:30 (`RESUME-ON-NEW-ACCOUNT.md`, untested). Paid US$0.56 at 08:51. Disk 17 GB, load 13. ETAs, mine and unproven: C2.6 15:00, C10.1 except 12b 15:30 at risk, C4.11 18:00, M2 60/60 19:00-20:00.

## Standbys and records
Lead 14 `local_95c57cad-96cf-4352-8f00-f19b1f0657c3` is next; top up at his next typed turn. Records on this branch have no PR: open one and ask him to name it for the label (guard). Lead 2, 10, 11 not archived while lanes sit under them. Lanes still route to Lead 11 when not told; it relays.
