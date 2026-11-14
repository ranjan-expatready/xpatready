// PF-24 (SA-8-4, BR-4: rotation without downtime): the re-encrypt job. After the engineer makes a new key version current
// (deploy/RUNBOOK-secrets.md step 3), `enqueueReencrypt` puts one job per firm on JobPort (PF-0p's port; the pg-boss
// adapter is PF-14's), keyed by firm and version so a second enqueue never queues it twice. `runReencrypt` is the job:
// it walks every SealedValueStore for that firm, page by page, and re-seals each value not on the current version
// (compare-and-set, so a value changed meanwhile is never overwritten: the job walks the firm again, up to 3 passes, and
// fails if one is still left, so the engineer enqueues a new round). `versionCounts` is the runbook's check that
// nothing is left on an old version before that key is removed. Nothing here logs or returns a value: ids and counts only.
import { ReencryptPayload, SECRET_BOX_REENCRYPT_JOB, SecretRefused, type SealedValueStore, type SecretBoxPort } from "../../../../ports/secret-box.ts";

/**
 * The part of PF-0p's JobPort (ports/jobs.ts, PR #1752) this job uses: `enqueue(name, payload, { key, firmId })`, where a
 * key never queues twice, and `handle(name, handler)`. Structural, so PF-0p's JobPort and fakeJobs fit it as they are.
 */
export type ReencryptJobs = {
  enqueue(name: string, payload: ReencryptPayload, opts: { key: string; firmId: string }): Promise<unknown>;
  handle(name: string, handler: (job: { payload: unknown; firmId: string | null }) => Promise<void>): Promise<void>;
};

/** One key per firm, version and round: a key never queues twice, so a stuck rotation is re-run as round 2, 3, … (break m5). */
export const reencryptJobKey = (firmId: string, toVersion: number, round = 1) => `${SECRET_BOX_REENCRYPT_JOB}:${firmId}:v${toVersion}${round > 1 ? `:r${round}` : ""}`;

/**
 * Puts one re-encrypt job per firm that has a sealed value in any store; returns the firm ids whose job was newly queued
 * (a key already used queues nothing, so an engineer never reads "queued" when it was not). `round` re-runs a rotation:
 * a whole number from 1 to 100, anything else refused (break m5 re-check).
 */
export async function enqueueReencrypt(jobs: ReencryptJobs, box: SecretBoxPort, stores: SealedValueStore[], opts: { round?: number } = {}): Promise<string[]> {
  const round = ReencryptPayload.shape.round.unwrap().parse(opts.round ?? 1);
  const firms = [...new Set((await Promise.all(stores.map((s) => s.firms()))).flat())].sort();
  const toVersion = box.currentVersion();
  // Every payload is checked before the first is queued: one bad firm id never leaves the rest unqueued (review m4).
  const payloads = firms.map((firmId) => ReencryptPayload.parse({ firmId, toVersion, ...(round > 1 ? { round } : {}) }));
  const queued: string[] = [];
  for (const p of payloads) {
    const r = await jobs.enqueue(SECRET_BOX_REENCRYPT_JOB, p, { key: reencryptJobKey(p.firmId, toVersion, round), firmId: p.firmId });
    if ((r as { queued?: boolean } | undefined)?.queued !== false) queued.push(p.firmId);
  }
  return queued;
}

export type ReencryptResult = {
  firmId: string; toVersion: number;
  /** True when the box's current version is no longer toVersion (a later rotation): nothing was changed; that rotation's job does it. */
  stale: boolean;
  moved: number; already: number;
  /** Values the firm changed while the job ran that are still on an old version after every pass: the job fails, so a new round is enqueued. */
  changedMeanwhile: number;
  passes: number;
  /** Values the box refused (tampered, another owner's, or a key no longer held): store, id and reason, never the value. */
  refused: { store: string; id: string; code: string }[];
};

/**
 * The worker: runs each queued re-encrypt job. A job whose firm is not its payload's is refused; a job that met values
 * the box refused fails (so the engineer sees it, runbook step 4) after moving every other value, naming ids and reasons only.
 */
