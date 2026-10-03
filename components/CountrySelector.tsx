'use client';

import { COUNTRIES, type CountryCode } from '@/lib/constants.ts';
import styles from './CountrySelector.module.css';

/**
 * The three-country selector. It filters the whole board and decides the currency hint.
 *   compact — the header
 *   large   — the hero, next to the search field
 *   surface "inset" — inside the form card: full width, page-colour track, no shadow
 */
export function CountrySelector({
  value,
  onChange,
  size,
  surface = 'raised',
  labelledBy,
}: {
  value: CountryCode;
  onChange: (country: CountryCode) => void;
  size: 'compact' | 'large';
  surface?: 'raised' | 'inset';
  labelledBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': 'الدولة' })}
      className={[styles.group, styles[size], surface === 'inset' && styles.inset].filter(Boolean).join(' ')}
    >
      {COUNTRIES.map((k) => {
        const on = k.code === value;
        return (
          <button
            key={k.code}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(k.code)}
            className={`${styles.option} ${on ? styles.selected : ''}`}
          >
            {/* Images, not emoji: Windows cannot draw flag emoji (it shows "EG / SA / AE"). */}
            <img className={styles.flag} src={k.flag} alt="" aria-hidden="true" />
            {k.name}
          </button>
        );
      })}
    </div>
  );
}
