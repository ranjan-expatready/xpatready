/**
 * The form runtime (W02-T06; the package index exports the public part, W02-T08): executes a form's own scripts with XFA semantics over
 * the form DOM - script objects, event dispatch, the load sequence, the calculate settle - behind the sandbox's host bridge.
 */
export { createFormRuntime } from './runtime.js';
export { XfaAnswerRequiredError, XfaRuntimeError } from './errors.js';
export type { XfaRuntimeErrorCode } from './errors.js';
export { MAX_CALC_PASSES, MAX_EXEC_EVENT_DEPTH, MAX_RECORDED_BYTES, MAX_RECORDED_ENTRIES } from './limits.js';
export type { RuntimeLimits } from './limits.js';
export { packFormDescriptorSchema } from './pack.js';
export type { PackFormDescriptor } from './pack.js';
export type { UserAction, UserActionCheck } from './user-access.js';
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
  ProblemList,
  RuntimeState,
  SavedFormState,
  SetValueResult,
  UnsupportedRecord,
  ValidateResult,
} from './options.js';
