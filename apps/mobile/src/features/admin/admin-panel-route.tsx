import { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  ADMIN_PANEL_ERROR_MESSAGE,
  createAdminTeam,
  createAdminWorkspace,
  exportAdminCsv,
  fetchAdminJoinCode,
  loadAdminPanelShell,
  rotateAdminJoinCode,
  updateAdminTeam,
  type AdminPanelShellBundle,
} from "@/features/admin/api";
import { AdminPanelScreen } from "@/features/admin/admin-panel-screen";
import {
  hasAdminAccess,
  parseAdminRouteParams,
  type AdminSectionFocus,
} from "@/features/admin/route-state";
import { shareAdminCsv } from "@/features/admin/share";
import { loadAdminSession, clearAdminSession } from "@/features/admin/session";

const DEBUG_SERVER_URL = "http://10.0.2.2:7777/event";
const DEBUG_SESSION_ID = "e2e-manual-edit-audit";

function reportMobileDebugEvent(
  hypothesisId: string,
  msg: string,
  data: Record<string, unknown>,
) {
  fetch(DEBUG_SERVER_URL, {
    method: "POST",
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: "pre-fix",
      hypothesisId,
      location: "apps/mobile/src/features/admin/admin-panel-route.tsx",
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

interface AdminPanelRouteProps {
  sectionFocus?: AdminSectionFocus;
}

export function AdminPanelRoute({
  sectionFocus = "overview",
}: AdminPanelRouteProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    admin_jwt?: string;
    workspace_id?: string;
    workspace_name?: string;
  }>();
  const parsedParams = parseAdminRouteParams(params);
  const routeAdminJwt = parsedParams.adminJwt ?? null;
  const routeWorkspaceId = parsedParams.workspaceId ?? null;
  const routeWorkspaceName = parsedParams.workspaceName ?? null;
  const [adminJwt, setAdminJwt] = useState(routeAdminJwt);
  const [workspaceId, setWorkspaceId] = useState(routeWorkspaceId);
  const [workspaceName, setWorkspaceName] = useState(routeWorkspaceName);
  const [bundle, setBundle] = useState<AdminPanelShellBundle | null>(null);
  const [feedbackState, setFeedbackState] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [isShellLoading, setIsShellLoading] = useState(false);
  const [shellErrorMessage, setShellErrorMessage] = useState<string | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const isAdminAccessReady = hasAdminAccess(adminJwt, workspaceId);

  useEffect(() => {
    // #region debug-point E:admin-route-params
    reportMobileDebugEvent("E", "[DEBUG] Admin route params resolved.", {
      hasAdminJwt: Boolean(adminJwt),
      isAdminAccessReady,
      pathname: "/admin",
      routeWorkspaceId,
      routeWorkspaceName,
      sectionFocus,
      workspaceId,
    });
    // #endregion
  }, [
    adminJwt,
    isAdminAccessReady,
    routeWorkspaceId,
    routeWorkspaceName,
    sectionFocus,
    workspaceId,
  ]);

  useEffect(() => {
    if (!adminJwt && routeAdminJwt) {
      setAdminJwt(routeAdminJwt);
    }

    if (!workspaceId && routeWorkspaceId) {
      setWorkspaceId(routeWorkspaceId);
    }

    if (!workspaceName && routeWorkspaceName) {
      setWorkspaceName(routeWorkspaceName);
    }
  }, [
    adminJwt,
    routeAdminJwt,
    routeWorkspaceId,
    routeWorkspaceName,
    workspaceId,
    workspaceName,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadShell() {
      let currentAdminJwt = adminJwt;
      let currentWorkspaceId = workspaceId;
      let currentWorkspaceName = workspaceName;

      if (!currentAdminJwt || !currentWorkspaceId) {
        const storedSession = await loadAdminSession();
        if (storedSession) {
          currentAdminJwt = storedSession.adminJwt;
          currentWorkspaceId = storedSession.workspaceId;
          currentWorkspaceName = storedSession.workspaceName ?? null;

          if (!cancelled) {
            setAdminJwt(currentAdminJwt);
            setWorkspaceId(currentWorkspaceId);
            setWorkspaceName(currentWorkspaceName);
          }
        }
      }

      if (!currentAdminJwt || !currentWorkspaceId) {
        if (!cancelled) {
          setBundle(null);
          setShellErrorMessage(null);
          setIsShellLoading(false);
        }
        return;
      }

      setIsShellLoading(true);
      setShellErrorMessage(null);

      try {
        const nextBundle = await loadAdminPanelShell({
          adminJwt: currentAdminJwt,
          workspaceId: currentWorkspaceId,
          workspaceName: currentWorkspaceName,
        });

        if (!cancelled) {
          setBundle(nextBundle);
        }
      } catch (error) {
        if (!cancelled) {
          setBundle(null);
          setShellErrorMessage(
            error instanceof Error ? error.message : ADMIN_PANEL_ERROR_MESSAGE,
          );
          // On auth errors, clear session
          if (
            error instanceof Error &&
            error.message.includes("Unauthorized")
          ) {
            await clearAdminSession();
            router.replace("/");
          }
        }
      } finally {
        if (!cancelled) {
          setIsShellLoading(false);
        }
      }
    }

    void loadShell();

    return () => {
      cancelled = true;
    };
  }, [adminJwt, reloadKey, workspaceId, workspaceName]);

  const contentState = !isAdminAccessReady
    ? ({ kind: "guarded" } as const)
    : isShellLoading
      ? ({ kind: "loading" } as const)
      : shellErrorMessage
        ? ({ kind: "error", message: shellErrorMessage } as const)
        : bundle
          ? ({ kind: "ready" } as const)
          : ({ kind: "empty" } as const);

  async function handleCreateWorkspace(input: {
    bootstrapSecret: string;
    name: string;
  }) {
    setIsActionPending(true);
    setFeedbackState(null);

    try {
      const response = await createAdminWorkspace(input);
      setAdminJwt(response.admin_jwt);
      setWorkspaceId(response.workspace.id);
      setWorkspaceName(response.workspace.name);
      setBundle({
        workspaceId: response.workspace.id,
        workspaceName: response.workspace.name,
        joinCode: response.workspace.join_code,
        teams: [],
      });
      setShellErrorMessage(null);
      setFeedbackState({
        kind: "success",
        message: `Workspace ${response.workspace.name} is ready.`,
      });
    } catch (error) {
      setFeedbackState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create workspace right now.",
      });
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleCreateTeam(name: string) {
    if (!adminJwt || !workspaceId) {
      return;
    }

    setIsActionPending(true);
    setFeedbackState(null);

    try {
      const team = await createAdminTeam({
        adminJwt,
        workspaceId,
        name,
      });
      setBundle((currentBundle) =>
        currentBundle
          ? {
              ...currentBundle,
              teams: [...currentBundle.teams, team],
            }
          : currentBundle,
      );
      setFeedbackState({
        kind: "success",
        message: `${team.name} has been added.`,
      });
    } catch (error) {
      setFeedbackState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to add team right now.",
      });
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleUpdateTeam(input: { name: string; teamId: string }) {
    if (!adminJwt || !workspaceId) {
      return;
    }

    setIsActionPending(true);
    setFeedbackState(null);

    try {
      const team = await updateAdminTeam({
        adminJwt,
        workspaceId,
        teamId: input.teamId,
        name: input.name,
      });
      setBundle((currentBundle) =>
        currentBundle
          ? {
              ...currentBundle,
              teams: currentBundle.teams.map((currentTeam) =>
                currentTeam.id === team.id ? team : currentTeam,
              ),
            }
          : currentBundle,
      );
      setFeedbackState({
        kind: "success",
        message: `${team.name} has been updated.`,
      });
    } catch (error) {
      setFeedbackState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update team right now.",
      });
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleCopyJoinCode(joinCode: string) {
    setIsActionPending(true);
    setFeedbackState(null);

    try {
      await Clipboard.setStringAsync(joinCode);
      setFeedbackState({
        kind: "success",
        message: `Join code ${joinCode} copied.`,
      });
    } catch {
      setFeedbackState({
        kind: "error",
        message: "Unable to copy join code right now.",
      });
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleRotateJoinCode() {
    if (!adminJwt || !workspaceId) {
      return;
    }

    setIsActionPending(true);
    setFeedbackState(null);

    try {
      const joinCode = await rotateAdminJoinCode({
        adminJwt,
        workspaceId,
      });
      setBundle((currentBundle) =>
        currentBundle
          ? {
              ...currentBundle,
              joinCode,
            }
          : currentBundle,
      );
      setFeedbackState({
        kind: "success",
        message: `Join code refreshed to ${joinCode}.`,
      });
    } catch (error) {
      setFeedbackState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to refresh join code right now.",
      });
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleExport(input: { startDate: string; endDate: string }) {
    if (!adminJwt || !workspaceId) {
      return;
    }

    setIsActionPending(true);
    setFeedbackState(null);

    try {
      const exportResult = await exportAdminCsv({
        adminJwt,
        workspaceId,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      await shareAdminCsv(exportResult);
      setFeedbackState({
        kind: "success",
        message: `${exportResult.fileName} is ready to share.`,
      });
    } catch (error) {
      setFeedbackState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to export CSV right now.",
      });
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleRetry() {
    setFeedbackState(null);

    if (!adminJwt || !workspaceId) {
      return;
    }

    setIsActionPending(true);

    try {
      const joinCode = await fetchAdminJoinCode({
        adminJwt,
        workspaceId,
      });
      setBundle((currentBundle) =>
        currentBundle
          ? {
              ...currentBundle,
              joinCode,
            }
          : currentBundle,
      );
    } catch {
      // Keep the route-level retry focused on the shell fetch.
    } finally {
      setIsActionPending(false);
      setReloadKey((currentValue) => currentValue + 1);
    }
  }

  return (
    <AdminPanelScreen
      contentState={contentState}
      feedbackState={feedbackState}
      isActionPending={isActionPending}
      onCopyJoinCode={handleCopyJoinCode}
      onCreateTeam={handleCreateTeam}
      onCreateWorkspace={handleCreateWorkspace}
      onExport={handleExport}
      onReturnHome={() => router.replace("/")}
      onRotateJoinCode={handleRotateJoinCode}
      onRetry={handleRetry}
      onUpdateTeam={handleUpdateTeam}
      sectionFocus={sectionFocus}
      viewModel={bundle}
    />
  );
}
