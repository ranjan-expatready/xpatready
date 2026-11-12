// Per PDF edition the combination's draft maps: each form field no saved answer proposed filled by hand (QA-144 slice 1,
// ruling 2), its choice fields' option maps, and the answers it prints no choice for marked Not on this form (B81).
// One file, not three: the three are done edition by edition, and splitting them would reorder the database writes.
import { buildSnapshot } from "../../../../../engine/snapshot.ts";
import { BY_HAND_REASON } from "../_constants.ts";
import { Forms } from "../../../forms.ts";
import { Screen02 } from "../../../screen02.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";

export default {
  async run(ctx, cc) {
    const { db, workspaceId, author, said } = ctx;
    const { setup, c } = cc;
    const out = formSetup(ctx), library = ctx.get(Screen02), forms = ctx.get(Forms);
    const editions = ((await buildSnapshot(db, workspaceId, c.id, "draft")).snapshot.field_maps as { form_edition: string; channel?: string }[]).filter((m) => m.channel !== "ONLINE").map((m) => m.form_edition);
    const marked = new Set<string>(); // review r2-m1 (#1050): a Not on this form mark that finds no form field is said
    // BK-16 (P-496): the later pass completes only the held forms' editions (the others were done in the own pass).
    for (const ed of (await db.formEdition.findMany({ where: { workspaceId, editionLabel: { in: editions } }, select: { id: true, form: { select: { formKey: true } } } })).filter((e) => cc.pass !== "later" || cc.held?.has(e.form.formKey))) {
      for (const f of (await library.formFields(ed.id)).fields.filter((x: { outcome: string }) => x.outcome === "unresolved")) {
        try { await library.decideFormField(author, ed.id, { dataPath: f.dataPath, decision: "by_hand", reason: BY_HAND_REASON }); out.byHand++; } catch (e) { out.refused.push(`${f.dataPath}: ${said(e)}`); }
      }
      // A choice field's list values matched to the form's own codes (no AI), as the Form library's button does.
      try { await forms.draftOptionMaps(author, ed.id); } catch (e) { out.refused.push(`option maps: ${said(e)}`); }
      // QA-144 slice 4 (B81's door, #1050): an answer the form prints no choice for is marked Not on this form on each
      // form field that reads it, keeping the drafted codes, so a case with that answer is refused at filling in words.
      // From the form setup's data (samples/form-setup.json), cited; Sample, Unconfirmed: expert.
      for (const mark of (setup?.notOnForm ?? []).filter((x) => x.form === ed.form.formKey)) {
        const rows = await db.formFieldMap.findMany({ where: { formEditionId: ed.id, canonicalFieldKey: mark.fact, outcome: "mapped", status: { not: "RETIRED" } }, orderBy: { version: "desc" }, select: { dataPath: true, optionMap: true } });
        // Review r3-m1: found once it finds its form fields, so a refused save is said once, in its own words.
        if (rows.length) marked.add(`${mark.form}|${mark.fact}`);
        for (const [dataPath, om] of new Map(rows.reverse().map((r) => [r.dataPath, r.optionMap as { map?: Record<string, string>; unused?: string[] } | null]))) {
          try { await forms.setOptionMap(author, ed.id, { dataPath, map: om?.map ?? {}, unused: om?.unused ?? [], notOnForm: mark.values }); } catch (e) { out.refused.push(`${mark.form} not on this form: ${said(e)}`); }
        }
      }
    }
    for (const mark of (setup?.notOnForm ?? []).filter((x) => !marked.has(`${x.form}|${x.fact}`))) out.refused.push(`${mark.form} not on this form: no form field of ${mark.form} on a PDF edition here reads ${mark.fact}, so nothing was marked`);
  },
} satisfies CombinationStep;
