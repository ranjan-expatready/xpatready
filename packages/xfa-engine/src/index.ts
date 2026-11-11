export type { PdfDict, PdfIndirect, PdfName, PdfRef, PdfStream, PdfString, PdfValue } from './pdf/types.js';
export { XfaPdfError } from './pdf/errors.js';
export type { XfaErrorCode } from './pdf/errors.js';
export { MAX_PDF_BYTES, openXfaPdf } from './xfa-pdf.js';
export type { PacketReplacement, XfaPacket, XfaPdf } from './xfa-pdf.js';
export { createFormRuntime, packFormDescriptorSchema } from './runtime/index.js';
export type {
  BarcodePayloads,
  ClearButtonReport,
  EventFields,
  EventResult,
  FormRuntime,
  FormProblem,
  FormRuntimeOptions,
  HostIdentity,
  HostRequestRecord,
  LoadReport,
  MessageBoxCall,
  MessageRecord,
  NoteRecord,
  PackFormDescriptor,
  ProblemList,
  RuntimeLimits,
  RuntimeState,
  SavedFormState,
  SetValueResult,
  UnsupportedRecord,
  UserAction,
  UserActionCheck,
  ValidateResult,
} from './runtime/index.js';
export { RENDER_TREE_VERSION, renderTreeSchema } from './layout/render-tree.js';
export type { RenderItem, RenderPage, RenderTree } from './layout/render-tree.js';
export { dashArrayOf } from './layout/graphics/stroke.js';
