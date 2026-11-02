// UX-A part 1 (P-273; contracts/counts.ts): the one way a person's questions are counted, for the Questionnaires chips,
// the Overview's total and the Preview's person chips alike: every question of a caseView section about that person
// (the application's go with the principal applicant, who answers them), each fact once per section, as the
// Questionnaires tab lists them. `shown` leaves out the questions a rule hides for these answers (the Preview's "asked").
// Pure.
type View = { sections: { section: string; subjectId: string; questions: { fact: string; hidden?: boolean }[] }[] };

export const aboutPerson = (person: string) => (subjectId: string) => subjectId === person || (person === "principal" && subjectId === "case");

export function questionsFor(view: View, person: string, shown = false): number {
  const mine = aboutPerson(person), seen = new Set<string>();
  for (const x of view.sections) if (mine(x.subjectId)) for (const q of x.questions) if (!shown || !q.hidden) seen.add(`${x.section}|${q.fact}`);
  return seen.size;
}
