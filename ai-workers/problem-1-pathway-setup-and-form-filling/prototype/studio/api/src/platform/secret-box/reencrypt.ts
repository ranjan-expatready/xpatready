// PF-24 (SA-8-4, BR-4: rotation without downtime): the re-encrypt job. After the engineer makes a new key version current
// (deploy/RUNBOOK-secrets.md step 3), `enqueueReencrypt` puts one job per firm on JobPort (PF-0p's port; the pg-boss
// adapter is PF-14's), keyed by firm and version so a second enqueue never queues it twice. `runReencrypt` is the job:
// it walks every SealedValueStore for that firm, page by page, and re-seals each value not on the current version
// (compare-and-set, so a value changed meanwhile is left for the next run). `versionCounts` is the runbook's check that
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

export const reencryptJobKey = (firmId: string, toVersion: number) => `${SECRET_BOX_REENCRYPT_JOB}:${firmId}:v${toVersion}`;

/** Puts one re-encrypt job per firm that has a sealed value in any store; returns those firm ids. */
export async function enqueueReencrypt(jobs: ReencryptJobs, box: SecretBoxPort, stores: SealedValueStore[]): Promise<string[]> {
  const firms = [...new Set((await Promise.all(stores.map((s) => s.firms()))).flat())].sort();
  const toVersion = box.currentVersion();
  for (const firmId of firms) await jobs.enqueue(SECRET_BOX_REENCRYPT_JOB, { firmId, toVersion } satisfies ReencryptPayload, { key: reencryptJobKey(firmId, toVersion), firmId });
  return firms;
}

export type ReencryptResult = {
  firmId: string; toVersion: number;
  /** True when the box's current version is no longer toVersion (a later rotation): nothing was changed; that rotation's job does it. */
  stale: boolean;
  moved: number; already: number; changedMeanwhile: number;
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
    if (r.refused.length) throw new Error(`re-encrypt firm ${r.firmId} to v${r.toVersion}: moved ${r.moved}, refused ${r.refused.length}: ${r.refused.slice(0, 20).map((x) => `${x.store}/${x.id} ${x.code}`).join(", ")}`);
  });
}

/** The job itself. Payload checked with zod; a value the box refuses is listed and skipped, never deleted. */
export async function runReencrypt(payload: unknown, deps: { box: SecretBoxPort; stores: SealedValueStore[]; pageSize?: number }): Promise<ReencryptResult> {
  const { firmId, toVersion } = ReencryptPayload.parse(payload);
  const out: ReencryptResult = { firmId, toVersion, stale: false, moved: 0, already: 0, changedMeanwhile: 0, refused: [] };
  if (deps.box.currentVersion() !== toVersion) return { ...out, stale: true };
  const limit = deps.pageSize ?? 200;
  for (const store of deps.stores) {
    for (let after: string | null = null; ;) {
      const rows = await store.page(firmId, after, limit);
      for (const r of rows) {
        if (r.owner.firmId !== firmId) { out.refused.push({ store: store.name, id: r.id, code: "OTHER_FIRM_IN_PAGE" }); continue; }
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
  return out;
}

/** How many sealed values each store holds per key version (the runbook's check before an old key is removed). */
export async function versionCounts(box: SecretBoxPort, stores: SealedValueStore[], pageSize = 500): Promise<Record<string, Record<string, number>>> {
  const out: Record<string, Record<string, number>> = {};
  for (const store of stores) {
    const counts: Record<string, number> = (out[store.name] = {});
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
