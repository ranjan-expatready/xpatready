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
  const vv = T.combo("vv.single"), fs = T.combo("fs.spouse");
  const shown = (await view(vv))?.lines?.find((l: any) => l.role === "principal")?.label;
  ok("C11.12 pass (QA-143): Visitor visa as loaded from the Demo menu shows 'Principal applicant'", shown === "Principal applicant", shown);

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
  // P-135: the engine also derives fees on whose filing and how filings group into one submission (G5256: submitted
  // together, one payment receipt, IRCC-P2-28). SHAPE (proposed): `submissions: { filings: string[] }[]`, each filing a `fee` line.
  ok("C11.12 pass (P-135): the three filings form one submission, and each filing says whose fee it carries (Sample amounts)", Array.isArray(v?.submissions) && v.submissions.length === 1 && v.submissions[0].filings?.length === 3 && v.filings.every((f: any) => typeof f.fee === "string" || typeof f.fee === "object"), { submissions: v?.submissions, fee: v?.filings?.[0]?.fee });
  // P-119: applicants get their own forms, questions and documents; the line says so (the tooltip's words).
  ok("C11.12 pass (P-119): each applying line says it gets its own forms, questions and documents", (v?.lines ?? []).filter((l: any) => l.applies).length >= 3 && (v?.lines ?? []).filter((l: any) => l.applies).every((l: any) => /own forms, questions and documents/i.test(String(l.tip ?? l.help ?? ""))), (v?.lines ?? []).map((l: any) => l.tip ?? l.help ?? null));
  r = await save(vv, visitors.map((l) => (l.role === "child" ? { ...l, filing: "on_principal_applying" } : l)));
  ok("C11.12 warn (P-233 (3): warn, never refuse; Sample, for the immigration expert): on a temporary residence combination a child on the principal's filing is saved with a warning in words", r.status < 300 && (r.body?.warnings ?? []).some((w: string) => w.length > 10), r.status >= 300 ? words(r) : r.body?.warnings);
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
  // M3-S1 (P-425): the sponsor line saved with no mode follows the fee table's mode for it, as a case does (co-files), so
  // the sponsorship is a filing of its own beside the principal's; the principal's one filing holds the child.
  const own = Array.isArray(v?.filings) ? (v.filings as { kind: string; roles: string[] }[]).filter((f) => f.kind !== "co_filed") : [];
  ok("C11.12 pass: on a PR family combination (Spouse sponsorship, fs.spouse) a child can be on the principal's filing, applying; one filing holds both (Sample)", r.status < 300 && own.length === 1 && own[0].roles.includes("principal") && own[0].roles.includes("child"), r.status >= 300 ? words(r) : v?.filings);
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

  // ---------------------------------------------------------------- P-209 / QA-143: the Demo sample's typed labels
  const sample = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "wave1.json"), "utf8"));
  const parts = JSON.stringify(sample).match(/"participants":\[[^\]]*\]/g) ?? [];
  // P-209 renames the bare "Applicant" only; a label typed on purpose ("Student", "Worker", "Employer (applicant)") is
  // kept, as "(travelling)" is (L7; qa on #445, 2 Nov). The Visitor visa principal reads "Principal applicant" (QA-143).
  const principalNamed = parts.find((p) => /"label":"Principal applicant"/.test(p));
  ok("C11.12 pass (P-209, QA-143): the Demo sample (samples/wave1.json) has no bare 'Applicant' label, and a principal reads 'Principal applicant'", parts.length > 0 && !!principalNamed && !/"label":"Applicant"/.test(JSON.stringify(sample)), parts.map((p) => /"role":"principal","label":"([^"]*)"/.exec(p)?.[1]));
  ok("C11.12 fail (P-209): a sample with a bare 'Applicant' label is caught", /"label":"Applicant"/.test(JSON.stringify(sample).replace('"label":"Principal applicant"', '"label":"Applicant"')));
  ok("C11.12 pass (P-209): '(travelling)' is kept on the family labels (the L7 example)", /\(travelling\)/.test(JSON.stringify(sample)));
  T.done();
});
