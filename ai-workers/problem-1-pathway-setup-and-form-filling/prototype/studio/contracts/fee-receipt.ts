// C8.2 B149 (P-408; board agent-view frame 7): the fee receipt's evidence, IRCC's "Transaction Approved" page, as the
// Prepare view shows it on a recorded filing. Its own file (contracts/ is on the M2 hot list, tools/m2-hot-files.txt:
// an M3 row adds a contract rather than change one). Pure, types only.
import type { FilingRecordView } from "./submission-record.ts";

/** One upload of the page: every one is kept, oldest first; the last is the receipt. */
export type FeeReceiptFileView = { id: string; file_name: string; media_type: string; size_bytes: number; uploaded_by: string; uploaded_at: string };
/** A filing's record with its uploads (empty: none uploaded; the typed number is optional either way). */
export type RecordWithReceipts = FilingRecordView & { fee_receipt_files: FeeReceiptFileView[] };
