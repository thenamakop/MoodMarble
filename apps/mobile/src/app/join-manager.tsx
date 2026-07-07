import { useRouter } from "expo-router";

import { ManagerJoinScreen } from "@/features/dashboard/manager-join-screen";
import { redeemManagerCode } from "@/features/dashboard/manager-join-api";
import { buildManagerRouteParams, buildDateSelection } from "@/features/dashboard/route-state";

export default function ManagerJoinRoute() {
  const router = useRouter();

  async function handleSubmit(code: string) {
    const data = await redeemManagerCode(code);
    const teamOption = { teamId: data.team_id, label: data.team_name };
    router.replace({
      pathname: "/manager",
      params: buildManagerRouteParams({
        managerJwt: data.manager_jwt,
        managerTeams: [teamOption],
        selectedDate: buildDateSelection(new Date().toISOString().slice(0, 10)),
        selectedTeam: teamOption,
      }),
    });
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return <ManagerJoinScreen onSubmit={handleSubmit} onBack={handleBack} />;
}
