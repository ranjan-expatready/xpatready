// C10.1 row 9 (Lead 9, 5 Nov; P-143): release 2 of Visitor visa with mixed channels, set on its Forms tab's own routes:
// IMM 5257 filed Online, so the family information form is IMM 5645 (FAMILY_FORM_BY_CHANNEL); IMM 5476 a PDF upload
// signed by hand and scanned. Then the same review as release 1: submit, the SME's sign-off, a different person approves.
import { HttpException } from "@nestjs/common";
import { type Listed, type ReleaseTwoStep, releaseTwoWords } from "../../checkpoint-words.ts";
import { BY_HAND_REASON } from "./_constants.ts";
import { releaseTwoOf } from "../../checkpoint-stage-one-data.ts";
import { setStageOne } from "../../checkpoint-stage-one.ts";
import { FormLibrary } from "../../form-library.ts";
import { placeFromFormParts } from "../../form-part-placements.ts";
import { Forms } from "../../forms.ts";
import { Screen02 } from "../../screen02.ts";
import { seedSampleSources } from "../../source-register.ts";
import { Studio } from "../../studio.ts";
import type { CheckpointStep } from "./_context.ts";
import { familyForm } from "./_family-form.ts";
import { sections, sectionsFrom } from "./060-sections-from-forms.ts";
import { releaseOne } from "./110-release-one.ts";

