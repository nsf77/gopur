import type { ReactNode } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

export function Screen(props: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}) {
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName={props.padded === false ? "" : "pb-8"}
      refreshControl={
        props.onRefresh ? (
          <RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRefresh} />
        ) : undefined
      }
    >
      {props.children}
    </ScrollView>
  );
}

export function LoadingBlock(props: { label: string }) {
  return (
    <View className="items-center gap-2 p-4">
      <ActivityIndicator color="#304385" />
      <Text className="text-sm text-text-muted">{props.label}</Text>
    </View>
  );
}
