# Feature registrations (P-214)

A new controller or service is registered here, one file per feature, never in `main.ts`'s `@Module` list:

```ts
// api/src/features/thing.ts
import type { Feature } from "../features.ts";
import { Thing, ThingController } from "../thing.ts";
export default { controllers: [ThingController], providers: [Thing] } satisfies Feature;
```

`main.ts` adds every file here at start-up, in file-name order, after its own list (`registerFeatures` in `../features.ts`). A file without that shape stops the start-up with its name. Shared providers (`Db`, `Audit`, `Workspace`, …) stay in `main.ts` and are injectable as before.
