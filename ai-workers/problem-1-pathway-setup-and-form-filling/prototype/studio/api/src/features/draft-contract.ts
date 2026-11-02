// C4.11 acceptance contract, part 4a (forms lane): the plan and run routes by the seven step keys (api/src/draft-contract.ts).
import type { Feature } from "../features.ts";
import { DraftContract, DraftContractController } from "../draft-contract.ts";
export default { controllers: [DraftContractController], providers: [DraftContract] } satisfies Feature;
