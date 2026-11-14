// PF-19a: msg_firm, the one key every msg_ table hangs on (one row per firm that has messages data; it keys on
// platform_firm, so platform.prisma needs one back-relation line). Made here, inside the caller's transaction, the first
// time the messages code writes for a firm: an upsert on the primary key, so two first writers never collide, and a
// rolled-back first write leaves nothing behind. A firm id that is not a platform_firm row is refused by the key (P2003).
import type { Prisma } from "@prisma/client";
import { firmScope } from "../../firm-scope.ts";

export async function ensureMessagesFirm(tx: Prisma.TransactionClient, firmId: string): Promise<void> {
  const id = firmScope(firmId).firmId;
  await tx.$executeRaw`INSERT INTO "msg_firm" ("firm_id") VALUES (${id}::uuid) ON CONFLICT ("firm_id") DO NOTHING`;
}
