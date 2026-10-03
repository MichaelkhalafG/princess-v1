import styles from './ArchMark.module.css';

/**
 * The brand's arch shape: a pill on top, a small radius at the foot. Used as the logo
 * mark, in the "posted" banner and above status panels. The foot radius is a fixed
 * proportion of the width (--ratio-mark-foot), so every size keeps the same shape.
 */
export function ArchMark({
  size,
  tone,
  className,
}: {
  size: 'logo' | 'footer' | 'banner' | 'status';
  tone: 'accent' | 'secondary' | 'highlight' | 'surface';
  className?: string;
}) {
  return <span aria-hidden="true" className={[styles.mark, styles[size], styles[tone], className].filter(Boolean).join(' ')} />;
}
