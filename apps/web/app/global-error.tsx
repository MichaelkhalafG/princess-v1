'use client';

import { Button } from '@/components/Button.tsx';
import { StatusPage } from '@/components/StatusPage.tsx';
import { NO_BOARD_CONTEXT, boardHref } from '@/lib/board-url.ts';
import { bodyFont, headingFont, logoFont } from './fonts.ts';
import './globals.css';

// The root layout itself failed: this replaces it, so it brings its own <html>, fonts and
// styles (the docs: global-error renders its own document). No metadata export is
// allowed here, hence <title>.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ar" dir="rtl" className={`${headingFont.variable} ${bodyFont.variable} ${logoFont.variable}`}>
      <body>
        <title>تعذّر فتح الموقع — برينسيس</title>
        <StatusPage ctx={NO_BOARD_CONTEXT} title="تعذّر فتح الموقع" body="قد يكون الخلل مؤقتًا. حاولي مرة أخرى بعد لحظات.">
          <Button variant="accent" onClick={() => retry()}>حاولي مرة أخرى</Button>
          <Button variant="soft" href={boardHref(NO_BOARD_CONTEXT)}>العودة إلى اللوحة</Button>
        </StatusPage>
      </body>
    </html>
  );
}
