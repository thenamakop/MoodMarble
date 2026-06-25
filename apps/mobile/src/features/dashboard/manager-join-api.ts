import { createApiUrl } from "@/lib/api";

const REDEEM_ERROR_MESSAGE = "Unable to redeem manager code right now.";
const SAFE_REDEEM_MESSAGES = new Set([
  "Invalid or expired manager code.",
  "Manager code must be 6 uppercase letters or numbers.",
]);

export interface RedeemManagerCodeResponse {
  manager_jwt: string;
  workspace_id: string;
  team_id: string;
  team_name: string;
  manager_teams: string;
}

export async function redeemManagerCode(
  code: string,
): Promise<RedeemManagerCodeResponse> {
  const response = await fetch(createApiUrl("/auth/redeem-manager-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    let errorMsg = REDEEM_ERROR_MESSAGE;
    try {
      const data = (await response.json()) as { message?: string };
      if (
        typeof data.message === "string" &&
        SAFE_REDEEM_MESSAGES.has(data.message)
      ) {
        errorMsg = data.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<RedeemManagerCodeResponse>;
}
