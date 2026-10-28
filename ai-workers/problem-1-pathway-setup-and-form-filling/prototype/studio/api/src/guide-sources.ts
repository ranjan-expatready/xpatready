// S5 slice 3 (runtime lane; Lead decision on S4's open point, lead-check 28 Oct): an IRCC instruction guide stays in the
// Form library and is linked to each combination whose forms it explains, as a source: read by AI to find the forms,
// never filed. The link is a source attachment carrying the guide edition's own file and fingerprint, so the Forms tab
// lists it with the combination's other sources and the library counts the combination as using the guide (form-uses).
// Linked from Load sample (each sample combination's guide) and when a form-finder run ends (the guide pages it read).
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { ROOT, STUDIO, type Db } from "./core.ts";

export const GUIDE_SOURCE_KIND = "Instructions";
const DETAIL = "IRCC instruction guide: read by AI to find this combination's forms; never filed. Kept in the Form library.";

/** Links the newest stored edition of each guide at these canada.ca pages to the combination, once (US$0, no AI). */
export async function linkGuidePages(db: Db, workspaceId: string, combinationId: string, urls: string[], by: string, via: "FINDER" | "SAMPLE"): Promise<string[]> {
  const linked: string[] = [];
  for (const url of [...new Set(urls)]) {
    const def = await db.govFormDef.findFirst({ where: { workspaceId, formKind: "guide", formPageUrl: url } });
    if (!def) continue;
    const ed = await db.formEdition.findFirst({ where: { workspaceId, govFormDefId: def.id, sha256: { not: null }, storedPath: { not: null } }, orderBy: { checkedAt: { sort: "desc", nulls: "last" } } });
    if (!ed?.sha256 || !ed.storedPath) continue;
    if (await db.sourceAttachment.findFirst({ where: { combinationId, sha256: ed.sha256 }, select: { id: true } })) continue;
    const file = join(ROOT, ed.storedPath);
    await db.sourceAttachment.create({ data: {
      workspaceId, combinationId, kind: GUIDE_SOURCE_KIND, fileName: basename(ed.storedPath), storedPath: ed.storedPath, sha256: ed.sha256,
      bytes: existsSync(file) ? statSync(file).size : 0, recognised: true, edition: ed.editionLabel, status: "ATTACHED", statusDetail: DETAIL, uploadedVia: via, uploadedBy: by,
    } });
    linked.push(def.formKey);
  }
  return linked;
}

/** The guide pages a finished form-finder run read (its result), linked to the run's combination. */
export async function linkFinderGuides(db: Db, batchId: string, by: string): Promise<string[]> {
  const b = await db.aiBatch.findUnique({ where: { id: batchId } });
  const plan = (b?.plan ?? {}) as { combination?: { id?: string }; result?: { pages?: { url: string; kind: string }[] } };
  const combinationId = plan.combination?.id;
  if (!b || !combinationId) return [];
  const urls = (plan.result?.pages ?? []).filter((p) => p.kind === "guide").map((p) => p.url);
  return urls.length ? linkGuidePages(db, b.workspaceId, combinationId, urls, by, "FINDER") : [];
}

/** Load sample: each sample combination's guide (samples/form-library-sample.json `guides`, by combination key). */
export async function linkSampleGuides(db: Db, workspaceId: string): Promise<number> {
  const guides = (JSON.parse(readFileSync(join(STUDIO, "samples", "form-library-sample.json"), "utf8")).guides ?? {}) as Record<string, { url?: string }>;
  let n = 0;
  for (const c of await db.combination.findMany({ where: { workspaceId }, select: { id: true, combinationKey: true } })) {
    const url = guides[c.combinationKey]?.url;
    if (url) n += (await linkGuidePages(db, workspaceId, c.id, [url], "system", "SAMPLE")).length;
  }
  return n;
}
