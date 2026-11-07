// What one combination's form lines step (100) finds, for the family information form's lines (120).
import { stateOf } from "../../../features.ts";
import type { familyForm } from "../_family-form.ts";

/** Keyed by the combination's context: its family information form by channel, and the forms it has a line for. */
export const formLines = stateOf(() => ({ family: null as Awaited<ReturnType<typeof familyForm>>, has: new Set<string>() }));
