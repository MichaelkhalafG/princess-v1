// Arabic, right to left, from the first screen.
//
// Builds: the expo-localization plugin's forcesRTL (app.json) makes the native app RTL from its
// first launch, whatever the phone's language — nothing to do here.
// Fallback: if a build still starts left to right, force RTL and restart the app once. The
// attempt is recorded, so a phone where it does not take is never caught in a restart loop.
// Expo Go: Expo resets the direction when a project opens, and a runtime override does not work
// there (docs: guides/localization) — it follows the phone's language, so test with an Arabic
// one. No restart is tried in Expo Go.

import { I18nManager } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';

const TRIED = 'princess.rtl-restart-tried';

/** True when the app may render; false while it restarts itself into RTL. */
export async function ensureRtl(): Promise<boolean> {
  if (I18nManager.isRTL) return true;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return true;
  if ((await SecureStore.getItemAsync(TRIED)) === '1') return true;
  await SecureStore.setItemAsync(TRIED, '1');
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  try {
    await Updates.reloadAsync();
    return false;
  } catch {
    // no reload available (a development build without expo-updates' runtime): carry on; the
    // direction applies from the next launch
    return true;
  }
}
