import type { ComponentType } from "react";
import { FlatList, View, type FlatListProps, type ViewProps } from "react-native";

type FlashListComponent = ComponentType<FlatListProps<unknown>>;
type ViewLike = ComponentType<ViewProps>;

export function loadFlashList(): FlashListComponent {
  try {
    return require("@shopify/flash-list").FlashList as FlashListComponent;
  } catch {
    return FlatList as FlashListComponent;
  }
}

export function loadBlurView(): ViewLike {
  try {
    return require("expo-blur").BlurView as ViewLike;
  } catch {
    return View;
  }
}

export function loadGlassView(): ViewLike {
  try {
    return require("expo-glass-effect").GlassView as ViewLike;
  } catch {
    return View;
  }
}
