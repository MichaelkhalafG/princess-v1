import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getCategory } from '@princess/shared/constants.ts';
import { areaText, contactLinks, relativeDate } from '@princess/shared/format.ts';
import type { Listing } from '@princess/shared/listing.ts';
import { num, px } from '@princess/tokens/native.ts';
import { assetUrl } from '@/lib/config';
import { c, r, ratios, s, shadows, sizes, tones } from '@/theme';
import { Button } from './Button';
import { CategoryBadge } from './CategoryBadge';
import { CategoryIcon } from './CategoryIcon';
import { Txt } from './Txt';

// The arch echo (web: ListingCard): a short stroke concentric with the photo's sweeping corner,
// a little outside it, in a box the size of the corner's radius (100 units = the radius).
const ECHO_GAP = 12;
const echoPoint = (deg: number) => {
  const rr = 100 + ECHO_GAP;
  const a = (deg * Math.PI) / 180;
  return `${(rr * Math.sin(a)).toFixed(2)} ${(100 - rr * Math.cos(a)).toFixed(2)}`;
};
const ECHO_PATH = `M${echoPoint(30)}A${100 + ECHO_GAP} ${100 + ECHO_GAP} 0 0 1 ${echoPoint(60)}`;

/** A price longer than this is set smaller (web: PRICE_LONG_CHARS). */
const PRICE_LONG_CHARS = 20;

/**
 * The photo (or the category's panel) with the design's arch: its top corner on the reading side
 * — the top right — sweeps in a curve that is a share of the photo's width (web: a calc() on
 * 100cqi). React Native has no container units: the width is measured on layout, and the corner,
 * the echo and the icon are sized from it.
 */
export function ListingMedia({ listing, photoSrc, aspect = ratios.media, iconShare = 0.34, iconRange = [64, 104] as [number, number], badge = 'default', large = false }: {
  listing: Listing;
  photoSrc: string | null;
  aspect?: number;
  iconShare?: number;
  iconRange?: [number, number];
  badge?: 'default' | 'small' | 'lg';
  /** the listing page's photo: larger corners, a fixed sweep (--radius-media-lg-shoulder), no echo */
  large?: boolean;
}) {
  const [w, setW] = useState(0);
  const shoulder = large ? Math.min(px('radius-media-lg-shoulder'), w * 0.6) : w * ratios.shoulder;
  const { tone, icon } = getCategory(listing.category);
  const shape = { borderRadius: large ? px('radius-media-lg') : r.media, borderTopStartRadius: shoulder };
  const iconSize = Math.min(iconRange[1], Math.max(iconRange[0], w * iconShare));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {photoSrc ? (
        <View style={[shape, styles.photo, { aspectRatio: aspect }]}>
          <Image source={{ uri: assetUrl(photoSrc) }} accessibilityLabel={listing.title} style={[StyleSheet.absoluteFill, shape]} resizeMode="cover" />
        </View>
      ) : (
        <View style={[shape, styles.panel, { aspectRatio: aspect, backgroundColor: tones[tone].bg }]}>
          {w > 0 && <CategoryIcon path={icon} color={tones[tone].ink} size={iconSize} stroke={num('stroke-monogram')} />}
        </View>
      )}
      {w > 0 && !large && (
        <View pointerEvents="none" style={[styles.echo, { width: shoulder, height: shoulder }]}>
          <Svg width={shoulder} height={shoulder} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
            <Path d={ECHO_PATH} stroke={c.archEcho} strokeWidth={(px('stroke-arch-echo') * 100) / shoulder} strokeLinecap="round" fill="none" />
          </Svg>
        </View>
      )}
      <CategoryBadge category={listing.category} size={badge} style={[styles.badge, badge === 'small' && styles.badgeSmall, large && styles.badgeLarge]} />
    </View>
  );
}

/**
 * One listing.
 *   board   — the board's card at phone width (web ≤480px): photo, category, her name, her area,
 *             a two-line title, a one-line price, one full-width button for her first contact
 *             method. Description, date and other contacts are on the listing page.
 *   compact — the listing page's "others" row and her own listings: the whole card opens it.
 */
