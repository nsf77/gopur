import { Text, TextInput, View } from "react-native";

export function TextField(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "url";
  autoComplete?: "email" | "off" | "username";
  secureTextEntry?: boolean;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-semibold text-text">{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType}
        autoComplete={props.autoComplete}
        autoCapitalize="none"
        secureTextEntry={props.secureTextEntry}
        multiline={props.multiline}
        editable={props.editable}
        className={`min-h-11 rounded-xl border bg-surface px-3 text-text ${
          props.error ? "border-red-500" : "border-divider"
        } ${props.multiline ? "min-h-24 py-2" : ""}`}
      />
      {props.error ? <Text className="text-xs text-accent">{props.error}</Text> : null}
    </View>
  );
}
