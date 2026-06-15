import type { WorkspaceJoinResponse } from "../../../../packages/shared";
import {
  WorkspaceJoinRequestSchema,
  WorkspaceJoinResponseSchema,
} from "../../../../packages/shared";
import { createDeviceJwt, MissingJwtSecretError } from "../auth/device-jwt";
import type { WorkspaceDirectory } from "./workspace-directory";

export class WorkspaceJoinNotFoundError extends Error {
  constructor() {
    super("Join code not found.");
  }
}

interface WorkspaceJoinServiceOptions {
  jwtSecret?: string;
  workspaceDirectory: WorkspaceDirectory;
}

export class WorkspaceJoinService {
  constructor(private readonly options: WorkspaceJoinServiceOptions) {}

  async joinWorkspace(payload: unknown): Promise<WorkspaceJoinResponse> {
    const parsedPayload = WorkspaceJoinRequestSchema.parse(payload);
    const workspace = await this.options.workspaceDirectory.findByJoinCode(
      parsedPayload.join_code,
    );

    if (!workspace) {
      throw new WorkspaceJoinNotFoundError();
    }

    const { deviceJwt } = createDeviceJwt(
      this.options.jwtSecret,
      workspace.id,
      parsedPayload.device_token,
    );

    return WorkspaceJoinResponseSchema.parse({
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      teams: workspace.teams,
      device_jwt: deviceJwt,
    });
  }
}

export { MissingJwtSecretError };
