// The configured checkpoint decides and applies the replayed field-map drafts (api/src/features/checkpoint/
// 040-field-map-review.ts reviewOrder) in one order whatever order their jobs started in (Lead 39 on #1396, 9 Nov): the
// first draft that lands a new shared field sets its meaning, and the review sheet of a form names a form field with no
// printed caption by that meaning, so an order that changed from load to load gave IMM 5257 two sheets (123a97599291 and
// 666775af9fcc) and a saved paid review could not be keyed on the checkpoint. Each rule with a passing and a failing case:
// the same drafts started in any order are reviewed in the same order and the same one shows the edit and the return; the
// order is by the form's file name, then the saved answer it replays; a different set of drafts gives a different order.
// Pure: no database, no model call (US$0).
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_checkpoint_review_order.ts
import { reviewOrder } from "../api/src/features/checkpoint/040-field-map-review.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const t = (s: number) => new Date(Date.UTC(2026, 10, 9, 7, 0, s));
const fileOf = new Map([["a1", "imm5257e.pdf"], ["a2", "imm5707e.pdf"], ["a3", "imm5645e.pdf"], ["a4", "imm5604e.pdf"]]);
const job = (id: string, attachmentId: string, s: number, runFile: string, proposed: number) => ({ id, attachmentId, startedAt: t(s), runFile, detail: { counts: { proposed_fields: proposed } } });
/** The same four saved drafts (IMM 5645 in two parts), as two loads may start them. */
const drafts = (starts: number[]) => [
  job("j-5257", "a1", starts[0], "studio-fieldmap-imm5257e-live-20261102t101500000z-aaaaaa.json", 40),
  job("j-5707", "a2", starts[1], "studio-fieldmap-imm5707e-live-20261102t101600000z-bbbbbb.json", 40),
  job("j-5645-p2", "a3", starts[2], "studio-fieldmap-imm5645e-p2of4-live-20261103t114907160z-953caf.json", 12),
  job("j-5645-p1", "a3", starts[3], "studio-fieldmap-imm5645e-p1of4-live-20261103t114747028z-54bbc7.json", 12),
  job("j-5604", "a4", starts[4], "studio-fieldmap-imm5604e-live-20261102t101721572z-047c72.json", 30),
];
const ids = (x: { id: string }[]) => x.map((j) => j.id).join(",");
const one = reviewOrder(drafts([1, 2, 3, 4, 5]), fileOf), two = reviewOrder(drafts([5, 4, 3, 2, 1]), fileOf), three = reviewOrder(drafts([3, 1, 5, 2, 4]).reverse(), fileOf);

ok("checkpoint order pass: the same drafts, started in another order (and listed in another order), are reviewed in the same order", ids(one.order) === ids(two.order) && ids(one.order) === ids(three.order), [ids(one.order), ids(two.order), ids(three.order)]);
ok("checkpoint order pass: by the form's file name, then the saved answer it replays (IMM 5645's part 1 before part 2)", ids(one.order) === "j-5257,j-5604,j-5645-p1,j-5645-p2,j-5707", ids(one.order));
ok("checkpoint order pass: the draft that shows the edit and the return is the same whatever the start order (most proposals; a tie goes to the first in the order)", one.showcase === "j-5257" && two.showcase === "j-5257" && three.showcase === "j-5257", [one.showcase, two.showcase, three.showcase]);
const fewer = reviewOrder(drafts([1, 2, 3, 4, 5]).filter((j) => j.id !== "j-5257"), fileOf);
ok("checkpoint order fail: a different set of drafts gives a different order and showcase (the order is the drafts', not a constant)", ids(fewer.order) !== ids(one.order) && fewer.showcase === "j-5707", [ids(fewer.order), fewer.showcase]);
const noFile = reviewOrder([job("j-x", "missing", 2, "b.json", 1), job("j-y", "missing", 1, "a.json", 1)], fileOf);
ok("checkpoint order: a draft whose form is not found still has its place (by the saved answer's name), never by when it started", ids(noFile.order) === "j-y,j-x", ids(noFile.order));
process.exitCode = summary() ? 1 : 0;
