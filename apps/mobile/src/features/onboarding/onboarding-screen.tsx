import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  JoinCodeSchema,
  type WorkspaceJoinResponse,
} from "@/contracts/workspace-join";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { joinWorkspace } from "@/features/onboarding/api";
import type { AnonymousSession } from "@/features/onboarding/types";
import { useTheme } from "@/hooks/use-theme";

const ONBOARDING_SLIDES = [
  {
    title: "Anonymous by design",
    description:
      "No login, no profile, and no name attached. MoodMarble keeps your check-ins private and lightweight.",
    accent: "Privacy first",
  },
  {
    title: "Join with a 6-character code",
    description:
      "Enter your workspace code, choose your team, and get into the app in a few taps.",
    accent: "Simple start",
  },
  {
    title: "Share how your marble is rolling",
    description:
      "The app stays fast and private-feeling so you can understand how to begin in seconds.",
    accent: "Ready to begin",
  },
] as const;

interface OnboardingScreenProps {
  onSessionReady: (session: AnonymousSession) => Promise<void> | void;
  onJoinWorkspace?: (joinCode: string) => Promise<WorkspaceJoinResponse>;
}

export function OnboardingScreen({
  onSessionReady,
  onJoinWorkspace = joinWorkspace,
}: OnboardingScreenProps) {
  const theme = useTheme();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [joinCode, setJoinCode] = useState("");
  const [workspaceResult, setWorkspaceResult] =
    useState<WorkspaceJoinResponse | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isShowingIntro = currentSlideIndex < ONBOARDING_SLIDES.length;
  const currentSlide = ONBOARDING_SLIDES[currentSlideIndex];
  const normalizedJoinCode = useMemo(
    () => joinCode.trim().toUpperCase(),
    [joinCode],
  );

  async function handleJoinWorkspace() {
    const parsedJoinCode = JoinCodeSchema.safeParse(normalizedJoinCode);

    if (!parsedJoinCode.success) {
      setErrorMessage(
        parsedJoinCode.error.issues[0]?.message ?? "Join code is required.",
      );
      return;
    }

    setIsJoining(true);
    setErrorMessage(null);

    try {
      const joinResult = await onJoinWorkspace(parsedJoinCode.data);
      setWorkspaceResult(joinResult);
      setSelectedTeamId(null);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to join workspace right now."),
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function handleContinue() {
    if (!workspaceResult || !selectedTeamId) {
      return;
    }

    setIsSavingSession(true);
    setErrorMessage(null);

    try {
      await onSessionReady({
        workspaceId: workspaceResult.workspace.id,
        teamId: selectedTeamId,
        deviceJwt: workspaceResult.device_jwt,
      });
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to save session right now."),
      );
    } finally {
      setIsSavingSession(false);
    }
  }

  function resetJoinFlow() {
    setWorkspaceResult(null);
    setSelectedTeamId(null);
    setErrorMessage(null);
  }

  function handleNextSlide() {
    setCurrentSlideIndex((currentValue) =>
      Math.min(currentValue + 1, ONBOARDING_SLIDES.length),
    );
    setErrorMessage(null);
  }

  function handleBackSlide() {
    setCurrentSlideIndex((currentValue) => Math.max(currentValue - 1, 0));
    setErrorMessage(null);
  }

  function handleSkipToJoin() {
    setCurrentSlideIndex(ONBOARDING_SLIDES.length);
    setErrorMessage(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.container}>
          {isShowingIntro ? (
            <ThemedView style={styles.card} type="backgroundElement">
              <View style={styles.slideTopBar}>
                <ThemedText type="smallBold">{currentSlide.accent}</ThemedText>
                {currentSlideIndex < ONBOARDING_SLIDES.length - 1 ? (
                  <Pressable
                    onPress={handleSkipToJoin}
                    testID="skip-onboarding-button"
                  >
                    <ThemedText type="linkPrimary">Skip</ThemedText>
                  </Pressable>
                ) : (
                  <View />
                )}
              </View>

              <View style={styles.slideArt} testID="onboarding-marble-art">
                <View
                  style={[
                    styles.marbleLarge,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                />
                <View
                  style={[
                    styles.marbleSmall,
                    { backgroundColor: theme.background },
                  ]}
                />
                <ThemedText style={styles.marbleEmoji}>🪨</ThemedText>
              </View>

              <View style={styles.copyBlock}>
                <ThemedText type="title">MoodMarble</ThemedText>
                <ThemedText type="subtitle">{currentSlide.title}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {currentSlide.description}
                </ThemedText>
              </View>

              <View style={styles.slideDots} testID="onboarding-slide-dots">
                {ONBOARDING_SLIDES.map((slide, index) => (
                  <View
                    key={slide.title}
                    style={[
                      styles.slideDot,
                      {
                        backgroundColor:
                          index === currentSlideIndex
                            ? theme.text
                            : theme.backgroundSelected,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.slideActions}>
                {currentSlideIndex > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleBackSlide}
                    style={[
                      styles.secondaryButton,
                      { borderColor: theme.backgroundSelected },
                    ]}
                    testID="back-onboarding-button"
                  >
                    <ThemedText type="smallBold">Back</ThemedText>
                  </Pressable>
                ) : (
                  <View style={styles.slideActionSpacer} />
                )}

                <Pressable
                  accessibilityRole="button"
                  onPress={
                    currentSlideIndex === ONBOARDING_SLIDES.length - 1
                      ? handleSkipToJoin
                      : handleNextSlide
                  }
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.slidePrimaryButton,
                    {
                      backgroundColor: pressed
                        ? theme.backgroundSelected
                        : theme.background,
                    },
                  ]}
                  testID="next-onboarding-button"
                >
                  <ThemedText type="smallBold">
                    {currentSlideIndex === ONBOARDING_SLIDES.length - 1
                      ? "Enter join code"
                      : "Next"}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ) : !workspaceResult ? (
            <>
              <View style={styles.copyBlock}>
                <ThemedText type="title">MoodMarble</ThemedText>
                <ThemedText type="subtitle">
                  Join your workspace anonymously.
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Enter the 6-character join code, choose your team, and keep
                  your anonymous device session on this phone only.
                </ThemedText>
              </View>

              <ThemedView style={styles.card} type="backgroundElement">
                <ThemedText type="smallBold">Join code</ThemedText>
                <TextInput
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  onChangeText={(value) => {
                    setJoinCode(value.replace(/\s+/gu, "").toUpperCase());
                    setErrorMessage(null);
                  }}
                  placeholder="ABC123"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  testID="join-code-input"
                  value={joinCode}
                />

                <Pressable
                  accessibilityRole="button"
                  disabled={isJoining}
                  onPress={handleJoinWorkspace}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: pressed
                        ? theme.backgroundSelected
                        : theme.background,
                      opacity: isJoining ? 0.6 : 1,
                    },
                  ]}
                  testID="join-workspace-button"
                >
                  {isJoining ? (
                    <View style={styles.loadingContent}>
                      <ActivityIndicator color={theme.text} />
                      <ThemedText type="smallBold">Checking code...</ThemedText>
                    </View>
                  ) : (
                    <ThemedText type="smallBold">Continue</ThemedText>
                  )}
                </Pressable>
              </ThemedView>
            </>
          ) : (
            <ThemedView style={styles.card} type="backgroundElement">
              <View style={styles.teamHeader}>
                <View style={styles.teamHeaderCopy}>
                  <ThemedText type="smallBold">
                    {workspaceResult.workspace.name}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    Choose one team to continue anonymously.
                  </ThemedText>
                </View>
                <Pressable
                  onPress={resetJoinFlow}
                  testID="change-join-code-button"
                >
                  <ThemedText type="linkPrimary">Use another code</ThemedText>
                </Pressable>
              </View>

              <View style={styles.teamList}>
                {workspaceResult.teams.map((team) => {
                  const isSelected = selectedTeamId === team.id;

                  return (
                    <Pressable
                      key={team.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setSelectedTeamId(team.id)}
                      style={[
                        styles.teamOption,
                        {
                          backgroundColor: isSelected
                            ? theme.backgroundSelected
                            : theme.background,
                          borderColor: isSelected
                            ? theme.text
                            : theme.backgroundSelected,
                        },
                      ]}
                      testID={`team-option-${team.id}`}
                    >
                      <View style={styles.teamOptionContent}>
                        <ThemedText type="smallBold">{team.name}</ThemedText>
                        {isSelected ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            Selected
                          </ThemedText>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!selectedTeamId || isSavingSession}
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: pressed
                      ? theme.backgroundSelected
                      : theme.background,
                    opacity: !selectedTeamId || isSavingSession ? 0.6 : 1,
                  },
                ]}
                testID="complete-onboarding-button"
              >
                {isSavingSession ? (
                  <View style={styles.loadingContent}>
                    <ActivityIndicator color={theme.text} />
                    <ThemedText type="smallBold">Saving team...</ThemedText>
                  </View>
                ) : (
                  <ThemedText type="smallBold">Continue anonymously</ThemedText>
                )}
              </Pressable>
            </ThemedView>
          )}

          {errorMessage ? (
            <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
          ) : null}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
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
  copyBlock: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  slideTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slideArt: {
    minHeight: 180,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  marbleLarge: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    opacity: 0.9,
  },
  marbleSmall: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 999,
    top: 28,
    right: 48,
    opacity: 0.9,
  },
  marbleEmoji: {
    fontSize: 42,
    lineHeight: 48,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 3,
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
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  slideDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  slideDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  slideActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  slidePrimaryButton: {
    flex: 1,
  },
  slideActionSpacer: {
    width: 88,
  },
  teamHeader: {
    gap: Spacing.two,
  },
  teamHeaderCopy: {
    gap: Spacing.one,
  },
  teamList: {
    gap: Spacing.two,
  },
  teamOption: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  teamOptionContent: {
    gap: Spacing.one,
  },
  errorText: {
    color: "#b42318",
  },
});
