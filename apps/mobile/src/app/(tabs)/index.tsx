import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COUNTRIES, getCategory, getCountry, type CategorySlug, type CountryCode } from '@princess/shared/constants.ts';
import { MAX_SHOWN, PAGE_SIZE } from '@princess/shared/board-url.ts';
import { listingCountLabel, searchPlaceholder } from '@princess/shared/format.ts';
import type { Listing } from '@princess/shared/listing.ts';
import { fluid, px } from '@princess/tokens/native.ts';
import { fetchBoard } from '@/lib/api';
import { isHidden, useHidden } from '@/lib/hidden';
import { CategoryBar } from '@/components/CategoryBar';
import { CountrySelector } from '@/components/CountrySelector';
import { EmptyState } from '@/components/EmptyState';
import { HeroCollage } from '@/components/HeroCollage';
import { ListingCard } from '@/components/ListingCard';
import { Logo } from '@/components/Logo';
import { SearchField } from '@/components/SearchField';
import { StatusShade, useScrolled } from '@/components/StatusShade';
import { Txt } from '@/components/Txt';
import { COPY } from '@/copy';
import { DRAFT } from '@/drafts';
import { c, s } from '@/theme';

type Board = { items: Listing[]; total: number; launch: boolean; elsewhere: CountryCode[] };

/** web: Board's LOADING_LABEL */
const LOADING_LABEL = 'جارٍ التحديث…';

/**
 * The board (web: app/page.tsx + components/board/Board.tsx at phone width): the hero — what this
 * is and how to find someone, the country, the search, the collage, filling the first screen —
 * then the category bar and the newest listings two to a row. A country with no listing at all gets
 * the launch state, with the countries that do have some to offer instead.
 *
 * Where the app parts from the web page: the first screen speaks to a woman looking for someone
 * (most of the people opening the app), not to one posting: a headline and lead of its own (drafts),
 * the search right under them; posting is in the tab bar, reachable but not the loudest thing. And
 * the next PAGE_SIZE listings load as she nears the end, as a phone's lists do, instead of behind
 * «عرض المزيد».
 */
