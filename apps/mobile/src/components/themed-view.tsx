import { Platform, View, type ViewProps } from "react-native";

import { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();
  const viewProps = sanitizeWebProps(otherProps);

  return (
    <View
      style={[{ backgroundColor: theme[type ?? "background"] }, style]}
      {...viewProps}
    />
  );
}

function sanitizeWebProps<T extends object>(props: T): T {
  if (Platform.OS !== "web") {
    return props;
  }

  const {
    accessibilityHint: _accessibilityHint,
    painterEvents: _painterEvents,
    pointerEvents: _pointerEvents,
    ...safeProps
  } = props as T & {
    accessibilityHint?: unknown;
    painterEvents?: unknown;
    pointerEvents?: unknown;
  };

  return safeProps as T;
}
