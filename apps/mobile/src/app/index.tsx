import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { MarbleTrayScreen } from "@/features/mood-submission/marble-tray-screen";
import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";
import {
  loadAnonymousSession,
  saveAnonymousSession,
} from "@/features/onboarding/session";
import type { AnonymousSession } from "@/features/onboarding/types";
import { useTheme } from "@/hooks/use-theme";

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    workspace_id?: string;
    team_id?: string;
    device_jwt?: string;
  }>();
  const [session, setSession] = useState<AnonymousSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function syncAnonymousSession() {
      const nextContext = getSubmissionContext(params);

      if (nextContext) {
        await saveAnonymousSession(nextContext);

        if (!cancelled) {
          setSession(nextContext);
          setIsLoadingSession(false);
        }

        scrubUrl(router);
        return;
      }

      const storedSession = await loadAnonymousSession();

      if (!cancelled) {
        setSession(storedSession);
        setIsLoadingSession(false);
      }
    }

    void syncAnonymousSession();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  async function handleSessionReady(nextSession: AnonymousSession) {
    await saveAnonymousSession(nextSession);
    setSession(nextSession);
  }

  if (isLoadingSession) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <ActivityIndicator color={theme.text} />
        <ThemedText themeColor="textSecondary">
          Restoring anonymous session...
        </ThemedText>
      </View>
    );
  }

  if (!session) {
    return <OnboardingScreen onSessionReady={handleSessionReady} />;
  }

  return (
    <MarbleTrayScreen
      workspaceId={session.workspaceId}
      teamId={session.teamId}
      deviceJwt={session.deviceJwt}
    />
  );
}

function getSubmissionContext(params: {
  workspace_id?: string | string[];
  team_id?: string | string[];
  device_jwt?: string | string[];
}): AnonymousSession | null {
  const workspaceId =
    typeof params.workspace_id === "string" ? params.workspace_id : undefined;
  const teamId =
    typeof params.team_id === "string" ? params.team_id : undefined;
  const deviceJwt =
    typeof params.device_jwt === "string" ? params.device_jwt : undefined;

  if (!workspaceId || !teamId || !deviceJwt) {
    return null;
  }

  return {
    workspaceId,
    teamId,
    deviceJwt,
  };
}

function scrubUrl(router: ReturnType<typeof useRouter>) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", cleanUrl);
    return;
  }

  router.replace("/");
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
});
