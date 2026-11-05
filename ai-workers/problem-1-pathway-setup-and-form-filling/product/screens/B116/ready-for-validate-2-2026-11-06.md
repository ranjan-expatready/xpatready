# Ready for Validate — tech lead (round 2, after B116; 6 Nov 03:23 IST)

This is the record. The builder's session cannot post on GitHub: `gh` fails its certificate check in the sandbox, and a direct API call was refused.

**How the copies were made.** The product made four IMM 5257 copies of the fixed Sample family's case on branch `claude/forms-b116-own-unmapped` (head `741e920a2`). That branch is stacked on #1123 (B99), which is stacked on #1052 and #1125. They came from the configured checkpoint loader on test copy `b99t` (:4454, case `SAMPLE-VV-FAMILY-1`). US$0, live AI off.

**Checks on every copy.** Every written value reads back, and DocMDP and UR3 verify. Each copy now writes **N** on Background 1 a), Background 6 and the research-contact consent. These are the Sample family's own answers, confirmed in the questionnaire, not hand ticks.

Folder: `~/Library/Application Support/Claude/side-session-notes/local_8acced9f-c0a1-4b80-b010-d655c20778fe/b116-round2-2026-11-06/`

| Copy | File | Written | SHA-256 |
|---|---|---|---|
| Client A | `imm5257-client-a.pdf` | 66 | `9ea941d18f848e0c19da3e1fa886cc5e05ac5f8031cb028d7b48429e31a44524` |
| Partner | `imm5257-partner.pdf` | 66 | `e50817ea9e7a22e518fe3b0ae558a60c01ea5f6e916761970c3955f5ae5887e6` |
| Child (born 2016) | `imm5257-child.pdf` | 63 | `013d69c138316fe398fcad4a5b5361f9fff3034d57248865f71e17c81aa2acaf` |
| Child 18 or over | `imm5257-child-18-or-over.pdf` | 63 | `053d4a05bf0509c2243c47fa9ef69112ca74d17cdb3deab0a8ac8aea3ae01a00` |

**What to do.** Please save each validated file beside its copy as `imm5257-<who>.adobe.pdf`, then tell the builder. Keep `b99t` on :4454 running: the read-back goes through its upload door.

**Still open, not expected to block.** Taiwan passport and Israel passport stay empty. The form makes them required only for a Taiwanese or Israeli passport (its own `TaiwanPIN` and `IsraelPassportIndicator` scripts), and your practice pass on round 1 confirmed they did not stop Validate.
