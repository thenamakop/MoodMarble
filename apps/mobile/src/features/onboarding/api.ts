import {
  JoinCodeSchema,
  type WorkspaceJoinResponse,
  WorkspaceJoinRequestSchema,
  WorkspaceJoinResponseSchema,
} from "@/contracts/workspace-join";
import { TeamIdSchema } from "@/contracts/mood-submission";
import { createApiUrl, createRequestTimeout, getApiRequestErrorMessage } from "@/lib/api";
import { getOrCreateDeviceToken } from "./device-token";

const SAFE_JOIN_ERROR_MESSAGES = new Set(["Join code not found."]);
const TEAM_SELECTION_ERROR_MESSAGE = "Unable to save team right now.";

export async function joinWorkspace(joinCode: string): Promise<WorkspaceJoinResponse> {
  let response: Response;
  const deviceToken = await getOrCreateDeviceToken();
  let joinUrl = "";
  const { signal, cancel } = createRequestTimeout();

  try {
    joinUrl = createApiUrl("/workspace/join");
    response = await fetch(joinUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        WorkspaceJoinRequestSchema.parse({
          join_code: JoinCodeSchema.parse(joinCode),
          device_token: deviceToken,
        }),
      ),
      signal,
    });
  } catch (error: unknown) {
    throw new Error(
      getApiRequestErrorMessage("Unable to join workspace right now.", error, joinUrl),
    );
  } finally {
    cancel();
  }

  if (!response.ok) {
    throw new Error(await getJoinErrorMessage(response));
  }

  return WorkspaceJoinResponseSchema.parse(await response.json());
}

export async function finalizeAnonymousTeamSelection(
  teamId: string,
  deviceJwt: string,
): Promise<void> {
  const requestUrl = createApiUrl("/workspace/team-member");
  let response: Response;
  const { signal, cancel } = createRequestTimeout();

  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deviceJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        team_id: TeamIdSchema.parse(teamId),
      }),
      signal,
    });
  } catch (error) {
    throw new Error(getApiRequestErrorMessage(TEAM_SELECTION_ERROR_MESSAGE, error, requestUrl));
  } finally {
    cancel();
  }

  if (!response.ok) {
    throw new Error(await getTeamSelectionErrorMessage(response));
  }
}

async function getJoinErrorMessage(response: Response): Promise<string> {
  try {
    const responseBody = (await response.json()) as { message?: unknown };
    const publicErrorMessage =
      typeof responseBody.message === "string" ? responseBody.message.trim() : "";

    if (SAFE_JOIN_ERROR_MESSAGES.has(publicErrorMessage)) {
      return publicErrorMessage;
    }
  } catch {
    // Fall through to the stable default message.
  }

  return "Unable to join workspace right now.";
}

async function getTeamSelectionErrorMessage(response: Response): Promise<string> {
  try {
    const responseBody = (await response.json()) as { message?: unknown };

    if (typeof responseBody.message === "string" && responseBody.message.trim()) {
      return responseBody.message;
    }
  } catch {
    // Fall through to the stable default message.
  }

  return TEAM_SELECTION_ERROR_MESSAGE;
}
