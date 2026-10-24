import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/TabBar';
import { c } from '@/theme';

/** The two places she moves between — the board and her listings — under the app's own bar. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.canvas } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="my-listings" />
    </Tabs>
  );
}
