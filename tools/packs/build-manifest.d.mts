/** Types for build-manifest.mjs, so the TypeScript bake (tools/bake/bake-terrain.ts) can call it. */
export interface PackManifest {
  version: number;
  generatedAt: string;
  packs: Record<
    string,
    { id: string; files: { path: string; bytes: number; sha256: string }[]; totalBytes: number }
  >;
  fileIndex: Record<string, { packId: string; sha256: string; bytes: number }>;
}

/** Writes `public/packs/manifest.json` (or `out`) from the files under `public/`, and returns it. */
export function buildPackManifest(options?: { out?: string }): Promise<PackManifest>;
