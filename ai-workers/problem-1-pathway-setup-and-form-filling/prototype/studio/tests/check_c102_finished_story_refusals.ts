// C10.2 (review M1 on #1330): the finished story's two refusals, each with a pass and a fail, so removing either rule
// turns this check red (STANDARDS §3.10, §7). (1) RESET: on a demo with content, POST /demo/checkpoints/finished-story
// without {"confirm":"RESET"} (none, or lower case) is 400 "Type RESET" and removes nothing; with it, 202.
// (2) One load at a time: while the story runs, a second start, Reset, Load sample and Reset to the six are 409 with
// words, and the story still finishes. Also: anyone without the author duty 403. Loads the six first (about 40 s),
// then one story (about 4 minutes). Replays only, no live AI call (US$0).
//   zsh studio/tools/isolated.sh rt_c102r 4431 start && tsx studio/tests/check_c102_finished_story_refusals.ts 4431 xr_studio_rt_c102r
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_rt_c102r";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const n = (q: string) => Number(execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim());
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) as { detail?: string; message?: string; story?: { state: string; stages?: { key: string; status: string }[] }; checkpoint?: string | null } | null };
};
const words = (b: { detail?: string; message?: string } | null) => String(b?.detail ?? b?.message ?? "");
const STORY = "/demo/checkpoints/finished-story";

try {
  let r = await call("POST", "/demo/load", { sample: "six" });
  ok("setup: the six are loaded (a demo with content)", r.status < 300, r.status);
  const rows = () => n("select count(*) from program_def") + n("select count(*) from combination");
  const before = rows();

  for (const actor of ["user-O", "user-R", "user-P", "user-B", "user-C"]) {
    r = await call("POST", STORY, { confirm: "RESET" }, actor);
    ok(`C10.2 fail: ${actor} (no author duty) cannot load the finished story (403)`, r.status === 403, r.status);
  }
  for (const body of [{}, { confirm: "reset" }, { confirm: "RESET " }, { confirm: true }]) {
    r = await call("POST", STORY, body);
    ok(`C10.2 fail (RESET): ${JSON.stringify(body)} on a demo with content is 400 "Type RESET", nothing removed`, r.status === 400 && /Type RESET/.test(words(r.body)) && rows() === before, { status: r.status, words: words(r.body).slice(0, 120), rows: rows(), before });
  }

  r = await call("POST", STORY, { confirm: "RESET" });
  ok("C10.2 pass (RESET): with RESET typed the load starts (202)", r.status === 202, r.status);
  const second = await call("POST", STORY, { confirm: "RESET" }), reset = await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load", { sample: "six" }), six = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  ok("C10.2 fail (one at a time): a second start while the story runs is 409 with words", second.status === 409 && /already running|wait/i.test(words(second.body)), { status: second.status, words: words(second.body) });
  ok("C10.2 fail (one at a time): Reset while the story runs is 409", reset.status === 409, reset.status);
  ok("C10.2 fail (one at a time): Load sample while the story runs is 409", load.status === 409, load.status);
  ok("C10.2 fail (one at a time): Reset to the six while the story runs is 409", six.status === 409, six.status);
  const running = await call("GET", "/demo/status");
  ok("C10.2 pass: the status says the story is running", running.body?.story?.state === "running", running.body?.story?.state);

  let state = "running";
  for (const until = Date.now() + 900_000; state === "running" && Date.now() < until;) { await new Promise((res) => setTimeout(res, 3000)); state = (await call("GET", "/demo/status")).body?.story?.state ?? "gone"; }
  const done = await call("GET", "/demo/status");
  ok("C10.2 pass (one at a time): the story still finishes after the refused calls (Finished story, two Visitor visa cases)", state === "done" && done.body?.checkpoint === "finished_story" && n("select count(*) from runtime_case") === 2, { state, checkpoint: done.body?.checkpoint });
  // Break M1/M2 on #1330: the result claims only what the routes recorded, and Done only when everything is.
  type Stage = { key: string; status: string; shows: string; why: string | null };
  const stages = ((done.body?.story as unknown as { stages?: Stage[] } | undefined)?.stages ?? []), st = (k: string) => stages.find((x) => x.key === k);
  const famId = execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", "select id from runtime_case where reference = 'SAMPLE-VV-FAMILY-1'"], { encoding: "utf8" }).trim();
  const view = (await (await fetch(`http://localhost:${PORT}/api/runtime/cases/${famId}/questionnaire?mode=agent`, { headers: { "x-actor": "user-O" } })).json()) as { sections: { questions: { answer: { awaits_client?: boolean } | null; rows: { answer: { awaits_client?: boolean } | null }[] }[] }[] };
  // Review R2-M1, R3-M1: the number the result says the client re-confirmed equals the re-confirmations recorded after the
  // move to release 2 (the configured checkpoint's own, on release 1, came before it). C10.2 (#1482): release 2 now asks no
  // background answer again (IMM 5257's details boxes only after a Yes, the form's own Validate), so the story may make none
  // after the move; then its words say the release-1 re-confirmations, and that number must equal those made before the move.
  const shows = st("facts")?.shows ?? "";
  const claimed = Number(shows.match(/the (\d+) background answers? among the officer's/)?.[1] ?? 0);
  const claimedBefore = Number(shows.match(/the (\d+) the case officer recorded for another adult on release 1 (?:was|were) re-confirmed by the client before the move/)?.[1] ?? 0);
  const moved = "(select max(at) from audit_event where action = 'moved_release')";
  const reconfirmedInData = n(`select count(*) from audit_event where action = 're-confirmed' and entity = 'case fact' and at > ${moved}`);
  const reconfirmedBefore = n(`select count(*) from audit_event where action = 're-confirmed' and entity = 'case fact' and at < ${moved} and summary like '%on case ${famId.slice(0, 8)}%'`);
  const awaiting = view.sections.flatMap((x) => x.questions).flatMap((q) => [q.answer, ...q.rows.map((r) => r.answer)]).filter((a) => a?.awaits_client).length;
  const c618 = claimed > 0 ? claimed === reconfirmedInData : reconfirmedInData === 0 && claimedBefore > 0 && claimedBefore === reconfirmedBefore;
  ok("C10.2 (break M1): the facts stage claims no reason the answer route never takes; staff answers for another adult are re-confirmed by the client", !/with a reason|each marked/.test(shows || "x") && c618 && awaiting === 0, { awaiting, claimed, reconfirmedInData, claimedBefore, reconfirmedBefore, shows: shows.slice(0, 260) });
  const unrecorded = n("select count(*) from filing f join runtime_case k on k.id = f.case_id where k.reference = 'SAMPLE-VV-FAMILY-1' and f.active and upper(f.status) <> 'SUBMITTED'");
  ok("C10.2 (break M2): the record stage reads Done only when every filing is recorded, else Partly naming what is not", unrecorded ? st("record")?.status === "partial" && /Not recorded yet/.test(st("record")?.why ?? "") : st("record")?.status === "done", { unrecorded, record: st("record")?.status });
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("C10.2 pass: once it is done the claim is released: Reset works (no case left)", r.status < 300 && n("select count(*) from runtime_case") === 0, r.status);
} catch (e) { ok(`the check ran to its end (crashed: ${(e as Error).message})`, false); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
