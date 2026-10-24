# The photo gate

A photo she chooses in the app must reach the API with nothing that says where it was taken.
The app does not trust the picker for this: Android's photo picker hands over a copy whose EXIF GPS
is zeroed, but whose XMP GPS and IPTC place name are still there (see `RESULTS.txt`). The app's own
step — `src/lib/photo.ts`, expo-image-manipulator re-encoding the photo at ≤1600px — writes a new
JPEG that carries none of it. The API then re-encodes it again (apps/api PhotoProcessor; its own test
is `apps/api/tests/Feature/PhotoPrivacyTest.php`).

## Running it again

1. `php make.php [folder]` — builds two inputs with GPS in EXIF, XMP and IPTC (into `out/` by
   default) and prints what each carries. They are byte-for-byte the files in `RESULTS.txt`
   (same SHA-256).
2. Push them to a device or emulator: `adb push out/gps-real.jpg /sdcard/Pictures/`, then
   `adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/gps-real.jpg`.
3. In the app: «اعرضي خدمتك» → «اختاري صورة لعملك» → choose the photo.
4. Pull what the app produced. In Expo Go on an emulator image with root (google_apis): `adb root`,
   touch a marker file before choosing the photo, then
   `adb shell find /data/data/host.exp.exponent/cache -newer <marker> -type f -name '*.jp*g'`
   lists both the picker's copy and the app's output (under `…/ImageManipulator/`); `adb pull`
   them. On a development build the package name is `com.mdneg.princess`.
5. `php check.php file.jpg …` — VERDICT must be CLEAN for the app's output.

## What it has covered, and what not

Covered: Android 16 emulator (API 36), Expo Go 58.0.5, the system photo picker, a real photo and a
rotated test picture, the app's output and the server's stored file.

Not covered: iOS (never run), a real phone, a development or store build of the app (only Expo Go),
photos from a real phone camera (the inputs are built to carry the same blocks a phone writes).
