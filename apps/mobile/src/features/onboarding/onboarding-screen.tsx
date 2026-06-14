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

interface OnboardingScreenProps {
  onSessionReady: (session: AnonymousSession) => Promise<void> | void;
  onJoinWorkspace?: (joinCode: string) => Promise<WorkspaceJoinResponse>;
}

export function OnboardingScreen({
  onSessionReady,
  onJoinWorkspace = joinWorkspace,
}: OnboardingScreenProps) {
  const theme = useTheme();
  const [joinCode, setJoinCode] = useState("");
  const [workspaceResult, setWorkspaceResult] =
    useState<WorkspaceJoinResponse | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setSelectedTeamId(joinResult.teams[0]?.id ?? null);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.container}>
          <View style={styles.copyBlock}>
            <ThemedText type="title">MoodMarble</ThemedText>
            <ThemedText type="subtitle">
              Join your workspace anonymously.
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Enter the 6-character join code, choose your team, and keep your
              anonymous device session on this phone only.
            </ThemedText>
          </View>

          {!workspaceResult ? (
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
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <ThemedText type="smallBold">Continue</ThemedText>
                )}
              </Pressable>
            </ThemedView>
          ) : (
            <ThemedView style={styles.card} type="backgroundElement">
              <View style={styles.teamHeader}>
                <View style={styles.teamHeaderCopy}>
                  <ThemedText type="smallBold">
                    {workspaceResult.workspace.name}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    Choose the team you are sharing from.
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
                      <ThemedText type="smallBold">{team.name}</ThemedText>
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
                  <ActivityIndicator color={theme.text} />
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
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 3,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
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
  errorText: {
    color: "#b42318",
  },
});
