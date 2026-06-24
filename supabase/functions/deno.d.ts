/**
 * Minimal ambient declarations for Deno-specific globals/specifiers used by Edge
 * Functions, so the Node-side `tsc` (tsconfig.edge.json) can typecheck Deno-targeted
 * files without pulling Deno's full lib or the npm: resolver. Deno itself is the
 * authoritative typechecker at deploy; this shim only covers what we actually use.
 */
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  env: { get(key: string): string | undefined };
};

declare module 'npm:@supabase/supabase-js@2' {
  // Loosely typed on purpose: index.ts casts the result to the store's own
  // structural SupabaseRefreshClient. Real types resolve under Deno at deploy.
  export function createClient(url: string, key: string): unknown;
}
