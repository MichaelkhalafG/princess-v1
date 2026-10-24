import { StyleSheet, View } from 'react-native';
import { px, raw } from '@princess/tokens/native.ts';
import { c, r } from '@/theme';

/**
 * The decorative circles behind the form, account and detail pages (web: page.module.css .blob):
 * a large tint one past the reading-side top corner, and on the posting form a smaller amber one
 * low on the other side. Placed inside the page's main column, drawn first so everything is above
 * it; the screen's edge clips it (web: overflow-x: clip).
 *   form    — the posting form, account pages and the report (top -120px)
 *   detail  — a listing (top -140px)
 *   amber   — the posting form's second circle
 */
export function Blob({ kind }: { kind: 'form' | 'detail' | 'amber' }) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.blob, styles[kind]]} />;
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: r.pill },
  // web: right — the reading side in RTL, which is start here
  form: { start: px('blob-lg-inset-x'), top: px('blob-lg-inset-y-form'), width: px('blob-lg'), height: px('blob-lg'), backgroundColor: c.tint },
  detail: { start: px('blob-lg-inset-x'), top: px('blob-lg-inset-y-detail'), width: px('blob-lg'), height: px('blob-lg'), backgroundColor: c.tint },
  // web: left, and a bottom given as a share of the column's height
  amber: { end: px('blob-md-inset-x'), bottom: raw('blob-md-inset-bottom') as `${number}%`, width: px('blob-md'), height: px('blob-md'), backgroundColor: c.tintAmber },
});
