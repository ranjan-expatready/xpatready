import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F7: the page that talks to the worker bundles `./protocol`, which must not drag the engine in. This walks the entry's
 * runtime import graph statically (type-only imports are erased by the compiler and are not edges).
 */
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ENTRY = resolve(SRC, 'worker/protocol-entry.ts');

/** Exactly the files the protocol entry may reach (an addition here is a deliberate decision), and the only package it may import. */
const ALLOWED_FILES = [
  'layout/limits.ts',
  'layout/render-tree.ts',
  'pdf/safe-text.ts',
  'runtime/timezone.ts',
  'runtime/wire-schemas.ts',
  'wire-limits.ts',
  'worker/limits.ts',
  'worker/protocol-entry.ts',
  'worker/protocol.ts',
];
const ALLOWED_PACKAGES = ['zod'];
const EDGE = /^\s*(?:import|export)\s+(?!type\b)(?:[^;'"]*?\s+from\s+)?(?:'([^']+)'|"([^"]+)")/gm;

interface Graph {
  readonly files: string[];
  readonly packages: string[];
}

function walk(entry: string): Graph {
  const files = new Set<string>();
  const packages = new Set<string>();
  const visit = (file: string): void => {
    if (files.has(file)) return;
    files.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(EDGE)) {
      const spec = match[1] ?? match[2] ?? '';
      if (!spec.startsWith('.')) {
        packages.add(spec);
        continue;
      }
      const target = resolve(dirname(file), spec.replace(/\.js$/, '.ts'));
      if (!existsSync(target)) throw new Error(`${relative(SRC, file)} imports ${spec}, which is not a source file`);
      visit(target);
    }
  };
  visit(entry);
  return { files: [...files].map((file) => relative(SRC, file)).sort(), packages: [...packages].sort() };
}

describe('the ./protocol entry reaches no engine code (F7)', () => {
  const graph = walk(ENTRY);

  it('walks a real graph: the entry, the schemas and the render-tree schema', () => {
    expect(graph.files).toContain('worker/protocol-entry.ts');
    expect(graph.files).toContain('worker/protocol.ts');
    expect(graph.files).toContain('layout/render-tree.ts');
    expect(graph.packages).toContain('zod');
  });

  it('reaches exactly the allow-listed files and imports only zod', () => {
    expect(graph.files).toEqual(ALLOWED_FILES);
    expect(graph.packages).toEqual(ALLOWED_PACKAGES);
  });

  it('the walker sees a heavy edge when there is one: the session entry reaches the sandbox', () => {
    const served = walk(resolve(SRC, 'worker/index.ts'));
    expect(served.files.some((file) => file.startsWith('script/'))).toBe(true);
    expect(served.packages.some((name) => name.startsWith('quickjs'))).toBe(true);
  });
});
