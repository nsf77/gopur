import { Tabs } from "expo-router";
import { CalendarDotsIcon, ChatCircleIcon, CompassIcon, HouseIcon, UserCircleIcon } from "phosphor-react-native";
import { m } from "../../src/paraglide/messages.js";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#304385",
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: m.tabs_home(), tabBarIcon: ({ color }) => <HouseIcon color={String(color)} size={22} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: m.tabs_explore(), tabBarIcon: ({ color }) => <CompassIcon color={String(color)} size={22} /> }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{ title: m.tabs_chat(), tabBarIcon: ({ color }) => <ChatCircleIcon color={String(color)} size={22} /> }}
      />
      <Tabs.Screen
        name="my-events"
        options={{ title: m.tabs_myEvents(), tabBarIcon: ({ color }) => <CalendarDotsIcon color={String(color)} size={22} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: m.tabs_profile(), tabBarIcon: ({ color }) => <UserCircleIcon color={String(color)} size={22} /> }}
      />
    </Tabs>
  );
}
