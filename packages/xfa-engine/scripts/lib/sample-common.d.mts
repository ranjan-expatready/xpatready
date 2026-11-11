export interface NeutralHost {
  readonly name: string;
  readonly appType: string;
  readonly version: string;
  readonly variation: string;
  readonly platform: string;
  readonly language: string;
}
export const NEUTRAL_HOST: NeutralHost;
export function realLocation(path: string): string;
export function repoRootOf(start: string): string | null;
