declare module "@shopify/flash-list" {
  import type { FlatList } from "react-native";
  export const FlashList: typeof FlatList;
}

declare module "expo-blur" {
  import type { ComponentType } from "react";
  import type { ViewProps } from "react-native";
  export const BlurView: ComponentType<ViewProps>;
}
