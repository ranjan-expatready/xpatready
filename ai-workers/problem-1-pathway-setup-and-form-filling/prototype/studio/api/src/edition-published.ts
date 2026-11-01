// C3.12 (forms lane; P-123, P-32): the date each form edition's own file says it was published (FormEdition.published),
// as tools/read_form_identity.py reads it (the PDF's ModDate, else its CreationDate). New editions get it where they are
// made (intake, finder, impact review: the identity is already read there). Editions made before the column, or by the
// sample loader and a field-map apply (which never read the identity), are read here once, all files in one reader call,
// and the answer is kept: a date, or "" when the file names none. A file that is not on disk stays unread (null) and is
// tried again later; a reader that fails is not retried for ten minutes, so the Forms list never waits on it per request.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { manifest } from "../../engine/import.ts";
import { OFFICIAL, PY, ROOT, STUDIO, type Db } from "./core.ts";

const run = promisify(execFile);
let failedAt = 0;

/** The file an edition was read from: its stored copy, else the committed official copy it names. */
export function editionFile(e: { storedPath: string | null; officialFile: string | null; sha256: string | null }): string | null {
  if (e.storedPath) { const p = resolve(ROOT, e.storedPath); if (existsSync(p)) return p; }
  const item = e.officialFile || e.sha256 ? manifest().find((i) => (e.sha256 && i.sha256 === e.sha256) || (e.officialFile && i.file === e.officialFile)) : undefined;
  const p = item?.path ? join(OFFICIAL, item.path) : null;
  return p && existsSync(p) ? p : null;
}

/** The API's word for the column: the date, or null when the file names none or it is not read yet. */
export const publishedOf = (v: string | null | undefined): string | null => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Reads and keeps the published date of every printed edition of the workspace not read yet. One reader call. */
export async function fillPublished(db: Db, workspaceId: string): Promise<number> {
  if (Date.now() - failedAt < 10 * 60_000) return 0;
  const unread = await db.formEdition.findMany({ where: { workspaceId, published: null, channel: "PDF" }, select: { id: true, storedPath: true, officialFile: true, sha256: true } });
  const files = unread.map((e) => ({ id: e.id, file: editionFile(e) })).filter((x): x is { id: string; file: string } => !!x.file);
  if (!files.length) return 0;
  let dates: Record<string, string | null>;
  try {
    const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form_identity.py"), "--dates", ...new Set(files.map((x) => x.file))], { cwd: ROOT, timeout: 60_000, maxBuffer: 4 << 20 });
    dates = JSON.parse(stdout.trim().split("\n").pop()!);
  } catch { failedAt = Date.now(); return 0; }
  // Only rows still unread are written: an edition given its date meanwhile (an upload) keeps it.
  await db.$transaction(files.map((x) => db.formEdition.updateMany({ where: { id: x.id, published: null }, data: { published: dates[x.file] ?? "" } })));
  return files.length;
}
