import type { Metadata } from 'next';
import { Button } from '@/components/Button.tsx';
import { LogoMark } from '@/components/Logo.tsx';
import { SiteFooter } from '@/components/SiteFooter.tsx';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import { boardHref, readBoardContext, withBoardContext } from '@/lib/board-url.ts';
import { toArabicDigits } from '@/lib/format.ts';
import { CONTACT_EMAIL } from '@/lib/site.ts';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'عن برينسيس — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** How it works, in the order it happens — numbered because it is a sequence. */
const STEPS = [
  { title: 'اعرضي خدمتك', body: 'دقيقتان: اسمك، ومدينتك، ووصف قصير، وطريقة تواصل. بلا حساب وبلا تسجيل.' },
  { title: 'تظهر لكل سيدة', body: 'يظهر إعلانك فورًا على اللوحة لكل من تزورها في بلدك.' },
  { title: 'تتواصل معك مباشرة', body: 'على واتساب أو الهاتف أو إنستغرام، وتتفقان معًا على كل شيء.' },
  { title: 'بلا وسيط ولا عمولة', body: 'برينسيس لا تتدخل في الاتفاق ولا في الدفع، ولا تأخذ أي عمولة.' },
];

/**
 * /about — how it works (#how) and how to reach us (#contact), on one page: two short
 * things that together make a page. The footer links straight to each section.
 */
export default async function AboutPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  const home = boardHref(ctx);
  const post = withBoardContext('/new', ctx);
  return (
    <div className={styles.page}>
      <SiteHeader homeHref={home} backHref={home} postHref={post} />
      <main id="main" tabIndex={-1} className={styles.main}>
        <span className={styles.blob} aria-hidden="true" />

        <header className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.title}>كيف يعمل برينسيس</h1>
            <p className={styles.lead}>لوحة إعلانات، ولا شيء غير ذلك.</p>
          </div>
          {/* the built P in an arch tile, as on the shared-link image */}
          <div className={styles.tile} aria-hidden="true">
            <LogoMark variant="full" className={styles.mark} />
          </div>
        </header>

        <section id="how" className={styles.how} aria-labelledby="how-title">
          <h2 id="how-title" className="visually-hidden">كيف يعمل؟</h2>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.number} aria-hidden="true">{toArabicDigits(i + 1)}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </li>
            ))}
          </ol>
          <div className={styles.cta}>
            <Button variant="accent" href={post}>اعرضي خدمتك</Button>
          </div>
        </section>

        <section id="contact" className={styles.contact} aria-labelledby="contact-title">
          <div className={styles.contactText}>
            <h2 id="contact-title" className={styles.contactTitle}>تواصلي معنا</h2>
            <p className={styles.contactBody}>طلبات حذف الإعلانات تُرسل إلى العنوان نفسه، مع رابط الإعلان.</p>
          </div>
          {/* the address is this section's one action: a full-size button */}
          <Button variant="accent" href={`mailto:${CONTACT_EMAIL}`}><bdi dir="ltr">{CONTACT_EMAIL}</bdi></Button>
        </section>
      </main>
      <SiteFooter ctx={ctx} />
    </div>
  );
}
