import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site.ts';
import { bodyFont, headingFont, logoFont } from './fonts.ts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: 'برينسيس',
  description: 'اعرضي خدمتك أو ملابسك، وتتواصل معك من تحتاجها عبر واتساب مباشرة. بلا وسيط وبلا عمولة.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Arabic only, right-to-left — set once here for the whole site.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${headingFont.variable} ${bodyFont.variable} ${logoFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
