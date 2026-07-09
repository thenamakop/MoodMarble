import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface ManagerJoinScreenProps {
  onSubmit: (code: string) => Promise<void>;
  onBack?: () => void;
}

export function ManagerJoinScreen({ onSubmit, onBack }: ManagerJoinScreenProps) {
  const theme = useTheme();
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCodeChange(text: string) {
    const cleaned = text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    setCode(cleaned);
    if (errorMessage) setErrorMessage(null);
  }

  async function handleSubmit() {
    if (code.length !== 6 || !/^[A-Z0-9]{6}$/.test(code)) {
      setErrorMessage("Enter a valid 6-character manager code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(code);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="manager-join-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <View style={styles.topBar}>
            {onBack ? (
              <Pressable onPress={onBack} testID="manager-join-back-btn">
                <ThemedText type="linkPrimary">← Back</ThemedText>
              </Pressable>
            ) : (
              <View />
            )}
          </View>

          <View style={styles.copyBlock}>
            <ThemedText type="title">Manager Access</ThemedText>
            <ThemedText themeColor="textSecondary">
              Enter the 6-character code from your workspace admin.
            </ThemedText>
          </View>

          <ThemedView style={styles.card} type="backgroundElement">
            <View style={styles.inputGroup}>
              <ThemedText type="smallBold">Manager code</ThemedText>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="default"
                maxLength={6}
                onChangeText={handleCodeChange}
                placeholder="e.g. ABC123"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    color: theme.text,
                  },
                ]}
                testID="manager-code-input"
                value={code}
              />
            </View>

            {errorMessage ? (
              <ThemedText style={styles.errorText} testID="manager-code-error-text">
                {errorMessage}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.background,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              testID="manager-code-submit-btn"
            >
              {isSubmitting ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator color={theme.text} />
                  <ThemedText type="smallBold">Accessing...</ThemedText>
                </View>
              ) : (
                <ThemedText type="smallBold">Access Dashboard</ThemedText>
              )}
            </Pressable>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  copyBlock: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  inputGroup: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    fontWeight: "500",
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginTop: Spacing.two,
  },
  errorText: {
    color: "#b42318",
    textAlign: "center",
  },
});
