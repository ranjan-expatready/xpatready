// X2b (C1.5), re-review nit on #273: which database errors of a bulk apply are "Busy" (another request was changing the
// same combinations at that moment; nothing was written, so trying again is right). Only these: a deadlock (40P01), a
// lock wait that ran out (55P03), a write conflict (P2034), and a line row another request wrote at the same moment (the
// line's own unique key, P2002 on combination_form or document_requirement). Anything else (P2010 for another reason,
// P2025, a unique key of another table) stays a server error, so a real fault is never hidden behind "try again".
import { Prisma } from "@prisma/client";

const LINE_MODELS = ["CombinationForm", "DocumentRequirement"];
const LOCK_CODES = /\b(40P01|55P03)\b|deadlock detected|canceling statement due to lock timeout/i;

export function isBusy(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2034") return true;
    const meta = JSON.stringify(e.meta ?? {});
    if (e.code === "P2002") return LINE_MODELS.includes(String((e.meta as { modelName?: unknown } | undefined)?.modelName)) || /"(combination_form|document_requirement)[_"]/.test(meta);
    // A raw query (the apply's row locks) fails with the database's own code inside.
    if (e.code === "P2010") return LOCK_CODES.test(`${meta} ${e.message}`);
    return false;
  }
  return LOCK_CODES.test(String((e as Error)?.message ?? ""));
}
