// The form lines first: a form whose rule is in words only is not read by the coverage check, so its facts would be
// missed by the placement step (200). A form IRCC's words name for the combination with no line yet is added from the
// Form library, as the Forms tab's "add one from the Form library" does (QA-144 slice 2: With an LMIA's IMM 5707, 5409,
// 5476 and 5475); then each rule's line, and its channel.
import { FormLibrary } from "../../../form-library.ts";
import { Forms } from "../../../forms.ts";
import { Studio } from "../../../studio.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { familyForm } from "../_family-form.ts";
import { formLines } from "./_form-lines.ts";

export default {
  async run(ctx, cc) {
    const { setup, c } = cc;
    if (!setup) return;
    const { author, said } = ctx;
    const out = formSetup(ctx), mine = formLines(cc);
    const family = mine.family = await familyForm(ctx.db, c.id, cc.key);
    const has = mine.has = new Set((await ctx.db.combinationForm.findMany({ where: { combinationId: c.id }, select: { lineageKey: true } })).map((x) => x.lineageKey));
    // BK-16 (P-496): a form held back (a later source) gets its line only in the later pass, after every combination.
    const now = (form: string) => (cc.pass === "later" ? !!cc.held?.has(form) : !cc.held?.has(form));
    for (const form of [...setup.rules.filter((r) => !r.retire).map((r) => r.form), ...(family ? [family.form] : [])].filter((f) => !has.has(f) && now(f))) {
      try { await ctx.get(FormLibrary).attach(author, c.id, { formKey: form }); has.add(form); } catch (e) { out.refused.push(`${form}: ${said(e)}`); }
    }
    for (const r of setup.rules.filter((x) => now(x.form))) {
      // B79b, C6.11: whose form it is and its minimum age are kept on a conditional line too (IMM 5604: each child, when the rule says so; IMM 5476: a child from 18).
      const body = r.retire ? { retire: true } : r.condition ? { attachMode: "ANSWER_CONDITIONAL" as const, condition: r.condition, minAge: r.minAge, ...(r.who ? { who: r.who } : {}) } : { attachMode: "COMBINATION_MANDATORY" as const, minAge: r.minAge, ...(r.who ? { who: r.who } : {}) };
      try { await ctx.get(Studio).saveForm(author, c.id, r.form, body); out.lines++; } catch (e) { out.refused.push(`${r.form}: ${said(e)}`); continue; }
      // B79b: a form IRCC's words say is filled in its portal is set Online on the Forms tab's channel route.
      if (r.channel) { try { await ctx.get(Forms).setChannel(author, c.id, r.form, { channel: r.channel }); } catch (e) { out.refused.push(`${r.form} channel: ${said(e)}`); } }
    }
  },
} satisfies CombinationStep;
