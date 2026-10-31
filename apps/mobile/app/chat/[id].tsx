import { useLocalSearchParams } from "expo-router";
import { ThreadPage } from "../../src/features/chat/ThreadPage";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ThreadPage id={id ?? ""} />;
}
