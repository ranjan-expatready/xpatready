# B116: the release asks Background 1 a), Background 6 and the research-contact consent (C10.1 row 12b)

**Where it lands.** B116 lands with row 12b in **one PR, #1123** (tech lead, 6 Nov): its commits are on `claude/forms-b99-validated-copies`, which is stacked on #1052 and #1125. The builder's session cannot edit #1123's body (the same GitHub block as its comments), so this note is the record. The branch `claude/forms-b116-own-unmapped` was only a staging branch and has no PR.

**Why.** The founder ruled on #1123 (6 Nov ~03:15 IST, "Add the questions (Recommended)"): row 12b closes only when the product itself fills every box IMM 5257's own Validate insists on. No hand ticks count. The tech lead's Validate of B99's copies stopped at Background 1 a), and a practice pass (not evidence) showed that Background 6 and the research-contact consent stop it too. No saved AI answer mapped any of the three, so nothing asked them.

**What changed.**
* `api/src/own-question.ts` (B52's door, `POST /editions/:id/form-fields/own-question`) now also takes a Yes/No form field that nothing fills yet (no decision, or "filled by hand").
  * The box is mapped to the question in the form's own Yes and No codes (`yesNoCodes`: exactly one Yes and one No printed); the person is the form's subject.
  * The words come from the reading's printed question. Where the reading prints a neighbour's words, the form's question is quoted, and it is taken only when the form's saved text holds it exactly (`inFormText`, `prototype/expected/source-text/<file>.xfa-template.txt`). IMM 5257's consent box carries Background 6's caption in the reading, and its heading is cut at 120 characters.
  * Undo restores the earlier decision. A draft that only held the ask over a released row is removed, so the release sees no change.
* `samples/own-yes-no.json` (data, Sample, Unconfirmed: expert; nothing hard-coded, P-319): the three boxes are added for the Visitor visa's IMM 5257, each with its label and meaning, plus the consent's quoted question.
* `api/src/demo.ts` passes the quote through.
* `samples/sample-family-imm5257.json`: the Sample family answers No to all three, as E1's Sample did.

**Result on the configured checkpoint** (test copy `b99t`, US$0, live AI off):
* Release 1 maps the three boxes as `yes_no_code:Y/N`, quoting the form.
* All four applicants are asked the three questions (the child under 18 included), answered and confirmed.
* Each copy writes N in the three boxes:
  * Client A and Partner: 66 values written;
  * Child and Child 18 or over: 63.
* The two boxes still open are Taiwan and Israel passport. The form makes them required only when the passport is Taiwan's or Israel's (its own `TaiwanPIN` and `IsraelPassportIndicator` scripts), and the tech lead's practice pass confirmed they do not block.

**Tests.** `tests/check_forms_b116_own_unmapped.ts`: 16 checks covering the pass case (release map, every applicant asked, copies), the fail case (words not in the form's text, a box with no Yes/No, a quote on a worked-out box), and undo.

**Not done here (follow-ups).** The Form fields page's "own questions" list still shows only worked-out Yes/No boxes, so a person cannot yet start this ask from that screen. The route takes it, and the checkpoint uses it. The field list's wrong captions for the consent, Taiwan and Israel boxes come from the reading (`p1/inventory/imm5257e.inventory.json`), and the reading itself is unchanged.

**Reviews (Opus, P-303).**
* **Round 1 (`741e920a2`):** changes requested. M1 (undo could roll back a later change) and M2 (the quote check was too loose) were fixed in `418ed9fa1`, along with m3, m5 and m6.
* **Round 2 (`decf90095`):** changes requested.
  * M1: a saved Validate was matched on answers only. Now the hash of the values the copy writes must match too (`valuesHash`).
  * m2: "none apply" is said only for the groups `samples/sample-family-imm5257.json` lists.
  * m3: only rows after the "Same as" question, in the form's own order, are emptied.
  * Evidence: on two fresh loads, the family facts hash and the values hash are identical per person, and identical to the round-2 copies under Validate.
* **Left as follow-ups:**
  * an undo after the ask was released has no test;
  * a field withdrawn on To review sends its box to "no decision", not back to "by hand";
  * Yes/No codes containing "/" or ";" are not checked;
  * a resolver role such as `subject/parent_1` keeps its id in the family hash (this fails safe: it is never counted);
  * `samples/validated-imm5257.json` is evidence and is reviewed as such;
  * a question quoted after a caption that has no "?" can still pass the quote check.

## Question for the tech lead (CI shard 6 on `aaf2372f7`; 6 Nov, written by the builder, who cannot post on #1123)

**What fails, and whether the saved AI pairs still replay: they do not.** On "the six", B116's three questions join Visitor visa's question list, so the list file changes from `vv.single-ae2133b8a398` to `vv.single-fd6bb52d92bd`.
* That list is an input, with its checksum, of two saved AI pairs:
  * the question conditions (`p2/jobs/studio-qd-conditions-…-83a49fd2.json`, live 5 Nov 01:11 UTC);
  * the PQR picks (`…-fc52039a.json`, live 5 Nov 01:35 UTC).
* A saved pair replays only for the inputs it read, so neither replays any more.
* Fresh copies at `aaf2372f7`:
  * `check_forms_b86_door`: 41/45. Besides the pin, "the saved pair proposes the condition on Other family name" lands on "decide", and so do Done when 3 and BR-6.
  * `check_forms_b114_condition_other_combination`: 56/62. Besides the pin, "the saved run offers the condition card" is 0, and its four follow-ons fail.
* The configured checkpoint does not replay these pairs (its row 8 is rules only). So C10.1 is unaffected: 27/27 and 48/48 on fresh copies.
* Only three suites name the old list: B86, B114 and B88-spread.

**Options** (live AI off; nothing paid has been run):

| | What | Cost | Quality |
|---|---|---|---|
| **(a) Recommended** | The three B116 boxes are asked by the **configured checkpoint only**. `samples/own-yes-no.json` marks them for it, and the six's loader skips them. The six keep list `ae2133b8a398`, so both saved pairs replay unchanged and B86, B114 and B88 pass as pinned. Row 12b stays green: the checkpoint's copies still write the three answers. | US$0, about 1 hour, no schema | Honest: no saved answer is reused for an input it did not read. The cost: the six's Visitor visa does not ask the three questions, as on `main` today, so the product's two Sample loads differ for one release. That goes on the hardening list, to close with (c). |
| (b) Re-key the saved pairs, no AI call | Let a saved pair replay when the new list only **adds** questions, and record "not seen by the AI: 3 questions". | US$0, about half a day | The replay contract changes (the AI and money machinery, so a breaker is due). The pairs never considered the three questions as conditions or picks: low risk for Background 1 a), Background 6 and the consent, but it is still a reply to an input the AI did not read. Rewriting the saved files' input names instead would misstate what the AI read: never. |
| (c) New paid run of both pairs with the new list | Run the condition pair and the PQR-picks pair live (two rounds each, claude-opus-5-5), then repin B86, B114 and B88 to `fd6bb52d92bd`. | About **US$0.56**: the 5 Nov runs cost 0.143 + 0.150 (conditions) and 0.136 + 0.133 (picks). Needs the founder's Go (no live switch on a check copy). | Best: the AI reads the true list. The risk: new answers may differ, for example no longer proposing the Other family name condition that B86 is built on. B86 and B114 may then need rework beyond a repin. The list also moves again with every new question, which is fragile by design. |

**Recommendation: (a) now, and (c) later in the hardening pass**, when the founder approves a paid refresh of the six's saved pairs. (a) keeps M2's evidence intact at US$0, and it does not reuse any AI answer for an input the AI did not read.

## Paid re-run of the two saved pairs (option (c)): costs written before the run
* **Ruling.** Lead 21 chose option (c); the founder chose it in Lead 21's chat at 05:59 IST.
* **The founder's Go in the builder's own session.** First a US$1.20 cap. Then, after the plan showed a worst case above it, **"Go, worst US$4.87"**. One attempt; retries only for temporary errors (P-295).
* **Plan.** `/combinations/:vv/draft-qd/plan`, mode Live, on a fresh copy of the six (`b116live`), plan `4dfe373d…360f`. It reads the question list `vv.single-fd6bb52d92bd`.
  * Step 5, conditions, two rounds: worst US$2.51.
  * Step 6, PQR picks, two rounds: worst US$2.36.
  * **Total worst US$4.87**, against US$23.97 left in the ledger.
  * Usual about US$0.56, from the 5 Nov runs on the earlier list.
* **Live switch.** Set on this copy's server only for this run, then off. Model: claude-opus-5-5.
* **Outcome of the builder's attempt (06:4x IST): refused before any call. US$0, nothing sent.**
  * The guard (`p2/screen.ts useTicket`) marks each launch ticket used by creating a file in the shared spend-ledger folder. This session's sandbox may not write there, so the create failed and was reported as "launch ticket already used". Both AI steps ended "could not start on this computer, so nothing was sent and nothing was charged".
  * The live switch was closed straight after.
  * The founder chose that another session runs it: Lead 21, from the main copy, with "Go, worst US$4.87" typed there.
