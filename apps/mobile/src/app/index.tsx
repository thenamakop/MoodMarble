import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform } from "react-native";

import { MarbleTrayScreen } from "@/features/mood-submission/marble-tray-screen";

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    workspace_id?: string;
    team_id?: string;
    device_jwt?: string;
  }>();

  const [submissionContext, setSubmissionContext] = useState(() =>
    getSubmissionContext(params),
  );

  useEffect(() => {
    const nextContext = getSubmissionContext(params);

    if (
      nextContext.workspaceId ||
      nextContext.teamId ||
      nextContext.deviceJwt
    ) {
      setSubmissionContext(nextContext);

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
        window.history.replaceState(window.history.state, "", cleanUrl);
      } else {
        router.replace("/");
      }
    }
  }, [params, router]);

  return (
    <MarbleTrayScreen
      workspaceId={submissionContext.workspaceId}
      teamId={submissionContext.teamId}
      deviceJwt={submissionContext.deviceJwt}
    />
  );
}

function getSubmissionContext(params: {
  workspace_id?: string | string[];
  team_id?: string | string[];
  device_jwt?: string | string[];
}) {
  return {
    workspaceId:
      typeof params.workspace_id === "string" ? params.workspace_id : undefined,
    teamId: typeof params.team_id === "string" ? params.team_id : undefined,
    deviceJwt:
      typeof params.device_jwt === "string" ? params.device_jwt : undefined,
  };
}
