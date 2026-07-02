import { useRouter } from "expo-router";

import { SettingsScreen } from "@/features/settings/settings-screen";
import { clearAnonymousSession } from "@/features/onboarding/session";
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
        await clearAnonymousSession();
        router.replace("/");
      }}
    />
  );
}
