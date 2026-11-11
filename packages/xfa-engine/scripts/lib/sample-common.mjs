// Shared by the owner/dev sample tools (fill-sample.mjs, render-sample.mjs): the host-identity options, the neutral host
// identity, the --clock/--tz validation and the real-location helper. Lives outside src/ on purpose: node: imports.
import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { z } from 'zod';

/** What the form believes is running it: neutral, so no form branch keyed on a vendor name can fire. */
export const NEUTRAL_HOST = { name: 'xfa-engine', appType: 'xfa-engine', version: '0', variation: 'headless', platform: 'unspecified', language: 'en' };

/** --host-* flag -> HostIdentity key. */
export const HOST_OPTIONS = { 'host-name': 'name', 'host-app-type': 'appType', 'host-version': 'version', 'host-variation': 'variation', 'host-platform': 'platform', 'host-language': 'language' };

const hostText = (flag) => z.string().min(1, { error: `--${flag} must not be empty` }).max(64, { error: `--${flag} is longer than 64 characters` }).optional();

/** The zod shape of --tz, --clock and the six --host-* options (to spread into a strictObject). */
export const sharedOptionShape = {
  tz: z.string().min(1, { error: '--tz must not be empty' }).optional(),
  clock: z.iso.datetime({ offset: true, error: '--clock must be an ISO-8601 instant with a zone, e.g. 2026-06-15T12:00:00Z' }).optional(),
  ...Object.fromEntries(Object.keys(HOST_OPTIONS).map((flag) => [flag, hostText(flag)])),
};

/** Refinement for a schema built from `sharedOptionShape`: the six --host-* options come all together or not at all. */
export const allHostOrNone = [
  (o) => [0, 6].includes(Object.keys(HOST_OPTIONS).filter((flag) => o[flag] !== undefined).length),
  { error: 'give all six --host-* options or none' },
];

/** parseArgs option declarations of --tz, --clock and the six --host-* options. */
export const sharedParseArgsOptions = { tz: { type: 'string' }, clock: { type: 'string' }, ...Object.fromEntries(Object.keys(HOST_OPTIONS).map((flag) => [flag, { type: 'string' }])) };

/** The host identity the form sees: the six --host-* values, or the neutral identity. `options` is the parsed options object. */
export const hostOf = (options) =>
  options['host-name'] === undefined ? NEUTRAL_HOST : Object.fromEntries(Object.entries(HOST_OPTIONS).map(([flag, key]) => [key, options[flag]]));

/** The injected wall clock in epoch milliseconds: --clock, or now. */
export const clockOf = (options) => (options.clock === undefined ? Date.now() : Date.parse(options.clock));

/** Real location of a path that may not exist yet: the deepest existing ancestor is resolved (symlinks followed) and the missing rest appended. */
export function realLocation(path) {
  const missing = [];
  let existing = path;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return path;
    missing.unshift(basename(existing));
    existing = parent;
  }
  return join(realpathSync(existing), ...missing);
}

/** The repository holding `start` (the nearest ancestor with a `.git` entry, as a real location), or null when it is not in one. */
export function repoRootOf(start) {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return realLocation(dir);
    if (dirname(dir) === dir) return null;
  }
}
