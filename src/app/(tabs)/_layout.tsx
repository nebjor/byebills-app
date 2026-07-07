import { Tabs } from "expo-router";

import { TabBar } from "@/components";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabBar={(props) => <TabBar {...(props as any)} />}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
