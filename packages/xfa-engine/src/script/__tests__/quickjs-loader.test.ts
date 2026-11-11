import { afterEach, describe, expect, it } from 'vitest';
import { createQuickJsModule, quickJsColdInitMs } from '../quickjs-loader.js';
import { afterEachDispose, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

describe('WASM variant loading and cost (A5)', () => {
  it('the release-sync variant loads under vitest on this Node, so the sandbox is usable in the test and server runtimes', async () => {
    const module = await createQuickJsModule();
    const runtime = module.newRuntime();
    const context = runtime.newContext();
    const result = context.evalCode('6 * 7');
    expect(context.dump(context.unwrapResult(result))).toBe(42);
    context.dispose();
    runtime.dispose();
  });

  it('every sandbox gets its own WASM module and memory, so one run\'s memory bomb or corrupted instance cannot reach the next', async () => {
    const [a, b] = await Promise.all([createQuickJsModule(), createQuickJsModule()]);
    expect(a).not.toBe(b);
    expect(a.getWasmMemory()).not.toBe(b.getWasmMemory());
  });

  it('records cold module init, warm module init and sandbox setup cost (evidence A5)', async () => {
    const cold = quickJsColdInitMs() ?? (await createQuickJsModule(), quickJsColdInitMs());
    const warm: number[] = [];
    const setup: number[] = [];
    for (let i = 0; i < 20; i++) {
      const { sandbox } = await makeHarness();
      warm.push(sandbox.timings.moduleInitMs);
      setup.push(sandbox.timings.setupMs);
      afterEachDispose();
    }
    const median = (xs: number[]): number => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)] ?? Number.NaN;
    console.info(
      `[A5] cold module init (first in process): ${cold?.toFixed(1)} ms; ` +
        `warm module init median ${median(warm).toFixed(2)} ms (max ${Math.max(...warm).toFixed(2)}); ` +
        `runtime+context+prelude median ${median(setup).toFixed(2)} ms (max ${Math.max(...setup).toFixed(2)})`,
    );
    expect(cold).toBeGreaterThan(0);
    expect(cold).toBeLessThan(5000);
    expect(median(warm)).toBeLessThan(100);
    expect(median(setup)).toBeLessThan(100);
  });
});
