// The configured checkpoint decides and applies the replayed field-map drafts (api/src/features/checkpoint/
// 040-field-map-review.ts reviewOrder) in the load's own planned order, whatever moment each job started (Lead 39 on
// #1396, 9 Nov). The order decides which draft lands a shared field first, which sets its meaning and the key later
// drafts are matched to (review B1 on #1411), and a review sheet names a form field with no printed caption by that
// meaning: two drafts planned 1 and 2 (IMM 5257, IMM 5257 SCH1) started in the same millisecond and landed in either
// order, so two loads gave IMM 5257 two sheets (123a97599291, 666775af9fcc). Each rule with a passing and a failing case:
// the same drafts, started in any order (ties included), are reviewed in the plan's order, batches in the order the load
// started them; the same showcase; a draft outside any plan comes after the planned ones, by its form's file; another
// plan gives another order. Pure: no database, no model call (US$0).
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_checkpoint_review_order.ts
import { laterSources, reviewOrder, type BatchPlan } from "../api/src/features/checkpoint/040-field-map-review.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const t = (ms: number) => new Date(Date.UTC(2026, 10, 9, 8, 35, 47, ms));
const fileOf = new Map([["a5257", "imm5257e.pdf"], ["aSCH1", "imm5257_1e.pdf"], ["a5707", "imm5707e.pdf"], ["a1294", "imm1294e.pdf"], ["a5710", "imm5710e.pdf"], ["a0008", "imm0008e.pdf"], ["aIRM", "irm0002e.pdf"]]);
/** The load's two batches as their plans list them (the six's combinations first, then IRM 0002 alone). */
const batches: BatchPlan[] = [
  { id: "b-six", startedAt: t(680), targets: [{ attachmentId: "a5257" }, { attachmentId: "aSCH1" }, { attachmentId: "a5707" }, { attachmentId: "a1294" }, { attachmentId: "a5710" }, { attachmentId: "a0008" }] },
  { id: "b-irm", startedAt: t(999), targets: [{ attachmentId: "aIRM" }] },
];
const job = (id: string, attachmentId: string, batchId: string | null, ms: number, proposed: number) => ({ id, attachmentId, batchId, startedAt: t(ms), runFile: `studio-fieldmap-${id}-live-20261102t101500000z-aaaaaa.json`, detail: { counts: { proposed_fields: proposed } } });
/** The same drafts as two loads may start them: IMM 5257 and its SCH1 in the same millisecond, in either listing order. */
const drafts = (sch1First: boolean, jitter: number[]) => {
  const pair = [job("j-5257", "a5257", "b-six", 776, 40), job("j-sch1", "aSCH1", "b-six", 776, 10)];
  return [...(sch1First ? pair.reverse() : pair), job("j-5707", "a5707", "b-six", 800 + jitter[0], 40), job("j-1294", "a1294", "b-six", 830 + jitter[1], 95), job("j-5710", "a5710", "b-six", 850 + jitter[2], 95), job("j-0008", "a0008", "b-six", 870 + jitter[3], 30), job("j-irm", "aIRM", "b-irm", 999, 5)];
};
const ids = (x: { id: string }[]) => x.map((j) => j.id).join(",");
const one = reviewOrder(drafts(false, [0, 0, 0, 0]), fileOf, batches), two = reviewOrder(drafts(true, [90, -40, -60, -80]), fileOf, batches), three = reviewOrder(drafts(true, [0, 0, 0, 0]).reverse(), fileOf, [...batches].reverse());

