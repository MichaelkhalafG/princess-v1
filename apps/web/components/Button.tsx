import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import styles from './Button.module.css';

/**
 * The design's buttons. Each variant reproduces one element of the approved HTML:
 *   ink     — header "اعرضي خدمتك"
 *   cta     — large hero "اعرضي خدمتك"
 *   accent  — empty-state "اعرضي خدمتك الآن" (size "compact": the search submit "ابحثي")
 *   contact — the card's main contact button (WhatsApp, or the first contact she gave),
 *             always with the dot
 *   round   — the card's round contact buttons
 *   text    — bare text buttons in the sticky filter bar
 *   submit  — the form's full-width "انشري الإعلان"; aria-disabled shows it blocked or busy
 *   soft    — tint pill: status-panel secondary action (size "compact": detail page
 *             secondary contacts and the "browse all" link)
 *   surface — white pill: the "posted" banner's link (size "compact": photo change/remove)
 *
 * `value` adds the contact's number or handle beside the label (detail page).
 */
export type ButtonVariant = 'ink' | 'cta' | 'accent' | 'contact' | 'round' | 'text' | 'submit' | 'soft' | 'surface';

type Common = { variant: ButtonVariant; size?: 'default' | 'compact'; value?: string; className?: string; children: ReactNode };
type AsLink = Common & { href: string } & Omit<ComponentPropsWithoutRef<'a'>, keyof Common | 'href'>;
type AsButton = Common & { href?: undefined } & Omit<ComponentPropsWithoutRef<'button'>, keyof Common>;

export function Button(props: AsLink | AsButton) {
  const { variant, size = 'default', value, className, children, ...rest } = props;
  // tap-area: the header's 36px button still answers a 44px finger (globals.css)
  const cls = ['tap-area', styles.button, styles[variant], size === 'compact' && styles.compact, className].filter(Boolean).join(' ');
  const content = (
    <>
      {variant === 'contact' && <span className={styles.dot} aria-hidden="true" />}
      {children}
      {value && <span className={styles.value} dir="ltr">{value}</span>}
    </>
  );
  if (rest.href !== undefined) {
    return <a className={cls} {...(rest as Omit<AsLink, keyof Common>)}>{content}</a>;
  }
  const { type = 'button', ...buttonRest } = rest as Omit<AsButton, keyof Common>;
  return <button type={type} className={cls} {...buttonRest}>{content}</button>;
}
