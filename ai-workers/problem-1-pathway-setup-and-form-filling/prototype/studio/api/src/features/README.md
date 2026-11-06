# Feature registrations (P-214)

A new controller or service is registered here, one file per feature, never in `main.ts`'s `@Module` list:

```ts
// api/src/features/thing.ts
import type { Feature } from "../features.ts";
import { Thing, ThingController } from "../thing.ts";
export default { controllers: [ThingController], providers: [Thing] } satisfies Feature;
```

`main.ts` adds every file here at start-up, in file-name order, after its own list (`registerFeatures` in `../features.ts`). A file without that shape stops the start-up with its name. Shared providers (`Db`, `Audit`, `Workspace`, …) stay in `main.ts` and are injectable as before.

## Steps (B120, P-376 (3))

A run that grows one step per feature keeps each step in a file of its own, in a subfolder here, so two pull requests that each add a step add two files and edit no shared line:

| Folder | Run | Each step is given |
|---|---|---|
| `checkpoint/` | Demo › Load the configured checkpoint (C10.1; `Demo.loadConfigured`) | the run's context (`checkpoint/_context.ts`) |
| `checkpoint/combination/` | inside `checkpoint/080-form-setup.ts`, once per combination set up from its forms | the run's context and the combination's |
| `placement/` | `placeFromFormParts` (`../form-part-placements.ts`), the Smart questionnaire tab's step and the checkpoint's | the combination's draft and the result (`placement/_parts.ts`) |

```ts
// api/src/features/checkpoint/097-thing.ts: runs after 095 and before 100
import type { CheckpointStep } from "./_context.ts";
export default {
  async run(ctx) {
    // the screens' own services, as the person who holds the duty: ctx.get(Forms).setChannel(ctx.author, …)
    ctx.row({ row: "18", title: "…", status: "done", shows: "…", why: null });
  },
} satisfies CheckpointStep;
```

* **The number is the order.** `featureSteps` (`../features.ts`) reads the folder in number order, at start-up. Two files with one number, a step without `run`, or a file named neither `NNN-<feature>.ts` nor `_<name>.ts` stops the start-up with the file names: a step run out of order or skipped quietly would change the data.
* **`_<name>.ts` is a helper**, not a step (the context type, shared functions). A step folder holds `.ts` files only: a `.js`, `.mjs` or `.mts` file there stops the start-up too, since it would never run.
* **State a later step reads** belongs to the step that makes it: `export const thing = stateOf(() => ({ … }))`, read as `thing(ctx)`. A later step imports it from that file, so the dependency shows in its imports.
* **Services** come from `ctx.get(Service)` (the app's own instance), so a new step never edits a constructor.
* **A step is a plain object** (`export default { async run(ctx) { … } }`), as above: a class instance with `#private` fields would fail when it runs.
* **No `try` around another step's work, no timing of its own** unless the step had one before: a refusal stops the load with its words, as before.
