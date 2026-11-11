import type { BridgeValue, NodeRef } from '../bridge-types.js';
import { createSandbox, type Sandbox, type SandboxOptions } from '../sandbox.js';
import { XfaScriptError } from '../errors.js';
import { FIXED_CLOCK, FakeHost } from './fake-host.js';

export interface Harness {
  readonly host: FakeHost;
  readonly sandbox: Sandbox;
}

const open: Sandbox[] = [];

/** Creates a strict-mode sandbox over a fresh fake host; `afterEachDispose` disposes everything it created. */
export async function makeHarness(
  overrides: Partial<Omit<SandboxOptions, 'host' | 'xfaRoot'>> = {},
  host: FakeHost = new FakeHost(),
): Promise<Harness> {
  const sandbox = await createSandbox({ host, xfaRoot: host.root, clock: FIXED_CLOCK, strict: true, ...overrides });
  open.push(sandbox);
  return { host, sandbox };
}

export function afterEachDispose(): void {
  for (const sandbox of open.splice(0)) sandbox.dispose();
}

/** Runs `fn`, expecting an `XfaScriptError`; returns it. Fails the test if nothing, or a different error, is thrown. */
export function expectScriptError(fn: () => unknown): XfaScriptError {
  try {
    fn();
  } catch (error) {
    if (error instanceof XfaScriptError) return error;
    throw new Error(`expected XfaScriptError, got ${String(error)}`, { cause: error });
  }
  throw new Error('expected XfaScriptError, nothing was thrown');
}

export type { BridgeValue, NodeRef };
