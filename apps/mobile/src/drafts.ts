// ARABIC COPY NEW IN THE APP: every string here is a DRAFT, NOT YET APPROVED.
// Everything else the app says comes from the website (apps/web) or @princess/shared, word for
// word. Strings here exist because the app has something the website does not.

export const DRAFT = {
  // the iOS permission sentence for choosing a photo is in app.json (expo-image-picker plugin):
  //   «تحتاج برينسيس إلى صورك لتختاري منها صورة لإعلانك.»

  // hiding a poster on this phone (store requirement: blocking another user's content)
  hidePoster: 'إخفاء إعلانات هذه السيدة',
  hidePosterTitle: 'إخفاء إعلانات هذه السيدة؟',
  // what is matched: this listing, and any other with the same WhatsApp or phone number or the same
  // Instagram account (lib/hidden.ts) — "حسابها" alone could read as her Princess account, which
  // the app never sees
  hidePosterBody: 'لن تري هذا الإعلان، ولا أي إعلان آخر بالأرقام نفسها أو بحساب إنستغرام نفسه، على هذا الهاتف. يمكنكِ التراجع من «إعلاناتي».',
  hidePosterConfirm: 'أخفيها',
  hiddenNotice: 'أخفيتِ إعلانات بعض السيدات على هذا الهاتف.',
  unhideAll: 'إظهار كل ما أخفيتِه',
  cancel: 'تراجعي',

  // a screen whose listing was hidden, opened from a link
  hiddenListing: 'أخفيتِ إعلانات هذه السيدة على هذا الهاتف.',

  // the board's hero (app only, for now), written for a woman looking for someone: what she can
  // find here and how. The website's hero speaks to a woman posting; these do not reuse it.
  heroTitle: 'ما تحتاجينه،\nعند سيدة في مدينتك',
  heroLead: 'كوافير وخياطة وطبخ بيتي ودروس ورعاية أطفال وغيرها، تقدّمها سيدات من مدينتك. ابحثي أو تصفّحي الفئات، ثم تواصلي معها مباشرة، بلا وسيط.',

  // the board could not load (the API unreachable)
  boardFailedTitle: 'تعذّر تحميل الإعلانات',
  retry: 'حاولي مرة أخرى',
} as const;
