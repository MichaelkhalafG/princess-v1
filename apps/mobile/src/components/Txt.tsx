import { Text, useWindowDimensions, type TextProps, type TextStyle } from 'react-native';
import { fluid, num } from '@princess/tokens/native.ts';
import { c, font } from '@/theme';

export type FontKey = keyof typeof font;

/**
 * Text in the design's type: a family per weight (Android ignores fontWeight for custom fonts),
 * a size token (fluid ones computed at this window width, as clamp() did) and a leading token
 * turned into an absolute line height — the design's generous Arabic leading.
 */
export function Txt({
  f = 'body400',
  size = 'text-body',
  leading = 'leading-body',
  color = c.ink,
  align,
  style,
  ...rest
}: TextProps & { f?: FontKey; size?: string; leading?: string; color?: string; align?: TextStyle['textAlign'] }) {
  const { width } = useWindowDimensions();
  const fontSize = fluid(size, width);
  return (
    <Text
      {...rest}
      style={[{ fontFamily: font[f], fontSize, lineHeight: Math.round(fontSize * num(leading)), color, textAlign: align }, style]}
    />
  );
}

/**
 * A left-to-right island in Arabic text — a phone number, an email, a handle — kept whole and in
 * its own order (the web's <bdi dir="ltr">). Unicode isolates (LRI … PDI) work on both platforms;
 * Text's writingDirection is iOS only.
 */
export const ltr = (s: string) => `⁦${s}⁩`;
