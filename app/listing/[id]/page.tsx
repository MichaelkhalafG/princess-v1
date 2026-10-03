import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/Button.tsx';
import { CategoryBadge } from '@/components/CategoryBadge.tsx';
import { ListingCard } from '@/components/ListingCard.tsx';
import { PostedBanner } from '@/components/PostedBanner.tsx';
import { SiteFooter } from '@/components/SiteFooter.tsx';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import { getCategory, getCountry } from '@/lib/constants.ts';
import { areaText, contactLinks, listingCountLabel, monogram, relativeDate } from '@/lib/format.ts';
import { fetchListing, fetchOthers, photoUrl } from '@/lib/listings.ts';
import { getSupabase } from '@/lib/supabase.ts';
import tones from '@/components/tones.module.css';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await fetchListing(getSupabase(), (await params).id);
  return { title: listing ? `${listing.title} — برينسيس` : 'برينسيس' };
}

export default async function ListingPage({ params, searchParams }: Props) {
  const [{ id }, { posted }] = await Promise.all([params, searchParams]);
  const db = getSupabase();
  const listing = await fetchListing(db, id);
  if (!listing) notFound();

  const others = await fetchOthers(db, listing);
  const now = new Date();
  const country = getCountry(listing.country);
  const category = getCategory(listing.category);
  const boardHref = `/?country=${country.code}`;
  const [primary, ...secondary] = contactLinks(listing);
  const external = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});

  return (
    <div className={styles.page}>
      <SiteHeader
        backHref={boardHref}
        backLabel={<>العودة إلى <span className={styles.backWord}>لوحة </span>{country.name}</>}
      />
      <main className={styles.main}>
        <span className={styles.blob} aria-hidden="true" />

        {posted === '1' && <PostedBanner countryName={country.name} boardHref={boardHref} />}

        <article className={styles.detail}>
          <div className={styles.media}>
            {listing.photo ? (
              <div className={styles.photo}>
                <img src={photoUrl(db, listing.photo)} alt={listing.title} />
              </div>
            ) : (
              <div className={`${styles.monogramPanel} ${tones[category.tone]}`} aria-hidden="true">
                <span className={styles.monogram}>{monogram(listing.name)}</span>
              </div>
            )}
            <CategoryBadge category={listing.category} size="lg" className={styles.badge} />
          </div>

          <div className={styles.info}>
            <div className={styles.heading}>
              <span className={styles.name}>{listing.name}</span>
              <h1 className={styles.title}>{listing.title}</h1>
            </div>

            {/* country, then city and district together — the landing card's area */}
            <div className={styles.where}>
              <span className={styles.whereDot} aria-hidden="true" />
              <span>{country.name}</span>
              <span className={styles.divider} aria-hidden="true" />
              <span>{areaText(listing.city, listing.district)}</span>
            </div>

            <p className={styles.description}>{listing.description}</p>
            {listing.price && <div className={styles.price}>{listing.price}</div>}

            <div className={styles.contacts}>
              {primary && (
                <Button variant="contact" href={primary.href} value={primary.display} {...external(primary.href)}>
                  {primary.label}
                </Button>
              )}
              {secondary.length > 0 && (
                <div className={styles.secondary}>
                  {secondary.map((c) => (
                    <Button key={c.kind} variant="soft" size="compact" href={c.href} value={c.display} className={styles.secondaryButton} {...external(c.href)}>
                      {c.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.date}>
              نُشر <time dateTime={listing.created_at}>{relativeDate(listing.created_at, now)}</time>
            </div>
          </div>
        </article>

        {others.length > 0 ? (
          <section className={styles.others}>
            <div className={styles.othersHead}>
              <h2 className={styles.othersTitle}>إعلانات أخرى في {category.label} في {country.name}</h2>
              <span className={styles.othersCount}>{listingCountLabel(others.length)}</span>
            </div>
            <div className={styles.row}>
              {others.map((o) => (
                <div key={o.id} className={styles.rowItem}>
                  <ListingCard
                    listing={o}
                    variant="compact"
                    href={`/listing/${o.id}`}
                    photoSrc={o.photo ? photoUrl(db, o.photo) : null}
                    now={now}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className={styles.alone}>
            <span className={styles.aloneText}>هذا الإعلان الوحيد في «{category.label}» في {country.name} حتى الآن.</span>
            <Button variant="soft" size="compact" href={boardHref}>تصفحي كل إعلانات {country.name}</Button>
          </div>
        )}
      </main>
      <SiteFooter withDisclaimer />
    </div>
  );
}
