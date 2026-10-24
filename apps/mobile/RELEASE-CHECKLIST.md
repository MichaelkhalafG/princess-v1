# Before the app ships

Each item blocks a release until it is done or consciously dropped. Strike one only with the change
that settles it.

## Before iOS ships

- [ ] **Hidden posters must stay on the phone, or the privacy page must change.**
  The privacy page (apps/web/app/privacy/page.tsx, section «تطبيق الهاتف») says the list of hidden
  posters «تُحفظ … على هاتفك وحده، ولا تُرسل إلينا أبدًا». On Android that is true: app.json sets
  `android.allowBackup: false`. On iOS it is not yet: the list is a file in the app's Documents folder
  (src/lib/hidden.ts), which iOS copies into her iCloud and computer backups.
  Either mark the file excluded from backup (NSURLIsExcludedFromBackupKey — needs a small native
  module, built and tested on a Mac), or change the sentence for iOS. Then check it on a real iPhone.
- [ ] Run the app on iOS at all: it has only ever run on an Android emulator.

## Before any store release

- [ ] Run it on real phones, not only the emulator: the photo gate (photo-gate/README.md) included.
- [ ] Replace the placeholder addresses in eas.json (config.ts refuses to start with them).
- [ ] The Arabic in src/drafts.ts approved (then moved to src/copy.ts) or removed.
