'use client';

import { useEffect, useRef } from 'react';
import styles from './HeroCollage.module.css';

// The design's three arch photos, with the design's alt text. Hosted on Pexels, as in
// the approved file.
const PHOTOS = [
  { cls: 'p1', factor: -0.06, src: 'https://images.pexels.com/photos/34871553/pexels-photo-34871553.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'أظافر طويلة بطلاء أحمر' },
  { cls: 'p2', factor: 0.04, src: 'https://images.pexels.com/photos/33078826/pexels-photo-33078826/free-photo-of-tailor-meticulously-crafting-garments-in-workshop.jpeg?w=1260&h=750&dpr=1', alt: 'تفصيل فستان في الورشة' },
  { cls: 'p3', factor: -0.1, src: 'https://images.pexels.com/photos/6287459/pexels-photo-6287459.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'يدان تطبخان في المطبخ' },
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
