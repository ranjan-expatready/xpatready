// C4.2 (screens; P-294 (B), P-91; review of #866, M1, M2, m1): a section the combination does not choose still asks what
// its forms need, and its title travels with the release. On the released Visitor visa (tests/runtime/setup_visitor_visa.ts):
// taking a section out keeps its title in the draft (no second "renamed" line), the release check says it once by
// title (never its key), a library rename of that section is a change in words (so it can be released, never "Nothing
// has changed"), the release carries the new title (its draft row published), and after release nothing is left to
// release. Also the "Still asked" words for one, several and no forms. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c42t 4446 start && tsx studio/tests/check_c42_section_titles.ts 4446 xr_studio_screens_c42t
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";
import { stillAskedWords } from "../contracts/workspace.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs";

const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_c42t";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");

async function main() {
  if (PORT === 4400) { console.error("refused: never the shared demo on :4400"); process.exit(2); }
  // m1: the words, one form, several, none.
  ok("C4.2 pass (m1): one form says \"needs\"", stillAskedWords({ forms: ["IMM 5257"] }) === "Still asked: IMM 5257 needs these answers.", stillAskedWords({ forms: ["IMM 5257"] }));
  ok("C4.2 pass (m1): several forms are listed with \"and\" and say \"need\"", stillAskedWords({ forms: ["IMM 5257", "IMM 5645", "IMM 5707"] }) === "Still asked: IMM 5257, IMM 5645 and IMM 5707 need these answers.");
  ok("C4.2 fail case (m1): no form names a rule or condition, never an empty list", stillAskedWords({ forms: [] }) === "Still asked: a rule or condition reads these answers.");

  execFileSync(join(import.meta.dirname, "..", "node_modules", ".bin", "tsx"), [join(import.meta.dirname, "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 900000 });
  const vv = sql("select id from combination where combination_key='vv.single'");
  const view = async () => (await call("GET", `/combinations/${vv}`, undefined, AUTHOR)).body;
  const v0 = await view();
  ok("setup: Visitor visa is released and matches its release", !!vv && (v0?.releases ?? []).length >= 1 && (v0?.draft?.changes ?? []).length === 0, { releases: (v0?.releases ?? []).length, changes: (v0?.draft?.changes ?? []).length });
  const q = (await call("GET", `/combinations/${vv}/workspace?tab=questionnaires&role=principal`)).body?.questionnaire;
  const sec = (q?.sections ?? []).find((s: any) => !s.stillAsked && s.questions.some((x: any) => x.neededBy.length));
  const title0 = sec?.title as string;

  // Taken out: still asked, said once by its title; the draft lists the removal only, never a "renamed" line.
  const out = await call("DELETE", `/combinations/${vv}/sections/${encodeURIComponent(sec?.id ?? "none")}`, undefined, AUTHOR);
  const v1 = await view();
  const warn = (v1?.draft?.problems ?? []).filter((p: any) => p.item === sec?.id && /not chosen for this combination/.test(p.message));
  ok("C4.2 pass (M1): the release check says once, by the section's title, that its questions are still asked", out.status < 300 && warn.length === 1 && warn[0].message.includes(`"${title0}"`), warn.map((p: any) => p.message));
  ok("C4.2 fail case (M1): no release line names a section by its key", !(v1?.draft?.problems ?? []).some((p: any) => /Placed in section|does not use/.test(p.message) || p.message.includes(` ${sec?.id} `)), (v1?.draft?.problems ?? []).filter((p: any) => p.message.includes(sec?.id)).map((p: any) => p.message).slice(0, 2));
  const names1 = (v1?.draft?.changes ?? []).filter((c: any) => c.kind === "Section name");
  ok("C4.2 pass: taking a section out is listed once, its title kept (no section-name line)", names1.length === 0 && (v1?.draft?.changes ?? []).length >= 1, (v1?.draft?.changes ?? []).map((c: any) => `${c.kind}: ${c.label}`).slice(0, 4));

  // Release the section choice, then rename the section in the library.
  const release = async (note: string) => {
    await sourceEveryNumber(PORT, vv, { actor: AUTHOR });
    const s = await call("POST", `/combinations/${vv}/submit`, { note }, AUTHOR);
    for (const c of (s.body?.changeSummary ?? []) as any[]) await call("POST", `/combinations/${vv}/signoff`, { items: [`${c.kind}|${c.key}`], action: "signed" }, REVIEWER);
    const a = await call("POST", `/combinations/${vv}/approve`, {}, APPROVER);
    return { submit: s, approve: a };
  };
  const r1 = await release("C4.2: a section taken out (test)");
  ok("setup: the section choice is released", r1.approve.status < 300, r1.approve.status < 300 ? undefined : words(r1.approve) || words(r1.submit));
  const newTitle = "About you (C4.2 test)";
  const rn = await call("PATCH", `/library/sections/${encodeURIComponent(sec.id)}`, { name: newTitle }, AUTHOR);
  // P-266: a section a released combination uses is renamed only when a second person approves it on To review.
  const waiting = ((await call("GET", "/library/changes?status=WAITING", undefined, AUTHOR)).body ?? []).filter((c: any) => c.key === sec.id);
  for (const c of waiting) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
  const v2 = await view();
  const names2 = (v2?.draft?.changes ?? []).filter((c: any) => c.kind === "Section name" && c.key === sec.id);
  ok("C4.2 fail case (M2): a library rename of a section not chosen here is a change in words, never \"Nothing has changed\"", rn.status < 300 && names2.length === 1 && names2[0].label.includes(title0) && names2[0].label.includes(newTitle), { rename: rn.status < 300 ? rn.status : words(rn), approved: waiting.length, lines: names2.map((c: any) => c.label) });
  const r2 = await release("C4.2: the section's new name (test)");
  const rel = sql(`select snapshot->'section_titles' from config_release where combination_id='${vv}' order by version desc limit 1`);
  ok("C4.2 pass (M2): the release carries the new title, its library draft published with it", r2.approve.status < 300 && rel.includes(newTitle) && sql(`select status from logical_section where section_key='${sec.id}' order by version desc limit 1`) === "PUBLISHED", { approve: r2.approve.status < 300 ? r2.approve.status : words(r2.approve) || words(r2.submit), rel: rel.slice(0, 160) });
  const v3 = await view();
  ok("C4.2 pass (M2): after the release the combination matches it, nothing left to release", (v3?.draft?.changes ?? []).length === 0, (v3?.draft?.changes ?? []).map((c: any) => `${c.kind}: ${c.label}`));
  const prev = (await call("GET", `/combinations/${vv}/workspace?tab=preview`)).body;
  ok("C4.2 pass (P-91): Preview names the section by its new title, never its key", JSON.stringify(prev).includes(`"section_title":"${newTitle}"`) && !JSON.stringify(prev).includes(`"section_title":"${sec.id}"`));
  process.exit(summary() ? 1 : 0);
}
main().catch((e) => { console.error("FAIL  C4.2 the check itself stopped:", e); process.exit(1); });
