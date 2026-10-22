import { Suspense } from 'react';
import { NO_BOARD_CONTEXT } from '@/lib/board-url.ts';
import { NotFoundFromUrl, NotFoundView } from './NotFoundView.tsx';

// The board context lives in the URL, which only a client component can read here; the
// fallback is the same page without it (the board's default country).
export default function ListingNotFound() {
  return (
    <Suspense fallback={<NotFoundView ctx={NO_BOARD_CONTEXT} />}>
      <NotFoundFromUrl />
    </Suspense>
  );
}
