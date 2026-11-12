// qa (11 Nov, Lead 15's retest list on #1532, item 4; main fbfb263c7): BK-9 (P-448, Bake row 23) "changes to a family's
// shared filing are allowed on every pathway, not refused outside the Visitor visa". For every released combination on the
// configured checkpoint: a case with a principal, a spouse or partner and a child (where its release lists them), then the
// preview (read only) of "remove this filing" for each non-principal and "make the spouse principal". A refusal that names
// the combination ("not worked out yet for <combination>: its people are on the principal's application",
// engine/runtime/filing-changes.ts:45 everyoneFilesOwn) fails the line. Fails today where a role files on the principal's
// application (Study permit's children); passes when BK-9 lands. US$0, no AI.
//   zsh tools/isolated.sh qa_bk9 4476 start && <Demo › Load the configured checkpoint as user-A> \
//     && tsx tests/qa/check_bk9_filing_changes_any_pathway.ts 4476 xr_studio_qa_bk9
import { call, main, ok, sql } from "../../acceptance/lib/m3.ts";

const NOT_YET = /not worked out yet for/i;
await main("BK-9", "shared-filing changes on any pathway (preview only)", async () => {
  const rows = (sql("select c.id || '|' || c.combination_key from combination c where exists (select 1 from config_release r where r.combination_id = c.id) order by c.combination_key") ?? "").split("\n").filter(Boolean);
  ok("BK-9 setup: released combinations on this copy", rows.length >= 3, rows);
  for (const r of rows) {
    const [id, key] = r.split("|");
    const open = await call("POST", "/runtime/cases", { combinationId: id, reference: `QA-BK9-${key}-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Principal" } });
    if (open.status >= 300) { console.log(`INFO  ${key}: no case opened (${open.status}) ${JSON.stringify(open.body).slice(0, 160)}`); continue; }
    const caseId = open.body.id as string; const people: { subject: string; role: string }[] = [];
    for (const role of ["spouse_or_partner", "child"]) {
      const a = await call("POST", `/runtime/cases/${caseId}/people`, { role, displayName: `Sample ${role}` });
      if (a.body?.subject_id) people.push({ subject: a.body.subject_id, role }); else console.log(`INFO  ${key}: ${role} not offered (${a.status})`);
    }
    for (const p of people) {
      const kinds = p.role === "spouse_or_partner" ? ["remove_filing", "make_principal"] : ["remove_filing"];
      for (const kind of kinds) {
        const v = await call("POST", `/runtime/cases/${caseId}/filing-changes`, { kind, subject: p.subject, preview: true });
        const words = String(v.body?.detail ?? v.body?.title ?? "");
        ok(`BK-9 ${key}: ${kind} for the ${p.role} is not refused for being this combination`, !(v.status === 422 && NOT_YET.test(words)), `${v.status} ${words}`);
      }
    }
  }
});
