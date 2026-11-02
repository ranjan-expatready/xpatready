// C8.2 filing record, slice 1 (M3-F, runtime lane): a case's filing record and a filing's application number.
import type { Feature } from "../features.ts";
import { FilingRecord, FilingRecordController } from "../filing-record.ts";
export default { controllers: [FilingRecordController], providers: [FilingRecord] } satisfies Feature;
