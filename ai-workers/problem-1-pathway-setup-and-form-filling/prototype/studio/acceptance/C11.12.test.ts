// C11.12 acceptance (P-220 pack 2; P-119, P-135, P-209, P-176): "Who can be in this application" sets the person roles and
// how many; each person role that takes part as family has a filing mode (P-135): Files own application (temporary
// residence, citizenship) · On the principal's filing, applying (PR family) · On the principal's filing, declared only
// (non-accompanying family); the combination derives its filings from them; the sample says "Principal applicant".
// A representative or sponsor is not family and has no filing mode.
// IRCC (compliance trace, Pack 2): on a visitor visa family members complete their own application forms and may submit
// them together (G5256, IRCC-P2-02, P2-28); IMM 5257 is completed by each person applying (IRCC-P2-03). The PR family
// modes are Sample until the immigration expert confirms (P-135).
// Today PeopleLine has only `applies` (no filing mode, no derived filings) and the sample says "Applicant", so this fails.
// SHAPE (proposed; Question for the tech lead): PeopleLine.filing: "own_application" | "on_principal_applying" |
// "declared_only" (absent for a role that is not family); the people view returns `filings: { principal: string;
// roles: string[] }[]`. Rules only (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C11.12.test.ts 4440 xr_studio_accept
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C11.12");
const { call, ok, words } = T;

run(async () => {
  await T.ready();
  const view = async (c: string) => (await call("GET", `/combinations/${c}/workspace?tab=questionnaires`)).body?.people;
  const save = async (c: string, participants: any[]) => call("PATCH", `/combinations/${c}/people`, { version: (await view(c))?.version ?? 0, participants, confirmRemove: true }, AUTHOR);
  const vv = T.combo("vv.single"), fs = T.combo("fs.outside");

  // ---------------------------------------------------------------- the rules that hold today (guards)
  let r = await save(vv, [{ role: "spouse_or_partner", min: 0, max: 1, applies: true }]);
  ok("C11.12 pass: a list without the principal is refused (400, in words)", r.status === 400 && /principal/i.test(words(r)), words(r));
  r = await save(vv, [{ role: "principal", min: 1, max: 1, applies: true }, { role: "child", min: 2, max: 1, applies: true }]);
  ok("C11.12 pass: most below fewest is refused (400, in words)", r.status === 400, words(r));
  r = await save(vv, [{ role: "principal", min: 1, max: 1, applies: true }, { role: "representative", min: 0, max: 1, applies: true }]);
  ok("C11.12 pass: a representative can never apply (400, in words)", r.status === 400, words(r));

  // ---------------------------------------------------------------- Visitor visa: everyone applying files their own (P-135, G5256)
  const visitors = [
    { role: "principal", min: 1, max: 1, applies: true, filing: "own_application" },
    { role: "spouse_or_partner", min: 0, max: 1, applies: true, filing: "own_application" },
    { role: "child", min: 0, max: 4, applies: true, filing: "own_application" },
    { role: "representative", min: 0, max: 1, applies: false },
  ];
  r = await save(vv, visitors);
  ok("C11.12 pass: Visitor visa saves with each family role's filing mode", r.status < 300, words(r));
  let v = await view(vv);
  const mode = (x: any, role: string) => x?.lines?.find((l: any) => l.role === role)?.filing;
  ok("C11.12 pass: the view returns Own application for principal, spouse or partner and child", ["principal", "spouse_or_partner", "child"].every((role) => mode(v, role) === "own_application"), (v?.lines ?? []).map((l: any) => `${l.role}:${l.filing}`));
  ok("C11.12 pass: the representative has no filing mode (not family)", mode(v, "principal") === "own_application" && (v?.lines ?? []).some((l: any) => l.role === "representative") && mode(v, "representative") == null);
  ok("C11.12 pass: Visitor visa derives one filing per applying role, each its own", Array.isArray(v?.filings) && v.filings.length === 3 && v.filings.every((f: any) => f.roles.length === 1 && f.roles[0] === f.principal), v?.filings);
  r = await save(vv, visitors.map((l) => (l.role === "child" ? { ...l, filing: "on_principal_applying" } : l)));
  ok("C11.12 fail: on a temporary residence combination a child cannot be on the principal's filing (400, in words: each files their own)", r.status === 400 && words(r).length > 10, words(r));
  r = await save(vv, visitors.map((l) => (l.role === "principal" ? { ...l, filing: "declared_only" } : l)));
  ok("C11.12 fail: the principal must file their own application (400, in words)", r.status === 400 && /principal/i.test(words(r)), words(r));
  r = await save(vv, visitors.map((l) => (l.role === "representative" ? { ...l, filing: "declared_only" } : l)));
  ok("C11.12 fail: a representative given a filing mode is refused (400: not family)", r.status === 400, words(r));
  r = await save(vv, visitors.map((l) => (l.role === "child" ? { ...l, filing: "sometimes" } : l)));
  ok("C11.12 fail: an unknown filing mode is refused in words (400)", r.status === 400 && words(r).length > 10, words(r));

  // ---------------------------------------------------------------- PR family (Sample): on the principal's filing, applying or declared only
  r = await save(fs, [
    { role: "principal", min: 1, max: 1, applies: true, filing: "own_application" },
    { role: "child", min: 0, max: 4, applies: true, filing: "on_principal_applying" },
    { role: "sponsor", min: 1, max: 1, applies: false },
  ]);
  v = await view(fs);
  ok("C11.12 pass: on a PR family combination a child can be on the principal's filing, applying; one filing holds both (Sample)", r.status < 300 && Array.isArray(v?.filings) && v.filings.length === 1 && v.filings[0].roles.includes("child"), r.status >= 300 ? words(r) : v?.filings);
  r = await save(fs, [
    { role: "principal", min: 1, max: 1, applies: true, filing: "own_application" },
    { role: "child", min: 0, max: 4, applies: false, filing: "declared_only" },
    { role: "sponsor", min: 1, max: 1, applies: false },
  ]);
  v = await view(fs);
  ok("C11.12 pass: a non-accompanying child is Declared only: on the principal's filing, not applying (Sample)", r.status < 300 && mode(v, "child") === "declared_only", r.status >= 300 ? words(r) : (v?.lines ?? []).map((l: any) => `${l.role}:${l.filing}`));
  r = await save(fs, [
    { role: "principal", min: 1, max: 1, applies: true, filing: "own_application" },
    { role: "child", min: 0, max: 4, applies: true, filing: "declared_only" },
    { role: "sponsor", min: 1, max: 1, applies: false },
  ]);
  ok("C11.12 fail: Declared only and applying contradict each other (400, in words)", r.status === 400, words(r));

  // ---------------------------------------------------------------- P-209: the sample's typed label
  const sample = readFileSync(join(import.meta.dirname, "..", "samples", "programs.json"), "utf8");
  ok("C11.12 pass (P-209): the sample names the principal 'Principal applicant', never a bare 'Applicant'", /"Principal applicant"/.test(sample) && !/"label"\s*:\s*"Applicant"/.test(sample));
  T.done();
});
