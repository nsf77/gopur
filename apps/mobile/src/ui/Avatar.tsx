import { Image, Text, View } from "react-native";
import { organizerColorFromName, organizerInitial } from "@gopur/shared";

export function Avatar(props: { name: string; src?: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = props.size === "lg" ? 56 : props.size === "sm" ? 28 : 40;
  if (props.src) {
    return <Image source={{ uri: props.src }} className="rounded-full" style={{ width: dim, height: dim }} />;
  }
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: dim, height: dim, backgroundColor: organizerColorFromName(props.name) }}
    >
      <Text className="font-bold text-white">{organizerInitial(props.name)}</Text>
    </View>
  );
}
