// B154 (P-97, P-244, P-412 F11): the author marks a library section as holding background answers, with a second
// person's approval (POST /library/sections/:key/background).
import type { Feature } from "../features.ts";
import { SectionBackground, SectionBackgroundController } from "../section-background.ts";
export default { controllers: [SectionBackgroundController], providers: [SectionBackground] } satisfies Feature;
