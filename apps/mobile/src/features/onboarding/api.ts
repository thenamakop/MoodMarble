import {
  JoinCodeSchema,
  type WorkspaceJoinResponse,
  WorkspaceJoinRequestSchema,
  WorkspaceJoinResponseSchema,
} from "@/contracts/workspace-join";
import { createApiUrl } from "@/features/mood-submission/api";
import { getOrCreateDeviceToken } from "./device-token";

const SAFE_JOIN_ERROR_MESSAGES = new Set(["Join code not found."]);

export async function joinWorkspace(
  joinCode: string,
): Promise<WorkspaceJoinResponse> {
  let response: Response;
  const deviceToken = await getOrCreateDeviceToken();

  try {
    response = await fetch(createApiUrl("/workspace/join"), {
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
    });
  } catch {
    throw new Error("Unable to join workspace right now.");
  }

  if (!response.ok) {
    throw new Error(await getJoinErrorMessage(response));
  }

  return WorkspaceJoinResponseSchema.parse(await response.json());
}

async function getJoinErrorMessage(response: Response): Promise<string> {
  try {
    const responseBody = (await response.json()) as { message?: unknown };
    const publicErrorMessage =
      typeof responseBody.message === "string"
        ? responseBody.message.trim()
        : "";

    if (SAFE_JOIN_ERROR_MESSAGES.has(publicErrorMessage)) {
      return publicErrorMessage;
    }
  } catch {
    // Fall through to the stable default message.
  }

  return "Unable to join workspace right now.";
}
