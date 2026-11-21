// PF-13 routes (AG-16-2: Owner and Admin edit, `agent/settings:edit`; reading with `agent/settings:list`). PF-4's guard
// does the rest; the firm is the session's. Part 1b: the images (one multipart `file`; the upload layer stops one byte
// past the largest limit and the service names each kind's own) and the public reads under /api/public (open doors:
// the firm by its key through the narrow lookup platform_firm_of_key, no bypass use, PF-12b part 3).
import { Body, Controller, Delete, Get, HttpException, Inject, Injectable, Param, Put, Query, Req, Res, UploadedFile, UseInterceptors, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import { catchError, throwError } from "rxjs";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Db, OpenRead } from "../../core.ts";
import { PermissionKeys, staffOf, type StaffContext } from "../identity/keys.ts";
import { BrandingService } from "./branding.ts";
import { isImageKind } from "./image-setting.ts";
import { BrandingImages, IMAGE_UPLOAD_CAP, tooLarge } from "./images.ts";

/** The upload layer's own refusals (a file past its cap, a second file or field) in the kind's words: a 413 naming its
 *  limit, or "Send one file" (review M1 on #2633: the app's shared words name no limit). */
@Injectable()
class BrandingUploadWords implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const kind = (ctx.switchToHttp().getRequest() as { params?: { kind?: string } }).params?.kind;
    return next.handle().pipe(catchError((e: unknown) => {
      const msg = e instanceof HttpException ? String((e.getResponse() as { message?: unknown })?.message ?? e.message) : "";
      if (e instanceof HttpException && isImageKind(kind)) {
        if (e.getStatus() === 413 && /File too large/i.test(msg)) { try { tooLarge(kind); } catch (w) { return throwError(() => w); } }
        if (/Too many (files|parts|fields)|Unexpected field/i.test(msg)) {
          const detail = 'Send one PNG or JPEG file, in the field "file". Allowed here: PNG and JPEG. Nothing was stored.';
          return throwError(() => new HttpException({ type: "https://expatready.local/problems/one-file", title: "Not saved", status: 400, detail, message: detail, code: "ONE_FILE" }, 400));
        }
      }
      return throwError(() => e);
    }));
  }
}

type R = { platform?: StaffContext };
type F = { buffer: Buffer } | undefined;

@Controller("api/platform/branding")
export class BrandingController {
  private readonly b: BrandingService;
  constructor(@Inject(Db) db: Db, @Inject(BrandingImages) private readonly images: BrandingImages) { this.b = new BrandingService(db); }
  @Get() @PermissionKeys("agent/settings:list")
  async read(@Req() r: R) { const s = staffOf(r); return { ...(await this.b.read(s)), images: await this.images.links(s) }; }
  @Put() @PermissionKeys("agent/settings:edit")
  save(@Req() r: R, @Body() b: unknown) { return this.b.save(staffOf(r), b); }
  @Put(":kind") @PermissionKeys("agent/settings:edit") @UseInterceptors(BrandingUploadWords, FileInterceptor("file", { limits: { fileSize: IMAGE_UPLOAD_CAP, files: 1, fields: 2, parts: 3 } }))
  upload(@Req() r: R, @Param("kind") kind: string, @UploadedFile() f: F) { return this.images.upload(staffOf(r), kind, f ? { bytes: new Uint8Array(f.buffer) } : undefined); }
  @Delete(":kind") @PermissionKeys("agent/settings:edit")
  clear(@Req() r: R, @Param("kind") kind: string) { return this.images.clear(staffOf(r), kind); }
}

@Controller("api/public/firms/:firmKey/branding")
export class BrandingPublicController {
  constructor(@Inject(BrandingImages) private readonly images: BrandingImages) {}
  // The open mark and the route sit on the method's own line: QA-53's scan reads them there (check_forms_qa53.ts).
  @OpenRead("PF-13: a client page's header, the firm's name, colours, tagline and image links, no id") @Get("") read(@Param("firmKey") firmKey: string) { return this.images.publicBranding(firmKey); }
  @OpenRead("PF-13: the firm's logo, favicon or banner by its stable link") @Get(":kind") async image(@Param("firmKey") firmKey: string, @Param("kind") kind: string, @Query("v") v: unknown, @Res() res: Response) {
    const img = await this.images.publicImage(firmKey, kind, v);
    res.setHeader("Content-Type", img.mediaType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("ETag", img.etag);
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.status(200).end(Buffer.from(img.bytes));
  }
}
