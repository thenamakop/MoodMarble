import { randomUUID } from "node:crypto";

import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { createAdminJwt } from "../auth/admin-jwt";
import type { DatabaseClient } from "../db/client";
import { moodSubmissions, teams, workspaces } from "../db/schema";
import type { InMemoryMoodSubmissionStore } from "./mood-submissions";
import type {
  InMemoryWorkspaceDirectory,
  WorkspaceDirectoryEntry,
} from "./workspace-directory";

import type {
  AdminExportQuery,
  AdminExportRecord,
  AdminJoinCodeResponse,
  AdminTeamCreateRequest,
  TeamId,
  AdminTeamListResponse,
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
  listTeams(workspaceId: WorkspaceId): Promise<AdminTeamListResponse>;
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

export class AdminTeamNotFoundError extends Error {
  constructor() {
    super("Team not found.");
  }
}

type WorkspaceIdFactory = () => string;
type TeamIdFactory = () => string;
type JoinCodeFactory = () => string;

interface AdminServiceOptions {
  jwtSecret?: string;
  workspaceIdFactory?: WorkspaceIdFactory;
  teamIdFactory?: TeamIdFactory;
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

  async listTeams(): Promise<AdminTeamListResponse> {
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
  moodSubmissionStore: InMemoryMoodSubmissionStore;
}

export class InMemoryAdminApiService implements AdminApiService {
  private readonly workspaceIdFactory: WorkspaceIdFactory;
  private readonly teamIdFactory: TeamIdFactory;
  private readonly joinCodeFactory: JoinCodeFactory;

  constructor(private readonly options: InMemoryAdminApiServiceOptions) {
    this.workspaceIdFactory =
      options.workspaceIdFactory ?? defaultWorkspaceIdFactory;
    this.teamIdFactory = options.teamIdFactory ?? defaultTeamIdFactory;
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

  async createTeam(input: {
    workspaceId: WorkspaceId;
    payload: AdminTeamCreateRequest;
  }): Promise<AdminTeamResponse> {
    const workspace = await this.options.workspaceDirectory.findById(
      input.workspaceId,
    );

    if (!workspace) {
      throw new AdminWorkspaceNotFoundError();
    }

    const teamId = await this.createUniqueTeamId(input.workspaceId);
    const storedTeam = await this.options.workspaceDirectory.addTeam(
      input.workspaceId,
      {
        id: teamId as TeamId,
        name: input.payload.name,
      },
    );

    if (!storedTeam) {
      throw new AdminWorkspaceNotFoundError();
    }

    return {
      team: {
        id: storedTeam.id,
        workspace_id: input.workspaceId,
        name: storedTeam.name,
      },
    };
  }

  async updateTeam(input: {
    workspaceId: WorkspaceId;
    teamId: string;
    payload: AdminTeamUpdateRequest;
  }): Promise<AdminTeamResponse> {
    const updatedTeam = await this.options.workspaceDirectory.updateTeam(
      input.workspaceId,
      input.teamId,
      input.payload.name,
    );

    if (!updatedTeam) {
      throw new AdminTeamNotFoundError();
    }

    return {
      team: {
        id: updatedTeam.id,
        workspace_id: input.workspaceId,
        name: updatedTeam.name,
      },
    };
  }

  async listTeams(workspaceId: WorkspaceId): Promise<AdminTeamListResponse> {
    const teams = await this.options.workspaceDirectory.listTeams(workspaceId);

    if (!teams) {
      throw new AdminWorkspaceNotFoundError();
    }

    return {
      teams: teams.map((team) => ({
        id: team.id,
        workspace_id: workspaceId,
        name: team.name,
      })),
    };
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

  async getExportRows(input: {
    workspaceId: WorkspaceId;
    query: AdminExportQuery;
  }): Promise<AdminExportRecord[]> {
    const teams = await this.options.workspaceDirectory.listTeams(
      input.workspaceId,
    );

    if (!teams) {
      throw new AdminWorkspaceNotFoundError();
    }

    const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
    const teamIds = teams.map((team) => team.id);

    return this.options.moodSubmissionStore
      .listSubmissions()
      .filter(
        (submission) =>
          teamIds.includes(submission.teamId) &&
          submission.submissionDate >= input.query.start_date &&
          submission.submissionDate <= input.query.end_date,
      )
      .sort((left, right) => {
        if (left.submissionDate !== right.submissionDate) {
          return left.submissionDate.localeCompare(right.submissionDate);
        }

        if (left.hourOfDay !== right.hourOfDay) {
          return left.hourOfDay - right.hourOfDay;
        }

        return left.id.localeCompare(right.id);
      })
      .map((submission) => ({
        team_id: submission.teamId,
        team_name: teamNameById.get(submission.teamId) ?? "Unknown Team",
        mood_type: submission.moodType,
        tags: submission.tags ?? [],
        hour_of_day: submission.hourOfDay,
        submission_date: submission.submissionDate,
      })) as AdminExportRecord[];
  }

  private async createUniqueWorkspaceId(): Promise<string> {
    return createUniqueValue(
      this.workspaceIdFactory,
      async (candidate) =>
        (await this.options.workspaceDirectory.findById(candidate)) !== null,
    );
  }

  private async createUniqueTeamId(workspaceId: WorkspaceId): Promise<string> {
    return createUniqueValue(this.teamIdFactory, async (candidate) => {
      const teams =
        await this.options.workspaceDirectory.listTeams(workspaceId);

      if (!teams) {
        return false;
      }

      return teams.some((team) => team.id === candidate);
    });
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
  private readonly teamIdFactory: TeamIdFactory;
  private readonly joinCodeFactory: JoinCodeFactory;

  constructor(private readonly options: PostgresAdminApiServiceOptions) {
    this.workspaceIdFactory =
      options.workspaceIdFactory ?? defaultWorkspaceIdFactory;
    this.teamIdFactory = options.teamIdFactory ?? defaultTeamIdFactory;
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

  async createTeam(input: {
    workspaceId: WorkspaceId;
    payload: AdminTeamCreateRequest;
  }): Promise<AdminTeamResponse> {
    const workspaceRecord =
      await this.options.databaseClient.db.query.workspaces.findFirst({
        where: eq(workspaces.id, input.workspaceId),
      });

    if (!workspaceRecord) {
      throw new AdminWorkspaceNotFoundError();
    }

    const teamId = await this.createUniqueTeamId(input.workspaceId);

    await this.options.databaseClient.db.insert(teams).values({
      id: teamId,
      workspaceId: input.workspaceId,
      name: input.payload.name,
    });

    return {
      team: {
        id: teamId,
        workspace_id: input.workspaceId,
        name: input.payload.name,
      },
    };
  }

  async updateTeam(input: {
    workspaceId: WorkspaceId;
    teamId: string;
    payload: AdminTeamUpdateRequest;
  }): Promise<AdminTeamResponse> {
    const teamRecord =
      await this.options.databaseClient.db.query.teams.findFirst({
        where: eq(teams.id, input.teamId),
      });

    if (!teamRecord || teamRecord.workspaceId !== input.workspaceId) {
      throw new AdminTeamNotFoundError();
    }

    await this.options.databaseClient.db
      .update(teams)
      .set({
        name: input.payload.name,
      })
      .where(eq(teams.id, input.teamId));

    return {
      team: {
        id: input.teamId,
        workspace_id: input.workspaceId,
        name: input.payload.name,
      },
    };
  }

  async listTeams(workspaceId: WorkspaceId): Promise<AdminTeamListResponse> {
    const workspaceRecord =
      await this.options.databaseClient.db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

    if (!workspaceRecord) {
      throw new AdminWorkspaceNotFoundError();
    }

    const teamRecords =
      await this.options.databaseClient.db.query.teams.findMany({
        where: eq(teams.workspaceId, workspaceId),
        orderBy: (teamTable, { asc }) => [asc(teamTable.name)],
      });

    return {
      teams: teamRecords.map((team) => ({
        id: team.id,
        workspace_id: workspaceId,
        name: team.name,
      })),
    };
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

  async getExportRows(input: {
    workspaceId: WorkspaceId;
    query: AdminExportQuery;
  }): Promise<AdminExportRecord[]> {
    const workspaceRecord =
      await this.options.databaseClient.db.query.workspaces.findFirst({
        where: eq(workspaces.id, input.workspaceId),
      });

    if (!workspaceRecord) {
      throw new AdminWorkspaceNotFoundError();
    }

    const teamRecords =
      await this.options.databaseClient.db.query.teams.findMany({
        where: eq(teams.workspaceId, input.workspaceId),
        orderBy: (teamTable, { asc }) => [asc(teamTable.name)],
      });

    if (teamRecords.length === 0) {
      return [];
    }

    const teamNameById = new Map(
      teamRecords.map((teamRecord) => [teamRecord.id, teamRecord.name]),
    );
    const submissionRecords =
      await this.options.databaseClient.db.query.moodSubmissions.findMany({
        where: and(
          inArray(
            moodSubmissions.teamId,
            teamRecords.map((teamRecord) => teamRecord.id),
          ),
          gte(moodSubmissions.submissionDate, input.query.start_date),
          lte(moodSubmissions.submissionDate, input.query.end_date),
        ),
        orderBy: (submissionTable, { asc }) => [
          asc(submissionTable.submissionDate),
          asc(submissionTable.hourOfDay),
          asc(submissionTable.id),
        ],
      });

    return submissionRecords.map((submissionRecord) => ({
      team_id: submissionRecord.teamId,
      team_name: teamNameById.get(submissionRecord.teamId) ?? "Unknown Team",
      mood_type: submissionRecord.moodType,
      tags: submissionRecord.tags ?? [],
      hour_of_day: submissionRecord.hourOfDay,
      submission_date: submissionRecord.submissionDate,
    })) as AdminExportRecord[];
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

  private async createUniqueTeamId(workspaceId: WorkspaceId): Promise<string> {
    return createUniqueValue(this.teamIdFactory, async (candidate) => {
      const teamRecord =
        await this.options.databaseClient.db.query.teams.findFirst({
          where: eq(teams.id, candidate),
        });

      return (
        teamRecord !== null &&
        teamRecord !== undefined &&
        teamRecord.workspaceId === workspaceId
      );
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

function defaultTeamIdFactory(): string {
  return `tm_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function defaultJoinCodeFactory(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let joinCode = "";

  for (let index = 0; index < 6; index += 1) {
    joinCode += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return joinCode;
}
