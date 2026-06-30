// app/chat/review/page.tsx — review screen (master prompt §G). Client component renders grouped captured fields
// with inline edit; "Generate notice PDF" → notice rail (Group 4); "Send myself this draft" → magic-link (Group 3).

import { SiteHeader } from '@/components/site-header';
import { ReviewScreen } from '@/components/chat/ReviewScreen';

export const metadata = { title: 'Review your notice — OwnerPilot AI', robots: { index: false } };

export default function ReviewPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ReviewScreen />
    </div>
  );
}
