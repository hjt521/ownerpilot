/**
 * Minimal ambient declaration of the Deno globals used by Edge Functions, so the
 * Node-side `tsc` (tsconfig.edge.json) can typecheck Deno-targeted entry files
 * without pulling Deno's full lib. Deno itself is the authoritative typechecker
 * at deploy; this shim only needs to cover the APIs we actually call.
 */
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  env: { get(key: string): string | undefined };
};