export async function registerReencryptJob(jobs: ReencryptJobs, deps: { box: SecretBoxPort; stores: SealedValueStore[]; pageSize?: number; done?: (r: ReencryptResult) => void }): Promise<void> {
  await jobs.handle(SECRET_BOX_REENCRYPT_JOB, async (job) => {
    const p = ReencryptPayload.parse(job.payload);
    if (!job.firmId || job.firmId.toLowerCase() !== p.firmId.toLowerCase()) throw new Error("re-encrypt: the job's firm is not its payload's firm; nothing was changed");
    const r = await runReencrypt(p, deps);
    deps.done?.(r);
    if (r.changedMeanwhile) throw new Error(`re-encrypt firm ${r.firmId} to v${r.toVersion}: moved ${r.moved}; ${r.changedMeanwhile} value(s) changed while it ran are still on an old version: enqueue round ${(p.round ?? 1) + 1} (deploy/RUNBOOK-secrets.md §4 step 4)`);
    if (r.refused.length) throw new Error(`re-encrypt firm ${r.firmId} to v${r.toVersion}: moved ${r.moved}, refused ${r.refused.length}: ${r.refused.slice(0, 20).map((x) => `${x.store}/${x.id} ${x.code}`).join(", ")}`);
  });
}

/** The job itself. Payload checked with zod; a value the box refuses is listed and skipped, never deleted. */
export async function runReencrypt(payload: unknown, deps: { box: SecretBoxPort; stores: SealedValueStore[]; pageSize?: number }): Promise<ReencryptResult> {
  const { firmId, toVersion } = ReencryptPayload.parse(payload);
  const out: ReencryptResult = { firmId, toVersion, stale: false, moved: 0, already: 0, changedMeanwhile: 0, passes: 0, refused: [] };
  if (deps.box.currentVersion() !== toVersion) return { ...out, stale: true };
  const limit = pageSizeOf(deps.pageSize, 200);
  // A value changed while a pass ran (compare-and-set missed) is tried again on the next pass; up to 3 passes.
  do {
    out.passes++; out.already = 0; out.changedMeanwhile = 0; out.refused = [];
    await onePass(firmId, toVersion, deps.box, deps.stores, limit, out);
  } while (out.changedMeanwhile && out.passes < 3);
  return out;
}

/** A page size: a whole number from 1 to 10 000 (0 would never move past the first page, break m8). */
function pageSizeOf(n: number | undefined, fallback: number): number {
  const v = n ?? fallback;
  if (!Number.isInteger(v) || v < 1 || v > 10_000) throw new RangeError("pageSize: a whole number from 1 to 10000");
  return v;
}

async function onePass(firmId: string, toVersion: number, box: SecretBoxPort, stores: SealedValueStore[], limit: number, out: ReencryptResult): Promise<void> {
  const deps = { box };
  for (const store of stores) {
    for (let after: string | null = null; ;) {
      const rows = await store.page(firmId, after, limit);
      for (const r of rows) {
        if (r.owner.firmId.toLowerCase() !== firmId.toLowerCase()) { out.refused.push({ store: store.name, id: r.id, code: "OTHER_FIRM_IN_PAGE" }); continue; }
        try {
          if (deps.box.versionOf(r.sealed) === toVersion) { deps.box.open(r.owner, r.sealed); out.already++; continue; }
          const next = deps.box.reseal(r.owner, r.sealed);
          (await store.swap(r.id, r.sealed, next)) ? out.moved++ : out.changedMeanwhile++;
        } catch (e) {
          if (!(e instanceof SecretRefused)) throw e;
          out.refused.push({ store: store.name, id: r.id, code: e.code });
        }
      }
      if (rows.length < limit) break;
      after = rows[rows.length - 1].id;
    }
  }
}

/** How many sealed values each store holds per key version (the runbook's check before an old key is removed). */
export async function versionCounts(box: SecretBoxPort, stores: SealedValueStore[], size = 500): Promise<Record<string, Record<string, number>>> {
  const pageSize = pageSizeOf(size, 500);
  const out: Record<string, Record<string, number>> = {};
  for (const store of stores) {
    const counts: Record<string, number> = (out[store.name] ??= {});   // two stores with one name add up, never overwrite (PR review)
    for (const firmId of await store.firms()) {
      for (let after: string | null = null; ;) {
        const rows = await store.page(firmId, after, pageSize);
        for (const r of rows) { let k: string; try { k = `v${box.versionOf(r.sealed)}`; } catch { k = "not sealed"; } counts[k] = (counts[k] ?? 0) + 1; }
        if (rows.length < pageSize) break;
        after = rows[rows.length - 1].id;
      }
    }
  }
  return out;
}
