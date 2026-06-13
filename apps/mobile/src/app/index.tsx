import { useLocalSearchParams } from "expo-router";

import { MarbleTrayScreen } from "@/features/mood-submission/marble-tray-screen";

export default function HomeScreen() {
  const params = useLocalSearchParams<{
    workspace_id?: string;
    team_id?: string;
    device_jwt?: string;
  }>();

  const workspaceId =
    typeof params.workspace_id === "string" ? params.workspace_id : undefined;
  const teamId =
    typeof params.team_id === "string" ? params.team_id : undefined;
  const deviceJwt =
    typeof params.device_jwt === "string" ? params.device_jwt : undefined;

  return (
    <MarbleTrayScreen
      workspaceId={workspaceId}
      teamId={teamId}
      deviceJwt={deviceJwt}
    />
  );
}
