import { useRouter } from "expo-router";

import { SettingsScreen } from "@/features/settings/settings-screen";
import { clearAnonymousSession } from "@/features/onboarding/session";
import { clearLocalDeviceData } from "@/features/settings/local-data";
import { requestStoredOnboardingReplay } from "@/features/settings/storage";

export default function SettingsRoute() {
  const router = useRouter();

  async function navigateHomeAfter(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      console.warn(
        "[MoodMarble] Settings action failed on settings route:",
        error instanceof Error ? error.message : error,
      );
    }

    router.replace("/");
  }

  return (
    <SettingsScreen
      onClearLocalData={async () => navigateHomeAfter(clearLocalDeviceData)}
      onRequestOnboardingReplay={async () => navigateHomeAfter(requestStoredOnboardingReplay)}
      onReturnHome={() => {
        router.replace("/");
      }}
      onSignOut={async () => navigateHomeAfter(clearAnonymousSession)}
    />
  );
}
