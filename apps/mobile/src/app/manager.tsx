import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import {
  loadManagerDashboardBundle,
  type ManagerDashboardBundle,
} from "@/features/dashboard/api";
import { buildManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { ManagerDashboardScreen } from "@/features/dashboard/manager-dashboard-screen";

export default function ManagerDashboardRoute() {
  const params = useLocalSearchParams<{
    date?: string;
    manager_jwt?: string;
    start_date?: string;
    team_id?: string;
    team_name?: string;
  }>();
  const teamId = normalizeSearchParam(params.team_id);
  const teamName = normalizeSearchParam(params.team_name);
  const managerJwt = normalizeSearchParam(params.manager_jwt);
  const date = normalizeSearchParam(params.date);
  const startDate = normalizeSearchParam(params.start_date);
  const [bundle, setBundle] = useState<ManagerDashboardBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!teamId || !managerJwt) {
        if (!cancelled) {
          setBundle(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const nextBundle = await loadManagerDashboardBundle({
          teamId,
          managerJwt,
          date: date ?? undefined,
          startDate: startDate ?? undefined,
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
  }, [date, managerJwt, startDate, teamId]);

  const viewModel = useMemo(
    () => (bundle ? buildManagerDashboardViewModel(bundle) : null),
    [bundle],
  );

  const contentState = isLoading
    ? { kind: "loading" as const }
    : bundle
      ? { kind: "ready" as const }
      : { kind: "empty" as const };

  return (
    <ManagerDashboardScreen
      contentState={contentState}
      selectedDateLabel={
        startDate ? `Week of ${startDate}` : (date ?? "This week")
      }
      selectedTeamLabel={teamName ?? teamId ?? "Current team"}
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
