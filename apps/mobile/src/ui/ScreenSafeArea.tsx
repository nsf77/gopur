import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

/** NativeWind `className="flex-1"` on SafeAreaView is unreliable on Android APKs. */
export function ScreenSafeArea(props: { children: ReactNode }) {
  return <View style={styles.fill}>{props.children}</View>;
}

export { styles as screenFillStyles };
