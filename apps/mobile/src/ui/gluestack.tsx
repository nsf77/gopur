import type { ReactNode } from "react";
import { View } from "react-native";

/** Gluestack-compatible shell. NativeWind 5 + RN primitives stay the styled surface. */
export function GluestackUIProvider(props: { children: ReactNode }) {
  return <View className="flex-1 bg-bg">{props.children}</View>;
}
