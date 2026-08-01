// lib/chat/aiSdkFlag.ts
// Primary chat Vercel AI SDK migration gate.
//
// The adapter may be committed and deployed while this remains dark. The
// existing direct Perplexity REST path stays active unless the environment
// explicitly enables this flag.

export function chatAiSdkEnabled(): boolean {
  const value = (process.env.CHAT_AI_SDK_ENABLED ?? '')
    .trim()
    .toLowerCase();

  return value === '1' || value === 'true';
}
