import type { Listing } from '@/lib/listing.ts';
import { getCategory } from '@/lib/constants.ts';
import { areaText, contactLinks, monogram, relativeDate } from '@/lib/format.ts';
import { Button } from './Button.tsx';
import { CategoryBadge } from './CategoryBadge.tsx';
import styles from './ListingCard.module.css';
import tones from './tones.module.css';

/**
 * One listing.
 *   full    — the board's card: description and contact buttons
 *   compact — the detail page's "others" row: the whole card is one link to the listing
 *
 * States:
 *   - price or no price: the price is her own free text, shown exactly as typed; with no
 *     price the line is simply absent (the common case);
 *   - photo or no photo: without one, a monogram panel in the category's tone;
 *   - contact (full only): the first method she gave (WhatsApp → call → Instagram) is the
 *     main button, styled identically whichever it is; the rest are round buttons.
 */
export function ListingCard({
  listing,
  photoSrc,
  now,
  variant = 'full',
  href,
}: {
  listing: Listing;
  /** Public URL of listing.photo, resolved by the caller (lib/listings.ts photoUrl). */
  photoSrc: string | null;
  now: Date;
  variant?: 'full' | 'compact';
  /** Required for the compact card: where the card links. */
  href?: string;
}) {
  const tone = getCategory(listing.category).tone;
  const compact = variant === 'compact';

  const media = (
    <div className={styles.media}>
      {photoSrc ? (
        <div className={styles.photo}>
          <img src={photoSrc} alt={listing.title} loading="lazy" decoding="async" />
        </div>
      ) : (
        <div className={`${styles.monogramPanel} ${tones[tone]}`} aria-hidden="true">
          <span className={styles.monogram}>{monogram(listing.name)}</span>
        </div>
      )}
      <CategoryBadge category={listing.category} className={styles.badge} />
    </div>
  );

  const meta = (
    <div className={styles.meta}>
      <span className={styles.name}>{listing.name}</span>
      <span className={styles.area}>{areaText(listing.city, listing.district)}</span>
    </div>
  );

  const date = (
    <time className={styles.date} dateTime={listing.created_at}>
      {relativeDate(listing.created_at, now)}
    </time>
  );

  if (compact) {
    return (
      <a href={href} className={`${styles.card} ${styles.compact}`}>
        {media}
        <div className={styles.body}>
          {meta}
          <span className={styles.title}>{listing.title}</span>
          {listing.price && <span className={styles.price}>{listing.price}</span>}
          {date}
        </div>
      </a>
    );
  }

  const [primary, ...secondary] = contactLinks(listing);
  const external = (link: string) => (link.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});

  return (
    <article className={styles.card}>
      {media}
      <div className={styles.body}>
        {meta}
        <h3 className={styles.title}>{listing.title}</h3>
        <p className={styles.description}>{listing.description}</p>
        {listing.price && <div className={styles.price}>{listing.price}</div>}

        <div className={styles.actions}>
          {primary && (
            <Button variant="contact" href={primary.href} {...external(primary.href)}>
              {primary.label}
            </Button>
          )}
          {secondary.map((c) => (
            <Button key={c.kind} variant="round" href={c.href} aria-label={c.label} {...external(c.href)}>
              {c.shortLabel}
            </Button>
          ))}
        </div>

        {date}
      </div>
    </article>
  );
}
