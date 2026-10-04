import type { ReactNode } from 'react';
import { toArabicDigits } from '@/lib/format.ts';
import { boardHref, withBoardContext, type BoardContext } from '@/lib/board-url.ts';
import { SiteFooter } from './SiteFooter.tsx';
import { SiteHeader } from './SiteHeader.tsx';
import styles from './ReadingPage.module.css';

export type ReadingSection = { id: string; title: string; body: ReactNode };

/**
 * A page meant to be read — terms, privacy: one 640px column. A title, the "in short" box
 * (what most people will read), a contents list, then the numbered sections in one card
 * with the site's sweeping corner.
 *
 * While the text is a draft: pass `draft` (the banner) and wrap each unsettled sentence
 * in <Flag>. Finishing the text means deleting the prop and the <Flag> wrappers — the
 * layout does not change.
 */
export function ReadingPage({ ctx, title, updated, summary, sections, draft = false }: {
  ctx: BoardContext;
  title: string;
  /** "آخر تحديث: …" */
  updated: ReactNode;
  /** the "باختصار" points */
  summary: ReactNode[];
  sections: ReadingSection[];
  draft?: boolean;
}) {
  const home = boardHref(ctx);
  return (
    <div className={styles.page}>
      <SiteHeader homeHref={home} backHref={home} postHref={withBoardContext('/new', ctx)} />
      <main id="main" tabIndex={-1} className={styles.main}>
        {draft && (
          <p className={styles.draft} role="note">
            مسودة للمراجعة وإعادة الكتابة — ليست نصًا نهائيًا. الجمل المظلّلة لم يُتحقق منها بعد.
          </p>
        )}
        <header className={styles.intro}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.updated}>{updated}</p>
        </header>

        <section className={styles.summary} aria-labelledby="summary-title">
          <h2 id="summary-title" className={styles.summaryTitle}>باختصار</h2>
          <ul>
            {summary.map((point, i) => <li key={i}>{point}</li>)}
          </ul>
        </section>

        <nav className={styles.contents} aria-labelledby="contents-title">
          <h2 id="contents-title" className={styles.contentsTitle}>المحتوى</h2>
          <ol>
            {sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="tap-area">{s.title}</a></li>)}
          </ol>
        </nav>

        <article className={styles.card}>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className={styles.section} aria-labelledby={`${s.id}-title`}>
              <h2 id={`${s.id}-title`} className={styles.sectionTitle}>
                <span className={styles.number} aria-hidden="true">{toArabicDigits(i + 1)}</span>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter ctx={ctx} />
    </div>
  );
}

/** A sentence in a draft that is not settled: highlighted, with why, until it is rewritten. */
export function Flag({ why, children }: { why: string; children: ReactNode }) {
  return (
    <span className={styles.flag}>
      {children}
      <span className={styles.why}> [للمراجعة: {why}]</span>
    </span>
  );
}