export default function BoardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [scrolled, onScroll] = useScrolled();
  // the first screen's heights (page, logo row, words and controls): the collage takes what is left
  const [fit, setFit] = useState({ page: 0, logo: 0, rest: 0 });
  const measure = (key: keyof typeof fit) => (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setFit((f) => (f[key] === h ? f : { ...f, [key]: h }));
  };
  const [country, setCountry] = useState<CountryCode>(COUNTRIES[0].code);
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [board, setBoard] = useState<Board | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hidden = useHidden();
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setPending(true);
    const narrowed = Boolean(category || q);
    const [res, all] = await Promise.all([
      fetchBoard({ country, category, q, limit: shown }),
      narrowed ? fetchBoard({ country, limit: 1 }) : null,
    ]);
    if (id !== request.current) return; // a newer filter has been asked for
    if (!res.ok || (all && !all.ok)) {
      setFailed(true);
      setPending(false);
      return;
    }
    const launch = (all?.ok ? all.data.total : res.data.total) === 0;
    let elsewhere: CountryCode[] = [];
    if (launch) {
      const counts = await Promise.all(COUNTRIES.filter((k) => k.code !== country).map(async (k) => {
        const r = await fetchBoard({ country: k.code, limit: 1 });
        return r.ok && r.data.total > 0 ? k.code : null;
      }));
      elsewhere = counts.filter((k): k is CountryCode => k !== null);
    }
    if (id !== request.current) return;
    setBoard({ items: res.data.items, total: res.data.total, launch, elsewhere });
    setFailed(false);
    setPending(false);
  }, [country, category, q, shown]);

  useEffect(() => {
    load();
  }, [load]);

  // any filter change starts again at the first page
  const pick = (next: { country?: CountryCode; category?: CategorySlug | null; q?: string }) => {
    if (next.country !== undefined) setCountry(next.country);
    if (next.category !== undefined) setCategory(next.category);
    if (next.q !== undefined) setQ(next.q);
    setShown(PAGE_SIZE);
  };
  const submitSearch = () => pick({ q: query.trim() });
  const clearSearch = () => {
    setQuery('');
    pick({ q: '' });
  };

  const k = getCountry(country);
  const activeLabel = category ? getCategory(category).label : '';
  const visible = useMemo(() => (board && hidden ? board.items.filter((l) => !isHidden(hidden, l)) : board?.items ?? []), [board, hidden]);
  const someHidden = board ? visible.length < board.items.length : false;
  // the count she sees leaves out the listings she has hidden (the ones loaded so far: the server does not know them)
  const shownTotal = board ? board.total - (board.items.length - visible.length) : 0;
  const now = new Date();
  const gutter = fluid('gutter-page', width);
  const toPost = () => router.push('/new');

  const head = (
    <View>
      <View style={[styles.hero, { paddingHorizontal: gutter, paddingTop: insets.top + s[8] }]}>
        <View style={styles.logo} onLayout={measure('logo')}>
          <Logo size={px('text-logo-header-sm')} />
        </View>
        {/* the first screen, together: the collage (what this is), the words, the country and the search */}
        {fit.page > 0 && <HeroCollage maxHeight={fit.page - insets.top - s[8] - fit.logo - fit.rest - 3 * s[11]} />}
        <View style={styles.heroRest} onLayout={measure('rest')}>
          {/* written for a woman looking, not for one posting (copy.ts); in a country with nothing in
              it the lead describes the board instead of asking her to search it (ARABIC COPY: DRAFT) */}
          <View style={styles.heroText}>
            <Txt f="heading800" size="text-h2" leading="leading-title" accessibilityRole="header">{COPY.heroTitle}</Txt>
            <Txt size="text-body" color={c.textSecondary}>{board?.launch ? DRAFT.heroLeadEmpty : COPY.heroLead}</Txt>
          </View>
          <CountrySelector value={country} onChange={(code) => pick({ country: code, category: null, q: '' })} />
          {!board?.launch && <SearchField value={query} placeholder={searchPlaceholder(country)} onChange={setQuery} onSubmit={submitSearch} />}
        </View>
      </View>
      {!board?.launch && <CategoryBar value={category} onChange={(slug) => pick({ category: slug })} />}
      {board && !board.launch && (
        <View style={[styles.gridHead, { paddingHorizontal: gutter }]}>
          <Txt f="heading800" size="text-h2-sm" leading="leading-heading" style={styles.gridTitle}>
            {q ? `نتائج «${q}»${category ? ` في «${activeLabel}»` : ''} في ${k.name}` : category ? `${activeLabel} في ${k.name}` : `آخر الإعلانات في ${k.name}`}
          </Txt>
          <Txt size="text-body-sm" color={c.textMuted}>{pending ? LOADING_LABEL : listingCountLabel(shownTotal)}</Txt>
        </View>
      )}
      {someHidden && <Txt size="text-small" color={c.textMuted} style={{ paddingHorizontal: gutter, marginBottom: s[8] }}>{DRAFT.hiddenNotice}</Txt>}
    </View>
  );

  const empty = () => {
    if (failed) {
      return <EmptyState title={DRAFT.boardFailedTitle} body="تعذّر الاتصال. تحققي من الاتصال ثم حاولي مرة أخرى." actions={[{ label: DRAFT.retry, onPress: load }]} />;
    }
    if (!board) return null;
    if (board.launch) {
      return (
        <EmptyState
          title={`اللوحة جديدة في ${k.name}`}
          // what she can do while it is empty (ARABIC COPY: DRAFT); the hero above already says what
          // the board is, so the web's first paragraph, which says it again, is left out
          body={DRAFT.emptyCountryBody(k.name)}
          // a woman looking comes first: where she can find listings, then posting (the web: the reverse)
          actions={[
            board.elsewhere[0] ? { label: `تصفحي إعلانات ${getCountry(board.elsewhere[0]).name}`, onPress: () => pick({ country: board.elsewhere[0], category: null, q: '' }) } : undefined,
            { label: 'اعرضي خدمتك الآن', onPress: toPost },
          ]}
        />
      );
    }
    if (q) {
      return (
        <EmptyState
          title={`لا نتائج لـ«${q}»${category ? ` في «${activeLabel}»` : ''} في ${k.name}`}
          body="جرّبي كلمة أخرى أو أقصر، أو امسحي البحث لتري كل الإعلانات."
          actions={[
            { label: 'امسحي البحث', onPress: clearSearch },
            category ? { label: `كل إعلانات ${k.name}`, onPress: () => { setQuery(''); pick({ category: null, q: '' }); } } : undefined,
          ]}
        />
      );
    }
    return (
      <EmptyState
        title={category ? `لا توجد إعلانات في «${activeLabel}» في ${k.name} بعد` : `لا توجد إعلانات في ${k.name} بعد`}
        // what to try, not an invitation to post (ARABIC COPY: DRAFT)
        body={category ? DRAFT.emptyCategoryBody : DRAFT.emptyBoardBody}
        // browsing first, posting second (the web: the reverse)
        actions={[
          category ? { label: 'تصفحي كل الفئات', onPress: () => pick({ category: null }) } : undefined,
          { label: 'اعرضي خدمتك الآن', onPress: toPost },
        ]}
      />
    );
  };

  const canMore = board && !board.launch && board.items.length > 0 && board.items.length < board.total && shown < MAX_SHOWN;
  const more = () => canMore && !pending && setShown((n) => Math.min(n + PAGE_SIZE, MAX_SHOWN));

  return (
    <View style={styles.page} onLayout={measure('page')}>
      <FlatList
        data={failed ? [] : visible}
        keyExtractor={(l) => l.id}
        numColumns={2}
        ListHeaderComponent={head}
        ListEmptyComponent={<View style={{ paddingHorizontal: gutter }}>{empty()}</View>}
        columnWrapperStyle={[styles.row, { paddingHorizontal: gutter }]}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ListingCard listing={item} variant="board" now={now} onOpen={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })} />
          </View>
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={more}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          <View style={styles.after}>
            {canMore && pending && <ActivityIndicator color={c.accent} accessibilityLabel="جارٍ التحميل…" />}
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} colors={[c.accent]} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        keyboardShouldPersistTaps="handled"
      />
      <StatusShade shown={scrolled} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.canvas },
  hero: { gap: s[11], paddingBottom: s[15] },
  // the lockup is a left-to-right island: shrink it to its width so it starts on the right
  logo: { alignSelf: 'flex-start', paddingVertical: s[3] },
  heroRest: { gap: s[11] },
  heroText: { gap: s[5] },
  gridHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: s[11], flexWrap: 'wrap', marginTop: s[15], marginBottom: s[12] },
  gridTitle: { flex: 1, minWidth: 0 },
  content: { flexGrow: 1 },
  row: { gap: s[11], marginBottom: s[11] },
  cell: { flex: 1, maxWidth: '50%' },
  after: { paddingTop: s[8], paddingBottom: s[17] },
});