ok("C7.5 / C10.1: checkpoint order pass: the same drafts, IMM 5257 and SCH1 started in the same millisecond and listed either way, other starts jittered, are reviewed in one order", ids(one.order) === ids(two.order) && ids(one.order) === ids(three.order), [ids(one.order), ids(two.order), ids(three.order)]);
ok("C7.5 / C10.1: checkpoint order pass: that order is the load's plan (IMM 5257 before its SCH1, IMM 5257 before IMM 0008), batches in the order the load started them (IRM 0002's last)", ids(one.order) === "j-5257,j-sch1,j-5707,j-1294,j-5710,j-0008,j-irm", ids(one.order));
ok("C7.5 / C10.1: checkpoint order pass: the showcase is the same whatever the start order: most proposals, a tie (IMM 1294 and IMM 5710 at 95) going to the first planned", one.showcase === "j-1294" && two.showcase === "j-1294" && three.showcase === "j-1294", [one.showcase, two.showcase, three.showcase]);
const replanned = reviewOrder(drafts(false, [0, 0, 0, 0]), fileOf, [{ ...batches[0], targets: [...batches[0].targets].reverse() }, batches[1]]);
ok("C7.5 / C10.1: checkpoint order fail: another plan (its targets reversed) gives another order (the order is the plan's, not a constant or the file names')", ids(replanned.order) === "j-0008,j-5710,j-1294,j-5707,j-sch1,j-5257,j-irm", ids(replanned.order));
const loose = reviewOrder([...drafts(false, [0, 0, 0, 0]), job("j-x", "a5707", null, 1, 1)], fileOf, batches);
ok("C7.5 / C10.1: checkpoint order: a draft in no batch's plan comes after every planned one, by its form's file name, never by when it started", ids(loose.order).endsWith("j-irm,j-x"), ids(loose.order));
const noPlan = reviewOrder([job("j-y", "a5707", null, 2, 1), job("j-z", "a0008", null, 1, 1)], fileOf);
ok("C7.5 / C10.1: checkpoint order: with no plan at all the order is by the form's file name, not start time", ids(noPlan.order) === "j-z,j-y", ids(noPlan.order));
// BK-16 (P-496): a source a combination marks "later" is decided after every other draft, whatever its place in the plan,
// so the keys the other combinations' forms name are already in the library when it is compared (no rename elsewhere).
const fileLate = new Map([...fileOf, ["a1295", "imm1295e.pdf"]]);
const planLate: BatchPlan[] = [{ ...batches[0], targets: [{ attachmentId: "a5257" }, { attachmentId: "a1294" }, { attachmentId: "a1295" }, { attachmentId: "a5710" }, { attachmentId: "a0008" }] }, batches[1]];
const lateDrafts = [job("j-5257", "a5257", "b-six", 700, 40), job("j-1294", "a1294", "b-six", 710, 95), job("j-1295", "a1295", "b-six", 720, 90), job("j-5710", "a5710", "b-six", 730, 95), job("j-0008", "a0008", "b-six", 740, 50), job("j-irm", "aIRM", "b-irm", 999, 5)];
const marked = reviewOrder(lateDrafts, fileLate, planLate, new Set(["imm1295e.pdf"]));
ok("BK-16 (P-496) pass: a source marked later (IMM 1295, planned third) is decided after every other draft, the next batch's included; the others keep the plan's order", ids(marked.order) === "j-5257,j-1294,j-5710,j-0008,j-irm,j-1295", ids(marked.order));
const unmarked = reviewOrder(lateDrafts, fileLate, planLate);
ok("BK-16 (P-496) fail: with no mark the plan's order holds (IMM 1295 before IMM 5710, which is what renamed With an LMIA's facts)", ids(unmarked.order) === "j-5257,j-1294,j-1295,j-5710,j-0008,j-irm", ids(unmarked.order));
ok("BK-16 (P-496): the later draft never becomes the showcase while an earlier draft has as many proposals", marked.showcase === "j-1294", marked.showcase);
const most = reviewOrder([...lateDrafts.filter((j) => j.id !== "j-1295"), job("j-1295", "a1295", "b-six", 720, 400)], fileLate, planLate, new Set(["imm1295e.pdf"]));
const mostUnmarked = reviewOrder([...lateDrafts.filter((j) => j.id !== "j-1295"), job("j-1295", "a1295", "b-six", 720, 400)], fileLate, planLate);
ok("BK-16 (P-496): nor when it has the most proposals: the showcase (the one return and edit) stays on a form another combination releases (fail: unmarked, it would move to IMM 1295)", most.showcase === "j-1294" && mostUnmarked.showcase === "j-1295", [most.showcase, mostUnmarked.showcase]);
const sample = { programs: [{ categories: [{ setup: { key: "a", sources: ["x.pdf", "y.pdf"], later: ["y.pdf", "z.pdf"] } }, { subcategories: [{ setup: { key: "b", sources: ["w.pdf"], later: "w.pdf" } }] }] }] };
ok("BK-16 (P-496): the later marks are read from the sample file's setups, only a file the same setup lists among its sources (z.pdf is not one; a mark that is not a list is ignored)", JSON.stringify([...laterSources(sample)]) === JSON.stringify(["y.pdf"]), [...laterSources(sample)]);
process.exitCode = summary() ? 1 : 0;
