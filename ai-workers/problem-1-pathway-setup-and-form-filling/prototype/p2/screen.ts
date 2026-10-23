// Screening that lives on the paid path itself (R4-M1, Codex 05:23Z and 08:23Z). The launcher screens the
// plain text (guard.ts screenMakerText). Before R4-M1 the drafting process only compared caller-supplied
// hashes, so starting p2/draft.ts directly with the hashes of unscreened text passed. Now the drafting
// process screens, itself, every byte it is about to send: the template, the output schema, each earlier
// AI draft it reuses, and the finished request. It cannot read the answer key or the family values (the
// permission model forbids it), so it screens against a digest: each forbidden string as a salted SHA-256,
// plus salted hashes of their first four characters to find candidate positions quickly. A window of the
// text that hashes to a forbidden string is that string, so the result equals a plain substring search.
// Limits: this guards against contamination of the experiment by our own code and files; it is not a
// privacy classifier, and a short value could be guessed from its hash by someone who already has the files.
import { createHash, randomBytes } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { PolicyRefusal } from "./guard.ts";
import { DIGEST_FILE, INVENTORY, LAUNCH_TICKET_TTL_MS, PROTOTYPE, USED_TICKETS_DIR } from "./policy.ts";
import type { Job } from "./prompt.ts";

// v2 (R4-R2-M1): the digest is also a single-use launch ticket for exactly one run, so a digest left by an
// earlier launch cannot screen a later direct start after the answer key or family values changed.
export const DIGEST_VERSION = "canary-digest/v2";
const PREFIX = 4;
type Set_ = { lengths: number[]; prefixes: string[]; hashes: string[]; count: number };
export type LaunchTicket = { nonce: string; run_id: string; job_id: string; mode: "stub" | "live"; template_sha256: string; schema_sha256: string; issued_at: string; expires_at: string };
export type Digest = { version: string; salt: string; made_at: string; sources: { file: string; sha256: string }[]; box_paths: Set_; family_values: Set_; ticket: LaunchTicket };
export type ScreenItem = { name: string; text: string; familyValuesOnly?: boolean; publicText?: string };

const h = (salt: string, s: string) => createHash("sha256").update(salt).update("\u0000").update(s).digest("hex");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

function hashSet(salt: string, strings: string[]): Set_ {
  if (strings.some((s) => s.length < PREFIX)) throw new PolicyRefusal(`a forbidden string is shorter than ${PREFIX} characters; the digest cannot index it`);
  return {
    lengths: [...new Set(strings.map((s) => s.length))].sort((a, b) => a - b),
    prefixes: [...new Set(strings.map((s) => h(salt, s.slice(0, PREFIX))))].sort(),
    hashes: strings.map((s) => h(salt, s)).sort(),
    count: strings.length,
  };
}

/** Launcher side: build the digest from the plain strings (guard.ts canaryStrings), as the ticket for one run. */
export function buildDigest(c: { box_paths: string[]; family_values: string[]; sources: { file: string; sha256: string }[] },
  t: Omit<LaunchTicket, "nonce" | "issued_at" | "expires_at">): Digest {
  const salt = randomBytes(16).toString("hex");
  const now = Date.now();
  const ticket: LaunchTicket = { ...t, nonce: randomBytes(16).toString("hex"), issued_at: new Date(now).toISOString(), expires_at: new Date(now + LAUNCH_TICKET_TTL_MS).toISOString() };
  return { version: DIGEST_VERSION, salt, made_at: ticket.issued_at, sources: c.sources, box_paths: hashSet(salt, c.box_paths), family_values: hashSet(salt, c.family_values), ticket };
}

/** Drafting-process side (R4-R2-M1): the digest must be the ticket the launcher issued for exactly this run,
 *  job, mode and screened bytes, still within its lifetime and never used before. It is marked used here, by an
 *  exclusive create in the ledger folder, before anything is screened or sent; a second start with it is refused. */
export function useTicket(d: Digest, want: Omit<LaunchTicket, "nonce" | "issued_at" | "expires_at">, usedDir = USED_TICKETS_DIR): LaunchTicket {
  const t = d.ticket;
  if (!t || typeof t.nonce !== "string" || !/^[0-9a-f]{32}$/.test(t.nonce)) throw new PolicyRefusal("screening digest carries no launch ticket; start drafting runs through p2/launch.ts");
  for (const k of ["run_id", "job_id", "mode", "template_sha256", "schema_sha256"] as const)
    if (t[k] !== want[k]) throw new PolicyRefusal(`launch ticket is for another start (${k} differs); the digest was not issued for this run`);
  const now = Date.now(), issued = Date.parse(t.issued_at), expires = Date.parse(t.expires_at);
  if (!(issued <= now + 5_000 && now <= expires && expires - issued <= LAUNCH_TICKET_TTL_MS)) throw new PolicyRefusal("launch ticket has expired; the screening digest is no longer current");
  mkdirSync(usedDir, { recursive: true });
  let fd: number;
  try { fd = openSync(join(usedDir, `${t.nonce}.json`), "wx"); } catch { throw new PolicyRefusal("launch ticket already used; the screening digest is no longer current"); }
  writeSync(fd, JSON.stringify({ nonce: t.nonce, run_id: t.run_id, job_id: t.job_id, mode: t.mode, used_at: new Date(now).toISOString() }) + "\n");
  closeSync(fd);
  return t;
}

