import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { LocalHistoryScreen } from "@/features/history/history-screen";
import { MarbleTrayScreen } from "@/features/mood-submission/marble-tray-screen";
import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";
import { resolveAnonymousHomeState } from "@/features/onboarding/route-boundary";
import { saveAnonymousSession } from "@/features/onboarding/session";
import {
  getAnonymousSessionFromParams,
  restoreAnonymousSession,
} from "@/features/onboarding/session-boundary";
import type { AnonymousSession } from "@/features/onboarding/types";
import { clearLocalDeviceData } from "@/features/settings/local-data";
import { SettingsScreen } from "@/features/settings/settings-screen";
import {
  clearStoredOnboardingReplayRequest,
  loadLocalSettings,
  requestStoredOnboardingReplay,
} from "@/features/settings/storage";
import { drainQueue } from "@/features/mood-submission/queue";
import { syncStoredReminderScheduleForRuntime } from "@/features/notifications/scheduler-bridge";
import { useTheme } from "@/hooks/use-theme";
import { loadAdminSession } from "@/features/admin/session";
import { buildAdminRouteParams } from "@/features/admin/route-state";

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    workspace_id?: string;
    team_id?: string;
    device_jwt?: string;
  }>();
  const workspaceIdParamKey = getParamDependencyKey(params.workspace_id);
  const teamIdParamKey = getParamDependencyKey(params.team_id);
  const deviceJwtParamKey = getParamDependencyKey(params.device_jwt);
  const [session, setSession] = useState<AnonymousSession | null>(null);
  const [replaySession, setReplaySession] = useState<AnonymousSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [activeNativeScreen, setActiveNativeScreen] = useState<"marbles" | "history" | "settings">(
    "marbles",
  );
  const sessionSyncVersionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const syncVersion = ++sessionSyncVersionRef.current;

    async function syncSession() {
      // Check admin session first
      const adminSession = await loadAdminSession();
      if (adminSession && !cancelled && sessionSyncVersionRef.current === syncVersion) {
        router.replace({
          pathname: "/admin",
          params: buildAdminRouteParams(adminSession),
        });
        return;
      }

      const nextContext = getAnonymousSessionFromParams(params);
      const nextSession = await restoreAnonymousSession(params);
      const localSettings = await loadLocalSettings();
      const shouldReplayOnboarding = !nextContext && nextSession && localSettings.replayOnboarding;

      if (shouldReplayOnboarding) {
        await clearStoredOnboardingReplayRequest();

        if (!cancelled && sessionSyncVersionRef.current === syncVersion) {
          setReplaySession(nextSession);
          setSession(null);
          setIsLoadingSession(false);
          setActiveNativeScreen("marbles");
        }

        return;
      }

      if (nextContext) {
        if (!cancelled && sessionSyncVersionRef.current === syncVersion) {
          setReplaySession(null);
          setSession(nextSession);
          setIsLoadingSession(false);
        }

        scrubUrl(router);
        return;
      }

      if (!cancelled && sessionSyncVersionRef.current === syncVersion) {
        setReplaySession(null);
        setSession(nextSession);
        setIsLoadingSession(false);
      }
    }

    void syncSession();

    return () => {
      cancelled = true;
    };
  }, [deviceJwtParamKey, router, teamIdParamKey, workspaceIdParamKey]);

  useEffect(() => {
    // Keep persisted reminder schedules aligned after app restarts without
    // blocking startup or bundling native notifications in unsupported runtimes.
    void syncStoredReminderScheduleForRuntime().catch(() => undefined);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void drainQueue();
      }
    });

    return () => sub.remove();
  }, []);

  async function refreshNativeHomeState() {
    const nextContext = getAnonymousSessionFromParams(params);
    const nextSession = await restoreAnonymousSession(params);
    const localSettings = await loadLocalSettings();
    const shouldReplayOnboarding = !nextContext && nextSession && localSettings.replayOnboarding;

    if (shouldReplayOnboarding) {
      await clearStoredOnboardingReplayRequest();
      setReplaySession(nextSession);
      setSession(null);
      setIsLoadingSession(false);
      setActiveNativeScreen("marbles");
      return;
    }

    setReplaySession(null);
    setSession(nextSession);
    setIsLoadingSession(false);
    setActiveNativeScreen("marbles");
  }

  async function handleSessionReady(nextSession: AnonymousSession) {
    sessionSyncVersionRef.current += 1;
    await saveAnonymousSession(nextSession);
    setReplaySession(null);
    setSession(nextSession);
    setIsLoadingSession(false);
    setActiveNativeScreen("marbles");
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
        <ThemedText themeColor="textSecondary">Restoring anonymous session...</ThemedText>
      </View>
    );
  }

  if (resolveAnonymousHomeState(session) === "onboarding") {
    return (
      <OnboardingScreen
        onSessionReady={handleSessionReady}
        replaySession={replaySession ?? undefined}
      />
    );
  }

  if (Platform.OS !== "web" && activeNativeScreen === "history") {
    return <LocalHistoryScreen onReturnHome={() => setActiveNativeScreen("marbles")} />;
  }

  if (Platform.OS !== "web" && activeNativeScreen === "settings") {
    return (
      <SettingsScreen
        onClearLocalData={async () => {
          setIsLoadingSession(true);
          await clearLocalDeviceData();
          await refreshNativeHomeState();
        }}
        onRequestOnboardingReplay={async () => {
          setIsLoadingSession(true);
          await requestStoredOnboardingReplay();
          await refreshNativeHomeState();
        }}
        onReturnHome={() => setActiveNativeScreen("marbles")}
        onSignOut={async () => {
          setIsLoadingSession(true);
          await clearLocalDeviceData();
          await refreshNativeHomeState();
        }}
      />
    );
  }

  if (!session) {
    return null;
  }

  return (
    <MarbleTrayScreen
      workspaceId={session?.workspaceId}
      teamId={session?.teamId}
      deviceJwt={session?.deviceJwt}
      onOpenHistory={
        Platform.OS === "web"
          ? undefined
          : () => {
              setActiveNativeScreen("history");
            }
      }
      onOpenSettings={
        Platform.OS === "web"
          ? undefined
          : () => {
              setActiveNativeScreen("settings");
            }
      }
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

function getParamDependencyKey(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return `string:${value}`;
  }

  if (Array.isArray(value)) {
    return `array:${value.join("\u0000")}`;
  }

  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
});
