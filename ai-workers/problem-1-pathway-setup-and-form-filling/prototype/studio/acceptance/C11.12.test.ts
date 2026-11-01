// C11.12 acceptance (P-220 pack 2; P-119, P-135, P-209, P-176): "Who can be in this application" sets the person roles and
// how many; each role has a filing mode — own application · on the principal's filing, applying · declared only — and the
// combination derives its filings from them; the sample says "Principal applicant".
// IRCC (compliance trace, Pack 2): family members complete their own application forms (G5256, IRCC-P2-02); IMM 5257 is
// completed by each person applying (IRCC-P2-03); the Family Information form lists every family member, even those not
// travelling (IMM 5645, IRCC-P2-05) — which is what "declared only" carries.
// Today PeopleLine has only `applies` (no filing mode, no derived filings) and the sample says "Applicant", so this fails.
// SHAPE (proposed; Question for the tech lead): PeopleLine.filing: "own_application" | "on_principal_applying" |
// "declared_only"; the people view returns `filings: { principal: string; roles: string[] }[]`. Rules only (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C11.12.test.ts 4440 xr_studio_accept
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C11.12");
const { call, ok, words } = T;

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  const view = async () => (await call("GET", `/combinations/${vv}/workspace?tab=questionnaires`)).body?.people;
  const save = async (participants: any[]) => call("PATCH", `/combinations/${vv}/people`, { version: (await view())?.version ?? 0, participants, confirmRemove: true }, AUTHOR);

  // ---------------------------------------------------------------- the rules that hold today (guards)
  let r = await save([{ role: "spouse_or_partner", min: 0, max: 1, applies: true }]);
  ok("C11.12 pass: a list without the principal is refused (400, in words)", r.status === 400 && /principal/i.test(words(r)), words(r));
  r = await save([{ role: "principal", min: 1, max: 1, applies: true }, { role: "child", min: 2, max: 1, applies: true }]);
  ok("C11.12 pass: most below fewest is refused (400, in words)", r.status === 400, words(r));
  r = await save([{ role: "principal", min: 1, max: 1, applies: true }, { role: "representative", min: 0, max: 1, applies: true }]);
  ok("C11.12 pass: a representative can never apply (400, in words)", r.status === 400, words(r));

  // ---------------------------------------------------------------- filing mode (P-135)
  const family = [
    { role: "principal", min: 1, max: 1, applies: true, filing: "own_application" },
    { role: "spouse_or_partner", min: 0, max: 1, applies: true, filing: "own_application" },
    { role: "child", min: 0, max: 4, applies: true, filing: "on_principal_applying" },
    { role: "representative", min: 0, max: 1, applies: false, filing: "declared_only" },
  ];
  r = await save(family);
  ok("C11.12 pass: each role saves with its filing mode", r.status < 300, words(r));
  const v = await view();
  ok("C11.12 pass: the view returns each role's filing mode", ["own_application", "own_application", "on_principal_applying", "declared_only"].every((m, i) => v?.lines?.[i]?.filing === m), (v?.lines ?? []).map((l: any) => `${l.role}:${l.filing}`));
  ok("C11.12 pass: the combination derives its filings: principal and spouse each file one; the children are on the principal's", Array.isArray(v?.filings) && v.filings.length === 2 && v.filings.some((f: any) => f.principal === "principal" && f.roles.includes("child")) && v.filings.some((f: any) => f.principal === "spouse_or_partner"), v?.filings);
  r = await save(family.map((l) => (l.role === "principal" ? { ...l, filing: "declared_only" } : l)));
  ok("C11.12 fail: the principal must file their own application (400, in words)", r.status === 400 && /principal/i.test(words(r)), words(r));
  r = await save(family.map((l) => (l.role === "representative" ? { ...l, filing: "own_application" } : l)));
  ok("C11.12 fail: a role that never applies can only be declared (400)", r.status === 400, words(r));
  r = await save(family.map((l) => (l.role === "child" ? { ...l, filing: "sometimes" } : l)));
  ok("C11.12 fail: an unknown filing mode is refused in words (400)", r.status === 400 && words(r).length > 10, words(r));
  // A declared-only person takes part (their facts on the principal's Family Information form) but gets no forms of their own.
  const pv = (await call("GET", `/combinations/${vv}/workspace?tab=preview&person=principal`)).body?.preview;
  ok("C11.12 pass: Preview's family follows the filing modes (each person shows how they file)", (pv?.people ?? []).length > 0 && (pv?.people ?? []).every((p: any) => typeof p.filing === "string"), (pv?.people ?? []).map((p: any) => `${p.role}:${p.filing}`));

  // ---------------------------------------------------------------- P-209: the sample's typed label
  const sample = readFileSync(join(import.meta.dirname, "..", "samples", "programs.json"), "utf8");
  ok("C11.12 pass (P-209): the sample names the principal 'Principal applicant', never a bare 'Applicant'", /"Principal applicant"/.test(sample) && !/"label"\s*:\s*"Applicant"/.test(sample));
  T.done();
});