export function ListingCard({ listing, variant, onOpen, showDate = true, now }: {
  listing: Listing;
  variant: 'board' | 'compact';
  /** null: the card opens nothing (her listing off the board has no public page) */
  onOpen: (() => void) | null;
  showDate?: boolean;
  now: Date;
}) {
  const priceLong = listing.price !== null && [...listing.price].length > PRICE_LONG_CHARS;
  const [primary] = contactLinks(listing);
  const area = areaText(listing.city, listing.district);
  const board = variant === 'board';
  const body = (
    <>
      <ListingMedia listing={listing} photoSrc={listing.photo?.url ?? null} badge={board ? 'small' : 'default'} />
      <View style={[styles.body, board ? styles.bodyBoard : styles.bodyCompact]}>
        {board ? (
          <View>
            <Txt f="heading700" size="text-body-sm" leading="leading-snug" numberOfLines={1}>{listing.name}</Txt>
            <Txt size="text-small" leading="leading-snug" color={c.textMuted} numberOfLines={1}>{area}</Txt>
          </View>
        ) : (
          <View style={styles.meta}>
            <Txt f="heading700" size="text-control" leading="leading-snug" numberOfLines={1} style={styles.name}>{listing.name}</Txt>
            <Txt size="text-small" leading="leading-snug" color={c.textMuted} numberOfLines={1} style={styles.area}>{area}</Txt>
          </View>
        )}
        <Txt f="heading800" size={board ? 'text-control' : 'text-card-title-sm'} leading="leading-card-title" numberOfLines={board ? 2 : 3}>{listing.title}</Txt>
        {listing.price && (
          <Txt
            f={priceLong && !board ? 'heading700' : 'heading800'}
            size={board ? 'text-body-sm' : priceLong ? 'text-price-long' : 'text-price-sm'}
            leading="leading-price"
            color={c.accent}
            numberOfLines={board ? 1 : 2}
          >
            {listing.price}
          </Txt>
        )}
        {board && primary && (
          <View style={styles.actions}>
            <Button variant="contact" onPress={() => Linking.openURL(primary.href)}>{primary.label}</Button>
          </View>
        )}
        {!board && showDate && (
          <Txt size="text-caption" leading="leading-snug" color={c.textSubtle} style={styles.date}>{relativeDate(listing.published_at, now)}</Txt>
        )}
      </View>
    </>
  );
  const cardStyle = [styles.card, board ? styles.cardBoard : styles.cardCompact];
  return onOpen ? (
    <Pressable onPress={onOpen} accessibilityRole="link" accessibilityLabel={listing.title} style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}>
      {body}
    </Pressable>
  ) : (
    <View style={cardStyle}>{body}</View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: r.card, boxShadow: shadows.card, flex: 1, minWidth: 0 },
  cardBoard: { padding: s[3] },
  cardCompact: { padding: s[7] },
  pressed: { boxShadow: shadows.cardHover },
  photo: { overflow: 'hidden', backgroundColor: c.tint },
  panel: { alignItems: 'center', justifyContent: 'center', boxShadow: shadows.monogram },
  // the echo sits at the arch's corner: the start side, the right in RTL
  echo: { position: 'absolute', top: 0, start: 0 },
  badge: { position: 'absolute', start: s[10], bottom: sizes.badgeOverlap },
  badgeSmall: { start: s[5] },
  badgeLarge: { start: s[14], bottom: px('space-badge-overlap-lg') },
  body: { flex: 1 },
  bodyBoard: { paddingTop: s[13], paddingHorizontal: s[2], paddingBottom: s[2], gap: s[3] },
  bodyCompact: { paddingTop: s[15], paddingHorizontal: s[8], paddingBottom: s[8], gap: s[5] },
  meta: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: s[7] },
  name: { flexShrink: 1 },
  area: { flexShrink: 3, minWidth: sizes.areaMin },
  actions: { flexDirection: 'row', marginTop: 'auto', paddingTop: s[3] },
  date: { marginTop: 'auto' },
});
