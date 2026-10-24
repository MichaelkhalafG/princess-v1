import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { px, ratio, shadow } from '@princess/tokens/native.ts';
import { c, r } from '@/theme';

// The design's three arch photos (web: HeroCollage), from Pexels (free to use), copied from the
// web's public/hero. Positions are the design's fractions of the collage box; the arch is a pill
// top over a softly rounded bottom.
// The web lets the photos drift at different speeds as the page scrolls; that parallax is left
// out here (it needs scroll-driven animation for a decoration) — the arrangement is the same.
const PHOTOS = [
  { src: require('../../assets/hero/nails.jpg'), alt: 'أظافر طويلة بطلاء أحمر', box: { right: '10%', top: 0, width: '52%', height: '70%' }, bottom: 0.12, shadow: 'shadow-photo-accent', z: 2 },
  { src: require('../../assets/hero/tailoring.jpg'), alt: 'تفصيل فستان في الورشة', box: { left: '2%', top: '10%', width: '40%', height: '55%' }, bottom: 0.1, shadow: 'shadow-photo-highlight', z: 1 },
  { src: require('../../assets/hero/cooking.jpg'), alt: 'يدان تطبخان في المطبخ', box: { left: '20%', bottom: 0, width: '48%', height: '42%' }, bottom: 0.1, shadow: 'shadow-photo-secondary', z: 3 },
] as const;

export function HeroCollage() {
  const { width } = useWindowDimensions();
  // the web: full width up to --width-collage-mobile, then centred
  const w = Math.min(width - 2 * px('space-11'), px('width-collage-mobile'));
  const h = w / ratio('ratio-collage');
  return (
    // physical positions, as the design's (direction: 'ltr' keeps left as left in the RTL app)
    <View style={[styles.collage, { width: w, height: h }]}>
      <View style={[styles.disc, { width: w * 0.24, height: w * 0.24, borderRadius: w * 0.12, right: w * 0.02, bottom: h * 0.08 }]} />
      {PHOTOS.map((p) => {
        const pw = (parseFloat(p.box.width) / 100) * w;
        const ph = (parseFloat(p.box.height) / 100) * h;
        const radius = { borderTopLeftRadius: pw / 2, borderTopRightRadius: pw / 2, borderBottomLeftRadius: pw * p.bottom, borderBottomRightRadius: pw * p.bottom };
        return (
          <View key={p.alt} style={[styles.photo, p.box, radius, { zIndex: p.z, boxShadow: shadow(p.shadow) }]}>
            <Image source={p.src} accessibilityLabel={p.alt} style={[styles.img, radius]} resizeMode="cover" />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  collage: { alignSelf: 'center', direction: 'ltr' },
  disc: { position: 'absolute', backgroundColor: c.decorDisc },
  photo: { position: 'absolute', backgroundColor: c.tint, borderRadius: r.media },
  img: { width: '100%', height: '100%' },
});
