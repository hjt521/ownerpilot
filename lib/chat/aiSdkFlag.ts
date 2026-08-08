// lib/chat/aiSdkFlag.ts
// Primary chat Vercel AI SDK migration gate.
//
// The adapter may be committed and deployed while this remains dark. The
// existing direct Perplexity REST path stays active unless an isolated Vercel
// Preview deployment explicitly enables this flag. Production always remains
// on the REST adapter even if the flag is accidentally configured there.

export function chatAiSdkEnabled(): boolean {
  if (process.env.VERCEL_ENV !== 'preview') return false;

  const value = (process.env.CHAT_AI_SDK_ENABLED ?? '')
    .trim()
    .toLowerCase();

  return value === '1' || value === 'true';
}
