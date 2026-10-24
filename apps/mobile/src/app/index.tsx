import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { COUNTRIES, getCategory, getCountry, type CategorySlug, type CountryCode } from '@princess/shared/constants.ts';
import { MAX_SHOWN, PAGE_SIZE } from '@princess/shared/board-url.ts';
import { listingCountLabel, searchPlaceholder } from '@princess/shared/format.ts';
import type { Listing } from '@princess/shared/listing.ts';
import { fluid } from '@princess/tokens/native.ts';
import { fetchBoard } from '@/lib/api';
import { isHidden, useHidden } from '@/lib/hidden';
import { Button } from '@/components/Button';
import { CategoryBar } from '@/components/CategoryBar';
import { CountrySelector } from '@/components/CountrySelector';
import { EmptyState } from '@/components/EmptyState';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HeroCollage } from '@/components/HeroCollage';
import { ListingCard } from '@/components/ListingCard';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { DRAFT } from '@/drafts';
import { c, s } from '@/theme';

type Board = { items: Listing[]; total: number; launch: boolean; elsewhere: CountryCode[] };

/** web: Board's LOADING_LABEL */
const LOADING_LABEL = 'جارٍ التحديث…';

/**
 * The board (web: app/page.tsx + components/board/Board.tsx at phone width): the collage, the
 * country, the search, the category bar, then the newest listings two to a row, PAGE_SIZE at a
 * time («عرض المزيد»). A country with no listing at all gets the launch state, with the countries
 * that do have some to offer instead.
 */
export default function BoardScreen() {
  const { width } = useWindowDimensions();
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
      <View style={[styles.hero, { paddingHorizontal: gutter }]}>
        <HeroCollage />
        {board?.launch && (
          <View style={styles.launchText}>
            <Txt f="heading800" size="text-h1-mobile" leading="leading-display">عملكِ يصل{'\n'}إلى كل سيدة حولك</Txt>
            <Txt size="text-lead" color={c.textSecondary}>اعرضي خدمتك أو ملابسك، وتتواصل معك من تحتاجها عبر واتساب مباشرة. بلا وسيط وبلا عمولة.</Txt>
          </View>
        )}
        <CountrySelector value={country} onChange={(code) => pick({ country: code, category: null, q: '' })} />
        {!board?.launch && <SearchField value={query} placeholder={searchPlaceholder(country)} onChange={setQuery} onSubmit={submitSearch} />}
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
          body={[
            `هنا ستجدين سيدات من ${k.name} يعرضن خدماتهن وملابسهن، وتتواصلين معهن مباشرة على واتساب أو الهاتف، بلا وسيط.`,
            'لم يُنشر أي إعلان بعد. إن كانت لديكِ خدمة أو ملابس تعرضينها، كوني أول من تنشر: الإعلان مجاني ويستغرق دقيقتين. وإن كنتِ تبحثين عن خدمة، فأرسلي الرابط لمن تعرفين ممن تقدّم واحدة.',
          ]}
          actions={[
            { label: 'اعرضي خدمتك الآن', onPress: toPost },
            board.elsewhere[0] ? { label: `تصفحي إعلانات ${getCountry(board.elsewhere[0]).name}`, onPress: () => pick({ country: board.elsewhere[0], category: null, q: '' }) } : undefined,
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
        body="كوني أول من تعرض هنا، فالإعلان يستغرق دقيقتين."
        actions={[
          { label: 'اعرضي خدمتك الآن', onPress: toPost },
          category ? { label: 'تصفحي كل الفئات', onPress: () => pick({ category: null }) } : undefined,
        ]}
      />
    );
  };

  const canMore = board && !board.launch && board.items.length > 0 && board.items.length < board.total && shown < MAX_SHOWN;

  return (
    <View style={styles.page}>
      <Header />
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
        ListFooterComponent={
          <View style={styles.after}>
            {canMore && (
              <View style={styles.more}>
                <Button variant="soft" blocked={pending} onPress={() => !pending && setShown((n) => n + PAGE_SIZE)}>{pending ? 'جارٍ التحميل…' : 'عرض المزيد'}</Button>
              </View>
            )}
            <Footer />
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} colors={[c.accent]} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.canvas },
  hero: { gap: s[11], paddingBottom: s[15] },
  launchText: { gap: s[8] },
  gridHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: s[11], flexWrap: 'wrap', marginTop: s[15], marginBottom: s[12] },
  gridTitle: { flex: 1, minWidth: 0 },
  content: { flexGrow: 1 },
  row: { gap: s[11], marginBottom: s[11] },
  cell: { flex: 1, maxWidth: '50%' },
  after: { marginTop: s[15], gap: s[17] },
  more: { alignItems: 'center' },
});
