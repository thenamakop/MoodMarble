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

/**
 * Restores the anonymous home session and renders the appropriate screen.
 *
 * Shows a loading state while the session is being restored, routes to the admin screen when an
 * admin session is present, replays onboarding when requested, and switches between the marble tray,
 * local history, and settings screens on native platforms.
 */
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
    // params itself is intentionally excluded: useLocalSearchParams returns a
    // new object reference on every render, which would cause the effect to
    // re-run continuously. The stable *ParamKey strings derived above track
    // only the specific URL params this effect cares about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceJwtParamKey, router, teamIdParamKey, workspaceIdParamKey]);

  useEffect(() => {
    // Keep persisted reminder schedules aligned after app restarts without
    // blocking startup or bundling native notifications in unsupported runtimes.
    void syncStoredReminderScheduleForRuntime().catch(() => undefined);
  }, []);

  useEffect(() => {
    // Native: drain queue when app comes back to foreground.
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void drainQueue();
      }
    });

    // Web: AppState does not fire reliably. Use the Page Visibility API so
    // queued submissions are retried when the tab regains focus.
    function handleVisibilityChange() {
      if (
        Platform.OS === "web" &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        void drainQueue();
      }
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      // Also drain immediately on mount so any queue from a previous session
      // is flushed as soon as the tab is ready.
      void drainQueue();
    }

    return () => {
      sub.remove();

      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
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
          try {
            await clearLocalDeviceData();
            await refreshNativeHomeState();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[MoodMarble] Failed to clear local data: ${message}`);
          } finally {
            setIsLoadingSession(false);
          }
        }}
        onRequestOnboardingReplay={async () => {
          setIsLoadingSession(true);
          // Capture the current session before any state changes.
          // This is the session we will replay onboarding for —
          // the user keeps their workspace/team membership; only the
          // slides are shown again. No join code is required.
          const currentSession = session;
          await requestStoredOnboardingReplay();
          await clearStoredOnboardingReplayRequest();
          // session = null → resolveAnonymousHomeState returns "onboarding"
          // replaySession = currentSession → OnboardingScreen skips join code
          sessionSyncVersionRef.current += 1;
          setSession(null);
          setReplaySession(currentSession);
          setActiveNativeScreen("marbles");
          setIsLoadingSession(false);
        }}
        onReturnHome={() => setActiveNativeScreen("marbles")}
        onSignOut={async () => {
          setIsLoadingSession(true);
          try {
            await clearLocalDeviceData();
            // Hard-reset the session state so the current screen cannot render
            // the marble tray while the navigation is in flight.
            sessionSyncVersionRef.current += 1;
            setSession(null);
            setReplaySession(null);
            // Navigate to "/" with empty params to scrub the old
            // workspace/team/jwt params from the router state.
            // This prevents restoreAnonymousSession() from re-hydrating
            // the session from stale URL params on the new mount.
            router.replace({
              pathname: "/",
              params: {
                workspace_id: "",
                team_id: "",
                device_jwt: "",
              },
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[MoodMarble] Failed to sign out: ${message}`);
          } finally {
            setIsLoadingSession(false);
          }
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

/**
 * Removes anonymous-session query parameters from the current route.
 *
 * On web, preserves the current path and hash while replacing the URL in place.
 * On native platforms, navigates to the root route.
 *
 * @param router - The router used for native navigation
 */
function scrubUrl(router: ReturnType<typeof useRouter>) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", cleanUrl);
    return;
  }

  router.replace("/");
}

/**
 * Normalizes a query parameter value for stable dependency tracking.
 *
 * @param value - The parameter value to normalize
 * @returns A stable key for the value, or `null` when no value is present
 */
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
