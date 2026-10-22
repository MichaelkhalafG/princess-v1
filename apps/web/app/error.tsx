'use client';

import { useEffect } from 'react';
import { Button } from '@/components/Button.tsx';
import { StatusPage } from '@/components/StatusPage.tsx';
import { NO_BOARD_CONTEXT, boardHref } from '@/lib/board-url.ts';

// Something failed while a page was rendering (the database was unreachable, say). In
// production the error carries no details, only a digest that matches the server log.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusPage ctx={NO_BOARD_CONTEXT} title="تعذّر فتح هذه الصفحة" body="قد يكون الخلل مؤقتًا. حاولي مرة أخرى بعد لحظات، أو عودي إلى اللوحة.">
      <Button variant="accent" onClick={() => retry()}>حاولي مرة أخرى</Button>
      <Button variant="soft" href={boardHref(NO_BOARD_CONTEXT)}>العودة إلى اللوحة</Button>
    </StatusPage>
  );
}
