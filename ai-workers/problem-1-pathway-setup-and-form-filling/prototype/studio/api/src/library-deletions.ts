// X5 slice c (forms lane; P-156 (1); the tech lead's answer on #138): the library remembers a form a second person approved
// deleting, by its number, so a later fill from IRCC's forms list does not list it again. A person adding the form back
// (an upload, a canada.ca download by Find again, a form drafted from a source, a sample load) forgets it. US$0, no AI.
import type { Prisma } from "@prisma/client";

type Tx = Pick<Prisma.TransactionClient, "libraryFormDeletion">;

/** Remembers an approved delete (called in the delete's own transaction). */
export async function rememberDeletion(tx: Tx, workspaceId: string, formKey: string, deletedBy: string, changeId: string | null) {
  await tx.libraryFormDeletion.upsert({ where: { workspaceId_formKey: { workspaceId, formKey } }, create: { workspaceId, formKey, deletedBy, changeId }, update: { deletedBy, changeId, deletedAt: new Date() } });
}

/** A person added the form back: the fill may list it again. Returns whether a deletion was forgotten. */
export async function forgetDeletion(tx: Tx, workspaceId: string, formKey: string): Promise<boolean> {
  return (await tx.libraryFormDeletion.deleteMany({ where: { workspaceId, formKey } })).count > 0;
}
