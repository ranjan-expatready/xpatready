/**
 * The protocol entry (`@expatready-eros/xfa-engine/protocol`, W03-T14): what a page needs to talk to the form session - the
 * request and reply schemas, the gate for both directions, the types and the ceilings - and nothing that runs a form. Its
 * import graph holds the schemas, the render-tree schema and `zod`; a test walks it and fails if it reaches the engine.
 * The server side is `@expatready-eros/xfa-engine/worker`.
 */
export { PROTOCOL_VERSION, opSchema, parseRequest, parseResponse, requestSchema, responseSchema } from './protocol.js';
export type { FailedResponse, MessageBoxCallData, Op, OpenRequest, ParsedRequest, Request, Response } from './protocol.js';
export { MAX_ANSWER_VALUE, MAX_ANSWERS_PER_OP, MAX_OPS_PER_OPEN, MAX_OPS_TEXT_CHARS, MIN_FORM_RUN_DEADLINE_MS } from './limits.js';
