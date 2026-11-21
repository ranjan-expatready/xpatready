// PF-13 part 1b (map row 23; AG-1-6, AG-1-9, AG-16-2; P-574 (1), P-629; briefs PF-13.md, P-627-amendments.md): the firm's
// logo, favicon and banner, and the public reads a client page draws from. An upload is PNG or JPEG by its own bytes,
// rebuilt without metadata or tail (image-walk.ts), at most 2 MB (logo, banner) or 256 KB (favicon) (Sample), stored
// through FilesPort under `branding/<kind>/<sha256>.<ext>`; the firm's current image is a registered setting
// (image-setting.ts). Images get a stable public link, not FilesPort's 5-minute signed one (front-office/files.ts
// LINK_SECONDS), so a logo in an email opened later still loads: `?v=` names the image, a new image is a new link, and an
// old link answers 404 cleanly, never another firm's or another image's bytes. The public reads find an ACTIVE or TRIAL
// firm by its key through the narrow definer lookup platform_firm_of_key (firm id only; PF-12b part 3: no bypass use),
// then run as that firm;
// they answer no firm id.
import { HttpException } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { sha256Hex, type FilesPort } from "../../../../ports/files.ts";
import { enterFirm, withFirm } from "../firm-scope.ts";
import { actorWord, platformAuditWorkspaceId } from "../identity/audit.ts";
import { problem, type StaffContext } from "../identity/keys.ts";
import { writeSetting } from "../settings.ts";
import { NEUTRAL_COLOUR, readBranding } from "./branding.ts";
import { IMAGE_KINDS, IMAGE_LIMITS, IMAGE_SETTING, imageKey, imageLink, imageVersion, isImageKind, readImage, type ImageKind } from "./image-setting.ts";
import { TOO_WIDE, walkImage } from "./image-walk.ts";

/** The upload layer stops 1 KB past the largest limit (multer refuses a file that reaches its cap); the service names
 *  each kind's own limit up to there. */
export const IMAGE_UPLOAD_CAP = IMAGE_LIMITS.logo.bytes + 1024;
const FIRM_KEY = /^[a-z0-9][a-z0-9-]{0,62}$/;
/** 413 naming the kind's limit, worded as PF-F4's check words a file refusal (it ends "Allowed here: … Nothing was
 *  stored."), so the app's error filter sends it as written (main.ts ProblemErrors, CS-D1t) instead of its shared words
 *  (review M1 on #2633). The upload layer's own limits are worded the same way (routes.ts BrandingUploadWords). */
export const tooLargeWords = (kind: ImageKind) => `The ${kind} can be at most ${IMAGE_LIMITS[kind].words}. Allowed here: PNG and JPEG. Nothing was stored.`;
export function tooLarge(kind: ImageKind): never {
  const detail = tooLargeWords(kind);
  throw new HttpException({ type: "https://expatready.local/problems/too-large", title: "Too large", status: 413, detail, message: detail, code: "TOO_LARGE", limit: IMAGE_LIMITS[kind].words }, 413);
}
const notFound = (): never => problem(404, "Not found", "There is nothing here.", { code: "NOT_FOUND" });

export class BrandingImages {
  constructor(private readonly d: { db: PrismaClient; files: FilesPort; publicBase: string }) {}

  /** PUT /api/platform/branding/<kind> (one multipart `file`): 413 over its limit, 415 for anything but a PNG or JPEG
   *  whose structure parses (SVG included); the kept bytes are stored, then the setting points at them (one audit line). */
  async upload(s: StaffContext, kindIn: string, file: { bytes: Uint8Array } | undefined) {
    if (!isImageKind(kindIn)) return notFound();
    const kind = kindIn, limit = IMAGE_LIMITS[kind];
    if (!file || !file.bytes.length) return problem(400, "Not saved", "Choose a PNG or JPEG file.", { code: "NO_FILE" });
    if (file.bytes.length > limit.bytes) return tooLarge(kind);
    const w = walkImage(file.bytes);
    // Review m3: a refusal for its size in pixels says so; anything else is "Use a PNG or JPEG file."
    if (!w.ok) return problem(415, "Not taken", w.why.includes("megapixels") ? w.why : w.why === TOO_WIDE ? "The image is wider or taller than 65,535 pixels. Use a smaller PNG or JPEG file." : "Use a PNG or JPEG file.", { code: "NOT_PNG_OR_JPEG" });
    const img = { sha256: await sha256Hex(w.bytes), mediaType: w.mediaType, width: w.width, height: w.height };
    const key = imageKey(kind, img);
    // The bytes first (a key names its bytes, so a second upload of the same image stores nothing new); a failed setting
    // write leaves an unused file under the firm's branding folder, never a setting without its file.
    if (!(await this.d.files.exists(s.firmId, key))) await this.d.files.put(s.firmId, key, w.bytes, w.mediaType);
    const now = await readImage(this.d.db, s.firmId, kind);
    if (now?.sha256 !== img.sha256)
      await this.d.db.$transaction(async (tx) => writeSetting(tx, { firmId: s.firmId, key: IMAGE_SETTING[kind].key, value: img, by: actorWord(s.staffId), workspaceId: await platformAuditWorkspaceId(tx) }));
    const firm = await this.d.db.platformFirm.findUniqueOrThrow({ where: { id: s.firmId }, select: { key: true } });
    return { kind, mediaType: w.mediaType, width: w.width, height: w.height, link: imageLink(this.d.publicBase, firm.key, kind, img), removed: w.dropped, saved: true };
  }

