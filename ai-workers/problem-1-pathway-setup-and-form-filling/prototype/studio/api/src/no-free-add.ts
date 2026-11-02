// P-158 item 1: nothing is added to the shared library by hand; the 410 says where the item comes from instead. Its own
// file (G-CORE B2) so the change-set door (change-sets.ts) and the library's routes (library-sources.ts) both import it
// without importing each other.
import { HttpException, HttpStatus } from "@nestjs/common";

/** P-158 item 1: nothing is added to the library by hand; the 410 says where the item comes from instead. */
const FROM: Record<string, string> = {
  field: "A field comes from a form field (add the form under Forms and confirm what the AI read), a checklist line, or a rule that needs it.",
  section: "Sections are proposed from the forms' own parts and confirmed on To review.",
  answer_list: "An answer list comes from a form field's own choices or an IRCC code list.",
};
export const noFreeAdd = (kind: keyof typeof FROM): never => {
  throw new HttpException({ type: "https://expatready.local/problems/no-free-add", title: "Not added by hand", status: HttpStatus.GONE, detail: `Nothing is added to the shared library by hand. ${FROM[kind]}` }, HttpStatus.GONE);
};

