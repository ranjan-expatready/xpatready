// G1 (C5.4): the source register (GET /combinations/:id/sources, GET and PUT /combinations/:id/sources/:kind/:key).
import type { Feature } from "../features.ts";
import { SourceRegister, SourceRegisterController } from "../source-register.ts";
export default { controllers: [SourceRegisterController], providers: [SourceRegister] } satisfies Feature;
