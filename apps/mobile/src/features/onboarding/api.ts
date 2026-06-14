import {
  JoinCodeSchema,
  type WorkspaceJoinResponse,
  WorkspaceJoinResponseSchema,
} from "@/contracts/workspace-join";
import { createApiUrl } from "@/features/mood-submission/api";

export async function joinWorkspace(
  joinCode: string,
): Promise<WorkspaceJoinResponse> {
  const response = await fetch(createApiUrl("/workspace/join"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      join_code: JoinCodeSchema.parse(joinCode),
    }),
  });

  if (!response.ok) {
    throw new Error(await getJoinErrorMessage(response));
  }

  return WorkspaceJoinResponseSchema.parse(await response.json());
}

async function getJoinErrorMessage(response: Response): Promise<string> {
  try {
    const responseBody = (await response.json()) as { message?: unknown };

    if (
      typeof responseBody.message === "string" &&
      responseBody.message.trim()
    ) {
      return responseBody.message;
    }
  } catch {
    // Fall through to the stable default message.
  }

  return "Unable to join workspace right now.";
}
