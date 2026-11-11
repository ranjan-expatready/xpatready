/**
 * The worker entry (`@expatready-eros/xfa-engine/worker`, W03-T14): `serveFormSession`, which a Web Worker or `worker_thread`
 * calls on its port. The messages a client and the session speak are in `@expatready-eros/xfa-engine/protocol`, which does not
 * bundle the engine. Nothing of the engine's internals is here.
 *
 * SIZING RULE for `FormSessionOptions.limits`: `MAX_OPS_PER_OPEN` (1,500) is a count that guards a wall-clock budget, the run's total
 * time `formRunDeadlineMs`. A deployment must keep `formRunDeadlineMs >= 2 x (MAX_OPS_PER_OPEN x the worst ms/op it measured on its
 * slowest supported device)`; the corpus forms measure about 40 ms/op in Node on Apple silicon, so the session refuses to be created with
 * a `formRunDeadlineMs` below `MIN_FORM_RUN_DEADLINE_MS` (exported here: `MAX_OPS_PER_OPEN` x `WORST_MS_PER_OP` x `REPLAY_HEADROOM`, 120,000 ms today; `INVALID_OPTIONS`). A client rebases its log (`snapshot`) well before the ceiling.
 */
export { serveFormSession } from './session.js';
export { MIN_FORM_RUN_DEADLINE_MS } from './limits.js';
export type { FormSessionHandle, SessionPort } from './session.js';
export type { FormSessionOptions } from './form-session.js';
