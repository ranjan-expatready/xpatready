// C11.9: the routes of delete, retire and restore for shared fields and document types (the decision is the one guard's,
// api/src/lifecycle.ts with api/src/library-items.ts). Kept apart from library-items.ts so the guard can import that file
// without an import cycle. Explicit paths, so Shared library › Forms keeps its own routes (library/forms/:code…).
import { Body, Controller, Delete, Get, Headers, HttpCode, HttpException, Inject, Param, Post } from "@nestjs/common";
import { LifecycleReasonBody } from "../../contracts/form-library.ts";
import { actorOf, Db, readerOf, Workspace } from "./core.ts";
import { Lifecycle } from "./lifecycle.ts";
import { itemUses, reorderForms, type ItemKind } from "./library-items.ts";

type H = string | undefined;
const reason = (b: unknown) => {
  const r = LifecycleReasonBody.safeParse(b ?? {});
  if (!r.success) throw new HttpException({ type: "https://expatready.local/problems/check-the-request", title: "Check the request", status: 400, detail: r.error.issues[0]?.code === "invalid_type" ? "Say why (3 to 300 characters)." : r.error.issues[0]?.message ?? "Say why (3 to 300 characters)." }, 400); // break round 2 minor: never Zod's own words
  return r.data.reason;
};

@Controller("api")
export class LibraryItemsController {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Lifecycle) private readonly lifecycle: Lifecycle) {}
  private async uses(a: H, kind: ItemKind, key: string) { const who = readerOf(a); return itemUses(this.db, await this.ws.id(), kind, key, undefined, who.id); }
  private act(a: H, kind: ItemKind, key: string, action: "DELETE" | "RETIRE" | "RESTORE", b: unknown) { return this.lifecycle.propose(actorOf(a), kind, key, action, reason(b)); }
  @Get("library/fields/:key/uses") fieldUses(@Headers("x-actor") a: H, @Param("key") k: string) { return this.uses(a, "field", k); }
  @Delete("library/fields/:key") fieldDelete(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "field", k, "DELETE", b); }
  @Post("library/fields/:key/delete") fieldDeletePost(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "field", k, "DELETE", b); } // Screen 04 concept §6
  @Post("library/fields/:key/retire") fieldRetire(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "field", k, "RETIRE", b); }
  @Post("library/fields/:key/restore") fieldRestore(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "field", k, "RESTORE", b); }
  // C11.9: sections, by the same guard (Screen 04 concept §6 routes).
  @Get("library/sections/:key/uses") sectionUses(@Headers("x-actor") a: H, @Param("key") k: string) { return this.uses(a, "section", k); }
  @Delete("library/sections/:key") sectionDelete(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "section", k, "DELETE", b); }
  @Post("library/sections/:key/delete") sectionDeletePost(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "section", k, "DELETE", b); }
  @Post("library/sections/:key/retire") sectionRetire(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "section", k, "RETIRE", b); }
  @Post("library/sections/:key/restore") sectionRestore(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "section", k, "RESTORE", b); }
  // C11.9 (P-116 "reorder where order matters"): the filing order of a combination's forms.
  @Post("combinations/:id/forms/reorder") @HttpCode(200) reorderForms(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return reorderForms(this.db, actorOf(a), id, b); }
  @Get("library/document-types/:key/uses") typeUses(@Headers("x-actor") a: H, @Param("key") k: string) { return this.uses(a, "document_type", k); }
  @Delete("library/document-types/:key") typeDelete(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "document_type", k, "DELETE", b); }
  @Post("library/document-types/:key/delete") typeDeletePost(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "document_type", k, "DELETE", b); } // Screen 04 concept §6
  @Post("library/document-types/:key/retire") typeRetire(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "document_type", k, "RETIRE", b); }
  @Post("library/document-types/:key/restore") typeRestore(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "document_type", k, "RESTORE", b); }
}
