// B52 (P-334 (5)): a form's worked-out Yes/No form field asked as its own question (api/src/own-question.ts).
import type { Feature } from "../features.ts";
import { OwnQuestions, OwnQuestionsController } from "../own-question.ts";
export default { controllers: [OwnQuestionsController], providers: [OwnQuestions] } satisfies Feature;
