# C11.8 — Saved offered for IMM 5645 (walk, 4 Nov, main 9caa043b + this pack)

1440 px, Chromium, configuration author, own isolated copies (:4452, :4453), live AI off, stand-in launcher, US$0. The screenshots come from `acceptance/C11.8.test.ts` run with `SHOTS=product/screens/C11.8-saved`.

| Screenshot | Setup and path | What a person sees |
|---|---|---|
| `fixture-imm5645-draft-with-ai-1440.png` | Fixture (POST /demo/load {}); IMM 5645 added to Visitor visa through the intake and read; Forms › IMM 5645 › **Draft with AI** | Saved is selected: "Saved answers for each of its 4 parts (it was drafted in parts): used together." The button reads **Use Saved (US$0)** |
| `six-imm5645-draft-with-ai-1440.png` | The six (Demo › Load sample). IMM 5645 is already drafted from its saved parts by the load, so its row shows "Review AI proposals". The dialog opens through `?draft=<form>`, the link a failed Live run's "Use Saved (US$0)" gives | The same: Saved is selected, and the button reads **Use Saved (US$0)** |
| `*-imm5645-part-missing-1440.png` | The same setups, with part 2's saved answer hidden (`STUDIO_HIDE_SAVED_RUNS`, isolated copy only) | Saved is closed: "Saved answers for 3 of its 4 parts only: it waits for Live, so it is never half-filled." |

Before (qa, main 83f846a52, `c118-imm5645-dialog-main.jpg`): Saved was greyed, with "No saved AI answer for this form yet". #762 (af7cdd91) added part matching.
