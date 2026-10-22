'use client';

import { useEffect, useRef } from 'react';
import styles from './HeroCollage.module.css';

// The design's three arch photos, with the design's alt text. From Pexels (free to use,
// no attribution required), served from public/hero/ exactly as downloaded.
const PHOTOS = [
  { cls: 'p1', factor: -0.06, src: '/hero/nails.jpg', alt: 'أظافر طويلة بطلاء أحمر' },
  { cls: 'p2', factor: 0.04, src: '/hero/tailoring.jpg', alt: 'تفصيل فستان في الورشة' },
  { cls: 'p3', factor: -0.1, src: '/hero/cooking.jpg', alt: 'يدان تطبخان في المطبخ' },
] as const;

/** The hero collage: three arch-topped photos drifting at different speeds on scroll. */
export function HeroCollage() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onScroll = () => {
      const y = window.scrollY;
      PHOTOS.forEach((p, i) => {
        const el = refs.current[i];
        if (el) el.style.transform = `translateY(${(y * p.factor).toFixed(1)}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={styles.collage}>
      <span className={styles.disc} aria-hidden="true" />
      {PHOTOS.map((p, i) => (
        <div key={p.cls} ref={(el) => { refs.current[i] = el; }} className={`${styles.photo} ${styles[p.cls]}`}>
          <img src={p.src} alt={p.alt} />
        </div>
      ))}
    </div>
  );
}