export default {
  async run(ctx) {
    const { db, workspaceId, author, sme, approver, vvId, said } = ctx;
    const visitor = releaseOne(ctx).visitor;
    let r2Why: string | null = visitor ? null : "Waits for the Visitor visa's release 1: its channels change for release 2.";
    const r2Marks = new Map<string, number>(), r2Sections: string[] = [];
    if (visitor && vvId) await ctx.timed("release 2 (mixed channels)", async () => {
      const forms = ctx.get(Forms), studio = ctx.get(Studio), library = ctx.get(Screen02);
      let step: ReleaseTwoStep = "forms"; // review R2 m1: the words name the step that refused it
      try {
        await forms.setChannel(author, vvId, "IMM 5257", { channel: "ONLINE" });
        const fam = (await familyForm(db, vvId, "vv.single"))!;
        const has = new Set((await db.combinationForm.findMany({ where: { combinationId: vvId, status: { not: "RETIRED" } }, select: { lineageKey: true } })).map((x) => x.lineageKey));
        if (!has.has(fam.form)) await ctx.get(FormLibrary).attach(author, vvId, { formKey: fam.form });
        await studio.saveForm(author, vvId, fam.form, { attachMode: "COMBINATION_MANDATORY", minAge: 18 });
        if (has.has(fam.other)) await studio.saveForm(author, vvId, fam.other, { retire: true });
        // The family form now filed: its form fields no saved answer proposed are filled by hand, as on release 1.
        for (const ed of await db.formEdition.findMany({ where: { workspaceId, form: { formKey: fam.form }, channel: "PDF" }, select: { id: true } })) {
          for (const f of (await library.formFields(ed.id)).fields.filter((x: { outcome: string }) => x.outcome === "unresolved"))
            await library.decideFormField(author, ed.id, { dataPath: f.dataPath, decision: "by_hand", reason: BY_HAND_REASON });
          await forms.draftOptionMaps(author, ed.id);
          // B97 (B81's step, as a person uses it): each form field takes the choices the form prints; an answer it prints
          // nothing for is marked not on this form (AGENTS.md rule 4; Sample, Unconfirmed: expert). Anything that could be a
          // printed choice stays open, so Submit refuses it in words.
          for (const g of (await forms.optionMapsView(ed.id)).groups.filter((x) => x.problems.length)) {
            const notOnForm = g.values.filter((v) => !v.code && !v.asks_more && !v.printed.length);
            await forms.setOptionMaps(author, ed.id, { dataPaths: g.form_fields.map((f) => f.data_path), map: Object.fromEntries(g.values.filter((v) => v.code).map((v) => [v.key, v.code])), notOnForm: notOnForm.map((v) => v.key), baseRevision: g.revision });
            for (const v of notOnForm) r2Marks.set(v.label, (r2Marks.get(v.label) ?? 0) + g.form_fields.length);
          }
        }
        // Its sections drafted from its own parts (as on release 1, where the channel took it off), its facts asked in the
        // section of their form field (the Smart questionnaire tab's step), and
        // any new library item it adds approved by the second person.
        const s = sections(ctx);
        const heldBefore = s.held.length, refusedBefore = s.refused.length; // row 7 is written: what this pass leaves, row 9 says
        await sectionsFrom(ctx, { id: vvId }, (await db.sourceAttachment.findMany({ where: { combinationId: vvId, kind: "Form" }, orderBy: { createdAt: "asc" }, select: { id: true, fileName: true, edition: true } })).filter((a) => (a.edition ?? "").startsWith(`${fam.form} (`)), { lists: false });
        r2Sections.push(...s.held.slice(heldBefore).map((x) => `waiting for a name: ${x}`), ...s.refused.slice(refusedBefore));
        for (const ch of await db.libraryChange.findMany({ where: { workspaceId, status: "WAITING" }, select: { id: true } }))
          await library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person (C10.1 checkpoint, release 2).");
        await placeFromFormParts(db, studio, author, vvId);
        for (const ch of await db.libraryChange.findMany({ where: { workspaceId, status: "WAITING" }, select: { id: true } }))
          await library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person (C10.1 checkpoint, release 2).");
        await forms.setChannel(author, vvId, "IMM 5476", { channel: "PDF_UPLOAD", signature: "HAND_SCANNED" });
        // Row A3: release 2's own lines (IMM 5645's signer, how IMM 5645 and Schedule 1 are signed), from samples/checkpoint-stage-one.json.
        const own = await setStageOne({ db, audit: ctx.audit, studio, forms }, author, vvId, "vv.single", said, releaseTwoOf("vv.single"));
        if (own.done.length || own.refused.length) ctx.log.push(`  vv.single release 2 lines: ${[...own.done, ...own.refused.map((x) => `refused: ${x}`)].join("; ")}`);
        await seedSampleSources(db, vvId);
        step = "submit";
        const sub = await studio.submit(author, vvId, "Release 2 with mixed channels, submitted by the sample loader (C10.1 checkpoint, row 9).");
        step = "signoff";
        const items = (sub.changeSummary as { kind: string; key: string }[]).map((x) => `${x.kind}|${x.key}`);
        if (items.length) await studio.signoff(sme, vvId, { items, action: "signed", note: "Signed by the sample loader as the SME (C10.1 checkpoint, release 2)." });
        step = "approve";
        await studio.approve(approver, vvId);
      } catch (e) {
        // Lead 10's ruling on #1009 (c'): Submit's own refusal, counted and said in plain words (api/src/checkpoint-words.ts),
        // with where the draft stands.
        // Review R2-1: Submit's text names only its first three problems; its errors[] lists every one.
        const listed = e instanceof HttpException ? (e.getResponse() as { errors?: Listed[] }).errors : undefined;
        r2Why = releaseTwoWords(step, { detail: said(e), errors: Array.isArray(listed) ? listed : undefined });
      }
    });
    const vvReleases = vvId ? await db.configRelease.count({ where: { combinationId: vvId } }) : 0;
    ctx.row({ row: "9", title: "Channels for release 2 (Mixed: IMM 5257 Online, so IMM 5645 as the family information form; IMM 5476 PDF upload, signed by hand and scanned)", status: !r2Why && vvReleases >= 2 ? "done" : "waiting",
      shows: !r2Why && vvReleases >= 2 ? `Visitor visa release 2: IMM 5257 Online, IMM 5645 as the family information form, IMM 5476 a PDF upload signed by hand and scanned (Forms tab, reviewed and approved)${r2Marks.size ? `; marked not on this form, Sample, Unconfirmed: expert: ${[...r2Marks].map(([label, n]) => `"${label}" on ${n} form field${n === 1 ? "" : "s"}`).join(", ")}` : ""}${r2Sections.length ? `; IMM 5645's sections left for a person: ${r2Sections.slice(0, 3).join(" · ")}${r2Sections.length > 3 ? ` · and ${r2Sections.length - 3} more` : ""}` : ""}` : "The channel route and the signed-scan lines are built (Forms tab)", why: r2Why });
  },
} satisfies CheckpointStep;
