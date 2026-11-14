// PF-3 (contracts §0.2): the one firm filter. Every read and write of a platform or front-office table goes through
// firmScope(firmId): the firm is the tenant, so a query without it is a bug, and a row of another firm is "not found"
// (404, never 403: an id leaks nothing). The database-enforced walls (row rules) are Lead 37's; these helpers are what
// the code does until then and after.
import { HttpException, HttpStatus } from "@nestjs/common";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thrown when a firm id is missing or not a uuid: a programming error, never a person's mistake. */
export class FirmScopeError extends Error {}

/** The where clause of one firm's rows: `{ ...where, firmId }`. A where that names another firm is refused (it would
 *  read across the wall), and a missing or malformed firm id is refused before any query runs. */
export function firmScope<W extends Record<string, unknown>>(firmId: string, where?: W): W & { firmId: string } {
  if (typeof firmId !== "string" || !UUID.test(firmId)) throw new FirmScopeError(`firmScope: "${String(firmId)}" is not a firm id`);
  const given = where?.firmId;
  if (given !== undefined && given !== firmId) throw new FirmScopeError("firmScope: the where clause names another firm");
  return { ...(where ?? ({} as W)), firmId };
}

/** The firm's own row of platform_firm (its id is the firm id). */
export function ownFirm(firmId: string): { id: string } {
  return { id: firmScope(firmId).firmId };
}

/** The 404 every firm-scoped lookup gives for a row that is not in the firm (or does not exist): the same answer, so
 *  firm B's ids tell firm A nothing. */
export function notInFirm(what = "record"): never {
  throw new HttpException({ type: "https://expatready.local/problems/not-found", title: "Not found", status: 404, detail: `No such ${what}.` }, HttpStatus.NOT_FOUND);
}

/** A row read through firmScope, or the 404. Also refuses a row whose firm_id is not the scope's (a guard for a query
 *  that forgot the scope). */
export function inFirm<T extends { firmId: string | null }>(firmId: string, row: T | null | undefined, what?: string): T {
  if (!row || row.firmId !== firmScope(firmId).firmId) return notInFirm(what);
  return row;
}
