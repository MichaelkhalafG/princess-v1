import { useEffect, useState } from 'react';
import { Alert, FlatList, Linking, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getCategory, getCountry } from '@princess/shared/constants.ts';
import { areaText, contactLinks, listingCountLabel, relativeDate } from '@princess/shared/format.ts';
import type { Listing } from '@princess/shared/listing.ts';
import { fluid, px } from '@princess/tokens/native.ts';
import { fetchListing, fetchOthers } from '@/lib/api';
import { hidePoster, isHidden, useHidden } from '@/lib/hidden';
import { Button } from '@/components/Button';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ListingCard, ListingMedia } from '@/components/ListingCard';
import { Banner, BannerLine, StatusPanel } from '@/components/Panels';
import { Txt, ltr } from '@/components/Txt';
import { Blob } from '@/components/Blob';
import { DRAFT } from '@/drafts';
import { c, r, ratios, s, shadows, sizes } from '@/theme';

/**
 * One listing (web: app/listing/[id]/page.tsx at phone width): the photo with its arch, her name,
 * the title, where, the description, the price, her contact methods opening WhatsApp, the phone
 * or Instagram, the date with «الإبلاغ عن هذا الإعلان», and the other listings in its category.
 * `posted=1`: she has just posted it and it went straight onto the board.
 */
