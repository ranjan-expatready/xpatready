// QA-427 (P-498): the case page's client card rule (web/src/runtime/client-card.ts), a pass and a fail per state. Review
// M1 (e235916da): (a) a filing never sent for review is not "approved" (the finished story's fourth filing); (b) an
// answer changed after approval goes back to "confirm the answers". No server, no model call (US$0).
//   tsx --tsconfig api/tsconfig.json tests/check_qa427_client_card.ts
import { clientCardState, latestReviewOf, type ClientCardInput } from "../web/src/runtime/client-card.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`); } };
const base: ClientCardInput = { loading: false, failed: false, owes: 0, toConfirm: 0, filings: [], rounds: [] };
const at = (x: Partial<ClientCardInput>) => clientCardState({ ...base, ...x });
const F = (id: string, status = "not_started") => ({ id, status });
const R = (number: number, ...rows: [string, string][]) => ({ number, filings: rows.map(([filing, status]) => ({ filing, status })) });

ok("loading: any read loading shows the placeholder", at({ loading: true, owes: 3 }) === "loading");
ok("failed: a read that failed says so (never a placeholder for ever, review m1)", at({ failed: true }) === "failed");
ok("submitted pass: every filing submitted", at({ filings: [F("a", "submitted"), F("b", "SUBMITTED")] }) === "submitted");
ok("submitted fail: one filing still to file is not submitted (review m3)", at({ filings: [F("a", "submitted"), F("b", "ready_to_file")], rounds: [R(1, ["a", "approved"], ["b", "approved"])] }) === "approved");
ok("in review pass: a row sent or under review", at({ owes: 2, filings: [F("a")], rounds: [R(1, ["a", "under_review"])] }) === "in-review");
ok("client answers pass: the client owes answers", at({ owes: 2, toConfirm: 5 }) === "client-answers");
ok("client answers fail: owing nothing, the client is never next", at({ owes: 0, toConfirm: 5 }) !== "client-answers");
ok("confirm pass: answers wait for the officer", at({ toConfirm: 5, filings: [F("a")] }) === "confirm");
ok("review M1 (b): a change after approval goes back to confirm, never \"Ready to file\"", at({ toConfirm: 1, filings: [F("a")], rounds: [R(1, ["a", "approved"])] }) === "confirm");
ok("approved pass: every filing not yet submitted has its newest row approved", at({ filings: [F("a", "submitted"), F("b")], rounds: [R(1, ["a", "approved"]), R(2, ["b", "approved"])] }) === "approved");
ok("review M1 (a): a filing never sent for review is not approved (the story's fourth filing)", at({ filings: [F("a", "submitted"), F("b", "submitted"), F("c", "submitted"), F("d")], rounds: [R(1, ["a", "approved"]), R(2, ["b", "approved"]), R(3, ["c", "approved"])] }) === "prepare");
ok("approved fail: a filing sent back in its newest round", at({ filings: [F("a")], rounds: [R(1, ["a", "approved"]), R(2, ["a", "sent_back"])] }) === "prepare");
ok("approved pass: approved again after a sending back (its newest row counts)", at({ filings: [F("a")], rounds: [R(1, ["a", "sent_back"]), R(2, ["a", "approved"])] }) === "approved");
ok("prepare pass: nothing prepared or sent yet", at({}) === "prepare");
ok("latestReviewOf: the highest round holding the filing, null when never sent", latestReviewOf("a", [R(2, ["a", "approved"]), R(1, ["a", "sent_back"])]) === "approved" && latestReviewOf("z", [R(1, ["a", "approved"])]) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
