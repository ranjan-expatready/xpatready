// PF-0p (rows rev 16; P-600: the interim AuditPort adapter is OK): AuditPort over audit_event's existing columns, the way
// PF-4 writes its lines (identity/audit.ts on PR #1744). The interim until AUD-1 (the release holder's, Lead 37's design:
// firm_id column, insert-only trigger, hash chain): AUD-1 swaps this adapter and the port (ports/audit.ts) stays, so no
// caller changes. audit_event.workspace_id is required; platform and front-office rows belong to no demo workspace, so
// their lines carry the platform's own audit workspace (key "platform-audit", the same row PF-4 uses): the demo reset
// deletes the demo workspace's lines only, so it never deletes these (P-571 (1)). The firm id travels in detail.firmId
// until AUD-1 gives it a column. Fail-closed: a refused entry or a failed write throws inside the caller's transaction,
// which then rolls the change back.
import type { Prisma } from "@prisma/client";
import { AuditEntry, type AuditPort } from "../../../../ports/audit.ts";

type Tx = Prisma.TransactionClient;
export const PLATFORM_AUDIT_WORKSPACE = "platform-audit";

/** The platform's audit workspace row, made on first use inside the caller's transaction. INSERT … ON CONFLICT DO NOTHING
 *  (createMany with skipDuplicates; Prisma's upsert is not ON CONFLICT here, review M1): a second first writer waits for
 *  the first's commit and then reads its row, instead of failing on the unique key; if the first rolls back, the second's
 *  insert goes ahead. No cache, so a rolled-back first write leaves no stale id. */
export async function platformAuditWorkspaceId(tx: Tx): Promise<string> {
  const found = await tx.workspace.findUnique({ where: { key: PLATFORM_AUDIT_WORKSPACE }, select: { id: true } });
  if (found) return found.id;
  await tx.workspace.createMany({ data: [{ key: PLATFORM_AUDIT_WORKSPACE, label: "Platform audit lines (firm staff, roles, settings; never reset)" }], skipDuplicates: true });
  return (await tx.workspace.findUniqueOrThrow({ where: { key: PLATFORM_AUDIT_WORKSPACE }, select: { id: true } })).id;
}

export class AuditEventAdapter implements AuditPort<Tx> {
  async record(tx: Tx, entry: AuditEntry): Promise<void> {
    const e = AuditEntry.parse(entry);
    const workspaceId = await platformAuditWorkspaceId(tx);
    await tx.auditEvent.create({
      data: { workspaceId, actor: e.actor, action: e.action, entity: e.entity, entityKey: e.entityKey, summary: e.summary, detail: { ...e.detail, firmId: e.firmId.toLowerCase() } as Prisma.InputJsonValue },
    });
  }
}

/** The one instance modules use (`auditEvent.record(tx, …)`). */
export const auditEvent: AuditPort<Tx> = new AuditEventAdapter();
