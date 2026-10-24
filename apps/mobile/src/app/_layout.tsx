import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Alexandria_700Bold, Alexandria_800ExtraBold } from '@expo-google-fonts/alexandria';
import { ReadexPro_400Regular, ReadexPro_500Medium, ReadexPro_600SemiBold } from '@expo-google-fonts/readex-pro';
import { Gabarito_700Bold } from '@expo-google-fonts/gabarito';
import { ensureRtl } from '@/lib/rtl';
import { c } from '@/theme';

/** The app: the web's three typefaces (only the weights the design uses), right to left, one stack. */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Alexandria_700Bold,
    Alexandria_800ExtraBold,
    ReadexPro_400Regular,
    ReadexPro_500Medium,
    ReadexPro_600SemiBold,
    Gabarito_700Bold,
  });
  const [rtlReady, setRtlReady] = useState(false);
  useEffect(() => {
    ensureRtl().then(setRtlReady);
  }, []);

  // until the fonts are in (or failed: then the system font), nothing — the splash stays up
  if ((!fontsLoaded && !fontError) || !rtlReady) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas }, animation: 'slide_from_right' }} />
    </SafeAreaProvider>
  );
}
