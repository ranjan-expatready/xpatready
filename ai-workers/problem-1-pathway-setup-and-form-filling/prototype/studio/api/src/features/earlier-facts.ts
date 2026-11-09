// C6.19 (P-419): facts from a returning client's earlier case, offered and re-confirmed on their next case.
import type { Feature } from "../features.ts";
import { EarlierFacts, EarlierFactsController } from "../earlier-facts.ts";
export default { controllers: [EarlierFactsController], providers: [EarlierFacts] } satisfies Feature;
