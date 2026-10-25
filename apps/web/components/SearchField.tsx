'use client';

import type { FormEvent } from 'react';
import { Button } from './Button.tsx';
import styles from './SearchField.module.css';

/**
 * The hero search pill. Matches name, title, description, city and district (lib/listings.ts).
 * `busy`: new results are on their way (a search, a country) — its button shows the busy ring,
 * on the first screen where she acted; the result count saying so is below the fold on a phone.
 */
export function SearchField({
  value,
  placeholder,
  onChange,
  onSubmit,
  busy = false,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <form role="search" className={styles.field} onSubmit={submit}>
      <span className={styles.glyph} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="ابحثي في الإعلانات"
        placeholder={placeholder}
        enterKeyHint="search"
      />
      <Button type="submit" variant="accent" size="compact" busy={busy}>ابحثي</Button>
    </form>
  );
}
