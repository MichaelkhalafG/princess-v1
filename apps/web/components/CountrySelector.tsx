'use client';

import type { KeyboardEvent } from 'react';
import { COUNTRIES, type CountryCode } from '@/lib/constants.ts';
import { nextRadioIndex, radioTabIndex } from '@/lib/radio.ts';
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
  const checked = COUNTRIES.findIndex((k) => k.code === value);
  // one Tab stop; the arrows move the choice (and focus) — the radio pattern
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const radios = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
    const next = nextRadioIndex(e.key, radios.indexOf(document.activeElement as HTMLElement), radios.length, getComputedStyle(e.currentTarget).direction === 'rtl');
    if (next === null) return;
    e.preventDefault();
    onChange(COUNTRIES[next].code);
    radios[next].focus();
  };
  return (
    <div
      onKeyDown={onKeyDown}
      role="radiogroup"
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': 'الدولة' })}
      className={[styles.group, styles[size], surface === 'inset' && styles.inset].filter(Boolean).join(' ')}
    >
      {COUNTRIES.map((k, i) => {
        const on = k.code === value;
        return (
          <button
            key={k.code}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={radioTabIndex(i, checked)}
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
