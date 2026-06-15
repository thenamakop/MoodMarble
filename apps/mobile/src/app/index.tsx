import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { MarbleTrayScreen } from "@/features/mood-submission/marble-tray-screen";
import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";
import { resolveAnonymousHomeState } from "@/features/onboarding/route-boundary";
import { saveAnonymousSession } from "@/features/onboarding/session";
import {
  getAnonymousSessionFromParams,
  restoreAnonymousSession,
} from "@/features/onboarding/session-boundary";
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
      const nextContext = getAnonymousSessionFromParams(params);
      const nextSession = await restoreAnonymousSession(params);

      if (nextContext) {
        if (!cancelled) {
          setSession(nextSession);
          setIsLoadingSession(false);
        }

        scrubUrl(router);
        return;
      }

      if (!cancelled) {
        setSession(nextSession);
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

  if (resolveAnonymousHomeState(session) === "onboarding") {
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
