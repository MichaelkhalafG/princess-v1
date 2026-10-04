// Keyboard for a radio group (WAI-ARIA radio pattern): the group is ONE Tab stop, and the
// arrow keys move the choice. In a right-to-left page the left arrow means "next".

/** The index the key moves to, or null when the key is not one the group handles. */
export function nextRadioIndex(key: string, index: number, count: number, rtl: boolean): number | null {
  if (count === 0) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const step = key === 'ArrowDown' ? 1
    : key === 'ArrowUp' ? -1
    : key === 'ArrowLeft' ? (rtl ? 1 : -1)
    : key === 'ArrowRight' ? (rtl ? -1 : 1)
    : 0;
  if (step === 0) return null;
  return (index + step + count) % count;
}

/** The one radio that takes Tab: the checked one, or the first when none is checked. */
export function radioTabIndex(index: number, checkedIndex: number): 0 | -1 {
  return index === (checkedIndex < 0 ? 0 : checkedIndex) ? 0 : -1;
}
