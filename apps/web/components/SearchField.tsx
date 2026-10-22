'use client';

import type { FormEvent } from 'react';
import { Button } from './Button.tsx';
import styles from './SearchField.module.css';

/** The hero search pill. Matches name, title, description, city and district (lib/listings.ts). */
export function SearchField({
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
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
      <Button type="submit" variant="accent" size="compact">ابحثي</Button>
    </form>
  );
}
