import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  loadManagerDashboardBundle,
  type ManagerDashboardBundle,
} from "@/features/dashboard/api";
import { buildManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { ManagerDashboardScreen } from "@/features/dashboard/manager-dashboard-screen";
import {
  buildManagerRouteParams,
  getNextDateSelection,
  hasManagerAccess,
  parseManagerTeams,
  resolveSelectedDate,
  resolveSelectedTeam,
} from "@/features/dashboard/route-state";

export default function ManagerDashboardRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    date?: string;
    manager_jwt?: string;
    manager_teams?: string;
    start_date?: string;
    team_id?: string;
    team_name?: string;
  }>();
  const teamIdParam = normalizeSearchParam(params.team_id);
  const managerJwt = normalizeSearchParam(params.manager_jwt);
  const managerTeams = useMemo(
    () => parseManagerTeams(normalizeSearchParam(params.manager_teams)),
    [params.manager_teams],
  );
  const selectedTeam = useMemo(
    () => resolveSelectedTeam(managerTeams, teamIdParam),
    [managerTeams, teamIdParam],
  );
  const selectedDate = useMemo(
    () =>
      resolveSelectedDate(
        normalizeSearchParam(params.date),
        normalizeSearchParam(params.start_date),
      ),
    [params.date, params.start_date],
  );
  const [bundle, setBundle] = useState<ManagerDashboardBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isManagerAccessReady = hasManagerAccess(managerJwt, selectedTeam);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!selectedTeam || !managerJwt) {
        if (!cancelled) {
          setBundle(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const nextBundle = await loadManagerDashboardBundle({
          teamId: selectedTeam.teamId,
          managerJwt,
          date: selectedDate.date,
          startDate: selectedDate.startDate,
        });

        if (!cancelled) {
          setBundle(nextBundle);
        }
      } catch {
        if (!cancelled) {
          setBundle(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [managerJwt, selectedDate.date, selectedDate.startDate, selectedTeam]);

  const viewModel = useMemo(
    () => (bundle ? buildManagerDashboardViewModel(bundle) : null),
    [bundle],
  );

  const contentState = !isManagerAccessReady
    ? { kind: "guarded" as const }
    : isLoading
      ? { kind: "loading" as const }
      : bundle
        ? { kind: "ready" as const }
        : { kind: "empty" as const };

  function handleSelectDate() {
    const nextSelection = getNextDateSelection(selectedDate);

    router.replace({
      pathname: "/manager",
      params: buildManagerRouteParams({
        managerJwt,
        managerTeams,
        selectedDate: nextSelection,
        selectedTeam,
      }),
    });
  }

  function handleSelectTeam() {
    if (!selectedTeam || managerTeams.length <= 1) {
      return;
    }

    const currentIndex = managerTeams.findIndex(
      (team) => team.teamId === selectedTeam.teamId,
    );
    const nextTeam =
      managerTeams[
        (currentIndex + 1 + managerTeams.length) % managerTeams.length
      ];

    router.replace({
      pathname: "/manager",
      params: buildManagerRouteParams({
        managerJwt,
        managerTeams,
        selectedDate,
        selectedTeam: nextTeam,
      }),
    });
  }

  return (
    <ManagerDashboardScreen
      contentState={contentState}
      canChangeDate={isManagerAccessReady}
      canChangeTeam={managerTeams.length > 1}
      onReturnHome={() => router.replace("/")}
      onSelectDate={handleSelectDate}
      onSelectTeam={handleSelectTeam}
      selectedDateLabel={selectedDate.label}
      selectedTeamLabel={selectedTeam?.label ?? "Manager team"}
      viewModel={viewModel}
    />
  );
}

function normalizeSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((entry) => entry.trim().length > 0);
    return firstValue ?? null;
  }

  return null;
}
