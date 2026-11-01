// C3.12 (forms lane; P-123, P-32): the date each form edition's own file says it was published (FormEdition.published),
// as tools/read_form_identity.py reads it (the PDF's ModDate, else its CreationDate). New editions get it where they are
// made (intake, finder, impact review: the identity is already read there). Editions made before the column, or by the
// sample loader and a field-map apply (which never read the identity), are read here once, all files in one reader call,
// and the answer is kept: a date; "" when the PDF names none; "?" when the file could not be read (never taken for "no
// date", and not read again). A file that is not a regular file on disk stays unread (null) and is tried again later.
// Break (456fb7d0) M1: one fill at a time per workspace; the Forms list waits for it at most WAIT_MS and is answered
// with what is known (an edition still being read says "Date not read yet"); a reader that fails is not retried for ten
// minutes. Break m3: the manifest is read once per fill, not per row.
import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { manifest } from "../../engine/import.ts";
import { OFFICIAL, PY, ROOT, STUDIO, type Db } from "./core.ts";
export { publishedOf, realDate, type PublishedState } from "../../engine/published-date.ts";

const run = promisify(execFile);
const WAIT_MS = 3_000;
let failedAt = 0;
const running = new Map<string, Promise<number>>();

const regular = (p: string) => { try { return statSync(p).isFile(); } catch { return false; } }; // break M1: never a pipe or a folder

/** The file an edition was read from: its stored copy, else the committed official copy it names. */
export function editionFile(e: { storedPath: string | null; officialFile: string | null; sha256: string | null }, items: { file: string; sha256: string; path?: string }[] = manifest()): string | null {
  if (e.storedPath) { const p = resolve(ROOT, e.storedPath); if (regular(p)) return p; }
  const item = e.officialFile || e.sha256 ? items.find((i) => (e.sha256 && i.sha256 === e.sha256) || (e.officialFile && i.file === e.officialFile)) : undefined;
  const p = item?.path ? join(OFFICIAL, item.path) : null;
  return p && regular(p) ? p : null;
}

/** Reads and keeps the published date of every printed edition of the workspace not read yet, one reader call; one at a
 *  time per workspace. The caller waits at most WAIT_MS; the fill finishes on its own after that. */
export async function fillPublished(db: Db, workspaceId: string): Promise<void> {
  if (Date.now() - failedAt < 10 * 60_000) return;
  let p = running.get(workspaceId);
  if (!p) { p = fill(db, workspaceId).finally(() => running.delete(workspaceId)); running.set(workspaceId, p); }
  await Promise.race([p.catch(() => 0), new Promise((r) => setTimeout(r, WAIT_MS).unref())]);
}

async function fill(db: Db, workspaceId: string): Promise<number> {
  const unread = await db.formEdition.findMany({ where: { workspaceId, published: null, channel: "PDF" }, select: { id: true, storedPath: true, officialFile: true, sha256: true } });
  if (!unread.length) return 0;
  const items = manifest();
  const files = unread.map((e) => ({ id: e.id, file: editionFile(e, items) })).filter((x): x is { id: string; file: string } => !!x.file);
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
