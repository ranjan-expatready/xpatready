// C11.3 QA-150 (Gap · Minor, after-merge 2 Nov 59d2da74; pack C11.3 AT-10): every list names a combination by its full
// five-part trail, Pathway type › Pathway › Program › Category › Sub-category (P-104). Shared library › Forms "Used by",
// its Used by filter, "See where it is used" and the form finder's plan and run card said "Visitors › Visitor visa" or
// ["Temporary residence", "Visitors", "Visitor visa"]. The finder keeps giving the AI the names it gave before
// (`ai_trail`): saved answers are found by everything the AI was given, so that input must not change. A pass and a
// fail per rule. No model call, no launch, no canada.ca (US$0).
//   zsh studio/tools/isolated.sh scr_c113 4442 start && tsx studio/tests/check_c113_full_trail.ts 4442 xr_studio_scr_c113
import { fullTrail } from "../engine/structure.ts";

const PORT = Number(process.argv[2] ?? 4442), DB = process.argv[3] ?? "xr_studio_scr_c113";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- responses are read loosely, as in the other checks
const call = async (method: string, path: string, body?: unknown): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
/** Pathway type › Pathway › Program › Category › Sub-category: exactly five named parts, the type first. */
const FIVE = (t: string) => { const p = t.split(" › "); return p.length === 5 && ["Retail", "Corporate and employers"].includes(p[0]) && p.every((x) => x.trim().length > 0); };

(async () => {
  // Rules, without a server: the helper every list uses.
  const chain = (type: string | null, ...names: [string, string][]) => names.map(([label, nodeKind], i) => ({ label, nodeKind, clientType: i === 0 ? type : null }));
  ok("C11.3 QA-150 pass: a category with no sub-category reads Pathway type › Pathway › Program › Category › No sub-category",
    fullTrail(chain("INDIVIDUAL", ["Temporary residence", "PATHWAY"], ["Visitors", "PROGRAM"], ["Visitor visa", "STREAM"])).join(" › ") === "Retail › Temporary residence › Visitors › Visitor visa › No sub-category");
  ok("C11.3 QA-150 pass: a sub-category ends with its own name (no placeholder) and a corporate pathway names its type",
    fullTrail(chain("CORPORATE", ["Temporary residence", "PATHWAY"], ["LMIA", "PROGRAM"], ["High-wage position", "STREAM"], ["Inside Canada", "CATEGORY"])).join(" › ") === "Corporate and employers › Temporary residence › LMIA › High-wage position › Inside Canada");
  ok("C11.3 QA-150 fail: the trail the lists used before (no Pathway type, no Pathway, no sub-category) is not a full trail", !FIVE("Visitors › Visitor visa") && !FIVE("Temporary residence › Visitors › Visitor visa"));

  if ((await call("POST", "/demo/reset", { confirm: "RESET" })).status >= 300) { console.error("STOP  demo reset refused"); process.exit(2); }
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }

  // Shared library › Forms: the Used by cell, the Used by filter and "See where it is used".
  const list = (await call("GET", "/library/forms/list")).body as { rows: { code: string; used_by: { label: string }[] }[]; combinations: { label: string }[] };
  const usedBy = list.rows.flatMap((r) => r.used_by.map((u) => u.label));
  ok("C11.3 QA-150 pass: every Used by in the Forms list names its combination by the full five-part trail", usedBy.length >= 6 && usedBy.every(FIVE), usedBy.filter((t) => !FIVE(t)).slice(0, 4));
  ok("C11.3 QA-150 pass: every combination in the Used by filter is named by its full trail", list.combinations.length >= 6 && list.combinations.every((c) => FIVE(c.label)), list.combinations.filter((c) => !FIVE(c.label)).map((c) => c.label));
  const used = list.rows.find((r) => r.used_by.length);
  const uses = (await call("GET", `/library/forms/${encodeURIComponent(used?.code ?? "none")}/uses`)).body as { uses?: { kind: string; label: string }[] } | null;
  const combUses = (uses?.uses ?? []).filter((u) => u.kind === "combination");
  ok("C11.3 QA-150 pass: See where it is used names each combination by its full trail", combUses.length > 0 && combUses.every((u) => FIVE(u.label)), uses);

  // The form finder's plan (what the person reads) and the names the AI is given (never changed by QA-150).
  const cat = (await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all")).body as { rows: { label: string; combinationId: string | null; trail: string[] }[] };
  const vv = cat.rows.find((r) => r.label === "Visitor visa" && r.combinationId);
  if (!vv) { console.error("STOP  no Visitor visa combination in the sample"); process.exit(2); }
  const plan = (await call("POST", `/combinations/${vv.combinationId}/forms/find/plan`, { mode: "rules" })).body as { combination?: { trail: string[]; ai_trail: string[] } };
  ok("C11.3 QA-150 pass: the form finder's plan names the combination by the same five parts as its Immigration programs card",
    plan?.combination?.trail?.join(" › ") === vv.trail.join(" › ") && FIVE(plan.combination.trail.join(" › ")), { plan: plan?.combination?.trail, card: vv.trail });
  ok("C11.3 QA-150 fail: the AI is still given the names it was given before (Pathway › Program › Category, no type, no placeholder), so saved answers still replay",
    plan?.combination?.ai_trail?.join(" › ") === "Temporary residence › Visitors › Visitor visa", plan?.combination?.ai_trail);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
