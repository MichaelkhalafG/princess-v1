import type { Listing } from '@/lib/listing.ts';
import { getCategory } from '@/lib/constants.ts';
import { areaText, contactLinks, relativeDate } from '@/lib/format.ts';
import { Button } from './Button.tsx';
import { CategoryBadge } from './CategoryBadge.tsx';
import { CategoryIcon } from './CategoryIcon.tsx';
import styles from './ListingCard.module.css';
import tones from './tones.module.css';

// The arch echo: a short stroke concentric with the photo's sweeping corner, set a little
// outside it in the wedge the corner leaves. Drawn in a box the size of the corner's radius
// (100 units = the radius), so it stays concentric at any card width. It stops short of
// both ends — run the full quarter it reads as a second outline of the photo.
const ECHO_GAP = 12; // distance outside the curve, in hundredths of the radius
const ECHO_FROM = 30; // degrees from the top of the curve …
const ECHO_TO = 60; // … to here
const echoPoint = (deg: number) => {
  const r = 100 + ECHO_GAP;
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.sin(a)).toFixed(2)} ${(100 - r * Math.cos(a)).toFixed(2)}`;
};
const ECHO_PATH = `M${echoPoint(ECHO_FROM)}A${100 + ECHO_GAP} ${100 + ECHO_GAP} 0 0 1 ${echoPoint(ECHO_TO)}`;

function ArchEcho() {
  return (
    <svg className={styles.echo} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={ECHO_PATH} />
    </svg>
  );
}

/** A price longer than this (in characters) is set smaller: at full size a 40-character
    price filled two lines in large pink and outweighed the title. */
const PRICE_LONG_CHARS = 20;

/**
 * One listing.
 *   full    — the board's card: description and contact buttons
 *   compact — the detail page's "others" row: the whole card is one link to the listing
 *
 * States:
 *   - price or no price: the price is her own free text, shown exactly as typed; with no
 *     price the line is simply absent (the common case);
 *   - photo or no photo: without one, a panel in the category's tone with its icon
 *     (not her initial: «ه» is the digit ٥ and «ا» the digit ١ in this font);
 *   - contact (full only): the first method she gave (WhatsApp → call → Instagram) is the
 *     main button, styled identically whichever it is; the rest are round buttons.
 */
export function ListingCard({
  listing,
  photoSrc,
  now,
  variant = 'full',
  href,
  contextQuery,
}: {
  listing: Listing;
  /** Public URL of listing.photo, resolved by the caller (lib/listings.ts photoUrl). */
  photoSrc: string | null;
  now: Date;
  variant?: 'full' | 'compact';
  /** Where the card opens. Defaults to the listing's own page. */
  href?: string;
  /** The board context (country/category/search) the card was opened from, carried in the
      listing link so the listing page can offer a real way back. */
  contextQuery?: string;
}) {
  const { tone, icon } = getCategory(listing.category);
  const priceLong = listing.price !== null && [...listing.price].length > PRICE_LONG_CHARS ? true : undefined;
  const compact = variant === 'compact';
  const target = href ?? `/listing/${listing.id}${contextQuery ? `?${contextQuery}` : ''}`;

  const media = (
    <div className={styles.media}>
      <ArchEcho />
      {photoSrc ? (
        <div className={styles.photo}>
          <img src={photoSrc} alt={listing.title} loading="lazy" decoding="async" />
        </div>
      ) : (
        <div className={`${styles.monogramPanel} ${tones[tone]}`} aria-hidden="true">
          <CategoryIcon path={icon} className={styles.monogram} />
        </div>
      )}
      <CategoryBadge category={listing.category} className={styles.badge} />
    </div>
  );

  const area = areaText(listing.city, listing.district);
  // name and area truncate with an ellipsis on the card; the title attribute carries the
  // full text on hover, and the listing page shows it in full
  const meta = (
    <div className={styles.meta}>
      <span className={styles.name} title={listing.name}>{listing.name}</span>
      <span className={styles.area} title={area}>{area}</span>
    </div>
  );

  const date = (
    <time className={styles.date} dateTime={listing.created_at}>
      {relativeDate(listing.created_at, now)}
    </time>
  );

  if (compact) {
    return (
      <a href={target} className={`${styles.card} ${styles.compact}`}>
        {media}
        <div className={styles.body}>
          {meta}
          <span className={styles.title}>{listing.title}</span>
          {listing.price && <span className={styles.price} data-long={priceLong}>{listing.price}</span>}
          {date}
        </div>
      </a>
    );
  }

  const [primary, ...secondary] = contactLinks(listing);
  const external = (link: string) => (link.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});

  return (
    // The whole card opens the listing through ONE real link — the title — whose ::after is
    // stretched over the card ("stretched link"). The contact buttons are sibling links
    // layered above it, never nested inside it, so each does only its own thing.
    // id: "back to the board" from the listing page lands on this card (lib/board-url.ts boardHrefAt)
    <article id={`l-${listing.id}`} className={`${styles.card} ${styles.linked}`}>
      {media}
      <div className={styles.body}>
        {meta}
        <h3 className={styles.title}>
          <a href={target} className={styles.cardLink}>{listing.title}</a>
        </h3>
        <p className={styles.description}>{listing.description}</p>
        {listing.price && <div className={styles.price} data-long={priceLong}>{listing.price}</div>}

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
