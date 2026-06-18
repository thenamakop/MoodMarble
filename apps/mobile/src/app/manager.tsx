import { ManagerDashboardScreen } from "@/features/dashboard/manager-dashboard-screen";

export default function ManagerDashboardRoute() {
  return (
    <ManagerDashboardScreen
      contentState={{ kind: "ready" }}
      selectedDateLabel="This week"
      selectedTeamLabel="Current team"
    />
  );
}
