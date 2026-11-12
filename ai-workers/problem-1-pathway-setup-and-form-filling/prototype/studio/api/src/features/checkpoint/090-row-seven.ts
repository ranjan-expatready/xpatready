// C10.1 row 7: the sections drafted from the forms' parts (060) and each combination's questions, form fields and form
// rules (080), in one row.
import type { CheckpointStep } from "./_context.ts";
import { sections } from "./060-sections-from-forms.ts";
import { formSetup } from "./080-form-setup.ts";

export default {
  async run(ctx) {
    const s = sections(ctx), { placedFacts, refused: setUpRefused, unchosen, byHand, lines } = formSetup(ctx);
    const { fromForms, made: sectionsMade, reused: sectionsReused, refused: sectionsRefused, held: sectionsHeld, namedByPerson, renamedByPerson } = s;
    // QA-206 (tech lead on #883): each held section is named in one line, so the row says all of them, not the first six.
    const heldLine = sectionsHeld.length ? `${sectionsHeld.length} section${sectionsHeld.length === 1 ? "" : "s"} held on To review for a person to name (the form prints no heading over their form fields): ${sectionsHeld.join(", ")}` : null;
    ctx.row({ row: "7", title: "Sections and questions from the forms' own parts (rules, US$0)", status: !fromForms.length ? "waiting" : sectionsRefused.length || setUpRefused.length || sectionsHeld.length ? "partial" : "done",
      shows: `${sectionsMade.length} sections drafted from ${fromForms.map((c) => c.label).join(", ")}'s forms and approved by the ${ctx.approver.name}${sectionsReused.length ? ` (${sectionsReused.length} more already in the library, reused)` : ""}${namedByPerson.length ? `; ${namedByPerson.length} sections with no heading read over their form fields named by a person from the form's own words (Sample${namedByPerson.some((x) => x.basis === "sample") ? `; ${namedByPerson.filter((x) => x.basis === "sample").length} in a person's wording, Unconfirmed: expert` : ""})` : ""}${renamedByPerson.length ? `; ${renamedByPerson.length} section${renamedByPerson.length === 1 ? "" : "s"} under a printed heading renamed by a person, so ${renamedByPerson.length === 1 ? "it does" : "they do"} not join another combination's section of that name (Sample, Unconfirmed: expert)` : ""}; ${placedFacts.length} facts asked in the section of their form field; ${byHand} form fields no saved answer proposed are filled by hand; ${lines} form lines set from IRCC's words (Sample, Unconfirmed: expert)${unchosen.length ? `; ${unchosen.length} chosen section${unchosen.length === 1 ? "" : "s"} unchosen again where a shared placement made ${unchosen.length === 1 ? "it" : "them"} not everyone's (${[...new Set(unchosen.map((x) => /\(on (.*)\)$/.exec(x)?.[1] ?? ""))].join(", ")})` : ""}`,
      why: [...(heldLine ? [heldLine] : []), ...[...sectionsRefused, ...setUpRefused].slice(0, 6)].join(" · ") || null });
  },
} satisfies CheckpointStep;
