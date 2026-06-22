import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  ADMIN_PANEL_ERROR_MESSAGE,
  loadAdminPanelShell,
  type AdminPanelShellBundle,
} from "@/features/admin/api";
import { AdminPanelScreen } from "@/features/admin/admin-panel-screen";
import {
  hasAdminAccess,
  parseAdminTeams,
  type AdminSectionFocus,
} from "@/features/admin/route-state";

interface AdminPanelRouteProps {
  sectionFocus?: AdminSectionFocus;
}

export function AdminPanelRoute({
  sectionFocus = "overview",
}: AdminPanelRouteProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    admin_jwt?: string;
    admin_teams?: string;
    join_code?: string;
    workspace_id?: string;
    workspace_name?: string;
  }>();
  const adminJwt = normalizeSearchParam(params.admin_jwt);
  const workspaceId = normalizeSearchParam(params.workspace_id);
  const workspaceName = normalizeSearchParam(params.workspace_name);
  const joinCode = normalizeSearchParam(params.join_code);
  const teamNames = useMemo(
    () => parseAdminTeams(normalizeSearchParam(params.admin_teams)),
    [params.admin_teams],
  );
  const [bundle, setBundle] = useState<AdminPanelShellBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const isAdminAccessReady = hasAdminAccess(adminJwt, workspaceId);

  useEffect(() => {
    let cancelled = false;

    async function loadShell() {
      if (!adminJwt || !workspaceId) {
        if (!cancelled) {
          setBundle(null);
          setErrorMessage(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextBundle = await loadAdminPanelShell({
          adminJwt,
          workspaceId,
          workspaceName,
          joinCode,
          teamNames,
        });

        if (!cancelled) {
          setBundle(nextBundle);
        }
      } catch (error) {
        if (!cancelled) {
          setBundle(null);
          setErrorMessage(
            error instanceof Error ? error.message : ADMIN_PANEL_ERROR_MESSAGE,
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadShell();

    return () => {
      cancelled = true;
    };
  }, [adminJwt, joinCode, reloadKey, teamNames, workspaceId, workspaceName]);

  const contentState = !isAdminAccessReady
    ? ({ kind: "guarded" } as const)
    : isLoading
      ? ({ kind: "loading" } as const)
      : errorMessage
        ? ({ kind: "error", message: errorMessage } as const)
        : bundle
          ? ({ kind: "ready" } as const)
          : ({ kind: "empty" } as const);

  return (
    <AdminPanelScreen
      contentState={contentState}
      onRetry={() => setReloadKey((currentValue) => currentValue + 1)}
      onReturnHome={() => router.replace("/")}
      sectionFocus={sectionFocus}
      viewModel={bundle}
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
