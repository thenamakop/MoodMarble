import { useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
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

interface AdminLoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void> | void;
  onReturnHome?: () => void;
}

export function AdminLoginScreen({ onLogin, onReturnHome }: AdminLoginScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setErrorMessage(t("admin.login.errorMessages.requiredFields"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("admin.login.errorMessages.loginFailed"),
      );
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="admin-login-root">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <View style={styles.topBar}>
            {onReturnHome ? (
              <Pressable onPress={onReturnHome} testID="admin-login-back-button">
                <ThemedText type="linkPrimary">{t("admin.login.backButton")}</ThemedText>
              </Pressable>
            ) : (
              <View />
            )}
          </View>

          <View style={styles.copyBlock}>
            <ThemedText type="title">{t("admin.login.title")}</ThemedText>
            <ThemedText themeColor="textSecondary">{t("admin.login.subtitle")}</ThemedText>
          </View>

          <ThemedView style={styles.card} type="backgroundElement">
            <View style={styles.inputGroup}>
              <ThemedText type="smallBold">{t("admin.login.emailLabel")}</ThemedText>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="email-address"
                onChangeText={(value) => {
                  setEmail(value);
                  setErrorMessage(null);
                }}
                placeholder={t("admin.login.emailPlaceholder")}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    color: theme.text,
                  },
                ]}
                testID="admin-email-input"
                value={email}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <ThemedText type="smallBold">{t("admin.login.passwordLabel")}</ThemedText>
                <Pressable
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={() => setShowPassword((prev) => !prev)}
                  testID="admin-password-toggle"
                >
                  <ThemedText type="linkPrimary">
                    {showPassword ? t("admin.login.hidePassword") : t("admin.login.showPassword")}
                  </ThemedText>
                </Pressable>
              </View>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrorMessage(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    color: theme.text,
                  },
                ]}
                testID="admin-password-input"
                value={password}
              />
            </View>

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
              testID="admin-login-submit-button"
            >
              {isSubmitting ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator color={theme.text} />
                  <ThemedText type="smallBold">{t("admin.login.signingIn")}</ThemedText>
                </View>
              ) : (
                <ThemedText type="smallBold">{t("admin.login.signInButton")}</ThemedText>
              )}
            </Pressable>
          </ThemedView>

          {errorMessage ? (
            <ThemedText style={styles.errorText} testID="admin-login-error-text">
              {errorMessage}
            </ThemedText>
          ) : null}
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
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