/** Drafting-process side: read and sanity-check the digest; refuse if it is missing or empty. */
export function loadDigest(file = DIGEST_FILE): { digest: Digest; sha256: string } {
  let bytes: Buffer;
  try { bytes = readFileSync(file); } catch { throw new PolicyRefusal("no screening digest; drafting runs start through p2/launch.ts, which writes it"); }
  const d = JSON.parse(bytes.toString("utf8")) as Digest;
  if (d.version !== DIGEST_VERSION || typeof d.salt !== "string" || d.salt.length < 32) throw new PolicyRefusal("screening digest has the wrong version or salt");
  for (const k of ["box_paths", "family_values"] as const) {
    const s = d[k];
    if (!s || !(s.count > 0) || s.hashes?.length !== s.count || !s.lengths?.length || !s.prefixes?.length) throw new PolicyRefusal(`screening digest has no ${k}; refusing to screen against nothing`);
  }
  return { digest: d, sha256: sha(bytes) };
}

/** First forbidden string found in `text` (plain-text equal to guard.ts screenMakerText), or null. */
export function findForbidden(d: Digest, text: string, familyValuesOnly = false, publicText?: string): string | null {
  const sets = familyValuesOnly ? [d.family_values] : [d.box_paths, d.family_values];
  const prefixes = new Set(sets.flatMap((s) => s.prefixes));
  const hashes = new Set(sets.flatMap((s) => s.hashes));
  const lengths = [...new Set(sets.flatMap((s) => s.lengths))].sort((a, b) => a - b);
  for (let i = 0; i + PREFIX <= text.length; i++) {
    if (!prefixes.has(h(d.salt, text.slice(i, i + PREFIX)))) continue;
    for (const L of lengths) {
      if (i + L > text.length) break;
      const w = text.slice(i, i + L);
      if (hashes.has(h(d.salt, w)) && !(publicText && publicText.includes(w))) return w;
    }
  }
  return null;
}

export function screenWithDigest(d: Digest, items: ScreenItem[]): void {
  for (const it of items) {
    const w = findForbidden(d, it.text, it.familyValuesOnly, it.publicText);
    if (w !== null) throw new PolicyRefusal(`${it.name} contains "${w}" from the answer key or the family values (screened inside the drafting process)`);
  }
}

/** The public text of the official inputs an AI draft was made from, through every parent draft (D16). */
export function publicTextOf(file: string, depth = 0): string[] {
  if (depth > 4) return [];
  const env = JSON.parse(readFileSync(join(PROTOTYPE, "..", file), "utf8"));
  return (env.drafting_run?.inputs?.official_files ?? []).flatMap((p: { file: string }) =>
    p.file.startsWith("prototype/p1/inventory/") ? [readFileSync(join(PROTOTYPE, "..", p.file), "utf8")]
      : p.file.startsWith("prototype/p2/runs/") ? publicTextOf(p.file, depth + 1) : []);
}

/** Everything maker- or AI-written that a job puts into a prompt, as screen items: the template and schema
 *  (box paths and family values), and each reused AI draft (family values, with its forms' public text exempt). */
export function jobScreenItems(job: Job, template: Buffer, schema: Buffer): ScreenItem[] {
  const items: ScreenItem[] = [{ name: `template ${job.template}`, text: template.toString("utf8") }, { name: `schema ${job.output_schema}`, text: schema.toString("utf8") }];
  for (const f of job.inputs.filter((x) => x.file.startsWith("prototype/p2/runs/"))) {
    const env = JSON.parse(readFileSync(join(PROTOTYPE, "..", f.file), "utf8"));
    items.push({ name: `draft ${f.file}`, text: env.raw_output ?? "", familyValuesOnly: true, publicText: [...new Set(publicTextOf(f.file))].join("\n") });
  }
  return items;
}

/** The public text of a request's admitted official material: what the finished request may repeat. */
export function admittedPublicText(admitted: { file: string; kind: string; bytes: Buffer; parent_sources?: { file: string }[] }[]): string {
  const files = new Set<string>();
  for (const a of admitted) {
    if (a.kind === "inventory") files.add(a.file);
    for (const p of a.parent_sources ?? []) if (p.file.startsWith("prototype/p1/inventory/")) files.add(p.file);
  }
  return [...files].map((f) => readFileSync(join(INVENTORY, f.split("/").pop()!), "utf8")).join("\n");
}
