import type {
  AdminExportQuery,
  AdminExportRecord,
  AdminJoinCodeResponse,
  AdminTeamCreateRequest,
  AdminTeamResponse,
  AdminTeamUpdateRequest,
  AdminWorkspaceCreateRequest,
  AdminWorkspaceCreateResponse,
  WorkspaceId,
} from "../../../../packages/shared";

export interface AdminApiService {
  createWorkspace(
    payload: AdminWorkspaceCreateRequest,
  ): Promise<AdminWorkspaceCreateResponse>;
  createTeam(input: {
    workspaceId: WorkspaceId;
    payload: AdminTeamCreateRequest;
  }): Promise<AdminTeamResponse>;
  updateTeam(input: {
    workspaceId: WorkspaceId;
    teamId: string;
    payload: AdminTeamUpdateRequest;
  }): Promise<AdminTeamResponse>;
  getJoinCode(workspaceId: WorkspaceId): Promise<AdminJoinCodeResponse>;
  rotateJoinCode(workspaceId: WorkspaceId): Promise<AdminJoinCodeResponse>;
  getExportRows(input: {
    workspaceId: WorkspaceId;
    query: AdminExportQuery;
  }): Promise<AdminExportRecord[]>;
}

export class AdminApiNotImplementedError extends Error {
  constructor() {
    super("Admin API is not implemented yet.");
  }
}

export class NotImplementedAdminApiService implements AdminApiService {
  async createWorkspace(): Promise<AdminWorkspaceCreateResponse> {
    throw new AdminApiNotImplementedError();
  }

  async createTeam(): Promise<AdminTeamResponse> {
    throw new AdminApiNotImplementedError();
  }

  async updateTeam(): Promise<AdminTeamResponse> {
    throw new AdminApiNotImplementedError();
  }

  async getJoinCode(): Promise<AdminJoinCodeResponse> {
    throw new AdminApiNotImplementedError();
  }

  async rotateJoinCode(): Promise<AdminJoinCodeResponse> {
    throw new AdminApiNotImplementedError();
  }

  async getExportRows(): Promise<AdminExportRecord[]> {
    throw new AdminApiNotImplementedError();
  }
}
