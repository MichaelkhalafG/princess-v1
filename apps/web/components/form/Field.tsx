import type { ReactNode } from 'react';
import styles from './Field.module.css';

/** The error line under a field: a pink bullet and the message. */
export function FieldError({ id, children, size = 'default', alert = false }: { id: string; children: ReactNode; size?: 'default' | 'lg'; alert?: boolean }) {
  return (
    <p id={id} className={`${styles.error} ${size === 'lg' ? styles.errorLg : ''}`} {...(alert ? { role: 'alert' } : {})}>
      <span className={styles.bullet} aria-hidden="true" />
      {children}
    </p>
  );
}

/**
 * One labelled form field: label row (with a character counter or "اختياري"), the
 * control, an optional hint and the error. The control is passed as children and uses
 * the classes exported below.
 */
export function Field({
  id,
  label,
  counter,
  optional = false,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  counter?: { text: string; over: boolean };
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>{label}</label>
        {counter && <span className={`${styles.aside} ${counter.over ? styles.over : ''}`}>{counter.text}</span>}
        {optional && <span className={styles.aside}>اختياري</span>}
      </div>
      {children}
      {hint && <p id={`h-${id}`} className={styles.hint}>{hint}</p>}
      {error && <FieldError id={`e-${id}`}>{error}</FieldError>}
    </div>
  );
}

/** aria wiring for a control inside <Field>. */
export function describedBy(id: string, { error, hint }: { error?: string; hint?: boolean }) {
  const ids = [error && `e-${id}`, hint && `h-${id}`].filter(Boolean).join(' ');
  return { 'aria-invalid': Boolean(error), ...(ids ? { 'aria-describedby': ids } : {}) };
}

export const fieldStyles = styles;