export default function ListingScreen() {
  const { id, posted } = useLocalSearchParams<{ id: string; posted?: string }>();
  const { width } = useWindowDimensions();
  const [state, setState] = useState<{ listing: Listing | null; others: Listing[] } | 'loading' | 'failed'>('loading');
  const hidden = useHidden();

  useEffect(() => {
    let live = true;
    (async () => {
      const res = await fetchListing(id);
      if (!live) return;
      if (!res.ok) return setState(res.status === 404 ? { listing: null, others: [] } : 'failed');
      const others = await fetchOthers(id);
      if (live) setState({ listing: res.data, others: others.ok ? others.data.items : [] });
    })();
    return () => {
      live = false;
    };
  }, [id]);

  const gutter = fluid('gutter-page', width);
  const home = () => router.dismissTo('/');
  const body = (() => {
    if (state === 'loading') return null;
    if (state === 'failed') {
      return (
        <StatusPanel title={DRAFT.boardFailedTitle} body="تعذّر الاتصال. تحققي من الاتصال ثم حاولي مرة أخرى.">
          <Button variant="accent" onPress={home}>العودة إلى اللوحة</Button>
        </StatusPanel>
      );
    }
    const { listing, others } = state;
    if (!listing || (hidden && isHidden(hidden, listing))) {
      return (
        <StatusPanel title="هذا الإعلان لم يعد على اللوحة" body={listing ? DRAFT.hiddenListing : 'على اللوحة سيدات أخريات يقدمن الخدمة نفسها.'}>
          <Button variant="accent" onPress={home}>العودة إلى اللوحة</Button>
          <Button variant="soft" onPress={() => router.push('/new')}>اعرضي خدمتك</Button>
        </StatusPanel>
      );
    }
    const country = getCountry(listing.country);
    const category = getCategory(listing.category);
    const [primary, ...secondary] = contactLinks(listing);
    const now = new Date();
    const visibleOthers = others.filter((o) => !hidden || !isHidden(hidden, o));
    const hide = () =>
      Alert.alert(DRAFT.hidePosterTitle, DRAFT.hidePosterBody, [
        { text: DRAFT.cancel, style: 'cancel' },
        { text: DRAFT.hidePosterConfirm, style: 'destructive', onPress: async () => { await hidePoster(listing); home(); } },
      ]);
    return (
      <>
        {posted === '1' && (
          <Banner title="إعلانك الآن على اللوحة" action={<Button variant="surface" onPress={home}>العودة إلى اللوحة</Button>}>
            <BannerLine>{`يظهر لكل سيدة في ${country.name} منذ هذه اللحظة. هكذا تراه العميلة.`}</BannerLine>
            <BannerLine>تجدين إعلاناتك في صفحة إعلاناتي، ومنها تحذفين أيًّا منها متى شئتِ.</BannerLine>
          </Banner>
        )}

        <View style={styles.detail}>
          <ListingMedia listing={listing} photoSrc={listing.photo?.url ?? null} aspect={ratios.mediaLg} iconShare={0.32} iconRange={[64, 168]} badge="lg" large />
          <View style={styles.info}>
            <View style={styles.heading}>
              <Txt f="heading700" size="text-name-lg" leading="leading-snug">{listing.name}</Txt>
              <Txt f="heading800" size="text-detail-title" leading="leading-title" accessibilityRole="header">{listing.title}</Txt>
            </View>
            <View style={styles.where}>
              <View style={styles.whereDot} />
              <Txt size="text-control" color={c.textMuted} style={styles.whereText}>{`${country.name} · ${areaText(listing.city, listing.district)}`}</Txt>
            </View>
            <Txt leading="leading-relaxed" color={c.textSecondary} selectable>{listing.description}</Txt>
            {listing.price && <Txt f="heading800" size="text-price-lg" leading="leading-price" color={c.accent}>{listing.price}</Txt>}

            <View style={styles.contacts}>
              {primary && <Button variant="contact" value={primary.display} onPress={() => Linking.openURL(primary.href)}>{primary.label}</Button>}
              {secondary.length > 0 && (
                <View style={styles.secondary}>
                  {secondary.map((k) => (
                    <Button key={k.kind} variant="soft" compact value={k.display} onPress={() => Linking.openURL(k.href)} style={styles.secondaryButton}>{k.label}</Button>
                  ))}
                </View>
              )}
            </View>

            <Txt size="text-small" leading="leading-snug" color={c.textSubtle}>
              {`نُشر ${relativeDate(listing.published_at, now)} · `}
              <Txt size="text-small" leading="leading-snug" color={c.textSubtle} style={styles.link} onPress={() => router.push({ pathname: '/listing/[id]/report', params: { id: listing.id } })} accessibilityRole="link">
                الإبلاغ عن هذا الإعلان
              </Txt>
            </Txt>
            {/* the store's "block a user": her listings, hidden on this phone. ARABIC COPY: DRAFT */}
            <Button variant="text" onPress={hide} style={styles.hide}>{DRAFT.hidePoster}</Button>
          </View>
        </View>

        {visibleOthers.length > 0 ? (
          <View style={styles.others}>
            <View style={styles.othersHead}>
              <Txt f="heading800" size="text-h2-sm" leading="leading-heading" style={styles.othersTitle}>{`إعلانات أخرى في ${category.label} في ${country.name}`}</Txt>
              <Txt size="text-body-sm" color={c.textMuted}>{listingCountLabel(visibleOthers.length)}</Txt>
            </View>
            <FlatList
              horizontal
              data={visibleOthers}
              keyExtractor={(o) => o.id}
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -gutter }}
              contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: s[15], gap: fluid('gap-carousel', width) }}
              renderItem={({ item }) => (
                <View style={styles.rowItem}>
                  <ListingCard listing={item} variant="compact" now={now} onOpen={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })} />
                </View>
              )}
            />
          </View>
        ) : (
          <View style={styles.alone}>
            <Txt size="text-control" leading="leading-snug" color={c.textSecondary}>{`هذا الإعلان الوحيد في «${category.label}» في ${country.name} حتى الآن.`}</Txt>
            <Button variant="soft" compact onPress={home}>{`تصفحي كل إعلانات ${country.name}`}</Button>
          </View>
        )}
      </>
    );
  })();

  return (
    <View style={styles.page}>
      <Header back />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.main, { paddingHorizontal: gutter, gap: fluid('gap-detail-sections', width), paddingBottom: fluid('pad-section-bottom', width) }]}>
          <Blob kind="detail" />
          {body}
        </View>
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.canvas },
  scroll: { flexGrow: 1, justifyContent: 'space-between' },
  main: { paddingTop: s[5] },
  detail: { backgroundColor: c.surface, borderRadius: r.card, padding: s[8], boxShadow: shadows.card, marginTop: s[5] },
  info: { gap: s[12], paddingTop: s[15], paddingBottom: s[8], paddingHorizontal: s[5] },
  heading: { gap: s[5] },
  where: { flexDirection: 'row', alignItems: 'center', gap: s[5] },
  whereDot: { width: sizes.dotSm, height: sizes.dotSm, borderRadius: sizes.dotSm / 2, backgroundColor: c.highlight },
  whereText: { flexShrink: 1 },
  contacts: { gap: s[7], paddingTop: s[2] },
  secondary: { flexDirection: 'row', flexWrap: 'wrap', gap: s[5] },
  secondaryButton: { flexGrow: 1, flexBasis: px('width-action-basis') },
  link: { textDecorationLine: 'underline' },
  hide: { alignSelf: 'flex-start' },
  others: { gap: s[12] },
  othersHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: s[11], flexWrap: 'wrap' },
  othersTitle: { flex: 1, minWidth: 0 },
  rowItem: { width: px('width-card-compact'), flexDirection: 'row' },
  alone: { backgroundColor: c.surface, borderRadius: r.panel, paddingVertical: s[12], paddingHorizontal: s[14], gap: s[11], boxShadow: shadows.catbar, alignItems: 'flex-start' },
});
