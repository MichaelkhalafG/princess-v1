import type { Metadata } from 'next';
import { Button } from '@/components/Button.tsx';
import { StatusPage } from '@/components/StatusPage.tsx';
import { NO_BOARD_CONTEXT, boardHref } from '@/lib/board-url.ts';

export const metadata: Metadata = { title: 'الصفحة غير موجودة — برينسيس' };

// Any address the site does not have. (A listing that is gone has its own page:
// app/listing/[id]/not-found.tsx.)
export default function NotFound() {
  return (
    <StatusPage ctx={NO_BOARD_CONTEXT} title="هذه الصفحة غير موجودة" body="ربما تغيّر الرابط أو نقص منه حرف. ابدئي من اللوحة، فكل الإعلانات هناك.">
      <Button variant="accent" href={boardHref(NO_BOARD_CONTEXT)}>العودة إلى اللوحة</Button>
    </StatusPage>
  );
}
