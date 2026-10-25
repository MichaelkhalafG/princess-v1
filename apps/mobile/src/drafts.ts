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

  // The board when it has nothing to show her, written for a woman looking (the app only, for now):
  // what to try first; posting is the second button, never the message. The website's versions
  // speak to a woman posting («كوني أول من تعرض هنا…»); these do not reuse them.

  // the hero's lead in a country with nothing in it yet: the search and the categories are not on
  // screen there, so it describes the board instead of asking her to search or browse it; and no
  // woman offers anything there yet, so it does not say one does
  heroLeadEmpty: 'هنا تعرض السيدات خدماتهن: كوافير وخياطة وطبخ بيتي ودروس ورعاية أطفال وغيرها، وتتواصلين معهن مباشرة، بلا وسيط.',
  // a country with nothing in it (under the web's title «اللوحة جديدة في …»)
  emptyCountryBody: (country: string) => `لم تعرض أي سيدة في ${country} بعد. إن كنتِ تعرفين واحدة تقدّم خدمة، أخبريها عن برينسيس، وعودي بعد أيام.`,
  // a category with nothing in it (under the web's title «لا توجد إعلانات في «…» في … بعد»); the
  // search and the category bar are just above it
  emptyCategoryBody: 'جرّبي فئة قريبة منها، أو ابحثي بكلمة تصف ما تحتاجينه، أو عودي بعد أيام.',
  // nothing to show with no category and no search (every listing there hidden on this phone)
  emptyBoardBody: 'جرّبي البحث بكلمة تصف ما تحتاجينه، أو عودي بعد أيام.',

  // the board could not load (the API unreachable)
  boardFailedTitle: 'تعذّر تحميل الإعلانات',
  retry: 'حاولي مرة أخرى',
} as const;
