// lib/btrm/cs/adaptations.ts
// CS-001 — deterministic style-adaptation notes derived from AudienceContext (BTRM-001 spec §3.8). These are
// fixed, templated notes about HOW to adapt delivery — never invented message content, and never a translation
// CS-001 performs itself. Tone/audience adaptation is the one place spec §3.8 permits tone as a first-class
// input, but only to shape delivery, never the underlying reliance determination (spec §1, §3.8).

import type { AudienceContext } from '../types';

export function adaptationsFor(audience: AudienceContext): string[] {
  const notes: string[] = [];
  if (audience.readingLevel === 'plain') {
    notes.push('use short sentences and plain-language wording; avoid legal jargon where a plain-language equivalent exists');
  }
  if (audience.languagePreference) {
    notes.push(`provide a translation or interpretation into ${audience.languagePreference} before sending — CS-001 does not translate itself`);
  }
  if (audience.deEscalationNeeded) {
    notes.push('lead with acknowledgment of the situation before stating facts and the requested action; avoid accusatory framing');
  }
  return notes;
}
