// G4 (C5.7): answer-key families, keys and runs (GET/POST /answer-keys/families, PUT /answer-keys/families/:id,
// GET/POST /combinations/:id/answer-keys, GET/PUT /answer-keys/:id, POST /answer-keys/:id/sign, POST /answer-keys/:id/run).
import type { Feature } from "../features.ts";
import { AnswerKeys, AnswerKeysController } from "../answer-keys.ts";
export default { controllers: [AnswerKeysController], providers: [AnswerKeys] } satisfies Feature;
