// B83 (QA-234; B52): asking a form's Yes/No form field worked out from other answers as its own question. Shapes for the
// route (api/src/own-question.ts) and its section on the Form fields page (web/src/components/own-questions.tsx).
import { z } from "zod";

const said = z.string().transform((x) => x.normalize("NFKC").replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "").trim());
export const OwnQuestion = z.object({
  dataPath: z.string({ error: "Name the form field." }).min(1, "Name the form field.").max(300),
  field: z.string().trim().min(3).max(120).optional(),
  label: z.string().max(200).optional(),
  meaning: said.pipe(z.string().max(500, "Keep the meaning under 500 characters.")).optional(),
  nearReason: said.pipe(z.string().min(10, "Say in a sentence why it is not the same as the field it is close to (10 characters or more).").max(300)).optional(),
  reason: said.pipe(z.string().min(8, "Say why in a sentence (at least 8 characters).").max(300)),
}).strict();
export const OwnQuestionUndo = z.object({ dataPath: z.string({ error: "Name the form field." }).min(1, "Name the form field.").max(300) }).strict();

/** What a row says when it is asked: the field's name, and its library change while a second person has not approved it. */
export type AskedAs = { name: string; waiting: boolean; change_id: string | null };
export type OwnQuestionRow = { dataPath: string; question: string | null; page: string | null; field: string | null; group: string; worked_out_from: string[]; worked_out_from_names: string[]; asked: boolean; asked_as: AskedAs | null; can_ask: boolean; why_not: string | null };
export type OwnQuestionsView = { edition: { id: string; label: string; form: string }; fields: OwnQuestionRow[]; yes_no_fields: { key: string; name: string; meaning: string | null }[] };
/** What undo did: `kept` says why a new field stays waiting, `still_asked` names the sections that still ask it (words only). */
export type OwnQuestionUndone = { dataPath: string; field: string; withdrew: boolean; kept: string | null; still_asked: string | null };
/** One edition of a combination that has Yes/No form fields a person can still ask (the Smart questionnaire's line). */
export type OwnQuestionsToAsk = { editions: { id: string; form: string; label: string; to_ask: number }[] };
