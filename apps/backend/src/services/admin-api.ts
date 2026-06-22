import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { createAdminJwt } from "../auth/admin-jwt";
import type { DatabaseClient } from "../db/client";
import { workspaces } from "../db/schema";
import type {
  InMemoryWorkspaceDirectory,
  WorkspaceDirectoryEntry,
} from "./workspace-directory";

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

export class AdminWorkspaceNotFoundError extends Error {
  constructor() {
    super("Workspace not found.");
  }
}

type WorkspaceIdFactory = () => string;
type JoinCodeFactory = () => string;

interface AdminServiceOptions {
  jwtSecret?: string;
  workspaceIdFactory?: WorkspaceIdFactory;
  joinCodeFactory?: JoinCodeFactory;
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

interface InMemoryAdminApiServiceOptions extends AdminServiceOptions {
  workspaceDirectory: InMemoryWorkspaceDirectory;
}

export class InMemoryAdminApiService implements AdminApiService {
  private readonly workspaceIdFactory: WorkspaceIdFactory;
  private readonly joinCodeFactory: JoinCodeFactory;

  constructor(private readonly options: InMemoryAdminApiServiceOptions) {
    this.workspaceIdFactory =
      options.workspaceIdFactory ?? defaultWorkspaceIdFactory;
    this.joinCodeFactory = options.joinCodeFactory ?? defaultJoinCodeFactory;
  }

  async createWorkspace(
    payload: AdminWorkspaceCreateRequest,
  ): Promise<AdminWorkspaceCreateResponse> {
    const workspaceId = await this.createUniqueWorkspaceId();
    const joinCode = await this.createUniqueJoinCode();
    const storedWorkspace = await this.options.workspaceDirectory.addWorkspace({
      id: workspaceId,
      name: payload.name,
      joinCode,
      teams: [],
    });

    return buildWorkspaceCreateResponse(
      this.options.jwtSecret,
      storedWorkspace,
    );
  }

  async createTeam(): Promise<AdminTeamResponse> {
    throw new AdminApiNotImplementedError();
  }

  async updateTeam(): Promise<AdminTeamResponse> {
    throw new AdminApiNotImplementedError();
  }

  async getJoinCode(workspaceId: WorkspaceId): Promise<AdminJoinCodeResponse> {
    const workspace =
      await this.options.workspaceDirectory.findById(workspaceId);

    if (!workspace) {
      throw new AdminWorkspaceNotFoundError();
    }

    return {
      workspace: {
        id: workspace.id,
        join_code: workspace.joinCode,
      },
    };
  }

  async rotateJoinCode(
    workspaceId: WorkspaceId,
  ): Promise<AdminJoinCodeResponse> {
    const nextJoinCode = await this.createUniqueJoinCode();
    const workspace = await this.options.workspaceDirectory.updateJoinCode(
      workspaceId,
      nextJoinCode,
    );

    if (!workspace) {
      throw new AdminWorkspaceNotFoundError();
    }

    return {
      workspace: {
        id: workspace.id,
        join_code: workspace.joinCode,
      },
    };
  }

  async getExportRows(): Promise<AdminExportRecord[]> {
    throw new AdminApiNotImplementedError();
  }

  private async createUniqueWorkspaceId(): Promise<string> {
    return createUniqueValue(
      this.workspaceIdFactory,
      async (candidate) =>
        (await this.options.workspaceDirectory.findById(candidate)) !== null,
    );
  }

  private async createUniqueJoinCode(): Promise<string> {
    return createUniqueValue(
      this.joinCodeFactory,
      async (candidate) =>
        (await this.options.workspaceDirectory.findByJoinCode(candidate)) !==
        null,
    );
  }
}

interface PostgresAdminApiServiceOptions extends AdminServiceOptions {
  databaseClient: DatabaseClient;
}

export class PostgresAdminApiService implements AdminApiService {
  private readonly workspaceIdFactory: WorkspaceIdFactory;
  private readonly joinCodeFactory: JoinCodeFactory;

  constructor(private readonly options: PostgresAdminApiServiceOptions) {
    this.workspaceIdFactory =
      options.workspaceIdFactory ?? defaultWorkspaceIdFactory;
    this.joinCodeFactory = options.joinCodeFactory ?? defaultJoinCodeFactory;
  }

  async createWorkspace(
    payload: AdminWorkspaceCreateRequest,
  ): Promise<AdminWorkspaceCreateResponse> {
    const workspaceId = await this.createUniqueWorkspaceId();
    const joinCode = await this.createUniqueJoinCode();

    await this.options.databaseClient.db.insert(workspaces).values({
      id: workspaceId,
      name: payload.name,
      joinCode,
    });

    return buildWorkspaceCreateResponse(this.options.jwtSecret, {
      id: workspaceId,
      name: payload.name,
      joinCode,
      teams: [],
    });
  }

  async createTeam(): Promise<AdminTeamResponse> {
    throw new AdminApiNotImplementedError();
  }

  async updateTeam(): Promise<AdminTeamResponse> {
    throw new AdminApiNotImplementedError();
  }

  async getJoinCode(workspaceId: WorkspaceId): Promise<AdminJoinCodeResponse> {
    const workspaceRecord =
      await this.options.databaseClient.db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

    if (!workspaceRecord) {
      throw new AdminWorkspaceNotFoundError();
    }

    return {
      workspace: {
        id: workspaceRecord.id,
        join_code: workspaceRecord.joinCode,
      },
    };
  }

  async rotateJoinCode(
    workspaceId: WorkspaceId,
  ): Promise<AdminJoinCodeResponse> {
    const workspaceRecord =
      await this.options.databaseClient.db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

    if (!workspaceRecord) {
      throw new AdminWorkspaceNotFoundError();
    }

    const nextJoinCode = await this.createUniqueJoinCode();

    await this.options.databaseClient.db
      .update(workspaces)
      .set({
        joinCode: nextJoinCode,
      })
      .where(eq(workspaces.id, workspaceId));

    return {
      workspace: {
        id: workspaceId,
        join_code: nextJoinCode,
      },
    };
  }

  async getExportRows(): Promise<AdminExportRecord[]> {
    throw new AdminApiNotImplementedError();
  }

  private async createUniqueWorkspaceId(): Promise<string> {
    return createUniqueValue(this.workspaceIdFactory, async (candidate) => {
      const workspaceRecord =
        await this.options.databaseClient.db.query.workspaces.findFirst({
          where: eq(workspaces.id, candidate),
        });

      return workspaceRecord !== null && workspaceRecord !== undefined;
    });
  }

  private async createUniqueJoinCode(): Promise<string> {
    return createUniqueValue(this.joinCodeFactory, async (candidate) => {
      const workspaceRecord =
        await this.options.databaseClient.db.query.workspaces.findFirst({
          where: eq(workspaces.joinCode, candidate),
        });

      return workspaceRecord !== null && workspaceRecord !== undefined;
    });
  }
}

function buildWorkspaceCreateResponse(
  jwtSecret: string | undefined,
  workspace: WorkspaceDirectoryEntry,
): AdminWorkspaceCreateResponse {
  const { adminJwt } = createAdminJwt(jwtSecret, {
    workspace_id: workspace.id,
    role: "admin",
  });

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      join_code: workspace.joinCode,
    },
    admin_jwt: adminJwt,
  };
}

async function createUniqueValue(
  factory: () => string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = factory();

    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique value.");
}

function defaultWorkspaceIdFactory(): string {
  return `ws_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function defaultJoinCodeFactory(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let joinCode = "";

  for (let index = 0; index < 6; index += 1) {
    joinCode += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return joinCode;
}