  /** DELETE /api/platform/branding/<kind>: back to none (the stored bytes stay; the old link answers 404). */
  async clear(s: StaffContext, kindIn: string) {
    if (!isImageKind(kindIn)) return notFound();
    if (await readImage(this.d.db, s.firmId, kindIn))
      await this.d.db.$transaction(async (tx) => writeSetting(tx, { firmId: s.firmId, key: IMAGE_SETTING[kindIn].key, value: null, by: actorWord(s.staffId), workspaceId: await platformAuditWorkspaceId(tx) }));
    return { kind: kindIn, saved: true };
  }

  /** The staff read's image part: each kind's link and size, or null. */
  async links(s: StaffContext) {
    const firm = await this.d.db.platformFirm.findUniqueOrThrow({ where: { id: s.firmId }, select: { key: true } });
    return Object.fromEntries(await Promise.all(IMAGE_KINDS.map(async (k) => {
      const img = await readImage(this.d.db, s.firmId, k);
      return [k, img ? { link: imageLink(this.d.publicBase, firm.key, k, img), width: img.width, height: img.height, mediaType: img.mediaType } : null];
    })));
  }

  /** An ACTIVE or TRIAL firm by its key, else the one 404; the request then runs as it. PF-12b part 3 (merge of PF-13 part
   *  1b): an own-firm door, so no bypass use: the narrow definer lookup gives the firm id only (platform_firm_of_key, as
   *  the booking page's), then the firm's row is read as that firm. */
  private async publicFirm(firmKey: unknown) {
    if (typeof firmKey !== "string" || !FIRM_KEY.test(firmKey)) return notFound();
    const firmId = (await this.d.db.$queryRaw<{ f: string | null }[]>`select platform_firm_of_key(${firmKey}) as f`)[0]?.f;
    const firm = firmId ? await withFirm(firmId, () => this.d.db.platformFirm.findUnique({ where: { key: firmKey }, select: { id: true, key: true, operatingName: true, status: true } })) : null;
    if (!firm || !["ACTIVE", "TRIAL"].includes(firm.status)) return notFound();
    enterFirm(firm.id);
    return firm;
  }

  /** GET /api/public/firms/<key>/branding: what a client page draws (name, colours, tagline, image links); no id. */
  async publicBranding(firmKey: string) {
    const firm = await this.publicFirm(firmKey), b = await readBranding(this.d.db, firm.id, ["colour", "accentColour", "tagline"]);
    const links = Object.fromEntries(await Promise.all(IMAGE_KINDS.map(async (k) => [k, imageLink(this.d.publicBase, firm.key, k, await readImage(this.d.db, firm.id, k))])));
    return { name: firm.operatingName, colour: b.colour ?? NEUTRAL_COLOUR, accentColour: b.accentColour, tagline: b.tagline, ...links };
  }

  /** GET /api/public/firms/<key>/branding/<kind>?v=: the current image's bytes when `v` names it (or is absent); any
   *  other `v`, or no image, is 404. */
  async publicImage(firmKey: string, kindIn: string, v: unknown) {
    if (!isImageKind(kindIn)) return notFound();
    const firm = await this.publicFirm(firmKey), img = await readImage(this.d.db, firm.id, kindIn);
    if (!img || (v !== undefined && v !== imageVersion(img))) return notFound();
    const f = await this.d.files.get(firm.id, imageKey(kindIn, img));
    if (!f) return notFound();
    return { bytes: f.bytes, mediaType: img.mediaType, etag: `"${img.sha256}"` };
  }
}
