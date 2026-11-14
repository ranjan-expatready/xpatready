// PF-4: the audit lines of staff, roles, invitations and sessions. AUD-1 (AuditPort.record) has not merged, so each
// change writes audit_event's existing columns in its own transaction (contracts §7 §0), fail-closed: a failed line rolls
// the change back. workspace_id is required by the column; platform rows belong to no demo workspace (PF-3), so their
// lines carry the platform's own workspace row, key "platform-audit": the demo reset deletes the demo workspace's lines
// only, so it never deletes a platform line (P-571 (1); PF-3 review m3 / B-6). When AUD-1 adds firm_id, these lines move to
// AuditPort.record and this file goes. A licence number is never written here (AG-1-30, -31): callers pass field names only.
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient;
export const PLATFORM_AUDIT_WORKSPACE = "platform-audit";

let cached: string | null = null;
/** The platform's audit workspace row (made once; never the demo workspace, so never reset). */
export async function platformAuditWorkspaceId(db: PrismaClient | Tx): Promise<string> {
  if (cached && (await db.workspace.findUnique({ where: { id: cached }, select: { id: true } }))) return cached;
  const w = await db.workspace.upsert({ where: { key: PLATFORM_AUDIT_WORKSPACE }, update: {}, create: { key: PLATFORM_AUDIT_WORKSPACE, label: "Platform audit lines (firm staff, roles, settings; never reset)" } });
  cached = w.id;
  return w.id;
}

export type AuditLine = { firmId: string; firmKey: string; actor: string; action: string; entityKey: string; summary: string; detail: Record<string, unknown> };

/** One audit line about a staff member (status, roles, licence record, sessions). */
export async function auditStaff(tx: Tx, l: AuditLine) {
  const workspaceId = await platformAuditWorkspaceId(tx);
  await tx.auditEvent.create({ data: { workspaceId, actor: l.actor, action: l.action, entity: "platform_staff", entityKey: l.entityKey, summary: `Firm ${l.firmKey}: ${l.summary}`.slice(0, 600), detail: { firmId: l.firmId, firmKey: l.firmKey, ...l.detail } as Prisma.InputJsonValue } });
}

/** One audit line about an invitation. */
export async function auditInvitation(tx: Tx, l: AuditLine) {
  const workspaceId = await platformAuditWorkspaceId(tx);
  await tx.auditEvent.create({ data: { workspaceId, actor: l.actor, action: l.action, entity: "platform_invitation", entityKey: l.entityKey, summary: `Firm ${l.firmKey}: ${l.summary}`.slice(0, 600), detail: { firmId: l.firmId, firmKey: l.firmKey, ...l.detail } as Prisma.InputJsonValue } });
}

/** The actor word of a staff member on audit lines and events (their staff id; the Sample staff's actor id is in detail). */
export const actorWord = (staffId: string) => `staff:${staffId}`;
