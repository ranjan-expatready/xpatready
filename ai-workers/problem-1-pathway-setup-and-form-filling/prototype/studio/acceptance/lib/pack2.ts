// Pack 2 helpers (P-220, Day 0: AI drafting, questionnaires and release). Shared by acceptance/C*.test.ts of this pack:
// the isolated copy check, the sample load, the combination ids and the review queue's items. US$0: AI steps are asked
// only in "replay" (saved real runs) or "rules" mode; a test never asks "live", and the copy is started without any
// STUDIO_*_LIVE switch. Every immigration value a test checks comes from an official file (cited in
// product/compliance-trace.md, Pack 2) or is labelled Sample.
// The sample is the six a person loads from the Demo menu; a 4th argument names another combination (a fixture key loads
// the suites' older fixture instead).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/<id>.test.ts 4440 xr_studio_accept [combination key]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { client, recorder, type Res } from "../../tests/runtime/api.ts";

export const AUTHOR = "user-A", APPROVER = "user-B", REVIEWER = "user-C";
/** The official checklist and instructions the Visitor visa sample carries (official-sources/ircc, committed, P-83). */
export const VV_CHECKLIST = "imm5484e.pdf"; // Document checklist for a temporary resident visa, IMM 5484 (05-2026)

/** Visitor visa's people for these tests (Sample counts): the principal, a spouse or partner and children who each
 *  apply on their own forms (G5256: "Family members must complete their own application forms"), and a representative
 *  who never applies. */
export const VV_PEOPLE = [
  { role: "principal", min: 1, max: 1, applies: true },
  { role: "spouse_or_partner", min: 0, max: 1, applies: true },
  { role: "child", min: 0, max: 4, applies: true },
  { role: "representative", min: 0, max: 1, applies: false },
];

export function pack2(id: string) {
  const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_accept";
  const { call, sql, until } = client(PORT, DB);
  const { ok, log, summary } = recorder();
  const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? r.body?.title ?? "");
  /** The combination a test runs on: its default, or the 4th argument. */
  const key = (fallback: string) => process.argv[4] ?? fallback;
  /** Keys of the suites' older fixture (no body on /demo/load). A person never sees it; a test uses it only when it is
   *  named as the 4th argument, as a stand-in while the six have no questions or releases yet. */
  const FIXTURE = new Set(["wp.family", "fs.outside", "sv.super_visa", "sp.student"]);
  /** Stops with exit 2 when the server on PORT is not using DB, then loads the sample a person loads from the Demo menu
   *  (the six, `{sample:"six"}`, samples/wave1.json) — or the suites' fixture when a fixture key is named. */
  async function ready() {
    const served = (await call("GET", "/session")).body?.workspace?.id;
    const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
    if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <test> ${PORT} xr_studio_<name>.`); process.exit(2); }
    if (!(await call("GET", "/demo/status")).body?.loaded) {
      const l = await call("POST", "/demo/load", FIXTURE.has(process.argv[4] ?? "") ? {} : { sample: "six" }, AUTHOR);
      if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
    }
  }
  /** Exit 2 ("setup missing", not a failure) when the combination has no questions yet: on the six that needs J3 / C4.11
   *  first (its field maps accepted). Says how to run it meanwhile on the suites' fixture. */
  async function needQuestions(comboId: string, fallback = "wp.family") {
    const roles = (await call("GET", `/combinations/${comboId}/workspace?tab=questionnaires`)).body?.questionnaire?.roles ?? [];
    if (roles.some((r: any) => r.questions > 0)) return;
    console.error(`STOP  setup missing: this combination has no questions yet (on the six it needs J3 / C4.11 first). Meanwhile: tsx <test> ${PORT} ${DB} ${fallback} on a fresh copy.`);
    process.exit(2);
  }
  const combo = (key: string) => sql(`select id from combination where combination_key='${key}'`);
  const attachment = (comboId: string, file: string) => sql(`select id from source_attachment where combination_id='${comboId}' and lower(file_name) like lower('%${file}') order by created_at limit 1`);
  /** Every waiting proposal of a combination's own group in the one review queue (all three bands). */
  async function queued(comboId: string) {
    const v = await call("GET", `/review/proposals?group=${encodeURIComponent(`combination:${comboId}`)}`);
    if (v.status !== 200) return [] as any[];
    const b = v.body?.group?.bands ?? {};
    return [...(b.ready ?? []), ...(b.check ?? []), ...(b.decide ?? [])] as any[];
  }
  /** Sets "Who can be in this application" through the Questionnaires tab's route (counts Sample; IMM 5257 is completed
   *  by each person applying, G5256, trace IRCC-P2-02 and P2-03). Returns the save's response. */
  async function people(comboId: string, participants = VV_PEOPLE) {
    const v = (await call("GET", `/combinations/${comboId}/workspace?tab=questionnaires`)).body?.people?.version ?? 0;
    return call("PATCH", `/combinations/${comboId}/people`, { version: v, participants, confirmRemove: true }, AUTHOR);
  }
  /** The spend ledger's total before and after: a pack-2 test must never spend (US$0). */
  const spent = () => Number(sql("select coalesce(sum(cost_usd),0) from drafting_job") || 0);
  function done() {
    const out = join(import.meta.dirname, "..", "..", "var", "acceptance"); mkdirSync(out, { recursive: true });
    const fail = log.filter((x) => !x.ok).length;
    writeFileSync(join(out, `${id}.json`), JSON.stringify({ at: new Date().toISOString(), pass: log.length - fail, fail, log }, null, 1));
    summary();
    process.exit(fail ? 1 : 0);
  }
  return { PORT, DB, call, sql, until, ok, words, ready, needQuestions, key, combo, attachment, queued, people, spent, done };
}

/** Runs a test body, turning an unexpected throw into a failure (exit 1) rather than a pass. */
export const run = (body: () => Promise<void>) => body().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
