import { useRouter } from "expo-router";

import { SettingsScreen } from "@/features/settings/settings-screen";
import { clearLocalDeviceData } from "@/features/settings/local-data";
import { requestStoredOnboardingReplay } from "@/features/settings/storage";

export default function SettingsRoute() {
  const router = useRouter();

  return (
    <SettingsScreen
      onClearLocalData={async () => {
        await clearLocalDeviceData();
        router.replace("/");
      }}
      onRequestOnboardingReplay={async () => {
        await requestStoredOnboardingReplay();
        router.replace("/");
      }}
      onReturnHome={() => {
        router.replace("/");
      }}
      onSignOut={async () => {
        try {
          await clearLocalDeviceData();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[MoodMarble] Sign-out cleanup failed: ${message}`);
        } finally {
          // Always navigate away from the settings surface so the user is not
          // left on a frozen screen if the cleanup step fails or hangs.
          router.replace("/");
        }
      }}
    />
  );
}
