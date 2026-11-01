// C11.9: the routes of delete, retire and restore for shared fields and document types (the decision is the one guard's,
// api/src/lifecycle.ts with api/src/library-items.ts). Kept apart from library-items.ts so the guard can import that file
// without an import cycle. Explicit paths, so Shared library › Forms keeps its own routes (library/forms/:code…).
import { Body, Controller, Delete, Get, Headers, HttpException, Inject, Param, Post } from "@nestjs/common";
import { LifecycleReasonBody } from "../../contracts/form-library.ts";
import { actorOf, Db, readerOf, Workspace } from "./core.ts";
import { Lifecycle } from "./lifecycle.ts";
import { itemUses, type ItemKind } from "./library-items.ts";

type H = string | undefined;
const reason = (b: unknown) => {
  const r = LifecycleReasonBody.safeParse(b ?? {});
  if (!r.success) throw new HttpException({ type: "https://expatready.local/problems/check-the-request", title: "Check the request", status: 400, detail: r.error.issues[0]?.message ?? "Say why (3 to 300 characters)." }, 400);
  return r.data.reason;
};

@Controller("api")
export class LibraryItemsController {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Lifecycle) private readonly lifecycle: Lifecycle) {}
  private async uses(a: H, kind: ItemKind, key: string) { readerOf(a); return itemUses(this.db, await this.ws.id(), kind, key); }
  private act(a: H, kind: ItemKind, key: string, action: "DELETE" | "RETIRE" | "RESTORE", b: unknown) { return this.lifecycle.propose(actorOf(a), kind, key, action, reason(b)); }
  @Get("library/fields/:key/uses") fieldUses(@Headers("x-actor") a: H, @Param("key") k: string) { return this.uses(a, "field", k); }
  @Delete("library/fields/:key") fieldDelete(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "field", k, "DELETE", b); }
  @Post("library/fields/:key/delete") fieldDeletePost(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "field", k, "DELETE", b); } // Screen 04 concept §6
  @Post("library/fields/:key/retire") fieldRetire(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "field", k, "RETIRE", b); }
  @Post("library/fields/:key/restore") fieldRestore(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "field", k, "RESTORE", b); }
  @Get("library/document-types/:key/uses") typeUses(@Headers("x-actor") a: H, @Param("key") k: string) { return this.uses(a, "document_type", k); }
  @Delete("library/document-types/:key") typeDelete(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "document_type", k, "DELETE", b); }
  @Post("library/document-types/:key/delete") typeDeletePost(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "document_type", k, "DELETE", b); } // Screen 04 concept §6
  @Post("library/document-types/:key/retire") typeRetire(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "document_type", k, "RETIRE", b); }
  @Post("library/document-types/:key/restore") typeRestore(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.act(a, "document_type", k, "RESTORE", b); }
}
